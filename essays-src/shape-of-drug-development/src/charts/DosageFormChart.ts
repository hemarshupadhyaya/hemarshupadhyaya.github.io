import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { max, rollup, sum } from 'd3-array';
import type { DosageFormRow } from '../data/types';
import { colors, createResponsiveSvg, onResize } from './base';

interface PeriodCell {
  period: string;
  form: string;
  value: number;
}

function periodForYear(year: number): string {
  const start = Math.floor(year / 5) * 5;
  const end = Math.min(start + 4, 2026);
  return `${start}-${end}`;
}

function formatPeriod(period: string): string {
  return period
    .split('-')
    .map((part) => part.slice(-2))
    .join('-');
}

function compactForm(form: string): string {
  return form
    .replace('Injectable', 'Injection')
    .replace('For Solution', 'Soln prep')
    .replace('Solution/Drops', 'Drops')
    .replace('Extended Release', 'ER');
}

export function renderDosageFormChart(
  container: HTMLElement,
  data: DosageFormRow[]
): () => void {
  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, {
        aspect: 0.96,
        minHeight: 400,
        maxHeight: 540,
        mobileViewportCap: false
      });
    const isCompact = innerWidth < 520;

    const totalsByForm = Array.from(
      rollup(
        data,
        (rows) => sum(rows, (d) => d.total_approvals),
        (d) => d.dosage_form
      ),
      ([dosage_form, total_approvals]) => ({ dosage_form, total_approvals })
    )
      .sort((a, b) => b.total_approvals - a.total_approvals)
      .slice(0, isCompact ? 5 : 8);

    const topForms = totalsByForm.map((d) => d.dosage_form);
    const periods = Array.from(new Set(data.map((d) => periodForYear(d.approval_year)))).sort();
    const periodValues = rollup(
      data.filter((d) => topForms.includes(d.dosage_form)),
      (rows) => sum(rows, (d) => d.total_approvals),
      (d) => periodForYear(d.approval_year),
      (d) => d.dosage_form
    );
    const cells: PeriodCell[] = periods.flatMap((period) =>
      topForms.map((form) => ({
        period,
        form,
        value: periodValues.get(period)?.get(form) ?? 0
      }))
    );

    const labelWidth = isCompact ? 92 : 160;
    const plotWidth = Math.max(170, innerWidth - labelWidth - 34);
    const barHeight = Math.min(innerHeight * 0.5, totalsByForm.length * 28 + 20);
    const heatmapTop = barHeight + 46;
    const heatmapHeight = Math.max(140, innerHeight - heatmapTop - 12);

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 16)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', colors.textSecondary())
      .text('Most common dosage forms');

    const x = scaleLinear()
      .domain([0, max(totalsByForm, (d) => d.total_approvals) ?? 0])
      .nice()
      .range([0, plotWidth]);
    const y = scaleBand<string>()
      .domain(topForms)
      .range([0, barHeight])
      .padding(0.22);

    const bars = inner.append('g').attr('class', 'dosage-bars');

    bars
      .selectAll('rect')
      .data(totalsByForm)
      .join('rect')
      .attr('x', labelWidth)
      .attr('y', (d) => y(d.dosage_form) ?? 0)
      .attr('width', (d) => x(d.total_approvals))
      .attr('height', y.bandwidth())
      .attr('fill', colors.accent())
      .attr('opacity', 0.82)
      .append('title')
      .text((d) => `${d.dosage_form}: ${d.total_approvals} approvals`);

    bars
      .selectAll('text.form-label')
      .data(totalsByForm)
      .join('text')
      .attr('class', 'form-label')
      .attr('x', 0)
      .attr('y', (d) => (y(d.dosage_form) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('font-size', isCompact ? 9 : 11)
      .attr('font-weight', 500)
      .attr('fill', colors.text())
      .text((d) => (isCompact ? compactForm(d.dosage_form) : d.dosage_form));

    bars
      .selectAll('text.value-label')
      .data(totalsByForm)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => Math.min(innerWidth - 4, labelWidth + x(d.total_approvals) + 6))
      .attr('y', (d) => (y(d.dosage_form) ?? 0) + y.bandwidth() / 2 + 4)
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
      .text('Five-year windows for leading forms');

    const maxCell = max(cells, (d) => d.value) ?? 1;
    const cellX = scaleBand<string>()
      .domain(periods)
      .range([labelWidth, innerWidth])
      .padding(0.08);
    const cellY = scaleBand<string>()
      .domain(topForms)
      .range([heatmapTop, heatmapTop + heatmapHeight])
      .padding(0.1);
    const heatmap = inner.append('g').attr('class', 'dosage-heatmap');

    heatmap
      .selectAll('rect')
      .data(cells)
      .join('rect')
      .attr('x', (d) => cellX(d.period) ?? 0)
      .attr('y', (d) => cellY(d.form) ?? heatmapTop)
      .attr('width', cellX.bandwidth())
      .attr('height', cellY.bandwidth())
      .attr('rx', 2)
      .attr('fill', colors.accent())
      .attr('opacity', (d) => 0.1 + (d.value / maxCell) * 0.8)
      .append('title')
      .text((d) => `${d.period}, ${d.form}: ${d.value} approvals`);

    heatmap
      .selectAll('text.period-label')
      .data(periods)
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
      .data(topForms)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', 0)
      .attr('y', (d) => (cellY(d) ?? heatmapTop) + cellY.bandwidth() / 2 + 4)
      .attr('font-size', isCompact ? 7 : 9)
      .attr('fill', colors.textSecondary())
      .text((d) => (isCompact ? compactForm(d) : d));

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        isCompact
          ? 'Forms are normalized from FDA dosage-form text.'
          : 'Dosage forms are normalized from FDA dosage-form text in the local data pipeline.'
      );

    svg.attr(
      'aria-label',
      'Dosage form chart showing leading FDA novel drug dosage forms overall and across five-year periods.'
    );
  };

  draw();
  return onResize(container, draw);
}
