import { loadJSON } from '../data/loadData';
import { renderApplicationTypeChart } from '../charts/ApplicationTypeChart';
import type { ApplicationTypeRow } from '../data/types';

export async function renderApplicationType(
  target: HTMLElement,
  provisionalYear?: number
): Promise<void> {
  target.innerHTML = `
    <section id="application-type" class="section" aria-labelledby="application-type-heading">
      <div class="section-label">Section 2</div>
      <h2 id="application-type-heading">NDAs and BLAs</h2>
      <p>
        The mix of small-molecule NDAs and biologic BLAs has shifted decisively
        since the early 2000s. Stacked by application type, the chart shows that
        biologics are now a steady share of CDER's annual novel approvals — not
        a curiosity at the margins. CBER-only biologics are not in this view.
      </p>
      <div class="chart" data-chart="application-type" aria-busy="true"></div>
    </section>
  `;
  const chartEl = target.querySelector<HTMLElement>('[data-chart="application-type"]');
  if (!chartEl) return;

  const data = await loadJSON<ApplicationTypeRow[]>('approvals_by_application_type_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return;
  }

  renderApplicationTypeChart(chartEl, data, { provisionalYear });
  chartEl.removeAttribute('aria-busy');
}
