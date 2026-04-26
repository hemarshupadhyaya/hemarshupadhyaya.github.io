import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import { stack } from 'd3-shape';
import type { ApplicationTypeRow } from '../data/types';
import { colors, createResponsiveSvg, onResize } from './base';

const seriesKeys = ['nda_count', 'bla_count', 'unknown_count'] as const;
type SeriesKey = (typeof seriesKeys)[number];

const seriesColor: Record<SeriesKey, () => string> = {
  nda_count: () => colors.accent(),
  bla_count: () => '#c08a2e',
  unknown_count: () => colors.textTertiary()
};

const seriesLabel: Record<SeriesKey, string> = {
  nda_count: 'NDA',
  bla_count: 'BLA',
  unknown_count: 'Unspecified'
};

export interface ApplicationTypeOptions {
  provisionalYear?: number;
}

export function renderApplicationTypeChart(
  container: HTMLElement,
  data: ApplicationTypeRow[],
  options: ApplicationTypeOptions = {}
): () => void {
  const provisionalYear = options.provisionalYear;

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, { aspect: 0.55, maxHeight: 340 });

    const x = scaleBand<number>()
      .domain(data.map((d) => d.approval_year))
      .range([0, innerWidth])
      .padding(0.18);

    const yMax = max(data, (d) => d.total_approvals) ?? 0;
    const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    const stacker = stack<ApplicationTypeRow, SeriesKey>()
      .keys([...seriesKeys])
      .value((d, key) => (d[key] as number) || 0);
    const series = stacker(data);

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

    inner
      .append('g')
      .selectAll('g')
      .data(series)
      .join('g')
      .attr('fill', (d) => seriesColor[d.key as SeriesKey]())
      .selectAll('rect')
      .data((d) => d.map((seg) => ({ seg, key: d.key as SeriesKey })))
      .join('rect')
      .attr('x', ({ seg }) => x(seg.data.approval_year) ?? 0)
      .attr('y', ({ seg }) => y(seg[1]))
      .attr('height', ({ seg }) => Math.max(0, y(seg[0]) - y(seg[1])))
      .attr('width', x.bandwidth())
      .attr('opacity', ({ seg }) =>
        provisionalYear && seg.data.approval_year === provisionalYear ? 0.65 : 1
      )
      .append('title')
      .text(({ seg, key }) => {
        const v = (seg.data[key] as number) || 0;
        const flag =
          provisionalYear && seg.data.approval_year === provisionalYear
            ? ' (provisional)'
            : '';
        return `${seg.data.approval_year} ${seriesLabel[key]}${flag}: ${v}`;
      });

    const tickEvery = innerWidth < 480 ? 10 : 5;
    inner
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        axisBottom<number>(x)
          .tickValues(
            data.map((d) => d.approval_year).filter((yr) => yr % tickEvery === 0)
          )
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

    const legend = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top - 4})`);
    seriesKeys.forEach((key, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 110},0)`);
      g.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('y', -10)
        .attr('fill', seriesColor[key]());
      g.append('text')
        .attr('x', 14)
        .attr('y', -1)
        .attr('font-size', 11)
        .attr('fill', colors.textSecondary())
        .text(seriesLabel[key]);
    });

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 4)
      .attr('font-size', 10)
      .attr('fill', colors.textTertiary())
      .text(
        'Stacked by application type. CDER scope only — most CBER-only biologics are not counted here.'
      );

    svg.attr(
      'aria-label',
      `Stacked bar chart of CDER novel drug approvals by application type from ${data[0].approval_year} to ${data[data.length - 1].approval_year}, split into NDA, BLA, and unspecified.`
    );
  };

  draw();
  return onResize(container, draw);
}
