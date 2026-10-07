/*
 * Card renderers. A lesson is a list of cards; each card type has a renderer
 * that builds its DOM and reports back to the player through `ctx`:
 *   ctx.ready()                     info card is done, enable Continue
 *   ctx.answer(ok, info)            exercise finished (info: explain, why, answer, detail, graded)
 *   ctx.footer(label, enabled, fn)  drive the main button (e.g. "Check")
 * Content format for each type is documented in README.md.
 */
(function (KG) {
  "use strict";

  const { h, md, esc, plain, sayBtn, shuffle } = KG.ui;
  const H = KG.hangul;

  const GRADED = ["choice", "build", "sort", "match", "fix", "steps"];

  const KICKER = {
    scene: "Story time",
    discover: "Guess the rule",
    learn: "Learn",
    lab: "Play with it",
    choice: "Choose",
    build: "Build the sentence",
    sort: "Sort it",
    match: "Match the pairs",
    fix: "Spot the mistake",
    steps: "Step by step",
    summary: "New notebook page",
  };

  function kicker(card, item) {
    const label = card.kicker || (card.type === "choice" && card.sentence ? "Fill the blank" : KICKER[card.type]);
    return h("div", { class: "card-kicker" }, label, item && item.retry ? h("span", { class: "review", text: "Try again" }) : null);
  }

  function shell(card, item, ...kids) {
    return h("section", { class: "card" }, kicker(card, item), ...kids);
  }

  function manduNote(text, mood) {
    return h("div", { class: "mandu-note" }, h("span", { html: KG.art.mandu(mood || "happy") }), h("div", { class: "bubble", html: md(text) }));
  }

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // Answer buttons. Short Korean options sit side by side, longer ones stack.
  function optionList(options, onPick) {
    const short = options.every((o) => plain(o).length <= 6);
    const cls = short && options.length === 2 ? "options two" : short && options.length === 3 ? "options three" : "options";
    const buttons = options.map((text, i) =>
      h("button", { class: "opt" + (H.hasHangul(text) ? " ko" : ""), type: "button" },
        h("span", { class: "key", "aria-hidden": "true", text: String(i + 1) }),
        h("span", { html: md(text) })));
    buttons.forEach((b, i) => b.addEventListener("click", () => onPick(i, b)));
    return { box: h("div", { class: cls, "data-keys": "", role: "group" }, buttons), buttons };
  }

  function markRight(btn) {
    btn.classList.add("right");
    btn.insertAdjacentHTML("beforeend", KG.art.circleMark());
  }

  function lock(buttons) {
    buttons.forEach((b) => (b.disabled = true));
  }

  /* ---------- info cards ---------- */

  function scene(card, ctx, item) {
    const chat = h("div", { class: "chat" });
    const hint = h("p", { class: "tap-hint", text: "Tap to keep the conversation going" });
    const root = shell(card, item,
      h("div", { class: "scene-place", html: KG.art.icon("pin") + esc(card.place) }), chat, hint);
    const order = [];
    let shown = 0;

    function line([who, ko, en]) {
      if (!order.includes(who)) order.push(who);
      const right = order.indexOf(who) % 2 === 1;
      const cast = KG.art.CAST[who] || { name: who };
      let english;
      if (KG.store.settings.english) {
        english = h("p", { class: "speech-en", text: en });
      } else {
        english = h("button", { class: "reveal-en", type: "button", text: "Show English" });
        english.addEventListener("click", () => english.replaceWith(h("p", { class: "speech-en", text: en })));
      }
      return h("div", { class: "line" + (right ? " right" : "") },
        h("div", { class: "avatar", html: KG.art.avatar(who) }, h("span", { class: "ko", text: cast.name })),
        h("div", { class: "speech" },
          h("div", { class: "speech-ko ko" }, h("span", { html: md(ko) }), sayBtn(ko)),
          english));
    }

    function next() {
      if (shown >= card.lines.length) return;
      const el = line(card.lines[shown++]);
      chat.append(el);
      if (shown > 1) {
        KG.audio.sfx("tap");
        requestAnimationFrame(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }));
      }
      if (shown === card.lines.length) {
        hint.remove();
        if (card.note) root.append(manduNote(card.note));
        ctx.ready();
      } else {
        ctx.footer("Next line", true, next);
      }
    }

    root.addEventListener("click", (e) => {
      if (!e.target.closest("button, mark, a, summary")) next();
    });
    next();
    return root;
  }

  function block(b) {
    if (b.p) return h("p", { html: md(b.p) });
    if (b.formula) {
      return h("div", { class: "formula ko" }, b.formula.split(" + ").flatMap((part, i) => {
        const t = part.trim();
        const hot = /^\{.*\}$/.test(t);
        const el = h("span", { class: "part" + (hot ? " hot" : ""), html: md(hot ? t.slice(1, -1) : t) });
        return i ? [h("span", { class: "plus", "aria-hidden": "true", text: "+" }), el] : [el];
      }));
    }
    if (b.roles) {
      return h("div", { class: "roles" }, b.roles.map(([ko, label]) =>
        h("div", { class: "role" }, h("b", { class: "ko", text: ko }), h("small", { text: label }))));
    }
    if (b.table) {
      return h("div", { class: "table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, b.table.head.map((c) => h("th", { html: md(c) })))),
        h("tbody", {}, b.table.rows.map((r) => h("tr", {}, r.map((c) => h("td", { class: H.hasHangul(c) ? "ko" : null, html: md(c) })))))));
    }
    if (b.ex) {
      return h("ul", { class: "ex-list" }, b.ex.map(([ko, en]) =>
        h("li", { class: "ex" },
          h("div", { class: "ex-text" }, h("div", { class: "ex-ko ko", html: md(ko) }), en ? h("div", { class: "ex-en", html: md(en) }) : null),
          sayBtn(ko))));
    }
    if (b.tip) return h("div", { class: "note tip" }, h("span", { class: "note-label", text: b.label || "Mandu's tip" }), h("p", { html: md(b.tip) }));
    if (b.warn) return h("div", { class: "note warn" }, h("span", { class: "note-label", text: b.label || "Watch out!" }), h("p", { html: md(b.warn) }));
    if (b.list) return h("ul", { class: "dots" }, b.list.map((t) => h("li", { html: md(t) })));
    if (b.reveal) {
      return h("details", { class: "deep" },
        h("summary", { html: md(b.reveal.q) }),
        h("div", {}, h("p", { html: md(b.reveal.a) })));
    }
    return null;
  }

  function learn(card, ctx, item) {
    ctx.ready();
    return shell(card, item,
      card.title ? h("h2", { html: md(card.title) }) : null,
      h("div", { class: "learn" }, card.blocks.map(block)));
  }

  function lab(card, ctx, item) {
    ctx.ready();
    return shell(card, item, card.lab === "verbs" ? KG.labs.verbs(card) : KG.labs.batchim(card));
  }

  function discover(card, ctx, item) {
    const examples = card.examples
      ? h("div", { class: "examples" }, card.examples.map(([ko, en]) =>
        h("div", { class: "example-chip" }, h("span", { class: "ko", html: md(ko) }), en ? h("small", { text: en }) : null)))
      : null;
    const { box, buttons } = optionList(card.options, (i, btn) => {
      lock(buttons);
      const ok = i === card.answer;
      if (ok) markRight(btn);
      else {
        btn.classList.add("wrong");
        markRight(buttons[card.answer]);
      }
      ctx.answer(ok, { graded: false, explain: card.explain });
    });
    ctx.footer("Continue", false);
    return shell(card, item,
      manduNote(card.intro || "No pressure, this one doesn't count. Can you spot the pattern?", "think"),
      examples,
      h("p", { class: "prompt", html: md(card.q) }),
      box);
  }

  function summary(card, ctx, item) {
    ctx.ready();
    return shell(card, item,
      h("span", { class: "saved-sticker", html: KG.art.icon("book") + " Saved to your notebook" }),
      h("h2", { class: "ko", html: md(card.lesson.pattern) }),
      notes(card.lesson));
  }

  // The lesson's cheat sheet, shared by the summary card and the notebook.
  function notes(lesson) {
    const n = lesson.notes;
    return h("div", { class: "learn" },
      h("p", { class: "nb-meaning", html: md(n.meaning) }),
      block({ table: { head: ["When", "Form", "Example"], rows: n.forms } }),
      block({ ex: n.examples }),
      h("ul", { class: "tips-list" }, n.tips.map((t) => h("li", { html: md(t) }))));
  }

  /* ---------- exercises ---------- */

  function choice(card, ctx, item) {
    const correct = card.options[card.answer];
    const sentence = card.sentence
      ? h("div", { class: "index-card" },
        h("div", { class: "sentence ko", html: md(card.sentence) }),
        card.en ? h("p", { class: "sentence-en", html: md(card.en) }) : null)
      : null;
    const order = card.fixed ? card.options.map((_, i) => i) : shuffle(card.options.map((_, i) => i));
    const { box, buttons } = optionList(order.map((i) => card.options[i]), (k, btn) => {
      lock(buttons);
      const chosen = order[k];
      const ok = chosen === card.answer;
      if (ok) markRight(btn);
      else {
        btn.classList.add("wrong");
        markRight(buttons[order.indexOf(card.answer)]);
      }
      let full = H.hasHangul(correct) ? correct : null;
      if (sentence) {
        const blank = sentence.querySelector(".blank");
        if (blank) {
          blank.textContent = plain(correct);
          blank.classList.add("filled", "good");
        }
        full = card.sentence.replace(/_{2,}/, correct);
      }
      ctx.answer(ok, {
        explain: card.explain,
        why: !ok && card.why ? card.why[card.options[chosen]] : null,
        answer: full,
      });
    });
    ctx.footer("Continue", false);
    return shell(card, item, card.q ? h("p", { class: "prompt", html: md(card.q) }) : null, sentence, box);
  }

  function norm(s) {
    return String(s).replace(/\s+/g, " ").trim();
  }

  // Tiles are listed in the correct order in the content; they're shuffled here.
  function build(card, ctx, item) {
    const target = card.tiles.join(" ");
    const answers = [target].concat(card.alt || []).map(norm);
    const line = h("div", { class: "answer-line ko", "aria-label": "Your sentence" });
    const bank = h("div", { class: "bank ko", "aria-label": "Word tiles" });
    const picked = [];
    let done = false;

    function check() {
      if (done || !picked.length) return;
      done = true;
      const ok = answers.includes(norm(picked.map((p) => p.text).join(" ")));
      line.classList.add(ok ? "good" : "bad");
      line.querySelectorAll("button").forEach((b) => (b.disabled = true));
      bank.querySelectorAll("button").forEach((b) => (b.disabled = true));
      ctx.answer(ok, { explain: card.explain, answer: target });
    }

    shuffle(card.tiles.concat(card.extra || [])).forEach((text) => {
      const src = h("button", { class: "tile", type: "button", text });
      src.addEventListener("click", () => {
        if (done || src.classList.contains("ghost")) return;
        src.classList.add("ghost");
        src.disabled = true;
        const placed = h("button", { class: "tile", type: "button", text });
        const entry = { text, el: placed };
        placed.addEventListener("click", () => {
          if (done) return;
          picked.splice(picked.indexOf(entry), 1);
          placed.remove();
          src.classList.remove("ghost");
          src.disabled = false;
          ctx.footer("Check", picked.length > 0, check);
        });
        picked.push(entry);
        line.append(placed);
        KG.audio.sfx("tap");
        ctx.footer("Check", true, check);
      });
      bank.append(src);
    });

    ctx.footer("Check", false, check);
    return shell(card, item,
      h("p", { class: "prompt" }, "Say this in Korean: ", h("strong", { html: md("“" + card.en + "”") })),
      h("div", { class: "index-card" }, line),
      bank);
  }

  function placedLabel(card, it) {
    const bucket = plain(card.buckets[it[2]]);
    if (/_{2,}/.test(it[0])) return it[0].replace(/_{2,}/, "{" + bucket + "}");
    return card.join ? it[0] + "{" + bucket + "}" : it[0];
  }

  function hintFor(card, it) {
    const bucket = plain(card.buckets[it[2]]);
    if (it[3]) return it[3];
    if (card.auto === "batchim") {
      const last = H.lastBlock(it[0]);
      const f = H.batchim(it[0]);
      return (f ? last + " has a 받침 (" + f + ")" : last + " has no 받침") + " → **" + bucket + "**";
    }
    if (card.auto === "vowel") {
      const stem = H.stemOf(it[0]);
      const j = H.jamo(stem[stem.length - 1]);
      return "Stem **" + stem + "**, last vowel " + j.m + " → **" + bucket + "**";
    }
    return "This one goes in **" + bucket + "**.";
  }

  // items: [label, english, bucketIndex, optional hint]
  function sort(card, ctx, item) {
    const items = shuffle(card.items);
    const slot = h("div", { class: "sort-slot", "aria-live": "polite" });
    const hint = h("p", { class: "sort-hint", "aria-live": "polite" });
    const count = h("p", { class: "sort-count" });
    let k = 0;
    let mistakes = 0;
    let missed = false;

    const bins = card.buckets.map((name, bi) => {
      const list = h("div", { class: "bucket-items" });
      const btn = h("button", { class: "bucket", type: "button", "aria-label": "Put it in " + plain(name) },
        h("span", { class: "bucket-name ko", html: md(name) }), list);
      btn.addEventListener("click", () => drop(bi, btn, list));
      return btn;
    });

    function showItem() {
      const [label, en] = items[k];
      slot.replaceChildren(h("div", { class: "sort-item" }, h("b", { class: "ko", html: md(label) }), en ? h("small", { text: en }) : null));
      count.textContent = k + 1 + " of " + items.length;
      hint.textContent = "";
      missed = false;
    }

    function drop(bi, btn, list) {
      if (k >= items.length) return;
      const it = items[k];
      if (bi === it[2]) {
        KG.audio.sfx("good");
        list.append(h("span", { class: "ko", html: md(placedLabel(card, it)) }));
        restart(btn, "flash");
        setTimeout(() => btn.classList.remove("flash"), 450);
        k++;
        if (k < items.length) showItem();
        else finish();
      } else {
        if (!missed) mistakes++;
        missed = true;
        KG.audio.sfx("bad");
        restart(btn, "nope");
        const el = slot.firstChild;
        if (el) restart(el, "wrong");
        hint.innerHTML = md(hintFor(card, it));
      }
    }

    function finish() {
      slot.replaceChildren(h("div", { class: "sort-item" },
        h("b", { text: mistakes ? "All sorted!" : "Perfect!" }),
        h("small", { text: items.length + " words sorted" })));
      count.textContent = "";
      hint.textContent = "";
      bins.forEach((b) => (b.disabled = true));
      ctx.answer(mistakes === 0, {
        explain: card.explain,
        detail: mistakes ? mistakes + (mistakes === 1 ? " slip" : " slips") + " along the way." : "No slips at all!",
      });
    }

    showItem();
    ctx.footer("Continue", false);
    return shell(card, item,
      h("p", { class: "prompt", html: md(card.q) }),
      h("div", { class: "sort-stage" }, slot, count, hint, h("div", { class: "buckets", style: "--n: " + card.buckets.length }, bins)));
  }

  function match(card, ctx, item) {
    const left = shuffle(card.pairs.map((p, i) => ({ text: p[0], i })));
    const right = shuffle(card.pairs.map((p, i) => ({ text: p[1], i })));
    const sel = { l: null, r: null };
    let matched = 0;
    let mistakes = 0;

    function check() {
      const { l, r } = sel;
      sel.l = sel.r = null;
      l.el.classList.remove("selected");
      r.el.classList.remove("selected");
      if (l.i === r.i) {
        l.done = r.done = true;
        [l.el, r.el].forEach((b) => {
          b.classList.add("done");
          b.disabled = true;
        });
        KG.audio.sfx("good");
        matched++;
        if (matched === card.pairs.length) {
          ctx.answer(mistakes === 0, {
            explain: card.explain,
            detail: mistakes ? mistakes + (mistakes === 1 ? " mix-up" : " mix-ups") + " on the way." : "Every pair on the first try!",
          });
        }
      } else {
        mistakes++;
        KG.audio.sfx("bad");
        [l.el, r.el].forEach((b) => {
          restart(b, "wrong");
          setTimeout(() => b.classList.remove("wrong"), 500);
        });
      }
    }

    function tap(side, x) {
      if (x.done) return;
      const prev = sel[side];
      if (prev) prev.el.classList.remove("selected");
      if (prev === x) {
        sel[side] = null;
        return;
      }
      sel[side] = x;
      x.el.classList.add("selected");
      if (!(H.hasHangul(x.text) && KG.audio.say(plain(x.text)))) KG.audio.sfx("tap");
      if (sel.l && sel.r) check();
    }

    function column(list, side) {
      return h("div", { class: "match-col" }, list.map((x) => {
        x.el = h("button", { class: "opt" + (H.hasHangul(x.text) ? " ko-side ko" : ""), type: "button", html: md(x.text) });
        x.el.addEventListener("click", () => tap(side, x));
        return x.el;
      }));
    }

    ctx.footer("Continue", false);
    return shell(card, item,
      h("p", { class: "prompt", html: md(card.q || "Tap a card on the left, then its partner on the right.") }),
      h("div", { class: "match" }, column(left, "l"), column(right, "r")));
  }

  // sentence: words separated by spaces, the wrong part in [brackets].
  function fix(card, ctx, item) {
    const parts = card.sentence.match(/\[[^\]]+\]\S*|\S+/g);
    const hint = h("p", { class: "step-hint", "aria-live": "polite" });
    const area = h("div", { class: "fix-area" });
    let mistakes = 0;
    let found = false;
    let target = null;
    let suffix = "";

    const tokens = parts.map((p) => {
      const m = p.match(/^\[([^\]]+)\](.*)$/);
      const b = h("button", { class: "token ko", type: "button", text: m ? m[1] + m[2] : p });
      if (m) {
        target = b;
        suffix = m[2];
      }
      b.addEventListener("click", () => {
        if (found) return;
        if (m) {
          found = true;
          b.classList.add("found");
          tokens.forEach((t) => (t.disabled = true));
          KG.audio.sfx("step");
          hint.textContent = "";
          ask();
        } else {
          mistakes++;
          KG.audio.sfx("bad");
          restart(b, "wrong");
          hint.textContent = "That part is fine. Look again!";
        }
      });
      return b;
    });

    function ask() {
      const order = shuffle(card.options.map((_, i) => i));
      const { box, buttons } = optionList(order.map((i) => card.options[i]), (k, btn) => {
        lock(buttons);
        const ok = order[k] === card.answer;
        if (ok) markRight(btn);
        else {
          mistakes++;
          btn.classList.add("wrong");
          markRight(buttons[order.indexOf(card.answer)]);
        }
        target.textContent = card.options[card.answer] + suffix;
        target.classList.add("fixed");
        ctx.answer(mistakes === 0, {
          explain: card.explain,
          answer: card.sentence.replace(/\[[^\]]+\]/, card.options[card.answer]),
        });
      });
      area.replaceChildren(h("p", { class: "step-q", text: "What should it be?" }), box);
    }

    ctx.footer("Continue", false);
    return shell(card, item,
      h("p", { class: "prompt", html: md(card.q || "One part of this sentence is wrong. Tap it!") }),
      h("div", { class: "index-card" },
        h("div", { class: "tokens" }, tokens),
        card.en ? h("p", { class: "sentence-en", html: md(card.en) }) : null),
      hint,
      area);
  }

  // A guided chain of small choices, e.g. dictionary form → stem → ending.
  function steps(card, ctx, item) {
    const state = h("div", { class: "machine-state ko", text: card.start });
    const trail = h("div", { class: "machine-trail ko", "aria-hidden": "true" }, h("span", { text: card.start }));
    const question = h("p", { class: "step-q" });
    const area = h("div");
    const hint = h("p", { class: "step-hint", "aria-live": "polite" });
    let k = 0;
    let mistakes = 0;

    function render() {
      const s = card.steps[k];
      question.innerHTML = md("**Step " + (k + 1) + " of " + card.steps.length + ".** " + s.q);
      const order = shuffle(s.options.map((_, i) => i));
      const { box, buttons } = optionList(order.map((i) => s.options[i]), (j, btn) => {
        if (order[j] !== s.answer) {
          mistakes++;
          btn.classList.add("wrong");
          btn.disabled = true;
          KG.audio.sfx("bad");
          hint.innerHTML = md(s.hint || "Not quite. Try another one!");
          return;
        }
        lock(buttons);
        markRight(btn);
        hint.textContent = "";
        state.textContent = s.show;
        restart(state, "bump");
        trail.append(h("span", { text: "→" }), h("span", { text: s.show }));
        k++;
        if (k < card.steps.length) {
          KG.audio.sfx("step");
          setTimeout(render, 500);
        } else {
          question.innerHTML = md("**Done!**");
          ctx.answer(mistakes === 0, { explain: card.explain, answer: card.say || s.show });
        }
      });
      area.replaceChildren(box);
    }

    render();
    ctx.footer("Continue", false);
    return shell(card, item,
      h("p", { class: "prompt", html: md(card.q) }),
      h("div", { class: "machine" }, state, trail),
      question, area, hint);
  }

  const RENDER = { scene, discover, learn, lab, summary, choice, build, sort, match, fix, steps };

  function render(card, ctx, item) {
    const fn = RENDER[card.type];
    if (!fn) throw new Error("Unknown card type: " + card.type);
    return fn(card, ctx, item);
  }

  KG.cards = { render, notes, block, manduNote, GRADED, TYPES: Object.keys(RENDER) };
})(window.KG = window.KG || {});
