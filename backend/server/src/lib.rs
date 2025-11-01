//! # DXF Parser Service
//!
//! A Rust library for parsing DXF (Drawing Exchange Format) CAD files.
//!
//! ## Features
//!
//! - Parse DXF files using the `dxf` crate
//! - Support for common entities: Line, Polyline, Arc, Circle, Text, Insert
//! - Chinese text encoding support (GB18030)
//! - Bounding box computation
//! - Layer extraction
//! - Async-ready service interface
//!
//! ## Quick Start
//!
//! ```no_run
//! use dxf_parser_service::ParserService;
//!
//! let parser = ParserService::new();
//! let result = parser.parse_file("sample.dxf").unwrap();
//!
//! println!("Parsed {} entities", result.entities.len());
//! println!("Found {} layers", result.layers.len());
//! ```
//!
//! ## Examples
//!
//! ### Parse and filter entities
//!
//! ```no_run
//! use dxf_parser_service::{ParserService, ParsedEntity};
//!
//! let parser = ParserService::new();
//! let result = parser.parse_file("sample.dxf").unwrap();
//!
//! for entity in result.entities {
//!     match entity {
//!         ParsedEntity::Line(line) => {
//!             println!("Line from {:?} to {:?}", line.start, line.end);
//!         }
//!         ParsedEntity::Circle(circle) => {
//!             println!("Circle at {:?} with radius {}", circle.center, circle.radius);
//!         }
//!         _ => {}
//!     }
//! }
//! ```
//!
//! ### Parse with specific encoding
//!
//! ```no_run
//! use dxf_parser_service::ParserService;
//! use encoding_rs::GB18030;
//!
//! let parser = ParserService::with_encoding(GB18030);
//! let result = parser.parse_file("chinese_text.dxf").unwrap();
//! ```

pub mod models;
pub mod services;

pub use models::*;
pub use services::*;
