use dxf_parser_service::{ParsedEntity, ParserService};

#[test]
fn test_library_as_dependency() {
    let parser = ParserService::new();
    let result = parser.parse_file("../fixtures/sample.dxf");
    assert!(result.is_ok());
}

#[test]
fn test_entity_filtering() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse");

    let lines: Vec<_> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Line(_)))
        .collect();

    assert!(!lines.is_empty());
}

#[test]
fn test_layer_filtering() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse");

    let layer1_entities: Vec<_> = result
        .entities
        .iter()
        .filter(|e| e.layer() == "LAYER1")
        .collect();

    assert!(!layer1_entities.is_empty());
}

#[test]
fn test_bounding_box_merge() {
    use dxf_parser_service::{BoundingBox, Point};

    let bbox1 = BoundingBox::new(Point::new(0.0, 0.0, 0.0), Point::new(10.0, 10.0, 0.0));
    let bbox2 = BoundingBox::new(Point::new(5.0, 5.0, 0.0), Point::new(15.0, 15.0, 0.0));

    let merged = bbox1.merge(&bbox2);

    assert_eq!(merged.min.x, 0.0);
    assert_eq!(merged.min.y, 0.0);
    assert_eq!(merged.max.x, 15.0);
    assert_eq!(merged.max.y, 15.0);
}

#[test]
fn test_point_creation() {
    use dxf_parser_service::Point;

    let point = Point::new(1.0, 2.0, 3.0);
    assert_eq!(point.x, 1.0);
    assert_eq!(point.y, 2.0);
    assert_eq!(point.z, 3.0);
}

#[test]
fn test_parse_result_serialization() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse");

    let json = serde_json::to_string(&result);
    assert!(json.is_ok());

    let json_str = json.unwrap();
    assert!(json_str.contains("entities"));
    assert!(json_str.contains("layers"));
}
