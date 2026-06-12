const Goals = (() => {
  async function render(el) {
    const goals = await Store.load('goals');

    el.innerHTML = `
      <h1>Goals</h1>
      <form id="goal-form" class="form-grid">
        <div class="full"><label>Title</label><input name="title" required placeholder="Save for emergency fund"></div>
        <div><label>Target</label><input name="target" type="number" step="any" required></div>
        <div><label>Current</label><input name="current" type="number" step="any" value="0" required></div>
        <div><label>Unit</label><input name="unit" placeholder="₪ / kg / books"></div>
        <div><label>Deadline</label><input name="deadline" type="date"></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add goal</button></div>
      </form>
      <div id="goal-list"></div>`;

    $('#goal-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      goals.push({
        id: uid(),
        title: f.get('title').trim(),
        target: +f.get('target'),
        current: +f.get('current'),
        unit: f.get('unit').trim(),
        deadline: f.get('deadline') || null
      });
      await Store.save('goals', goals);
      render(el);
    });

    const list = $('#goal-list', el);
    if (!goals.length) { list.innerHTML = '<div class="empty">No goals yet</div>'; return; }
    list.innerHTML = goals.map(g => {
      const pct = g.target ? Math.min(100, Math.round(g.current / g.target * 100)) : 0;
      const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - Date.now()) / 864e5) : null;
      return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong>${esc(g.title)}</strong>
          <button class="btn-danger" data-del="${g.id}" aria-label="Delete" style="min-width:44px;min-height:44px">✕</button>
        </div>
        <div class="muted" style="margin:4px 0 8px">
          ${g.current} / ${g.target} ${esc(g.unit)} · ${pct}%
          ${daysLeft != null ? ` · ${daysLeft >= 0 ? daysLeft + ' days left' : 'overdue'}` : ''}
        </div>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <div class="row-actions" style="margin-bottom:0">
          <input type="number" step="any" data-upd-val="${g.id}" placeholder="New current" style="max-width:150px">
          <button class="btn" data-upd="${g.id}">Update</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = goals.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { goals.splice(i, 1); await Store.save('goals', goals); render(el); }
    }));
    list.querySelectorAll('[data-upd]').forEach(b => b.addEventListener('click', async () => {
      const input = $(`[data-upd-val="${b.dataset.upd}"]`, list);
      if (input.value === '') return;
      const g = goals.find(x => x.id === b.dataset.upd);
      g.current = +input.value;
      await Store.save('goals', goals);
      render(el);
    }));
  }
  return { render };
})();
