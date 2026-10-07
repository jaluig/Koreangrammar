/*
 * Interactive "labs": toys with no wrong answers.
 *  - batchim: tap a word, see its last block split into jamo, and watch the
 *    right particle get picked.
 *  - verbs: put a verb in Mandu's steamer and see each conjugation step.
 * Used inside lessons and in the notebook's tool section.
 */
(function (KG) {
  "use strict";

  const { h, md, esc, sayBtn } = KG.ui;
  const H = KG.hangul;

  // On small screens the chips can push the result below the fold.
  function reveal(el) {
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight - 160) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function jamoBox(letter, label, cls) {
    return h("div", { class: "jamo " + (cls || "") }, h("b", { text: letter }), h("small", { text: label }));
  }

  /*
   * opts.pair      [after consonant, after vowel], e.g. ["은", "는"]
   * opts.template  how to show the result; {np} = noun + particle
   * opts.words     [[korean, english], ...]
   */
  function batchim(opts) {
    const pair = opts.pair;
    const template = opts.template || "{np}";
    const panel = h("div", { class: "detector", "aria-live": "polite" });
    const chips = h("div", { class: "word-chips", role: "group", "aria-label": "Pick a word" });

    function show(word) {
      const last = H.lastBlock(word);
      const j = H.jamo(last);
      const p = H.pick(word, pair);
      const attached = H.attach(word, pair);
      const marked = attached.startsWith(word) ? word + "{" + attached.slice(word.length) + "}" : "{" + attached + "}";
      const result = template.replace("{np}", marked);
      const front = word.slice(0, word.length - 1);
      panel.replaceChildren(
        h("div", { class: "detector-word ko", html: esc(front) + '<span class="last">' + esc(last) + "</span>" }),
        h("div", { class: "jamo-row" },
          jamoBox(j.i, "first"),
          jamoBox(j.m, "vowel"),
          jamoBox(j.f || "–", "받침", j.f ? "final" : "final empty")),
        h("p", {
          class: "verdict",
          html: (j.f
            ? esc(last) + " has a 받침 (<strong>" + esc(j.f) + "</strong>)"
            : esc(last) + " has <strong>no</strong> 받침") + " → <mark class=\"hl\">" + esc(p) + "</mark>",
        }),
        h("div", { class: "result-big ko" }, h("span", { html: md(result) }), sayBtn(result))
      );
    }

    opts.words.forEach(([word, en], i) => {
      const chip = h("button", { class: "word-chip", type: "button", "aria-pressed": i === 0 ? "true" : "false" },
        h("b", { class: "ko", text: word }), h("small", { text: en }));
      chip.addEventListener("click", () => {
        chips.querySelectorAll(".word-chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        KG.audio.sfx("tap");
        show(word);
        reveal(panel);
      });
      chips.append(chip);
    });
    show(opts.words[0][0]);

    return h("div", { class: "lab" },
      h("div", { class: "lab-head" }, h("span", { html: KG.art.mandu("think") }),
        h("div", {}, h("h3", { text: opts.title || "받침 Detector" }), h("p", { html: md(opts.intro || "Tap a word. Mandu checks its last block for a 받침 and picks the ending.") }))),
      chips,
      panel);
  }

  const MODE_LABEL = {
    present: "Present -아요/어요",
    past: "Past -았/었어요",
    future: "Future -(으)ㄹ 거예요",
    want: "Want -고 싶어요",
    negative: "Not -지 않아요",
  };

  /*
   * opts.mode   present | past | future | want | negative
   * opts.modes  optional list of modes to switch between
   * opts.verbs  [[dictionary form, english], ...]
   */
  function verbs(opts) {
    let mode = opts.mode || "present";
    let verb = opts.verbs[0][0];
    const list = h("ol", { class: "steam-steps", "aria-live": "polite" });
    // Entries may carry a third value, "adj", for describing words.
    const isAdj = (v) => (opts.verbs.find((x) => x[0] === v) || [])[2] === "adj";

    function show() {
      if (mode === "want" && isAdj(verb)) {
        list.replaceChildren(h("li", { class: "steam-step" },
          h("div", {}, h("em", { text: "Not this one!" }), h("b", { class: "ko", text: verb })),
          h("span", { html: md(verb + " is an adjective (a describing word). **-고 싶어요** only goes with action verbs, so pick a different one.") })));
        return;
      }
      const r = H.conjugate(verb, mode);
      list.replaceChildren(...r.steps.map((s, i) => {
        const last = i === r.steps.length - 1;
        const li = h("li", { class: "steam-step" + (last ? " final" : "") },
          h("div", {}, h("em", { text: s.label }), h("b", { class: "ko", text: s.value }), last ? sayBtn(s.value) : null),
          s.note ? h("span", { html: md(s.note) }) : null);
        li.style.animationDelay = i * 0.12 + "s";
        return li;
      }));
    }

    const chips = h("div", { class: "word-chips", role: "group", "aria-label": "Pick a verb" });
    opts.verbs.forEach(([v, en], i) => {
      const chip = h("button", { class: "word-chip", type: "button", "aria-pressed": i === 0 ? "true" : "false" },
        h("b", { class: "ko", text: v }), h("small", { text: en }));
      chip.addEventListener("click", () => {
        chips.querySelectorAll(".word-chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        verb = v;
        KG.audio.sfx("step");
        show();
        reveal(list);
      });
      chips.append(chip);
    });

    let tabs = null;
    if (opts.modes && opts.modes.length > 1) {
      tabs = h("div", { class: "mode-tabs", role: "group", "aria-label": "Verb form" });
      for (const m of opts.modes) {
        const b = h("button", { type: "button", "aria-pressed": m === mode ? "true" : "false", text: MODE_LABEL[m] });
        b.addEventListener("click", () => {
          tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          mode = m;
          show();
        });
        tabs.append(b);
      }
    }

    show();
    return h("div", { class: "lab" },
      h("div", { class: "lab-head" }, h("span", { html: KG.art.steamer() }),
        h("div", {}, h("h3", { text: opts.title || "Mandu's Verb Steamer" }),
          h("p", { html: md(opts.intro || "Pick a verb and watch it change, one step at a time.") }))),
      tabs || h("p", { class: "card-kicker", text: MODE_LABEL[mode] }),
      chips,
      list);
  }

  KG.labs = { batchim, verbs, MODE_LABEL };
})(window.KG = window.KG || {});
