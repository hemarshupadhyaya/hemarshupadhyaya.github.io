import { scaleBand } from 'd3-scale';
import 'd3-transition';
import type { TaFormMatrix } from '../data/types';
import { colors, createResponsiveSvg, onResize, prefersReducedMotion } from './base';
import { showTooltip, hideTooltip, fmt } from '../utils/tooltip';

function compactArea(area: string): string {
  return area
    .replace('Cardiovascular / renal', 'Cardio / renal')
    .replace('Infectious disease', 'Infectious')
    .replace('Other / specialty', 'Specialty')
    .replace('Gastroenterology / hepatology', 'GI / hepatology')
    .replace('Immunology / inflammation', 'Immunology');
}

// TODO(B2): when scroll-driven crossfade is built, this chart becomes the
// middle frame between the TA heatmap and the dosage streamgraph.
export function renderTaFormFingerprintChart(
  container: HTMLElement,
  matrix: TaFormMatrix
): () => void {
  const reduced = prefersReducedMotion();
  let entered = false;
  let activeIO: IntersectionObserver | null = null;

  const draw = () => {
    activeIO?.disconnect();
    activeIO = null;

    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, {
        aspect: 0.62,
        minHeight: 360,
        maxHeight: 520,
        mobileViewportCap: false
      });
    const isCompact = innerWidth < 560;

    const formCols = [...matrix.dosage_forms, 'Other'];
    const rows = matrix.matrix;

    const labelWidth = isCompact ? 96 : 160;
    const totalColWidth = isCompact ? 36 : 48;
    const heatLeft = labelWidth;
    const heatRight = innerWidth - totalColWidth;

    const heatTop = 20;
    const heatBottomPad = 16;
    const heatHeight = Math.max(220, innerHeight - heatTop - heatBottomPad);

    const xBand = scaleBand<string>()
      .domain(formCols)
      .range([heatLeft, heatRight])
      .padding(0.06);
    const yBand = scaleBand<string>()
      .domain(rows.map((r) => r.therapeutic_area))
      .range([heatTop, heatTop + heatHeight])
      .padding(0.14);

    // Heatmap cells, intensity = within-row share
    type Cell = { area: string; form: string; share: number; count: number };
    const cells: Cell[] = rows.flatMap((r) =>
      formCols.map((f) => ({
        area: r.therapeutic_area,
        form: f,
        share: r.forms[f]?.share ?? 0,
        count: r.forms[f]?.count ?? 0
      }))
    );

    // Find max share per row to mark each row's "dominant" form
    const dominantByRow = new Map<string, string>();
    rows.forEach((r) => {
      let best = '';
      let bestShare = 0;
      formCols.forEach((f) => {
        const s = r.forms[f]?.share ?? 0;
        if (s > bestShare) {
          bestShare = s;
          best = f;
        }
      });
      dominantByRow.set(r.therapeutic_area, best);
    });

    const cellRects = inner
      .append('g')
      .attr('class', 'fp-cells')
      .selectAll<SVGRectElement, Cell>('rect')
      .data(cells)
      .join('rect')
      .attr('x', (d) => xBand(d.form) ?? 0)
      .attr('y', (d) => yBand(d.area) ?? heatTop)
      .attr('width', xBand.bandwidth())
      .attr('height', yBand.bandwidth())
      .attr('rx', 4)
      .attr('fill', colors.accent())
      .attr('opacity', (d) => 0.07 + d.share * 0.85)
      .attr('stroke', (d) =>
        dominantByRow.get(d.area) === d.form ? colors.accent() : 'none'
      )
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    cellRects
      .on('pointermove', function (event, d) {
        const html = `
          <div class="tip-title">${d.area}</div>
          <div class="tip-row"><span>Form</span><strong>${d.form}</strong></div>
          <div class="tip-row"><span>Approvals</span><strong>${fmt(d.count)}</strong></div>
          <div class="tip-row"><span>Share of area</span><strong>${(d.share * 100).toFixed(0)}%</strong></div>
        `;
        showTooltip(html, event.clientX, event.clientY);
        cellRects.attr('opacity', (c) => {
          const base = 0.07 + c.share * 0.85;
          if (c.area === d.area || c.form === d.form) return base;
          return base * 0.32;
        });
      })
      .on('pointerleave', () => {
        hideTooltip();
        cellRects.attr('opacity', (c) => 0.07 + c.share * 0.85);
      });

    // Cell value labels (% of area)
    inner
      .append('g')
      .attr('class', 'fp-values')
      .selectAll('text')
      .data(cells)
      .join('text')
      .attr('x', (d) => (xBand(d.form) ?? 0) + xBand.bandwidth() / 2)
      .attr('y', (d) => (yBand(d.area) ?? heatTop) + yBand.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 9 : 10)
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .attr('fill', (d) => (d.share > 0.45 ? '#fff' : colors.textSecondary()))
      .attr('opacity', (d) => (d.share > 0.02 ? 1 : 0.3))
      .text((d) => (d.share > 0 ? `${(d.share * 100).toFixed(0)}` : ''));

    // Row labels (left)
    inner
      .append('g')
      .attr('class', 'fp-row-labels')
      .selectAll('text')
      .data(rows)
      .join('text')
      .attr('x', 0)
      .attr('y', (d) => (yBand(d.therapeutic_area) ?? heatTop) + yBand.bandwidth() / 2 + 4)
      .attr('font-size', isCompact ? 10 : 11)
      .attr('font-weight', 500)
      .attr('fill', colors.text())
      .text((d) => (isCompact ? compactArea(d.therapeutic_area) : d.therapeutic_area));

    // Total column on the right
    inner
      .append('g')
      .selectAll('text')
      .data(rows)
      .join('text')
      .attr('x', innerWidth)
      .attr('y', (d) => (yBand(d.therapeutic_area) ?? heatTop) + yBand.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', isCompact ? 10 : 11)
      .attr('font-weight', 600)
      .attr('fill', colors.text())
      .text((d) => fmt(d.total));

    inner
      .append('text')
      .attr('x', innerWidth)
      .attr('y', heatTop - 8)
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.08em')
      .attr('fill', colors.textTertiary())
      .text('TOTAL');

    // Column labels (top)
    inner
      .append('g')
      .selectAll('text')
      .data(formCols)
      .join('text')
      .attr('x', (d) => (xBand(d) ?? 0) + xBand.bandwidth() / 2)
      .attr('y', heatTop - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 9 : 10)
      .attr('fill', colors.textSecondary())
      .text((d) => d);

    // Sweep clip on the cells
    const clipId = `fp-clip-${Math.random().toString(36).slice(2, 8)}`;
    const clipRect = svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', heatLeft - 4)
      .attr('y', heatTop - 4)
      .attr('width', entered || reduced ? heatRight - heatLeft + 8 : 0)
      .attr('height', heatHeight + 8);
    inner.select<SVGGElement>('.fp-cells').attr('clip-path', `url(#${clipId})`);
    inner.select<SVGGElement>('.fp-values').attr('clip-path', `url(#${clipId})`);

    if (!reduced && !entered) {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          entered = true;
          io.disconnect();
          activeIO = null;
          clipRect.transition().duration(1100).attr('width', heatRight - heatLeft + 8);
        },
        { threshold: 0.2 }
      );
      io.observe(container);
      activeIO = io;
    }

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        'Cells = share of an area’s approvals delivered as that form. Outline marks each area’s dominant form.'
      );

    svg.attr(
      'aria-label',
      'Heatmap of therapeutic area by dosage form, normalized per row to show each disease area’s delivery profile.'
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
