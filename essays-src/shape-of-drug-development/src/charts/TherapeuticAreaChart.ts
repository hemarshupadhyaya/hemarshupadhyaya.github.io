import { scaleBand, scaleLinear } from 'd3-scale';
import { sum } from 'd3-array';
import 'd3-transition';
import type { TherapeuticAreaCountRow, TherapeuticAreaPeriodRow } from '../data/types';
import { colors, createResponsiveSvg, onResize, prefersReducedMotion } from './base';
import { showTooltip, hideTooltip, fmt } from '../utils/tooltip';

function formatPeriod(period: string): string {
  return period
    .split('-')
    .map((part) => part.slice(-2))
    .join('–');
}

function compactAreaLabel(area: string): string {
  return area
    .replace('Cardiovascular / renal', 'Cardio / renal')
    .replace('Infectious disease', 'Infectious')
    .replace('Other / specialty', 'Specialty')
    .replace('Gastroenterology / hepatology', 'GI / hepatology')
    .replace('Immunology / inflammation', 'Immunology');
}

const areaPalette = [
  '#2c5f2d',
  '#7a9e3a',
  '#c08a2e',
  '#a05a2c',
  '#5d3a8e',
  '#2f7a8a',
  '#b04a5a',
  '#4f6d7a',
  '#9c6644'
];

export function renderTherapeuticAreaChart(
  container: HTMLElement,
  counts: TherapeuticAreaCountRow[],
  periods: TherapeuticAreaPeriodRow[]
): () => void {
  const reduced = prefersReducedMotion();
  let entered = false;
  let activeIO: IntersectionObserver | null = null;

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, {
        aspect: 1.05,
        minHeight: 480,
        maxHeight: 640,
        mobileViewportCap: false
      });
    const isCompact = innerWidth < 520;

    const topAreas = counts
      .slice()
      .sort((a, b) => b.total_approvals - a.total_approvals)
      .slice(0, isCompact ? 6 : 9);
    const periodLabels = Array.from(new Set(periods.map((d) => d.period))).sort();

    const labelWidth = isCompact ? 110 : 180;
    const valueColWidth = isCompact ? 36 : 48;
    const heatLeft = labelWidth;
    const heatRight = innerWidth - valueColWidth;

    const heatTop = 6;
    const stripBlockHeight = isCompact ? 90 : 110;
    const heatBottomPad = 14;
    const heatHeight = Math.max(180, innerHeight - heatBottomPad - stripBlockHeight - 38);

    // ---------- Heatmap ----------
    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 16)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text('Approvals by therapeutic area, in 5-year windows');

    const cellY = scaleBand<string>()
      .domain(topAreas.map((d) => d.therapeutic_area))
      .range([heatTop, heatTop + heatHeight])
      .padding(0.16);
    const cellX = scaleBand<string>()
      .domain(periodLabels)
      .range([heatLeft, heatRight])
      .padding(0.08);

    const periodLookup = new Map(
      periods.map((d) => [`${d.period}::${d.therapeutic_area}`, d.total_approvals])
    );

    // Per-row maxima for heatmap intensity
    const rowMax = new Map<string, number>();
    topAreas.forEach((a) => {
      let m = 0;
      periodLabels.forEach((p) => {
        const v = periodLookup.get(`${p}::${a.therapeutic_area}`) ?? 0;
        if (v > m) m = v;
      });
      rowMax.set(a.therapeutic_area, m || 1);
    });

    // Period totals (across all areas, not just top — for share denominator)
    const periodTotalAll = new Map<string, number>();
    periodLabels.forEach((p) => {
      const t = sum(
        periods.filter((row) => row.period === p),
        (row) => row.total_approvals
      );
      periodTotalAll.set(p, t || 0);
    });

    const heat = inner.append('g').attr('class', 'ta-heatmap');

    type Cell = { period: string; area: string; value: number };
    const cells: Cell[] = periodLabels.flatMap((period) =>
      topAreas.map((d) => ({
        period,
        area: d.therapeutic_area,
        value: periodLookup.get(`${period}::${d.therapeutic_area}`) ?? 0
      }))
    );

    const cellRects = heat
      .selectAll<SVGRectElement, Cell>('rect.cell')
      .data(cells)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', (d) => cellX(d.period) ?? 0)
      .attr('y', (d) => cellY(d.area) ?? heatTop)
      .attr('width', cellX.bandwidth())
      .attr('height', cellY.bandwidth())
      .attr('rx', 3)
      .attr('fill', colors.accent())
      .attr('opacity', (d) => {
        const m = rowMax.get(d.area) ?? 1;
        return 0.08 + (d.value / m) * 0.82;
      })
      .style('cursor', 'pointer');

    cellRects
      .on('pointermove', function (event, d) {
        const periodTotal = periodTotalAll.get(d.period) ?? 0;
        const share = periodTotal ? d.value / periodTotal : 0;
        const html = `
          <div class="tip-title">${d.area}</div>
          <div class="tip-row"><span>Window</span><strong>${formatPeriod(d.period)}</strong></div>
          <div class="tip-row"><span>Approvals</span><strong>${fmt(d.value)}</strong></div>
          <div class="tip-row"><span>Share of window</span><strong>${(share * 100).toFixed(0)}%</strong></div>
        `;
        showTooltip(html, event.clientX, event.clientY);
        // Highlight row + column
        cellRects.attr('opacity', (c) => {
          const m = rowMax.get(c.area) ?? 1;
          const base = 0.08 + (c.value / m) * 0.82;
          if (c.area === d.area || c.period === d.period) return base;
          return base * 0.35;
        });
      })
      .on('pointerleave', () => {
        hideTooltip();
        cellRects.attr('opacity', (c) => {
          const m = rowMax.get(c.area) ?? 1;
          return 0.08 + (c.value / m) * 0.82;
        });
      });

    // Cell value labels
    heat
      .selectAll('text.cell-value')
      .data(cells)
      .join('text')
      .attr('class', 'cell-value')
      .attr('x', (d) => (cellX(d.period) ?? 0) + cellX.bandwidth() / 2)
      .attr('y', (d) => (cellY(d.area) ?? heatTop) + cellY.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 9 : 10)
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .attr('fill', (d) => {
        const m = rowMax.get(d.area) ?? 1;
        const intensity = d.value / m;
        return intensity > 0.55 ? '#fff' : colors.textSecondary();
      })
      .attr('opacity', (d) => (d.value > 0 ? 1 : 0.25))
      .text((d) => (d.value > 0 ? d.value : ''));

    // Row labels
    heat
      .selectAll('text.row-label')
      .data(topAreas)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', 0)
      .attr('y', (d) => (cellY(d.therapeutic_area) ?? heatTop) + cellY.bandwidth() / 2 + 4)
      .attr('font-size', isCompact ? 10 : 11)
      .attr('font-weight', 500)
      .attr('fill', colors.text())
      .text((d) => (isCompact ? compactAreaLabel(d.therapeutic_area) : d.therapeutic_area));

    // Total column on the right
    heat
      .selectAll('text.row-total')
      .data(topAreas)
      .join('text')
      .attr('class', 'row-total')
      .attr('x', innerWidth)
      .attr('y', (d) => (cellY(d.therapeutic_area) ?? heatTop) + cellY.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', isCompact ? 10 : 11)
      .attr('font-weight', 600)
      .attr('fill', colors.text())
      .text((d) => d.total_approvals);

    heat
      .append('text')
      .attr('x', innerWidth)
      .attr('y', heatTop - 8)
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('fill', colors.textTertiary())
      .attr('letter-spacing', '0.08em')
      .text('TOTAL');

    // Period labels along top
    heat
      .selectAll('text.period-label')
      .data(periodLabels)
      .join('text')
      .attr('class', 'period-label')
      .attr('x', (d) => (cellX(d) ?? 0) + cellX.bandwidth() / 2)
      .attr('y', heatTop - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 9 : 10)
      .attr('fill', colors.textSecondary())
      .text((d, i) => (isCompact && i % 2 === 1 ? '' : formatPeriod(d)));

    // ---------- Slope chart: composition shift, 1985–89 vs latest window ----------
    // TODO(B2): scroll-driven crossfade — replace this static slope with a scroll
    // morph from heatmap → slope → TA × form fingerprint.
    const colorByArea = new Map<string, string>();
    topAreas.forEach((a, i) =>
      colorByArea.set(a.therapeutic_area, areaPalette[i % areaPalette.length])
    );

    const slopeBlockTop = heatTop + heatHeight + 56; // generous gap above subtitle
    const slopeTitleY = margin.top + slopeBlockTop - 30;
    const slopeTop = slopeBlockTop;
    const slopeHeight = stripBlockHeight - 18;
    const slopeBottom = slopeTop + slopeHeight;

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', slopeTitleY)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text('Composition shift — share of approvals: first window vs latest');

    const earlyPeriod = periodLabels[0];
    const latePeriod = periodLabels[periodLabels.length - 1];
    const labelGutter = isCompact ? 92 : 130;
    const leftAnchor = heatLeft + 56;
    const rightAnchor = heatRight - labelGutter;

    // For each top area, compute share within early and late windows
    const earlyTotal = periodTotalAll.get(earlyPeriod) ?? 0;
    const lateTotal = periodTotalAll.get(latePeriod) ?? 0;

    type SlopeRow = {
      area: string;
      color: string;
      earlyShare: number;
      lateShare: number;
      earlyCount: number;
      lateCount: number;
      delta: number;
    };
    const slopeRows: SlopeRow[] = topAreas.map((a) => {
      const eC = periodLookup.get(`${earlyPeriod}::${a.therapeutic_area}`) ?? 0;
      const lC = periodLookup.get(`${latePeriod}::${a.therapeutic_area}`) ?? 0;
      const eS = earlyTotal ? eC / earlyTotal : 0;
      const lS = lateTotal ? lC / lateTotal : 0;
      return {
        area: a.therapeutic_area,
        color: colorByArea.get(a.therapeutic_area) ?? colors.accent(),
        earlyShare: eS,
        lateShare: lS,
        earlyCount: eC,
        lateCount: lC,
        delta: lS - eS
      };
    });

    const maxShare = Math.max(0.01, ...slopeRows.flatMap((r) => [r.earlyShare, r.lateShare]));
    const slopeY = scaleLinear().domain([0, maxShare]).range([slopeBottom, slopeTop]);

    const slope = inner.append('g').attr('class', 'ta-slope');

    // Anchor period labels (top)
    slope
      .append('text')
      .attr('x', leftAnchor)
      .attr('y', slopeTop - 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 9 : 10)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text(formatPeriod(earlyPeriod));
    slope
      .append('text')
      .attr('x', rightAnchor)
      .attr('y', slopeTop - 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 9 : 10)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text(formatPeriod(latePeriod));

    // Vertical anchor lines
    slope
      .append('line')
      .attr('x1', leftAnchor)
      .attr('x2', leftAnchor)
      .attr('y1', slopeTop)
      .attr('y2', slopeBottom)
      .attr('stroke', colors.border())
      .attr('stroke-dasharray', '2,3');
    slope
      .append('line')
      .attr('x1', rightAnchor)
      .attr('x2', rightAnchor)
      .attr('y1', slopeTop)
      .attr('y2', slopeBottom)
      .attr('stroke', colors.border())
      .attr('stroke-dasharray', '2,3');

    // Avoid label overlap on the right by stacking ties
    const sortedByLate = [...slopeRows].sort((a, b) => b.lateShare - a.lateShare);
    const minRowGap = isCompact ? 14 : 16;
    const rightLabelY = new Map<string, number>();
    sortedByLate.forEach((r) => {
      let yWanted = slopeY(r.lateShare);
      // Push down if too close to a previously placed row
      for (const placedY of rightLabelY.values()) {
        if (Math.abs(yWanted - placedY) < minRowGap) {
          yWanted = placedY + minRowGap;
        }
      }
      rightLabelY.set(r.area, yWanted);
    });

    slopeRows.forEach((r) => {
      const x1 = leftAnchor;
      const y1 = slopeY(r.earlyShare);
      const x2 = rightAnchor;
      const y2 = slopeY(r.lateShare);
      const labelY = rightLabelY.get(r.area) ?? y2;

      const g = slope
        .append('g')
        .attr('data-area', r.area)
        .style('cursor', 'pointer');

      g.append('line')
        .attr('x1', x1)
        .attr('x2', x2)
        .attr('y1', y1)
        .attr('y2', y2)
        .attr('stroke', r.color)
        .attr('stroke-width', 1.75)
        .attr('opacity', 0.85);

      // Endpoint dots
      g.append('circle').attr('cx', x1).attr('cy', y1).attr('r', 3.5).attr('fill', r.color);
      g.append('circle').attr('cx', x2).attr('cy', y2).attr('r', 3.5).attr('fill', r.color);

      // Left-side share label
      g.append('text')
        .attr('x', x1 - 8)
        .attr('y', y1 + 3)
        .attr('text-anchor', 'end')
        .attr('font-size', isCompact ? 9 : 10)
        .attr('fill', colors.textSecondary())
        .text(`${(r.earlyShare * 100).toFixed(0)}%`);

      // Right-side area + share, with leader line if pushed off the natural y
      const arrow = r.delta >= 0 ? '▲' : '▼';
      const arrowColor = r.delta >= 0 ? r.color : colors.textTertiary();
      if (Math.abs(labelY - y2) > 1) {
        g.append('line')
          .attr('x1', x2 + 4)
          .attr('x2', x2 + 16)
          .attr('y1', y2)
          .attr('y2', labelY)
          .attr('stroke', r.color)
          .attr('stroke-width', 0.75)
          .attr('opacity', 0.55);
      }
      const labelText = g
        .append('text')
        .attr('x', x2 + 18)
        .attr('y', labelY + 3)
        .attr('font-size', isCompact ? 9 : 10)
        .attr('fill', colors.text());
      labelText
        .append('tspan')
        .attr('font-weight', 600)
        .text(`${(r.lateShare * 100).toFixed(0)}% `);
      labelText
        .append('tspan')
        .attr('fill', colors.textSecondary())
        .text(isCompact ? compactAreaLabel(r.area) : r.area);
      labelText
        .append('tspan')
        .attr('dx', 4)
        .attr('font-size', 9)
        .attr('fill', arrowColor)
        .text(`${arrow} ${(Math.abs(r.delta) * 100).toFixed(1)}pt`);

      g.on('pointermove', (event) => {
        const html = `
          <div class="tip-title">${r.area}</div>
          <div class="tip-row"><span>${formatPeriod(earlyPeriod)}</span><strong>${(r.earlyShare * 100).toFixed(1)}% · ${fmt(r.earlyCount)}</strong></div>
          <div class="tip-row"><span>${formatPeriod(latePeriod)}</span><strong>${(r.lateShare * 100).toFixed(1)}% · ${fmt(r.lateCount)}</strong></div>
          <div class="tip-row${r.delta >= 0 ? ' is-active' : ''}"><span>Δ share</span><strong>${arrow} ${(Math.abs(r.delta) * 100).toFixed(1)} pts</strong></div>
        `;
        showTooltip(html, event.clientX, event.clientY);
        slope.selectAll<SVGGElement, unknown>('g[data-area]').attr('opacity', function () {
          return (this as SVGGElement).getAttribute('data-area') === r.area ? 1 : 0.25;
        });
      }).on('pointerleave', () => {
        hideTooltip();
        slope.selectAll<SVGGElement, unknown>('g[data-area]').attr('opacity', 1);
      });
    });

    // Cancel any previous IO so resize doesn't strand a detached clip.
    activeIO?.disconnect();
    activeIO = null;

    // Sweep clip on the slope chart (left → right)
    const clipId = `ta-slope-clip-${Math.random().toString(36).slice(2, 8)}`;
    const slopeClipRect = svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', leftAnchor - 30)
      .attr('y', slopeTop - 30)
      .attr('width', entered || reduced ? rightAnchor + labelGutter + 30 - (leftAnchor - 30) : 0)
      .attr('height', slopeHeight + 60);
    slope.attr('clip-path', `url(#${clipId})`);

    if (!reduced && !entered) {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          entered = true;
          io.disconnect();
          activeIO = null;
          slopeClipRect
            .transition()
            .duration(1300)
            .attr('width', rightAnchor + labelGutter + 30 - (leftAnchor - 30));
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
        isCompact
          ? 'Heatmap normalized per row. Slope below = first window vs latest.'
          : 'Heatmap cells normalized per row so each area’s shape is comparable. The slope chart compares each area’s share of approvals in the first window with the latest — crossings are reorderings.'
      );

    svg.attr(
      'aria-label',
      'Therapeutic area heatmap and slope chart showing FDA novel drug approvals across five-year periods.'
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
