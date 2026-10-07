// Validates every lesson file: structure, answers that point at real options,
// tiles that can build the target sentence, and particle answers that agree
// with the 받침 rules. Run it after adding or editing content.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadKG, scriptsFromIndex } = require("./load");

const files = scriptsFromIndex().filter((f) => /hangul\.js$|art\.js$|\/content\//.test(f));
const KG = loadKG(files);
const H = KG.hangul;
const levels = KG.course.levels;

const INFO = ["scene", "discover", "learn", "lab"];
const GRADED = ["choice", "build", "sort", "match", "fix", "steps"];
const BLOCKS = ["p", "formula", "roles", "table", "ex", "tip", "warn", "list", "reveal"];
const PAIRS = [["이에요", "예요"], ["은", "는"], ["이", "가"], ["을", "를"], ["이었어요", "였어요"]];

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

function checkMarkup(where, value) {
  for (const s of strings(value)) {
    let depth = 0;
    for (const ch of s) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      assert.ok(depth >= 0 && depth <= 1, where + ": unbalanced or nested {braces} in: " + s);
    }
    assert.equal(depth, 0, where + ": unclosed {brace} in: " + s);
    assert.equal((s.match(/\*\*/g) || []).length % 2, 0, where + ": unclosed **bold** in: " + s);
  }
}

function checkOptions(where, options, answer) {
  assert.ok(Array.isArray(options) && options.length >= 2 && options.length <= 4, where + ": needs 2-4 options");
  assert.equal(new Set(options).size, options.length, where + ": duplicate options");
  assert.ok(Number.isInteger(answer) && answer >= 0 && answer < options.length, where + ": answer index out of range");
}

// For "word__" blanks whose options are a particle pair, the answer must match the 받침 rule.
function checkParticleBlank(where, card) {
  const pair = PAIRS.find((p) => card.options.length === 2 && p.every((x) => card.options.includes(x)));
  if (!pair || !card.sentence) return;
  const m = card.sentence.match(/([가-힣]+)_{2,}/);
  if (!m) return;
  assert.equal(card.options[card.answer], H.pick(m[1], pair), where + ": particle answer disagrees with the 받침 rule for " + m[1]);
}

function checkExercise(where, c) {
  assert.ok(GRADED.includes(c.type), where + ": unknown exercise type " + c.type);
  switch (c.type) {
    case "choice":
      checkOptions(where, c.options, c.answer);
      assert.ok(c.q || c.sentence, where + ": needs q or sentence");
      if (c.sentence) assert.equal((c.sentence.match(/_{2,}/g) || []).length, 1, where + ": sentence needs exactly one __ blank");
      if (c.why) for (const k of Object.keys(c.why)) assert.ok(c.options.includes(k), where + ": why key is not an option: " + k);
      assert.ok(c.explain, where + ": needs explain");
      checkParticleBlank(where, c);
      break;
    case "build": {
      assert.ok(Array.isArray(c.tiles) && c.tiles.length >= 1, where + ": needs tiles");
      assert.ok(c.en, where + ": needs en");
      for (const t of c.extra || []) assert.ok(!c.tiles.includes(t), where + ": extra tile duplicates a real tile: " + t);
      const bag = c.tiles.concat(c.extra || []);
      for (const alt of c.alt || []) {
        const left = bag.slice();
        for (const word of alt.split(" ")) {
          const i = left.indexOf(word);
          assert.ok(i >= 0, where + ": alt answer can't be built from tiles: " + alt);
          left.splice(i, 1);
        }
      }
      break;
    }
    case "sort":
      assert.ok(c.buckets.length >= 2 && c.buckets.length <= 3, where + ": needs 2-3 buckets");
      assert.ok(c.items.length >= 4, where + ": needs at least 4 items");
      for (const it of c.items) {
        assert.ok(Number.isInteger(it[2]) && it[2] >= 0 && it[2] < c.buckets.length, where + ": bad bucket for " + it[0]);
        if (c.auto === "batchim") assert.equal(c.buckets[it[2]], H.pick(it[0], c.buckets), where + ": " + it[0] + " is in the wrong bucket");
        if (c.auto === "vowel") {
          const stem = H.stemOf(it[0]);
          const bright = H.isBright(H.jamo(stem[stem.length - 1]).m);
          assert.equal(it[2], bright ? 0 : 1, where + ": " + it[0] + " is in the wrong bucket (bright vowels go in bucket 0)");
        }
      }
      break;
    case "match":
      assert.ok(c.pairs.length >= 3 && c.pairs.length <= 5, where + ": needs 3-5 pairs");
      assert.equal(new Set(c.pairs.map((p) => p[0])).size, c.pairs.length, where + ": duplicate left side");
      assert.equal(new Set(c.pairs.map((p) => p[1])).size, c.pairs.length, where + ": duplicate right side");
      break;
    case "fix": {
      const marks = c.sentence.match(/\[[^\]]+\]/g) || [];
      assert.equal(marks.length, 1, where + ": sentence needs exactly one [wrong part]");
      checkOptions(where, c.options, c.answer);
      assert.notEqual(c.options[c.answer], marks[0].slice(1, -1), where + ": the fix is the same as the mistake");
      assert.ok(c.explain, where + ": needs explain");
      break;
    }
    case "steps":
      assert.ok(c.start && c.steps.length >= 1, where + ": needs start and steps");
      c.steps.forEach((s, i) => {
        checkOptions(where + " step " + (i + 1), s.options, s.answer);
        assert.ok(s.show, where + " step " + (i + 1) + ": needs show");
      });
      break;
  }
}

function checkCard(where, c, cast) {
  if (GRADED.includes(c.type)) return checkExercise(where, c);
  assert.ok(INFO.includes(c.type), where + ": unknown card type " + c.type);
  if (c.type === "scene") {
    assert.ok(c.place && c.lines.length >= 2, where + ": scene needs a place and lines");
    for (const line of c.lines) {
      assert.ok(cast.includes(line[0]), where + ": unknown speaker " + line[0]);
      assert.ok(line[1] && line[2], where + ": each line needs Korean and English");
    }
  }
  if (c.type === "discover") {
    checkOptions(where, c.options, c.answer);
    assert.ok(c.explain, where + ": needs explain");
  }
  if (c.type === "learn") {
    assert.ok(c.blocks.length, where + ": needs blocks");
    for (const b of c.blocks) assert.ok(BLOCKS.some((k) => k in b), where + ": unknown block " + JSON.stringify(b).slice(0, 60));
  }
  if (c.type === "lab") {
    assert.ok(["batchim", "verbs"].includes(c.lab), where + ": unknown lab " + c.lab);
    if (c.lab === "batchim") {
      assert.equal(c.pair.length, 2, where + ": pair needs two forms");
      for (const [w] of c.words) assert.ok(H.lastBlock(w), where + ": not a Korean word: " + w);
    } else {
      for (const [v, , kind] of c.verbs) if (!(c.mode === "want" && kind === "adj")) H.conjugate(v, c.mode);
    }
  }
}

test("levels are numbered in order and have content", () => {
  assert.ok(levels.length >= 1);
  levels.forEach((level, i) => {
    assert.equal(level.id, i + 1, "level ids should be 1, 2, 3...");
    for (const key of ["num", "ko", "title", "blurb"]) assert.ok(level[key], "level " + level.id + " needs " + key);
    assert.ok(level.lessons.length >= 1, "level " + level.id + " needs lessons");
  });
});

test("every lesson is well formed", () => {
  const ids = new Set();
  const cast = Object.keys(KG.art.CAST);
  for (const level of levels) {
    level.lessons.forEach((L, i) => {
      const where = "lesson " + L.id;
      assert.equal(L.id, level.id + "-" + (i + 1), where + ": ids should follow the level, e.g. 2-3");
      assert.ok(!ids.has(L.id), where + ": duplicate id");
      ids.add(L.id);
      for (const key of ["sticker", "pattern", "title", "goal"]) assert.ok(L[key], where + " needs " + key);
      assert.ok(L.sticker.length <= 6, where + ": sticker text is too long for a map node");
      assert.ok(L.cards.filter((c) => GRADED.includes(c.type)).length >= 3, where + ": needs at least 3 exercises");
      L.cards.forEach((c, k) => checkCard(where + " card " + (k + 1) + " (" + c.type + ")", c, cast));
      const n = L.notes;
      assert.ok(n && n.meaning && n.forms.length && n.examples.length && n.tips.length, where + ": needs notes");
      n.forms.forEach((row) => assert.equal(row.length, 3, where + ": note forms need 3 columns"));
      checkMarkup(where, L);
    });
  }
});

test("pop quizzes are well formed", () => {
  for (const level of levels) {
    const q = level.quiz;
    if (!q) continue;
    const where = "level " + level.id + " quiz";
    assert.ok((q.count || 10) >= (q.extra || []).length, where + ": count is smaller than its own questions");
    (q.extra || []).forEach((c, k) => checkExercise(where + " q" + (k + 1), c));
    checkMarkup(where, q);
  }
});

test("highlighted particles in the text follow the 받침 rule", () => {
  const PAIR_OF = { 이에요: PAIRS[0], 예요: PAIRS[0], 은: PAIRS[1], 는: PAIRS[1], 이: PAIRS[2], 가: PAIRS[2], 을: PAIRS[3], 를: PAIRS[3], 이었어요: PAIRS[4], 였어요: PAIRS[4] };
  for (const s of strings(levels)) {
    // e.g. 학생{이에요}, 저{는}, 물{이 아니에요}, 준호 씨{는요}?
    for (const m of s.matchAll(/([가-힣]+)\{(이에요|예요|이었어요|였어요|은|는|이|가|을|를)(?=[ }요])/g)) {
      assert.equal(H.pick(m[1], PAIR_OF[m[2]]), m[2], "wrong particle in “" + s + "”: " + m[1] + " takes " + H.pick(m[1], PAIR_OF[m[2]]));
    }
  }
});

test("verb forms written as “X다 → Y” match the conjugation engine", () => {
  for (const s of strings(levels)) {
    for (const m of s.replace(/[{}*]/g, "").matchAll(/([가-힣]+다) → ([가-힣]+(?: 거예요| 싶어요)?)/g)) {
      const [, verb, form] = m;
      const forms = ["present", "past", "future", "want", "negative"].map((mode) => H.conjugate(verb, mode).form);
      const ok = forms.includes(form) || verb.startsWith(form); // a stem, e.g. 먹다 → 먹
      assert.ok(ok, verb + " → " + form + " doesn't match the engine (" + forms.join(", ") + "). If the verb is irregular, add it to IRREGULAR in js/hangul.js.");
    }
  }
});

test("roadmap and tool lists are usable", () => {
  for (const r of KG.course.roadmap) assert.ok(r.title && r.patterns.length, "roadmap level " + r.id);
  for (const [w] of KG.course.toolNouns) assert.ok(H.lastBlock(w), "tool noun " + w);
  for (const [v] of KG.course.toolVerbs) for (const mode of ["present", "past", "future", "negative"]) H.conjugate(v, mode);
});
