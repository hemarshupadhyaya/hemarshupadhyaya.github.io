import { loadSnapshot } from '../data/loadData';

export async function renderHero(root: HTMLElement): Promise<void> {
  const snapshot = await loadSnapshot();
  const yearRange = snapshot?.data_year_range || '1985 – present';

  root.innerHTML = `
    <p class="crumbs"><a href="/">Hemarsh Upadhyaya</a> &nbsp;/&nbsp; Essays</p>
    <header class="hero">
      <h1 id="essay-title">The Shape of Drug Development</h1>
      <p class="dek">
        What does forty years of FDA novel drug approval look like in one place?
        A visual essay built from the public CDER record — what was approved,
        when, by what pathway, and for whom.
      </p>
      <div class="meta">
        <span>Visual essay</span>
        <span>FDA CDER, ${yearRange}</span>
        <span>v0.1 — scaffold</span>
      </div>
      <div class="hero-stats" aria-label="Headline figures">
        <div class="hero-stat">
          <div class="value placeholder">—</div>
          <div class="label">Total approvals</div>
        </div>
        <div class="hero-stat">
          <div class="value placeholder">—</div>
          <div class="label">Years covered</div>
        </div>
        <div class="hero-stat">
          <div class="value placeholder">—</div>
          <div class="label">Therapeutic areas</div>
        </div>
      </div>
    </header>
  `;
}
