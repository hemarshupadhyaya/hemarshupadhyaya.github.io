# Shape of Drug Development — Visual Essay Implementation Plan

## 1. Purpose

This repo will host the public visual essay for **The Shape of Drug Development**.

The essay turns the public FDA CDER novel drug / new biologic approval dataset into a long-form, interactive visual story.

The data pipeline lives separately in:

https://github.com/hemarshupadhyaya/shape-of-drug-development-data-clean

This repo is responsible only for:

- visual storytelling
- static frontend build
- data snapshots copied from the data repo exports
- public presentation, methodology, caveats, and publishing

It must not contain employer data, internal screenshots, internal systems, proprietary datasets, or confidential workflows.

---

## 2. Locked product decisions

### URL

The essay will live at:

```text
/essays/shape-of-drug-development/
```

Reason:

- signals long-form visual essay
- scales to future essays
- survives custom-domain migration
- avoids cluttering the root URL namespace

### Frontend stack

```text
Vite + TypeScript + D3 v7 + Scrollama
```

Reason:

- Vite gives fast development and tree-shaking for D3
- TypeScript protects chart/data contracts
- D3 enables authored, custom visual storytelling
- Scrollama enables step-based scroll interaction without heavy framework complexity

### Deployment model for v1

Built static output will be committed to main:

```text
essays/shape-of-drug-development/
```

No GitHub Actions initially.

This keeps the current homepage untouched and allows GitHub Pages to serve the essay as static files.

Later, we can move build output to GitHub Actions without changing the public URL.

---

## 3. Target repo structure

```text
hemarshupadhyaya.github.io/
├── index.html
├── README.md
├── docs/
│   └── shape-of-drug-development-visual-essay-plan.md
├── essays-src/
│   └── shape-of-drug-development/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.ts
│           ├── styles/
│           │   ├── tokens.css
│           │   ├── base.css
│           │   └── essay.css
│           ├── data/
│           │   ├── loadData.ts
│           │   └── types.ts
│           ├── charts/
│           │   ├── base.ts
│           │   ├── ApprovalTrendChart.ts
│           │   ├── ApplicationTypeChart.ts
│           │   ├── ExpeditedPathwaysChart.ts
│           │   ├── TherapeuticAreaChart.ts
│           │   └── DosageFormChart.ts
│           ├── scroll/
│           │   └── setupScroll.ts
│           ├── sections/
│           │   ├── hero.ts
│           │   ├── approvals.ts
│           │   ├── applicationType.ts
│           │   ├── expedited.ts
│           │   ├── therapeuticAreas.ts
│           │   ├── dosageForms.ts
│           │   ├── recentYears.ts
│           │   └── methodology.ts
│           └── utils/
│               ├── format.ts
│               └── annotations.ts
├── essays/
│   └── shape-of-drug-development/
│       ├── index.html
│       └── assets/
├── public/
│   └── data/
│       └── shape-of-drug-development/
│           ├── approval_trends_by_year.json
│           ├── approvals_by_application_type_by_year.json
│           ├── expedited_pathways_by_year.json
│           ├── orphan_drug_trends_by_year.json
│           ├── first_in_class_by_year.json
│           ├── therapeutic_area_counts.json
│           ├── therapeutic_area_by_period.json
│           ├── therapeutic_area_heatmap_by_5yr_period.json
│           ├── dosage_form_trends_by_year.json
│           ├── fda_nme_approvals_clean.json
│           ├── fda_nme_approvals_with_therapeutic_area.json
│           └── data-snapshot.json
└── scripts/
    ├── sync-shape-data.sh
    └── build-shape-essay.sh
```

---

## 4. Data contract

The visual essay will consume static JSON snapshots copied from the data repo.

Required v0.1 files:

```text
approval_trends_by_year.json
approvals_by_application_type_by_year.json
expedited_pathways_by_year.json
fda_nme_approvals_clean.json
```

Required v0.2 files:

```text
orphan_drug_trends_by_year.json
first_in_class_by_year.json
therapeutic_area_counts.json
therapeutic_area_by_period.json
therapeutic_area_heatmap_by_5yr_period.json
dosage_form_trends_by_year.json
fda_nme_approvals_with_therapeutic_area.json
```

Each copied data snapshot must include a `data-snapshot.json` file:

```json
{
  "source_repo": "https://github.com/hemarshupadhyaya/shape-of-drug-development-data-clean",
  "source_branch": "main",
  "source_commit": "",
  "synced_at": "",
  "data_year_range": "",
  "notes": ""
}
```

---

## 5. Data sync script

Create:

```text
scripts/sync-shape-data.sh
```

Responsibilities:

- copy selected JSON exports from local data repo
- copy metadata sidecars when available
- write `data-snapshot.json`
- fail if required files are missing
- print copied files

Expected usage:

```bash
./scripts/sync-shape-data.sh ../shape-of-drug-development-data-clean
```

Rules:

- The script should not download from the internet.
- The script should not modify the data repo.
- The script should only copy export artifacts into this repo.
- Data changes must be reviewed in git diff before publishing.

---

## 6. Build script

Create:

```text
scripts/build-shape-essay.sh
```

Responsibilities:

- enter `essays-src/shape-of-drug-development`
- install dependencies if needed
- run build
- output to `../../essays/shape-of-drug-development/`

Expected usage:

```bash
./scripts/build-shape-essay.sh
```

Build output must be committed for v1.

---

## 7. Visual narrative

### Section 1 — Hero

Purpose:

Introduce the question:

> What does 40 years of FDA CDER novel drug approval look like?

Visual:

- large total approval count
- year range
- short source note

Data:

```text
fda_nme_approvals_clean.json
```

Acceptance criteria:

- shows total count
- shows year range
- states CDER-only boundary
- marks 2026 as provisional if included

---

### Section 2 — Approval waves

Purpose:

Show that approvals fluctuate over time rather than rising smoothly.

Visual:

- year-by-year approval bar or line chart
- annotated high/low years
- optional rolling average

Data:

```text
approval_trends_by_year.json
```

Acceptance criteria:

- x-axis years readable
- y-axis approval count
- mobile-friendly
- no unsupported causal claims

---

### Section 3 — Product type shift

Purpose:

Show NDA vs BLA evolution.

Visual:

- stacked bars or small multiples
- highlight changing balance over time

Data:

```text
approvals_by_application_type_by_year.json
```

Acceptance criteria:

- NDA and BLA visually distinct
- labels explain that this is based on application type
- caveat added for CDER-only biologics

---

### Section 4 — Regulatory acceleration layer

Purpose:

Show how expedited and special designations shape modern drug approvals.

Visual:

- multi-line chart or step-based chart states
- priority review
- accelerated approval
- fast track
- breakthrough therapy
- orphan
- first-in-class

Data:

```text
expedited_pathways_by_year.json
orphan_drug_trends_by_year.json
first_in_class_by_year.json
```

Acceptance criteria:

- clearly separates approval count from designation count
- avoids implying pathway caused approval
- handles missing historical fields carefully

---

### Section 5 — Disease area concentration

Purpose:

Show where approvals cluster by therapeutic area.

Visual:

- ranked bar chart
- 5-year heatmap

Data:

```text
therapeutic_area_counts.json
therapeutic_area_by_period.json
therapeutic_area_heatmap_by_5yr_period.json
```

Acceptance criteria:

- top therapeutic areas visible
- "Unknown / needs review" handled transparently if present
- methodology note explains enrichment limits

---

### Section 6 — Dosage form and route

Purpose:

Show that drug development shape includes delivery and formulation, not only molecule count.

Visual:

- grouped/ranked trend chart
- optional route/form badges

Data:

```text
dosage_form_trends_by_year.json
```

Acceptance criteria:

- avoids clutter from rare forms
- groups long tail sensibly
- clearly labels original FDA-derived fields

---

### Section 7 — Recent years

Purpose:

Handle 2025 and 2026 carefully.

Visual:

- small recent-years panel
- latest approval rows
- provisional flag for 2026 YTD

Data:

```text
fda_nme_approvals_clean.json
```

Acceptance criteria:

- 2025 shown as enriched annual extract
- 2026 shown as YTD/provisional
- page does not imply final CY2026 completeness

---

### Section 8 — Methodology and caveats

Purpose:

Protect trust.

Must include:

- CDER-only scope
- excludes CBER-only biologics unless included by source
- excludes generics and many reformulations
- product/regulatory characteristics reflect status at original approval
- 2026 provisional status
- data repo link
- educational / portfolio project disclaimer

---

## 8. Chart utility layer

Create:

```text
src/charts/base.ts
```

It should provide:

- responsive SVG creation
- margin convention
- resize observer
- axis helpers
- tooltip primitive
- color tokens
- reduced-motion check
- mobile breakpoint helper

Do not make this too abstract.

Goal:

Each chart file should mostly contain:

- data transformation
- scales
- marks
- annotations
- update function for scroll state

---

## 9. Scroll design

Use Scrollama only where it improves storytelling.

Default layout:

```text
Desktop:
left narrative column + sticky chart

Mobile:
stacked text + chart blocks
```

Required behavior:

- scroll steps should update chart state
- chart must remain readable without scroll animation
- reduced-motion users should see static states
- mobile should not depend on sticky positioning

---

## 10. Design direction

Use design tokens derived from the current homepage so the essay feels like part of the same site.

Style:

- clean editorial layout
- off-white background
- strong typography
- restrained color
- high contrast
- small annotations
- no dashboard chrome
- no pharma stock imagery

Avoid:

- excessive animation
- generic dashboard cards
- overuse of gradients
- unsupported "AI/data revolution" language

---

## 11. Accessibility and performance

Minimum requirements:

- semantic HTML sections
- chart titles and descriptions
- keyboard-safe interactions
- readable contrast
- reduced-motion support
- responsive charts
- no layout shift from late-loading charts
- avoid importing all of D3 as `import * as d3`

Bundle target:

```text
Initial JS preferably under 150 KB gzipped for v1.
```

---

## 12. Implementation phases

### Phase 0 — Planning commit

Deliverables:

- add this plan under `docs/`
- create issue checklist
- confirm data repo path locally

Acceptance criteria:

- plan committed
- README links to plan
- no frontend work yet

---

### Phase 1 — Scaffold

Deliverables:

- Vite + TypeScript essay project
- design tokens
- empty seven-section page
- placeholder hero
- data sync script
- build script
- static build committed to `/essays/shape-of-drug-development/`

Acceptance criteria:

- `/essays/shape-of-drug-development/` loads locally
- homepage remains unchanged
- GitHub Pages path will work after push
- no chart logic yet

---

### Phase 2 — First three charts

Deliverables:

- approvals by year
- NDA vs BLA
- expedited pathways
- basic scroll interaction
- methodology footer

Acceptance criteria:

- charts load from copied JSON
- mobile layout works
- caveats visible
- build output committed

---

### Phase 3 — Therapeutic area and dosage form

Deliverables:

- therapeutic area ranking
- therapeutic area heatmap
- dosage form / route trends
- enrichment caveat text

Acceptance criteria:

- chart labels are readable
- long tail handled gracefully
- unknown/review-needed categories not hidden without explanation

---

### Phase 4 — Editorial polish

Deliverables:

- annotations
- transitions
- stronger intro/conclusion copy
- social preview metadata
- final caveat panel
- link to data repo and source notes

Acceptance criteria:

- essay feels complete
- reader can understand the story without touching code
- no unsupported claims
- no internal/proprietary references

---

### Phase 5 — Publish package

Deliverables:

- README update
- link from homepage
- one LinkedIn post draft
- one X thread draft
- GitHub data repo cross-link back to essay

Acceptance criteria:

- homepage links to essay
- essay links to data repo
- data repo README links to essay when live
- final pre-publish checklist completed

---

## 13. GitHub issues to create

### Issue 1 — Add visual essay implementation plan

Acceptance criteria:

- add `docs/shape-of-drug-development-visual-essay-plan.md`
- link it from `README.md`
- document locked decisions

### Issue 2 — Scaffold Vite essay project

Acceptance criteria:

- Vite + TypeScript project under `essays-src/shape-of-drug-development`
- builds into `essays/shape-of-drug-development`
- homepage unchanged

### Issue 3 — Add data sync workflow

Acceptance criteria:

- `scripts/sync-shape-data.sh`
- copies required JSON exports
- writes `data-snapshot.json`
- fails on missing required files

### Issue 4 — Build base editorial layout

Acceptance criteria:

- hero
- seven section shells
- methodology section
- responsive layout
- design tokens

### Issue 5 — Implement approval trend chart

Acceptance criteria:

- reads `approval_trends_by_year.json`
- renders responsive chart
- includes title, source note, accessible description

### Issue 6 — Implement application type chart

Acceptance criteria:

- reads `approvals_by_application_type_by_year.json`
- shows NDA vs BLA
- includes CDER biologics caveat

### Issue 7 — Implement expedited pathway section

Acceptance criteria:

- reads expedited/orphan/first-in-class exports
- separates counts clearly
- avoids unsupported causality

### Issue 8 — Implement therapeutic area section

Acceptance criteria:

- ranking and/or heatmap
- handles unknown/review categories
- methodology caveat included

### Issue 9 — Implement dosage form section

Acceptance criteria:

- readable trend view
- long-tail grouping
- route/form caveat

### Issue 10 — Publish v0.1

Acceptance criteria:

- build output committed
- page live under `/essays/shape-of-drug-development/`
- homepage link added
- data repo link added
- public-safe checklist passed

---

## 14. Pre-publish checklist

Before publishing, confirm:

- no employer/internal/proprietary content
- all data is public FDA-derived or transparent enrichment
- 2026 marked provisional
- CDER-only limitation visible
- no medical advice
- no investment advice
- no unsupported causal claims
- source repo linked
- data snapshot manifest included
- mobile layout checked
- build output matches source
- page works from the final GitHub Pages URL

---

## 15. Definition of done for v0.1

v0.1 is done when:

- the essay URL exists
- the page has a real hero and methodology section
- at least three charts are functional
- data is loaded from local JSON snapshots
- the visual style matches the portfolio site
- the data repo is linked
- the page works on mobile
- the project is safe to share publicly
