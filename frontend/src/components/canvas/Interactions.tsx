import { useEffect } from 'react';
import * as PIXI from 'pixi.js';
import type { BoundingBox } from '../../api/types';
import {
  DEFAULT_HIT_RADIUS,
  useSelectionStore,
} from '../../state/selectionStore';
import { useToolsStore } from '../../state/toolsStore';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isInteractiveTarget = (element: EventTarget | null): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    element.isContentEditable ||
    tag === 'SELECT'
  );
};

export interface CanvasInteractionsOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  hitRadius?: number;
  overlayLayer?: PIXI.Container;
}

const toWorld = (stage: PIXI.Container, point: PIXI.IPointData) => ({
  x: (point.x - stage.position.x) / stage.scale.x,
  y: (point.y - stage.position.y) / stage.scale.y,
});

const drawSelectionBox = (
  graphic: PIXI.Graphics,
  stage: PIXI.Container,
  bounds: BoundingBox | null
) => {
  graphic.clear();
  if (!bounds) {
    graphic.visible = false;
    return;
  }

  graphic.visible = true;
  const lineWidth = Math.max(1, 1 / stage.scale.x);
  graphic.lineStyle({ width: lineWidth, color: 0x4da3ff, alpha: 0.9 });
  graphic.beginFill(0x4da3ff, 0.12);
  graphic.drawRect(
    bounds.min_x,
    bounds.min_y,
    bounds.max_x - bounds.min_x,
    bounds.max_y - bounds.min_y
  );
  graphic.endFill();
};

export const setupCanvasInteractions = (
  app: PIXI.Application,
  options: CanvasInteractionsOptions = {}
) => {
  const stage = app.stage;
  stage.eventMode = 'static';
  stage.cursor = 'default';
  stage.sortableChildren = true;

  const overlay = options.overlayLayer ?? stage;
  const minZoom = options.minZoom ?? 0.25;
  const maxZoom = options.maxZoom ?? 12;
  const zoomStep = options.zoomStep ?? 0.2;
  const hitRadius = options.hitRadius ?? DEFAULT_HIT_RADIUS;

  const selectionGraphic = new PIXI.Graphics();
  selectionGraphic.visible = false;
  selectionGraphic.eventMode = 'none';
  selectionGraphic.zIndex = 10_000;
  overlay.addChild(selectionGraphic);

  const updateHitArea = () => {
    stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
  };
  updateHitArea();
  app.renderer.on('resize', updateHitArea);

  const restoreCursor = () => {
    const hoveredId = useSelectionStore.getState().hoveredId;
    app.canvas.style.cursor = hoveredId !== null ? 'pointer' : 'default';
  };

  const unsubscribeSelection = useSelectionStore.subscribe(
    (state) => state.selectionBox,
    (selectionBox) => {
      drawSelectionBox(selectionGraphic, stage, selectionBox);
    }
  );

  let pointerMode: 'pan' | 'select' | null = null;
  let pointerDownGlobal: { x: number; y: number } | null = null;
  let panStart: { x: number; y: number } | null = null;
  let stageStart: { x: number; y: number } | null = null;
  let dragExceededThreshold = false;

  const unsubscribeHover = useSelectionStore.subscribe(
    (state) => state.hoveredId,
    (hoveredId) => {
      if (pointerMode === 'pan') {
        return;
      }
      app.canvas.style.cursor = hoveredId !== null ? 'pointer' : 'default';
    }
  );

  const pointerDown = (event: PIXI.FederatedPointerEvent) => {
    const activeTool = useToolsStore.getState().activeTool;
    if (activeTool !== 'select' && activeTool !== 'delete') {
      return;
    }

    pointerDownGlobal = { x: event.global.x, y: event.global.y };
    dragExceededThreshold = false;

    const store = useSelectionStore.getState();

    if (event.button === 1 || event.button === 2) {
      pointerMode = 'pan';
      panStart = { x: event.global.x, y: event.global.y };
      stageStart = { x: stage.position.x, y: stage.position.y };
      app.canvas.style.cursor = 'grabbing';
      store.setHovered(null);
      return;
    }

    pointerMode = 'select';
    const world = toWorld(stage, event.global);
    store.beginSelection(world);
  };

  const pointerMove = (event: PIXI.FederatedPointerEvent) => {
    const activeTool = useToolsStore.getState().activeTool;
    if (activeTool !== 'select' && activeTool !== 'delete') {
      return;
    }

    if (pointerMode === 'pan' && panStart && stageStart) {
      const dx = event.global.x - panStart.x;
      const dy = event.global.y - panStart.y;
      stage.position.set(stageStart.x + dx, stageStart.y + dy);
      return;
    }

    const world = toWorld(stage, event.global);

    if (pointerMode === 'select' && pointerDownGlobal) {
      const distance = Math.hypot(
        event.global.x - pointerDownGlobal.x,
        event.global.y - pointerDownGlobal.y
      );
      if (!dragExceededThreshold && distance > 3) {
        dragExceededThreshold = true;
      }
      const store = useSelectionStore.getState();
      store.updateSelection(world);
      return;
    }

    const store = useSelectionStore.getState();
    const radius = hitRadius / stage.scale.x;
    const hit = store.hitTest(world, radius);
    store.setHovered(hit ? hit.id : null);
  };

  const finalizeSelection = (
    event: PIXI.FederatedPointerEvent,
    additive: boolean,
    toggle: boolean
  ) => {
    const store = useSelectionStore.getState();

    if (dragExceededThreshold) {
      store.finalizeSelection({ additive });
      return;
    }

    const world = toWorld(stage, event.global);
    const radius = hitRadius / stage.scale.x;
    store.cancelSelection();
    store.selectAt(world, radius, {
      additive: additive && !toggle,
      toggle,
      keepExistingOnMiss: additive || toggle,
    });
  };

  const pointerUp = (event: PIXI.FederatedPointerEvent) => {
    const activeTool = useToolsStore.getState().activeTool;
    if (activeTool !== 'select' && activeTool !== 'delete') {
      return;
    }

    const additive = event.shiftKey;
    const toggle = event.ctrlKey || event.metaKey;

    if (pointerMode === 'pan') {
      pointerMode = null;
      panStart = null;
      stageStart = null;
      restoreCursor();
    } else if (pointerMode === 'select') {
      finalizeSelection(event, additive, toggle);
      pointerMode = null;
      const store = useSelectionStore.getState();
      store.cancelSelection();
      restoreCursor();
    }

    pointerDownGlobal = null;
    dragExceededThreshold = false;
  };

  const pointerLeave = () => {
    if (pointerMode === 'pan') {
      return;
    }
    const store = useSelectionStore.getState();
    store.setHovered(null);
    restoreCursor();
  };

  const handleWheel = (nativeEvent: WheelEvent) => {
    nativeEvent.preventDefault();

    const rect = app.canvas.getBoundingClientRect();
    const offsetX = nativeEvent.clientX - rect.left;
    const offsetY = nativeEvent.clientY - rect.top;

    const oldScale = stage.scale.x;
    const direction = nativeEvent.deltaY < 0 ? 1 : -1;
    const factor = direction > 0 ? 1 + zoomStep : 1 / (1 + zoomStep);
    let newScale = clamp(oldScale * factor, minZoom, maxZoom);
    if (newScale === oldScale) {
      return;
    }

    const worldPos = {
      x: (offsetX - stage.position.x) / oldScale,
      y: (offsetY - stage.position.y) / oldScale,
    };

    stage.scale.set(newScale);
    stage.position.set(
      offsetX - worldPos.x * newScale,
      offsetY - worldPos.y * newScale
    );

    const store = useSelectionStore.getState();
    drawSelectionBox(selectionGraphic, stage, store.selectionBox);
  };

  const preventContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }

    if (isInteractiveTarget(event.target)) {
      return;
    }

    const store = useSelectionStore.getState();
    const removed = store.deleteSelected();
    if (removed.length) {
      event.preventDefault();
      restoreCursor();
    }
  };

  stage.on('pointerdown', pointerDown);
  stage.on('pointermove', pointerMove);
  stage.on('pointerup', pointerUp);
  stage.on('pointerupoutside', pointerUp);
  stage.on('pointercancel', pointerUp);
  stage.on('pointerleave', pointerLeave);

  app.canvas.addEventListener('wheel', handleWheel, { passive: false });
  app.canvas.addEventListener('contextmenu', preventContextMenu);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    stage.off('pointerdown', pointerDown);
    stage.off('pointermove', pointerMove);
    stage.off('pointerup', pointerUp);
    stage.off('pointerupoutside', pointerUp);
    stage.off('pointercancel', pointerUp);
    stage.off('pointerleave', pointerLeave);

    app.canvas.removeEventListener('wheel', handleWheel);
    app.canvas.removeEventListener('contextmenu', preventContextMenu);
    window.removeEventListener('keydown', handleKeyDown);

    unsubscribeHover();
    unsubscribeSelection();
    overlay.removeChild(selectionGraphic);
    selectionGraphic.destroy();
    app.renderer.off('resize', updateHitArea);
    restoreCursor();
  };
};

export interface InteractionsProps {
  app: PIXI.Application | null;
  options?: CanvasInteractionsOptions;
}

export const Interactions = ({ app, options }: InteractionsProps) => {
  const { minZoom, maxZoom, zoomStep, hitRadius, overlayLayer } = options ?? {};

  useEffect(() => {
    if (!app) {
      return;
    }

    const teardown = setupCanvasInteractions(app, {
      minZoom,
      maxZoom,
      zoomStep,
      hitRadius,
      overlayLayer,
    });

    return () => {
      teardown?.();
    };
  }, [app, minZoom, maxZoom, zoomStep, hitRadius, overlayLayer]);

  return null;
};

Interactions.displayName = 'CanvasInteractions';
