use crate::models::*;
use dxf::entities::{Entity, Line};

pub fn parse_line(entity: &Entity, line: &Line) -> ParsedEntity {
    ParsedEntity::Line(LineEntity {
        start: Point::new(line.p1.x, line.p1.y, line.p1.z),
        end: Point::new(line.p2.x, line.p2.y, line.p2.z),
        layer: entity.common.layer.clone(),
    })
}
