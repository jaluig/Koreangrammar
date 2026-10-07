/*
 * Small UI helpers shared by every screen: a DOM builder, the inline markup
 * used in the content files, speaker buttons, gloss tooltips and confetti.
 */
(function (KG) {
  "use strict";

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  /*
   * Inline markup for content strings:
   *   {grammar}         highlighted target grammar
   *   {grammar|gloss}   highlighted, tap to see the gloss
   *   **bold**  *italic*  ~~wrong form~~
   *   __                a blank to fill in
   */
  function md(s) {
    let out = esc(s);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/~~(.+?)~~/g, "<s>$1</s>");
    out = out.replace(/\*(?!\s)(.+?)\*/g, "<em>$1</em>");
    out = out.replace(/\{([^{}|]+)\|([^{}]+)\}/g, '<mark class="hl" tabindex="0" data-gloss="$2">$1</mark>');
    out = out.replace(/\{([^{}]+)\}/g, '<mark class="hl">$1</mark>');
    out = out.replace(/_{2,}/g, '<span class="blank"></span>');
    return out;
  }

  // Text without markup, for speech and aria labels.
  function plain(s) {
    return String(s == null ? "" : s)
      .replace(/\{([^{}|]+)(?:\|[^{}]*)?\}/g, "$1")
      .replace(/\*\*|~~|\*/g, "")
      .replace(/_{2,}/g, "…")
      .replace(/^[A-Z]:\s*/, "");
  }

  function append(el, kids) {
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "text") el.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (typeof v === "boolean") el[k] = v;
        else el.setAttribute(k, v);
      }
    }
    return append(el, kids);
  }

  function sayBtn(text) {
    const words = plain(text);
    const b = h("button", { class: "say", type: "button", "aria-label": "Listen: " + words, html: KG.art.icon("speaker") });
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      KG.audio.say(words, b);
    });
    return b;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Tap a glossed highlight to see its meaning; tap elsewhere to hide it.
  function initGlosses() {
    document.addEventListener("click", (e) => {
      const mark = e.target.closest && e.target.closest("mark[data-gloss]");
      document.querySelectorAll("mark.show").forEach((m) => m !== mark && m.classList.remove("show"));
      if (mark) mark.classList.toggle("show");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches && e.target.matches("mark[data-gloss]")) e.target.classList.toggle("show");
    });
  }

  function confetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["var(--lvl-1)", "var(--lvl-2)", "var(--lvl-3)", "var(--lvl-4)", "var(--lvl-5)", "var(--accent)"];
    const box = h("div", { class: "confetti", "aria-hidden": "true" });
    for (let k = 0; k < 46; k++) {
      const piece = h("i");
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[k % colors.length];
      piece.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      piece.style.animationDelay = Math.random() * 0.5 + "s";
      if (k % 3 === 0) piece.style.borderRadius = "50%";
      box.append(piece);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 4200);
  }

  function toast(text) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const t = h("div", { class: "toast", role: "status", text });
    document.body.append(t);
    setTimeout(() => t.classList.add("out"), 2200);
    setTimeout(() => t.remove(), 2700);
  }

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  KG.ui = { esc, md, plain, h, append, sayBtn, shuffle, initGlosses, confetti, toast, pickOne };
})(window.KG = window.KG || {});
