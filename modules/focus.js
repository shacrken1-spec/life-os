const Focus = (() => {
  // timer state lives at module scope so it keeps running across navigation
  const T = {
    mode: 'idle',        // idle | focus | break
    focusMin: 25,
    breakMin: 5,
    endsAt: null,
    interval: null
  };

  function fmt(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function remaining() {
    return Math.max(0, Math.round((T.endsAt - Date.now()) / 1000));
  }

  async function logSession(minutes) {
    const sessions = await Store.load('focus');
    sessions.push({ id: uid(), date: todayStr(), minutes });
    await Store.save('focus', sessions);
  }

  function start(mode) {
    T.mode = mode;
    T.endsAt = Date.now() + (mode === 'focus' ? T.focusMin : T.breakMin) * 60000;
    clearInterval(T.interval);
    T.interval = setInterval(tick, 1000);
    tick();
  }

  function stop() {
    clearInterval(T.interval);
    T.mode = 'idle';
    T.endsAt = null;
    updateDisplay();
  }

  async function tick() {
    if (remaining() <= 0) {
      const finished = T.mode;
      clearInterval(T.interval);
      if (finished === 'focus') {
        await logSession(T.focusMin);
        toast(`Focus done — ${T.breakMin} min break`);
        start('break');
        refreshStats();
        return;
      }
      toast('Break over — back to focus');
      start('focus');
      return;
    }
    updateDisplay();
  }

  function updateDisplay() {
    const time = document.getElementById('focus-time');
    if (!time) return;
    time.textContent = T.mode === 'idle' ? fmt(T.focusMin * 60) : fmt(remaining());
    const label = document.getElementById('focus-label');
    label.textContent = T.mode === 'idle' ? 'Ready' : T.mode === 'focus' ? 'Focus' : 'Break';
    label.style.color = T.mode === 'focus' ? 'var(--accent)' : 'var(--text-dim)';
    document.getElementById('focus-start').hidden = T.mode !== 'idle';
    document.getElementById('focus-stop').hidden = T.mode === 'idle';
  }

  async function refreshStats() {
    const box = document.getElementById('focus-stats');
    if (!box) return;
    const sessions = await Store.load('focus');
    const today = todayStr();
    const todayMin = sessions.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);

    const days = [];
    for (let i = 6; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    const perDay = days.map(d => sessions.filter(s => s.date === d).reduce((a, s) => a + s.minutes, 0));
    const max = Math.max(...perDay, 60);

    box.innerHTML = `
      <h2>Today</h2>
      <div class="cards"><div class="card">
        <div class="card-label">Focus time</div>
        <div class="card-value">${Math.floor(todayMin / 60)}h ${todayMin % 60}m</div>
      </div></div>
      <h2>This week</h2>
      <div class="bar-chart">${days.map((d, i) => `
        <div class="bar-col" title="${d}: ${(perDay[i] / 60).toFixed(1)}h">
          <div class="bar" style="height:${Math.max(perDay[i] / max * 100, perDay[i] ? 3 : 0)}%"></div>
          <div class="bar-label">${'SMTWTFS'[new Date(d).getDay()]}</div>
        </div>`).join('')}</div>`;
  }

  async function render(el) {
    el.innerHTML = `
      <h1>Focus</h1>
      <div class="card" style="text-align:center;padding:28px">
        <div id="focus-label" class="muted">Ready</div>
        <div id="focus-time" style="font-size:56px;font-weight:700;font-variant-numeric:tabular-nums">${fmt(T.focusMin * 60)}</div>
        <div class="row-actions" style="justify-content:center">
          <button id="focus-start" class="btn btn-accent">Start focus</button>
          <button id="focus-stop" class="btn btn-danger" hidden>Stop</button>
        </div>
        <div class="form-grid" style="max-width:340px;margin:8px auto 0">
          <div><label>Focus (min)</label><input id="focus-len" type="number" min="1" max="120" value="${T.focusMin}"></div>
          <div><label>Break (min)</label><input id="break-len" type="number" min="1" max="60" value="${T.breakMin}"></div>
        </div>
      </div>
      <div id="focus-stats"></div>`;

    $('#focus-start', el).addEventListener('click', () => {
      T.focusMin = Math.max(1, +$('#focus-len', el).value || 25);
      T.breakMin = Math.max(1, +$('#break-len', el).value || 5);
      start('focus');
    });
    $('#focus-stop', el).addEventListener('click', stop);
    $('#focus-len', el).addEventListener('change', () => {
      T.focusMin = Math.max(1, +$('#focus-len', el).value || 25);
      if (T.mode === 'idle') updateDisplay();
    });
    $('#break-len', el).addEventListener('change', () => {
      T.breakMin = Math.max(1, +$('#break-len', el).value || 5);
    });

    updateDisplay();
    await refreshStats();
  }

  return { render };
})();
