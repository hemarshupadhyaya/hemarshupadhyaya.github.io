import { loadJSON } from '../data/loadData';
import { renderDosageFormChart } from '../charts/DosageFormChart';
import type { DosageFormRow } from '../data/types';

export async function renderDosageForms(target: HTMLElement): Promise<() => void> {
  target.innerHTML = `
    <section id="dosage-forms" class="section visual-section" aria-labelledby="dosage-forms-heading">
      <header class="section-header">
        <div>
          <div class="section-label">Section 5</div>
          <h2 id="dosage-forms-heading">How they are delivered</h2>
        </div>
        <p class="section-kicker">The product shape is also a delivery system, not only a molecule.</p>
      </header>
      <div class="chart-panel chart-panel-tall">
        <div class="chart" data-chart="dosage-forms" aria-busy="true"></div>
      </div>
      <p class="visual-caption">
        Innovation is delivered in tablets, injections, capsules, solutions, patches
        and inhalers. The streamgraph reads as a moving mix — see how the injection
        layer thickens in the biologics era while oral forms persist underneath.
      </p>
    </section>
  `;

  const chartEl = target.querySelector<HTMLElement>('[data-chart="dosage-forms"]');
  if (!chartEl) return () => {};

  const data = await loadJSON<DosageFormRow[]>('dosage_form_trends_by_year.json');
  if (!data?.length) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const cleanup = renderDosageFormChart(chartEl, data);
  chartEl.removeAttribute('aria-busy');
  return cleanup;
}
