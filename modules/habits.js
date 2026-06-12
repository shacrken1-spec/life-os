const Habits = (() => {
  async function render(el) {
    const habits = await Store.load('habits');
    const today = todayStr();

    el.innerHTML = `
      <h1>Habits</h1>
      <form id="habit-form" class="form-grid">
        <div class="full"><label>New habit</label><input name="name" required placeholder="Read 20 min"></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add habit</button></div>
      </form>
      <h2>Today</h2>
      <div id="habit-list"></div>
      <h2>Last 28 days</h2>
      <div id="habit-heat"></div>`;

    $('#habit-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const name = new FormData(e.target).get('name').trim();
      if (!name) return;
      habits.push({ id: uid(), name, streak: 0, last_done: null, history: [] });
      await Store.save('habits', habits);
      render(el);
    });

    const list = $('#habit-list', el);
    list.innerHTML = habits.length ? habits.map(h => `
      <div class="check-row">
        <button class="checkbox ${h.last_done === today ? 'on' : ''}" data-check="${h.id}" aria-label="Mark done">✓</button>
        <div class="grow">
          <div>${esc(h.name)}</div>
          <div class="sub">🔥 ${h.streak} day streak</div>
        </div>
        <button class="btn-danger icon-btn" data-del="${h.id}" aria-label="Delete">✕</button>
      </div>`).join('') : '<div class="empty">No habits yet</div>';

    list.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', async () => {
      const h = habits.find(x => x.id === b.dataset.check);
      h.history = h.history || [];
      if (h.last_done === today) {
        h.history = h.history.filter(d => d !== today);
        h.last_done = h.history[h.history.length - 1] || null;
        h.streak = Math.max(0, h.streak - 1);
      } else {
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        h.streak = h.last_done === yesterday ? h.streak + 1 : 1;
        h.last_done = today;
        if (!h.history.includes(today)) h.history.push(today);
      }
      await Store.save('habits', habits);
      render(el);
    }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = habits.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { habits.splice(i, 1); await Store.save('habits', habits); render(el); }
    }));

    // heatmap: a day is "on" if every habit done that day (or any, if you prefer); use: any habit done
    const days = [];
    for (let i = 27; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    const doneSet = new Set();
    habits.forEach(h => (h.history || []).forEach(d => doneSet.add(d)));
    $('#habit-heat', el).innerHTML = `<div class="heatmap">${days.map(d =>
      `<div class="heat-cell ${doneSet.has(d) ? 'on' : ''} ${d === today ? 'today' : ''}" title="${d}"></div>`).join('')}</div>`;
  }
  return { render };
})();
