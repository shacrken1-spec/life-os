const Watchlist = (() => {
  async function render(el) {
    const items = await Store.load('watchlist');

    el.innerHTML = `
      <h1>Watchlist</h1>
      <form id="wl-form" class="form-grid">
        <div><label>Ticker</label><input name="ticker" required placeholder="NVDA" style="text-transform:uppercase"></div>
        <div><label>Alert price</label><input name="alert_price" type="number" step="any" placeholder="optional"></div>
        <div class="full"><label>Notes</label><input name="notes"></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add ticker</button></div>
      </form>
      <div id="wl-list"></div>`;

    $('#wl-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      items.push({
        id: uid(),
        ticker: f.get('ticker').toUpperCase().trim(),
        notes: f.get('notes').trim(),
        alert_price: f.get('alert_price') ? +f.get('alert_price') : null
      });
      await Store.save('watchlist', items);
      render(el);
    });

    const list = $('#wl-list', el);
    if (!items.length) { list.innerHTML = '<div class="empty">Watchlist empty</div>'; return; }
    list.innerHTML = items.map(w => `
      <div class="check-row">
        <div class="grow">
          <div><a href="https://finance.yahoo.com/quote/${encodeURIComponent(w.ticker)}" target="_blank" rel="noopener">${esc(w.ticker)}</a>
            <span id="px-${w.id}" class="muted">…</span></div>
          <div class="sub">${esc(w.notes)}${w.alert_price ? ` · alert @ ${w.alert_price}` : ''}</div>
        </div>
        <button class="btn-danger icon-btn" data-del="${w.id}" aria-label="Delete">✕</button>
      </div>`).join('');

    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = items.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { items.splice(i, 1); await Store.save('watchlist', items); render(el); }
    }));

    items.forEach(w => fetchPrice(w, el));
  }

  async function fetchPrice(w, el) {
    const span = $('#px-' + w.id, el);
    if (!span) return;
    try {
      // Yahoo Finance chart API via CORS proxy (Yahoo blocks direct browser CORS)
      const url = 'https://corsproxy.io/?url=' + encodeURIComponent(
        `https://query1.finance.yahoo.com/v8/finance/chart/${w.ticker}?interval=1d&range=1d`);
      const data = await (await fetch(url)).json();
      const meta = data.chart.result[0].meta;
      const px = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || px;
      const chg = ((px - prev) / prev * 100).toFixed(2);
      const alertHit = w.alert_price != null && px >= w.alert_price;
      span.className = px >= prev ? 'price-up' : 'price-down';
      span.textContent = ` ${px.toFixed(2)} (${chg >= 0 ? '+' : ''}${chg}%)${alertHit ? ' 🔔' : ''}`;
    } catch {
      span.textContent = ' price unavailable';
    }
  }

  return { render };
})();
