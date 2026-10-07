/*
 * Hangul helpers.
 *  - Syllable math: split a block into jamo and build blocks from jamo.
 *  - 받침 (final consonant) checks and particle picking (은/는, 이/가, ...).
 *  - A small conjugation engine for regular verbs that also explains each
 *    step (used by the Verb Steamer lab and the notebook tools).
 * Irregular verbs are listed in IRREGULAR so the engine never guesses.
 */
(function (KG) {
  "use strict";

  const BASE = 0xac00;
  const END = 0xd7a3;
  const INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const MEDIALS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
  const FINALS = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

  // ㅏ and ㅗ are the "bright" vowels that take 아. (ㅑ behaves the same: 얇다 → 얇아요.)
  const BRIGHT = ["ㅏ", "ㅗ", "ㅑ"];

  // Verbs that break the regular rules. Want/negative forms are regular for all of them.
  const IRREGULAR = {
    "듣다": { kind: "ㄷ", present: "들어요", past: "들었어요", future: "들을 거예요" },
    "걷다": { kind: "ㄷ", present: "걸어요", past: "걸었어요", future: "걸을 거예요" },
    "돕다": { kind: "ㅂ", present: "도와요", past: "도왔어요", future: "도울 거예요" },
    "덥다": { kind: "ㅂ", present: "더워요", past: "더웠어요", future: "더울 거예요" },
    "춥다": { kind: "ㅂ", present: "추워요", past: "추웠어요", future: "추울 거예요" },
    "맵다": { kind: "ㅂ", present: "매워요", past: "매웠어요", future: "매울 거예요" },
    "쉽다": { kind: "ㅂ", present: "쉬워요", past: "쉬웠어요", future: "쉬울 거예요" },
    "어렵다": { kind: "ㅂ", present: "어려워요", past: "어려웠어요", future: "어려울 거예요" },
    "귀엽다": { kind: "ㅂ", present: "귀여워요", past: "귀여웠어요", future: "귀여울 거예요" },
    "반갑다": { kind: "ㅂ", present: "반가워요", past: "반가웠어요", future: "반가울 거예요" },
    "고맙다": { kind: "ㅂ", present: "고마워요", past: "고마웠어요", future: "고마울 거예요" },
    "모르다": { kind: "르", present: "몰라요", past: "몰랐어요", future: "모를 거예요" },
    "부르다": { kind: "르", present: "불러요", past: "불렀어요", future: "부를 거예요" },
    "빠르다": { kind: "르", present: "빨라요", past: "빨랐어요", future: "빠를 거예요" },
    "다르다": { kind: "르", present: "달라요", past: "달랐어요", future: "다를 거예요" },
    "짓다": { kind: "ㅅ", present: "지어요", past: "지었어요", future: "지을 거예요" },
    "낫다": { kind: "ㅅ", present: "나아요", past: "나았어요", future: "나을 거예요" },
    "푸다": { kind: "우", present: "퍼요", past: "펐어요", future: "풀 거예요" },
  };

  // Action verbs made of noun + 하다. Short negation splits them: 공부 안 해요.
  const NOUN_HADA = ["공부하다", "요리하다", "운동하다", "일하다", "청소하다", "숙제하다", "쇼핑하다", "전화하다", "노래하다", "산책하다", "샤워하다", "준비하다", "여행하다", "수영하다", "게임하다"];

  function isBlock(ch) {
    if (!ch) return false;
    const c = ch.charCodeAt(0);
    return c >= BASE && c <= END;
  }

  function jamo(ch) {
    if (!isBlock(ch)) return null;
    const c = ch.charCodeAt(0) - BASE;
    return { i: INITIALS[Math.floor(c / 588)], m: MEDIALS[Math.floor((c % 588) / 28)], f: FINALS[c % 28] };
  }

  function block(i, m, f) {
    const a = INITIALS.indexOf(i);
    const b = MEDIALS.indexOf(m);
    const c = FINALS.indexOf(f || "");
    if (a < 0 || b < 0 || c < 0) throw new Error("Not a valid syllable: " + i + m + (f || ""));
    return String.fromCharCode(BASE + a * 588 + b * 28 + c);
  }

  function lastBlock(word) {
    const s = String(word);
    for (let k = s.length - 1; k >= 0; k--) if (isBlock(s[k])) return s[k];
    return "";
  }

  function batchim(word) {
    const j = jamo(lastBlock(word));
    return j ? j.f : "";
  }

  function hasBatchim(word) {
    return batchim(word) !== "";
  }

  // pair = [form after a consonant, form after a vowel], e.g. ["은", "는"].
  function pick(word, pair) {
    const f = batchim(word);
    if (pair[0] === "으로" && f === "ㄹ") return pair[1]; // 서울로, not 서울으로
    return f ? pair[0] : pair[1];
  }

  const SPECIAL_SUBJECT = { "저가": "제가", "나가": "내가", "너가": "네가", "누구가": "누가" };

  function attach(word, pair) {
    const out = word + pick(word, pair);
    return SPECIAL_SUBJECT[out] || out;
  }

  function stemOf(verb) {
    if (!/다$/.test(verb) || verb.length < 2) throw new Error("Expected a dictionary form ending in 다: " + verb);
    return verb.slice(0, -1);
  }

  function addFinal(syllable, f) {
    const j = jamo(syllable);
    return block(j.i, j.m, f);
  }

  function withVowel(syllable, m) {
    const j = jamo(syllable);
    return block(j.i, m, j.f);
  }

  /*
   * The 아/어 form of a stem (가, 먹어, 해, 와, 마셔 ...) plus a description of
   * what happened. Present = form + 요, past = form + ㅆ + 어요.
   */
  function ahEo(stem) {
    const last = stem[stem.length - 1];
    const front = stem.slice(0, -1);
    if (last === "하") {
      return { form: front + "해", ending: "해요", vowel: "하", kind: "hada", note: "Every 하다 verb turns 하 into 해." };
    }
    const j = jamo(last);
    if (!j) throw new Error("Stem must end in a Hangul block: " + stem);

    let decider = j.m;
    let deciderNote = "";
    if (!j.f && j.m === "ㅡ") {
      const prev = jamo(lastBlock(front));
      decider = prev ? prev.m : "ㅡ";
      deciderNote = prev
        ? "ㅡ is a weak vowel, so look one block back: " + lastBlock(front) + " has " + prev.m + "."
        : "ㅡ is a weak vowel and there's nothing before it, so it takes 어.";
    }
    const bright = BRIGHT.includes(decider);
    const ending = bright ? "아요" : "어요";
    const base = { ending, vowel: decider, bright, deciderNote };

    if (j.f) {
      return Object.assign(base, { form: stem + (bright ? "아" : "어"), kind: "batchim", note: "There's a 받침, so nothing merges." });
    }
    switch (j.m) {
      case "ㅏ":
        return Object.assign(base, { form: stem, kind: "merge", note: "ㅏ + 아 → ㅏ: the two vowels merge into one." });
      case "ㅓ":
      case "ㅕ":
      case "ㅐ":
      case "ㅔ":
        return Object.assign(base, { form: stem, kind: "merge", note: j.m + " swallows the 어, so it disappears." });
      case "ㅗ":
        return Object.assign(base, { form: front + withVowel(last, "ㅘ"), kind: "merge", note: "ㅗ + ㅏ → ㅘ" });
      case "ㅜ":
        return Object.assign(base, { form: front + withVowel(last, "ㅝ"), kind: "merge", note: "ㅜ + ㅓ → ㅝ" });
      case "ㅣ":
        return Object.assign(base, { form: front + withVowel(last, "ㅕ"), kind: "merge", note: "ㅣ + ㅓ → ㅕ" });
      case "ㅚ":
        return Object.assign(base, { form: front + withVowel(last, "ㅙ"), kind: "merge", note: "ㅚ + ㅓ → ㅙ (spelled 돼요, not 되요!)" });
      case "ㅡ": {
        const v = bright ? "ㅏ" : "ㅓ";
        return Object.assign(base, { form: front + withVowel(last, v), kind: "merge", note: "ㅡ drops out and " + v + " takes its place." });
      }
      default:
        // ㅟ, ㅢ and friends don't merge: 쉬다 → 쉬어요
        return Object.assign(base, { form: stem + "어", kind: "plain", note: j.m + " doesn't merge, so 어 just sits next to it." });
    }
  }

  function step(label, value, note) {
    return { label, value, note: note || "" };
  }

  function present(verb) {
    const irr = IRREGULAR[verb];
    if (irr) {
      return { form: irr.present, irregular: irr.kind, steps: [
        step("Dictionary form", verb),
        step("Irregular!", stemOf(verb), verb + " is a " + irr.kind + "-irregular verb, so it bends the usual rules."),
        step("Polite present", irr.present, "Learn this one by heart."),
      ] };
    }
    const stem = stemOf(verb);
    const r = ahEo(stem);
    const steps = [step("Dictionary form", verb, "Every verb in the dictionary ends in 다."), step("Drop 다", stem, "What's left is the stem.")];
    if (r.kind === "hada") {
      steps.push(step("하 → 해", stem.slice(0, -1) + "해요", r.note));
      return { form: stem.slice(0, -1) + "해요", steps };
    }
    const vowelNote = (r.deciderNote ? r.deciderNote + " " : "Last vowel: " + r.vowel + ". ") +
      (r.bright ? "ㅏ/ㅗ are bright vowels → 아요." : "Not ㅏ/ㅗ → 어요.");
    steps.push(step("Check the vowel", r.vowel, vowelNote));
    steps.push(step("Attach", stem + " + " + r.ending));
    steps.push(step("Result", r.form + "요", r.note));
    return { form: r.form + "요", steps };
  }

  function past(verb) {
    const irr = IRREGULAR[verb];
    if (irr) {
      return { form: irr.past, irregular: irr.kind, steps: [
        step("Dictionary form", verb),
        step("Present", irr.present, verb + " is " + irr.kind + "-irregular."),
        step("Drop 요, add ㅆ + 어요", irr.past),
      ] };
    }
    const r = ahEo(stemOf(verb));
    const last = r.form[r.form.length - 1];
    const withSs = r.form.slice(0, -1) + addFinal(last, "ㅆ");
    return { form: withSs + "어요", steps: [
      step("Dictionary form", verb),
      step("Present", r.form + "요", "Make the polite present first."),
      step("Drop 요", r.form),
      step("Add ㅆ", withSs, "ㅆ slides under the last block: " + last + " → " + addFinal(last, "ㅆ") + "."),
      step("Result", withSs + "어요", "After ㅆ the ending is always 어요."),
    ] };
  }

  function future(verb) {
    const irr = IRREGULAR[verb];
    if (irr) {
      return { form: irr.future, irregular: irr.kind, steps: [
        step("Dictionary form", verb),
        step("Irregular!", stemOf(verb), verb + " is " + irr.kind + "-irregular."),
        step("Future", irr.future),
      ] };
    }
    const stem = stemOf(verb);
    const last = stem[stem.length - 1];
    const f = batchim(stem);
    const steps = [step("Dictionary form", verb), step("Drop 다", stem)];
    let form;
    if (f === "ㄹ") {
      form = stem + " 거예요";
      steps.push(step("Already ends in ㄹ", stem, "The ㄹ is already there, so just add 거예요."));
    } else if (!f) {
      const withL = stem.slice(0, -1) + addFinal(last, "ㄹ");
      form = withL + " 거예요";
      steps.push(step("Add ㄹ", withL, "No 받침, so ㄹ slides under " + last + "."));
    } else {
      form = stem + "을 거예요";
      steps.push(step("Add 을", stem + "을", "There's a 받침 (" + f + "), so add 을."));
    }
    steps.push(step("Result", form, "Space before 거예요. Spelled 거예요, never 거에요."));
    return { form, steps };
  }

  function want(verb) {
    const stem = stemOf(verb);
    return { form: stem + "고 싶어요", steps: [
      step("Dictionary form", verb),
      step("Drop 다", stem),
      step("Add 고 싶어요", stem + "고 싶어요", "No 받침 check, no vowel rules. Every stem works the same."),
    ] };
  }

  function negative(verb) {
    const stem = stemOf(verb);
    const p = present(verb).form;
    const short = NOUN_HADA.includes(verb) ? verb.slice(0, -2) + " 안 해요" : "안 " + p;
    return { form: stem + "지 않아요", short, steps: [
      step("Dictionary form", verb),
      step("Drop 다", stem),
      step("Long form", stem + "지 않아요", "Stem + 지 않아요."),
      step("Short form", short, NOUN_HADA.includes(verb) ? "Noun + 하다 verb: 안 goes right before 해요." : "안 + the polite present."),
    ] };
  }

  const MODES = { present, past, future, want, negative };

  function conjugate(verb, mode) {
    const fn = MODES[mode];
    if (!fn) throw new Error("Unknown mode: " + mode);
    return fn(verb);
  }

  KG.hangul = {
    INITIALS, MEDIALS, FINALS, IRREGULAR, NOUN_HADA,
    isBlock, jamo, block, lastBlock, batchim, hasBatchim, pick, attach,
    stemOf, ahEo, present, past, future, want, negative, conjugate,
    isBright: (v) => BRIGHT.includes(v),
    hasHangul: (s) => /[가-힣]/.test(String(s)),
  };
})(window.KG = window.KG || {});
