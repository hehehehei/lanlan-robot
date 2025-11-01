import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as PIXI from 'pixi.js';
import './CanvasContainer.css';

export const CanvasContainer = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        background: '#000000',
        resizeTo: canvasRef.current!,
      });

      canvasRef.current!.appendChild(app.canvas);
      appRef.current = app;

      const text = new PIXI.Text({
        text: t('canvas.placeholder'),
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 24,
          fill: 0xffffff,
        },
      });

      text.x = app.screen.width / 2;
      text.y = app.screen.height / 2;
      text.anchor.set(0.5);

      app.stage.addChild(text);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, [t]);

  return (
    <div className="canvas-container">
      <div ref={canvasRef} className="canvas-wrapper" />
    </div>
  );
};
