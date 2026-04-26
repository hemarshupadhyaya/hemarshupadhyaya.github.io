import './styles/tokens.css';
import './styles/base.css';
import './styles/essay.css';

import { renderHero } from './sections/hero';
import { renderSectionShells } from './sections/sections';
import { renderMethodology } from './sections/methodology';

async function main(): Promise<void> {
  const root = document.getElementById('essay');
  if (!root) return;

  const heroEl = document.createElement('div');
  const sectionsEl = document.createElement('div');
  const methodologyEl = document.createElement('div');
  const separator = document.createElement('div');
  separator.className = 'separator';
  separator.setAttribute('role', 'separator');
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `<p>Views expressed here are my own and not those of my employer.</p>`;

  root.append(heroEl, sectionsEl, separator, methodologyEl, footer);

  await renderHero(heroEl);
  sectionsEl.innerHTML = renderSectionShells();
  methodologyEl.innerHTML = await renderMethodology();
}

main();
