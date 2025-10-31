use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
struct HealthResponse<'a> {
    status: &'a str,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/healthz", get(healthz))
}

async fn healthz() -> Json<HealthResponse<'static>> {
    Json(HealthResponse { status: "ok" })
}
