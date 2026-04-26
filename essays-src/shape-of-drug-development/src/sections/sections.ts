interface SectionShell {
  id: string;
  label: string;
  title: string;
  body: string;
  chartNote: string;
}

const sections: SectionShell[] = [
  {
    id: 'approvals',
    label: 'Section 1',
    title: 'Approval waves',
    body: `Year over year, novel drug approvals do not climb in a smooth line.
      They surge and dip — shaped by review reforms, industry cycles,
      and what the science was ready for. This section will trace those waves.`,
    chartNote: 'Chart: novel approvals per year, 1985 – present.'
  },
  {
    id: 'application-type',
    label: 'Section 2',
    title: 'NDAs and BLAs',
    body: `The mix of small-molecule NDAs and biologic BLAs has shifted decisively
      since the early 2000s. We look at the balance over time, with a clear
      caveat that this view is CDER-scoped — most CBER-only biologics do not appear here.`,
    chartNote: 'Chart: approvals split by application type, by year.'
  },
  {
    id: 'expedited',
    label: 'Section 3',
    title: 'The acceleration layer',
    body: `Priority review, accelerated approval, fast track, breakthrough therapy,
      orphan, first-in-class. These designations layer on top of the approval count
      and tell us how the regulatory shape of drug development has changed.`,
    chartNote: 'Chart: expedited and special designations over time.'
  },
  {
    id: 'therapeutic-areas',
    label: 'Section 4',
    title: 'Where approvals cluster',
    body: `Approvals cluster around the diseases the science can reach.
      Oncology, infectious disease, and rare disorders dominate recent years —
      but the picture changes over five-year windows.`,
    chartNote: 'Chart: therapeutic area ranking and 5-year heatmap.'
  },
  {
    id: 'dosage-forms',
    label: 'Section 5',
    title: 'How they are delivered',
    body: `Drug development is not just about molecules — it is about how
      patients receive them. Tablet, injection, infusion, inhaler.
      The dosage and route mix tells its own story.`,
    chartNote: 'Chart: dosage form and route trends.'
  },
  {
    id: 'recent-years',
    label: 'Section 6',
    title: 'The latest cohort',
    body: `2025 closed with an enriched annual extract. 2026 is provisional —
      a year in progress. We surface the most recent approvals carefully,
      flagging what is final and what is not.`,
    chartNote: 'Panel: recent approvals with provisional flag for the current year.'
  }
];

export function renderSectionShells(): string {
  return sections
    .map(
      (s) => `
        <section id="${s.id}" class="section" aria-labelledby="${s.id}-heading">
          <div class="section-label">${s.label}</div>
          <h2 id="${s.id}-heading">${s.title}</h2>
          <p>${s.body}</p>
          <div class="chart-placeholder" role="img" aria-label="${s.chartNote}">
            ${s.chartNote}
          </div>
        </section>
      `
    )
    .join('');
}
