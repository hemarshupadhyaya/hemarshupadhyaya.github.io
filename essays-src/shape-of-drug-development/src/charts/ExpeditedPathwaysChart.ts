import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent, max } from 'd3-array';
import { line, curveMonotoneX } from 'd3-shape';
import type { Selection } from 'd3-selection';
import 'd3-transition';
import type { ExpeditedPathwayRow } from '../data/types';
import {
  colors,
  createResponsiveSvg,
  onResize,
  prefersReducedMotion,
  seriesPalette
} from './base';

const series = [
  { key: 'priority_review_count', label: 'Priority review', scene: 'priority-review' },
  { key: 'accelerated_approval_count', label: 'Accelerated approval', scene: 'accelerated' },
  { key: 'fast_track_count', label: 'Fast track', scene: 'fast-track' },
  { key: 'breakthrough_therapy_count', label: 'Breakthrough therapy', scene: 'breakthrough' },
  { key: 'qualified_infectious_disease_product_count', label: 'QIDP', scene: 'qidp' }
] as const;

type SeriesKey = (typeof series)[number]['key'];
export type ExpeditedScene = (typeof series)[number]['scene'];

export interface ExpeditedPathwaysController {
  setScene: (scene: ExpeditedScene) => void;
  destroy: () => void;
}

export function renderExpeditedPathwaysChart(
  container: HTMLElement,
  data: ExpeditedPathwayRow[],
  initialScene: ExpeditedScene = 'priority-review'
): ExpeditedPathwaysController {
  let currentScene = initialScene;
  let paths: Selection<SVGPathElement, (typeof series)[number], SVGGElement, unknown> | null =
    null;
  let legendItems: Selection<SVGGElement, (typeof series)[number], SVGGElement, unknown> | null =
    null;
  const reduced = prefersReducedMotion();
  const transitionMs = reduced ? 0 : 500;

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, { aspect: 0.55, maxHeight: 360 });

    const xDomain = extent(data, (d) => d.approval_year) as [number, number];
    const x = scaleLinear().domain(xDomain).range([0, innerWidth]);

    const yMax =
      max(data, (d) =>
        Math.max(...series.map((s) => (d[s.key as SeriesKey] as number) || 0))
      ) ?? 0;
    const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    inner
      .append('g')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', colors.border())
      .attr('stroke-dasharray', '2,3');

    const lineGen = line<ExpeditedPathwayRow>()
      .x((d) => x(d.approval_year))
      .curve(curveMonotoneX);

    paths = inner
      .append('g')
      .attr('class', 'expedited-lines')
      .selectAll<SVGPathElement, (typeof series)[number]>('path')
      .data(series)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (_s, i) => seriesPalette[i] ?? colors.accent())
      .attr('stroke-width', 1.75)
      .attr('d', (s) => lineGen.y((d) => y((d[s.key as SeriesKey] as number) || 0))(data))
      .each(function (s) {
        const length = this.getTotalLength();
        this.style.strokeDasharray = `${length}`;
        this.style.strokeDashoffset = `${length}`;
        this.dataset.pathLength = `${length}`;
        this.setAttribute('aria-label', s.label);
      });

    paths.append('title').text((s) => s.label);

    inner
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).ticks(6).tickFormat((d) => `${d}`).tickSizeOuter(0))
      .call((g) => g.selectAll('path,line').attr('stroke', colors.border()))
      .call((g) =>
        g.selectAll('text').attr('fill', colors.textSecondary()).attr('font-size', 11)
      );

    inner
      .append('g')
      .call(axisLeft(y).ticks(5).tickSizeOuter(0))
      .call((g) => g.selectAll('path,line').attr('stroke', colors.border()))
      .call((g) =>
        g.selectAll('text').attr('fill', colors.textSecondary()).attr('font-size', 11)
      );

    const legendCols = innerWidth < 480 ? 2 : 3;
    const legend = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top - 4})`);
    legendItems = legend
      .selectAll<SVGGElement, (typeof series)[number]>('g')
      .data(series)
      .join('g')
      .attr('transform', (_s, i) => {
        const col = i % legendCols;
        const row = Math.floor(i / legendCols);
        return `translate(${col * 140},${row * 14})`;
      });

    legendItems
      .append('line')
      .attr('x1', 0)
      .attr('x2', 14)
      .attr('y1', -4)
      .attr('y2', -4)
      .attr('stroke', (_s, i) => seriesPalette[i] ?? colors.accent())
      .attr('stroke-width', 2);
    legendItems
      .append('text')
      .attr('x', 18)
      .attr('y', -1)
      .attr('font-size', 11)
      .attr('fill', colors.textSecondary())
      .text((s) => s.label);

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        'Counts of approvals carrying each designation per year. A single approval can hold multiple designations.'
      );

    svg.attr(
      'aria-label',
      `Line chart of FDA expedited pathway designations per year, including priority review, fast track, breakthrough therapy, accelerated approval, and QIDP.`
    );

    applyScene(currentScene);
  };

  function applyScene(scene: ExpeditedScene): void {
    currentScene = scene;
    if (!paths || !legendItems) return;

    const activeIndex = series.findIndex((s) => s.scene === scene);

    paths
      .transition()
      .duration(transitionMs)
      .attr('opacity', (_s, i) => (i <= activeIndex ? 1 : 0))
      .style('stroke-dashoffset', function (_s, i) {
        const length = Number(this.dataset.pathLength ?? 0);
        return i <= activeIndex ? '0' : `${length}`;
      });

    legendItems
      .transition()
      .duration(transitionMs)
      .attr('opacity', (_s, i) => (i <= activeIndex ? 1 : 0.35));
  }

  draw();
  const cleanupResize = onResize(container, draw);

  return {
    setScene: applyScene,
    destroy: cleanupResize
  };
}
