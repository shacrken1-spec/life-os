const Dashboard = (() => {
  async function render(el) {
    const today = todayStr();
    const [trades, workouts, habits, sleep, expenses] = await Promise.all([
      Store.load('trading'), Store.load('workout'), Store.load('habits'),
      Store.load('sleep'), Store.load('expenses')
    ]);

    const pnlToday = trades.filter(t => t.date === today).reduce((s, t) => s + (+t.pnl || 0), 0);
    const workedOut = workouts.some(w => w.date === today);
    const habitsPct = habits.length
      ? Math.round(habits.filter(h => h.last_done === today).length / habits.length * 100)
      : 0;
    const sleepEntry = sleep.find(s => s.date === today);
    const spentToday = expenses.filter(e => e.date === today).reduce((s, e) => s + (+e.amount || 0), 0);

    el.innerHTML = `
      <h1>Today</h1>
      <div class="cards">
        <div class="card"><div class="card-label">P&amp;L</div>
          <div class="card-value ${pnlToday > 0 ? 'pos' : pnlToday < 0 ? 'neg' : ''}">${fmtMoney(pnlToday)}</div></div>
        <div class="card"><div class="card-label">Workout</div>
          <div class="card-value ${workedOut ? 'pos' : ''}">${workedOut ? '✓' : '✗'}</div></div>
        <div class="card"><div class="card-label">Habits</div>
          <div class="card-value">${habitsPct}%</div></div>
        <div class="card"><div class="card-label">Sleep</div>
          <div class="card-value">${sleepEntry ? sleepEntry.hrs + 'h' : '—'}</div></div>
        <div class="card"><div class="card-label">Spent today</div>
          <div class="card-value">${fmtMoney(spentToday)}</div></div>
      </div>
      ${Auth.isSignedIn() ? '' : '<p class="muted" style="margin-top:16px">Sign in with Google to sync your data to Drive.</p>'}`;
  }
  return { render };
})();
