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
const localNow = function localNow(now, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const part = (name) => parts.find(p => p.type === name).value;
    return { day: part("year") + "-" + part("month") + "-" + part("day"), minute: Number(part("hour")) * 60 + Number(part("minute")) };
};
const selectHome = function selectHome(matches, start, end, now, timeZone) {
    const today = localNow(now, timeZone);
    const scheduled = matches.filter(m => m.day !== null && m.minute !== null).sort((a, b) => a.day.localeCompare(b.day) || a.minute - b.minute || a.id.localeCompare(b.id));
    const days = [...new Set(scheduled.map(m => m.day))].sort();
    // Before/after the event, show a clearly labelled event day, never a fictitious "today".
    let day = today.day < start ? (days.find(d => d >= start) ?? start) : today.day > end ? (days.at(-1) ?? end) : today.day;
    const live = matches.filter(m => m.status === "LIVE").sort((a, b) => (a.day ?? "").localeCompare(b.day ?? "") || (a.minute ?? 0) - (b.minute ?? 0) || a.id.localeCompare(b.id));
    // LIVE status remains authoritative. Outside event dates, its latest known
    // placement anchors the preview; within the event, never move behind real time.
    const anchor = scheduled.filter(m => m.status === "LIVE").at(-1);
    let reference = today;
    if (anchor && (today.day < start || today.day > end || anchor.day > today.day || (anchor.day === today.day && anchor.minute > today.minute))) {
        reference = { day: anchor.day, minute: anchor.minute };
        if (today.day < start || today.day > end)
            day = reference.day;
    }
    const upcoming = scheduled.filter(m => m.status === "SCHEDULED" && (m.day > reference.day || (m.day === reference.day && m.minute >= reference.minute))).slice(0, 4);
    const onDay = scheduled.filter(m => m.day === day);
    const remaining = onDay.filter(m => m.status === "LIVE" || (day === today.day && m.minute >= today.minute));
    const daily = day === today.day && remaining.length ? remaining.slice(0, 6) : onDay.slice(day === today.day ? -6 : 0, day === today.day ? undefined : 6);
    return { day, isToday: day === today.day, live, upcoming, daily };
};
const publicFilters = function publicFilters(sport, category) {
    return { sport: sport === "beachvolleyball" || sport === "street-soccer" ? sport : "alle", category: category === "maenner" || category === "frauen" ? category : "alle" };
};
const scheduleDays = function scheduleDays(matches) {
    return [...new Set(matches.flatMap(m => m.day !== null && m.minute !== null ? [m.day] : []))].sort();
};
const filterSchedule = function filterSchedule(matches, day, sport, category) {
    return matches.filter(m => m.day === day && m.minute !== null && (sport === "alle" || m.sport === (sport === "beachvolleyball" ? "Beachvolleyball" : "Urban Street Soccer")) && (category === "alle" || m.category === (category === "maenner" ? "Männer" : "Frauen")))
        .sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id));
};
const scheduleQuery = function scheduleQuery(day, sport, category) {
    return "?" + new URLSearchParams({ tag: day, sportart: sport, kategorie: category }).toString();
};
const scheduleView = function scheduleView(event, query, now = new Date()) {
  // The shared Public-App filter expects its original sport label; the display
  // renderer normalizes that label to Soccer without changing snapshot data.
  const sourceMatches = event.matches.map(m => m.sport === "Soccer"
    ? { ...m, sport: "Urban Street Soccer" } : m);
  const days = scheduleDays(sourceMatches);
  const preferred = selectHome(sourceMatches, event.start, event.end, now, event.timeZone ?? "Europe/Berlin").day;
  const requested = query.get("tag");
  const day = days.includes(requested) ? requested : days.includes(preferred) ? preferred : days[0] ?? preferred;
  const filters = publicFilters(query.get("sportart"), query.get("kategorie"));
  const sports = [
    { value: "alle", label: "Alle" },
    { value: "beachvolleyball", label: "Beachvolleyball", source: "Beachvolleyball" },
    { value: "street-soccer", label: "Soccer", source: "Urban Street Soccer" },
  ].filter(option => option.value === "alle" || sourceMatches.some(m => m.sport === option.source));
  const categories = [
    { value: "alle", label: "Alle" },
    { value: "maenner", label: "Männer" },
    { value: "frauen", label: "Frauen" },
  ].filter(option => option.value === "alle" || sourceMatches.some(m => m.category === option.label));
  if (!sports.some(option => option.value === filters.sport)) filters.sport = "alle";
  if (!categories.some(option => option.value === filters.category)) filters.category = "alle";
  const matches = filterSchedule(sourceMatches, day, filters.sport, filters.category);
  const link = (tag, sport, category) => esc(scheduleQuery(tag, sport, category));
  const html = `
  <p class="eyebrow">Am richtigen Ort. Zur richtigen Zeit.</p>
  <h1>Spielplan</h1>
  <p class="day-note">Verbindlicher Tagesplan · Ortszeit ${esc(event.city)}</p>
  <nav class="day-tabs" aria-label="Veranstaltungstag">${days.map(d => `
    <a data-schedule-query href="${link(d, filters.sport, filters.category)}"${d === day ? ' aria-current="date"' : ""}>${dateLabel(d)}</a>`).join("")}
  </nav>
  <div class="schedule-filters">
    <div><p class="filter-label" id="sport-filter">Sportart</p>
      <nav class="filter-pills" aria-labelledby="sport-filter">${sports.map(option => `
        <a data-schedule-query href="${link(day, option.value, filters.category)}"${option.value === filters.sport ? ' aria-current="true"' : ""}>${option.label}</a>`).join("")}</nav>
    </div>
    <div><p class="filter-label" id="category-filter">Kategorie</p>
      <nav class="filter-pills" aria-labelledby="category-filter">${categories.map(option => `
        <a data-schedule-query href="${link(day, filters.sport, option.value)}"${option.value === filters.category ? ' aria-current="true"' : ""}>${option.label}</a>`).join("")}</nav>
    </div>
  </div>
  <div class="schedule-heading"><h2>${dateLabel(day)}</h2><span>${matches.length} Begegnungen</span></div>
  <div class="match-grid">${matches.map(matchCard).join("")}</div>
  ${matches.length ? "" : '<p class="empty-state">Für diese Auswahl sind keine Begegnungen veröffentlicht. Wähle eine andere Sportart, Kategorie oder einen anderen Tag.</p>'}`;
  return { html, query: scheduleQuery(day, filters.sport, filters.category) };
};
(function startLiveSchedule(browser = globalThis) {
  const area = browser.document.querySelector("[data-live-schedule]");
  if (!area) return;
  let current = null;
  let loading = false;
  function render(event, url, push = false) {
    const view = scheduleView(event, url.searchParams, new browser.Date());
    url.search = view.query;
    browser.history[push ? "pushState" : "replaceState"](null, "", url.href);
    if (area.innerHTML !== view.html) area.innerHTML = view.html;
  }
  area.addEventListener("click", e => {
    const anchor = e.target.closest?.("a[data-schedule-query]");
    if (!current || !anchor || !area.contains(anchor) || e.button !== 0 ||
      e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    render(current, new URL(anchor.href, browser.document.baseURI), true);
  });
  browser.addEventListener("popstate", () => {
    if (current) render(current, new URL(browser.location.href));
  });
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const url = new URL("data/olympix.json", browser.document.baseURI);
      url.searchParams.set("t", String(browser.Date.now()));
      const response = await browser.fetch(url, {
        cache: "no-store", signal: browser.AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Snapshot konnte nicht geladen werden.");
      const snapshot = await response.json();
      if (!Array.isArray(snapshot.event?.matches) || !snapshot.event.start || !snapshot.event.end) {
        throw new Error("Ungültiger Ergebnis-Snapshot.");
      }
      render(snapshot.event, new URL(browser.location.href));
      current = snapshot.event;
    } catch {
      browser.console.warn("Live-Spielplan derzeit nicht verfügbar; erneuter Versuch folgt.");
    } finally {
      loading = false;
    }
  }
  void refresh();
  browser.setInterval(() => void refresh(), 15_000);
})();
