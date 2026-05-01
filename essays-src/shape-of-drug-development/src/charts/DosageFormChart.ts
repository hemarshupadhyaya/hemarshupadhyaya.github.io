import { scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { extent, max, rollup, sum } from 'd3-array';
import { area, stack, stackOffsetWiggle, stackOrderInsideOut, curveBasis } from 'd3-shape';
import { pointer, type Selection } from 'd3-selection';
import 'd3-transition';
import type { DosageFormRow } from '../data/types';
import { colors, createResponsiveSvg, onResize, prefersReducedMotion } from './base';
import { showTooltip, hideTooltip, fmt } from '../utils/tooltip';

function compactForm(form: string): string {
  return form
    .replace('Injectable', 'Injection')
    .replace('For Solution', 'Soln prep')
    .replace('Solution/Drops', 'Drops')
    .replace('Extended Release', 'ER');
}

const palette = [
  '#2c5f2d',
  '#7a9e3a',
  '#c08a2e',
  '#a05a2c',
  '#5d3a8e',
  '#2f7a8a',
  '#b04a5a',
  '#888'
];

export function renderDosageFormChart(
  container: HTMLElement,
  data: DosageFormRow[]
): () => void {
  const reduced = prefersReducedMotion();
  let entered = false;
  let activeIO: IntersectionObserver | null = null;

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, {
        aspect: 0.6,
        minHeight: 360,
        maxHeight: 460,
        mobileViewportCap: false
      });
    const isCompact = innerWidth < 520;

    const topN = isCompact ? 5 : 7;

    const totalsByForm = Array.from(
      rollup(
        data,
        (rows) => sum(rows, (d) => d.total_approvals),
        (d) => d.dosage_form
      ),
      ([form, total]) => ({ form, total })
    ).sort((a, b) => b.total - a.total);

    const topForms = totalsByForm.slice(0, topN).map((d) => d.form);
    const otherKey = 'Other';
    const keys = [...topForms, otherKey];

    const years = Array.from(new Set(data.map((d) => d.approval_year))).sort();
    type Row = { approval_year: number } & Record<string, number>;
    const rows: Row[] = years.map((yr) => {
      const r: Row = { approval_year: yr } as Row;
      keys.forEach((k) => (r[k] = 0));
      return r;
    });
    const yearIndex = new Map(rows.map((r, i) => [r.approval_year, i]));

    data.forEach((d) => {
      const idx = yearIndex.get(d.approval_year);
      if (idx == null) return;
      const k = topForms.includes(d.dosage_form) ? d.dosage_form : otherKey;
      rows[idx][k] += d.total_approvals;
    });

    const xExtent = extent(years) as [number, number];
    const x = scaleLinear().domain(xExtent).range([0, innerWidth]);

    const stacker = stack<Row>()
      .keys(keys)
      .order(stackOrderInsideOut)
      .offset(stackOffsetWiggle);
    const series = stacker(rows);

    const yMin = Math.min(...series.flat().map((p) => p[0]));
    const yMax = max(series.flat().map((p) => p[1])) ?? 0;
    const y = scaleLinear().domain([yMin, yMax]).range([innerHeight, 12]);

    const areaGen = area<{ data: Row; 0: number; 1: number }>()
      .x((d) => x(d.data.approval_year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(curveBasis);

    // Cancel any previous IO so resize doesn't leave us stuck at width=0.
    activeIO?.disconnect();
    activeIO = null;

    // Clip-rect sweeps left-to-right so the streams "grow through time" on first view.
    const clipId = `dosage-clip-${Math.random().toString(36).slice(2, 8)}`;
    const sweepRect = svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', reduced || entered ? innerWidth : 0)
      .attr('height', innerHeight);

    const streamsGroup = inner
      .append('g')
      .attr('class', 'streams')
      .attr('clip-path', `url(#${clipId})`);

    const layer: Selection<SVGPathElement, typeof series[number], SVGGElement, unknown> =
      streamsGroup
        .selectAll<SVGPathElement, typeof series[number]>('path')
        .data(series)
        .join('path')
        .attr('fill', (_d, i) => palette[i % palette.length])
        .attr('opacity', (d) => (d.key === otherKey ? 0.45 : 0.85))
        .attr('d', (d) => areaGen(d as unknown as { data: Row; 0: number; 1: number }[]) ?? '')
        .attr('stroke', 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer');

    if (!reduced && !entered) {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          entered = true;
          io.disconnect();
          activeIO = null;
          sweepRect.transition().duration(1200).attr('width', innerWidth);
        },
        { threshold: 0.2 }
      );
      io.observe(container);
      activeIO = io;
    }

    layer.attr('pointer-events', 'none');

    const resetLayerOpacity = () =>
      layer.attr('opacity', (s) => (s.key === otherKey ? 0.45 : 0.85));

    // Inline labels at the widest point of each layer
    series.forEach((s, i) => {
      let bestIdx = 0;
      let bestThickness = 0;
      s.forEach((point, idx) => {
        const t = point[1] - point[0];
        if (t > bestThickness) {
          bestThickness = t;
          bestIdx = idx;
        }
      });
      if (bestThickness < 4) return;
      const point = s[bestIdx];
      const cx = x(rows[bestIdx].approval_year);
      const cy = (y(point[0]) + y(point[1])) / 2;
      inner
        .append('text')
        .attr('x', cx)
        .attr('y', cy + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', isCompact ? 9 : 10)
        .attr('font-weight', 600)
        .attr('fill', '#fff')
        .attr('paint-order', 'stroke')
        .attr('stroke', palette[i % palette.length])
        .attr('stroke-width', 3)
        .text(compactForm(s.key));
    });

    // Vertical guide + tooltip overlay
    const guide = inner
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', colors.text())
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    inner
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('pointermove', function (event) {
        const [mx, my] = pointer(event, this);
        const yr = Math.round(x.invert(mx));
        const idx = Math.max(0, Math.min(rows.length - 1, yearIndex.get(yr) ?? 0));
        const row = rows[idx];
        if (!row) return;
        const cx = x(row.approval_year);
        guide.attr('x1', cx).attr('x2', cx).attr('opacity', 0.45);
        const total = keys.reduce((s, k) => s + (row[k] || 0), 0);
        if (total === 0) {
          hideTooltip();
          resetLayerOpacity();
          return;
        }
        // Determine which layer the cursor's y lies within at this year, dim others
        let activeKey: string | null = null;
        for (const s of series) {
          const point = s[idx];
          if (!point) continue;
          const top = y(point[1]);
          const bot = y(point[0]);
          if (my >= top && my <= bot) {
            activeKey = s.key;
            break;
          }
        }
        if (activeKey) {
          layer.attr('opacity', (s) => (s.key === activeKey ? 1 : 0.18));
        } else {
          resetLayerOpacity();
        }
        const lines = keys
          .map((k, i) => ({ key: k, value: row[k] || 0, color: palette[i % palette.length] }))
          .filter((l) => l.value > 0)
          .sort((a, b) => b.value - a.value)
          .map(
            (l) =>
              `<div class="tip-row"><span><span class="tip-swatch" style="background:${l.color};opacity:${l.key === otherKey ? 0.6 : 1}"></span>${compactForm(l.key)}</span><strong>${fmt(l.value)}</strong></div>`
          )
          .join('');
        const html = `
          <div class="tip-title">${row.approval_year} — ${fmt(total)} approvals</div>
          ${lines}
        `;
        showTooltip(html, event.clientX, event.clientY);
      })
      .on('pointerleave', () => {
        guide.attr('opacity', 0);
        hideTooltip();
        resetLayerOpacity();
      });

    // X axis only — streamgraph y-axis would mislead
    inner
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).ticks(7).tickFormat((d) => `${d}`).tickSizeOuter(0))
      .call((g) => g.selectAll('path,line').attr('stroke', colors.border()))
      .call((g) =>
        g.selectAll('text').attr('fill', colors.textSecondary()).attr('font-size', 11)
      );

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        isCompact
          ? 'Streamgraph of approvals by dosage form. Layer width is yearly count.'
          : 'Streamgraph of CDER novel approvals by dosage form. Layer thickness encodes yearly count; the wiggle baseline emphasizes the changing mix.'
      );

    svg.attr(
      'aria-label',
      'Streamgraph showing the changing mix of FDA novel drug dosage forms over time.'
    );
  };

  draw();
  const cleanupResize = onResize(container, draw);
  return () => {
    cleanupResize();
    activeIO?.disconnect();
    activeIO = null;
    hideTooltip();
  };
}
