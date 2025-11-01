use crate::error::{AppError, Result};
use crate::models::{BoundingBox, CreateEntityInput, CreateLayerInput, Entity, Layer};
use crate::services::dxf_parser::ParsedLayer;
use sqlx::{MySqlConnection, MySqlPool};
use std::collections::HashMap;

pub struct PersistService;

impl PersistService {
    pub async fn persist_parsed_data(
        pool: &MySqlPool,
        file_id: u64,
        layers: HashMap<String, ParsedLayer>,
    ) -> Result<()> {
        let mut tx = pool.begin().await?;

        sqlx::query(
            "DELETE FROM entities WHERE layer_id IN (SELECT id FROM layers WHERE file_id = ?)",
        )
        .bind(file_id)
        .execute(&mut *tx)
        .await?;

        sqlx::query("DELETE FROM layers WHERE file_id = ?")
            .bind(file_id)
            .execute(&mut *tx)
            .await?;

        for (_, parsed_layer) in layers {
            let layer_id = Self::create_layer(&mut tx, file_id, &parsed_layer.input).await?;

            let mut layer_bbox: Option<BoundingBox> = None;

            for entity_input in parsed_layer.entities {
                Self::create_entity(&mut tx, layer_id, &entity_input).await?;

                let entity_bbox = BoundingBox::new(
                    entity_input.min_x,
                    entity_input.min_y,
                    entity_input.max_x,
                    entity_input.max_y,
                );

                if let Some(ref mut bbox) = layer_bbox {
                    bbox.merge(&entity_bbox);
                } else {
                    layer_bbox = Some(entity_bbox);
                }
            }

            if let Some(bbox) = layer_bbox {
                Self::update_layer_bbox(&mut tx, layer_id, &bbox).await?;
            }
        }

        sqlx::query("UPDATE files SET parse_status = 'parsed', parse_error = NULL WHERE id = ?")
            .bind(file_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn mark_parse_failed(pool: &MySqlPool, file_id: u64, error: &str) -> Result<()> {
        sqlx::query("UPDATE files SET parse_status = 'failed', parse_error = ? WHERE id = ?")
            .bind(error)
            .bind(file_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn mark_parsing(pool: &MySqlPool, file_id: u64) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE files SET parse_status = 'parsing' WHERE id = ? AND parse_status != 'parsing'",
        )
        .bind(file_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    async fn create_layer(
        conn: &mut MySqlConnection,
        file_id: u64,
        input: &CreateLayerInput,
    ) -> Result<u64> {
        let result = sqlx::query(
            "INSERT INTO layers (file_id, name, is_locked, is_visible, color, line_type, line_weight) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(file_id)
        .bind(&input.name)
        .bind(input.is_locked)
        .bind(input.is_visible)
        .bind(&input.color)
        .bind(&input.line_type)
        .bind(&input.line_weight)
        .execute(&mut *conn)
        .await?;

        Ok(result.last_insert_id())
    }

    async fn create_entity(
        conn: &mut MySqlConnection,
        layer_id: u64,
        input: &CreateEntityInput,
    ) -> Result<u64> {
        let data_json = serde_json::to_string(&input.data)
            .map_err(|e| AppError::Internal(format!("JSON serialization error: {}", e)))?;

        let result = sqlx::query(
            "INSERT INTO entities (layer_id, entity_type, data, min_x, min_y, max_x, max_y) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(layer_id)
        .bind(&input.entity_type)
        .bind(data_json)
        .bind(input.min_x)
        .bind(input.min_y)
        .bind(input.max_x)
        .bind(input.max_y)
        .execute(&mut *conn)
        .await?;

        Ok(result.last_insert_id())
    }

    async fn update_layer_bbox(
        conn: &mut MySqlConnection,
        layer_id: u64,
        bbox: &BoundingBox,
    ) -> Result<()> {
        sqlx::query("UPDATE layers SET min_x = ?, min_y = ?, max_x = ?, max_y = ? WHERE id = ?")
            .bind(bbox.min_x)
            .bind(bbox.min_y)
            .bind(bbox.max_x)
            .bind(bbox.max_y)
            .bind(layer_id)
            .execute(&mut *conn)
            .await?;

        Ok(())
    }

    pub async fn get_layers_by_file(pool: &MySqlPool, file_id: u64) -> Result<Vec<Layer>> {
        let layers = sqlx::query_as::<_, Layer>(
            "SELECT id, file_id, name, is_locked, is_visible, color, line_type, line_weight, 
                    min_x, min_y, max_x, max_y, created_at, updated_at 
             FROM layers WHERE file_id = ? ORDER BY name",
        )
        .bind(file_id)
        .fetch_all(pool)
        .await?;

        Ok(layers)
    }

    pub async fn get_entities_by_layer(pool: &MySqlPool, layer_id: u64) -> Result<Vec<Entity>> {
        let entities = sqlx::query_as::<_, Entity>(
            "SELECT id, layer_id, entity_type, data, min_x, min_y, max_x, max_y, 
                    created_at, updated_at 
             FROM entities WHERE layer_id = ? ORDER BY id",
        )
        .bind(layer_id)
        .fetch_all(pool)
        .await?;

        Ok(entities)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_persist_service_exists() {
        let _service = PersistService;
    }
}
