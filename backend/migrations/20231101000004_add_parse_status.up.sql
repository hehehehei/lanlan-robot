ALTER TABLE files
ADD COLUMN parse_status ENUM('uploaded', 'parsing', 'parsed', 'failed') NOT NULL DEFAULT 'uploaded' AFTER encoding,
ADD COLUMN parse_error TEXT NULL AFTER parse_status;

ALTER TABLE layers
ADD COLUMN min_x DOUBLE NULL AFTER line_weight,
ADD COLUMN min_y DOUBLE NULL AFTER min_x,
ADD COLUMN max_x DOUBLE NULL AFTER min_y,
ADD COLUMN max_y DOUBLE NULL AFTER max_x;
