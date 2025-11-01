use std::path::PathBuf;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub storage_root: PathBuf,
    pub server_host: String,
    pub server_port: u16,
    pub max_file_size: usize,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "mysql://root:password@localhost/cad_db".to_string()),
            storage_root: std::env::var("STORAGE_ROOT")
                .unwrap_or_else(|_| "storage/uploads".to_string())
                .into(),
            server_host: std::env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: std::env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .unwrap_or(3000),
            max_file_size: std::env::var("MAX_FILE_SIZE")
                .unwrap_or_else(|_| (100 * 1024 * 1024).to_string())
                .parse()
                .unwrap_or(100 * 1024 * 1024),
        })
    }
}
