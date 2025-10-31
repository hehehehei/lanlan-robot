mod config;
mod routes;
mod state;

use std::{
    env,
    fs,
    sync::Arc,
    time::Duration,
};

use anyhow::Result;
use axum::Router;
use sqlx::{mysql::MySqlPoolOptions, MySqlPool};
use tokio::{net::TcpListener, signal, time::sleep};
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

use crate::{config::AppConfig, state::AppState};

#[tokio::main]
async fn main() -> Result<()> {
    let config = Arc::new(AppConfig::from_env()?);

    if env::var("RUST_LOG").is_err() {
        env::set_var("RUST_LOG", config.log_level());
    }

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new(config.log_level())),
        )
        .with_target(false)
        .init();

    fs::create_dir_all(config.file_storage_dir())?;

    let pool = connect_with_retry(config.database_url()).await?;

    let app_state = AppState::new(pool, Arc::clone(&config));
    let app = build_router(app_state);

    let addr = config.socket_addr();
    let listener = TcpListener::bind(addr).await?;
    let local_addr = listener.local_addr()?;
    info!("starting backend server", %local_addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("shutdown complete");

    Ok(())
}

fn build_router(state: AppState) -> Router<AppState> {
    routes::router().with_state(state)
}

async fn connect_with_retry(database_url: &str) -> Result<MySqlPool> {
    let mut attempt: u32 = 0;
    loop {
        attempt += 1;
        match MySqlPoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await
        {
            Ok(pool) => {
                info!(attempt, "successfully connected to database");
                return Ok(pool);
            }
            Err(err) => {
                error!(%err, attempt, "failed to connect to database, retrying");
                sleep(Duration::from_secs(2)).await;
            }
        }
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install CTRL+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{signal, SignalKind};

        let mut sigterm = signal(SignalKind::terminate()).expect("failed to install signal handler");
        sigterm.recv().await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
