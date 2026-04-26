import './styles/tokens.css';
import './styles/base.css';
import './styles/essay.css';

import { renderHero } from './sections/hero';
import { renderApprovals } from './sections/approvals';
import { renderApplicationType } from './sections/applicationType';
import { renderExpedited } from './sections/expedited';
import { renderPlaceholderSections } from './sections/placeholders';
import { renderMethodology } from './sections/methodology';
import { setupSectionScroll } from './scroll/setupScroll';

async function main(): Promise<void> {
  const root = document.getElementById('essay');
  if (!root) return;

  const heroEl = document.createElement('div');
  const approvalsEl = document.createElement('div');
  const applicationTypeEl = document.createElement('div');
  const expeditedEl = document.createElement('div');
  const placeholdersEl = document.createElement('div');
  const methodologyEl = document.createElement('div');
  const separator = document.createElement('div');
  separator.className = 'separator';
  separator.setAttribute('role', 'separator');

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `<p>Views expressed here are my own and not those of my employer.</p>`;

  root.append(
    heroEl,
    approvalsEl,
    applicationTypeEl,
    expeditedEl,
    placeholdersEl,
    separator,
    methodologyEl,
    footer
  );

  const figures = await renderHero(heroEl);
  const provisionalYear = figures?.provisionalYear;

  await Promise.all([
    renderApprovals(approvalsEl, provisionalYear),
    renderApplicationType(applicationTypeEl, provisionalYear),
    renderExpedited(expeditedEl)
  ]);

  placeholdersEl.innerHTML = renderPlaceholderSections();
  methodologyEl.innerHTML = await renderMethodology();

  setupSectionScroll();
}

main();
