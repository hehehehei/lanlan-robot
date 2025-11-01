use config::{Config as ConfigBuilder, ConfigError, Environment};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Clone, Debug, Deserialize)]
pub struct Config {
    #[serde(default = "default_database_url")]
    pub database_url: String,
    #[serde(default = "default_storage_root")]
    pub storage_root: PathBuf,
    #[serde(default = "default_server_host")]
    pub server_host: String,
    #[serde(default = "default_server_port")]
    pub server_port: u16,
    #[serde(default = "default_max_file_size")]
    pub max_file_size: usize,
}

fn default_database_url() -> String {
    "mysql://root:password@localhost/cad_db".to_string()
}

fn default_storage_root() -> PathBuf {
    "storage/uploads".into()
}

fn default_server_host() -> String {
    "127.0.0.1".to_string()
}

fn default_server_port() -> u16 {
    3000
}

fn default_max_file_size() -> usize {
    100 * 1024 * 1024
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let config = ConfigBuilder::builder()
            .set_default("database_url", default_database_url())?
            .set_default("storage_root", default_storage_root().to_str().unwrap())?
            .set_default("server_host", default_server_host())?
            .set_default("server_port", default_server_port() as i64)?
            .set_default("max_file_size", default_max_file_size() as i64)?
            .add_source(Environment::default().separator("__"))
            .build()?;

        config.try_deserialize()
    }
}
