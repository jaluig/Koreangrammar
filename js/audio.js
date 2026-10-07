/*
 * Sound: tiny synthesized effects (no audio files) and Korean text-to-speech
 * through the browser's built-in voices. Both respect the player's settings.
 */
(function (KG) {
  "use strict";

  let ctx = null;

  function audioCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, at, dur, type, vol) {
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  const SOUNDS = {
    tap: () => tone(740, 0, 0.06, "sine", 0.05),
    good: () => {
      tone(784, 0, 0.12, "sine", 0.11);
      tone(1175, 0.09, 0.24, "sine", 0.11);
    },
    bad: () => {
      tone(330, 0, 0.14, "triangle", 0.09);
      tone(262, 0.11, 0.24, "triangle", 0.09);
    },
    step: () => tone(988, 0, 0.08, "sine", 0.07),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25 + i * 0.09, 0.3, "sine", 0.1)),
    stamp: () => {
      tone(98, 0, 0.2, "square", 0.07);
      tone(1568, 0.14, 0.3, "sine", 0.06);
    },
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.32, "triangle", 0.09)),
  };

  function sfx(name) {
    if (!KG.store.settings.sound || !SOUNDS[name]) return;
    try {
      SOUNDS[name]();
    } catch (e) {
      // Audio is a nice-to-have; never let it break the game.
    }
  }

  const synth = window.speechSynthesis;
  const canSpeak = Boolean(synth && window.SpeechSynthesisUtterance);
  let voice = null;

  function pickVoice() {
    if (!canSpeak) return null;
    const voices = synth.getVoices() || [];
    voice =
      voices.find((v) => /^ko[-_]KR/i.test(v.lang) && /google|yuna|sora|heami|natural|neural/i.test(v.name)) ||
      voices.find((v) => /^ko/i.test(v.lang)) ||
      null;
    return voice;
  }

  if (canSpeak) {
    pickVoice();
    if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoice);
  }

  let playing = null;

  function say(text, button) {
    if (!canSpeak || !KG.store.settings.voice || !text) return false;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = 0.88;
      if (voice || pickVoice()) u.voice = voice;
      if (playing) playing.classList.remove("playing");
      playing = button || null;
      if (button) button.classList.add("playing");
      u.onend = u.onerror = () => button && button.classList.remove("playing");
      synth.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  KG.audio = { sfx, say, canSpeak, hasKoreanVoice: () => Boolean(voice || pickVoice()) };
})(window.KG = window.KG || {});
