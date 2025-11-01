import { describe, expect, it } from 'vitest';
import { Transform, type Point } from '../lib/transform';

describe('Transform', () => {
  const setupTransform = () => {
    const transform = new Transform();
    transform.setViewport(800, 600);
    transform.reset();
    return transform;
  };

  it('converts world coordinates to screen and back', () => {
    const transform = setupTransform();
    const worldPoint: Point = { x: 42.5, y: -17.25 };

    const screenPoint = transform.worldToScreen(worldPoint);
    const roundTrip = transform.screenToWorld(screenPoint);

    expect(roundTrip.x).toBeCloseTo(worldPoint.x, 6);
    expect(roundTrip.y).toBeCloseTo(worldPoint.y, 6);
  });

  it('pan updates translation by the provided delta', () => {
    const transform = setupTransform();
    const initial = transform.getState().translation;

    transform.pan({ x: 120, y: -80 });
    const updated = transform.getState().translation;

    expect(updated.x).toBeCloseTo(initial.x + 120, 6);
    expect(updated.y).toBeCloseTo(initial.y - 80, 6);
  });

  it('zoom keeps pivot world coordinate stable', () => {
    const transform = setupTransform();
    const pivot: Point = { x: 400, y: 300 };

    const worldBefore = transform.screenToWorld(pivot);
    transform.zoom(1.8, pivot);
    const worldAfter = transform.screenToWorld(pivot);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
  });

  it('returns expected view bounds', () => {
    const transform = setupTransform();
    transform.pan({ x: 50, y: -25 });
    transform.zoom(1.5);

    const bounds = transform.getViewBounds();
    const topLeft = transform.screenToWorld({ x: 0, y: 0 });
    const bottomRight = transform.screenToWorld({ x: 800, y: 600 });

    expect(bounds.minX).toBeCloseTo(Math.min(topLeft.x, bottomRight.x), 6);
    expect(bounds.minY).toBeCloseTo(Math.min(topLeft.y, bottomRight.y), 6);
    expect(bounds.maxX).toBeCloseTo(Math.max(topLeft.x, bottomRight.x), 6);
    expect(bounds.maxY).toBeCloseTo(Math.max(topLeft.y, bottomRight.y), 6);
  });
});
