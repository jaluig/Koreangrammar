/*
 * The course: levels in the order learners should meet the grammar.
 * Each level file (level1.js, level2.js, ...) calls KG.addLevel(...).
 * See README.md, "Adding content", for the full format.
 */
(function (KG) {
  "use strict";

  KG.course = {
    levels: [],

    // Upcoming levels, shown on the map as the road ahead.
    roadmap: [
      { id: 4, num: "넷", ko: "조사 파티", title: "Particle Party", patterns: ["도 (also, too)", "의 (of, 's)", "하고 · 와/과 (and, with)", "(으)로 (by, toward, with)", "에게 · 한테 (to someone)", "부터 · 까지 (from · until)"] },
      { id: 5, num: "다섯", ko: "불규칙 동사", title: "Shape-Shifting Verbs", patterns: ["ㅂ irregular: 덥다 → 더워요", "ㄷ irregular: 듣다 → 들어요", "르 irregular: 모르다 → 몰라요", "ㄹ drop: 살다 → 사세요", "ㅅ · ㅎ irregulars"] },
      { id: 6, num: "여섯", ko: "이어 말하기", title: "Linking Ideas", patterns: ["-고 (and then)", "-지만 (but)", "-아서/어서 (so, because)", "-(으)면 (if, when)"] },
      { id: 7, num: "일곱", ko: "할 수 있어요", title: "Can & Please", patterns: ["-(으)ㄹ 수 있어요 / 없어요 (can / can't)", "못 (can't)", "-(으)세요 (please do)", "-아/어 주세요 (please do it for me)", "-지 마세요 (please don't)", "-아/어 보세요 (try it)"] },
      { id: 8, num: "여덟", ko: "같이 해요", title: "Plans & Right Now", patterns: ["-고 있어요 (be doing)", "-(으)ㄹ까요? (shall we?)", "-(으)러 가요 (go to do)", "-아/어야 해요 (have to)", "-(으)ㄹ게요 (I'll do it)", "-(으)니까 (since, so)"] },
      { id: 9, num: "아홉", ko: "꾸며 줘요", title: "Describing Things", patterns: ["-(으)ㄴ + noun (adjectives)", "-는 + noun (verbs)", "보다 더 (more than)", "제일 (the most)"] },
    ],

    // Words for the notebook tools.
    toolNouns: [
      ["학생", "student"], ["의사", "doctor"], ["친구", "friend"], ["선생님", "teacher"], ["물", "water"], ["커피", "coffee"],
      ["책", "book"], ["가방", "bag"], ["고양이", "cat"], ["강아지", "puppy"], ["김밥", "kimbap"], ["우유", "milk"],
      ["사과", "apple"], ["이름", "name"], ["한국", "Korea"], ["영화", "movie"], ["음악", "music"], ["집", "home"],
    ],
    toolVerbs: [
      ["가다", "go"], ["오다", "come"], ["먹다", "eat"], ["마시다", "drink"], ["하다", "do"], ["보다", "see, watch"],
      ["자다", "sleep"], ["읽다", "read"], ["살다", "live"], ["만나다", "meet"], ["배우다", "learn"], ["주다", "give"],
      ["쉬다", "rest"], ["쓰다", "write, use"], ["놀다", "play"], ["앉다", "sit"], ["만들다", "make"], ["공부하다", "study"],
      ["좋다", "be good", "adj"], ["바쁘다", "be busy", "adj"], ["기다리다", "wait"], ["되다", "become"], ["듣다", "listen (irregular)"], ["덥다", "be hot (irregular)", "adj"],
    ],
  };

  KG.addLevel = function addLevel(level) {
    KG.course.levels.push(level);
    KG.course.levels.sort((a, b) => a.id - b.id);
  };
})(window.KG = window.KG || {});
