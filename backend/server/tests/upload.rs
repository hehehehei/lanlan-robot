use reqwest::multipart;
use serde_json::Value;
use server::{config::Config, create_app};
use sqlx::mysql::MySqlPoolOptions;
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

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            UNIQUE KEY uk_projects_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    )
    .execute(&pool)
    .await
    .expect("Failed to create projects table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS files (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            project_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(255) NOT NULL,
            size BIGINT UNSIGNED NULL,
            storage_path VARCHAR(1024) NULL,
            checksum CHAR(64) NULL,
            encoding VARCHAR(50) NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            CONSTRAINT fk_files_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE KEY uk_files_project_name (project_id, name),
            INDEX idx_files_project_id (project_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    )
    .execute(&pool)
    .await
    .expect("Failed to create files table");

    sqlx::query("INSERT IGNORE INTO projects (id, name, description) VALUES (1, 'Test Project', 'A test project')")
        .execute(&pool)
        .await
        .expect("Failed to insert test project");

    let config = Config {
        database_url: database_url.clone(),
        storage_root: temp_dir.path().to_path_buf(),
        server_host: "127.0.0.1".to_string(),
        server_port: 0,
        max_file_size: 100 * 1024 * 1024,
    };

    let app = create_app(config).await.expect("Failed to create app");

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind");
    let addr = listener.local_addr().expect("Failed to get local addr");

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
async fn test_upload_file_success() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let test_file_content = b"0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n";

    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(test_file_content.to_vec())
            .file_name("test.dxf")
            .mime_str("application/dxf")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/projects/1/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 201);

    let json: Value = response.json().await.expect("Failed to parse JSON");
    assert!(json["id"].as_u64().is_some());
    assert_eq!(json["name"].as_str(), Some("test.dxf"));
    assert_eq!(json["size"].as_u64(), Some(test_file_content.len() as u64));
    assert_eq!(json["status"].as_str(), Some("uploaded_awaiting_parse"));
    assert!(json["checksum"].as_str().is_some());
    assert!(json["storage_path"].as_str().is_some());
    assert!(json["encoding"].as_str().is_some());

    let file_id = json["id"].as_u64().unwrap();
    let file_record: (String, String) =
        sqlx::query_as("SELECT name, checksum FROM files WHERE id = ?")
            .bind(file_id)
            .fetch_one(&pool)
            .await
            .expect("Failed to fetch file record");

    assert_eq!(file_record.0, "test.dxf");
    assert_eq!(file_record.1.len(), 64);

    pool.close().await;
}

#[tokio::test]
async fn test_upload_file_project_not_found() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let test_file_content = b"test content";
    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(test_file_content.to_vec())
            .file_name("test.dxf")
            .mime_str("application/dxf")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/projects/99999/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 404);

    pool.close().await;
}

#[tokio::test]
async fn test_upload_file_invalid_type() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let test_file_content = b"test content";
    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(test_file_content.to_vec())
            .file_name("test.txt")
            .mime_str("text/plain")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/projects/1/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 400);

    pool.close().await;
}

#[tokio::test]
async fn test_charset_detection() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let utf8_content = b"0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nEOF\n";
    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(utf8_content.to_vec())
            .file_name("utf8_test.dxf")
            .mime_str("application/dxf")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/projects/1/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 201);

    let json: Value = response.json().await.expect("Failed to parse JSON");
    let encoding = json["encoding"].as_str().unwrap();
    assert!(
        encoding == "UTF-8" || encoding == "windows-1252",
        "Expected UTF-8 or windows-1252, got {}",
        encoding
    );

    pool.close().await;
}
