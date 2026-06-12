const Trading = (() => {
  async function render(el) {
    const trades = await Store.load('trading');

    el.innerHTML = `
      <h1>Trading</h1>
      <form id="trade-form" class="form-grid">
        <div><label>Date</label><input name="date" type="date" value="${todayStr()}" required></div>
        <div><label>Ticker</label><input name="ticker" required placeholder="AAPL" style="text-transform:uppercase"></div>
        <div><label>Side</label><select name="side"><option value="L">Long</option><option value="S">Short</option></select></div>
        <div><label>Entry</label><input name="entry" type="number" step="any" required></div>
        <div><label>Exit</label><input name="exit" type="number" step="any" required></div>
        <div><label>Size</label><input name="size" type="number" step="any" required></div>
        <div><label>Setup</label><input name="setup" placeholder="Breakout"></div>
        <div class="full"><label>Notes</label><input name="notes"></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add trade</button></div>
      </form>
      <h2>Monthly P&amp;L</h2>
      <div id="pnl-chart"></div>
      <h2>Win rate by setup</h2>
      <div id="setup-table"></div>
      <h2>Trades</h2>
      <div id="trade-table"></div>`;

    $('#trade-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const entry = +f.get('entry'), exit = +f.get('exit'), size = +f.get('size');
      const dir = f.get('side') === 'S' ? -1 : 1;
      trades.push({
        id: uid(),
        date: f.get('date'),
        ticker: f.get('ticker').toUpperCase().trim(),
        side: f.get('side'),
        entry, exit, size,
        pnl: +((exit - entry) * size * dir).toFixed(2),
        setup: f.get('setup').trim(),
        notes: f.get('notes').trim()
      });
      await Store.save('trading', trades);
      render(el);
    });

    drawChart(el, trades);
    drawSetups(el, trades);
    drawTable(el, trades);
  }

  function drawChart(el, trades) {
    const months = {};
    trades.forEach(t => {
      const m = t.date.slice(0, 7);
      months[m] = (months[m] || 0) + t.pnl;
    });
    const keys = Object.keys(months).sort().slice(-12);
    const box = $('#pnl-chart', el);
    if (!keys.length) { box.innerHTML = '<div class="empty">No trades yet</div>'; return; }
    const max = Math.max(...keys.map(k => Math.abs(months[k])), 1);
    box.innerHTML = `<div class="bar-chart">${keys.map(k => `
      <div class="bar-col" title="${k}: ${fmtMoney(months[k])}">
        <div class="bar ${months[k] < 0 ? 'neg' : ''}" style="height:${Math.max(Math.abs(months[k]) / max * 100, 3)}%"></div>
        <div class="bar-label">${k.slice(5)}</div>
      </div>`).join('')}</div>`;
  }

  function drawSetups(el, trades) {
    const setups = {};
    trades.filter(t => t.setup).forEach(t => {
      const s = setups[t.setup] = setups[t.setup] || { n: 0, wins: 0, pnl: 0 };
      s.n++; if (t.pnl > 0) s.wins++; s.pnl += t.pnl;
    });
    const keys = Object.keys(setups).sort((a, b) => setups[b].n - setups[a].n);
    const box = $('#setup-table', el);
    if (!keys.length) { box.innerHTML = '<div class="empty">No setups tagged yet</div>'; return; }
    box.innerHTML = `<div class="table-wrap"><table>
      <tr><th>Setup</th><th>Trades</th><th>Win rate</th><th>P&amp;L</th></tr>
      ${keys.map(k => {
        const s = setups[k];
        return `<tr><td>${esc(k)}</td><td>${s.n}</td><td>${Math.round(s.wins / s.n * 100)}%</td>
          <td class="${s.pnl >= 0 ? 'pos' : 'neg'}">${fmtMoney(s.pnl)}</td></tr>`;
      }).join('')}</table></div>`;
  }

  function drawTable(el, trades) {
    const box = $('#trade-table', el);
    if (!trades.length) { box.innerHTML = '<div class="empty">No trades yet</div>'; return; }
    const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
    box.innerHTML = `<div class="table-wrap"><table>
      <tr><th>Date</th><th>Ticker</th><th>Side</th><th>Entry</th><th>Exit</th><th>Size</th><th>P&amp;L</th><th>Setup</th><th>Notes</th><th></th></tr>
      ${sorted.map(t => `<tr>
        <td>${t.date}</td><td>${esc(t.ticker)}</td><td>${t.side}</td>
        <td>${t.entry}</td><td>${t.exit}</td><td>${t.size}</td>
        <td class="${t.pnl >= 0 ? 'pos' : 'neg'}">${fmtMoney(t.pnl)}</td>
        <td>${esc(t.setup)}</td><td>${esc(t.notes)}</td>
        <td><button class="btn-danger" data-del="${t.id}">✕</button></td>
      </tr>`).join('')}</table></div>`;
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = trades.findIndex(t => t.id === b.dataset.del);
      if (i > -1) { trades.splice(i, 1); await Store.save('trading', trades); render(el); }
    }));
  }

  return { render };
})();
