const Expenses = (() => {
  const CATEGORIES = ['Groceries', 'Dining', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'];
  const CAT_RULES = [
    [/שופרסל|רמי לוי|ויקטורי|יוחננוף|טיב טעם|מגה|יינות ביתן|supermarket|grocery/i, 'Groceries'],
    [/וולט|wolt|מסעדת|קפה|מקדונלד|בורגר|פיצה|סושי|restaurant|cafe/i, 'Dining'],
    [/דלק|פז|סונול|רב קו|מונית|gett|חניון|רכבת|אגד|fuel|taxi|parking/i, 'Transport'],
    [/חשמל|מים|ארנונה|בזק|הוט|פרטנר|סלקום|גולן|ביטוח|electric|insurance/i, 'Bills'],
    [/קופ"ח|מכבי|כללית|בית מרקחת|סופר פארם|pharm|clinic/i, 'Health'],
    [/סינמה|נטפליקס|netflix|spotify|yes פלאנט|cinema/i, 'Entertainment'],
    [/זארה|קסטרו|פוקס|h&m|amazon|אליאקספרס|aliexpress|איקאה|ikea/i, 'Shopping']
  ];
  const COLORS = ['#00d4aa', '#5b8def', '#f2b134', '#e96fa4', '#9b6fe9', '#4fc3f7', '#ff8a5b', '#8a8a8a'];

  // Poalim Open Banking (poalimdev.co.il) — fill in registered app credentials
  const POALIM = {
    base: 'https://api.poalimdev.co.il',
    authUrl: 'https://api.poalimdev.co.il/oauth2/authorize',
    tokenUrl: 'https://api.poalimdev.co.il/oauth2/token',
    clientId: 'YOUR_POALIM_CLIENT_ID',
    redirectUri: location.origin + location.pathname,
    scope: 'accounts transactions'
  };
  let poalimToken = null;

  function categorize(merchant) {
    for (const [re, cat] of CAT_RULES) if (re.test(merchant)) return cat;
    return 'Other';
  }

  async function render(el) {
    const expenses = await Store.load('expenses');

    // Poalim OAuth2 redirect return
    const params = new URLSearchParams(location.search);
    if (params.get('code') && !poalimToken) {
      await exchangeCode(params.get('code'));
      history.replaceState(null, '', location.pathname + location.hash);
      if (poalimToken) await importPoalim(expenses);
    }

    const today = todayStr();
    const month = today.slice(0, 7);
    const todayTotal = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    const monthExp = expenses.filter(e => e.date.slice(0, 7) === month);
    const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);

    el.innerHTML = `
      <h1>Expenses</h1>
      <div class="cards">
        <div class="card"><div class="card-label">Today</div><div class="card-value">${fmtMoney(todayTotal)}</div></div>
        <div class="card"><div class="card-label">This month</div><div class="card-value">${fmtMoney(monthTotal)}</div></div>
      </div>
      <div class="row-actions">
        <button id="poalim-btn" class="btn">Connect Bank Hapoalim</button>
        <label class="btn" style="cursor:pointer">Import CSV<input id="csv-input" type="file" accept=".csv" hidden></label>
      </div>
      <form id="exp-form" class="form-grid">
        <div><label>Date</label><input name="date" type="date" value="${today}" required></div>
        <div><label>Amount (₪)</label><input name="amount" type="number" step="0.01" required></div>
        <div><label>Merchant</label><input name="merchant" required></div>
        <div><label>Category</label><select name="category">${CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add expense</button></div>
      </form>
      <h2>This month by category</h2>
      <div id="exp-donut"></div>
      <h2>Transactions</h2>
      <div id="exp-table"></div>`;

    $('#exp-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      expenses.push({
        id: uid(), date: f.get('date'), amount: +f.get('amount'),
        merchant: f.get('merchant').trim(), category: f.get('category'), source: 'manual'
      });
      await Store.save('expenses', expenses);
      render(el);
    });

    $('#poalim-btn', el).addEventListener('click', () => {
      if (poalimToken) importPoalim(expenses).then(() => render(el));
      else location.href = `${POALIM.authUrl}?response_type=code&client_id=${encodeURIComponent(POALIM.clientId)}&redirect_uri=${encodeURIComponent(POALIM.redirectUri)}&scope=${encodeURIComponent(POALIM.scope)}`;
    });

    $('#csv-input', el).addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const added = importCSV(text, expenses);
      await Store.save('expenses', expenses);
      toast(added + ' transactions imported');
      render(el);
    });

    drawDonut(el, monthExp);
    drawTable(el, expenses);
  }

  // ---- Poalim Open Banking ----
  async function exchangeCode(code) {
    try {
      const res = await fetch(POALIM.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code', code,
          client_id: POALIM.clientId, redirect_uri: POALIM.redirectUri
        })
      });
      if (res.ok) poalimToken = (await res.json()).access_token;
    } catch { toast('Bank connection failed'); }
  }

  async function importPoalim(expenses) {
    try {
      const h = { Authorization: 'Bearer ' + poalimToken };
      const accounts = await (await fetch(`${POALIM.base}/accounts`, { headers: h })).json();
      let added = 0;
      for (const acc of accounts.accounts || accounts || []) {
        const txs = await (await fetch(`${POALIM.base}/accounts/${acc.accountId || acc.id}/transactions`, { headers: h })).json();
        for (const tx of txs.transactions || txs || []) {
          const amount = Math.abs(+tx.amount || +(tx.transactionAmount && tx.transactionAmount.amount) || 0);
          if (!amount || (+tx.amount || 0) > 0) continue; // debits only
          const date = (tx.bookingDate || tx.date || '').slice(0, 10);
          const merchant = tx.description || tx.merchantName || 'Bank transaction';
          const key = `poalim-${date}-${amount}-${merchant}`;
          if (expenses.some(e => e.key === key)) continue;
          expenses.push({ id: uid(), key, date, amount, merchant, category: categorize(merchant), source: 'poalim' });
          added++;
        }
      }
      await Store.save('expenses', expenses);
      toast(added + ' bank transactions imported');
    } catch { toast('Bank import failed'); }
  }

  // ---- CSV import: Isracard / Cal / Max, auto-detect by header ----
  function parseCSVLine(line) {
    const out = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function parseDate(s) {
    s = s.trim();
    let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); // dd/mm/yyyy
    if (m) {
      const y = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : null;
  }

  function importCSV(text, expenses) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    // find header row + detect format
    let headerIdx = -1, fmt = null;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const l = lines[i];
      if (/שם בית עסק|בית עסק/.test(l) && /תאריך/.test(l)) {
        headerIdx = i;
        fmt = /סכום חיוב/.test(l) ? (/4 ספרות|מועדון/.test(l) ? 'max' : 'isracard') : 'cal';
        break;
      }
      if (/merchant|description/i.test(l) && /date/i.test(l) && /amount/i.test(l)) { headerIdx = i; fmt = 'generic'; break; }
    }
    if (headerIdx === -1) { toast('Unrecognized CSV format'); return 0; }

    const header = parseCSVLine(lines[headerIdx]);
    const col = re => header.findIndex(h => re.test(h));
    const dateCol = fmt === 'generic' ? col(/date/i) : col(/תאריך עסקה|תאריך רכישה|תאריך/);
    const merchCol = fmt === 'generic' ? col(/merchant|description/i) : col(/שם בית עסק|בית עסק/);
    const amtCol = fmt === 'generic' ? col(/amount/i) : (col(/סכום חיוב/) !== -1 ? col(/סכום חיוב/) : col(/סכום/));

    let added = 0;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      if (cells.length <= Math.max(dateCol, merchCol, amtCol)) continue;
      const date = parseDate(cells[dateCol]);
      const merchant = cells[merchCol];
      const amount = Math.abs(parseFloat(cells[amtCol].replace(/[₪,"\s]/g, '')));
      if (!date || !merchant || !amount || isNaN(amount)) continue;
      const key = `csv-${date}-${amount}-${merchant}`;
      if (expenses.some(e => e.key === key)) continue;
      expenses.push({ id: uid(), key, date, amount, merchant, category: categorize(merchant), source: fmt });
      added++;
    }
    return added;
  }

  // ---- charts ----
  function drawDonut(el, monthExp) {
    const box = $('#exp-donut', el);
    if (!monthExp.length) { box.innerHTML = '<div class="empty">No expenses this month</div>'; return; }
    const byCat = {};
    monthExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const cats = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
    const total = cats.reduce((s, c) => s + byCat[c], 0);
    let offset = 0;
    const segs = cats.map((c, i) => {
      const frac = byCat[c] / total;
      const seg = `<circle r="60" cx="80" cy="80" fill="none" stroke="${COLORS[i % COLORS.length]}"
        stroke-width="26" stroke-dasharray="${frac * 377} 377"
        stroke-dashoffset="${-offset * 377}" transform="rotate(-90 80 80)"/>`;
      offset += frac;
      return seg;
    }).join('');
    box.innerHTML = `<div class="donut-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">${segs}
        <text x="80" y="86" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700">${fmtMoney(total)}</text></svg>
      <div class="legend">${cats.map((c, i) => `
        <div class="legend-item"><span class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></span>
        ${c} · ${fmtMoney(byCat[c])} (${Math.round(byCat[c] / total * 100)}%)</div>`).join('')}</div>
    </div>`;
  }

  function drawTable(el, expenses) {
    const box = $('#exp-table', el);
    if (!expenses.length) { box.innerHTML = '<div class="empty">No transactions yet</div>'; return; }
    const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
    box.innerHTML = `<div class="table-wrap"><table>
      <tr><th>Date</th><th>Merchant</th><th>Category</th><th>Amount</th><th>Source</th><th></th></tr>
      ${sorted.map(e => `<tr>
        <td>${e.date}</td><td>${esc(e.merchant)}</td><td>${esc(e.category)}</td>
        <td>${fmtMoney(e.amount)}</td><td class="muted">${esc(e.source)}</td>
        <td><button class="btn-danger" data-del="${e.id}">✕</button></td></tr>`).join('')}
    </table></div>`;
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = expenses.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { expenses.splice(i, 1); await Store.save('expenses', expenses); render(el); }
    }));
  }

  return { render };
})();
