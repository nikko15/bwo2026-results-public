(() => {
  const root = document.querySelector('[data-competition-slug]');
  if (!root) return;

  const slug = root.dataset.competitionSlug;
  const grid = document.querySelector('.match-grid');
  const title = document.querySelector('h1');
  const REFRESH_MS = 15000;

  const statusLabels = {
    SCHEDULED: 'GEPLANT',
    LIVE: 'LIVE',
    RESULT_ENTERED: 'ERGEBNIS',
    FINAL: 'BEENDET',
    CANCELLED: 'ABGESAGT'
  };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function formatDate(day, minute) {
    const date = new Date(`${day}T00:00:00`);
    const dateText = new Intl.DateTimeFormat('de-DE', {
      day: 'numeric', month: 'long', timeZone: 'Europe/Berlin'
    }).format(date);
    const h = String(Math.floor(minute / 60)).padStart(2, '0');
    const m = String(minute % 60).padStart(2, '0');
    return `${dateText} · ${h}:${m} Uhr`;
  }

  function matchNumber(value) {
    const n = String(value ?? '').match(/\d+/);
    return n ? Number(n[0]) : 9999;
  }

  function renderMatch(match) {
    const status = match.status || 'SCHEDULED';
    const live = status === 'LIVE';
    const scores = Array.isArray(match.scores) ? match.scores : [];
    const scoreLabel = match.competitionSlug.startsWith('beachvolleyball-') ? 'Sätze' : 'Abschnitte';
    const scoreHtml = scores.length
      ? `<div class="score-line"><span>${scoreLabel}</span>${scores.map(s => `<strong>${esc(s.scoreA)}:${esc(s.scoreB)}</strong>`).join('')}</div>`
      : '';
    const penaltyHtml = match.penalty
      ? `<div class="score-line"><span>Penaltyschießen</span><strong>${esc(match.penalty.scoreA)}:${esc(match.penalty.scoreB)}</strong></div>`
      : '';

    return `<article class="match-card${live ? ' is-live' : ''}">
      <div class="match-top">
        <span class="status status-${esc(status)}">${live ? '<span class="live-dot"></span>' : ''}${esc(statusLabels[status] || status)}</span>
        <span>${esc(formatDate(match.day, match.minute))}</span>
      </div>
      <div class="match-meta"><span>${esc(match.sport)} · <strong>${esc(match.category)}</strong></span></div>
      <div class="match-teams"><strong>${esc(match.teamA || 'Noch offen')}</strong><span class="versus">–</span><strong>${esc(match.teamB || 'Noch offen')}</strong></div>
      ${scoreHtml}${penaltyHtml}
      <div class="match-bottom"><span>${esc(match.court || '')}</span><span>${esc(match.number || '')}</span></div>
    </article>`;
  }

  async function refresh() {
    try {
      const response = await fetch(`../data/olympix.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const competition = data.event.competitions.find(c => c.slug === slug);
      if (!competition) throw new Error(`Competition not found: ${slug}`);
      const matches = data.event.matches
        .filter(m => m.competitionSlug === slug)
        .sort((a, b) => a.day.localeCompare(b.day) || a.minute - b.minute || matchNumber(a.number) - matchNumber(b.number));

      if (title) title.textContent = competition.name;
      if (grid) grid.innerHTML = matches.map(renderMatch).join('');
      document.documentElement.dataset.generatedAt = data.generatedAt || '';
    } catch (error) {
      console.error('Live results refresh failed:', error);
    }
  }

  void refresh();
  setInterval(() => void refresh(), REFRESH_MS);
})();
