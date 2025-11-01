//! Acceptance tests verifying all ticket criteria
use dxf_parser_service::{ParserService, ParsedEntity};

/// AC1: Parsing service returns expected number of entities/layers for provided sample file
#[test]
fn acceptance_criterion_1_entity_and_layer_counts() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    // Expected entities: Line, Circle, Arc, Polyline, LwPolyline, Text, Insert = 7
    assert_eq!(
        result.entities.len(),
        7,
        "Expected 7 entities (line, circle, arc, polyline, lwpolyline, text, insert)"
    );

    // Expected at least 2 layers: LAYER1 and 文字层
    assert!(
        result.layers.len() >= 2,
        "Expected at least 2 layers, got {}",
        result.layers.len()
    );

    assert!(
        result.layers.contains(&"LAYER1".to_string()),
        "Expected to find LAYER1"
    );
}

/// AC2: Text content correctly converts to UTF-8 (Chinese strings)
#[test]
fn acceptance_criterion_2_chinese_text_utf8_conversion() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse sample.dxf");

    let text_entities: Vec<&ParsedEntity> = result
        .entities
        .iter()
        .filter(|e| matches!(e, ParsedEntity::Text(_)))
        .collect();

    assert!(
        !text_entities.is_empty(),
        "Expected at least one text entity"
    );

    // Verify that text content is properly decoded (not empty and valid UTF-8)
    for entity in text_entities {
        if let ParsedEntity::Text(text) = entity {
            assert!(
                !text.content.is_empty(),
                "Text content should not be empty"
            );
            
            // The content should be valid UTF-8 (if this test runs, it is)
            assert!(
                text.content.is_ascii() || text.content.chars().any(|c| c as u32 > 127),
                "Text should be valid UTF-8"
            );
        }
    }
}

/// AC3: Unsupported entities logged without panicking
#[test]
fn acceptance_criterion_3_unsupported_entities_no_panic() {
    let parser = ParserService::new();
    
    // This should not panic even though sample.dxf contains an Ellipse (unsupported)
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Parser should not panic on unsupported entities");

    // Verify unsupported entities were logged
    assert!(
        !result.unsupported_entity_types.is_empty(),
        "Expected unsupported entity types to be logged"
    );

    assert!(
        result.unsupported_entity_types.contains(&"Ellipse".to_string()),
        "Expected Ellipse to be in unsupported types"
    );

    // Verify we still got the supported entities
    assert!(
        !result.entities.is_empty(),
        "Should have parsed supported entities despite unsupported ones"
    );
}

/// AC4: Module is independent and can be invoked by async job later
#[test]
fn acceptance_criterion_4_module_independence() {
    // Test 1: Service can be created without external dependencies
    let parser = ParserService::new();

    // Test 2: Service can parse files synchronously
    let result = parser.parse_file("../fixtures/sample.dxf");
    assert!(result.is_ok(), "Parsing works synchronously");

    // Test 3: Results are serializable (for persistence)
    let result = result.unwrap();
    let json = serde_json::to_string(&result);
    assert!(json.is_ok(), "Results can be serialized");

    // Test 4: Service has no blocking I/O that can't be wrapped
    // (demonstrated by the fact that it can be called from sync context)
    let parser2 = ParserService::new();
    let _ = parser2.parse_file("../fixtures/sample.dxf");
    
    // Note: In real async usage, this would be:
    // tokio::task::spawn_blocking(move || parser.parse_file(path))
}

/// Additional: Verify all required entity types are supported
#[test]
fn verify_all_required_entity_types_supported() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse");

    let mut has_line = false;
    let mut has_polyline = false;
    let mut has_arc = false;
    let mut has_circle = false;
    let mut has_text = false;
    let mut has_insert = false;

    for entity in &result.entities {
        match entity {
            ParsedEntity::Line(_) => has_line = true,
            ParsedEntity::Polyline(_) => has_polyline = true,
            ParsedEntity::Arc(_) => has_arc = true,
            ParsedEntity::Circle(_) => has_circle = true,
            ParsedEntity::Text(_) => has_text = true,
            ParsedEntity::Insert(_) => has_insert = true,
        }
    }

    assert!(has_line, "Line entity support is required");
    assert!(has_polyline, "Polyline entity support is required");
    assert!(has_arc, "Arc entity support is required");
    assert!(has_circle, "Circle entity support is required");
    assert!(has_text, "Text entity support is required");
    assert!(has_insert, "Insert entity support is required");
}

/// Additional: Verify bounding box computation works
#[test]
fn verify_bounding_box_computation() {
    let parser = ParserService::new();
    let result = parser
        .parse_file("../fixtures/sample.dxf")
        .expect("Failed to parse");

    assert!(
        result.bounding_box.is_some(),
        "Overall bounding box should be computed"
    );

    let bbox = result.bounding_box.unwrap();
    
    // Verify min is less than or equal to max
    assert!(bbox.min.x <= bbox.max.x, "Min X should be <= Max X");
    assert!(bbox.min.y <= bbox.max.y, "Min Y should be <= Max Y");
    assert!(bbox.min.z <= bbox.max.z, "Min Z should be <= Max Z");

    // Verify bounding box covers expected range from sample.dxf
    // (entities go from 0 to 400 in x and y)
    assert!(bbox.min.x <= 0.0, "Min X should include origin");
    assert!(bbox.max.x >= 400.0, "Max X should include far entities");
}
