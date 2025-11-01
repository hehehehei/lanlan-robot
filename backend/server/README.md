# DXF Parser Service

A Rust service for parsing DXF (Drawing Exchange Format) CAD files.

## Features

- Parse DXF files using the `dxf` crate
- Support for common DXF entities:
  - Line
  - Polyline (including LwPolyline)
  - Arc
  - Circle
  - Text (including MText)
  - Insert (block references)
- Chinese text decoding support using GB18030 encoding
- Compute bounding boxes for entities and overall drawing
- Extract layer information
- Log unsupported entity types without panicking
- Async-ready service interface

## Installation

```bash
cargo build --release
```

## Usage

### As a Library

```rust
use dxf_parser_service::ParserService;

fn main() {
    let parser = ParserService::new();
    
    match parser.parse_file("path/to/file.dxf") {
        Ok(result) => {
            println!("Parsed {} entities", result.entities.len());
            println!("Layers: {:?}", result.layers);
            
            for entity in result.entities {
                println!("Entity on layer: {}", entity.layer());
                if let Some(bbox) = entity.bounding_box() {
                    println!("Bounding box: {:?}", bbox);
                }
            }
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

### As a Binary

```bash
cargo run -- path/to/file.dxf
```

## Project Structure

```
backend/server/
├── src/
│   ├── main.rs                    # CLI binary
│   ├── lib.rs                     # Library entry point
│   ├── models/
│   │   ├── mod.rs
│   │   └── parsed_entity.rs       # Entity models and bounding box
│   └── services/
│       └── parser/
│           ├── mod.rs             # Main parser service
│           ├── line.rs            # Line entity parser
│           ├── polyline.rs        # Polyline entity parser
│           ├── arc.rs             # Arc entity parser
│           ├── circle.rs          # Circle entity parser
│           ├── text.rs            # Text entity parser
│           └── insert.rs          # Insert entity parser
├── tests/
│   └── parser.rs                  # Integration tests
├── fixtures/
│   └── sample.dxf                 # Sample DXF file for testing
└── Cargo.toml
```

## API

### ParserService

Main service for parsing DXF files.

#### Methods

- `new() -> Self` - Create a new parser with default settings
- `with_encoding(encoding: &'static encoding_rs::Encoding) -> Self` - Create parser with specific encoding
- `parse_file<P: AsRef<Path>>(path: P) -> Result<ParseResult, ParserError>` - Parse a DXF file from disk
- `parse_drawing(drawing: &Drawing) -> Result<ParseResult, ParserError>` - Parse a DXF drawing object

### ParseResult

Result of parsing a DXF file.

#### Fields

- `entities: Vec<ParsedEntity>` - Parsed entities
- `layers: Vec<String>` - List of layer names (sorted)
- `bounding_box: Option<BoundingBox>` - Overall bounding box
- `unsupported_entity_types: Vec<String>` - List of unsupported entity types encountered

### ParsedEntity

Enum representing different entity types.

#### Variants

- `Line(LineEntity)` - Line segment
- `Polyline(PolylineEntity)` - Polyline with multiple vertices
- `Arc(ArcEntity)` - Circular arc
- `Circle(CircleEntity)` - Circle
- `Text(TextEntity)` - Text entity
- `Insert(InsertEntity)` - Block reference

#### Methods

- `layer() -> &str` - Get the layer name
- `bounding_box() -> Option<BoundingBox>` - Get the entity's bounding box

## Testing

Run all tests:

```bash
cargo test
```

Run with logging:

```bash
RUST_LOG=debug cargo test
```

Run specific test:

```bash
cargo test test_parse_line_entity
```

## Chinese Text Handling

The parser automatically detects and decodes Chinese text using GB18030 encoding by default. You can specify a custom encoding:

```rust
use dxf_parser_service::ParserService;
use encoding_rs::GB18030;

let parser = ParserService::with_encoding(GB18030);
let result = parser.parse_file("chinese_text.dxf").unwrap();
```

## Error Handling

The parser is designed to be resilient:

- Unsupported entities are logged but don't cause the parser to fail
- Empty polylines are skipped
- Text decoding errors fall back to the original string

All unsupported entity types are collected in `ParseResult::unsupported_entity_types`.

## Dependencies

- `dxf` (0.6) - DXF file reading/writing
- `encoding_rs` (0.8) - Text encoding detection and conversion
- `serde` (1.0) - Serialization support
- `thiserror` (1.0) - Error handling
- `log` (0.4) - Logging facade

## Future Enhancements

- Support for more entity types (spline, hatch, dimension, etc.)
- Block definition expansion
- Coordinate transformation support
- Async file loading
- Performance optimizations for large files
