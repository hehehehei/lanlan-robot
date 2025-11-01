CREATE TABLE IF NOT EXISTS projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_projects_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS files (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1024) NULL,
    checksum CHAR(64) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_files_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY uk_files_project_name (project_id, name),
    INDEX idx_files_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS layers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    file_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    color VARCHAR(32) NULL,
    line_type VARCHAR(64) NULL,
    line_weight VARCHAR(32) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_layers_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE KEY uk_layers_file_name (file_id, name),
    INDEX idx_layers_file_id (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entities (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    file_id BIGINT UNSIGNED NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    label VARCHAR(255) NULL,
    change_summary TEXT NULL,
    snapshot JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_versions_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE KEY uk_versions_file_number (file_id, version_number),
    INDEX idx_versions_file_id (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operations_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NULL,
    file_id BIGINT UNSIGNED NULL,
    layer_id BIGINT UNSIGNED NULL,
    entity_id BIGINT UNSIGNED NULL,
    version_id BIGINT UNSIGNED NULL,
    operation_type VARCHAR(100) NOT NULL,
    description TEXT NULL,
    metadata JSON NULL,
    created_by VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_operations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT fk_operations_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
    CONSTRAINT fk_operations_layer FOREIGN KEY (layer_id) REFERENCES layers(id) ON DELETE SET NULL,
    CONSTRAINT fk_operations_entity FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL,
    CONSTRAINT fk_operations_version FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE SET NULL,
    INDEX idx_operations_project_id (project_id),
    INDEX idx_operations_file_id (file_id),
    INDEX idx_operations_layer_id (layer_id),
    INDEX idx_operations_entity_id (entity_id),
    INDEX idx_operations_version_id (version_id),
    INDEX idx_operations_type (operation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
