import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import { select } from 'd3-selection';
import type { ApprovalTrendRow } from '../data/types';
import { colors, createResponsiveSvg, onResize } from './base';

export interface ApprovalTrendOptions {
  provisionalYear?: number;
}

export function renderApprovalTrendChart(
  container: HTMLElement,
  data: ApprovalTrendRow[],
  options: ApprovalTrendOptions = {}
): () => void {
  const provisionalYear = options.provisionalYear;

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, { aspect: 0.5, maxHeight: 320 });

    const x = scaleBand<number>()
      .domain(data.map((d) => d.approval_year))
      .range([0, innerWidth])
      .padding(0.18);

    const yMax = max(data, (d) => d.total_approvals) ?? 0;
    const y = scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

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

    inner
      .append('g')
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (d) => x(d.approval_year) ?? 0)
      .attr('y', (d) => y(d.total_approvals))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - y(d.total_approvals))
      .attr('fill', (d) =>
        provisionalYear && d.approval_year === provisionalYear
          ? colors.textTertiary()
          : colors.accent()
      )
      .attr('opacity', (d) =>
        provisionalYear && d.approval_year === provisionalYear ? 0.55 : 1
      )
      .append('title')
      .text((d) =>
        provisionalYear && d.approval_year === provisionalYear
          ? `${d.approval_year} (provisional, YTD): ${d.total_approvals}`
          : `${d.approval_year}: ${d.total_approvals} approvals`
      );

    const tickEvery = innerWidth < 480 ? 10 : 5;
    const xAxis = axisBottom<number>(x)
      .tickValues(data.map((d) => d.approval_year).filter((y) => y % tickEvery === 0))
      .tickSizeOuter(0);

    inner
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
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

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        provisionalYear
          ? `Bars are CDER novel-drug approvals per calendar year. ${provisionalYear} is provisional (YTD).`
          : 'Bars are CDER novel-drug approvals per calendar year.'
      );

    select(svg.node()!).attr(
      'aria-label',
      `Bar chart of FDA CDER novel drug approvals by year, from ${data[0].approval_year} to ${data[data.length - 1].approval_year}, ranging from ${
        Math.min(...data.map((d) => d.total_approvals))
      } to ${Math.max(...data.map((d) => d.total_approvals))} approvals per year.`
    );
  };

  draw();
  return onResize(container, draw);
}
