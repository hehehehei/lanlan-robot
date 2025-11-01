import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./components/CanvasContainer', () => ({
  CanvasContainer: () => <div data-testid="canvas-container">Canvas Placeholder</div>,
}));

describe('App', () => {
  it('should render without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('should display Chinese text in sidebar', () => {
    render(<App />);
    expect(screen.getByText('图层切换')).toBeInTheDocument();
  });

  it('should render canvas container', () => {
    render(<App />);
    expect(screen.getByTestId('canvas-container')).toBeInTheDocument();
  });
});
