import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent, bisector } from 'd3-array';
import { area, stack, stackOrderNone, curveMonotoneX } from 'd3-shape';
import { pointer } from 'd3-selection';
import 'd3-transition';
import type { ApplicationTypeRow } from '../data/types';
import { colors, createResponsiveSvg, onResize, prefersReducedMotion } from './base';
import { showTooltip, hideTooltip, fmt } from '../utils/tooltip';

const seriesKeys = ['nda_count', 'bla_count', 'unknown_count'] as const;
type SeriesKey = (typeof seriesKeys)[number];

const seriesColor: Record<SeriesKey, () => string> = {
  nda_count: () => colors.accent(),
  bla_count: () => '#c08a2e',
  unknown_count: () => colors.textTertiary()
};

const seriesLabel: Record<SeriesKey, string> = {
  nda_count: 'NDA (small molecule)',
  bla_count: 'BLA (biologic)',
  unknown_count: 'Unspecified'
};

export interface ApplicationTypeOptions {
  provisionalYear?: number;
}

interface ShareRow {
  approval_year: number;
  nda: number;
  bla: number;
  unknown: number;
}

export function renderApplicationTypeChart(
  container: HTMLElement,
  data: ApplicationTypeRow[],
  options: ApplicationTypeOptions = {}
): () => void {
  const provisionalYear = options.provisionalYear;
  const reduced = prefersReducedMotion();
  let introPlayed = false;
  let intersectionCleanup: (() => void) | null = null;

  const shares: ShareRow[] = data.map((d) => {
    const total = (d.nda_count || 0) + (d.bla_count || 0) + (d.unknown_count || 0);
    const denom = total || 1;
    return {
      approval_year: d.approval_year,
      nda: (d.nda_count || 0) / denom,
      bla: (d.bla_count || 0) / denom,
      unknown: (d.unknown_count || 0) / denom
    };
  });

  const draw = () => {
    const { svg, inner, innerWidth, innerHeight, margin, height } =
      createResponsiveSvg(container, {
        aspect: 0.58,
        minHeight: 320,
        maxHeight: 420
      });

    const xDomain = extent(data, (d) => d.approval_year) as [number, number];
    const x = scaleLinear().domain(xDomain).range([0, innerWidth]);
    const y = scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Reference grid at 25/50/75/100
    inner
      .append('g')
      .selectAll('line')
      .data([0.25, 0.5, 0.75, 1])
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', colors.border())
      .attr('stroke-dasharray', '2,3');

    const stacker = stack<ShareRow, SeriesKey>()
      .keys([...seriesKeys])
      .order(stackOrderNone)
      .value((d, key) => {
        if (key === 'nda_count') return d.nda;
        if (key === 'bla_count') return d.bla;
        return d.unknown;
      });

    const series = stacker(shares);

    const areaGen = area<{ data: ShareRow; 0: number; 1: number }>()
      .x((d) => x(d.data.approval_year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(curveMonotoneX);

    // Clip-rect grows from the bottom up so the area "rises" on first view.
    const clipId = `apptype-clip-${Math.random().toString(36).slice(2, 8)}`;
    const clipRect = svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', reduced || introPlayed ? 0 : innerHeight)
      .attr('width', innerWidth)
      .attr('height', reduced || introPlayed ? innerHeight : 0);

    const layerGroup = inner
      .append('g')
      .attr('class', 'shares')
      .attr('clip-path', `url(#${clipId})`);

    layerGroup
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('fill', (d) => seriesColor[d.key as SeriesKey]())
      .attr('opacity', (d) => (d.key === 'unknown_count' ? 0.5 : 0.9))
      .attr('d', (d) => areaGen(d as unknown as { data: ShareRow; 0: number; 1: number }[]) ?? '');

    const playIntro = () => {
      if (introPlayed || reduced) return;
      introPlayed = true;
      clipRect
        .transition()
        .duration(900)
        .attr('y', 0)
        .attr('height', innerHeight);
    };

    if (!reduced && !introPlayed) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            playIntro();
            io.disconnect();
            intersectionCleanup = null;
          }
        },
        { threshold: 0.25 }
      );
      io.observe(container);
      intersectionCleanup = () => io.disconnect();
    }

    // Provisional year overlay
    if (provisionalYear) {
      inner
        .append('line')
        .attr('x1', x(provisionalYear))
        .attr('x2', x(provisionalYear))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', colors.text())
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.45);
      inner
        .append('text')
        .attr('x', x(provisionalYear) - 4)
        .attr('y', 12)
        .attr('text-anchor', 'end')
        .attr('font-size', 10)
        .attr('fill', colors.textTertiary())
        .text(`${provisionalYear} provisional`);
    }

    // Hover guide + tooltip overlay
    const guide = inner
      .append('line')
      .attr('class', 'hover-guide')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', colors.text())
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');
    const guideDot = inner
      .append('circle')
      .attr('r', 3.5)
      .attr('fill', colors.accent())
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    const yearBisect = bisector<ShareRow, number>((d) => d.approval_year).center;
    const dataByYear = new Map(data.map((d) => [d.approval_year, d]));

    inner
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('pointermove', function (event) {
        const [mx] = pointer(event, this);
        const yr = Math.round(x.invert(mx));
        const idx = yearBisect(shares, yr);
        const s = shares[idx];
        if (!s) return;
        const cx = x(s.approval_year);
        guide.attr('x1', cx).attr('x2', cx).attr('opacity', 0.45);
        guideDot.attr('cx', cx).attr('cy', y(s.nda + s.bla / 2)).attr('opacity', 1);
        const abs = dataByYear.get(s.approval_year);
        const isProv = provisionalYear && s.approval_year === provisionalYear;
        const html = `
          <div class="tip-title">${s.approval_year}${isProv ? ' (provisional)' : ''}</div>
          <div class="tip-row"><span><span class="tip-swatch" style="background:${seriesColor.bla_count()}"></span>BLA</span><strong>${(s.bla * 100).toFixed(0)}%${abs ? ` · ${fmt(abs.bla_count)}` : ''}</strong></div>
          <div class="tip-row"><span><span class="tip-swatch" style="background:${seriesColor.nda_count()}"></span>NDA</span><strong>${(s.nda * 100).toFixed(0)}%${abs ? ` · ${fmt(abs.nda_count)}` : ''}</strong></div>
          ${s.unknown > 0 ? `<div class="tip-row"><span><span class="tip-swatch" style="background:${seriesColor.unknown_count()}"></span>Unspec.</span><strong>${(s.unknown * 100).toFixed(0)}%${abs ? ` · ${fmt(abs.unknown_count)}` : ''}</strong></div>` : ''}
          ${abs ? `<div class="tip-meta">${fmt(abs.total_approvals)} total approvals</div>` : ''}
        `;
        showTooltip(html, event.clientX, event.clientY);
      })
      .on('pointerleave', () => {
        guide.attr('opacity', 0);
        guideDot.attr('opacity', 0);
        hideTooltip();
      });

    inner
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).ticks(6).tickFormat((d) => `${d}`).tickSizeOuter(0))
      .call((g) => g.selectAll('path,line').attr('stroke', colors.border()))
      .call((g) =>
        g.selectAll('text').attr('fill', colors.textSecondary()).attr('font-size', 11)
      );

    inner
      .append('g')
      .call(
        axisLeft(y)
          .tickValues([0, 0.25, 0.5, 0.75, 1])
          .tickFormat((d) => `${Math.round((d as number) * 100)}%`)
          .tickSizeOuter(0)
      )
      .call((g) => g.selectAll('path,line').attr('stroke', colors.border()))
      .call((g) =>
        g.selectAll('text').attr('fill', colors.textSecondary()).attr('font-size', 11)
      );

    // Inline labels for NDA/BLA at the right edge
    const lastIdx = shares.length - 1;
    const lastShare = shares[lastIdx];
    const labelData: { key: SeriesKey; v: number; label: string }[] = [
      { key: 'nda_count', v: lastShare.nda / 2, label: `NDA ${(lastShare.nda * 100).toFixed(0)}%` },
      {
        key: 'bla_count',
        v: lastShare.nda + lastShare.bla / 2,
        label: `BLA ${(lastShare.bla * 100).toFixed(0)}%`
      }
    ];
    inner
      .append('g')
      .selectAll('text')
      .data(labelData)
      .join('text')
      .attr('x', innerWidth - 6)
      .attr('y', (d) => y(d.v) + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', '#fff')
      .attr('paint-order', 'stroke')
      .attr('stroke', (d) => seriesColor[d.key]())
      .attr('stroke-width', 4)
      .text((d) => d.label);

    const legend = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top - 4})`);
    seriesKeys.forEach((key, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 150},0)`);
      g.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('y', -10)
        .attr('fill', seriesColor[key]())
        .attr('opacity', key === 'unknown_count' ? 0.5 : 0.9);
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
        'Share of CDER novel approvals by application type. CBER-only biologics are not counted here.'
      );

    svg.attr(
      'aria-label',
      `Stacked area chart showing percentage share of CDER novel drug approvals by application type from ${data[0].approval_year} to ${data[data.length - 1].approval_year}.`
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

export function computeBlaShareKpis(data: ApplicationTypeRow[]): {
  earlyLabel: string;
  earlyShare: number;
  lateLabel: string;
  lateShare: number;
  delta: number;
} | null {
  if (!data?.length) return null;
  const sorted = data.slice().sort((a, b) => a.approval_year - b.approval_year);
  const earlySlice = sorted.slice(0, 5);
  const lateSlice = sorted.slice(-5);
  const share = (rows: ApplicationTypeRow[]) => {
    const num = rows.reduce((s, r) => s + (r.bla_count || 0), 0);
    const den = rows.reduce(
      (s, r) => s + (r.nda_count || 0) + (r.bla_count || 0) + (r.unknown_count || 0),
      0
    );
    return den ? num / den : 0;
  };
  const earlyShare = share(earlySlice);
  const lateShare = share(lateSlice);
  return {
    earlyLabel: `${earlySlice[0].approval_year}–${earlySlice[earlySlice.length - 1].approval_year}`,
    earlyShare,
    lateLabel: `${lateSlice[0].approval_year}–${lateSlice[lateSlice.length - 1].approval_year}`,
    lateShare,
    delta: lateShare - earlyShare
  };
}
