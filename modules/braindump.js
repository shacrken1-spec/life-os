const Braindump = (() => {
  // Google AI Studio key (free tier): https://aistudio.google.com/apikey
  const GEMINI_KEY = 'YOUR_GEMINI_API_KEY';
  const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  async function render(el) {
    const entries = await Store.load('braindump');

    el.innerHTML = `
      <h1>Brain Dump</h1>
      <form id="bd-form">
        <label>What's on your mind?</label>
        <textarea name="text" rows="5" required placeholder="Dump everything here…"></textarea>
        <div class="row-actions"><button class="btn btn-accent" type="submit">Save entry</button></div>
      </form>
      <div id="bd-list"></div>`;

    $('#bd-form', el).addEventListener('submit', async e => {
      e.preventDefault();
      const text = new FormData(e.target).get('text').trim();
      if (!text) return;
      const now = new Date();
      entries.push({
        id: uid(),
        date: todayStr(),
        ts: now.toISOString(),
        text,
        summary: null
      });
      await Store.save('braindump', entries);
      render(el);
    });

    const list = $('#bd-list', el);
    if (!entries.length) { list.innerHTML = '<div class="empty">No entries yet</div>'; return; }
    const sorted = [...entries].sort((a, b) => b.ts.localeCompare(a.ts));
    list.innerHTML = sorted.map(d => `
      <div class="card" style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="muted">${new Date(d.ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          <div>
            <button class="btn" data-sum="${d.id}" style="min-height:36px;padding:6px 12px">${d.summary ? 'Re-summarize' : 'Summarize'}</button>
            <button class="btn-danger" data-del="${d.id}" aria-label="Delete" style="min-width:44px;min-height:44px">✕</button>
          </div>
        </div>
        <div style="white-space:pre-wrap;margin-top:8px">${esc(d.text)}</div>
        ${d.summary ? `<div style="margin-top:10px;padding:10px;background:var(--accent-dim);border-radius:8px;white-space:pre-wrap;font-size:14px"><strong>✦ Summary</strong>\n${esc(d.summary)}</div>` : ''}
      </div>`).join('');

    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const i = entries.findIndex(x => x.id === b.dataset.del);
      if (i > -1) { entries.splice(i, 1); await Store.save('braindump', entries); render(el); }
    }));
    list.querySelectorAll('[data-sum]').forEach(b => b.addEventListener('click', async () => {
      const d = entries.find(x => x.id === b.dataset.sum);
      b.textContent = 'Summarizing…';
      b.disabled = true;
      const summary = await summarize(d.text);
      if (summary) {
        d.summary = summary;
        await Store.save('braindump', entries);
        render(el);
      } else {
        b.textContent = 'Summarize';
        b.disabled = false;
      }
    }));
  }

  async function summarize(text) {
    if (GEMINI_KEY === 'YOUR_GEMINI_API_KEY') { toast('Set your Gemini API key in modules/braindump.js'); return null; }
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text:
            'Extract from this brain dump:\n1. Key insights (bullets)\n2. Action items (bullets)\nBe concise. Same language as the input.\n\n---\n' + text }] }]
        })
      });
      if (!res.ok) throw new Error('Gemini ' + res.status);
      const data = await res.json();
      return data.candidates[0].content.parts.map(p => p.text || '').join('').trim();
    } catch {
      toast('Summarize failed — check API key / quota');
      return null;
    }
  }

  return { render };
})();
