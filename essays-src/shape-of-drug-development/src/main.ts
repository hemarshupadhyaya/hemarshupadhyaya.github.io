import './styles/tokens.css';
import './styles/base.css';
import './styles/essay.css';

import { renderHero } from './sections/hero';
import { renderApprovals } from './sections/approvals';
import { renderApplicationType } from './sections/applicationType';
import { renderExpedited } from './sections/expedited';
import { renderTherapeuticAreas } from './sections/therapeuticAreas';
import { renderDosageForms } from './sections/dosageForms';
import { renderPlaceholderSections } from './sections/placeholders';
import { renderMethodology } from './sections/methodology';
import { setupSectionScroll } from './scroll/setupScroll';

type Cleanup = () => void;

async function main(): Promise<void> {
  const root = document.getElementById('essay');
  if (!root) return;
  const cleanups: Cleanup[] = [];

  const heroEl = document.createElement('div');
  const approvalsEl = document.createElement('div');
  const applicationTypeEl = document.createElement('div');
  const expeditedEl = document.createElement('div');
  const therapeuticAreasEl = document.createElement('div');
  const dosageFormsEl = document.createElement('div');
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
    therapeuticAreasEl,
    dosageFormsEl,
    placeholdersEl,
    separator,
    methodologyEl,
    footer
  );

  const figures = await renderHero(heroEl);
  const provisionalYear = figures?.provisionalYear;

  const [
    cleanupApprovals,
    ,
    cleanupExpedited,
    cleanupTherapeuticAreas,
    cleanupDosageForms
  ] = await Promise.all([
    renderApprovals(approvalsEl, provisionalYear),
    renderApplicationType(applicationTypeEl, provisionalYear),
    renderExpedited(expeditedEl),
    renderTherapeuticAreas(therapeuticAreasEl),
    renderDosageForms(dosageFormsEl)
  ]);
  cleanups.push(
    cleanupApprovals,
    cleanupExpedited,
    cleanupTherapeuticAreas,
    cleanupDosageForms
  );

  placeholdersEl.innerHTML = renderPlaceholderSections();
  methodologyEl.innerHTML = await renderMethodology();

  // Section-level observer (toggles .is-active for any subtle section styling).
  // Step-level observers are set up inside scrolly sections themselves.
  cleanups.push(setupSectionScroll());

  if (window.location.hash) {
    document.querySelector(window.location.hash)?.scrollIntoView();
  }

  const cleanup = () => {
    cleanups.forEach((fn) => fn());
  };

  window.addEventListener('beforeunload', cleanup, { once: true });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    });
  }
}

main();
