import { loadJSON } from '../data/loadData';
import { renderExpeditedPathwaysChart } from '../charts/ExpeditedPathwaysChart';
import type { ExpeditedPathwayRow } from '../data/types';

export async function renderExpedited(target: HTMLElement): Promise<void> {
  target.innerHTML = `
    <section id="expedited" class="section" aria-labelledby="expedited-heading">
      <div class="section-label">Section 3</div>
      <h2 id="expedited-heading">The acceleration layer</h2>
      <p>
        Priority review, fast track, breakthrough therapy, accelerated approval,
        QIDP. These designations layer on top of an approval and tell us how the
        regulatory shape of drug development has changed. A single approval can
        carry several of them, so these counts overlap by design.
      </p>
      <div class="chart" data-chart="expedited" aria-busy="true"></div>
    </section>
  `;
  const chartEl = target.querySelector<HTMLElement>('[data-chart="expedited"]');
  if (!chartEl) return;

  const data = await loadJSON<ExpeditedPathwayRow[]>('expedited_pathways_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return;
  }

  renderExpeditedPathwaysChart(chartEl, data);
  chartEl.removeAttribute('aria-busy');
}
