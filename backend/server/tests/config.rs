use server::config::Config;

#[test]
fn test_config_loads_successfully() {
    let config = Config::from_env();
    assert!(config.is_ok(), "Config should load successfully");

    let config = config.unwrap();
    assert!(!config.database_url.is_empty());
    assert!(!config.server_host.is_empty());
    assert!(config.server_port > 0);
    assert!(config.max_file_size > 0);
}
