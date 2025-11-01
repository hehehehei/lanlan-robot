INSERT INTO projects (name, description)
SELECT 'Seed Demo Project', 'Sample project data for development and testing purposes'
WHERE NOT EXISTS (
    SELECT 1 FROM projects WHERE name = 'Seed Demo Project'
);

INSERT INTO files (project_id, name, storage_path, checksum)
SELECT p.id, 'Seed Demo File', 'seed/demo-file.dwg', NULL
FROM projects p
WHERE p.name = 'Seed Demo Project'
  AND NOT EXISTS (
      SELECT 1
      FROM files f
      WHERE f.project_id = p.id
        AND f.name = 'Seed Demo File'
  );

INSERT INTO layers (file_id, name, is_locked, is_visible, color, line_type, line_weight)
SELECT f.id, 'Seed Geometry Layer', 0, 1, '#FFFFFF', 'Continuous', 'Default'
FROM projects p
JOIN files f ON f.project_id = p.id
WHERE p.name = 'Seed Demo Project'
  AND f.name = 'Seed Demo File'
  AND NOT EXISTS (
      SELECT 1
      FROM layers l
      WHERE l.file_id = f.id
        AND l.name = 'Seed Geometry Layer'
  );

INSERT INTO layers (file_id, name, is_locked, is_visible, color, line_type, line_weight)
SELECT f.id, 'Seed Annotation Layer', 0, 1, '#FFFF00', 'Dashed', 'Default'
FROM projects p
JOIN files f ON f.project_id = p.id
WHERE p.name = 'Seed Demo Project'
  AND f.name = 'Seed Demo File'
  AND NOT EXISTS (
      SELECT 1
      FROM layers l
      WHERE l.file_id = f.id
        AND l.name = 'Seed Annotation Layer'
  );

INSERT INTO entities (layer_id, entity_type, data, min_x, min_y, max_x, max_y)
SELECT l.id,
       se.entity_type,
       se.data,
       se.min_x,
       se.min_y,
       se.max_x,
       se.max_y
FROM projects p
JOIN files f ON f.project_id = p.id AND f.name = 'Seed Demo File'
JOIN layers l ON l.file_id = f.id AND l.name = 'Seed Geometry Layer'
JOIN (
    SELECT 'entity-line-1' AS seed_key,
           'LINE' AS entity_type,
           JSON_OBJECT(
               'seed_key', 'entity-line-1',
               'start', JSON_OBJECT('x', 0, 'y', 0),
               'end', JSON_OBJECT('x', 100, 'y', 0)
           ) AS data,
           0.0 AS min_x,
           0.0 AS min_y,
           100.0 AS max_x,
           0.0 AS max_y
    UNION ALL
    SELECT 'entity-polyline-1' AS seed_key,
           'POLYLINE' AS entity_type,
           JSON_OBJECT(
               'seed_key', 'entity-polyline-1',
               'points', JSON_ARRAY(
                   JSON_OBJECT('x', 0, 'y', 0),
                   JSON_OBJECT('x', 50, 'y', 100),
                   JSON_OBJECT('x', 100, 'y', 0)
               )
           ) AS data,
           0.0 AS min_x,
           0.0 AS min_y,
           100.0 AS max_x,
           100.0 AS max_y
    UNION ALL
    SELECT 'entity-arc-1' AS seed_key,
           'ARC' AS entity_type,
           JSON_OBJECT(
               'seed_key', 'entity-arc-1',
               'center', JSON_OBJECT('x', 50, 'y', 50),
               'radius', 25,
               'start_angle', 0,
               'end_angle', 180
           ) AS data,
           25.0 AS min_x,
           25.0 AS min_y,
           75.0 AS max_x,
           75.0 AS max_y
    UNION ALL
    SELECT 'entity-circle-1' AS seed_key,
           'CIRCLE' AS entity_type,
           JSON_OBJECT(
               'seed_key', 'entity-circle-1',
               'center', JSON_OBJECT('x', 150, 'y', 75),
               'radius', 25
           ) AS data,
           125.0 AS min_x,
           50.0 AS min_y,
           175.0 AS max_x,
           100.0 AS max_y
) AS se
LEFT JOIN entities existing ON existing.layer_id = l.id
    AND JSON_UNQUOTE(JSON_EXTRACT(existing.data, '$.seed_key')) = se.seed_key
WHERE p.name = 'Seed Demo Project'
  AND existing.id IS NULL;

INSERT INTO entities (layer_id, entity_type, data, min_x, min_y, max_x, max_y)
SELECT l.id,
       se.entity_type,
       se.data,
       se.min_x,
       se.min_y,
       se.max_x,
       se.max_y
FROM projects p
JOIN files f ON f.project_id = p.id AND f.name = 'Seed Demo File'
JOIN layers l ON l.file_id = f.id AND l.name = 'Seed Annotation Layer'
JOIN (
    SELECT 'entity-text-1' AS seed_key,
           'TEXT' AS entity_type,
           JSON_OBJECT(
               'seed_key', 'entity-text-1',
               'content', 'Demo Annotation',
               'position', JSON_OBJECT('x', 20, 'y', 20),
               'height', 12
           ) AS data,
           20.0 AS min_x,
           20.0 AS min_y,
           95.0 AS max_x,
           35.0 AS max_y
    UNION ALL
    SELECT 'entity-insert-1' AS seed_key,
           'INSERT' AS entity_type,
           JSON_OBJECT(
               'seed_key', 'entity-insert-1',
               'block_name', 'DoorBlock',
               'position', JSON_OBJECT('x', 200, 'y', 50),
               'scale', JSON_OBJECT('x', 1, 'y', 1),
               'rotation', 0
           ) AS data,
           190.0 AS min_x,
           40.0 AS min_y,
           210.0 AS max_x,
           60.0 AS max_y
) AS se
LEFT JOIN entities existing ON existing.layer_id = l.id
    AND JSON_UNQUOTE(JSON_EXTRACT(existing.data, '$.seed_key')) = se.seed_key
WHERE p.name = 'Seed Demo Project'
  AND existing.id IS NULL;

INSERT INTO versions (file_id, version_number, label, change_summary, snapshot)
SELECT f.id,
       1,
       'Initial Seed Version',
       'Initial version capturing seeded drawing state',
       JSON_OBJECT('note', 'Seed baseline state', 'entity_count', 6)
FROM projects p
JOIN files f ON f.project_id = p.id
WHERE p.name = 'Seed Demo Project'
  AND f.name = 'Seed Demo File'
  AND NOT EXISTS (
      SELECT 1
      FROM versions v
      WHERE v.file_id = f.id
        AND v.version_number = 1
  );

INSERT INTO operations_log (project_id, file_id, layer_id, entity_id, version_id, operation_type, description, metadata, created_by)
SELECT p.id,
       f.id,
       NULL,
       NULL,
       v.id,
       'CREATE_FILE',
       'Seed: created initial demo file',
       JSON_OBJECT('seed', true),
       'system'
FROM projects p
JOIN files f ON f.project_id = p.id
JOIN versions v ON v.file_id = f.id AND v.version_number = 1
WHERE p.name = 'Seed Demo Project'
  AND f.name = 'Seed Demo File'
  AND NOT EXISTS (
      SELECT 1
      FROM operations_log ol
      WHERE ol.file_id = f.id
        AND ol.operation_type = 'CREATE_FILE'
        AND JSON_UNQUOTE(JSON_EXTRACT(ol.metadata, '$.seed')) = 'true'
  );

INSERT INTO operations_log (project_id, file_id, layer_id, entity_id, version_id, operation_type, description, metadata, created_by)
SELECT p.id,
       f.id,
       l.id,
       NULL,
       v.id,
       'CREATE_LAYER',
       'Seed: created geometry layer',
       JSON_OBJECT('seed', true),
       'system'
FROM projects p
JOIN files f ON f.project_id = p.id
JOIN versions v ON v.file_id = f.id AND v.version_number = 1
JOIN layers l ON l.file_id = f.id AND l.name = 'Seed Geometry Layer'
WHERE p.name = 'Seed Demo Project'
  AND f.name = 'Seed Demo File'
  AND NOT EXISTS (
      SELECT 1
      FROM operations_log ol
      WHERE ol.layer_id = l.id
        AND ol.operation_type = 'CREATE_LAYER'
        AND JSON_UNQUOTE(JSON_EXTRACT(ol.metadata, '$.seed')) = 'true'
  );

INSERT INTO operations_log (project_id, file_id, layer_id, entity_id, version_id, operation_type, description, metadata, created_by)
SELECT p.id,
       f.id,
       l.id,
       e.id,
       v.id,
       'CREATE_ENTITY',
       'Seed: created sample line entity',
       JSON_OBJECT('seed', true),
       'system'
FROM projects p
JOIN files f ON f.project_id = p.id
JOIN versions v ON v.file_id = f.id AND v.version_number = 1
JOIN layers l ON l.file_id = f.id AND l.name = 'Seed Geometry Layer'
JOIN entities e ON e.layer_id = l.id
WHERE p.name = 'Seed Demo Project'
  AND f.name = 'Seed Demo File'
  AND JSON_UNQUOTE(JSON_EXTRACT(e.data, '$.seed_key')) = 'entity-line-1'
  AND NOT EXISTS (
      SELECT 1
      FROM operations_log ol
      WHERE ol.entity_id = e.id
        AND ol.operation_type = 'CREATE_ENTITY'
        AND JSON_UNQUOTE(JSON_EXTRACT(ol.metadata, '$.seed')) = 'true'
  );
