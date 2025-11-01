use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct File {
    pub id: u64,
    pub project_id: u64,
    pub name: String,
    pub size: Option<u64>,
    pub storage_path: Option<String>,
    pub checksum: Option<String>,
    pub encoding: Option<String>,
    pub parse_status: Option<String>,
    pub parse_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileUploadResponse {
    pub id: u64,
    pub name: String,
    pub size: u64,
    pub checksum: String,
    pub storage_path: String,
    pub encoding: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}
