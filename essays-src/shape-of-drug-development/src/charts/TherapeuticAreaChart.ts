import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { max } from 'd3-array';
import type { TherapeuticAreaCountRow, TherapeuticAreaPeriodRow } from '../data/types';
import { colors, createResponsiveSvg, onResize } from './base';

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

export function renderTherapeuticAreaChart(
  container: HTMLElement,
  counts: TherapeuticAreaCountRow[],
  periods: TherapeuticAreaPeriodRow[]
): () => void {
  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, {
        aspect: 1.02,
        minHeight: 420,
        maxHeight: 560,
        mobileViewportCap: false
      });
    const isCompact = innerWidth < 520;

    const topAreas = counts
      .slice()
      .sort((a, b) => b.total_approvals - a.total_approvals)
      .slice(0, isCompact ? 5 : 9);
    const periodLabels = Array.from(new Set(periods.map((d) => d.period)));
    const maxPeriodValue = max(periods, (d) => d.total_approvals) ?? 1;
    const labelWidth = isCompact ? 112 : 190;
    const plotWidth = Math.max(160, innerWidth - labelWidth - 34);

    const barHeight = Math.min(innerHeight * 0.48, topAreas.length * 26 + 24);
    const heatmapTop = barHeight + 44;
    const heatmapHeight = Math.max(120, innerHeight - heatmapTop - 10);

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 16)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text('Overall approvals by therapeutic area');

    const y = scaleBand<string>()
      .domain(topAreas.map((d) => d.therapeutic_area))
      .range([0, barHeight])
      .padding(0.22);
    const x = scaleLinear()
      .domain([0, max(topAreas, (d) => d.total_approvals) ?? 0])
      .nice()
      .range([0, plotWidth]);

    const bars = inner.append('g').attr('class', 'therapeutic-bars');

    bars
      .selectAll('rect')
      .data(topAreas)
      .join('rect')
      .attr('x', labelWidth)
      .attr('y', (d) => y(d.therapeutic_area) ?? 0)
      .attr('width', (d) => x(d.total_approvals))
      .attr('height', y.bandwidth())
      .attr('fill', colors.accent())
      .attr('opacity', 0.82)
      .append('title')
      .text((d) => `${d.therapeutic_area}: ${d.total_approvals} approvals`);

    bars
      .selectAll('text.area-label')
      .data(topAreas)
      .join('text')
      .attr('class', 'area-label')
      .attr('x', 0)
      .attr('y', (d) => (y(d.therapeutic_area) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('font-size', isCompact ? 9 : 11)
      .attr('font-weight', 500)
      .attr('fill', colors.text())
      .text((d) => (isCompact ? compactAreaLabel(d.therapeutic_area) : d.therapeutic_area));

    bars
      .selectAll('text.value-label')
      .data(topAreas)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => Math.min(innerWidth - 4, labelWidth + x(d.total_approvals) + 6))
      .attr('y', (d) => (y(d.therapeutic_area) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('font-size', 10)
      .attr('fill', colors.textSecondary())
      .text((d) => d.total_approvals);

    bars
      .append('g')
      .attr('transform', `translate(${labelWidth},${barHeight})`)
      .call(axisBottom(x).ticks(isCompact ? 3 : 5).tickSizeOuter(0))
      .call((g) => g.selectAll('path,line').attr('stroke', colors.border()))
      .call((g) =>
        g.selectAll('text').attr('fill', colors.textSecondary()).attr('font-size', 10)
      );

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', margin.top + heatmapTop - 18)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text('Five-year windows for the same leading areas');

    const heatRows = topAreas.map((d) => d.therapeutic_area);
    const cellX = scaleBand<string>()
      .domain(periodLabels)
      .range([labelWidth, innerWidth])
      .padding(0.08);
    const cellY = scaleBand<string>().domain(heatRows).range([heatmapTop, heatmapTop + heatmapHeight]).padding(0.1);
    const periodLookup = new Map(
      periods.map((d) => [`${d.period}::${d.therapeutic_area}`, d.total_approvals])
    );

    const heatmap = inner.append('g').attr('class', 'therapeutic-heatmap');
    const cells = periodLabels.flatMap((period) =>
      heatRows.map((area) => ({
        period,
        area,
        value: periodLookup.get(`${period}::${area}`) ?? 0
      }))
    );

    heatmap
      .selectAll('rect')
      .data(cells)
      .join('rect')
      .attr('x', (d) => cellX(d.period) ?? 0)
      .attr('y', (d) => cellY(d.area) ?? heatmapTop)
      .attr('width', cellX.bandwidth())
      .attr('height', cellY.bandwidth())
      .attr('rx', 2)
      .attr('fill', colors.accent())
      .attr('opacity', (d) => 0.12 + (d.value / maxPeriodValue) * 0.78)
      .append('title')
      .text((d) => `${d.period}, ${d.area}: ${d.value} approvals`);

    heatmap
      .selectAll('text.period-label')
      .data(periodLabels)
      .join('text')
      .attr('class', 'period-label')
      .attr('x', (d) => (cellX(d) ?? 0) + cellX.bandwidth() / 2)
      .attr('y', heatmapTop - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', isCompact ? 7 : 9)
      .attr('fill', colors.textSecondary())
      .text((d, i) => (isCompact && i % 2 === 1 ? '' : formatPeriod(d)));

    heatmap
      .selectAll('text.row-label')
      .data(heatRows)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', 0)
      .attr('y', (d) => (cellY(d) ?? heatmapTop) + cellY.bandwidth() / 2 + 4)
      .attr('font-size', isCompact ? 7 : 9)
      .attr('fill', colors.textSecondary())
      .text((d) => (isCompact ? compactAreaLabel(d) : d));

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        isCompact
          ? 'Classifications from the local data pipeline.'
          : 'Therapeutic areas are enriched classifications from the local data pipeline.'
      );

    svg.attr(
      'aria-label',
      'Therapeutic area chart showing leading FDA novel drug approval clusters overall and across five-year periods.'
    );
  };

  draw();
  return onResize(container, draw);
}
