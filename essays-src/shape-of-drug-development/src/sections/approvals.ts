import { loadJSON } from '../data/loadData';
import {
  renderApprovalTrendChart,
  type ApprovalScene,
  type ApprovalTrendController
} from '../charts/ApprovalTrendChart';
import type { ApprovalTrendRow } from '../data/types';
import { setupSteps } from '../scroll/setupScroll';

interface Step {
  scene: ApprovalScene;
  body: string;
}

const steps: Step[] = [
  {
    scene: 'overview',
    body: `Year over year, novel drug approvals do not climb in a smooth line.
      They surge and dip — shaped by review reforms, industry cycles, and
      what the science was ready for. Forty-two years of CDER novel approvals,
      laid out side by side.`
  },
  {
    scene: 'peak-1996',
    body: `The first surge came mid-1990s. <strong>1996 saw 59 approvals</strong>,
      tied for the all-time annual high. The 1992 PDUFA agreement had given
      FDA new resources to clear a long backlog, and FDAMA in 1997 followed.
      The shape of the chart for the rest of the decade is the aftershock.`
  },
  {
    scene: 'dip-2000s',
    body: `Then the line bent down. From 2005 through 2010, annual approvals
      hovered in the low 20s — bottoming at <strong>18 in 2007</strong>.
      Industry pipelines thinned, blockbuster patents lapsed, and the
      "innovation gap" became a recurring headline.`
  },
  {
    scene: 'rise-2014',
    body: `From 2014 onward the floor lifted. Most years cleared 40 approvals,
      and 2018 matched 1996's record. Breakthrough therapy designation
      (introduced 2012), maturing biologics pipelines, and oncology
      acceleration all sit underneath this rise.`
  },
  {
    scene: 'provisional-2026',
    body: `<strong>2026 is provisional.</strong> The bar shows approvals so far
      this calendar year — not a final count. The figure will keep moving
      until FDA publishes the final CY2026 annual report.`
  }
];

export async function renderApprovals(
  target: HTMLElement,
  provisionalYear?: number
): Promise<() => void> {
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
    <section id="approvals" class="section scrolly" aria-labelledby="approvals-heading">
      <header class="scrolly-header">
        <div class="section-label">Section 1</div>
        <h2 id="approvals-heading">Approval waves</h2>
        <p class="section-kicker">The annual count moves in waves, not in a clean upward line.</p>
      </header>
      <div class="scrolly-grid">
        <div class="scrolly-narrative">${stepsHtml}</div>
        <div class="scrolly-chart-wrap">
          <div class="chart" data-chart="approvals" aria-busy="true"></div>
        </div>
      </div>
    </section>
  `;

  const chartEl = target.querySelector<HTMLElement>('[data-chart="approvals"]');
  if (!chartEl) return () => {};

  const data = await loadJSON<ApprovalTrendRow[]>('approval_trends_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return () => {};
  }

  const controller: ApprovalTrendController = renderApprovalTrendChart(chartEl, data, {
    provisionalYear,
    initialScene: 'overview'
  });
  chartEl.removeAttribute('aria-busy');

  const cleanupSteps = setupSteps('#approvals .step', (sceneId) => {
    controller.setScene(sceneId as ApprovalScene);
  });

  return () => {
    cleanupSteps();
    controller.destroy();
  };
}
