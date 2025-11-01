# DXF Parser Service Examples

## Basic Usage

### Parse a DXF file and print statistics

```rust
use dxf_parser_service::ParserService;

fn main() {
    let parser = ParserService::new();
    
    match parser.parse_file("sample.dxf") {
        Ok(result) => {
            println!("Total entities: {}", result.entities.len());
            println!("Layers found: {}", result.layers.len());
            println!("Layer names: {:?}", result.layers);
            
            if let Some(bbox) = result.bounding_box {
                println!("Drawing bounds:");
                println!("  Min: ({:.2}, {:.2}, {:.2})", bbox.min.x, bbox.min.y, bbox.min.z);
                println!("  Max: ({:.2}, {:.2}, {:.2})", bbox.max.x, bbox.max.y, bbox.max.z);
            }
            
            if !result.unsupported_entity_types.is_empty() {
                println!("Unsupported entities: {:?}", result.unsupported_entity_types);
            }
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Filtering Entities by Type

### Extract only line entities

```rust
use dxf_parser_service::{ParserService, ParsedEntity};

fn main() {
    let parser = ParserService::new();
    let result = parser.parse_file("sample.dxf").unwrap();
    
    for entity in result.entities {
        if let ParsedEntity::Line(line) = entity {
            println!("Line from ({:.2}, {:.2}) to ({:.2}, {:.2}) on layer '{}'",
                line.start.x, line.start.y,
                line.end.x, line.end.y,
                line.layer);
        }
    }
}
```

### Extract text entities

```rust
use dxf_parser_service::{ParserService, ParsedEntity};

fn main() {
    let parser = ParserService::new();
    let result = parser.parse_file("sample.dxf").unwrap();
    
    for entity in result.entities {
        if let ParsedEntity::Text(text) = entity {
            println!("Text: '{}' at ({:.2}, {:.2}), height: {:.2}, layer: '{}'",
                text.content,
                text.position.x, text.position.y,
                text.height,
                text.layer);
        }
    }
}
```

## Filtering Entities by Layer

```rust
use dxf_parser_service::ParserService;

fn main() {
    let parser = ParserService::new();
    let result = parser.parse_file("sample.dxf").unwrap();
    
    let layer_name = "LAYER1";
    let layer_entities: Vec<_> = result.entities
        .into_iter()
        .filter(|e| e.layer() == layer_name)
        .collect();
    
    println!("Found {} entities on layer '{}'", layer_entities.len(), layer_name);
}
```

## Computing Statistics

### Count entities by type

```rust
use dxf_parser_service::{ParserService, ParsedEntity};
use std::collections::HashMap;

fn main() {
    let parser = ParserService::new();
    let result = parser.parse_file("sample.dxf").unwrap();
    
    let mut counts = HashMap::new();
    
    for entity in &result.entities {
        let type_name = match entity {
            ParsedEntity::Line(_) => "Line",
            ParsedEntity::Polyline(_) => "Polyline",
            ParsedEntity::Arc(_) => "Arc",
            ParsedEntity::Circle(_) => "Circle",
            ParsedEntity::Text(_) => "Text",
            ParsedEntity::Insert(_) => "Insert",
        };
        *counts.entry(type_name).or_insert(0) += 1;
    }
    
    println!("Entity counts:");
    for (type_name, count) in counts {
        println!("  {}: {}", type_name, count);
    }
}
```

## Working with Chinese Text

### Parse with specific encoding

```rust
use dxf_parser_service::ParserService;
use encoding_rs::GB18030;

fn main() {
    let parser = ParserService::with_encoding(GB18030);
    let result = parser.parse_file("chinese_text.dxf").unwrap();
    
    for entity in result.entities {
        if let dxf_parser_service::ParsedEntity::Text(text) = entity {
            println!("Chinese text: {}", text.content);
        }
    }
}
```

## Using with Async Code

The parser service is sync, but can be easily used in async contexts:

```rust
use dxf_parser_service::ParserService;
use tokio::task;

#[tokio::main]
async fn main() {
    let file_path = "sample.dxf".to_string();
    
    let result = task::spawn_blocking(move || {
        let parser = ParserService::new();
        parser.parse_file(&file_path)
    }).await.unwrap();
    
    match result {
        Ok(parse_result) => {
            println!("Parsed {} entities", parse_result.entities.len());
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Processing Multiple Files

```rust
use dxf_parser_service::ParserService;
use std::fs;

fn main() {
    let parser = ParserService::new();
    let dxf_dir = "dxf_files";
    
    let entries = fs::read_dir(dxf_dir).unwrap();
    
    for entry in entries {
        let entry = entry.unwrap();
        let path = entry.path();
        
        if path.extension().and_then(|s| s.to_str()) == Some("dxf") {
            println!("Processing: {:?}", path);
            
            match parser.parse_file(&path) {
                Ok(result) => {
                    println!("  Entities: {}", result.entities.len());
                    println!("  Layers: {}", result.layers.len());
                }
                Err(e) => eprintln!("  Error: {}", e),
            }
        }
    }
}
```

## Converting to JSON

With serde support, you can easily convert results to JSON:

```rust
use dxf_parser_service::ParserService;

fn main() {
    let parser = ParserService::new();
    let result = parser.parse_file("sample.dxf").unwrap();
    
    let json = serde_json::to_string_pretty(&result).unwrap();
    println!("{}", json);
}
```

## Error Handling Patterns

### Handle specific errors

```rust
use dxf_parser_service::{ParserService, parser::ParserError};

fn main() {
    let parser = ParserService::new();
    
    match parser.parse_file("sample.dxf") {
        Ok(result) => {
            println!("Success: {} entities", result.entities.len());
        }
        Err(ParserError::IoError(e)) => {
            eprintln!("File I/O error: {}", e);
        }
        Err(ParserError::LoadError(e)) => {
            eprintln!("DXF parsing error: {}", e);
        }
    }
}
```

## Custom Entity Processing

### Process entities with custom logic

```rust
use dxf_parser_service::{ParserService, ParsedEntity, BoundingBox, Point};

fn calculate_total_length(entities: &[ParsedEntity]) -> f64 {
    let mut total = 0.0;
    
    for entity in entities {
        match entity {
            ParsedEntity::Line(line) => {
                let dx = line.end.x - line.start.x;
                let dy = line.end.y - line.start.y;
                let dz = line.end.z - line.start.z;
                total += (dx * dx + dy * dy + dz * dz).sqrt();
            }
            ParsedEntity::Polyline(poly) => {
                for i in 1..poly.vertices.len() {
                    let p1 = &poly.vertices[i - 1];
                    let p2 = &poly.vertices[i];
                    let dx = p2.x - p1.x;
                    let dy = p2.y - p1.y;
                    let dz = p2.z - p1.z;
                    total += (dx * dx + dy * dy + dz * dz).sqrt();
                }
            }
            _ => {}
        }
    }
    
    total
}

fn main() {
    let parser = ParserService::new();
    let result = parser.parse_file("sample.dxf").unwrap();
    
    let total_length = calculate_total_length(&result.entities);
    println!("Total length of lines and polylines: {:.2}", total_length);
}
```
