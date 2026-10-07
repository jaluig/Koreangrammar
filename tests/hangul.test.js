// Checks the Hangul engine against forms verified by hand.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadKG } = require("./load");

const KG = loadKG(["js/hangul.js"]);
const H = KG.hangul;

test("decomposes and rebuilds syllable blocks", () => {
  assert.deepEqual({ ...H.jamo("생") }, { i: "ㅅ", m: "ㅐ", f: "ㅇ" });
  assert.deepEqual({ ...H.jamo("사") }, { i: "ㅅ", m: "ㅏ", f: "" });
  assert.equal(H.block("ㄱ", "ㅏ", "ㅆ"), "갔");
  assert.equal(H.block("ㅇ", "ㅘ", ""), "와");
});

test("finds the 받침 of the last block", () => {
  assert.equal(H.batchim("학생"), "ㅇ");
  assert.equal(H.batchim("의사"), "");
  assert.equal(H.batchim("물"), "ㄹ");
  assert.equal(H.batchim("커피?"), "", "punctuation is ignored");
  assert.equal(H.hasBatchim("선생님"), true);
});

test("picks particles by 받침", () => {
  const cases = [
    ["학생", ["이에요", "예요"], "학생이에요"],
    ["의사", ["이에요", "예요"], "의사예요"],
    ["이름", ["은", "는"], "이름은"],
    ["친구", ["은", "는"], "친구는"],
    ["가방", ["이", "가"], "가방이"],
    ["커피", ["이", "가"], "커피가"],
    ["책", ["을", "를"], "책을"],
    ["영화", ["을", "를"], "영화를"],
    ["서울", ["으로", "로"], "서울로"],
    ["집", ["으로", "로"], "집으로"],
    ["저", ["이", "가"], "제가"],
    ["누구", ["이", "가"], "누가"],
  ];
  for (const [word, pair, expected] of cases) assert.equal(H.attach(word, pair), expected, word);
});

const PRESENT = {
  "가다": "가요", "자다": "자요", "만나다": "만나요", "사다": "사요",
  "먹다": "먹어요", "읽다": "읽어요", "있다": "있어요", "없다": "없어요", "웃다": "웃어요", "입다": "입어요",
  "살다": "살아요", "놀다": "놀아요", "좋다": "좋아요", "앉다": "앉아요", "받다": "받아요", "알다": "알아요", "괜찮다": "괜찮아요", "얇다": "얇아요",
  "하다": "해요", "공부하다": "공부해요", "요리하다": "요리해요", "좋아하다": "좋아해요",
  "보다": "봐요", "오다": "와요",
  "주다": "줘요", "배우다": "배워요", "바꾸다": "바꿔요",
  "마시다": "마셔요", "기다리다": "기다려요", "가르치다": "가르쳐요",
  "서다": "서요", "켜다": "켜요", "보내다": "보내요", "세다": "세요",
  "되다": "돼요",
  "쓰다": "써요", "크다": "커요", "바쁘다": "바빠요", "예쁘다": "예뻐요", "아프다": "아파요", "배고프다": "배고파요", "기쁘다": "기뻐요",
  "쉬다": "쉬어요", "뛰다": "뛰어요",
  "맛있다": "맛있어요", "재미있다": "재미있어요", "싶다": "싶어요",
  "듣다": "들어요", "덥다": "더워요", "모르다": "몰라요", "돕다": "도와요",
};

test("present tense (-아요/어요/해요)", () => {
  for (const [verb, expected] of Object.entries(PRESENT)) assert.equal(H.present(verb).form, expected, verb);
});

const PAST = {
  "가다": "갔어요", "먹다": "먹었어요", "하다": "했어요", "공부하다": "공부했어요", "보다": "봤어요", "오다": "왔어요",
  "마시다": "마셨어요", "주다": "줬어요", "배우다": "배웠어요", "만나다": "만났어요", "쉬다": "쉬었어요", "쓰다": "썼어요",
  "바쁘다": "바빴어요", "되다": "됐어요", "보내다": "보냈어요", "살다": "살았어요", "읽다": "읽었어요", "있다": "있었어요",
  "맛있다": "맛있었어요", "자다": "잤어요", "듣다": "들었어요", "모르다": "몰랐어요", "싶다": "싶었어요",
};

test("past tense (-았/었어요)", () => {
  for (const [verb, expected] of Object.entries(PAST)) assert.equal(H.past(verb).form, expected, verb);
});

const FUTURE = {
  "가다": "갈 거예요", "하다": "할 거예요", "보다": "볼 거예요", "마시다": "마실 거예요", "만나다": "만날 거예요", "자다": "잘 거예요",
  "먹다": "먹을 거예요", "읽다": "읽을 거예요", "앉다": "앉을 거예요", "있다": "있을 거예요",
  "살다": "살 거예요", "만들다": "만들 거예요", "놀다": "놀 거예요", "알다": "알 거예요",
  "쉬다": "쉴 거예요", "공부하다": "공부할 거예요", "듣다": "들을 거예요", "돕다": "도울 거예요",
};

test("future (-(으)ㄹ 거예요)", () => {
  for (const [verb, expected] of Object.entries(FUTURE)) assert.equal(H.future(verb).form, expected, verb);
});

test("want (-고 싶어요) and negatives", () => {
  assert.equal(H.want("가다").form, "가고 싶어요");
  assert.equal(H.want("먹다").form, "먹고 싶어요");
  assert.equal(H.want("듣다").form, "듣고 싶어요");
  assert.equal(H.negative("먹다").form, "먹지 않아요");
  assert.equal(H.negative("먹다").short, "안 먹어요");
  assert.equal(H.negative("공부하다").short, "공부 안 해요");
  assert.equal(H.negative("좋아하다").short, "안 좋아해요");
});

test("every step list ends with the final form", () => {
  for (const mode of ["present", "past", "future", "want"]) {
    for (const verb of ["가다", "먹다", "하다", "보다", "쓰다", "살다", "듣다"]) {
      const r = H.conjugate(verb, mode);
      assert.equal(r.steps[r.steps.length - 1].value, r.form, mode + " " + verb);
    }
  }
});

test("rejects words that are not dictionary forms", () => {
  assert.throws(() => H.present("먹어요"));
});
