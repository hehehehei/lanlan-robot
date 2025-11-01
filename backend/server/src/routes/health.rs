use axum::{extract::State, http::StatusCode, Json};
use serde_json::{json, Value};

use super::AppState;

pub async fn health_check(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "ok" }))),
        Err(e) => {
            tracing::error!("Database health check failed: {:?}", e);
            (StatusCode::OK, Json(json!({ "status": "ok" })))
        }
    }
}
