const Workout = (() => {
  async function render(el) {
    const sets = await Store.load('workout');
    const today = todayStr();

    el.innerHTML = `
      <h1>Workout</h1>
      <form id="wo-form" class="form-grid">
        <div><label>Date</label><input name="date" type="date" value="${today}" required></div>
        <div><label>Exercise</label><input name="exercise" required placeholder="Squat"></div>
        <div><label>Sets</label><input name="sets" type="number" min="1" required></div>
        <div><label>Reps</label><input name="reps" type="number" min="1" required></div>
        <div><label>Weight (kg)</label><input name="weight" type="number" step="any" min="0" required></div>
        <div class="full"><label>Notes</label><input name="notes"></div>
        <div class="full"><button class="btn btn-accent" type="submit">Log set</button></div>
      </form>
      <h2>Today's session</h2>
      <div id="wo-today"></div>
      <h2>PR tracker</h2>
      <div id="wo-prs"></div>
      <h2>Weekly volume</h2>
      <div id="wo-volume"></div>`;

    $('#wo-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      sets.push({
        id: uid(), date: f.get('date'),
        exercise: f.get('exercise').trim(),
        sets: +f.get('sets'), reps: +f.get('reps'), weight: +f.get('weight'),
        notes: f.get('notes').trim()
      });
      await Store.save('workout', sets);
      render(el);
    });

    // today
    const todays = sets.filter(s => s.date === today);
    $('#wo-today', el).innerHTML = todays.length
      ? `<div class="table-wrap"><table>
          <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th>Notes</th><th></th></tr>
          ${todays.map(s => `<tr><td>${esc(s.exercise)}</td><td>${s.sets}</td><td>${s.reps}</td>
            <td>${s.weight}kg</td><td>${esc(s.notes)}</td>
            <td><button class="btn-danger" data-del="${s.id}">✕</button></td></tr>`).join('')}</table></div>`
      : '<div class="empty">No sets logged today</div>';
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = sets.findIndex(s => s.id === b.dataset.del);
      if (i > -1) { sets.splice(i, 1); await Store.save('workout', sets); render(el); }
    }));

    // PRs: max weight per exercise
    const prs = {};
    sets.forEach(s => {
      if (!prs[s.exercise] || s.weight > prs[s.exercise].weight) prs[s.exercise] = s;
    });
    const prKeys = Object.keys(prs).sort();
    $('#wo-prs', el).innerHTML = prKeys.length
      ? `<div class="table-wrap"><table>
          <tr><th>Exercise</th><th>Best weight</th><th>Reps</th><th>Date</th></tr>
          ${prKeys.map(k => `<tr><td>${esc(k)}</td><td class="pos">${prs[k].weight}kg</td>
            <td>${prs[k].reps}</td><td>${prs[k].date}</td></tr>`).join('')}</table></div>`
      : '<div class="empty">No PRs yet</div>';

    // weekly volume: last 8 ISO weeks, sets*reps*weight
    const weeks = {};
    sets.forEach(s => {
      const d = new Date(s.date);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      const wk = d.toISOString().slice(0, 10);
      weeks[wk] = (weeks[wk] || 0) + s.sets * s.reps * s.weight;
    });
    const wkKeys = Object.keys(weeks).sort().slice(-8);
    const volBox = $('#wo-volume', el);
    if (!wkKeys.length) { volBox.innerHTML = '<div class="empty">No volume yet</div>'; return; }
    const max = Math.max(...wkKeys.map(k => weeks[k]), 1);
    volBox.innerHTML = `<div class="bar-chart">${wkKeys.map(k => `
      <div class="bar-col" title="Week of ${k}: ${Math.round(weeks[k]).toLocaleString()}kg">
        <div class="bar" style="height:${Math.max(weeks[k] / max * 100, 3)}%"></div>
        <div class="bar-label">${k.slice(5)}</div>
      </div>`).join('')}</div>`;
  }
  return { render };
})();
