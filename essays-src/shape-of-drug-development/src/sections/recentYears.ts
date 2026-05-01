import { loadJSON } from '../data/loadData';
import type { ApprovalRecord } from '../data/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function display(value: string | null | undefined, fallback = 'Not specified'): string {
  const trimmed = value?.trim();
  return escapeHtml(trimmed && trimmed.length > 0 ? trimmed : fallback);
}

function formatDate(value: string | null): string {
  if (!value) return 'Date pending';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return display(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function sentenceCase(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return 'Not specified';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function renderRecentYears(): Promise<string> {
  const records = await loadJSON<ApprovalRecord[]>('fda_nme_approvals_clean.json');
  if (!records?.length) {
    return `
      <section id="recent-years" class="section visual-section" aria-labelledby="recent-years-heading">
        <header class="section-header">
          <div>
            <div class="section-label">Section 6</div>
            <h2 id="recent-years-heading">The latest cohort</h2>
          </div>
        </header>
        <div class="chart-placeholder">Recent approval data not available.</div>
      </section>
    `;
  }

  const years = Array.from(new Set(records.map((d) => d.approval_year))).sort((a, b) => b - a);
  const latestYear = years[0];
  const priorYear = years.find((year) => year < latestYear) ?? latestYear;
  const latest = records.filter((d) => d.approval_year === latestYear);
  const prior = records.filter((d) => d.approval_year === priorYear);
  const latestIsProvisional = latest.some((d) => d.is_provisional);
  const sourceAsOf = latest.map((d) => d.source_as_of_date).find(Boolean) ?? null;
  const recentRows = latest
    .slice()
    .sort((a, b) => (b.approval_date ?? '').localeCompare(a.approval_date ?? ''))
    .slice(0, 8);

  const rowHtml = recentRows
    .map(
      (row) => `
        <article class="latest-row">
          <div>
            <time datetime="${display(row.approval_date, '')}">${formatDate(row.approval_date)}</time>
            <h3>${display(row.proprietary_name || row.active_ingredient, 'Unnamed approval')}</h3>
            <p>${display(row.active_ingredient, 'Ingredient not specified')}</p>
          </div>
          <div class="latest-meta">
            <span>${display(row.application_type, 'Type pending')}</span>
            <span>${display(row.dosage_form)}</span>
            <span>${display(row.therapeutic_area)}</span>
          </div>
        </article>
      `
    )
    .join('');

  return `
    <section id="recent-years" class="section visual-section recent-years" aria-labelledby="recent-years-heading">
      <header class="section-header">
        <div>
          <div class="section-label">Section 6</div>
          <h2 id="recent-years-heading">The latest cohort</h2>
        </div>
        <p class="section-kicker">Recent years need a different reading: one completed annual extract, one year still moving.</p>
      </header>
      <div class="recent-grid" aria-label="Recent year summary">
        <div class="recent-stat">
          <span>${priorYear}</span>
          <strong>${prior.length}</strong>
          <p>final enriched annual records in this snapshot</p>
        </div>
        <div class="recent-stat is-provisional">
          <span>${latestYear}${latestIsProvisional ? ' YTD' : ''}</span>
          <strong>${latest.length}</strong>
          <p>${latestIsProvisional ? 'provisional approvals as of ' + display(sourceAsOf, 'the source snapshot') : 'approval records in the latest year'}</p>
        </div>
        <aside class="section-note recent-note" aria-label="Latest cohort caveat">
          <span>Reading note</span>
          <p>${escapeHtml(sentenceCase(latest[0]?.source_status))}. Do not compare ${latestYear} directly with completed calendar years until the final FDA annual report is available.</p>
        </aside>
      </div>
      <div class="latest-panel" aria-label="Latest approvals">
        <div class="latest-panel-header">
          <h3>Most recent ${latestYear} records</h3>
          <span>${latestIsProvisional ? 'Provisional' : 'Final'}</span>
        </div>
        <div class="latest-list">
          ${rowHtml}
        </div>
      </div>
    </section>
  `;
}
