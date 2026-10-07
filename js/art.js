/*
 * Inline SVG artwork: Mandu (the steamed-bun mascot), the cast of characters,
 * the 참 잘했어요 stamp and small icons. Everything is drawn from simple shapes
 * so it scales cleanly and follows the theme tokens.
 */
(function (KG) {
  "use strict";

  const INK = "var(--bun-line)";

  // Mandu's face parts by mood: happy, idle, wow, sad, think.
  function face(mood) {
    const blush =
      '<ellipse cx="36" cy="77" rx="7.5" ry="4.2" fill="var(--blush)" opacity=".75"/>' +
      '<ellipse cx="84" cy="77" rx="7.5" ry="4.2" fill="var(--blush)" opacity=".75"/>';
    const stroke = 'fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
    const dotEyes =
      '<ellipse cx="46" cy="67" rx="3.6" ry="4.4" fill="' + INK + '"/><circle cx="47.2" cy="65.4" r="1.2" fill="#fff"/>' +
      '<ellipse cx="74" cy="67" rx="3.6" ry="4.4" fill="' + INK + '"/><circle cx="75.2" cy="65.4" r="1.2" fill="#fff"/>';
    switch (mood) {
      case "happy":
        return blush +
          '<path d="M40.5 68 q5.5 -7 11 0" ' + stroke + "/>" +
          '<path d="M68.5 68 q5.5 -7 11 0" ' + stroke + "/>" +
          '<path d="M53 74 q7 9 14 0 z" fill="' + INK + '"/><path d="M56.5 77.5 q3.5 2.6 7 0" fill="#ff8aa6"/>';
      case "wow":
        return blush +
          '<circle cx="46" cy="66" r="5" fill="' + INK + '"/><circle cx="47.6" cy="64.2" r="1.6" fill="#fff"/>' +
          '<circle cx="74" cy="66" r="5" fill="' + INK + '"/><circle cx="75.6" cy="64.2" r="1.6" fill="#fff"/>' +
          '<ellipse cx="60" cy="78" rx="4" ry="5" fill="' + INK + '"/>';
      case "sad":
        return blush +
          '<path d="M40 64 l9 -3.5" ' + stroke + '/><path d="M80 64 l-9 -3.5" ' + stroke + "/>" +
          '<ellipse cx="46" cy="70" rx="3.2" ry="3.6" fill="' + INK + '"/><ellipse cx="74" cy="70" rx="3.2" ry="3.6" fill="' + INK + '"/>' +
          '<path d="M54 80 q6 -5 12 0" ' + stroke + "/>" +
          '<path d="M90 56 q4 6 0 9 q-4 -3 0 -9 z" fill="#8fd3ff" stroke="' + INK + '" stroke-width="1.6"/>';
      case "think":
        return blush + dotEyes +
          '<path d="M55 78 q3 -3 6 0 q3 3 6 0" ' + stroke + "/>";
      default:
        return blush + dotEyes + '<path d="M54 75 q6 6 12 0" ' + stroke + "/>";
    }
  }

  function mandu(mood, extra) {
    return (
      '<svg class="mandu-svg ' + (extra || "") + '" viewBox="0 0 120 112" role="img" aria-label="Mandu the dumpling">' +
      '<g class="steam" fill="none" stroke="var(--ink-3)" stroke-width="2.6" stroke-linecap="round">' +
      '<path d="M46 16 q-4 -5 0 -10"/><path d="M60 12 q-4 -5 0 -10"/><path d="M74 16 q-4 -5 0 -10"/></g>' +
      '<ellipse cx="60" cy="104" rx="40" ry="5" fill="var(--ink)" opacity=".08"/>' +
      '<path d="M14 80 C 11 52, 32 31, 60 29 C 88 31, 109 52, 106 80 C 104 98, 86 103, 60 103 C 34 103, 16 98, 14 80 Z" fill="var(--bun)" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<g fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" opacity=".55">' +
      '<path d="M60 33 Q 47 38 38 49"/><path d="M60 33 Q 54 41 51 47"/><path d="M60 33 Q 66 41 69 47"/><path d="M60 33 Q 73 38 82 49"/></g>' +
      '<path d="M52 33 C 52 24, 57 20, 60 19 C 63 20, 68 24, 68 33 Z" fill="var(--bun)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M57 31 q2 -6 3 -9 M63 31 q-2 -6 -3 -9" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
      face(mood) +
      "</svg>"
    );
  }

  // Animal friends. Each avatar fits a 64x64 box.
  const CAST = {
    minji: { name: "민지", en: "Minji", kind: "bunny", fill: "#fff1f5", inner: "#ffc2d4" },
    junho: { name: "준호", en: "Junho", kind: "bear", fill: "#e9bf8f", inner: "#f7dcbc" },
    nabi: { name: "나비", en: "Nabi", kind: "cat", fill: "#ffd7a8", inner: "#ffb98a" },
    mandu: { name: "만두", en: "Mandu", kind: "mandu" },
  };

  function avatar(who) {
    const c = CAST[who] || CAST.mandu;
    if (c.kind === "mandu") return mandu("idle");
    const line = 'stroke="#3a3150" stroke-width="2.4"';
    const eyes = '<circle cx="25" cy="37" r="2.8" fill="#3a3150"/><circle cx="39" cy="37" r="2.8" fill="#3a3150"/>' +
      '<ellipse cx="20" cy="43" rx="4" ry="2.4" fill="#ff9fb8" opacity=".8"/><ellipse cx="44" cy="43" rx="4" ry="2.4" fill="#ff9fb8" opacity=".8"/>';
    let ears = "";
    let extra = "";
    if (c.kind === "bunny") {
      ears = '<ellipse cx="22" cy="14" rx="6.5" ry="14" fill="' + c.fill + '" ' + line + '/><ellipse cx="22" cy="15" rx="3" ry="9" fill="' + c.inner + '"/>' +
        '<ellipse cx="42" cy="14" rx="6.5" ry="14" fill="' + c.fill + '" ' + line + ' transform="rotate(12 42 14)"/><ellipse cx="42" cy="15" rx="3" ry="9" fill="' + c.inner + '" transform="rotate(12 42 14)"/>';
      extra = '<path d="M29 43 q3 3 6 0" fill="none" ' + line + ' stroke-linecap="round"/><circle cx="32" cy="41" r="1.8" fill="#ff8aa6"/>';
    } else if (c.kind === "bear") {
      ears = '<circle cx="15" cy="20" r="8" fill="' + c.fill + '" ' + line + '/><circle cx="15" cy="20" r="4" fill="' + c.inner + '"/>' +
        '<circle cx="49" cy="20" r="8" fill="' + c.fill + '" ' + line + '/><circle cx="49" cy="20" r="4" fill="' + c.inner + '"/>';
      extra = '<ellipse cx="32" cy="45" rx="8" ry="6" fill="' + c.inner + '"/><ellipse cx="32" cy="42.5" rx="3" ry="2.2" fill="#3a3150"/>' +
        '<path d="M29 47 q3 2.5 6 0" fill="none" ' + line + ' stroke-linecap="round"/>';
    } else if (c.kind === "cat") {
      ears = '<path d="M12 26 L16 8 L28 18 Z" fill="' + c.fill + '" ' + line + ' stroke-linejoin="round"/><path d="M16 22 L18 13 L24 18 Z" fill="' + c.inner + '"/>' +
        '<path d="M52 26 L48 8 L36 18 Z" fill="' + c.fill + '" ' + line + ' stroke-linejoin="round"/><path d="M48 22 L46 13 L40 18 Z" fill="' + c.inner + '"/>';
      extra = '<path d="M30 42 l2 2 l2 -2" fill="#ff8aa6" ' + line + ' stroke-linejoin="round"/>' +
        '<path d="M8 41 h9 M8 46 l9 -2 M56 41 h-9 M56 46 l-9 -2" ' + line + ' stroke-linecap="round" opacity=".6"/>' +
        '<path d="M26 20 q6 4 12 0" fill="none" stroke="' + c.inner + '" stroke-width="3" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 64 64" role="img" aria-label="' + c.en + '">' + ears +
      '<circle cx="32" cy="38" r="21" fill="' + c.fill + '" ' + line + "/>" + eyes + extra + "</svg>";
  }

  // The classic teacher's stamp. level: 3 = 참 잘했어요, 2 = 잘했어요, 1 = 힘내요
  const STAMP_TEXT = { 3: "참 잘했어요", 2: "잘했어요", 1: "힘내요" };

  function flower(cx, cy, r, color) {
    let petals = "";
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      petals += '<circle cx="' + (cx + Math.cos(a) * r).toFixed(2) + '" cy="' + (cy + Math.sin(a) * r).toFixed(2) + '" r="' + (r * 0.78).toFixed(2) + '" fill="' + color + '"/>';
    }
    return petals + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.62).toFixed(2) + '" fill="var(--paper)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.3).toFixed(2) + '" fill="' + color + '"/>';
  }

  function stamp(level) {
    const color = "var(--accent)";
    const text = STAMP_TEXT[level] || STAMP_TEXT[1];
    const size = text.length > 4 ? 15 : 19;
    return '<svg viewBox="0 0 120 120" role="img" aria-label="' + text + ' stamp">' +
      '<g opacity=".92">' +
      '<circle cx="60" cy="60" r="54" fill="none" stroke="' + color + '" stroke-width="5"/>' +
      '<circle cx="60" cy="60" r="46" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-dasharray="3 3"/>' +
      flower(60, 46, 12, color) +
      '<text x="60" y="88" text-anchor="middle" font-family="Jua, sans-serif" font-size="' + size + '" fill="' + color + '">' + text + "</text>" +
      "</g></svg>";
  }

  // Tiny flower used for stamp counts on the map.
  function miniStamp(filled) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (filled ? flower(12, 12, 5, "var(--accent)") : '<circle cx="12" cy="12" r="8" fill="none" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="2 3"/>') +
      "</svg>";
  }

  // Bamboo steamer for the verb lab.
  function steamer() {
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<g fill="none" stroke="var(--ink-3)" stroke-width="2.4" stroke-linecap="round" class="steam">' +
      '<path d="M22 12 q-3 -4 0 -8"/><path d="M32 10 q-3 -4 0 -8"/><path d="M42 12 q-3 -4 0 -8"/></g>' +
      '<path d="M8 26 Q32 12 56 26 Z" fill="#e7c48e" stroke="#3a3150" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<rect x="8" y="26" width="48" height="26" rx="6" fill="#f2d39f" stroke="#3a3150" stroke-width="2.4"/>' +
      '<path d="M8 34 h48 M8 43 h48" stroke="#c99b5c" stroke-width="2"/>' +
      '<circle cx="32" cy="20" r="3" fill="#3a3150"/></svg>';
  }

  const ICONS = {
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    heart: '<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" fill="currentColor"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
    speaker: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M6.5 8h2.5M15 8h2.5M15 11h2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    cross: '<path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="currentColor"/><circle cx="12" cy="10" r="2.4" fill="var(--paper)"/>',
    back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    star: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z" fill="currentColor"/>',
  };

  function icon(name, label) {
    return '<svg viewBox="0 0 24 24" ' + (label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"') + ">" + (ICONS[name] || "") + "</svg>";
  }

  // Hand-drawn circle, the Korean teacher's mark for "correct".
  function circleMark() {
    return '<svg class="circle-mark" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M20 44 C 18 18, 70 6, 110 8 C 160 10, 192 26, 186 46 C 180 68, 120 76, 80 72 C 40 68, 14 58, 24 34"/></svg>';
  }

  KG.art = { mandu, avatar, stamp, miniStamp, steamer, icon, circleMark, CAST, STAMP_TEXT };
})(window.KG = window.KG || {});
