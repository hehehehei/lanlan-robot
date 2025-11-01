use crate::error::Result;
use crate::models::{BoundingBox, CreateEntityInput, CreateLayerInput};
use serde_json::json;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ParsedLayer {
    pub input: CreateLayerInput,
    pub entities: Vec<CreateEntityInput>,
}

#[derive(Debug)]
pub struct DxfParser {
    layers: HashMap<String, ParsedLayer>,
}

impl DxfParser {
    pub fn new() -> Self {
        Self {
            layers: HashMap::new(),
        }
    }

    pub fn parse(&mut self, content: &str) -> Result<HashMap<String, ParsedLayer>> {
        let lines: Vec<&str> = content.lines().collect();
        let mut i = 0;

        self.ensure_default_layer();

        while i < lines.len() {
            let line = lines[i].trim();

            if line == "SECTION" {
                i += 1;
                if i < lines.len() && lines[i].trim() == "2" {
                    i += 1;
                    if i < lines.len() {
                        let section_type = lines[i].trim();
                        match section_type {
                            "TABLES" => {
                                i = self.parse_tables_section(&lines, i + 1)?;
                            }
                            "ENTITIES" => {
                                i = self.parse_entities_section(&lines, i + 1)?;
                            }
                            _ => {
                                i = self.skip_to_endsec(&lines, i + 1);
                            }
                        }
                    }
                }
            } else {
                i += 1;
            }
        }

        Ok(self.layers.clone())
    }

    fn ensure_default_layer(&mut self) {
        if !self.layers.contains_key("0") {
            self.layers.insert(
                "0".to_string(),
                ParsedLayer {
                    input: CreateLayerInput {
                        name: "0".to_string(),
                        is_locked: false,
                        is_visible: true,
                        color: Some("7".to_string()),
                        line_type: Some("CONTINUOUS".to_string()),
                        line_weight: None,
                    },
                    entities: Vec::new(),
                },
            );
        }
    }

    fn parse_tables_section(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut i = start;

        while i < lines.len() {
            let line = lines[i].trim();

            if line == "ENDSEC" {
                return Ok(i + 1);
            }

            if line == "TABLE" {
                i += 1;
                if i < lines.len() && lines[i].trim() == "2" {
                    i += 1;
                    if i < lines.len() && lines[i].trim() == "LAYER" {
                        i = self.parse_layer_table(&lines, i + 1)?;
                    } else {
                        i = self.skip_to_endtab(&lines, i);
                    }
                }
            } else {
                i += 1;
            }
        }

        Ok(i)
    }

    fn parse_layer_table(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut i = start;

        while i < lines.len() {
            let line = lines[i].trim();

            if line == "ENDTAB" {
                return Ok(i + 1);
            }

            if line == "LAYER" {
                let mut layer_name = "0".to_string();
                let mut is_locked = false;
                let mut color: Option<String> = None;
                let mut line_type: Option<String> = None;

                i += 1;
                while i < lines.len() {
                    let code = lines[i].trim();

                    if code == "0" {
                        break;
                    }

                    i += 1;
                    if i >= lines.len() {
                        break;
                    }

                    let value = lines[i].trim();

                    match code {
                        "2" => layer_name = value.to_string(),
                        "70" => is_locked = value.parse::<i32>().unwrap_or(0) & 4 != 0,
                        "62" => color = Some(value.to_string()),
                        "6" => line_type = Some(value.to_string()),
                        _ => {}
                    }

                    i += 1;
                }

                self.layers.insert(
                    layer_name.clone(),
                    ParsedLayer {
                        input: CreateLayerInput {
                            name: layer_name,
                            is_locked,
                            is_visible: true,
                            color,
                            line_type,
                            line_weight: None,
                        },
                        entities: Vec::new(),
                    },
                );
            } else {
                i += 1;
            }
        }

        Ok(i)
    }

    fn parse_entities_section(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut i = start;

        while i < lines.len() {
            let line = lines[i].trim();

            if line == "ENDSEC" {
                return Ok(i + 1);
            }

            if line == "LINE" {
                i = self.parse_line(&lines, i + 1)?;
            } else if line == "POLYLINE" {
                i = self.parse_polyline(&lines, i + 1)?;
            } else if line == "ARC" {
                i = self.parse_arc(&lines, i + 1)?;
            } else if line == "CIRCLE" {
                i = self.parse_circle(&lines, i + 1)?;
            } else if line == "TEXT" {
                i = self.parse_text(&lines, i + 1)?;
            } else {
                i += 1;
            }
        }

        Ok(i)
    }

    fn parse_line(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut layer_name = "0".to_string();
        let mut x1: f64 = 0.0;
        let mut y1: f64 = 0.0;
        let mut x2: f64 = 0.0;
        let mut y2: f64 = 0.0;

        let mut i = start;
        while i < lines.len() {
            let code = lines[i].trim();

            if code == "0" {
                break;
            }

            i += 1;
            if i >= lines.len() {
                break;
            }

            let value = lines[i].trim();

            match code {
                "8" => layer_name = value.to_string(),
                "10" => x1 = value.parse().unwrap_or(0.0),
                "20" => y1 = value.parse().unwrap_or(0.0),
                "11" => x2 = value.parse().unwrap_or(0.0),
                "21" => y2 = value.parse().unwrap_or(0.0),
                _ => {}
            }

            i += 1;
        }

        let bbox = BoundingBox::new(x1.min(x2), y1.min(y2), x1.max(x2), y1.max(y2));

        let entity = CreateEntityInput {
            entity_type: "LINE".to_string(),
            data: json!({
                "start": {"x": x1, "y": y1},
                "end": {"x": x2, "y": y2}
            }),
            min_x: bbox.min_x,
            min_y: bbox.min_y,
            max_x: bbox.max_x,
            max_y: bbox.max_y,
        };

        self.add_entity_to_layer(&layer_name, entity);

        Ok(i)
    }

    fn parse_polyline(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut layer_name = "0".to_string();
        let mut i = start;

        while i < lines.len() {
            let code = lines[i].trim();

            if code == "0" {
                break;
            }

            i += 1;
            if i >= lines.len() {
                break;
            }

            let value = lines[i].trim();

            match code {
                "8" => layer_name = value.to_string(),
                _ => {}
            }

            i += 1;
        }

        let mut vertices = Vec::new();
        while i < lines.len() {
            let line = lines[i].trim();

            if line == "SEQEND"
                || (line == "0" && i + 1 < lines.len() && lines[i + 1].trim() != "VERTEX")
            {
                break;
            }

            if line == "VERTEX" {
                i += 1;
                let mut x = 0.0;
                let mut y = 0.0;

                while i < lines.len() {
                    let code = lines[i].trim();

                    if code == "0" {
                        break;
                    }

                    i += 1;
                    if i >= lines.len() {
                        break;
                    }

                    let value = lines[i].trim();

                    match code {
                        "10" => x = value.parse().unwrap_or(0.0),
                        "20" => y = value.parse().unwrap_or(0.0),
                        _ => {}
                    }

                    i += 1;
                }

                vertices.push(json!({"x": x, "y": y}));
            } else {
                i += 1;
            }
        }

        if !vertices.is_empty() {
            let mut bbox = if let Some(first) = vertices.first() {
                BoundingBox::from_point(
                    first["x"].as_f64().unwrap_or(0.0),
                    first["y"].as_f64().unwrap_or(0.0),
                )
            } else {
                BoundingBox::from_point(0.0, 0.0)
            };

            for vertex in &vertices {
                let x = vertex["x"].as_f64().unwrap_or(0.0);
                let y = vertex["y"].as_f64().unwrap_or(0.0);
                bbox.expand(x, y);
            }

            let entity = CreateEntityInput {
                entity_type: "POLYLINE".to_string(),
                data: json!({
                    "vertices": vertices
                }),
                min_x: bbox.min_x,
                min_y: bbox.min_y,
                max_x: bbox.max_x,
                max_y: bbox.max_y,
            };

            self.add_entity_to_layer(&layer_name, entity);
        }

        Ok(i)
    }

    fn parse_arc(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut layer_name = "0".to_string();
        let mut cx = 0.0;
        let mut cy = 0.0;
        let mut radius = 0.0;
        let mut start_angle = 0.0;
        let mut end_angle = 360.0;

        let mut i = start;
        while i < lines.len() {
            let code = lines[i].trim();

            if code == "0" {
                break;
            }

            i += 1;
            if i >= lines.len() {
                break;
            }

            let value = lines[i].trim();

            match code {
                "8" => layer_name = value.to_string(),
                "10" => cx = value.parse().unwrap_or(0.0),
                "20" => cy = value.parse().unwrap_or(0.0),
                "40" => radius = value.parse().unwrap_or(0.0),
                "50" => start_angle = value.parse().unwrap_or(0.0),
                "51" => end_angle = value.parse().unwrap_or(360.0),
                _ => {}
            }

            i += 1;
        }

        let bbox = BoundingBox::new(cx - radius, cy - radius, cx + radius, cy + radius);

        let entity = CreateEntityInput {
            entity_type: "ARC".to_string(),
            data: json!({
                "center": {"x": cx, "y": cy},
                "radius": radius,
                "start_angle": start_angle,
                "end_angle": end_angle
            }),
            min_x: bbox.min_x,
            min_y: bbox.min_y,
            max_x: bbox.max_x,
            max_y: bbox.max_y,
        };

        self.add_entity_to_layer(&layer_name, entity);

        Ok(i)
    }

    fn parse_circle(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut layer_name = "0".to_string();
        let mut cx = 0.0;
        let mut cy = 0.0;
        let mut radius = 0.0;

        let mut i = start;
        while i < lines.len() {
            let code = lines[i].trim();

            if code == "0" {
                break;
            }

            i += 1;
            if i >= lines.len() {
                break;
            }

            let value = lines[i].trim();

            match code {
                "8" => layer_name = value.to_string(),
                "10" => cx = value.parse().unwrap_or(0.0),
                "20" => cy = value.parse().unwrap_or(0.0),
                "40" => radius = value.parse().unwrap_or(0.0),
                _ => {}
            }

            i += 1;
        }

        let bbox = BoundingBox::new(cx - radius, cy - radius, cx + radius, cy + radius);

        let entity = CreateEntityInput {
            entity_type: "CIRCLE".to_string(),
            data: json!({
                "center": {"x": cx, "y": cy},
                "radius": radius
            }),
            min_x: bbox.min_x,
            min_y: bbox.min_y,
            max_x: bbox.max_x,
            max_y: bbox.max_y,
        };

        self.add_entity_to_layer(&layer_name, entity);

        Ok(i)
    }

    fn parse_text(&mut self, lines: &[&str], start: usize) -> Result<usize> {
        let mut layer_name = "0".to_string();
        let mut x = 0.0;
        let mut y = 0.0;
        let mut height = 0.0;
        let mut text = String::new();

        let mut i = start;
        while i < lines.len() {
            let code = lines[i].trim();

            if code == "0" {
                break;
            }

            i += 1;
            if i >= lines.len() {
                break;
            }

            let value = lines[i].trim();

            match code {
                "8" => layer_name = value.to_string(),
                "10" => x = value.parse().unwrap_or(0.0),
                "20" => y = value.parse().unwrap_or(0.0),
                "40" => height = value.parse().unwrap_or(0.0),
                "1" => text = value.to_string(),
                _ => {}
            }

            i += 1;
        }

        let bbox = BoundingBox::new(x, y, x + text.len() as f64 * height * 0.6, y + height);

        let entity = CreateEntityInput {
            entity_type: "TEXT".to_string(),
            data: json!({
                "position": {"x": x, "y": y},
                "text": text,
                "height": height
            }),
            min_x: bbox.min_x,
            min_y: bbox.min_y,
            max_x: bbox.max_x,
            max_y: bbox.max_y,
        };

        self.add_entity_to_layer(&layer_name, entity);

        Ok(i)
    }

    fn add_entity_to_layer(&mut self, layer_name: &str, entity: CreateEntityInput) {
        self.ensure_default_layer();

        if !self.layers.contains_key(layer_name) {
            self.layers.insert(
                layer_name.to_string(),
                ParsedLayer {
                    input: CreateLayerInput {
                        name: layer_name.to_string(),
                        is_locked: false,
                        is_visible: true,
                        color: Some("7".to_string()),
                        line_type: Some("CONTINUOUS".to_string()),
                        line_weight: None,
                    },
                    entities: Vec::new(),
                },
            );
        }

        if let Some(layer) = self.layers.get_mut(layer_name) {
            layer.entities.push(entity);
        }
    }

    fn skip_to_endsec(&self, lines: &[&str], start: usize) -> usize {
        for i in start..lines.len() {
            if lines[i].trim() == "ENDSEC" {
                return i + 1;
            }
        }
        lines.len()
    }

    fn skip_to_endtab(&self, lines: &[&str], start: usize) -> usize {
        for i in start..lines.len() {
            if lines[i].trim() == "ENDTAB" {
                return i + 1;
            }
        }
        lines.len()
    }
}

pub fn parse_dxf(content: &str) -> Result<HashMap<String, ParsedLayer>> {
    let mut parser = DxfParser::new();
    parser.parse(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_dxf() {
        let content = r#"0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
0
LAYER
2
0
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
11
100.0
21
100.0
0
ENDSEC
0
EOF
"#;

        let result = parse_dxf(content);
        assert!(result.is_ok());

        let layers = result.unwrap();
        assert!(layers.contains_key("0"));

        let layer = &layers["0"];
        assert_eq!(layer.entities.len(), 1);
        assert_eq!(layer.entities[0].entity_type, "LINE");
    }

    #[test]
    fn test_parse_text() {
        let content = r#"0
SECTION
2
ENTITIES
0
TEXT
8
0
10
10.0
20
10.0
40
5.0
1
Sample Text
0
ENDSEC
0
EOF
"#;

        let result = parse_dxf(content);
        assert!(result.is_ok());

        let layers = result.unwrap();
        assert!(layers.contains_key("0"));

        let layer = &layers["0"];
        assert_eq!(layer.entities.len(), 1);
        assert_eq!(layer.entities[0].entity_type, "TEXT");
        assert_eq!(layer.entities[0].data["text"], "Sample Text");
    }
}
