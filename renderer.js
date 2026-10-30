codexPlus.extension((ctx) => {
  ctx.effect(() => {
    const id = 'rainbow-context-bar';
    const selector = '[data-composer-surface-overflow] span[role="img"][aria-label^="上下文用量"]';
    const marker = '[data-codex-plus-ext="rainbow-context-bar"][data-rainbow-part="meter"]';
    const target = `${selector}:has(> ${marker})`;
    const configuredWidth = Number(ctx.config.barWidth);
    const width = Number.isFinite(configuredWidth) ? Math.max(36, Math.min(140, configuredWidth)) : 64;
    const meters = new Map();
    const style = document.createElement('style');
    style.id = 'codex-plus-ext-rainbow-context-bar-style';
    style.setAttribute('data-codex-plus-ext', id);
    style.textContent = `
      ${target} {
        width: ${width + 32}px !important;
        min-width: ${width + 32}px;
        height: 16px;
        flex-shrink: 0;
      }
      ${target} > svg { display: none !important; }
      ${marker} {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        height: 16px;
        pointer-events: none;
      }
      ${marker} [data-rainbow-part="track"] {
        display: block;
        flex: 0 0 ${width}px;
        height: 6px;
        overflow: hidden;
        border-radius: 3px;
        background: var(--codex-plus-border, rgba(128, 128, 128, 0.25));
      }
      ${marker} [data-rainbow-part="fill"] {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #f2545b 0%, #ffad42 18%, #f2d64b 35%, #4fca83 52%, #43b9e8 69%, #7779ed 85%, #d66bd9 100%);
        transition: width 180ms ease;
      }
      ${marker} [data-rainbow-part="label"] {
        display: block;
        width: 26px;
        flex: 0 0 26px;
        text-align: right;
        font-size: 10px;
        line-height: 16px;
        font-variant-numeric: tabular-nums;
        color: inherit;
        white-space: nowrap;
        letter-spacing: 0;
      }
      @media (prefers-reduced-motion: reduce) {
        ${marker} [data-rainbow-part="fill"] { transition: none; }
      }
    `;
    document.head.append(style);

    function node(part) {
      const element = document.createElement('span');
      element.setAttribute('data-codex-plus-ext', id);
      element.setAttribute('data-rainbow-part', part);
      return element;
    }

    function refresh() {
      for (const [host, meter] of meters) {
        if (!host.isConnected || !host.matches(selector)) {
          meter.root.remove();
          meters.delete(host);
        }
      }
      for (const host of document.querySelectorAll(selector)) {
        const match = (host.getAttribute('aria-label') || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (!match) continue;
        const percent = Math.max(0, Math.min(100, Number(match[1].replace(',', '.'))));
        if (!Number.isFinite(percent)) continue;
        let meter = meters.get(host);
        if (!meter) {
          const root = node('meter');
          root.setAttribute('aria-hidden', 'true');
          const track = node('track');
          const fill = node('fill');
          const label = node('label');
          track.append(fill);
          root.append(track, label);
          meter = { root, fill, label };
          meters.set(host, meter);
        }
        if (meter.root.parentNode !== host) host.append(meter.root);
        const progress = `${percent}%`;
        if (meter.fill.style.width !== progress) meter.fill.style.width = progress;
        if (meter.label.textContent !== progress) meter.label.textContent = progress;
      }
    }

    let scheduled = false;
    let disposed = false;
    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        if (record.type === 'attributes') return record.target.matches(selector) || meters.has(record.target);
        return !record.target.closest('[data-codex-plus-ext="rainbow-context-bar"]');
      });
      if (!relevant || scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (!disposed) refresh();
      });
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });
    refresh();
    return () => {
      disposed = true;
      observer.disconnect();
      for (const meter of meters.values()) meter.root.remove();
      meters.clear();
      style.remove();
    };
  });
});