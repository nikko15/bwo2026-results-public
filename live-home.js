"use strict";
const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const publicSportLabel = (value) => String(value ?? "").replace(/\b(?:Urban )?Street Soccer\b/g, "Soccer");
const dateLabel = (day) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
const timeLabel = (minute) => {
  if (minute == null) return "Zeit folgt";

  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
    minute % 60,
  ).padStart(2, "0")} Uhr`;
};
const icon = (kind) => {
  const body =
    kind === "home"
      ? `<path d="M8 29 32 9l24 20M15 25v30h34V25M26 55V37h12v18"/>`
      : kind === "calendar"
        ? `<rect x="10" y="14" width="44" height="42" rx="4"/>
           <path d="M10 27h44M22 8v13M42 8v13M21 37h6m10 0h6M21 46h6"/>`
        : kind === "beach"
          ? `<path d="M7 28v29M57 28v29M7 33h50M7 48h50M17 33v15m10-15v15m10-15v15m10-15v15"/>
             <circle cx="34" cy="15" r="10"/>
             <path d="m25 12 12 1 5 8m-5-8 1-7M30 24l7-11"/>`
          : `<circle cx="32" cy="32" r="24"/>
             <path d="m32 21 11 8-4 13H25l-4-13 11-8ZM32 21V8M43 29l12-5M39 42l7 10M25 42l-7 10M21 29 9 24"/>`;

  return `<svg viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true">${body}</svg>`;
};
const matchCard = (m) => {
  const scores =
    m.scores?.length
      ? `<div class="score-line">
          <span>${m.sport === "Beachvolleyball" ? "Sätze" : "Abschnitte"}</span>
          ${m.scores
            .map((s) => `<strong>${s.scoreA}:${s.scoreB}</strong>`)
            .join("")}
        </div>`
      : "";

  const penalty = m.penalty
    ? `<div class="score-line">
        <span>Penaltyschießen</span>
        <strong>${m.penalty.scoreA}:${m.penalty.scoreB}</strong>
      </div>`
    : "";

  const status =
    {
      SCHEDULED: "GEPLANT",
      LIVE: "LIVE",
      RESULT_ENTERED: "ERGEBNIS EINGETRAGEN",
      FINAL: "BEENDET",
    }[m.status] ?? m.status;

  return `
<article class="match-card${m.status === "LIVE" ? " is-live" : ""}">
  <div class="match-top">
    <span class="status status-${esc(m.status)}">
      ${m.status === "LIVE" ? '<span class="live-dot"></span>' : ""}
      ${esc(status)}
    </span>

    <span>
      ${m.day ? `${dateLabel(m.day)} · ` : ""}
      ${timeLabel(m.minute)}
    </span>
  </div>

  <div class="match-meta">
    ${icon(m.sport === "Beachvolleyball" ? "beach" : "soccer")}
    <span>${esc(publicSportLabel(m.sport))} · <strong>${esc(m.category)}</strong></span>
  </div>

  <div class="match-teams">
    <strong>${esc(m.teamA)}</strong>
    <span class="versus">–</span>
    <strong>${esc(m.teamB)}</strong>
  </div>

  ${scores}
  ${penalty}

  <div class="match-bottom">
    <span>${esc(m.court ?? "Spielort folgt")}</span>
    ${m.number ? `<span>${esc(m.number)}</span>` : ""}
  </div>
</article>`;
};
const selectHomeMatches = function selectHomeMatches(matches) {
  const live = matches.filter((m) => m.status === "LIVE");
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" && m.day && m.minute != null)
    .sort((a, b) => a.day.localeCompare(b.day) || a.minute - b.minute)
    .slice(0, 4);
  return { live, upcoming };
};
(function startLiveHome(browser = globalThis) {
  const grid = browser.document.querySelector("[data-home-matches]");
  const heading = browser.document.querySelector("[data-home-heading]");
  if (!grid || !heading) return;
  const url = new URL("data/olympix.json", browser.document.baseURI);
  let loading = false;
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const response = await browser.fetch(url, {
        cache: "no-store",
        signal: browser.AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Snapshot konnte nicht geladen werden.");
      const snapshot = await response.json();
      if (!Array.isArray(snapshot.event?.matches)) throw new Error("Ungültiger Ergebnis-Snapshot.");
      const { live, upcoming } = selectHomeMatches(snapshot.event.matches);
      const html = [...live, ...upcoming].map(matchCard).join("");
      // Preserve the static fallback (or last good data) if fetching/rendering fails.
      if (grid.innerHTML !== html) grid.innerHTML = html;
      heading.textContent = live.length ? "Live & als Nächstes" : "Als Nächstes";
    } catch {
      browser.console.warn("Live-Ergebnisse derzeit nicht verfügbar; erneuter Versuch folgt.");
    } finally {
      loading = false;
    }
  }
  void refresh();
  browser.setInterval(() => void refresh(), 15_000);
})();
