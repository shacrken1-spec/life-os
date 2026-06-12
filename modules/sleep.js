const Sleep = (() => {
  async function render(el) {
    const entries = await Store.load('sleep');

    el.innerHTML = `
      <h1>Sleep</h1>
      <form id="sleep-form" class="form-grid">
        <div><label>Date</label><input name="date" type="date" value="${todayStr()}" required></div>
        <div><label>Hours</label><input name="hrs" type="number" step="0.25" min="0" max="24" required></div>
        <div><label>Mood (1-5)</label><select name="mood">${[1,2,3,4,5].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div><label>Energy (1-5)</label><select name="energy">${[1,2,3,4,5].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="full"><button class="btn btn-accent" type="submit">Log sleep</button></div>
      </form>
      <h2>Last 30 days</h2>
      <div id="sleep-trend"></div>
      <div id="sleep-table" style="margin-top:16px"></div>`;

    $('#sleep-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const date = f.get('date');
      const entry = { date, hrs: +f.get('hrs'), mood: +f.get('mood'), energy: +f.get('energy') };
      const i = entries.findIndex(s => s.date === date);
      if (i > -1) entries[i] = entry; else entries.push(entry);
      await Store.save('sleep', entries);
      render(el);
    });

    const last30 = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    const trend = $('#sleep-trend', el);
    if (!last30.length) { trend.innerHTML = '<div class="empty">No sleep logged yet</div>'; return; }
    const max = Math.max(...last30.map(s => s.hrs), 9);
    trend.innerHTML = `<div class="bar-chart">${last30.map(s => `
      <div class="bar-col" title="${s.date}: ${s.hrs}h, mood ${s.mood}, energy ${s.energy}">
        <div class="bar" style="height:${Math.max(s.hrs / max * 100, 3)}%"></div>
      </div>`).join('')}</div>
      <p class="muted" style="margin-top:8px">Avg: ${(last30.reduce((a, s) => a + s.hrs, 0) / last30.length).toFixed(1)}h
      · Mood ${(last30.reduce((a, s) => a + s.mood, 0) / last30.length).toFixed(1)}
      · Energy ${(last30.reduce((a, s) => a + s.energy, 0) / last30.length).toFixed(1)}</p>`;

    $('#sleep-table', el).innerHTML = `<div class="table-wrap"><table>
      <tr><th>Date</th><th>Hours</th><th>Mood</th><th>Energy</th></tr>
      ${[...last30].reverse().slice(0, 10).map(s =>
        `<tr><td>${s.date}</td><td>${s.hrs}h</td><td>${s.mood}</td><td>${s.energy}</td></tr>`).join('')}
    </table></div>`;
  }
  return { render };
})();
