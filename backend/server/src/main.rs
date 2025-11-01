use dxf_parser_service::ParserService;

fn main() {
    env_logger::init();

    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <dxf_file_path>", args[0]);
        std::process::exit(1);
    }

    let file_path = &args[1];
    let parser = ParserService::new();

    match parser.parse_file(file_path) {
        Ok(result) => {
            println!("Successfully parsed DXF file:");
            println!("  Entities: {}", result.entities.len());
            println!("  Layers: {:?}", result.layers);
            if let Some(bbox) = result.bounding_box {
                println!(
                    "  Bounding box: ({}, {}, {}) to ({}, {}, {})",
                    bbox.min.x, bbox.min.y, bbox.min.z, bbox.max.x, bbox.max.y, bbox.max.z
                );
            }
            if !result.unsupported_entity_types.is_empty() {
                println!(
                    "  Unsupported entity types: {:?}",
                    result.unsupported_entity_types
                );
            }
        }
        Err(e) => {
            eprintln!("Error parsing DXF file: {}", e);
            std::process::exit(1);
        }
    }
}
