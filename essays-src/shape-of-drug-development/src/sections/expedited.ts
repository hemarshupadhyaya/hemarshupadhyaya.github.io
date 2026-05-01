import { loadJSON } from '../data/loadData';
import {
  renderExpeditedPathwaysChart,
  type ExpeditedPathwaysController,
  type ExpeditedScene
} from '../charts/ExpeditedPathwaysChart';
import type { ExpeditedPathwayRow } from '../data/types';
import { setupSteps } from '../scroll/setupScroll';

interface Step {
  scene: ExpeditedScene;
  body: string;
}

const steps: Step[] = [
  {
    scene: 'priority-review',
    body: `Priority review is the base layer of acceleration: a shorter review
      clock for applications that could offer significant improvements in
      treatment, diagnosis, or prevention.`
  },
  {
    scene: 'accelerated',
    body: `Accelerated approval adds a different idea: earlier approval based on
      a surrogate or intermediate endpoint that is reasonably likely to predict
      clinical benefit.`
  },
  {
    scene: 'fast-track',
    body: `Fast track marks serious conditions with unmet medical need. It is a
      process designation, often paired with more frequent FDA interaction and
      rolling review.`
  },
  {
    scene: 'breakthrough',
    body: `Breakthrough therapy designation arrived later and changed the visual
      shape of the 2010s. It concentrates attention where preliminary clinical
      evidence suggests a substantial improvement over available therapy.`
  },
  {
    scene: 'qidp',
    body: `QIDP is narrower: antibacterial and antifungal products for serious
      or life-threatening infections. It sits beside the broader expedited
      pathways rather than replacing them.`
  }
];

export async function renderExpedited(target: HTMLElement): Promise<() => void> {
  const stepsHtml = steps
    .map(
      (s, i) => `
        <div class="step" data-scene="${s.scene}" data-step-index="${i}">
          <p>${s.body}</p>
        </div>
      `
    )
    .join('');

  target.innerHTML = `
    <section id="expedited" class="section scrolly" aria-labelledby="expedited-heading">
      <header class="scrolly-header">
        <div class="section-label">Section 3</div>
        <h2 id="expedited-heading">The acceleration layer</h2>
        <p class="section-kicker">These designations describe regulatory handling, not a promise of clinical importance.</p>
      </header>
      <div class="scrolly-grid">
        <div class="scrolly-narrative">${stepsHtml}</div>
        <div class="scrolly-chart-wrap">
          <div class="chart" data-chart="expedited" aria-busy="true"></div>
        </div>
      </div>
    </section>
  `;
  const chartEl = target.querySelector<HTMLElement>('[data-chart="expedited"]');
  if (!chartEl) return () => {};

  const data = await loadJSON<ExpeditedPathwayRow[]>('expedited_pathways_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const controller: ExpeditedPathwaysController = renderExpeditedPathwaysChart(
    chartEl,
    data,
    'priority-review'
  );
  chartEl.removeAttribute('aria-busy');

  const cleanupSteps = setupSteps('#expedited .step', (sceneId) => {
    controller.setScene(sceneId as ExpeditedScene);
  });

  return () => {
    cleanupSteps();
    controller.destroy();
  };
}
