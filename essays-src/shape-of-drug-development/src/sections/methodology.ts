import { loadSnapshot } from '../data/loadData';

export async function renderMethodology(): Promise<string> {
  const snapshot = await loadSnapshot();
  const synced = snapshot?.synced_at || 'not yet synced';
  const commit = snapshot?.source_commit || 'not yet pinned';

  return `
    <section id="methodology" class="section methodology" aria-labelledby="methodology-heading">
      <div class="section-label">Methodology &amp; caveats</div>
      <h2 id="methodology-heading">What this essay does and does not show</h2>
      <p>
        This is a public-data visual essay built from the FDA CDER novel drug
        and new biologic approval record. It is not medical advice, not investment
        advice, and not a complete view of every approved drug.
      </p>
      <ul>
        <li>Scope is CDER-only. Most CBER-only biologics do not appear.</li>
        <li>Generics and many reformulations are excluded by source.</li>
        <li>Product and regulatory characteristics reflect status at original approval.</li>
        <li>2026 is provisional — the calendar year is in progress.</li>
        <li>No causal claims. Patterns shown are descriptive only.</li>
        <li>
          Source data and pipeline:
          <a href="https://github.com/hemarshupadhyaya/shape-of-drug-development-data-clean"
             target="_blank" rel="noopener">shape-of-drug-development-data-clean</a>.
        </li>
        <li>Data snapshot: synced ${synced}, source commit ${commit}.</li>
      </ul>
    </section>
  `;
}
