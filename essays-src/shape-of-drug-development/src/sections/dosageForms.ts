import { loadJSON } from '../data/loadData';
import { renderDosageFormChart } from '../charts/DosageFormChart';
import type { DosageFormRow } from '../data/types';

export async function renderDosageForms(target: HTMLElement): Promise<() => void> {
  target.innerHTML = `
    <section id="dosage-forms" class="section" aria-labelledby="dosage-forms-heading">
      <div class="section-label">Section 5</div>
      <h2 id="dosage-forms-heading">How they are delivered</h2>
      <p>
        Drug development is not just about molecules. It is also about how
        patients receive them: injection, tablet, capsule, solution, patch,
        inhaler. The dosage-form mix shows the practical shape that innovation
        takes once it reaches patients.
      </p>
      <div class="chart" data-chart="dosage-forms" aria-busy="true"></div>
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
