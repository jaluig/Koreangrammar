/*
 * The lesson player: a full-screen overlay that walks through a queue of cards.
 *  - lesson:   every card in order, then the notebook summary
 *  - practice: only the exercises of a finished lesson, shuffled
 *  - quiz:     a level's pop quiz with 3 hearts
 * Missed exercises in lessons come back once at the end ("Try again").
 */
(function (KG) {
  "use strict";

  const { h, md, sayBtn, shuffle, pickOne } = KG.ui;

  const PRAISE = [["맞아요!", "That's right!"], ["잘했어요!", "Well done!"], ["대박!", "Amazing!"], ["최고예요!", "You're the best!"], ["좋아요!", "Nice!"]];
  const OOPS = [["아쉬워요!", "So close!"], ["괜찮아요!", "That's okay!"], ["다시 해 봐요!", "Let's try again!"]];
  const STAMP_EN = { 3: "“Very well done!” The stamp Korean teachers save for the best diaries.", 2: "“Well done!” Replay for a perfect 참 잘했어요.", 1: "“Keep going!” Every mistake teaches you something." };

  let S = null; // the running session
  let els = null;

  const isGraded = (card) => KG.cards.GRADED.includes(card.type);

  function buildQueue(opts) {
    if (opts.kind === "lesson") return opts.lesson.cards.concat([{ type: "summary", lesson: opts.lesson }]);
    if (opts.kind === "practice") return shuffle(opts.lesson.cards.filter(isGraded));
    const quiz = opts.level.quiz;
    const extra = quiz.extra || [];
    const pool = shuffle(opts.level.lessons.flatMap((l) => l.cards.filter(isGraded)));
    return shuffle(extra.concat(pool.slice(0, Math.max(0, (quiz.count || 10) - extra.length))));
  }

  function title(opts) {
    if (opts.kind === "quiz") return "Level " + opts.level.id + " pop quiz";
    return (opts.kind === "practice" ? "Practice: " : "Lesson " + opts.lesson.id + ": ") + KG.ui.plain(opts.lesson.pattern);
  }

  function open(opts) {
    if (S) close(true);
    S = {
      opts,
      queue: buildQueue(opts).map((card) => ({ card, retry: false })),
      i: 0, graded: 0, correct: 0, combo: 0, best: 0, xp: 0,
      hearts: opts.kind === "quiz" ? 3 : 0,
      touched: false, over: false, onMain: null,
    };
    mount();
    show();
  }

  function mount() {
    const closeBtn = h("button", { class: "icon-btn", type: "button", "aria-label": "Leave", html: KG.art.icon("close") });
    closeBtn.addEventListener("click", askLeave);
    const fill = h("div", { class: "progress-fill" });
    const progress = h("div", { class: "progress", role: "progressbar", "aria-label": "Progress", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, fill);
    const combo = h("div", { class: "combo ko", "data-on": "false", "aria-live": "polite" });
    const hearts = h("div", { class: "hearts", role: "img" });
    const stageInner = h("div", { class: "stage-inner" });
    const stage = h("div", { class: "stage" }, stageInner);
    const feedback = h("div", { class: "feedback", hidden: true, "aria-live": "polite" });
    const main = h("button", { class: "btn block", type: "button", text: "Continue" });
    main.addEventListener("click", () => {
      if (!main.disabled && S && S.onMain) S.onMain();
    });
    const foot = h("div", { class: "player-foot" }, h("div", { class: "foot-inner" }, feedback, main));
    const root = h("div", { class: "player", role: "dialog", "aria-modal": "true", "aria-label": title(S.opts) },
      h("div", { class: "player-top" }, closeBtn, progress, combo, S.opts.kind === "quiz" ? hearts : null),
      stage, foot);
    document.body.append(root);
    document.body.classList.add("locked");
    els = { root, fill, progress, combo, hearts, stage, stageInner, feedback, main, foot };
    renderHearts(false);
    document.addEventListener("keydown", onKey);
  }

  function setMain(label, enabled, fn) {
    els.main.textContent = label;
    els.main.disabled = !enabled;
    S.onMain = fn || null;
  }

  function makeCtx(item) {
    return {
      kind: S.opts.kind,
      footer: (label, enabled, fn) => setMain(label, enabled, fn),
      ready: () => setMain("Continue", true, advance),
      answer(ok, info) {
        if (item.answered) return;
        item.answered = true;
        onAnswer(item, ok, info || {});
      },
    };
  }

  function show() {
    if (S.i >= S.queue.length) {
      finish(false);
      return;
    }
    const item = S.queue[S.i];
    item.answered = false;
    els.feedback.hidden = true;
    els.feedback.replaceChildren();
    els.foot.classList.remove("good", "bad");
    const ctx = makeCtx(item);
    let el;
    try {
      el = KG.cards.render(item.card, ctx, item);
    } catch (err) {
      console.error(err);
      el = h("p", { text: "This card couldn't be shown. Press Continue to skip it." });
      ctx.ready();
    }
    els.stageInner.replaceChildren(el);
    els.stage.scrollTop = 0;
    const pct = Math.round((S.i / S.queue.length) * 100);
    els.fill.style.width = pct + "%";
    els.progress.setAttribute("aria-valuenow", String(pct));
  }

  function advance() {
    S.i++;
    show();
  }

  function onAnswer(item, ok, info) {
    const graded = info.graded !== false && isGraded(item.card);
    S.touched = true;
    if (graded) {
      if (!item.retry) {
        S.graded++;
        if (ok) {
          S.correct++;
          S.xp += 10;
        }
      }
      if (ok) {
        S.combo++;
        S.best = Math.max(S.best, S.combo);
      } else {
        S.combo = 0;
      }
      if (!ok && S.opts.kind === "quiz") {
        S.hearts--;
        renderHearts(true);
      }
      if (!ok && S.opts.kind !== "quiz" && !item.retry) S.queue.push({ card: item.card, retry: true });
    }
    KG.audio.sfx(ok ? "good" : "bad");
    renderCombo();
    showFeedback(ok, info, graded, item);
    if (S.opts.kind === "quiz" && S.hearts <= 0) setMain("See results", true, () => finish(true));
    else setMain("Continue", true, advance);
    els.main.focus({ preventScroll: true });
  }

  function showFeedback(ok, info, graded, item) {
    let ko, en;
    if (graded) [ko, en] = pickOne(ok ? PRAISE : OOPS);
    else [ko, en] = ok ? ["딩동댕!", "Spot on! (That's the Korean quiz-show chime.)"] : ["아하!", "Here's the real rule:"];
    if (!ok && graded && !item.retry && S.opts.kind !== "quiz") en += " It'll come back at the end.";
    const parts = [h("div", { class: "feedback-title" },
      h("span", { html: KG.art.mandu(ok ? "happy" : graded ? "sad" : "wow") }),
      h("span", { class: "ko", text: ko }),
      h("small", { text: en }))];
    if (!ok && info.why) parts.push(h("p", { class: "feedback-body", html: md(info.why) }));
    if (info.answer) {
      parts.push(h("div", { class: "feedback-answer ko" },
        h("span", { html: md((ok ? "" : "Answer: ") + info.answer) }), sayBtn(info.answer)));
    }
    if (info.detail) parts.push(h("p", { class: "feedback-body", html: md(info.detail) }));
    if (info.explain) parts.push(h("p", { class: "feedback-body", html: md(info.explain) }));
    if (ok && graded && KG.store.once("circle-mark")) {
      parts.push(h("p", { class: "feedback-body", html: md("**Fun fact:** that hand-drawn circle is how Korean teachers mark a right answer. It's called a **동그라미** (*circle*). A slash or a check mark means the answer was wrong!") }));
    }
    els.feedback.replaceChildren(...parts);
    els.feedback.hidden = false;
    els.feedback.scrollTop = 0;
    els.foot.classList.add(ok ? "good" : "bad");
  }

  function renderCombo() {
    const on = S.combo >= 3;
    els.combo.dataset.on = String(on);
    els.combo.textContent = on ? S.combo + "연속!" : "";
    els.combo.setAttribute("aria-label", on ? S.combo + " in a row" : "");
  }

  function renderHearts(pop) {
    if (S.opts.kind !== "quiz") return;
    const icons = [0, 1, 2].map((k) => {
      const wrap = h("span", { html: KG.art.icon("heart") });
      const svg = wrap.firstChild;
      if (k >= S.hearts) svg.classList.add("lost");
      if (pop && k === S.hearts) svg.classList.add("pop");
      return svg;
    });
    els.hearts.replaceChildren(...icons);
    els.hearts.setAttribute("aria-label", S.hearts + (S.hearts === 1 ? " heart" : " hearts") + " left");
  }

  function stat(value, label) {
    return h("div", { class: "stat" }, h("b", { text: value }), h("small", { text: label }));
  }

  function finish(failed) {
    S.over = true;
    els.fill.style.width = "100%";
    els.foot.hidden = true;
    const { kind } = S.opts;
    const stats = [];
    if (S.graded) stats.push(stat(S.correct + "/" + S.graded, "first-try answers"));
    if (S.best >= 2) stats.push(stat(String(S.best), "best streak"));

    if (failed) {
      KG.audio.sfx("lose");
      els.stageInner.replaceChildren(results({
        art: KG.art.mandu("sad"),
        heading: "하트가 없어요!",
        sub: "Out of hearts! Peek at your notebook, then give the quiz another go.",
        stats,
        actions: [["Try again", () => open(S.opts)], ["Back to the diary", () => close()]],
      }));
      return;
    }

    const score = S.graded ? S.correct / S.graded : 1;
    let stamps = 0;
    if (kind === "quiz") stamps = Math.max(1, S.hearts);
    else if (kind === "lesson") stamps = score >= 0.9 ? 3 : score >= 0.6 ? 2 : 1;
    const xp = S.xp + (kind === "lesson" ? 20 : kind === "quiz" ? 30 : 0);
    stats.push(stat("+" + xp, "XP"));

    let res = null;
    if (kind === "practice") KG.store.addXp(xp);
    else res = KG.store.finish(kind === "quiz" ? "q" + S.opts.level.id : S.opts.lesson.id, stamps, xp);

    const actions = [["Back to the diary", () => close()]];
    if (kind === "lesson") {
      actions.push(["Practice these exercises", () => open({ kind: "practice", lesson: S.opts.lesson, level: S.opts.level })]);
    } else if (kind === "practice") {
      actions.push(["Practice again", () => open(S.opts)]);
    } else {
      actions.push(["Retry the quiz", () => open(S.opts)]);
    }

    let heading;
    let sub;
    let art;
    if (kind === "practice") {
      heading = "연습 끝!";
      sub = "Practice done. Small daily reviews are how grammar sticks.";
      art = KG.art.mandu("happy");
    } else {
      heading = KG.art.STAMP_TEXT[stamps] + "!";
      sub = STAMP_EN[stamps] + (res && res.first && kind === "quiz" ? " The next level is open!" : "");
      art = KG.art.stamp(stamps);
    }

    els.stageInner.replaceChildren(results({ art, stamp: kind !== "practice", heading, sub, stats, actions }));
    setTimeout(() => KG.audio.sfx("stamp"), 150);
    KG.audio.sfx("win");
    if (stamps === 3 || kind === "practice") KG.ui.confetti();
  }

  function results(o) {
    const buttons = o.actions.map(([label, fn], i) => {
      const b = h("button", { class: "btn" + (i ? " ghost" : ""), type: "button", text: label });
      b.addEventListener("click", fn);
      return b;
    });
    const view = h("section", { class: "results" },
      h("div", { class: "stamp-wrap" + (o.stamp ? " slam" : ""), html: o.art }),
      h("h2", { class: "ko", text: o.heading }),
      h("p", { text: o.sub }),
      o.stats.length ? h("div", { class: "results-stats" }, o.stats) : null,
      h("div", { class: "results-actions" }, buttons));
    setTimeout(() => buttons[0].focus({ preventScroll: true }), 60);
    return view;
  }

  function askLeave() {
    if (!S) return;
    if (S.over || (!S.touched && S.i === 0)) {
      close();
      return;
    }
    KG.app.confirm({
      title: "Leave this lesson?",
      text: "Your answers in this round won't be saved.",
      ok: "Leave",
      cancel: "Keep learning",
      mood: "sad",
    }, () => close());
  }

  function close(silent) {
    document.removeEventListener("keydown", onKey);
    if (els) els.root.remove();
    els = null;
    S = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (!silent) {
      document.body.classList.remove("locked");
      KG.app.refresh();
    }
  }

  function onKey(e) {
    if (!S || !els || document.querySelector(".scrim")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      askLeave();
      return;
    }
    const t = e.target;
    const onControl = t && t.closest && t.closest("button, summary, input, select, textarea, [tabindex]");
    if (e.key === "Enter" && !onControl) {
      if (!els.main.disabled && !els.foot.hidden) {
        e.preventDefault();
        els.main.click();
      }
      return;
    }
    if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const groups = els.stageInner.querySelectorAll("[data-keys]");
      const group = groups[groups.length - 1];
      const b = group && group.querySelectorAll(".opt")[Number(e.key) - 1];
      if (b && !b.disabled) {
        e.preventDefault();
        b.click();
      }
    }
  }

  KG.player = {
    open,
    close,
    isOpen: () => Boolean(S),
    // The card on screen, for tests and debugging.
    current: () => (S && S.queue[S.i] ? { card: S.queue[S.i].card, retry: S.queue[S.i].retry, index: S.i, total: S.queue.length } : null),
  };
})(window.KG = window.KG || {});
