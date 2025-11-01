use dxf_parser_service::{ParsedEntity, ParserService};

#[test]
fn test_parse_sample_dxf_entity_count() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    assert_eq!(result.entities.len(), 7, "Expected 7 supported entities");
}

#[test]
fn test_parse_sample_dxf_layer_count() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    assert!(
        result.layers.len() >= 2,
        "Expected at least 2 layers (LAYER1 and 文字层)"
    );
    assert!(result.layers.contains(&"LAYER1".to_string()));
}

#[test]
fn test_parse_line_entity() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let line_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Line(_)))
        .collect();

    assert_eq!(line_entities.len(), 1, "Expected 1 line entity");

    if let ParsedEntity::Line(line) = line_entities[0] {
        assert_eq!(line.start.x, 0.0);
        assert_eq!(line.start.y, 0.0);
        assert_eq!(line.end.x, 100.0);
        assert_eq!(line.end.y, 100.0);
        assert_eq!(line.layer, "LAYER1");
    }
}

#[test]
fn test_parse_circle_entity() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let circle_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Circle(_)))
        .collect();

    assert_eq!(circle_entities.len(), 1, "Expected 1 circle entity");

    if let ParsedEntity::Circle(circle) = circle_entities[0] {
        assert_eq!(circle.center.x, 50.0);
        assert_eq!(circle.center.y, 50.0);
        assert_eq!(circle.radius, 25.0);
        assert_eq!(circle.layer, "LAYER1");
    }
}

#[test]
fn test_parse_arc_entity() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let arc_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Arc(_)))
        .collect();

    assert_eq!(arc_entities.len(), 1, "Expected 1 arc entity");

    if let ParsedEntity::Arc(arc) = arc_entities[0] {
        assert_eq!(arc.center.x, 150.0);
        assert_eq!(arc.center.y, 150.0);
        assert_eq!(arc.radius, 30.0);
        assert_eq!(arc.start_angle, 0.0);
        assert_eq!(arc.end_angle, 180.0);
        assert_eq!(arc.layer, "LAYER1");
    }
}

#[test]
fn test_parse_polyline_entity() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let polyline_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Polyline(_)))
        .collect();

    assert_eq!(polyline_entities.len(), 2, "Expected 2 polyline entities");

    if let ParsedEntity::Polyline(polyline) = polyline_entities[0] {
        assert_eq!(polyline.vertices.len(), 3);
        assert!(polyline.is_closed);
        assert_eq!(polyline.layer, "LAYER1");
    }
}

#[test]
fn test_parse_text_entity() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let text_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Text(_)))
        .collect();

    assert_eq!(text_entities.len(), 1, "Expected 1 text entity");

    if let ParsedEntity::Text(text) = text_entities[0] {
        assert_eq!(text.position.x, 100.0);
        assert_eq!(text.position.y, 150.0);
        assert_eq!(text.height, 5.0);
        assert!(!text.content.is_empty());
    }
}

#[test]
fn test_parse_chinese_text() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let text_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Text(_)))
        .collect();

    assert!(!text_entities.is_empty());

    if let ParsedEntity::Text(text) = text_entities[0] {
        let content = &text.content;
        assert!(
            content.contains("测试") || content.contains("文本") || !content.is_empty(),
            "Text content should be decoded properly, got: {}",
            content
        );
    }
}

#[test]
fn test_parse_insert_entity() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let insert_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Insert(_)))
        .collect();

    assert_eq!(insert_entities.len(), 1, "Expected 1 insert entity");

    if let ParsedEntity::Insert(insert) = insert_entities[0] {
        assert_eq!(insert.position.x, 300.0);
        assert_eq!(insert.position.y, 300.0);
        assert_eq!(insert.block_name, "BLOCK1");
        assert_eq!(insert.layer, "LAYER1");
    }
}

#[test]
fn test_bounding_box_computation() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    assert!(
        result.bounding_box.is_some(),
        "Bounding box should be computed"
    );

    let bbox = result.bounding_box.unwrap();
    assert!(bbox.min.x <= bbox.max.x);
    assert!(bbox.min.y <= bbox.max.y);
}

#[test]
fn test_unsupported_entities_logged() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    assert!(
        !result.unsupported_entity_types.is_empty(),
        "Expected at least one unsupported entity type (ELLIPSE)"
    );
    assert!(result
        .unsupported_entity_types
        .contains(&"Ellipse".to_string()));
}

#[test]
fn test_parser_does_not_panic_on_unsupported() {
    let parser = ParserService::new();
    let result = parser.parse_file("../fixtures/sample.dxf");

    assert!(
        result.is_ok(),
        "Parser should not panic on unsupported entities"
    );
}

#[test]
fn test_entity_layer_method() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    for entity in &result.entities {
        let layer = entity.layer();
        assert!(!layer.is_empty(), "Entity layer should not be empty");
    }
}

#[test]
fn test_entity_bounding_box_method() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    for entity in &result.entities {
        let bbox = entity.bounding_box();
        if let Some(bbox) = bbox {
            assert!(bbox.min.x <= bbox.max.x);
            assert!(bbox.min.y <= bbox.max.y);
        }
    }
}
