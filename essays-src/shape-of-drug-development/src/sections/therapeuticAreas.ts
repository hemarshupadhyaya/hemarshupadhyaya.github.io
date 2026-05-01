import { loadJSON } from '../data/loadData';
import { renderTherapeuticAreaChart } from '../charts/TherapeuticAreaChart';
import type { TherapeuticAreaCountRow, TherapeuticAreaPeriodRow } from '../data/types';

export async function renderTherapeuticAreas(target: HTMLElement): Promise<() => void> {
  target.innerHTML = `
    <section id="therapeutic-areas" class="section visual-section" aria-labelledby="therapeutic-areas-heading">
      <header class="section-header">
        <div>
          <div class="section-label">Section 4</div>
          <h2 id="therapeutic-areas-heading">Where approvals cluster</h2>
        </div>
        <p class="section-kicker">A long record becomes less even once approvals are grouped by disease area.</p>
      </header>
      <div class="section-body">
        <div class="section-copy">
          <p>
            Approvals cluster around the diseases the science can reach. Oncology,
            infectious disease, hematology, cardiovascular and specialty products
            dominate the full record, but the mix changes meaningfully across
            five-year windows.
          </p>
        </div>
        <aside class="section-note" aria-label="Classification note">
          <span>Classification note</span>
          <p>Therapeutic areas are enriched classifications from the local pipeline, so they are descriptive rather than official FDA categories.</p>
        </aside>
      </div>
      <div class="chart-panel chart-panel-tall">
        <div class="chart" data-chart="therapeutic-areas" aria-busy="true"></div>
      </div>
    </section>
  `;

  const chartEl = target.querySelector<HTMLElement>('[data-chart="therapeutic-areas"]');
  if (!chartEl) return () => {};

  const [counts, periods] = await Promise.all([
    loadJSON<TherapeuticAreaCountRow[]>('therapeutic_area_counts.json'),
    loadJSON<TherapeuticAreaPeriodRow[]>('therapeutic_area_heatmap_by_5yr_period.json')
  ]);

  if (!counts?.length || !periods?.length) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const cleanup = renderTherapeuticAreaChart(chartEl, counts, periods);
  chartEl.removeAttribute('aria-busy');
  return cleanup;
}
