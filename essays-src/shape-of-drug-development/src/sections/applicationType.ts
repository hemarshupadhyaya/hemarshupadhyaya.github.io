import { loadJSON } from '../data/loadData';
import { renderApplicationTypeChart } from '../charts/ApplicationTypeChart';
import type { ApplicationTypeRow } from '../data/types';

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
        <p class="section-kicker">Application type is one way the small molecule / biologic shift becomes visible.</p>
      </header>
      <div class="section-body">
        <div class="section-copy">
          <p>
            The mix of small-molecule NDAs and biologic BLAs has shifted decisively
            since the early 2000s. Stacked by application type, the chart shows that
            biologics are now a steady share of CDER's annual novel approvals — not
            a curiosity at the margins.
          </p>
        </div>
        <aside class="section-note" aria-label="Scope note">
          <span>Scope note</span>
          <p>CBER-only biologics are outside this CDER-centered view.</p>
        </aside>
      </div>
      <div class="chart-panel">
        <div class="chart" data-chart="application-type" aria-busy="true"></div>
      </div>
    </section>
  `;
  const chartEl = target.querySelector<HTMLElement>('[data-chart="application-type"]');
  if (!chartEl) return () => {};

  const data = await loadJSON<ApplicationTypeRow[]>('approvals_by_application_type_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const cleanup = renderApplicationTypeChart(chartEl, data, { provisionalYear });
  chartEl.removeAttribute('aria-busy');
  return cleanup;
}
