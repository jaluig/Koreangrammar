/*
 * Progress and settings, saved in this browser's localStorage.
 * Storage can be unavailable (private windows, blocked site data), so every
 * read and write is guarded and the game still works for the current visit.
 */
(function (KG) {
  "use strict";

  const KEY = "mandu-grammar-diary:v1";
  const DEFAULT_SETTINGS = { sound: true, voice: true, english: true, theme: "system", unlockAll: false };

  function fresh() {
    return { xp: 0, done: {}, seen: {}, settings: Object.assign({}, DEFAULT_SETTINGS) };
  }

  let data = fresh();

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      data = {
        xp: Number(saved.xp) || 0,
        done: saved.done && typeof saved.done === "object" ? saved.done : {},
        seen: saved.seen && typeof saved.seen === "object" ? saved.seen : {},
        settings: Object.assign({}, DEFAULT_SETTINGS, saved.settings),
      };
    } catch (e) {
      data = fresh();
    }
  }

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // Storage is unavailable: progress lasts until the page closes.
    }
  }

  // The course as one ordered list: lessons, then the level's pop quiz.
  function sequence() {
    const out = [];
    for (const level of KG.course.levels) {
      for (const lesson of level.lessons) out.push({ kind: "lesson", id: lesson.id, level, lesson });
      if (level.quiz) out.push({ kind: "quiz", id: "q" + level.id, level, quiz: level.quiz });
    }
    return out;
  }

  function find(id) {
    return sequence().find((x) => x.id === id) || null;
  }

  function record(id) {
    return data.done[id] || null;
  }

  function isDone(id) {
    return Boolean(data.done[id]);
  }

  function isUnlocked(id) {
    if (data.settings.unlockAll) return true;
    const seq = sequence();
    const i = seq.findIndex((x) => x.id === id);
    return i <= 0 || isDone(seq[i - 1].id);
  }

  function nextItem() {
    return sequence().find((x) => !isDone(x.id) && isUnlocked(x.id)) || null;
  }

  function finish(id, stamps, xp) {
    const prev = data.done[id];
    data.done[id] = { stamps: Math.max(stamps, prev ? prev.stamps : 0), plays: (prev ? prev.plays : 0) + 1 };
    data.xp += xp;
    save();
    return { first: !prev, improved: !prev || stamps > prev.stamps };
  }

  function addXp(n) {
    data.xp += n;
    save();
  }

  function totalStamps() {
    return sequence().reduce((sum, x) => sum + (data.done[x.id] ? data.done[x.id].stamps : 0), 0);
  }

  function maxStamps() {
    return sequence().length * 3;
  }

  function set(key, value) {
    data.settings[key] = value;
    save();
  }

  // One-time hints ("seen" flags) survive a progress reset.
  function once(key) {
    if (data.seen[key]) return false;
    data.seen[key] = true;
    save();
    return true;
  }

  function reset() {
    const settings = data.settings;
    const seen = data.seen;
    data = fresh();
    data.settings = settings;
    data.seen = seen;
    save();
  }

  KG.store = {
    load, save, sequence, find, record, isDone, isUnlocked, nextItem, finish, addXp, totalStamps, maxStamps, set, once, reset,
    get settings() {
      return data.settings;
    },
    get xp() {
      return data.xp;
    },
  };
})(window.KG = window.KG || {});
