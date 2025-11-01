use crate::models::*;
use dxf::entities::{Entity, LwPolyline, Polyline};

pub fn parse_polyline(entity: &Entity, polyline: &Polyline) -> Option<ParsedEntity> {
    let vertices: Vec<Point> = polyline
        .vertices()
        .map(|v| Point::new(v.location.x, v.location.y, v.location.z))
        .collect();

    if vertices.is_empty() {
        return None;
    }

    Some(ParsedEntity::Polyline(PolylineEntity {
        vertices,
        is_closed: polyline.is_closed(),
        layer: entity.common.layer.clone(),
    }))
}

pub fn parse_lwpolyline(entity: &Entity, lwpolyline: &LwPolyline) -> ParsedEntity {
    let vertices: Vec<Point> = lwpolyline
        .vertices
        .iter()
        .map(|v| Point::new(v.x, v.y, 0.0))
        .collect();

    ParsedEntity::Polyline(PolylineEntity {
        vertices,
        is_closed: lwpolyline.is_closed(),
        layer: entity.common.layer.clone(),
    })
}
