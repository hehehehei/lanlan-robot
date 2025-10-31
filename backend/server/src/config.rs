use std::{
    env,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};

use anyhow::{Context, Result};

#[derive(Clone, Debug)]
pub struct AppConfig {
    database_url: String,
    app_port: u16,
    file_storage_dir: PathBuf,
    log_level: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        let database_url = env::var("DATABASE_URL")
            .context("DATABASE_URL must be set to connect to the database")?;

        let app_port = env::var("APP_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .context("APP_PORT must be a valid unsigned 16-bit integer")?;

        let file_storage_dir = env::var("FILE_STORAGE_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("storage"));

        let log_level = env::var("RUST_LOG")
            .unwrap_or_else(|_| "server=info,sqlx=warn,tower_http=warn".to_string());

        Ok(Self {
            database_url,
            app_port,
            file_storage_dir,
            log_level,
        })
    }

    pub fn database_url(&self) -> &str {
        &self.database_url
    }

    pub fn socket_addr(&self) -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), self.app_port)
    }

    pub fn file_storage_dir(&self) -> &PathBuf {
        &self.file_storage_dir
    }

    pub fn log_level(&self) -> &str {
        &self.log_level
    }
}
