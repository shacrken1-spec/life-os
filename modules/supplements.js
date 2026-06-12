const Supplements = (() => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  async function render(el) {
    const supps = await Store.load('supplements');
    const today = todayStr();
    const dow = new Date().getDay();

    el.innerHTML = `
      <h1>Supplements</h1>
      <form id="supp-form" class="form-grid">
        <div><label>Name</label><input name="name" required placeholder="Vitamin D"></div>
        <div><label>Dose</label><input name="dose" required placeholder="2000 IU"></div>
        <div><label>Time</label><select name="time"><option>Morning</option><option>Noon</option><option>Evening</option></select></div>
        <div class="full"><label>Days</label>
          <div class="row-actions">${DAYS.map((d, i) =>
            `<label style="display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text)">
              <input type="checkbox" name="day${i}" checked style="width:18px;min-height:18px;height:18px"> ${d}</label>`).join('')}
          </div></div>
        <div class="full"><button class="btn btn-accent" type="submit">Add supplement</button></div>
      </form>
      <h2>Today's checklist</h2>
      <div id="supp-list"></div>`;

    $('#supp-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      supps.push({
        id: uid(),
        name: f.get('name').trim(),
        dose: f.get('dose').trim(),
        time: f.get('time'),
        days: DAYS.map((_, i) => f.get('day' + i) ? i : -1).filter(i => i > -1),
        taken: {}
      });
      await Store.save('supplements', supps);
      render(el);
    });

    const todaySupps = supps.filter(s => (s.days || []).includes(dow));
    const list = $('#supp-list', el);
    list.innerHTML = todaySupps.length ? todaySupps.map(s => `
      <div class="check-row">
        <button class="checkbox ${s.taken && s.taken[today] ? 'on' : ''}" data-check="${s.id}" aria-label="Mark taken">✓</button>
        <div class="grow">
          <div>${esc(s.name)} <span class="muted">${esc(s.dose)}</span></div>
          <div class="sub">${esc(s.time)} · ${(s.days || []).map(i => DAYS[i]).join(' ')}</div>
        </div>
        <button class="btn-danger icon-btn" data-del="${s.id}" aria-label="Delete">✕</button>
      </div>`).join('') : '<div class="empty">Nothing scheduled today</div>';

    list.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', async () => {
      const s = supps.find(x => x.id === b.dataset.check);
      s.taken = s.taken || {};
      if (s.taken[today]) delete s.taken[today]; else s.taken[today] = true;
      await Store.save('supplements', supps);
      render(el);
    }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = supps.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { supps.splice(i, 1); await Store.save('supplements', supps); render(el); }
    }));
  }
  return { render };
})();
