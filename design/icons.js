// <lu-i name="house" size="16"></lu-i> — Lucide (stroke 1.5) + a few product glyphs (status, priority)
(() => {
  if (customElements.get('lu-i')) return;
  const cache = {};
  const C = {
    'st-todo': '<circle cx="8" cy="8" r="5.75" fill="none" stroke="var(--st-gray,#98989b)" stroke-width="1.5"/>',
    'st-progress': '<circle cx="8" cy="8" r="5.75" fill="none" stroke="var(--st-progress,#2f7fd6)" stroke-width="1.5"/><path d="M8 4.5a3.5 3.5 0 0 1 0 7z" fill="var(--st-progress,#2f7fd6)"/>',
    'st-review': '<circle cx="8" cy="8" r="5.75" fill="none" stroke="var(--st-review,#8a5cc7)" stroke-width="1.5"/><path d="M8 4.5a3.5 3.5 0 1 1-3.5 3.5H8z" fill="var(--st-review,#8a5cc7)"/>',
    'st-done': '<circle cx="8" cy="8" r="6.5" fill="var(--st-done,#3f9a5f)"/><path d="M5.3 8.2l1.8 1.8 3.6-3.8" fill="none" stroke="var(--color-bg,#fff)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    'st-planning': '<circle cx="8" cy="8" r="5.75" fill="none" stroke="var(--st-gray,#98989b)" stroke-width="1.5" stroke-dasharray="2.2 2"/>',
    'st-hold': '<circle cx="8" cy="8" r="6.5" fill="var(--st-gray,#98989b)"/><path d="M6.5 5.8v4.4M9.5 5.8v4.4" stroke="var(--color-bg,#fff)" stroke-width="1.5" stroke-linecap="round"/>',
    'st-active': '<circle cx="8" cy="8" r="5.75" fill="none" stroke="var(--st-progress,#2f7fd6)" stroke-width="1.5"/><circle cx="8" cy="8" r="2.75" fill="var(--st-progress,#2f7fd6)"/>',
    'p-urgent': '<rect x="2" y="2" width="12" height="12" fill="var(--st-red,#c8402f)"/><path d="M8 4.6v4.2" stroke="var(--color-bg,#fff)" stroke-width="1.6"/><rect x="7.2" y="10" width="1.6" height="1.6" fill="var(--color-bg,#fff)"/>',
    'p-high': '<rect x="2.5" y="9" width="2.5" height="4.5" fill="currentColor"/><rect x="6.75" y="6" width="2.5" height="7.5" fill="currentColor"/><rect x="11" y="3" width="2.5" height="10.5" fill="currentColor"/>',
    'p-medium': '<rect x="2.5" y="9" width="2.5" height="4.5" fill="currentColor"/><rect x="6.75" y="6" width="2.5" height="7.5" fill="currentColor"/><rect x="11" y="3" width="2.5" height="10.5" fill="currentColor" opacity=".25"/>',
    'p-low': '<rect x="2.5" y="9" width="2.5" height="4.5" fill="currentColor"/><rect x="6.75" y="6" width="2.5" height="7.5" fill="currentColor" opacity=".25"/><rect x="11" y="3" width="2.5" height="10.5" fill="currentColor" opacity=".25"/>',
    'p-none': '<path d="M3 8h2M7 8h2M11 8h2" stroke="currentColor" stroke-width="1.5"/>'
  };
  const load = (n) => cache[n] || (cache[n] = fetch('https://unpkg.com/lucide-static@0.460.0/icons/' + n + '.svg')
    .then(r => r.ok ? r.text() : '').catch(() => ''));
  class LuI extends HTMLElement {
    static get observedAttributes() { return ['name', 'size']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    async render() {
      const n = this.getAttribute('name'); if (!n) return;
      const s = this.getAttribute('size') || 16;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const css = `<style>:host{display:inline-flex;flex:none;width:${s}px;height:${s}px;line-height:0;vertical-align:middle}svg{width:${s}px;height:${s}px;display:block}</style>`;
      let svg;
      if (C[n]) svg = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">${C[n]}</svg>`;
      else {
        const t = await load(n);
        if (this.getAttribute('name') !== n) return;
        svg = t.replace(/<!--[\s\S]*?-->/g, '').replace(/stroke-width="[^"]*"/, 'stroke-width="1.5"');
      }
      this.shadowRoot.innerHTML = css + svg;
    }
  }
  customElements.define('lu-i', LuI);
})();
