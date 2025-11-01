import * as PIXI from 'pixi.js';
import { useToolsStore } from '../../../state/toolsStore';

export interface ToolHandlersOptions {
  overlayLayer?: PIXI.Container;
}

const toWorld = (stage: PIXI.Container, point: PIXI.IPointData) => ({
  x: (point.x - stage.position.x) / stage.scale.x,
  y: (point.y - stage.position.y) / stage.scale.y,
});

export const setupToolHandlers = (app: PIXI.Application, options: ToolHandlersOptions = {}) => {
  const stage = app.stage;
  const overlay = options.overlayLayer ?? stage;

  const preview = new PIXI.Graphics();
  preview.zIndex = 9999;
  overlay.addChild(preview);

  const drawPreview = () => {
    const state = useToolsStore.getState();
    const draft = state.draft;
    preview.clear();
    if (!draft) return;

    const lineWidth = Math.max(1, 1 / stage.scale.x);
    preview.lineStyle({ width: lineWidth, color: 0x4da3ff, alpha: 1 });

    if (draft.type === 'line') {
      if (draft.points.length === 2) {
        const [a, b] = draft.points;
        preview.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
    } else if (draft.type === 'rect') {
      if (draft.points.length === 2) {
        const [a, b] = draft.points;
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        preview.beginFill(0x4da3ff, 0.1);
        preview.drawRect(x, y, w, h);
        preview.endFill();
      }
    } else if (draft.type === 'polygon') {
      if (draft.points.length >= 1) {
        const pts = draft.points;
        preview.beginFill(0x4da3ff, 0.08);
        preview.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) {
          preview.lineTo(pts[i].x, pts[i].y);
        }
        preview.endFill();
      }
    } else if (draft.type === 'text') {
      // For text, draw a small crosshair at anchor
      const a = draft.anchor;
      const size = 4 / stage.scale.x;
      preview.moveTo(a.x - size, a.y).lineTo(a.x + size, a.y);
      preview.moveTo(a.x, a.y - size).lineTo(a.x, a.y + size);
    }
  };

  const unsub = useToolsStore.subscribe((s) => s.draft, drawPreview);

  const pointerDown = (event: PIXI.FederatedPointerEvent) => {
    const tools = useToolsStore.getState();
    const tool = tools.activeTool;
    const world = toWorld(stage, event.global);

    if (tool === 'line') {
      const draft = tools.draft;
      if (!draft) {
        tools.startLine(world);
      } else {
        tools.updateLine(world);
        tools.commitLine();
      }
    } else if (tool === 'rect') {
      const draft = tools.draft;
      if (!draft) {
        tools.startRect(world);
      } else {
        tools.updateRect(world);
        tools.commitRect();
      }
    } else if (tool === 'polygon') {
      const draft = tools.draft;
      if (!draft) {
        tools.startPolygon(world);
      } else {
        tools.addPolygonPoint(world);
      }
    } else if (tool === 'text') {
      tools.openTextAt(world);
    }
  };

  const pointerMove = (event: PIXI.FederatedPointerEvent) => {
    const tools = useToolsStore.getState();
    const tool = tools.activeTool;
    const draft = tools.draft;
    if (!draft) return;
    const world = toWorld(stage, event.global);
    if (tool === 'line' && draft.type === 'line') {
      tools.updateLine(world);
    } else if (tool === 'rect' && draft.type === 'rect') {
      tools.updateRect(world);
    }
  };

  const dblClick = () => {
    const tools = useToolsStore.getState();
    if (tools.activeTool === 'polygon') {
      tools.commitPolygon();
    }
  };

  stage.on('pointerdown', pointerDown);
  stage.on('pointermove', pointerMove);
  // PIXI doesn't emit dblclick, so emulate with native canvas dblclick
  app.canvas.addEventListener('dblclick', dblClick);

  return () => {
    stage.off('pointerdown', pointerDown);
    stage.off('pointermove', pointerMove);
    app.canvas.removeEventListener('dblclick', dblClick);
    unsub();
    overlay.removeChild(preview);
    preview.destroy();
  };
};
