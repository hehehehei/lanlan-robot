use crate::models::*;
use dxf::entities::{Circle, Entity};

pub fn parse_circle(entity: &Entity, circle: &Circle) -> ParsedEntity {
    ParsedEntity::Circle(CircleEntity {
        center: Point::new(circle.center.x, circle.center.y, circle.center.z),
        radius: circle.radius,
        layer: entity.common.layer.clone(),
    })
}
