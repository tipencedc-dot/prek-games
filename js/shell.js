/* Shared "shell" used by every game:
   - voice (text-to-speech, including kid-friendly phoneme sounds)
   - reward animation (confetti + cheer)
   - the 5-minute active "wiggle break"
   - screen navigation
   Exposed as a single global: window.Shell
*/
(function () {
  const synth = window.speechSynthesis;
  let muted = false;
  let preferredVoice = null;

  // Pick the most natural English voice available (prefer named, higher-quality
  // voices over the small "compact" ones that sound robotic).
  const GOOD_VOICES = /samantha|karen|moira|tessa|serena|allison|ava|nicky|aaron|daniel|google us english|microsoft (zira|aria|jenny|guy)/i;
  function loadVoice() {
    const voices = synth ? synth.getVoices() : [];
    if (!voices.length) return;
    const en = voices.filter(v => /en(-|_)?/i.test(v.lang));
    preferredVoice =
      en.find(v => GOOD_VOICES.test(v.name) && !/compact/i.test(v.name)) ||
      en.find(v => v.localService && /en-US/i.test(v.lang) && !/compact/i.test(v.name)) ||
      en.find(v => /en-US/i.test(v.lang)) ||
      en[0] || voices[0];
  }
  if (synth) {
    loadVoice();
    synth.onvoiceschanged = loadVoice;
  }

  function speak(text, opts = {}) {
    if (muted || !synth) return;
    if (opts.interrupt !== false) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (preferredVoice) u.voice = preferredVoice;
    u.rate = opts.rate ?? 0.92;
    u.pitch = opts.pitch ?? 1.0;   // ~natural (was chipmunk-high)
    u.volume = 1;
    if (opts.onend) u.onend = opts.onend;
    synth.speak(u);
  }

  // Spoken approximation of each letter's SOUND (phoneme), not its name.
  // Vowels are elongated; consonant stops keep a tiny schwa (standard for early phonics).
  const PHONEMES = {
    a: "aah", b: "buh", c: "kuh", d: "duh", e: "eh", f: "fff", g: "guh",
    h: "huh", i: "ih", j: "juh", k: "kuh", l: "lll", m: "mmm", n: "nnn",
    o: "awe", p: "puh", q: "kwuh", r: "rrr", s: "sss", t: "tuh", u: "uh",
    v: "vvv", w: "wuh", x: "kss", y: "yuh", z: "zzz"
  };
  function phon(letter) { return PHONEMES[(letter || "").toLowerCase()] || letter; }

  function sayLetterSound(letter, opts = {}) {
    speak(phon(letter), { rate: opts.rate ?? 0.55, pitch: 0.98, onend: opts.onend });
  }

  // Sound out a whole word: each sound slowly, then blend and say the word clearly.
  function sayWordSounds(word, opts = {}) {
    if (muted || !synth) { opts.onend && opts.onend(); return; }
    synth.cancel();
    const letters = word.split("");
    let i = 0;
    const next = () => {
      if (i < letters.length) {
        const u = new SpeechSynthesisUtterance(phon(letters[i]));
        if (preferredVoice) u.voice = preferredVoice;
        u.rate = 0.5; u.pitch = 0.98;
        u.onend = () => { i++; setTimeout(next, 200); };
        synth.speak(u);
      } else {
        speak(word, { rate: 0.85, pitch: 1.05, onend: opts.onend });
      }
    };
    next();
  }

  // Speak a list of words one at a time, calling onWord(i) as each is said.
  // Used to count items aloud (1, 2, 3 …) while highlighting them on screen.
  // Works even when muted (steps visually on a timer).
  function speakSequence(words, opts = {}) {
    const gap = opts.gap ?? 130;
    if (muted || !synth) {
      let i = 0;
      const step = () => {
        if (i >= words.length) { opts.onend && opts.onend(); return; }
        opts.onWord && opts.onWord(i);
        i++; setTimeout(step, opts.silentGap ?? 550);
      };
      step();
      return;
    }
    synth.cancel();
    let i = 0;
    const next = () => {
      if (i >= words.length) { opts.onend && opts.onend(); return; }
      opts.onWord && opts.onWord(i);
      const u = new SpeechSynthesisUtterance(String(words[i]));
      if (preferredVoice) u.voice = preferredVoice;
      u.rate = opts.rate ?? 0.85;
      u.pitch = opts.pitch ?? 1.25;
      u.onend = () => { i++; setTimeout(next, gap); };
      synth.speak(u);
    };
    next();
  }

  // ---------- Reward ----------
  const CHEERS = ["Yes!", "Awesome!", "You got it!", "Great job!", "Wow!", "Super!", "Nailed it!"];
  const COLORS = ["#ff5d5d", "#ffcf3f", "#36c97f", "#4aa3e8", "#b06bf0", "#ff8f3f"];
  function confetti(n = 40) {
    const layer = document.getElementById("confetti");
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = (5 + i * (90 / n) + Math.floor(i % 5)) + "%";
      p.style.background = COLORS[i % COLORS.length];
      p.style.animationDuration = (1 + (i % 7) * 0.18).toFixed(2) + "s";
      p.style.transform = `rotate(${i * 31 % 360}deg)`;
      if (i % 3 === 0) p.style.borderRadius = "50%";
      layer.appendChild(p);
      setTimeout(() => p.remove(), 2600);
    }
  }
  function reward(say) {
    confetti();
    speak(say || CHEERS[Date.now() % CHEERS.length]);
  }

  // ---------- Navigation ----------
  let current = "home";
  function go(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
    current = id;
    if (synth) synth.cancel();
    if (id !== "home") startBreakTimer(); else stopBreakTimer();
    if (Shell.onScreen) Shell.onScreen(id);
  }

  // ---------- Wiggle break (every 5 min of play) ----------
  const BREAK_MS = 5 * 60 * 1000;
  let breakTimer = null;
  const BREAK_PROMPTS = [
    "Jump up and down 5 times! 1… 2… 3… 4… 5!",
    "Clap the sounds in Spi-der-man! Spi! Der! Man!",
    "Do 4 big ninja kicks! Hi-ya!",
    "Stomp like a Sasquatch 5 times!",
    "Reach up high, then touch your toes!",
    "Slither on the floor like a snake!",
    "Spin in a circle, then freeze like a statue!",
    "Flap your arms and fly like Spider-Man's web swing!"
  ];
  function startBreakTimer() {
    stopBreakTimer();
    breakTimer = setTimeout(showBreak, BREAK_MS);
  }
  function stopBreakTimer() { if (breakTimer) clearTimeout(breakTimer); breakTimer = null; }
  function showBreak() {
    const overlay = document.getElementById("break-overlay");
    const prompt = BREAK_PROMPTS[Math.floor((Date.now() / 1000) % BREAK_PROMPTS.length)];
    document.getElementById("break-prompt").textContent = prompt;
    overlay.classList.add("show");
    speak("Time for a wiggle break! " + prompt);
    if (Shell.onBreakStart) Shell.onBreakStart();
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("break-done").addEventListener("click", () => {
      document.getElementById("break-overlay").classList.remove("show");
      speak("Back to the game!");
      startBreakTimer();
      if (Shell.onBreakEnd) Shell.onBreakEnd();
    });
  });

  // ---------- Mute ----------
  function setMuted(m) {
    muted = m;
    if (muted && synth) synth.cancel();
    const btn = document.getElementById("mute-toggle");
    if (btn) btn.textContent = muted ? "🔇" : "🔊";
  }

  // ---------- Utils ----------
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // lowercase so voices say just the letter ("c"), never "capital C"
  function letterName(ch) { return (ch || "").toLowerCase(); }

  // ---------- Progress (persists across sessions; drives adaptive difficulty) ----------
  function getProgress() {
    try { return JSON.parse(localStorage.getItem("pl_progress") || "{}"); } catch (e) { return {}; }
  }
  function saveProgress(p) { try { localStorage.setItem("pl_progress", JSON.stringify(p)); } catch (e) {} }
  function bumpProgress(key, by) { const p = getProgress(); p[key] = (p[key] || 0) + (by || 1); saveProgress(p); return p[key]; }
  function setProgressMax(key, val) { const p = getProgress(); if (!(p[key] >= val)) { p[key] = val; saveProgress(p); } }

  window.Shell = {
    speak, speakSequence, sayLetterSound, sayWordSounds, reward, confetti,
    go, setMuted, get muted() { return muted; },
    randInt, shuffle, _letterName: letterName,
    getProgress, bumpProgress, setProgressMax,
    onScreen: null, onBreakStart: null, onBreakEnd: null
  };
})();
