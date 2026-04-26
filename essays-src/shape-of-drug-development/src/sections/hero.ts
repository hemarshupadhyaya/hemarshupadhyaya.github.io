import { loadJSON, loadSnapshot } from '../data/loadData';
import type { ApprovalTrendRow } from '../data/types';

export interface HeroFigures {
  totalApprovals: number;
  yearStart: number;
  yearEnd: number;
  provisionalYear?: number;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export async function renderHero(root: HTMLElement): Promise<HeroFigures | null> {
  const snapshot = await loadSnapshot();
  const trends = await loadJSON<ApprovalTrendRow[]>('approval_trends_by_year.json');

  let figures: HeroFigures | null = null;
  if (trends && trends.length > 0) {
    const sorted = [...trends].sort((a, b) => a.approval_year - b.approval_year);
    const yearStart = sorted[0].approval_year;
    const yearEnd = sorted[sorted.length - 1].approval_year;
    const total = sorted.reduce((acc, r) => acc + r.total_approvals, 0);
    const provisionalYear = new Date().getUTCFullYear() === yearEnd ? yearEnd : undefined;
    figures = { totalApprovals: total, yearStart, yearEnd, provisionalYear };
  }

  const yearRange = snapshot?.data_year_range || (figures ? `${figures.yearStart}–${figures.yearEnd}` : '');
  const totalCell = figures
    ? `<div class="value">${formatNumber(figures.totalApprovals)}</div><div class="label">Approvals, ${figures.yearStart}–${figures.yearEnd}</div>`
    : `<div class="value placeholder">—</div><div class="label">Total approvals</div>`;
  const yearsCell = figures
    ? `<div class="value">${figures.yearEnd - figures.yearStart + 1}</div><div class="label">Years covered</div>`
    : `<div class="value placeholder">—</div><div class="label">Years covered</div>`;
  const provisionalCell = figures?.provisionalYear
    ? `<div class="value">${figures.provisionalYear}</div><div class="label">Provisional (YTD)</div>`
    : `<div class="value placeholder">—</div><div class="label">Provisional (YTD)</div>`;

  root.innerHTML = `
    <p class="crumbs"><a href="/">Hemarsh Upadhyaya</a> &nbsp;/&nbsp; Essays</p>
    <header class="hero">
      <h1 id="essay-title">The Shape of Drug Development</h1>
      <p class="dek">
        Forty years of FDA novel drug approvals, in one place. A visual essay
        built from the public CDER record — what was approved, when, by what
        pathway, and for whom.
      </p>
      <div class="meta">
        <span>Visual essay</span>
        <span>FDA CDER, ${yearRange}</span>
        <span>v0.2 — first charts</span>
      </div>
      <div class="hero-stats" aria-label="Headline figures">
        <div class="hero-stat">${totalCell}</div>
        <div class="hero-stat">${yearsCell}</div>
        <div class="hero-stat">${provisionalCell}</div>
      </div>
    </header>
  `;

  return figures;
}
