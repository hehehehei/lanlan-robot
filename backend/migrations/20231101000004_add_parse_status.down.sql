ALTER TABLE layers
DROP COLUMN max_y,
DROP COLUMN max_x,
DROP COLUMN min_y,
DROP COLUMN min_x;

ALTER TABLE files
DROP COLUMN parse_error,
DROP COLUMN parse_status;
