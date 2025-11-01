use server::{config::Config, create_app};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let app = create_app(config.clone()).await?;

    let listener =
        tokio::net::TcpListener::bind(format!("{}:{}", config.server_host, config.server_port))
            .await?;

    tracing::info!(
        "Server listening on {}:{}",
        config.server_host,
        config.server_port
    );

    axum::serve(listener, app).await?;

    Ok(())
}
