use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

const MAX_LOGICAL_EDGE: f64 = 1_000_000.0;
const MAX_SCALE_FACTOR: f64 = 16.0;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct DisplayId(String);

impl DisplayId {
    pub fn new(value: impl Into<String>) -> Result<Self, DisplayValidationError> {
        let value = value.into();
        if value.trim().is_empty() || value.len() > 256 {
            return Err(DisplayValidationError::InvalidIdentity);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DisplayOrientation {
    Degrees0,
    Degrees90,
    Degrees180,
    Degrees270,
}

impl DisplayOrientation {
    pub fn viewport_size(self, width: f64, height: f64) -> (f64, f64) {
        match self {
            Self::Degrees0 | Self::Degrees180 => (width, height),
            Self::Degrees90 | Self::Degrees270 => (height, width),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplaySize {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayDescriptor {
    pub id: DisplayId,
    pub origin: DisplayPoint,
    pub logical_size: DisplaySize,
    pub scale_factor: f64,
    pub orientation: DisplayOrientation,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayViewport {
    pub id: DisplayId,
    pub origin: DisplayPoint,
    pub logical_size: DisplaySize,
    pub scale_factor: f64,
    pub orientation: DisplayOrientation,
}

impl From<&DisplayDescriptor> for DisplayViewport {
    fn from(descriptor: &DisplayDescriptor) -> Self {
        Self {
            id: descriptor.id.clone(),
            origin: descriptor.origin,
            logical_size: descriptor.logical_size,
            scale_factor: descriptor.scale_factor,
            orientation: descriptor.orientation,
        }
    }
}

impl DisplayDescriptor {
    pub fn validate(&self) -> Result<(), DisplayValidationError> {
        if self.origin.x.is_finite()
            && self.origin.y.is_finite()
            && self.logical_size.width.is_finite()
            && self.logical_size.height.is_finite()
            && self.logical_size.width > 0.0
            && self.logical_size.height > 0.0
            && self.logical_size.width <= MAX_LOGICAL_EDGE
            && self.logical_size.height <= MAX_LOGICAL_EDGE
            && self.scale_factor.is_finite()
            && self.scale_factor > 0.0
            && self.scale_factor <= MAX_SCALE_FACTOR
        {
            Ok(())
        } else {
            Err(DisplayValidationError::InvalidGeometry)
        }
    }

    pub fn viewport_transform(&self) -> Result<ViewportTransform, DisplayValidationError> {
        self.validate()?;
        Ok(ViewportTransform {
            origin: self.origin,
            size: self.logical_size,
            scale_factor: self.scale_factor,
            orientation: self.orientation,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DisplayValidationError {
    InvalidIdentity,
    InvalidGeometry,
}

impl fmt::Display for DisplayValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::InvalidIdentity => "display identity is empty or too long",
            Self::InvalidGeometry => {
                "display geometry is non-finite, non-positive, or out of bounds"
            }
        })
    }
}

impl std::error::Error for DisplayValidationError {}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplaySnapshot {
    pub displays: BTreeMap<DisplayId, DisplayDescriptor>,
}

impl DisplaySnapshot {
    pub fn empty() -> Self {
        Self {
            displays: BTreeMap::new(),
        }
    }

    pub fn one(descriptor: DisplayDescriptor) -> Result<Self, DisplayValidationError> {
        descriptor.validate()?;
        let id = descriptor.id.clone();
        Ok(Self {
            displays: BTreeMap::from([(id, descriptor)]),
        })
    }

    pub fn validate(&self) -> Result<(), DisplayValidationError> {
        for (id, descriptor) in &self.displays {
            if id != &descriptor.id {
                return Err(DisplayValidationError::InvalidIdentity);
            }
            descriptor.validate()?;
        }
        Ok(())
    }

    pub fn descriptor(&self, id: &DisplayId) -> Option<&DisplayDescriptor> {
        self.displays.get(id)
    }

    pub fn diff(&self, next: &Self) -> Result<DisplayDiff, DisplayValidationError> {
        self.validate()?;
        next.validate()?;
        Ok(DisplayDiff::between(self, next))
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct DisplayUpdate {
    pub before: DisplayDescriptor,
    pub after: DisplayDescriptor,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DisplayDiff {
    pub added: Vec<DisplayDescriptor>,
    pub removed: Vec<DisplayId>,
    pub updated: Vec<DisplayUpdate>,
}

impl DisplayDiff {
    pub fn between(previous: &DisplaySnapshot, next: &DisplaySnapshot) -> Self {
        let mut ids = BTreeSet::new();
        ids.extend(previous.displays.keys().cloned());
        ids.extend(next.displays.keys().cloned());
        let mut diff = Self {
            added: Vec::new(),
            removed: Vec::new(),
            updated: Vec::new(),
        };
        for id in ids {
            match (previous.displays.get(&id), next.displays.get(&id)) {
                (None, Some(after)) => diff.added.push(after.clone()),
                (Some(_), None) => diff.removed.push(id),
                (Some(before), Some(after)) if before != after => {
                    diff.updated.push(DisplayUpdate {
                        before: before.clone(),
                        after: after.clone(),
                    })
                }
                _ => {}
            }
        }
        diff
    }

    pub fn is_empty(&self) -> bool {
        self.added.is_empty() && self.removed.is_empty() && self.updated.is_empty()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ViewportTransform {
    pub origin: DisplayPoint,
    pub size: DisplaySize,
    pub scale_factor: f64,
    pub orientation: DisplayOrientation,
}

impl ViewportTransform {
    pub fn viewport_size(&self) -> DisplaySize {
        let (width, height) = self
            .orientation
            .viewport_size(self.size.width, self.size.height);
        DisplaySize { width, height }
    }

    pub fn canonical_to_viewport(&self, point: DisplayPoint) -> DisplayPoint {
        let local = DisplayPoint {
            x: point.x - self.origin.x,
            y: point.y - self.origin.y,
        };
        self.rotate(local)
    }

    pub fn viewport_to_canonical(&self, point: DisplayPoint) -> DisplayPoint {
        let local = self.inverse_rotate(point);
        DisplayPoint {
            x: local.x + self.origin.x,
            y: local.y + self.origin.y,
        }
    }

    fn rotate(&self, point: DisplayPoint) -> DisplayPoint {
        match self.orientation {
            DisplayOrientation::Degrees0 => point,
            DisplayOrientation::Degrees90 => DisplayPoint {
                x: self.size.height - point.y,
                y: point.x,
            },
            DisplayOrientation::Degrees180 => DisplayPoint {
                x: self.size.width - point.x,
                y: self.size.height - point.y,
            },
            DisplayOrientation::Degrees270 => DisplayPoint {
                x: point.y,
                y: self.size.width - point.x,
            },
        }
    }

    fn inverse_rotate(&self, point: DisplayPoint) -> DisplayPoint {
        match self.orientation {
            DisplayOrientation::Degrees0 => point,
            DisplayOrientation::Degrees90 => DisplayPoint {
                x: point.y,
                y: self.size.height - point.x,
            },
            DisplayOrientation::Degrees180 => DisplayPoint {
                x: self.size.width - point.x,
                y: self.size.height - point.y,
            },
            DisplayOrientation::Degrees270 => DisplayPoint {
                x: self.size.width - point.y,
                y: point.x,
            },
        }
    }
}

#[derive(Debug, Clone)]
pub struct TopologyCoalescer {
    debounce_ticks: u64,
    pending: Option<DisplaySnapshot>,
    deadline: Option<u64>,
}

impl TopologyCoalescer {
    pub fn new(debounce_ticks: u64) -> Self {
        Self {
            debounce_ticks: debounce_ticks.min(1_000),
            pending: None,
            deadline: None,
        }
    }

    pub fn submit(
        &mut self,
        snapshot: DisplaySnapshot,
        now: u64,
    ) -> Result<(), DisplayValidationError> {
        snapshot.validate()?;
        self.pending = Some(snapshot);
        self.deadline = Some(now.saturating_add(self.debounce_ticks));
        Ok(())
    }

    pub fn flush(&mut self, now: u64) -> Option<DisplaySnapshot> {
        if self.deadline.is_some_and(|deadline| now >= deadline) {
            self.deadline = None;
            return self.pending.take();
        }
        None
    }

    pub fn pending(&self) -> Option<&DisplaySnapshot> {
        self.pending.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn descriptor(
        id: &str,
        x: f64,
        y: f64,
        scale: f64,
        orientation: DisplayOrientation,
    ) -> DisplayDescriptor {
        DisplayDescriptor {
            id: DisplayId::new(id).unwrap(),
            origin: DisplayPoint { x, y },
            logical_size: DisplaySize {
                width: 1920.0,
                height: 1080.0,
            },
            scale_factor: scale,
            orientation,
        }
    }

    #[test]
    fn topology_retains_negative_origin_and_round_trips_all_rotations() {
        for orientation in [
            DisplayOrientation::Degrees0,
            DisplayOrientation::Degrees90,
            DisplayOrientation::Degrees180,
            DisplayOrientation::Degrees270,
        ] {
            let transform = descriptor("left", -1920.0, -100.0, 2.0, orientation)
                .viewport_transform()
                .unwrap();
            let point = DisplayPoint {
                x: -1400.0,
                y: 400.0,
            };
            let viewport = transform.canonical_to_viewport(point);
            assert_eq!(transform.viewport_to_canonical(viewport), point);
        }
    }

    #[test]
    fn topology_rejects_invalid_geometry() {
        let mut value = descriptor("bad", 0.0, 0.0, 2.0, DisplayOrientation::Degrees0);
        value.logical_size.width = 0.0;
        assert_eq!(
            value.validate(),
            Err(DisplayValidationError::InvalidGeometry)
        );
        value.logical_size.width = 1920.0;
        value.scale_factor = f64::NAN;
        assert_eq!(
            value.validate(),
            Err(DisplayValidationError::InvalidGeometry)
        );
    }

    #[test]
    fn topology_coalescer_applies_only_final_snapshot() {
        let first = DisplaySnapshot::one(descriptor(
            "main",
            0.0,
            0.0,
            1.0,
            DisplayOrientation::Degrees0,
        ))
        .unwrap();
        let second = DisplaySnapshot::one(descriptor(
            "main",
            0.0,
            0.0,
            2.0,
            DisplayOrientation::Degrees90,
        ))
        .unwrap();
        let mut coalescer = TopologyCoalescer::new(10);
        coalescer.submit(first, 0).unwrap();
        coalescer.submit(second.clone(), 3).unwrap();
        assert!(coalescer.flush(9).is_none());
        assert_eq!(coalescer.flush(13), Some(second));
    }
}
