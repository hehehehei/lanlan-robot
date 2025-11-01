pub mod config;
pub mod error;
pub mod models;
pub mod routes;
pub mod services;

use axum::{
    routing::{get, post},
    Router,
};
use routes::AppState;
use services::FileStorage;
use sqlx::mysql::MySqlPoolOptions;
use std::sync::Arc;
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::trace::TraceLayer;

pub async fn create_app(config: config::Config) -> anyhow::Result<Router> {
    let db = MySqlPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;

    tokio::fs::create_dir_all(&config.storage_root).await?;

    let file_storage = Arc::new(FileStorage::new(config.storage_root.clone()));

    let state = AppState {
        db,
        file_storage,
        max_file_size: config.max_file_size,
    };

    let app = Router::new()
        .route("/health", get(routes::health_check))
        .route("/api/projects/:project_id/files", post(routes::upload_file))
        .route(
            "/api/projects/:project_id/files/:file_id/parse",
            post(routes::parse_file),
        )
        .layer(RequestBodyLimitLayer::new(config.max_file_size))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    Ok(app)
}
