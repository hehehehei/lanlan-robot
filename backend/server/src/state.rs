use std::sync::Arc;

use sqlx::MySqlPool;

use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub pool: MySqlPool,
    pub config: Arc<AppConfig>,
}

impl AppState {
    pub fn new(pool: MySqlPool, config: Arc<AppConfig>) -> Self {
        Self { pool, config }
    }
}
