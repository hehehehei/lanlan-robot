# Changelog

All notable changes to the DXF Parser Service will be documented in this file.

## [0.1.0] - 2025-11-01

### Added
- Initial implementation of DXF parser service
- Support for parsing DXF files using the `dxf` crate (v0.6)
- Entity parsing for:
  - Line entities with start and end points
  - Polyline entities (both Polyline and LwPolyline)
  - Arc entities with center, radius, and angle range
  - Circle entities with center and radius
  - Text entities (both Text and MText)
  - Insert entities (block references)
- Chinese text encoding support using GB18030
- Configurable text encoding via `ParserService::with_encoding()`
- Bounding box computation for individual entities
- Overall bounding box computation for entire drawing
- Layer extraction and listing
- Unsupported entity type logging (non-blocking)
- Comprehensive error handling with `ParserError` type
- `ParseResult` struct with entities, layers, bounding box, and unsupported types
- CLI binary for parsing DXF files from command line
- Comprehensive test suite:
  - 14 parser-specific tests
  - 6 integration tests
  - 3 documentation tests
- Example code in EXAMPLES.md
- Full documentation with doc comments
- README with usage instructions
- Sample DXF file for testing (`fixtures/sample.dxf`)

### Features
- Async-ready service interface (sync, but easily wrappable in async)
- Serde serialization support for all models
- Independent parser module architecture
- Resilient parsing (continues on unsupported entities)
- Clean separation between models and services

### Testing
- Unit tests for each entity type
- Integration tests for library usage
- Bounding box computation tests
- Chinese text decoding tests
- Layer filtering tests
- Error handling tests
