use crate::models::*;
use dxf::entities::{Arc, Entity};

pub fn parse_arc(entity: &Entity, arc: &Arc) -> ParsedEntity {
    ParsedEntity::Arc(ArcEntity {
        center: Point::new(arc.center.x, arc.center.y, arc.center.z),
        radius: arc.radius,
        start_angle: arc.start_angle,
        end_angle: arc.end_angle,
        layer: entity.common.layer.clone(),
    })
}
