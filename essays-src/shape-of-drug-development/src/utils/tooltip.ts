// Single reused tooltip element. Created lazily on first show().

let tipEl: HTMLDivElement | null = null;

function ensureEl(): HTMLDivElement {
  if (tipEl) return tipEl;
  const el = document.createElement('div');
  el.className = 'chart-tip';
  el.setAttribute('role', 'tooltip');
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.opacity = '0';
  el.style.transition = 'opacity 120ms ease';
  document.body.appendChild(el);
  tipEl = el;
  return el;
}

export function showTooltip(html: string, clientX: number, clientY: number): void {
  const el = ensureEl();
  el.innerHTML = html;
  el.style.opacity = '1';
  positionTooltip(clientX, clientY);
}

export function moveTooltip(clientX: number, clientY: number): void {
  if (!tipEl) return;
  positionTooltip(clientX, clientY);
}

export function hideTooltip(): void {
  if (!tipEl) return;
  tipEl.style.opacity = '0';
}

function positionTooltip(clientX: number, clientY: number): void {
  if (!tipEl) return;
  const rect = tipEl.getBoundingClientRect();
  const pad = 12;
  let x = clientX + pad;
  let y = clientY + pad;
  if (x + rect.width + 8 > window.innerWidth) x = clientX - rect.width - pad;
  if (y + rect.height + 8 > window.innerHeight) y = clientY - rect.height - pad;
  if (x < 4) x = 4;
  if (y < 4) y = 4;
  tipEl.style.left = `${x}px`;
  tipEl.style.top = `${y}px`;
}

export function fmt(n: number): string {
  return n.toLocaleString();
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
