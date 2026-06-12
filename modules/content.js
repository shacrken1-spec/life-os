const Content = (() => {
  const TYPES = ['book', 'course', 'podcast'];
  const STATUSES = ['reading', 'done', 'paused'];
  const ICONS = { book: '📖', course: '🎓', podcast: '🎧' };

  async function render(el) {
    const items = await Store.load('content');

    el.innerHTML = `
      <h1>Books &amp; Content</h1>
      <form id="ct-form" class="form-grid">
        <div class="full"><label>Title</label><input name="title" required placeholder="Deep Work"></div>
        <div><label>Type</label><select name="type">${TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
        <div><label>Status</label><select name="status">${STATUSES.map(s => `<option>${s}</option>`).join('')}</select></div>
        <div><label>Progress %</label><input name="progress" type="number" min="0" max="100" value="0" required></div>
        <div><label>Rating (1-5)</label><select name="rating"><option value="">—</option>${[1,2,3,4,5].map(n => `<option>${n}</option>`).join('')}</select></div>
        <div class="full"><label>Notes</label><input name="notes"></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add item</button></div>
      </form>
      <div id="ct-grid" class="cards" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))"></div>`;

    $('#ct-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      items.push({
        id: uid(),
        title: f.get('title').trim(),
        type: f.get('type'),
        status: f.get('status'),
        progress: Math.min(100, Math.max(0, +f.get('progress'))),
        rating: f.get('rating') ? +f.get('rating') : null,
        notes: f.get('notes').trim()
      });
      await Store.save('content', items);
      render(el);
    });

    const grid = $('#ct-grid', el);
    if (!items.length) { grid.outerHTML = '<div class="empty">Nothing tracked yet</div>'; return; }
    const order = { reading: 0, paused: 1, done: 2 };
    const sorted = [...items].sort((a, b) => order[a.status] - order[b.status]);
    grid.innerHTML = sorted.map(c => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <strong>${ICONS[c.type] || ''} ${esc(c.title)}</strong>
          <button class="btn-danger" data-del="${c.id}" aria-label="Delete" style="min-width:44px;min-height:44px">✕</button>
        </div>
        <div class="muted" style="margin:2px 0 8px">
          ${esc(c.type)} · ${esc(c.status)}${c.rating ? ' · ' + '★'.repeat(c.rating) : ''}
        </div>
        <div class="progress"><div style="width:${c.progress}%"></div></div>
        <div class="muted" style="margin-top:4px">${c.progress}%</div>
        ${c.notes ? `<div class="muted" style="margin-top:6px">${esc(c.notes)}</div>` : ''}
        <div class="row-actions" style="margin-bottom:0">
          <input type="number" min="0" max="100" data-prog-val="${c.id}" placeholder="%" style="max-width:90px">
          <button class="btn" data-prog="${c.id}">Update</button>
          <select data-status="${c.id}" style="max-width:120px">
            ${STATUSES.map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>`).join('');

    grid.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = items.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { items.splice(i, 1); await Store.save('content', items); render(el); }
    }));
    grid.querySelectorAll('[data-prog]').forEach(b => b.addEventListener('click', async () => {
      const input = $(`[data-prog-val="${b.dataset.prog}"]`, grid);
      if (input.value === '') return;
      const c = items.find(x => x.id === b.dataset.prog);
      c.progress = Math.min(100, Math.max(0, +input.value));
      if (c.progress === 100) c.status = 'done';
      await Store.save('content', items);
      render(el);
    }));
    grid.querySelectorAll('[data-status]').forEach(s => s.addEventListener('change', async () => {
      const c = items.find(x => x.id === s.dataset.status);
      c.status = s.value;
      await Store.save('content', items);
      render(el);
    }));
  }
  return { render };
})();
