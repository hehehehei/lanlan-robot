mod arc;
mod circle;
mod insert;
mod line;
mod polyline;
mod text;

use crate::models::*;
use dxf::Drawing;
use std::collections::HashSet;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParserError {
    #[error("Failed to load DXF file: {0}")]
    LoadError(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub struct ParserService {
    encoding: Option<&'static encoding_rs::Encoding>,
}

impl ParserService {
    pub fn new() -> Self {
        Self { encoding: None }
    }

    pub fn with_encoding(encoding: &'static encoding_rs::Encoding) -> Self {
        Self {
            encoding: Some(encoding),
        }
    }

    pub fn parse_file<P: AsRef<Path>>(&self, path: P) -> Result<ParseResult, ParserError> {
        let drawing = Drawing::load_file(path.as_ref())
            .map_err(|e| ParserError::LoadError(format!("{:?}", e)))?;

        self.parse_drawing(&drawing)
    }

    pub fn parse_drawing(&self, drawing: &Drawing) -> Result<ParseResult, ParserError> {
        let mut entities = Vec::new();
        let mut unsupported_types = HashSet::new();

        for entity in drawing.entities() {
            match entity.specific {
                dxf::entities::EntityType::Line(ref line) => {
                    entities.push(line::parse_line(entity, line));
                }
                dxf::entities::EntityType::Polyline(ref polyline) => {
                    if let Some(parsed) = polyline::parse_polyline(entity, polyline) {
                        entities.push(parsed);
                    }
                }
                dxf::entities::EntityType::LwPolyline(ref lwpolyline) => {
                    entities.push(polyline::parse_lwpolyline(entity, lwpolyline));
                }
                dxf::entities::EntityType::Arc(ref arc) => {
                    entities.push(arc::parse_arc(entity, arc));
                }
                dxf::entities::EntityType::Circle(ref circle) => {
                    entities.push(circle::parse_circle(entity, circle));
                }
                dxf::entities::EntityType::Text(ref text) => {
                    let content = self.decode_text(&text.value);
                    entities.push(text::parse_text(entity, text, content));
                }
                dxf::entities::EntityType::MText(ref mtext) => {
                    let content = self.decode_text(&mtext.text);
                    entities.push(text::parse_mtext(entity, mtext, content));
                }
                dxf::entities::EntityType::Insert(ref insert) => {
                    entities.push(insert::parse_insert(entity, insert));
                }
                _ => {
                    let type_name = format!("{:?}", entity.specific);
                    let type_name = type_name.split('(').next().unwrap_or("Unknown");
                    if unsupported_types.insert(type_name.to_string()) {
                        log::warn!("Unsupported entity type: {}", type_name);
                    }
                }
            }
        }

        let unsupported_list: Vec<String> = unsupported_types.into_iter().collect();

        Ok(ParseResult::new(entities, unsupported_list))
    }

    fn decode_text(&self, text: &str) -> String {
        if let Some(encoding) = self.encoding {
            let bytes = text.as_bytes();
            let (cow, _encoding, _errors) = encoding.decode(bytes);
            cow.to_string()
        } else {
            let bytes = text.as_bytes();
            let (cow, _detected_encoding, had_errors) = encoding_rs::GB18030.decode(bytes);

            if !had_errors {
                cow.to_string()
            } else {
                text.to_string()
            }
        }
    }
}

impl Default for ParserService {
    fn default() -> Self {
        Self::new()
    }
}
