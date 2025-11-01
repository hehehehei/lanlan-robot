import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as PIXI from 'pixi.js';
import { setupCanvasInteractions } from './canvas/Interactions';
import { useSelectionStore } from '../state/selectionStore';
import './CanvasContainer.css';

export const CanvasContainer = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  const selectedCount = useSelectionStore((state) => state.selectedIds.length);

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    let isUnmounted = false;
    let cleanupInteractions: (() => void) | undefined;
    let activeApp: PIXI.Application | null = null;
    let resizeHandler: (() => void) | undefined;

    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        background: '#000000',
        resizeTo: canvasRef.current!,
      });

      if (isUnmounted) {
        app.destroy(true);
        return;
      }

      canvasRef.current!.appendChild(app.canvas);
      appRef.current = app;
      activeApp = app;

      const viewport = new PIXI.Container();
      viewport.name = 'viewport';

      const overlayLayer = new PIXI.Container();
      overlayLayer.name = 'interaction-overlay';
      overlayLayer.eventMode = 'none';
      overlayLayer.zIndex = 10_000;

      app.stage.addChild(viewport);
      app.stage.addChild(overlayLayer);
      app.stage.sortableChildren = true;

      const placeholder = new PIXI.Text({
        text: t('canvas.placeholder'),
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 24,
          fill: 0xffffff,
        },
      });

      placeholder.anchor.set(0.5);
      placeholder.position.set(app.screen.width / 2, app.screen.height / 2);
      viewport.addChild(placeholder);

      resizeHandler = () => {
        placeholder.position.set(app.screen.width / 2, app.screen.height / 2);
      };

      app.renderer.on('resize', resizeHandler);

      cleanupInteractions = setupCanvasInteractions(app, {
        overlayLayer,
      });
    };

    initPixi();

    return () => {
      isUnmounted = true;

      if (cleanupInteractions) {
        cleanupInteractions();
        cleanupInteractions = undefined;
      }

      if (activeApp && resizeHandler) {
        activeApp.renderer.off('resize', resizeHandler);
        resizeHandler = undefined;
      }

      if (appRef.current) {
        const canvas = appRef.current.canvas;
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        appRef.current.destroy(true);
        appRef.current = null;
        activeApp = null;
      }
    };
  }, [t]);

  return (
    <div className="canvas-container">
      <div ref={canvasRef} className="canvas-wrapper" />
      <div className="canvas-overlay">
        <span>{t('canvas.help')}</span>
        <span>{t('canvas.deleteHint')}</span>
        <span>{t('canvas.selectionCount', { count: selectedCount })}</span>
      </div>
    </div>
  );
};
