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
            parse_status ENUM('uploaded', 'parsing', 'parsed', 'failed') NOT NULL DEFAULT 'uploaded',
            parse_error TEXT NULL,
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

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS layers (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            file_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(255) NOT NULL,
            is_locked TINYINT(1) NOT NULL DEFAULT 0,
            is_visible TINYINT(1) NOT NULL DEFAULT 1,
            color VARCHAR(32) NULL,
            line_type VARCHAR(64) NULL,
            line_weight VARCHAR(32) NULL,
            min_x DOUBLE NULL,
            min_y DOUBLE NULL,
            max_x DOUBLE NULL,
            max_y DOUBLE NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            CONSTRAINT fk_layers_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
            UNIQUE KEY uk_layers_file_name (file_id, name),
            INDEX idx_layers_file_id (file_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    )
    .execute(&pool)
    .await
    .expect("Failed to create layers table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS entities (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            layer_id BIGINT UNSIGNED NOT NULL,
            entity_type ENUM('LINE', 'POLYLINE', 'ARC', 'CIRCLE', 'TEXT', 'INSERT') NOT NULL,
            data JSON NOT NULL,
            min_x DOUBLE NOT NULL,
            min_y DOUBLE NOT NULL,
            max_x DOUBLE NOT NULL,
            max_y DOUBLE NOT NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            CONSTRAINT fk_entities_layer FOREIGN KEY (layer_id) REFERENCES layers(id) ON DELETE CASCADE,
            INDEX idx_entities_layer_id (layer_id),
            INDEX idx_entities_min_x (min_x),
            INDEX idx_entities_min_y (min_y),
            INDEX idx_entities_max_x (max_x),
            INDEX idx_entities_max_y (max_y)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    )
    .execute(&pool)
    .await
    .expect("Failed to create entities table");

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
async fn test_parse_flow_success() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let dxf_content = include_bytes!("../../../fixtures/sample_utf8.dxf");

    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(dxf_content.to_vec())
            .file_name("test_parse.dxf")
            .mime_str("application/dxf")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let upload_response = client
        .post(format!("{}/api/projects/1/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send upload request");

    assert_eq!(upload_response.status(), 201);

    let upload_json: Value = upload_response
        .json()
        .await
        .expect("Failed to parse upload JSON");
    let file_id = upload_json["id"].as_u64().unwrap();

    let parse_response = client
        .post(format!(
            "{}/api/projects/1/files/{}/parse",
            server_url, file_id
        ))
        .send()
        .await
        .expect("Failed to send parse request");

    assert!(
        parse_response.status() == 200 || parse_response.status() == 409,
        "Expected 200 or 409, got {}",
        parse_response.status()
    );

    let parse_json: Value = parse_response
        .json()
        .await
        .expect("Failed to parse parse JSON");
    assert!(parse_json["status"].as_str().is_some());

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let file_status: (String,) = sqlx::query_as("SELECT parse_status FROM files WHERE id = ?")
        .bind(file_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch file status");

    assert_eq!(file_status.0, "parsed");

    let layer_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM layers WHERE file_id = ?")
        .bind(file_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to count layers");

    assert!(layer_count.0 > 0, "Expected at least one layer");

    let layers: Vec<(u64, String, Option<f64>, Option<f64>, Option<f64>, Option<f64>)> =
        sqlx::query_as("SELECT id, name, min_x, min_y, max_x, max_y FROM layers WHERE file_id = ? ORDER BY name")
            .bind(file_id)
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch layers");

    for layer in &layers {
        assert!(
            layer.2.is_some() && layer.3.is_some() && layer.4.is_some() && layer.5.is_some(),
            "Layer {} bounding box should be non-null",
            layer.1
        );

        let entity_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM entities WHERE layer_id = ?")
                .bind(layer.0)
                .fetch_one(&pool)
                .await
                .expect("Failed to count entities");

        assert!(
            entity_count.0 > 0,
            "Layer {} should have at least one entity",
            layer.1
        );

        let entities: Vec<(String, f64, f64, f64, f64)> = sqlx::query_as(
            "SELECT entity_type, min_x, min_y, max_x, max_y FROM entities WHERE layer_id = ?",
        )
        .bind(layer.0)
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch entities");

        for entity in entities {
            assert!(
                !entity.0.is_empty(),
                "Entity type should not be empty"
            );
            assert!(
                entity.1 <= entity.3 && entity.2 <= entity.4,
                "Entity bounding box should be valid"
            );
        }
    }

    pool.close().await;
}

#[tokio::test]
async fn test_parse_invalid_file() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let invalid_content = b"This is not a valid DXF file";

    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(invalid_content.to_vec())
            .file_name("invalid.dxf")
            .mime_str("application/dxf")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let upload_response = client
        .post(format!("{}/api/projects/1/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send upload request");

    assert_eq!(upload_response.status(), 201);

    let upload_json: Value = upload_response
        .json()
        .await
        .expect("Failed to parse upload JSON");
    let file_id = upload_json["id"].as_u64().unwrap();

    let parse_response = client
        .post(format!(
            "{}/api/projects/1/files/{}/parse",
            server_url, file_id
        ))
        .send()
        .await
        .expect("Failed to send parse request");

    assert!(parse_response.status() == 200 || parse_response.status() == 409);

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let file_result: Option<(String, Option<String>)> =
        sqlx::query_as("SELECT parse_status, parse_error FROM files WHERE id = ?")
            .bind(file_id)
            .fetch_optional(&pool)
            .await
            .expect("Failed to fetch file status");

    assert!(file_result.is_some());
    let (status, error) = file_result.unwrap();

    assert!(
        status == "parsed" || status == "failed",
        "Expected parsed or failed status, got {}",
        status
    );

    pool.close().await;
}

#[tokio::test]
async fn test_reparse_file() {
    let (server_url, _temp_dir, pool) = setup_test_server().await;

    let dxf_content = include_bytes!("../../../fixtures/sample_utf8.dxf");

    let form = multipart::Form::new().part(
        "file",
        multipart::Part::bytes(dxf_content.to_vec())
            .file_name("reparse_test.dxf")
            .mime_str("application/dxf")
            .unwrap(),
    );

    let client = reqwest::Client::new();
    let upload_response = client
        .post(format!("{}/api/projects/1/files", server_url))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send upload request");

    assert_eq!(upload_response.status(), 201);

    let upload_json: Value = upload_response
        .json()
        .await
        .expect("Failed to parse upload JSON");
    let file_id = upload_json["id"].as_u64().unwrap();

    let parse_response1 = client
        .post(format!(
            "{}/api/projects/1/files/{}/parse",
            server_url, file_id
        ))
        .send()
        .await
        .expect("Failed to send first parse request");

    assert!(parse_response1.status() == 200 || parse_response1.status() == 409);

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let parse_response2 = client
        .post(format!(
            "{}/api/projects/1/files/{}/parse",
            server_url, file_id
        ))
        .send()
        .await
        .expect("Failed to send second parse request");

    assert!(parse_response2.status() == 200 || parse_response2.status() == 409);

    pool.close().await;
}
