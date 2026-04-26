interface Stub {
  id: string;
  label: string;
  title: string;
  body: string;
  chartNote: string;
}

const stubs: Stub[] = [
  {
    id: 'recent-years',
    label: 'Section 6',
    title: 'The latest cohort',
    body: `2025 closed with an enriched annual extract. 2026 is provisional —
      a year in progress. We surface the most recent approvals carefully,
      flagging what is final and what is not.`,
    chartNote: 'Coming in Phase 4: recent approvals panel with provisional flag.'
  }
];

export function renderPlaceholderSections(): string {
  return stubs
    .map(
      (s) => `
        <section id="${s.id}" class="section" aria-labelledby="${s.id}-heading">
          <div class="section-label">${s.label}</div>
          <h2 id="${s.id}-heading">${s.title}</h2>
          <p>${s.body}</p>
          <div class="chart-placeholder">${s.chartNote}</div>
        </section>
      `
    )
    .join('');
}
