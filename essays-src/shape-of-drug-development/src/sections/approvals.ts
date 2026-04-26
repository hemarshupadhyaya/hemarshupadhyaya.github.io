import { loadJSON } from '../data/loadData';
import { renderApprovalTrendChart } from '../charts/ApprovalTrendChart';
import type { ApprovalTrendRow } from '../data/types';

export async function renderApprovals(target: HTMLElement, provisionalYear?: number): Promise<void> {
  target.innerHTML = `
    <section id="approvals" class="section" aria-labelledby="approvals-heading">
      <div class="section-label">Section 1</div>
      <h2 id="approvals-heading">Approval waves</h2>
      <p>
        Year over year, novel drug approvals do not climb in a smooth line.
        They surge and dip — shaped by review reforms, industry cycles, and
        what the science was ready for. The bars below show every CDER novel
        approval since 1985, with the current year flagged as provisional.
      </p>
      <div class="chart" data-chart="approvals" aria-busy="true"></div>
    </section>
  `;
  const chartEl = target.querySelector<HTMLElement>('[data-chart="approvals"]');
  if (!chartEl) return;

  const data = await loadJSON<ApprovalTrendRow[]>('approval_trends_by_year.json');
  if (!data || data.length === 0) {
    chartEl.innerHTML = '<div class="chart-placeholder">Data not available.</div>';
    chartEl.removeAttribute('aria-busy');
    return;
  }

  renderApprovalTrendChart(chartEl, data, { provisionalYear });
  chartEl.removeAttribute('aria-busy');
}
