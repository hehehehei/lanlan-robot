use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Point {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BoundingBox {
    pub min: Point,
    pub max: Point,
}

impl BoundingBox {
    pub fn new(min: Point, max: Point) -> Self {
        Self { min, max }
    }

    pub fn from_points(points: &[Point]) -> Option<Self> {
        if points.is_empty() {
            return None;
        }

        let mut min_x = f64::INFINITY;
        let mut min_y = f64::INFINITY;
        let mut min_z = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut max_y = f64::NEG_INFINITY;
        let mut max_z = f64::NEG_INFINITY;

        for point in points {
            min_x = min_x.min(point.x);
            min_y = min_y.min(point.y);
            min_z = min_z.min(point.z);
            max_x = max_x.max(point.x);
            max_y = max_y.max(point.y);
            max_z = max_z.max(point.z);
        }

        Some(BoundingBox::new(
            Point::new(min_x, min_y, min_z),
            Point::new(max_x, max_y, max_z),
        ))
    }

    pub fn merge(&self, other: &BoundingBox) -> BoundingBox {
        BoundingBox::new(
            Point::new(
                self.min.x.min(other.min.x),
                self.min.y.min(other.min.y),
                self.min.z.min(other.min.z),
            ),
            Point::new(
                self.max.x.max(other.max.x),
                self.max.y.max(other.max.y),
                self.max.z.max(other.max.z),
            ),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LineEntity {
    pub start: Point,
    pub end: Point,
    pub layer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PolylineEntity {
    pub vertices: Vec<Point>,
    pub is_closed: bool,
    pub layer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ArcEntity {
    pub center: Point,
    pub radius: f64,
    pub start_angle: f64,
    pub end_angle: f64,
    pub layer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CircleEntity {
    pub center: Point,
    pub radius: f64,
    pub layer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TextEntity {
    pub position: Point,
    pub content: String,
    pub height: f64,
    pub layer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InsertEntity {
    pub position: Point,
    pub block_name: String,
    pub layer: String,
    pub scale_x: f64,
    pub scale_y: f64,
    pub scale_z: f64,
    pub rotation: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum ParsedEntity {
    Line(LineEntity),
    Polyline(PolylineEntity),
    Arc(ArcEntity),
    Circle(CircleEntity),
    Text(TextEntity),
    Insert(InsertEntity),
}

impl ParsedEntity {
    pub fn layer(&self) -> &str {
        match self {
            ParsedEntity::Line(e) => &e.layer,
            ParsedEntity::Polyline(e) => &e.layer,
            ParsedEntity::Arc(e) => &e.layer,
            ParsedEntity::Circle(e) => &e.layer,
            ParsedEntity::Text(e) => &e.layer,
            ParsedEntity::Insert(e) => &e.layer,
        }
    }

    pub fn bounding_box(&self) -> Option<BoundingBox> {
        match self {
            ParsedEntity::Line(line) => {
                BoundingBox::from_points(&[line.start.clone(), line.end.clone()])
            }
            ParsedEntity::Polyline(poly) => BoundingBox::from_points(&poly.vertices),
            ParsedEntity::Arc(arc) => {
                let center = &arc.center;
                let r = arc.radius;
                let start_rad = arc.start_angle.to_radians();
                let end_rad = arc.end_angle.to_radians();

                let mut points = vec![
                    Point::new(
                        center.x + r * start_rad.cos(),
                        center.y + r * start_rad.sin(),
                        center.z,
                    ),
                    Point::new(
                        center.x + r * end_rad.cos(),
                        center.y + r * end_rad.sin(),
                        center.z,
                    ),
                ];

                let angles = [0.0, 90.0, 180.0, 270.0];
                for angle in angles {
                    if is_angle_in_arc_range(angle, arc.start_angle, arc.end_angle) {
                        let rad = angle.to_radians();
                        points.push(Point::new(
                            center.x + r * rad.cos(),
                            center.y + r * rad.sin(),
                            center.z,
                        ));
                    }
                }

                BoundingBox::from_points(&points)
            }
            ParsedEntity::Circle(circle) => {
                let r = circle.radius;
                BoundingBox::from_points(&[
                    Point::new(circle.center.x - r, circle.center.y - r, circle.center.z),
                    Point::new(circle.center.x + r, circle.center.y + r, circle.center.z),
                ])
            }
            ParsedEntity::Text(text) => Some(BoundingBox::new(
                text.position.clone(),
                text.position.clone(),
            )),
            ParsedEntity::Insert(insert) => Some(BoundingBox::new(
                insert.position.clone(),
                insert.position.clone(),
            )),
        }
    }
}

fn is_angle_in_arc_range(angle: f64, start: f64, end: f64) -> bool {
    let normalized_angle = angle % 360.0;
    let normalized_start = start % 360.0;
    let normalized_end = end % 360.0;

    if normalized_start <= normalized_end {
        normalized_angle >= normalized_start && normalized_angle <= normalized_end
    } else {
        normalized_angle >= normalized_start || normalized_angle <= normalized_end
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub entities: Vec<ParsedEntity>,
    pub layers: Vec<String>,
    pub bounding_box: Option<BoundingBox>,
    pub unsupported_entity_types: Vec<String>,
}

impl ParseResult {
    pub fn new(entities: Vec<ParsedEntity>, unsupported_entity_types: Vec<String>) -> Self {
        let mut layers = std::collections::HashSet::new();
        let mut overall_bbox: Option<BoundingBox> = None;

        for entity in &entities {
            layers.insert(entity.layer().to_string());
            if let Some(entity_bbox) = entity.bounding_box() {
                overall_bbox = Some(match overall_bbox {
                    Some(bbox) => bbox.merge(&entity_bbox),
                    None => entity_bbox,
                });
            }
        }

        let mut layers: Vec<String> = layers.into_iter().collect();
        layers.sort();

        Self {
            entities,
            layers,
            bounding_box: overall_bbox,
            unsupported_entity_types,
        }
    }
}
