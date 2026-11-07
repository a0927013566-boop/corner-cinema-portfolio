const preference = matchMedia('(prefers-reduced-motion: reduce)');
let manuallyPaused = false;
try { manuallyPaused = sessionStorage.getItem('corner-motion') === 'paused'; } catch {}
export const motionAllowed = () => !manuallyPaused && !preference.matches;
function sync() {
  const allowed = motionAllowed();
  document.documentElement.dataset.motion = allowed ? 'running' : 'paused';
  document.querySelectorAll('[data-motion-toggle],#motion-toggle').forEach(button => {
    button.hidden = false;
    button.setAttribute('aria-pressed', String(!allowed));
    button.textContent = preference.matches ? '已減少動態' : allowed ? '暫停動態 Ⅱ' : '開啟動態 ▷';
    button.disabled = preference.matches;
  });
  document.dispatchEvent(new CustomEvent('corner:motion', {detail:{allowed}}));
}
document.addEventListener('click', event => {
  if (!event.target.closest('[data-motion-toggle],#motion-toggle')) return;
  manuallyPaused = !manuallyPaused;
  try { sessionStorage.setItem('corner-motion', manuallyPaused ? 'paused' : 'running'); } catch {}
  sync();
});
preference.addEventListener('change', sync);
export function initMotion() { sync(); }
