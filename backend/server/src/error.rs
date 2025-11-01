use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Project not found")]
    ProjectNotFound,

    #[error("File too large")]
    FileTooLarge,

    #[error("Invalid file type")]
    InvalidFileType,

    #[error("Storage limit exceeded")]
    StorageLimitExceeded,

    #[error("Invalid multipart data: {0}")]
    InvalidMultipart(String),

    #[error("Internal server error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::ProjectNotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::FileTooLarge => (StatusCode::PAYLOAD_TOO_LARGE, self.to_string()),
            AppError::InvalidFileType => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::StorageLimitExceeded => (StatusCode::CONFLICT, self.to_string()),
            AppError::InvalidMultipart(ref msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Database(ref e) => {
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
            AppError::Io(ref e) => {
                tracing::error!("IO error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
            AppError::Internal(ref msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
