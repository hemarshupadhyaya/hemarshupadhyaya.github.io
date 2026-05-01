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
        <p class="section-kicker">Grouped by disease area, the long record stops looking even.</p>
      </header>
      <div class="chart-panel chart-panel-tall">
        <div class="chart" data-chart="therapeutic-areas" aria-busy="true"></div>
      </div>
      <p class="visual-caption">
        Oncology, infectious disease, hematology and specialty products dominate
        the full record — but the trajectory in each five-year window tells a
        sharper story than the totals alone. Therapeutic areas are enriched
        classifications from the local pipeline, not official FDA categories.
      </p>
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
