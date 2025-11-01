use crate::models::*;
use dxf::entities::{Entity, Insert};

pub fn parse_insert(entity: &Entity, insert: &Insert) -> ParsedEntity {
    ParsedEntity::Insert(InsertEntity {
        position: Point::new(insert.location.x, insert.location.y, insert.location.z),
        block_name: insert.name.clone(),
        layer: entity.common.layer.clone(),
        scale_x: insert.x_scale_factor,
        scale_y: insert.y_scale_factor,
        scale_z: insert.z_scale_factor,
        rotation: insert.rotation,
    })
}
