import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import type { Selection } from 'd3-selection';
import 'd3-transition';
import type { ApprovalTrendRow } from '../data/types';
import { colors, createResponsiveSvg, onResize, prefersReducedMotion } from './base';

export type ApprovalScene =
  | 'overview'
  | 'peak-1996'
  | 'dip-2000s'
  | 'rise-2014'
  | 'provisional-2026';

export interface ApprovalTrendController {
  setScene: (scene: ApprovalScene) => void;
  destroy: () => void;
}

export interface ApprovalTrendOptions {
  provisionalYear?: number;
  initialScene?: ApprovalScene;
}

interface SceneDef {
  highlight: (year: number) => boolean;
  annotation?: { year: number; text: string };
}

function buildScenes(provisionalYear?: number): Record<ApprovalScene, SceneDef> {
  return {
    overview: { highlight: () => true },
    'peak-1996': {
      highlight: (y) => y >= 1995 && y <= 1997,
      annotation: { year: 1996, text: '1996 — 59 approvals (PDUFA era)' }
    },
    'dip-2000s': {
      highlight: (y) => y >= 2005 && y <= 2010,
      annotation: { year: 2007, text: '2005–2010 trough (low of 18 in 2007)' }
    },
    'rise-2014': {
      highlight: (y) => y >= 2014 && y <= 2024,
      annotation: { year: 2018, text: 'Sustained rise: 40+ approvals most years' }
    },
    'provisional-2026': {
      highlight: (y) => y === (provisionalYear ?? 2026),
      annotation: {
        year: provisionalYear ?? 2026,
        text: `${provisionalYear ?? 2026} — provisional, year in progress`
      }
    }
  };
}

export function renderApprovalTrendChart(
  container: HTMLElement,
  data: ApprovalTrendRow[],
  options: ApprovalTrendOptions = {}
): ApprovalTrendController {
  const provisionalYear = options.provisionalYear;
  const scenes = buildScenes(provisionalYear);
  let currentScene: ApprovalScene = options.initialScene ?? 'overview';
  let bars: Selection<SVGRectElement, ApprovalTrendRow, SVGGElement, unknown> | null = null;
  let annotationLayer: Selection<SVGGElement, unknown, null, undefined> | null = null;
  let xScale: ReturnType<typeof scaleBand<number>> | null = null;
  let yScale: ReturnType<typeof scaleLinear> | null = null;
  let chartInnerWidth = 0;
  // Track which scene annotations have been seen so they persist across scenes.
  const seenAnnotations = new Set<ApprovalScene>();

  const reduced = prefersReducedMotion();
  const transitionMs = reduced ? 0 : 350;

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, { aspect: 0.55, maxHeight: 360 });
    chartInnerWidth = innerWidth;

    const x = scaleBand<number>()
      .domain(data.map((d) => d.approval_year))
      .range([0, innerWidth])
      .padding(0.18);
    xScale = x;

    const yMax = max(data, (d) => d.total_approvals) ?? 0;
    const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);
    yScale = y;

    inner
      .append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', colors.border())
      .attr('stroke-dasharray', '2,3');

    bars = inner
      .append('g')
      .attr('class', 'bars')
      .selectAll<SVGRectElement, ApprovalTrendRow>('rect')
      .data(data)
      .join('rect')
      .attr('x', (d) => x(d.approval_year) ?? 0)
      .attr('y', (d) => y(d.total_approvals))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - y(d.total_approvals));

    bars
      .append('title')
      .text((d) =>
        provisionalYear && d.approval_year === provisionalYear
          ? `${d.approval_year} (provisional, YTD): ${d.total_approvals}`
          : `${d.approval_year}: ${d.total_approvals} approvals`
      );

    const tickEvery = innerWidth < 480 ? 10 : 5;
    inner
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        axisBottom<number>(x)
          .tickValues(data.map((d) => d.approval_year).filter((yr) => yr % tickEvery === 0))
          .tickSizeOuter(0)
      )
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

    annotationLayer = inner.append('g').attr('class', 'annotations');

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text('Bars are CDER novel-drug approvals per calendar year, 1985–present.');

    svg.attr(
      'aria-label',
      `Bar chart of FDA CDER novel drug approvals per year, ${data[0].approval_year} to ${
        data[data.length - 1].approval_year
      }, ranging from ${Math.min(...data.map((d) => d.total_approvals))} to ${Math.max(
        ...data.map((d) => d.total_approvals)
      )}.`
    );

    applyScene(currentScene);
  };

  function applyScene(scene: ApprovalScene): void {
    currentScene = scene;
    if (!bars || !annotationLayer || !xScale || !yScale) return;
    const def = scenes[scene];

    bars
      .transition()
      .duration(transitionMs)
      .attr('fill', (d) => {
        const isProv = provisionalYear && d.approval_year === provisionalYear;
        const isHi = def.highlight(d.approval_year);
        if (isProv && (scene === 'provisional-2026' || scene === 'overview')) {
          return scene === 'provisional-2026' ? colors.accent() : colors.textTertiary();
        }
        return isHi ? colors.accent() : colors.textTertiary();
      })
      .attr('opacity', (d) => {
        const isProv = provisionalYear && d.approval_year === provisionalYear;
        const isHi = def.highlight(d.approval_year);
        if (scene === 'overview') return isProv ? 0.55 : 1;
        return isHi ? 1 : 0.18;
      });

    if (scene !== 'overview') {
      seenAnnotations.add(scene);
    }
    redrawAnnotations(scene);
  }

  function redrawAnnotations(activeScene: ApprovalScene): void {
    if (!annotationLayer || !xScale || !yScale) return;
    annotationLayer.selectAll('*').remove();

    const orderedScenes: ApprovalScene[] = [
      'peak-1996',
      'dip-2000s',
      'rise-2014',
      'provisional-2026'
    ];

    const compactLabels = chartInnerWidth < 480;

    orderedScenes
      .filter((s) => (compactLabels ? s === activeScene : seenAnnotations.has(s)))
      .forEach((s) => {
        const def = scenes[s];
        if (!def.annotation) return;
        const a = def.annotation;
        const row = data.find((d) => d.approval_year === a.year);
        if (!row || !xScale || !yScale) return;
        const cx = (xScale(a.year) ?? 0) + xScale.bandwidth() / 2;
        const cy = yScale(row.total_approvals) as number;
        const isActive = s === activeScene;
        const labelOpacity = isActive ? 1 : 0.55;
        const lineOpacity = isActive ? 0.7 : 0.35;

        const labelX = cx > 220 ? cx - 8 : cx + 8;
        const anchor = cx > 220 ? 'end' : 'start';

        const group = annotationLayer!.append('g').attr('data-scene', s);

        group
          .append('line')
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', cy)
          .attr('y2', Math.max(8, cy - 22))
          .attr('stroke', colors.text())
          .attr('stroke-width', 1)
          .attr('opacity', lineOpacity);

        group
          .append('text')
          .attr('x', labelX)
          .attr('y', Math.max(14, cy - 26))
          .attr('text-anchor', anchor)
          .attr('font-size', 11)
          .attr('font-weight', isActive ? 600 : 400)
          .attr('fill', colors.text())
          .attr('opacity', labelOpacity)
          .text(a.text);
      });
  }

  draw();
  const cleanupResize = onResize(container, draw);

  return {
    setScene: applyScene,
    destroy: cleanupResize
  };
}
