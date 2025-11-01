import './CanvasContainer.css';
import { Renderer } from './canvas/Renderer';

export const CanvasContainer = () => {
  return (
    <div className="canvas-container">
      <Renderer />
    </div>
  );
};
