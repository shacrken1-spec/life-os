const Dashboard = (() => {
  async function render(el) {
    const today = todayStr();
    const [trades, workouts, habits, content, dumps, focus] = await Promise.all([
      Store.load('trading'), Store.load('workout'), Store.load('habits'),
      Store.load('content'), Store.load('braindump'), Store.load('focus')
    ]);

    const pnlToday = trades.filter(t => t.date === today).reduce((s, t) => s + (+t.pnl || 0), 0);
    const workedOut = workouts.some(w => w.date === today);
    const habitsPct = habits.length
      ? Math.round(habits.filter(h => h.last_done === today).length / habits.length * 100)
      : 0;
    const activeContent = content.filter(c => c.status === 'reading').length;
    const dumpedToday = dumps.some(d => d.date === today);
    const focusMin = focus.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);

    el.innerHTML = `
      <h1>Today</h1>
      <div class="cards">
        <div class="card"><div class="card-label">P&amp;L</div>
          <div class="card-value ${pnlToday > 0 ? 'pos' : pnlToday < 0 ? 'neg' : ''}">${fmtMoney(pnlToday)}</div></div>
        <div class="card"><div class="card-label">Workout</div>
          <div class="card-value ${workedOut ? 'pos' : ''}">${workedOut ? '✓' : '✗'}</div></div>
        <div class="card"><div class="card-label">Habits</div>
          <div class="card-value">${habitsPct}%</div></div>
        <div class="card"><div class="card-label">In progress</div>
          <div class="card-value">${activeContent}</div></div>
        <div class="card"><div class="card-label">Brain dump</div>
          <div class="card-value ${dumpedToday ? 'pos' : ''}">${dumpedToday ? '✓' : '✗'}</div></div>
        <div class="card"><div class="card-label">Focus</div>
          <div class="card-value">${Math.floor(focusMin / 60)}h ${focusMin % 60}m</div></div>
      </div>
      ${Auth.isSignedIn() ? '' : '<p class="muted" style="margin-top:16px">Sign in with Google to sync your data to Drive.</p>'}`;
  }
  return { render };
})();
