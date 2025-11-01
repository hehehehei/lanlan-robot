use crate::error::{AppError, Result};
use crate::models::{File, FileUploadResponse};
use crate::services::FileStorage;
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use sqlx::MySqlPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: MySqlPool,
    pub file_storage: Arc<FileStorage>,
    pub max_file_size: usize,
}

pub async fn upload_file(
    State(state): State<AppState>,
    Path(project_id): Path<u64>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<FileUploadResponse>)> {
    let _project = sqlx::query_as::<_, crate::models::Project>(
        "SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?",
    )
    .bind(project_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::ProjectNotFound)?;

    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::InvalidMultipart(e.to_string()))?
    {
        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "file" {
            filename = field.file_name().map(|s| s.to_string());

            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::InvalidMultipart(e.to_string()))?;

            if data.len() > state.max_file_size {
                return Err(AppError::FileTooLarge);
            }

            file_data = Some(data.to_vec());
        }
    }

    let file_data =
        file_data.ok_or_else(|| AppError::InvalidMultipart("No file provided".to_string()))?;
    let filename =
        filename.ok_or_else(|| AppError::InvalidMultipart("No filename provided".to_string()))?;

    let file_extension = std::path::Path::new(&filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !["dxf", "dwg"].contains(&file_extension.as_str()) {
        return Err(AppError::InvalidFileType);
    }

    let (storage_path, checksum) = state.file_storage.store_file(&file_data, &filename).await?;

    let encoding = state.file_storage.detect_encoding(&file_data);
    let file_size = file_data.len() as u64;

    let file_record = sqlx::query_as::<_, File>(
        "INSERT INTO files (project_id, name, size, storage_path, checksum, encoding, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
         RETURNING id, project_id, name, size, storage_path, checksum, encoding, created_at, updated_at",
    )
    .bind(project_id)
    .bind(&filename)
    .bind(file_size)
    .bind(storage_path.to_str().unwrap())
    .bind(&checksum)
    .bind(&encoding)
    .bind(Utc::now())
    .bind(Utc::now())
    .fetch_one(&state.db)
    .await;

    let file_record = match file_record {
        Ok(record) => record,
        Err(_) => {
            sqlx::query(
                "INSERT INTO files (project_id, name, size, storage_path, checksum, encoding) 
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(project_id)
            .bind(&filename)
            .bind(file_size)
            .bind(storage_path.to_str().unwrap())
            .bind(&checksum)
            .bind(&encoding)
            .execute(&state.db)
            .await?;

            sqlx::query_as::<_, File>(
                "SELECT id, project_id, name, size, storage_path, checksum, encoding, created_at, updated_at 
                 FROM files 
                 WHERE project_id = ? AND name = ? 
                 ORDER BY id DESC LIMIT 1",
            )
            .bind(project_id)
            .bind(&filename)
            .fetch_one(&state.db)
            .await?
        }
    };

    let response = FileUploadResponse {
        id: file_record.id,
        name: file_record.name,
        size: file_data.len() as u64,
        checksum,
        storage_path: storage_path.to_str().unwrap().to_string(),
        encoding,
        status: "uploaded_awaiting_parse".to_string(),
        created_at: file_record.created_at,
    };

    Ok((StatusCode::CREATED, Json(response)))
}
