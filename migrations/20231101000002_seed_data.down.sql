DELETE FROM operations_log
WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.seed')) = 'true'
  AND project_id IN (
      SELECT id FROM projects WHERE name = 'Seed Demo Project'
  );

DELETE FROM projects
WHERE name = 'Seed Demo Project';
