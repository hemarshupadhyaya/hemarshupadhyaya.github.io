import { select, type Selection } from 'd3-selection';

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const defaultMargin: Margin = { top: 16, right: 16, bottom: 36, left: 44 };

export interface ResponsiveSvg {
  container: HTMLElement;
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  inner: Selection<SVGGElement, unknown, null, undefined>;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}

export interface ResponsiveOptions {
  margin?: Margin;
  aspect?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function createResponsiveSvg(
  container: HTMLElement,
  options: ResponsiveOptions = {}
): ResponsiveSvg {
  const margin = options.margin ?? defaultMargin;
  const aspect = options.aspect ?? 0.5;
  const minHeight = options.minHeight ?? 220;
  const maxHeight = options.maxHeight ?? 360;

  const width = Math.max(280, container.clientWidth || 600);
  const height = Math.min(maxHeight, Math.max(minHeight, width * aspect));

  select(container).select('svg').remove();

  const svg = select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', height)
    .attr('role', 'img')
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const inner = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  return {
    container,
    svg,
    inner,
    width,
    height,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
    margin
  };
}

export function onResize(container: HTMLElement, render: () => void): () => void {
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
  });
  observer.observe(container);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function readToken(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const colors = {
  text: () => readToken('--text-primary', '#1a1a1a'),
  textSecondary: () => readToken('--text-secondary', '#555'),
  textTertiary: () => readToken('--text-tertiary', '#888'),
  border: () => readToken('--border', '#e0ddd8'),
  accent: () => readToken('--accent', '#2c5f2d'),
  accentLight: () => readToken('--accent-light', '#e8f0e8')
};

export const seriesPalette = [
  '#2c5f2d',
  '#7a9e3a',
  '#c08a2e',
  '#a05a2c',
  '#5d3a8e',
  '#2f7a8a'
];
