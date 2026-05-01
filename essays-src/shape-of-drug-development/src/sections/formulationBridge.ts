import { loadJSON } from '../data/loadData';
import { renderTaFormFingerprintChart } from '../charts/TaFormFingerprintChart';
import type { TaFormMatrix } from '../data/types';

// Bridge between the therapeutic-area section and the dosage-form section.
// TODO(B2): later, replace the static heatmap here with a scroll-driven crossfade
// from the TA heatmap → this fingerprint → the streamgraph.
export async function renderFormulationBridge(target: HTMLElement): Promise<() => void> {
  target.innerHTML = `
    <section id="ta-form-bridge" class="section visual-section bridge-section" aria-labelledby="ta-form-bridge-heading">
      <header class="section-header">
        <div>
          <div class="section-label">Bridge</div>
          <h2 id="ta-form-bridge-heading">Each disease area has a delivery fingerprint</h2>
        </div>
        <p class="section-kicker">Why does the dosage-form mix shift? Because the diseases that are growing aren’t delivered the same way.</p>
      </header>
      <div class="chart-panel chart-panel-tall">
        <div class="chart" data-chart="ta-form-fingerprint" aria-busy="true"></div>
      </div>
      <p class="visual-caption">
        Hematology and oncology lean heavily on injectables; cardiovascular and
        neurology lean on tablets. As oncology and hematology grow, the
        injection layer in the streamgraph below grows with them — the disease
        mix and the delivery mix are the same story told twice.
      </p>
    </section>
  `;

  const chartEl = target.querySelector<HTMLElement>('[data-chart="ta-form-fingerprint"]');
  if (!chartEl) return () => {};

  const matrix = await loadJSON<TaFormMatrix>('therapeutic_area_dosage_form_matrix.json');
  if (!matrix?.matrix?.length) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const cleanup = renderTaFormFingerprintChart(chartEl, matrix);
  chartEl.removeAttribute('aria-busy');
  return cleanup;
}
