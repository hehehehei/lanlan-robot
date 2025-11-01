use crate::error::{AppError, Result};
use crate::models::File;
use crate::routes::AppState;
use crate::services::{dxf_parser, PersistService};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResponse {
    pub status: String,
    pub message: String,
    pub file_id: u64,
}

pub async fn parse_file(
    State(state): State<AppState>,
    Path((project_id, file_id)): Path<(u64, u64)>,
) -> Result<(StatusCode, Json<ParseResponse>)> {
    let _project = sqlx::query_as::<_, crate::models::Project>(
        "SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?",
    )
    .bind(project_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::ProjectNotFound)?;

    let file = sqlx::query_as::<_, File>(
        "SELECT id, project_id, name, size, storage_path, checksum, encoding, parse_status, parse_error, created_at, updated_at 
         FROM files WHERE id = ? AND project_id = ?",
    )
    .bind(file_id)
    .bind(project_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Internal("File not found".to_string()))?;

    let storage_path = file
        .storage_path
        .ok_or_else(|| AppError::Internal("File storage path not found".to_string()))?;

    let acquired = PersistService::mark_parsing(&state.db, file_id).await?;
    if !acquired {
        return Ok((
            StatusCode::CONFLICT,
            Json(ParseResponse {
                status: "parsing".to_string(),
                message: "File is already being parsed".to_string(),
                file_id,
            }),
        ));
    }

    let file_storage = state.file_storage.clone();
    let db = state.db.clone();

    tokio::spawn(async move {
        let result = parse_file_task(file_storage.as_ref(), &db, file_id, &storage_path).await;

        if let Err(e) = result {
            tracing::error!("Parse error for file {}: {:?}", file_id, e);
            let _ = PersistService::mark_parse_failed(&db, file_id, &e.to_string()).await;
        }
    });

    Ok((
        StatusCode::OK,
        Json(ParseResponse {
            status: "parsing".to_string(),
            message: "File parsing started".to_string(),
            file_id,
        }),
    ))
}

async fn parse_file_task(
    file_storage: &crate::services::FileStorage,
    db: &sqlx::MySqlPool,
    file_id: u64,
    storage_path: &str,
) -> Result<()> {
    let full_path = PathBuf::from(&file_storage.root_path()).join(storage_path);

    let content = tokio::fs::read_to_string(&full_path)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to read file: {}", e)))?;

    let parsed_layers = dxf_parser::parse_dxf(&content)?;

    PersistService::persist_parsed_data(db, file_id, parsed_layers).await?;

    Ok(())
}
