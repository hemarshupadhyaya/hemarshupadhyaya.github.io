import { loadJSON } from '../data/loadData';
import {
  renderApplicationTypeChart,
  computeBlaShareKpis
} from '../charts/ApplicationTypeChart';
import type { ApplicationTypeRow } from '../data/types';

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export async function renderApplicationType(
  target: HTMLElement,
  provisionalYear?: number
): Promise<() => void> {
  target.innerHTML = `
    <section id="application-type" class="section visual-section" aria-labelledby="application-type-heading">
      <header class="section-header">
        <div>
          <div class="section-label">Section 2</div>
          <h2 id="application-type-heading">NDAs and BLAs</h2>
        </div>
        <p class="section-kicker">Application type is one way the small-molecule / biologic shift becomes visible.</p>
      </header>
      <div class="kpi-row" data-kpi-row aria-hidden="true"></div>
      <div class="chart-panel chart-panel-tall">
        <div class="chart" data-chart="application-type" aria-busy="true"></div>
      </div>
      <p class="visual-caption">
        Biologics rose from a sliver of CDER novel approvals in the late 1980s to a
        steady share of the annual count. The shape of the line tells the story —
        biologics are now structural to the pipeline, not a curiosity at the margins.
      </p>
    </section>
  `;
  const chartEl = target.querySelector<HTMLElement>('[data-chart="application-type"]');
  const kpiEl = target.querySelector<HTMLElement>('[data-kpi-row]');
  if (!chartEl) return () => {};

  const data = await loadJSON<ApplicationTypeRow[]>('approvals_by_application_type_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const kpis = computeBlaShareKpis(data);
  if (kpiEl && kpis) {
    const arrow = kpis.delta >= 0 ? '▲' : '▼';
    const deltaPct = `${(Math.abs(kpis.delta) * 100).toFixed(1)} pts`;
    kpiEl.innerHTML = `
      <div class="kpi">
        <span class="kpi-label">BLA share, ${kpis.earlyLabel}</span>
        <strong class="kpi-value">${pct(kpis.earlyShare)}</strong>
      </div>
      <div class="kpi kpi-arrow" aria-hidden="true">→</div>
      <div class="kpi kpi-emph">
        <span class="kpi-label">BLA share, ${kpis.lateLabel}</span>
        <strong class="kpi-value">${pct(kpis.lateShare)}</strong>
        <span class="kpi-delta">${arrow} ${deltaPct}</span>
      </div>
    `;
  }

  const cleanup = renderApplicationTypeChart(chartEl, data, { provisionalYear });
  chartEl.removeAttribute('aria-busy');
  return cleanup;
}
