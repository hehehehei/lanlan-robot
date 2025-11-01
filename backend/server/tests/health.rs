use serde_json::Value;
use server::{config::Config, create_app};
use sqlx::mysql::MySqlPoolOptions;
use std::path::PathBuf;
use tempfile::TempDir;
use tokio::net::TcpListener;

async fn setup_test_server() -> (String, TempDir, sqlx::MySqlPool) {
    dotenvy::dotenv().ok();

    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "mysql://root:password@localhost/cad_db_test".to_string());

    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind to port");
    let addr = listener.local_addr().expect("Failed to get local address");

    let config = Config {
        database_url: database_url.clone(),
        storage_root: temp_dir.path().to_path_buf(),
        server_host: "127.0.0.1".to_string(),
        server_port: addr.port(),
        max_file_size: 100 * 1024 * 1024,
    };

    let app = create_app(config)
        .await
        .expect("Failed to create application");

    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("Server failed to start");
    });

    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    let server_url = format!("http://{}", addr);
    (server_url, temp_dir, pool)
}

#[tokio::test]
async fn test_health_endpoint_returns_200() {
    let (server_url, _temp_dir, _pool) = setup_test_server().await;

    let client = reqwest::Client::new();
    let response = client
        .get(&format!("{}/health", server_url))
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 200);

    let body: Value = response.json().await.expect("Failed to parse JSON");
    assert_eq!(body["status"], "ok");
}

#[tokio::test]
async fn test_health_endpoint_checks_db_connection() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let result = sqlx::query("SELECT 1").fetch_one(&pool).await;
    assert!(
        result.is_ok(),
        "Database connection should be successful for health check"
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&format!("{}/health", server_url))
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 200);
}
