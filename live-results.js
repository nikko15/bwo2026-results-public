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
const groupTables = function groupTables(competition) {
  const groups =
    competition.standings?.groups ?? [];

  const beach =
    competition.sport === "beach-volleyball";

  if (!groups.length) {
    return `
<p class="public-panel empty-state">
  Für diesen Wettbewerb sind noch keine Gruppen vorhanden.
</p>`;
  }

  return `
<div class="group-tables">

${groups
  .map((group) => {
    const rows = (group.blocks ?? []).flatMap(
      (block) =>
        (block.rows ?? []).map((row, index) => ({
          ...row,
          rank:
            block.resolved
              ? block.rank + index
              : null,
          rankStart: block.rank,
          rankEnd: block.endRank,
          resolved: block.resolved,
          tied: block.tied,
        })),
    );

    return `
<section class="public-panel group-card">

  <div class="group-heading">
    <h3>${esc(group.name)}</h3>
  </div>

  <table class="public-standings">

    <thead>
      <tr>
        ${
          beach
            ? `
        <th>Pl.</th>
        <th>Team</th>
        <th>SP</th>
        <th>S</th>
        <th>Sätze</th>
        <th>Punkte</th>`
            : `
        <th>Pl.</th>
        <th>Team</th>
        <th>SP</th>
        <th>PKT</th>
        <th>Tore</th>
        <th>Diff.</th>`
        }
      </tr>
    </thead>

    <tbody>

${rows
  .map((row) => {
    const rank =
      row.rank !== null
        ? `${row.rank}.`
        : `${row.rankStart}–${row.rankEnd}`;

    const values = beach
      ? [
          row.played,
          row.wins,
          `${row.setsWon}:${row.setsLost}`,
          `${row.scored}:${row.conceded}`,
        ]
      : [
          row.played,
          row.points,
          `${row.scored}:${row.conceded}`,
          row.scored - row.conceded,
        ];

    const headings = beach
      ? ["SP", "S", "Sätze", "Punkte"]
      : ["SP", "PKT", "Tore", "Diff."];

    return `
<tr class="${row.rank === 1 ? "group-leader" : ""}">

  <td class="standing-rank">
    ${rank}
  </td>

  <th scope="row" class="standing-team">
    ${esc(row.name)}

    ${
      !row.resolved
        ? `<small>Gleichstand · Entscheidung offen</small>`
        : ""
    }

    ${
      row.tied && row.resolved
        ? `<small>Knobeln berücksichtigt</small>`
        : ""
    }
  </th>

  ${values
    .map(
      (value, index) => `
  <td data-label="${headings[index]}">
    ${value}
  </td>`,
    )
    .join("")}

</tr>`;
  })
  .join("")}

    </tbody>
  </table>

</section>`;
  })
  .join("")}

</div>`;
};
(function startLiveResults(browser = globalThis) {
  const area = browser.document.querySelector("[data-competition-slug]");
  if (!area) return;
  const grid = area.querySelector("[data-competition-matches]");
  const tables = area.querySelector("[data-competition-tables]");
  if (!grid || !tables) return;
  const slug = area.dataset.competitionSlug;
  const url = new URL("../data/olympix.json", browser.document.baseURI);
  let loading = false;

  const replaceContent = (element, html) => {
    if (element.innerHTML !== html) element.innerHTML = html;
  };

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
      const event = snapshot.event;
      if (!Array.isArray(event?.competitions) || !Array.isArray(event?.matches)) {
        throw new Error("Ungültiger Ergebnis-Snapshot.");
      }
      const competition = event.competitions.find((c) => c.slug === slug);
      if (!competition || !Array.isArray(competition.standings?.groups)) {
        throw new Error("Wettbewerbsdaten fehlen im Snapshot.");
      }
      const matches = event.matches
        .filter((m) => m.competitionSlug === slug)
        .sort((a, b) => String(a.day ?? "").localeCompare(String(b.day ?? "")) ||
          (a.minute ?? 9999) - (b.minute ?? 9999));
      // Render everything first: malformed data must not clear the existing page.
      const matchHtml = matches.map(matchCard).join("");
      const tableHtml = groupTables(competition);
      const finals = matches.filter((m) => m.phase && m.phase !== "GROUP");
      const finalHtml = finals.length
        ? '<div class="match-grid">' + finals.map(matchCard).join("") + '</div>'
        : '<p class="empty-state">Die Finalrunde ist noch nicht veröffentlicht.</p>';

      replaceContent(grid, matchHtml);
      replaceContent(tables, tableHtml);
      let empty = area.querySelector("[data-competition-empty]");
      if (!matches.length && !empty) {
        empty = browser.document.createElement("p");
        empty.className = "empty-state";
        empty.setAttribute("data-competition-empty", "");
        empty.textContent = "Noch keine Begegnungen veröffentlicht.";
        grid.after(empty);
      } else if (matches.length && empty) {
        empty.remove();
      }
      const finalArea = area.querySelector("[data-competition-final-round]");
      const finalContent = finalArea?.querySelector(".match-grid, .empty-state");
      if (finalContent && finalContent.outerHTML !== finalHtml) {
        finalContent.outerHTML = finalHtml;
      }
    } catch {
      // Keep the last usable rendering; retry on the next interval.
      browser.console.warn("Live-Ergebnisse derzeit nicht verfügbar; erneuter Versuch folgt.");
    } finally {
      loading = false;
    }
  }

  void refresh();
  browser.setInterval(() => void refresh(), 15_000);
})();
