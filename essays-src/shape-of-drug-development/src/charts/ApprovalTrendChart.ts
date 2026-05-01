import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max, mean } from 'd3-array';
import { line, curveCatmullRom } from 'd3-shape';
import type { Selection } from 'd3-selection';
import { pointer, select } from 'd3-selection';
import 'd3-transition';
import type { ApprovalTrendRow } from '../data/types';
import { colors, createResponsiveSvg, onResize, prefersReducedMotion } from './base';
import { showTooltip, hideTooltip, fmt } from '../utils/tooltip';

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
  revealThrough: number; // bars become visible for years <= this; -Infinity hides all
  pulseYear?: number;
  annotation?: { year: number; text: string };
}

function buildScenes(provisionalYear?: number): Record<ApprovalScene, SceneDef> {
  const provYear = provisionalYear ?? 2026;
  return {
    overview: {
      highlight: () => true,
      revealThrough: Number.NEGATIVE_INFINITY
    },
    'peak-1996': {
      highlight: (y) => y >= 1995 && y <= 1997,
      revealThrough: 1997,
      pulseYear: 1996,
      annotation: { year: 1996, text: '1996 — 59 approvals (PDUFA era)' }
    },
    'dip-2000s': {
      highlight: (y) => y >= 2005 && y <= 2010,
      revealThrough: 2010,
      pulseYear: 2007,
      annotation: { year: 2007, text: '2005–2010 trough (low of 18 in 2007)' }
    },
    'rise-2014': {
      highlight: (y) => y >= 2014 && y <= 2024,
      revealThrough: 2024,
      pulseYear: 2018,
      annotation: { year: 2018, text: 'Sustained rise: 40+ approvals most years' }
    },
    'provisional-2026': {
      highlight: (y) => y === provYear,
      revealThrough: provYear,
      pulseYear: provYear,
      annotation: {
        year: provYear,
        text: `${provYear} — provisional, year in progress`
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
  let trendPath: Selection<SVGPathElement, unknown, null, undefined> | null = null;
  let trendArea: Selection<SVGPathElement, unknown, null, undefined> | null = null;
  let xScale: ReturnType<typeof scaleBand<number>> | null = null;
  let yScale: ReturnType<typeof scaleLinear> | null = null;
  let chartInnerWidth = 0;
  let entered = false;
  let activeIO: IntersectionObserver | null = null;
  let pulseLayer: Selection<SVGGElement, unknown, null, undefined> | null = null;

  function rollingMean(rows: ApprovalTrendRow[]): { year: number; value: number }[] {
    const usable = rows.filter((d) => d.approval_year !== provisionalYear);
    return usable.map((d, i) => {
      const lo = Math.max(0, i - 2);
      const hi = Math.min(usable.length - 1, i + 2);
      const window = usable.slice(lo, hi + 1).map((r) => r.total_approvals);
      return { year: d.approval_year, value: mean(window) ?? d.total_approvals };
    });
  }

  const seenAnnotations = new Set<ApprovalScene>();
  const reduced = prefersReducedMotion();
  const transitionMs = reduced ? 0 : 350;

  const peakValue = max(data, (d) => d.total_approvals) ?? 0;

  const draw = () => {
    // Cancel any previous IO so resize doesn't strand a detached path or pulse layer.
    activeIO?.disconnect();
    activeIO = null;

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
      .attr('height', (d) => innerHeight - y(d.total_approvals))
      .attr('opacity', 0);

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

    const trendData = rollingMean(data);
    const xAt = (year: number) => (x(year) ?? 0) + x.bandwidth() / 2;
    const lineGen = line<{ year: number; value: number }>()
      .x((d) => xAt(d.year))
      .y((d) => y(d.value))
      .curve(curveCatmullRom.alpha(0.5));
    const areaGen = (rows: { year: number; value: number }[]) => {
      if (rows.length === 0) return '';
      const top = rows.map((d) => `${xAt(d.year)},${y(d.value)}`).join(' L');
      const x0 = xAt(rows[0].year);
      const x1 = xAt(rows[rows.length - 1].year);
      return `M${x0},${innerHeight} L${top} L${x1},${innerHeight} Z`;
    };

    // Vertical-gradient stroke for trendline so peaks are darker, troughs lighter
    const gradId = `trendgrad-${Math.random().toString(36).slice(2, 8)}`;
    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    grad.append('stop').attr('offset', '0%').attr('stop-color', colors.accent()).attr('stop-opacity', 1);
    grad.append('stop').attr('offset', '100%').attr('stop-color', colors.accent()).attr('stop-opacity', 0.35);

    const trendLayer = inner.append('g').attr('class', 'trend');
    trendArea = trendLayer
      .append('path')
      .attr('d', areaGen(trendData))
      .attr('fill', `url(#${gradId})`)
      .attr('opacity', 0.18)
      .attr('pointer-events', 'none');
    trendPath = trendLayer
      .append('path')
      .attr('d', lineGen(trendData) ?? '')
      .attr('fill', 'none')
      .attr('stroke', colors.accent())
      .attr('stroke-width', 2.25)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('pointer-events', 'none');

    pulseLayer = inner.append('g').attr('class', 'pulses').attr('pointer-events', 'none');
    annotationLayer = inner.append('g').attr('class', 'annotations');

    // Hover overlay: one transparent rect per year for clean hit-testing
    const guide = inner
      .append('line')
      .attr('class', 'hover-guide')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', colors.text())
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    const overlay = inner
      .append('rect')
      .attr('class', 'hover-overlay')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent');

    const yearAt = (px: number): ApprovalTrendRow | null => {
      const step = x.step();
      const idx = Math.min(data.length - 1, Math.max(0, Math.floor((px - 0) / step)));
      return data[idx] ?? null;
    };

    overlay
      .on('pointermove', function (event) {
        const [mx] = pointer(event, this);
        const row = yearAt(mx);
        if (!row || !xScale) return;
        const cx = (xScale(row.approval_year) ?? 0) + xScale.bandwidth() / 2;
        guide.attr('x1', cx).attr('x2', cx).attr('opacity', 0.45);
        bars?.attr('opacity', (d) => {
          const reveal = scenes[currentScene].revealThrough;
          if (d.approval_year > reveal) return 0;
          return d.approval_year === row.approval_year ? 1 : 0.28;
        });
        const trend = trendData.find((t) => t.year === row.approval_year);
        const isProv =
          provisionalYear && row.approval_year === provisionalYear;
        const html = `
          <div class="tip-title">${row.approval_year}${isProv ? ' (provisional, YTD)' : ''}</div>
          <div class="tip-row"><span>Approvals</span><strong>${fmt(row.total_approvals)}</strong></div>
          ${
            trend
              ? `<div class="tip-row"><span>5-yr mean</span><strong>${trend.value.toFixed(1)}</strong></div>`
              : ''
          }
          <div class="tip-row"><span>vs all-time peak</span><strong>${fmt(row.total_approvals - peakValue)}</strong></div>
        `;
        showTooltip(html, event.clientX, event.clientY);
      })
      .on('pointerleave', () => {
        guide.attr('opacity', 0);
        hideTooltip();
        if (bars) applyScene(currentScene);
      });

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        'Bars are CDER novel-drug approvals per calendar year. Line is a 5-year centered rolling mean.'
      );

    svg.attr(
      'aria-label',
      `Bar chart of FDA CDER novel drug approvals per year, ${data[0].approval_year} to ${
        data[data.length - 1].approval_year
      }, ranging from ${Math.min(...data.map((d) => d.total_approvals))} to ${Math.max(
        ...data.map((d) => d.total_approvals)
      )}.`
    );

    // Trendline starts hidden if we haven't entered yet; the IO below draws it in.
    if (trendPath) {
      const node = trendPath.node();
      if (node && !reduced && !entered) {
        const len = node.getTotalLength();
        trendPath
          .attr('stroke-dasharray', `${len}`)
          .attr('stroke-dashoffset', `${len}`);
      } else {
        trendPath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      }
    }
    if (trendArea) {
      trendArea.attr('opacity', !reduced && !entered ? 0 : 0.18);
    }

    applyScene(currentScene);

    // On first viewport entry: draw the trendline left-to-right. Bars stay hidden
    // until the user scrolls into a story scene (handled in applyScene).
    if (!reduced && !entered) {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          entered = true;
          io.disconnect();
          activeIO = null;
          if (!trendPath) return;
          const node = trendPath.node();
          if (!node) return;
          const len = node.getTotalLength();
          trendArea
            ?.transition()
            .duration(800)
            .attr('opacity', 0.18);
          trendPath
            .attr('stroke-dasharray', `${len}`)
            .attr('stroke-dashoffset', `${len}`)
            .transition()
            .duration(1600)
            .attr('stroke-dashoffset', '0')
            .on('end', () => {
              trendPath?.attr('stroke-dasharray', null);
            });
        },
        { threshold: 0.2 }
      );
      io.observe(container);
      activeIO = io;
    }
  };

  function pulseAt(year: number): void {
    if (!pulseLayer || !xScale || !yScale || reduced) return;
    pulseLayer.selectAll('*').remove();
    const row = data.find((d) => d.approval_year === year);
    if (!row) return;
    const cx = (xScale(year) ?? 0) + xScale.bandwidth() / 2;
    const cy = yScale(row.total_approvals) as number;
    for (let k = 0; k < 2; k++) {
      pulseLayer
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 3)
        .attr('fill', 'none')
        .attr('stroke', colors.accent())
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .transition()
        .delay(k * 700)
        .duration(1000)
        .attr('r', 24)
        .attr('opacity', 0)
        .remove();
    }
    pulseLayer
      .append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 0)
      .attr('fill', colors.accent())
      .attr('opacity', 0)
      .transition()
      .duration(220)
      .attr('r', 4)
      .attr('opacity', 1);
  }

  function applyScene(scene: ApprovalScene): void {
    const sceneChanged = currentScene !== scene;
    currentScene = scene;
    if (!bars || !annotationLayer || !xScale || !yScale) return;
    const def = scenes[scene];

    bars
      .transition()
      .duration(transitionMs)
      .attr('fill', (d) => {
        const isProv = provisionalYear && d.approval_year === provisionalYear;
        const isHi = def.highlight(d.approval_year);
        if (scene === 'provisional-2026' && isProv) return colors.accent();
        return isHi ? colors.accent() : colors.textTertiary();
      })
      .attr('opacity', (d) => {
        if (d.approval_year > def.revealThrough) return 0;
        const isHi = def.highlight(d.approval_year);
        return isHi ? 1 : 0.32;
      });

    if (trendPath && trendArea) {
      const focused = scene !== 'overview';
      trendPath
        .transition()
        .duration(transitionMs)
        .attr('opacity', focused ? 0.85 : 0.95)
        .attr('stroke-width', focused ? 2.6 : 2.25);
      trendArea
        .transition()
        .duration(transitionMs)
        .attr('opacity', focused ? 0.1 : 0.18);
    }

    if (scene !== 'overview') {
      seenAnnotations.add(scene);
    }
    redrawAnnotations(scene);

    if (sceneChanged && def.pulseYear !== undefined) {
      pulseAt(def.pulseYear);
    }
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
    destroy: () => {
      cleanupResize();
      activeIO?.disconnect();
      activeIO = null;
      hideTooltip();
      select(container).selectAll('*').interrupt();
    }
  };
}
