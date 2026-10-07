/*
 * App shell: top bar, the diary map (levels and lesson path), lesson preview
 * sheets, the grammar notebook, settings and theme handling.
 */
(function (KG) {
  "use strict";

  const { h, md, esc, toast } = KG.ui;
  const S = KG.store;

  let view = "map";
  let hostTheme = null;
  let top = null;
  let lastFocus = null;

  const LEVEL_VARS = ["--lvl-1", "--lvl-2", "--lvl-3", "--lvl-4", "--lvl-5", "--lvl-6"];
  const lvl = (id) => "var(" + LEVEL_VARS[(id - 1) % LEVEL_VARS.length] + ")";

  // Path layout: each stop gets a row; x positions zig-zag down the page.
  const XS = [50, 76, 50, 24];
  const ROW = 136;

  /* ---------- theme ---------- */

  function applyTheme() {
    const t = S.settings.theme;
    const root = document.documentElement;
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    else if (hostTheme) root.setAttribute("data-theme", hostTheme);
    else root.removeAttribute("data-theme");
  }

  function applyVoice() {
    document.body.classList.toggle("no-voice", !KG.audio.canSpeak || !S.settings.voice);
  }

  /* ---------- sheets & dialogs ---------- */

  function sheetKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSheet();
    }
  }

  function openSheet(children, label) {
    closeSheet(true);
    lastFocus = document.activeElement;
    const closeBtn = h("button", { class: "icon-btn sheet-close", type: "button", "aria-label": "Close", html: KG.art.icon("close") });
    closeBtn.addEventListener("click", () => closeSheet());
    const sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": label || "Details" }, closeBtn, children);
    const scrim = h("div", { class: "scrim" }, sheet);
    scrim.addEventListener("click", (e) => {
      if (e.target === scrim) closeSheet();
    });
    document.body.append(scrim);
    document.body.classList.add("locked");
    document.addEventListener("keydown", sheetKey);
    setTimeout(() => (sheet.querySelector(".btn:not(:disabled)") || closeBtn).focus({ preventScroll: true }), 40);
  }

  function closeSheet(keepFocus) {
    const scrim = document.querySelector(".scrim");
    if (!scrim) return;
    scrim.remove();
    document.removeEventListener("keydown", sheetKey);
    if (!KG.player.isOpen()) document.body.classList.remove("locked");
    if (!keepFocus && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function confirm(o, onOk) {
    const ok = h("button", { class: "btn", type: "button", text: o.ok || "Yes" });
    const cancel = h("button", { class: "btn ghost", type: "button", text: o.cancel || "Cancel" });
    ok.addEventListener("click", () => {
      closeSheet(true);
      onOk();
    });
    cancel.addEventListener("click", () => closeSheet());
    openSheet(h("div", { class: "confirm-body" },
      h("span", { html: KG.art.mandu(o.mood || "think") }),
      h("h2", { text: o.title }),
      o.text ? h("p", { html: md(o.text) }) : null,
      h("div", { class: "sheet-actions" }, ok, cancel)), o.title);
  }

  /* ---------- top bar ---------- */

  function topbar() {
    const brand = h("button", { class: "brand", type: "button", "aria-label": "Mandu's Grammar Diary, back to the map" },
      h("span", { html: KG.art.mandu("happy") }),
      h("span", { class: "brand-name ko" }, "만두의 문법 일기", h("span", { class: "brand-sub", text: "Mandu's Grammar Diary" })));
    brand.addEventListener("click", () => go("map"));
    const stamps = h("span", { class: "chip" });
    const book = h("button", { class: "icon-btn", type: "button", "aria-label": "Grammar notebook", html: KG.art.icon("book") });
    book.addEventListener("click", () => go(view === "notebook" ? "map" : "notebook"));
    const gear = h("button", { class: "icon-btn", type: "button", "aria-label": "Settings", html: KG.art.icon("gear") });
    gear.addEventListener("click", openSettings);
    top = { stamps, book };
    return h("header", { class: "topbar" }, h("div", { class: "topbar-inner" }, brand, stamps, book, gear));
  }

  function updateTop() {
    const n = S.totalStamps();
    top.stamps.innerHTML = KG.art.miniStamp(true) + "<span>" + n + "</span>";
    top.stamps.setAttribute("title", n + " stamps collected");
    top.stamps.setAttribute("aria-label", n + " stamps collected");
    top.book.setAttribute("aria-pressed", String(view === "notebook"));
  }

  /* ---------- map ---------- */

  function itemName(it) {
    return it.kind === "quiz" ? "Level " + it.level.id + " pop quiz" : it.id + " " + KG.ui.plain(it.lesson.pattern);
  }

  function hero() {
    const seq = S.sequence();
    const doneCount = seq.filter((x) => S.isDone(x.id)).length;
    const next = S.nextItem();
    let msg;
    let label = null;
    let mood = "happy";
    if (!doneCount) {
      msg = "**안녕!** I'm Mandu. Let's fill this diary with Korean grammar, starting with the patterns you need first. Every lesson earns a **참 잘했어요** stamp!";
      label = "Start lesson 1-1";
    } else if (next) {
      msg = "**반가워요!** Good to see you. Next page: **" + esc(itemName(next)) + "**.";
      label = next.kind === "quiz" ? "Take the pop quiz" : "Continue with " + next.id;
    } else {
      msg = "**와!** You've filled every page so far. New levels are on the way. Replay a lesson to turn any stamp into a 참 잘했어요.";
      mood = "wow";
    }
    const actions = h("div", { class: "hero-actions" });
    if (next) {
      const b = h("button", { class: "btn", type: "button", text: label });
      b.addEventListener("click", () => preview(next));
      actions.append(b);
    }
    actions.append(h("div", { class: "stats" },
      h("span", { class: "chip", html: KG.art.miniStamp(true) + S.totalStamps() + " / " + S.maxStamps() + " stamps" }),
      h("span", { class: "chip", html: KG.art.icon("star") + S.xp + " XP" }),
      h("span", { class: "chip", text: doneCount + " / " + seq.length + " pages done" })));
    return h("section", { class: "hero" },
      h("div", { class: "hero-mandu", html: KG.art.mandu(mood) }),
      h("p", { class: "bubble", html: md(msg) }),
      actions);
  }

  function stop(it, k, next) {
    const unlocked = S.isUnlocked(it.id);
    const rec = S.record(it.id);
    const isNext = Boolean(next && next.id === it.id);
    const quiz = it.kind === "quiz";
    const label = quiz ? "쪽지 시험" : it.lesson.sticker;
    let aria = itemName(it) + (rec ? ", " + rec.stamps + " of 3 stamps" : unlocked ? ", not started" : ", locked");
    const node = h("button", {
      class: "node ko" + (quiz ? " quiz" : "") + (unlocked ? "" : " locked") + (isNext ? " next" : ""),
      type: "button",
      "aria-label": aria,
      id: "stop-" + it.id,
    },
    h("span", { text: label }),
    unlocked ? null : h("span", { class: "lock", html: KG.art.icon("lock") }),
    isNext ? h("span", { class: "flag", text: S.totalStamps() ? "NEXT" : "START" }) : null);
    node.addEventListener("click", () => preview(it));
    const caption = h("div", { class: "stop-label" },
      h("b", { text: quiz ? "Pop quiz" : it.id }), " ",
      quiz ? "mix of the whole level" : it.lesson.title);
    const stamps = rec
      ? h("div", { class: "mini-stamps", "aria-hidden": "true", html: [1, 2, 3].map((n) => KG.art.miniStamp(n <= rec.stamps)).join("") })
      : null;
    return h("div", { class: "stop" }, h("div", { class: "stop-inner", style: "left:" + XS[k % XS.length] + "%" }, node, caption, stamps));
  }

  function trail(items, next) {
    const height = items.length * ROW;
    const pts = items.map((_, k) => [XS[k % XS.length], k * ROW + 46]);
    let d = "M " + pts[0][0] + " " + pts[0][1];
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1];
      const [x1, y1] = pts[k];
      d += " C " + x0 + " " + (y0 + ROW / 2) + ", " + x1 + " " + (y1 - ROW / 2) + ", " + x1 + " " + y1;
    }
    const box = h("div", { class: "trail", style: "height:" + height + "px" });
    box.innerHTML = '<svg class="trail-line" viewBox="0 0 100 ' + height + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" vector-effect="non-scaling-stroke"/></svg>';
    items.forEach((it, k) => box.append(stop(it, k, next)));
    return box;
  }

  function levelSection(level, next) {
    const items = S.sequence().filter((x) => x.level === level);
    return h("section", { class: "level", "data-level": String(level.id), style: "--lvl:" + lvl(level.id), "aria-labelledby": "level-" + level.id },
      h("span", { class: "tape" }, h("span", { class: "ko", text: level.num }), h("small", { text: "Level " + level.id })),
      h("div", { class: "level-head" },
        h("h2", { id: "level-" + level.id }, level.title, h("small", { class: "ko", text: level.ko })),
        h("p", { html: md(level.blurb) })),
      trail(items, next));
  }

  function roadmap() {
    const list = KG.course.roadmap || [];
    if (!list.length) return null;
    return h("section", { class: "roadmap", "aria-labelledby": "roadmap-title" },
      h("h2", { id: "roadmap-title", text: "Coming next in the diary" }),
      h("p", { text: "The order learners usually meet these patterns. Each will become its own level." }),
      h("div", { class: "road-grid" }, list.map((r) =>
        h("div", { class: "road-card", style: "--lvl:" + lvl(r.id) },
          h("h3", {}, h("span", { class: "ko", text: r.num }), r.title, " ", h("small", { class: "ko", text: r.ko })),
          h("ul", {}, r.patterns.map((p) => h("li", { class: "ko", html: md(p) })))))));
  }

  function mapView() {
    const next = S.nextItem();
    if (!KG.course.levels.length) {
      return h("main", { class: "page", id: "main" }, h("p", { text: "No lessons were found. Check that the files in js/content loaded." }));
    }
    return h("main", { class: "page", id: "main" },
      hero(),
      h("div", { class: "levels" }, KG.course.levels.map((level) => levelSection(level, next))),
      roadmap());
  }

  /* ---------- lesson preview ---------- */

  function preview(it) {
    const unlocked = S.isUnlocked(it.id);
    const rec = S.record(it.id);
    const seq = S.sequence();
    const prev = seq[seq.findIndex((x) => x.id === it.id) - 1];
    const quiz = it.kind === "quiz";
    const parts = [];
    const start = h("button", { class: "btn", type: "button" });
    const actions = h("div", { class: "sheet-actions" }, start);

    if (quiz) {
      const q = it.level.quiz;
      parts.push(
        h("p", { class: "kicker", text: "Level " + it.level.id + " · Pop quiz" }),
        h("div", { class: "preview-head" },
          h("span", { class: "node quiz ko", style: "--lvl:" + lvl(it.level.id), "aria-hidden": "true", text: "쪽지 시험" }),
          h("div", {}, h("h2", { class: "ko", text: "쪽지 시험" }), h("p", { text: "A surprise quiz, Korean-classroom style" }))),
        h("p", { html: md(q.intro || "Questions from every lesson in this level, all mixed up. You have **3 hearts**: each mistake costs one. Finish with hearts left to unlock the next level.") }),
        h("div", { class: "facts" },
          h("span", { class: "chip", text: (q.count || 10) + " questions" }),
          h("span", { class: "chip", html: KG.art.icon("heart") + " 3 hearts" }),
          rec ? h("span", { class: "chip", html: KG.art.miniStamp(true) + " best: " + rec.stamps + "/3" }) : null));
      start.textContent = rec ? "Retry the quiz" : "Start the quiz";
      start.addEventListener("click", () => {
        closeSheet(true);
        KG.player.open({ kind: "quiz", level: it.level });
      });
    } else {
      const L = it.lesson;
      const exercises = L.cards.filter((c) => KG.cards.GRADED.includes(c.type)).length;
      parts.push(
        h("p", { class: "kicker", text: "Level " + it.level.id + " · Lesson " + L.id }),
        h("div", { class: "preview-head" },
          h("span", { class: "node ko", style: "--lvl:" + lvl(it.level.id), "aria-hidden": "true", text: L.sticker }),
          h("div", {}, h("h2", { class: "ko", html: md(L.pattern) }), h("p", { text: L.title }))),
        h("p", { html: md(L.goal) }),
        h("div", { class: "facts" },
          h("span", { class: "chip", text: L.cards.length + " cards" }),
          h("span", { class: "chip", text: exercises + " exercises" }),
          h("span", { class: "chip", text: "about " + Math.max(4, Math.round(L.cards.length * 0.6)) + " min" }),
          rec ? h("span", { class: "chip", html: KG.art.miniStamp(true) + " best: " + rec.stamps + "/3" }) : null));
      start.textContent = rec ? "Replay the lesson" : "Start the lesson";
      start.addEventListener("click", () => {
        closeSheet(true);
        KG.player.open({ kind: "lesson", lesson: L, level: it.level });
      });
      if (rec) {
        const practice = h("button", { class: "btn ghost", type: "button", text: "Quick practice (exercises only)" });
        practice.addEventListener("click", () => {
          closeSheet(true);
          KG.player.open({ kind: "practice", lesson: L, level: it.level });
        });
        const notes = h("button", { class: "btn ghost", type: "button", text: "Open the notebook page" });
        notes.addEventListener("click", () => {
          closeSheet(true);
          go("notebook", "note-" + L.id);
        });
        actions.append(practice, notes);
      }
    }

    if (!unlocked) {
      start.disabled = true;
      start.textContent = "Locked";
      parts.push(h("p", { class: "note warn", html: md("Finish **" + esc(itemName(prev)) + "** first to open this page. Already know the basics? Turn on *Unlock everything* in Settings.") }));
    }
    parts.push(actions);
    openSheet(h("div", { class: "sheet-body" }, parts), itemName(it));
  }

  /* ---------- notebook ---------- */

  function notebookEntry(L, level) {
    const open = S.isDone(L.id) || S.settings.unlockAll;
    return h("details", { class: "nb-entry" + (open ? "" : " locked"), id: "note-" + L.id, style: "--lvl:" + lvl(level.id) },
      h("summary", {},
        h("span", { class: "nb-badge ko", text: L.sticker }),
        h("span", { class: "nb-title" },
          h("b", { class: "ko", html: md(L.pattern) }),
          h("span", { text: open ? L.title : "Finish lesson " + L.id + " to fill in this page" }))),
      h("div", { class: "nb-body" }, open ? KG.cards.notes(L) : h("p", { text: "This page is still blank. Play the lesson and Mandu will write it for you." })));
  }

  function tools() {
    const pairs = [
      ["이에요 / 예요", ["이에요", "예요"]],
      ["은 / 는", ["은", "는"]],
      ["이 / 가", ["이", "가"]],
      ["을 / 를", ["을", "를"]],
    ];
    const host = h("div");
    const tabs = h("div", { class: "mode-tabs", role: "group", "aria-label": "Particle" });
    const draw = (i) => host.replaceChildren(KG.labs.batchim({
      pair: pairs[i][1],
      words: KG.course.toolNouns,
      intro: "Pick a particle above, then any word. Mandu shows which form it takes and why.",
    }));
    pairs.forEach(([label], i) => {
      const b = h("button", { type: "button", class: "ko", "aria-pressed": i === 0 ? "true" : "false", text: label });
      b.addEventListener("click", () => {
        tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        draw(i);
      });
      tabs.append(b);
    });
    draw(0);
    return h("section", { class: "nb-section", "aria-labelledby": "tools-title" },
      h("h2", { id: "tools-title", text: "Mandu's tools" }),
      h("div", { class: "tool-card" }, tabs, host),
      h("div", { class: "tool-card" }, KG.labs.verbs({
        modes: ["present", "past", "future", "want", "negative"],
        verbs: KG.course.toolVerbs,
        intro: "Every verb form from the diary so far. Pick a form, then a verb.",
      })));
  }

  function notebookView() {
    return h("main", { class: "page", id: "main" },
      h("div", { class: "nb-head" },
        h("p", { class: "card-kicker ko", text: "문법 노트" }),
        h("h1", { text: "Grammar notebook" }),
        h("p", { text: "Every lesson you finish writes a cheat-sheet page here. Open one whenever you need a quick reminder." })),
      KG.course.levels.map((level) => h("section", { class: "nb-section", "aria-label": "Level " + level.id },
        h("h2", {}, h("span", { class: "ko", text: level.num }), " · " + level.title),
        level.lessons.map((L) => notebookEntry(L, level)))),
      tools());
  }

  /* ---------- settings ---------- */

  function openSettings() {
    const row = (titleText, desc, control) => h("div", { class: "setting" },
      h("div", { class: "setting-text" }, h("b", { text: titleText }), desc ? h("span", { html: md(desc) }) : null), control);
    const toggle = (key, label, after) => {
      const b = h("button", { class: "switch", type: "button", role: "switch", "aria-checked": String(Boolean(S.settings[key])), "aria-label": label });
      b.addEventListener("click", () => {
        const v = !S.settings[key];
        S.set(key, v);
        b.setAttribute("aria-checked", String(v));
        if (after) after(v);
      });
      return b;
    };

    let voiceNote = "Speaker buttons read Korean aloud with your device's voice.";
    if (!KG.audio.canSpeak) voiceNote = "This browser can't speak, so the speaker buttons are hidden.";
    else if (!KG.audio.hasKoreanVoice()) voiceNote = "No Korean voice was found on this device, so playback may be silent or accented.";

    const test = h("button", { class: "btn ghost small", type: "button", text: "Test" });
    test.addEventListener("click", () => KG.audio.say("안녕하세요! 저는 만두예요."));

    const theme = h("div", { class: "segmented", role: "group", "aria-label": "Theme" });
    [["system", "Auto"], ["light", "Light"], ["dark", "Dark"]].forEach(([v, label]) => {
      const b = h("button", { type: "button", "aria-pressed": String(S.settings.theme === v), text: label });
      b.addEventListener("click", () => {
        S.set("theme", v);
        theme.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        applyTheme();
      });
      theme.append(b);
    });

    const reset = h("button", { class: "btn ghost small", type: "button", text: "Reset" });
    reset.addEventListener("click", () => {
      confirm({ title: "Start the diary over?", text: "This erases your stamps and XP. Settings stay as they are.", ok: "Erase my progress", cancel: "Keep my progress", mood: "sad" }, () => {
        S.reset();
        render();
        toast("Progress erased. A fresh diary!");
      });
    });

    openSheet(h("div", {},
      h("p", { class: "kicker", text: "설정" }),
      h("h2", { text: "Settings" }),
      h("div", { class: "sheet-body" }, h("div", {},
        row("Sound effects", "Little chimes for right and wrong answers.", toggle("sound", "Sound effects")),
        row("Korean voice", voiceNote, h("div", { class: "facts" }, KG.audio.canSpeak ? test : null, toggle("voice", "Korean voice", applyVoice))),
        row("English in stories", "Show translations under each line. Turn off to read the Korean first.", toggle("english", "English in stories")),
        row("Theme", "Auto follows your device.", theme),
        row("Unlock everything", "Open every lesson right away, handy if you already know the basics.", toggle("unlockAll", "Unlock everything", () => render())),
        row("Reset progress", "Erase stamps and XP.", reset)))), "Settings");
  }

  /* ---------- routing ---------- */

  function render() {
    const host = document.getElementById("view");
    if (!host) return;
    host.replaceChildren(view === "notebook" ? notebookView() : mapView());
    updateTop();
  }

  function go(v, anchor) {
    view = v === "notebook" ? "notebook" : "map";
    try {
      if (view === "notebook") {
        if (location.hash !== "#notebook") location.hash = "notebook";
      } else if (location.hash) {
        history.pushState("", document.title, location.pathname + location.search);
      }
    } catch (e) {
      // Some embedded viewers block history changes; the view still switches.
    }
    render();
    window.scrollTo(0, 0);
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) {
        el.open = true;
        el.scrollIntoView({ block: "center" });
      }
    }
  }

  function route() {
    const v = location.hash === "#notebook" ? "notebook" : "map";
    if (v !== view) {
      view = v;
      render();
    }
  }

  function refresh() {
    render();
    const next = S.nextItem();
    const el = next && view === "map" ? document.getElementById("stop-" + next.id) : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function boot(hot) {
    hostTheme = document.documentElement.getAttribute("data-theme");
    if (!document.documentElement.lang) document.documentElement.lang = "en";
    S.load();
    applyTheme();
    applyVoice();
    KG.ui.initGlosses();
    const app = document.getElementById("app");
    app.replaceChildren(topbar(), h("div", { id: "view" }));
    view = location.hash === "#notebook" || (hot && hot.view === "notebook") ? "notebook" : "map";
    window.addEventListener("hashchange", route);
    render();
  }

  KG.app = { boot, refresh, render, confirm, openSheet, closeSheet, go, preview, get view() { return view; } };

  // Boot. Inside a Claude artifact viewer, keep the open view across live updates.
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === "function") hot.snapshot(() => ({ view }));
  const start = (data) => boot(data || {});
  if (hot && typeof hot.ready === "function") hot.ready(start);
  else start((hot && hot.data) || {});
})(window.KG = window.KG || {});
