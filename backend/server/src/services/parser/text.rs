use crate::models::*;
use dxf::entities::{Entity, MText, Text};

pub fn parse_text(entity: &Entity, text: &Text, decoded_content: String) -> ParsedEntity {
    ParsedEntity::Text(TextEntity {
        position: Point::new(text.location.x, text.location.y, text.location.z),
        content: decoded_content,
        height: text.text_height,
        layer: entity.common.layer.clone(),
    })
}

pub fn parse_mtext(entity: &Entity, mtext: &MText, decoded_content: String) -> ParsedEntity {
    ParsedEntity::Text(TextEntity {
        position: Point::new(
            mtext.insertion_point.x,
            mtext.insertion_point.y,
            mtext.insertion_point.z,
        ),
        content: decoded_content,
        height: mtext.initial_text_height,
        layer: entity.common.layer.clone(),
    })
}
