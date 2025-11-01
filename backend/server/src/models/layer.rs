use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Layer {
    pub id: u64,
    pub file_id: u64,
    pub name: String,
    pub is_locked: bool,
    pub is_visible: bool,
    pub color: Option<String>,
    pub line_type: Option<String>,
    pub line_weight: Option<String>,
    pub min_x: Option<f64>,
    pub min_y: Option<f64>,
    pub max_x: Option<f64>,
    pub max_y: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLayerInput {
    pub name: String,
    pub is_locked: bool,
    pub is_visible: bool,
    pub color: Option<String>,
    pub line_type: Option<String>,
    pub line_weight: Option<String>,
}
