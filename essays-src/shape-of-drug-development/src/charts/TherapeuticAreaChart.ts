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
  let introPlayed = false;
  let intersectionCleanup: (() => void) | null = null;

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

    // ---------- Period-share strip ----------
    const stripTop = heatTop + heatHeight + 30;
    const stripHeight = stripBlockHeight - 20;

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', margin.top + stripTop - 14)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text('Composition shift — share of approvals per window');

    const colorByArea = new Map<string, string>();
    topAreas.forEach((a, i) => colorByArea.set(a.therapeutic_area, areaPalette[i % areaPalette.length]));
    const otherColor = colors.textTertiary();

    type StripSeg = { area: string; color: string; share: number; count: number; isOther: boolean };

    // Build per-period composition (top areas + Other rolled up)
    const stripData = periodLabels.map((p) => {
      const total = periodTotalAll.get(p) ?? 0;
      const segs: StripSeg[] = topAreas.map((a) => {
        const v = periodLookup.get(`${p}::${a.therapeutic_area}`) ?? 0;
        return {
          area: a.therapeutic_area,
          color: colorByArea.get(a.therapeutic_area) ?? colors.accent(),
          share: total ? v / total : 0,
          count: v,
          isOther: false
        };
      });
      const topSum = segs.reduce((s, x) => s + x.count, 0);
      const otherCount = Math.max(0, total - topSum);
      if (otherCount > 0) {
        segs.push({
          area: 'Other',
          color: otherColor,
          share: total ? otherCount / total : 0,
          count: otherCount,
          isOther: true
        });
      }
      return { period: p, total, segs };
    });

    const stripX = scaleBand<string>()
      .domain(periodLabels)
      .range([heatLeft, heatRight])
      .padding(0.18);
    const stripY = scaleLinear().domain([0, 1]).range([stripTop + stripHeight, stripTop]);

    const strip = inner.append('g').attr('class', 'ta-strip');

    stripData.forEach((p) => {
      const colX = stripX(p.period) ?? 0;
      const colW = stripX.bandwidth();
      let cum = 0;
      const colGroup = strip
        .append('g')
        .attr('data-period', p.period)
        .style('cursor', 'pointer');

      p.segs.forEach((seg) => {
        const y0 = cum;
        const y1 = cum + seg.share;
        cum = y1;
        const segTop = stripY(y1);
        const segH = Math.max(0, stripY(y0) - stripY(y1));
        colGroup
          .append('rect')
          .attr('x', colX)
          .attr('y', segTop)
          .attr('width', colW)
          .attr('height', segH)
          .attr('fill', seg.color)
          .attr('opacity', seg.isOther ? 0.45 : 0.92);
      });

      // Period label
      colGroup
        .append('text')
        .attr('x', colX + colW / 2)
        .attr('y', stripY(0) + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', isCompact ? 8 : 9)
        .attr('fill', colors.textTertiary())
        .text(formatPeriod(p.period));

      // Hit area for hover
      colGroup
        .append('rect')
        .attr('x', colX)
        .attr('y', stripY(1) - 2)
        .attr('width', colW)
        .attr('height', stripHeight + 4)
        .attr('fill', 'transparent')
        .on('pointermove', (event) => {
          const sortedSegs = [...p.segs].sort((a, b) => b.share - a.share);
          const rows = sortedSegs
            .filter((s) => s.share > 0)
            .map(
              (s) =>
                `<div class="tip-row"><span><span class="tip-swatch" style="background:${s.color};opacity:${s.isOther ? 0.6 : 1}"></span>${isCompact ? compactAreaLabel(s.area) : s.area}</span><strong>${(s.share * 100).toFixed(0)}%</strong></div>`
            )
            .join('');
          const html = `
            <div class="tip-title">${formatPeriod(p.period)} — ${fmt(p.total)} approvals</div>
            ${rows}
          `;
          showTooltip(html, event.clientX, event.clientY);
        })
        .on('pointerleave', hideTooltip);
    });

    // Strip color legend (compact, inline). Lay out left-to-right with text-length lookup.
    const legendY = stripY(1) - 12;
    const legendItems = topAreas.slice(0, isCompact ? 4 : 6);
    const legendG = inner.append('g').attr('class', 'ta-legend');
    let cursor = heatLeft;
    legendItems.forEach((d) => {
      const label = isCompact ? compactAreaLabel(d.therapeutic_area) : d.therapeutic_area;
      const item = legendG.append('g').attr('transform', `translate(${cursor},${legendY})`);
      item
        .append('rect')
        .attr('width', 9)
        .attr('height', 9)
        .attr('y', -8)
        .attr('fill', colorByArea.get(d.therapeutic_area) ?? colors.accent());
      const text = item
        .append('text')
        .attr('x', 13)
        .attr('y', -1)
        .attr('font-size', 10)
        .attr('fill', colors.textSecondary())
        .text(label);
      const w = (text.node() as SVGTextElement | null)?.getComputedTextLength?.() ?? label.length * 6.2;
      cursor += 13 + w + 18;
      if (cursor > heatRight - 30) cursor = heatRight - 30;
    });

    // Intro animation: clip-rect grows the strip from left to right
    if (!reduced && !introPlayed) {
      const clipId = `ta-strip-clip-${Math.random().toString(36).slice(2, 8)}`;
      svg
        .append('defs')
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('x', heatLeft)
        .attr('y', stripY(1) - 4)
        .attr('width', 0)
        .attr('height', stripHeight + 8);
      strip.attr('clip-path', `url(#${clipId})`);
      const playIntro = () => {
        if (introPlayed) return;
        introPlayed = true;
        svg
          .select(`#${clipId} rect`)
          .transition()
          .duration(1100)
          .attr('width', heatRight - heatLeft);
      };
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            playIntro();
            io.disconnect();
            intersectionCleanup = null;
          }
        },
        { threshold: 0.2 }
      );
      io.observe(container);
      intersectionCleanup = () => io.disconnect();
    }

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        isCompact
          ? 'Heatmap normalized per row. Strip below = composition share per window.'
          : 'Heatmap cells normalized per row so each area’s shape is comparable. The strip below normalizes each window to 100% to show how the composition of approvals has shifted.'
      );

    svg.attr(
      'aria-label',
      'Therapeutic area heatmap and per-window composition strip showing FDA novel drug approvals across five-year periods.'
    );
  };

  draw();
  const cleanupResize = onResize(container, draw);
  return () => {
    cleanupResize();
    intersectionCleanup?.();
    hideTooltip();
  };
}
