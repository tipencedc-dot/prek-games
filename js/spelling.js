/* Spider-Man Spelling — finish the word.
   Shows a picture + the word with ONE letter missing; he taps the right letter
   to complete it, then Spider-Man swings in. Reinforces the words he built in
   Word Snake (pulled from localStorage) plus a curated picture word list. */
(function () {
  const BASE = [
    { w: "cat", e: "🐱" }, { w: "dog", e: "🐶" }, { w: "sun", e: "☀️" },
    { w: "pig", e: "🐷" }, { w: "bug", e: "🐛" }, { w: "hat", e: "🎩" },
    { w: "bus", e: "🚌" }, { w: "fox", e: "🦊" }, { w: "cup", e: "🥤" },
    { w: "bed", e: "🛏️" }, { w: "web", e: "🕸️" }, { w: "box", e: "📦" },
    { w: "jam", e: "🍓" }, { w: "ten", e: "🔟" }, { w: "bee", e: "🐝" },
    { w: "car", e: "🚗" }, { w: "key", e: "🔑" }, { w: "pie", e: "🥧" }
  ];
  // harder 4-letter words, unlocked as he progresses
  const ADV = [
    { w: "frog", e: "🐸" }, { w: "star", e: "⭐" }, { w: "milk", e: "🥛" },
    { w: "cake", e: "🍰" }, { w: "moon", e: "🌙" }, { w: "tree", e: "🌳" },
    { w: "fish", e: "🐟" }, { w: "ball", e: "⚽" }
  ];

  let words, qi, score, word, emoji, blankIdx, locked = false, running = false;
  const $ = id => document.getElementById(id);

  function init() {
    $("spell-pic").addEventListener("click", sayCurrent);
  }

  function start() {
    running = true; score = 0; $("spell-score").textContent = "0";
    words = buildList();
    qi = 0;
    nextWord();
  }
  function stop() { running = false; }

  // Words he completed in Word Snake come first (familiar), then the rest.
  function buildList() {
    let spelled = [];
    try { spelled = JSON.parse(localStorage.getItem("pl_spelled") || "[]"); } catch (e) {}
    const source = (Shell.getProgress().spellWords || 0) >= 12 ? BASE.concat(ADV) : BASE;
    const map = new Map(source.map(o => [o.w, o.e]));
    const seen = new Set();
    const list = [];
    spelled.forEach(w => { if (map.has(w) && !seen.has(w)) { seen.add(w); list.push({ w, e: map.get(w) }); } });
    Shell.shuffle(source.slice()).forEach(o => { if (!seen.has(o.w)) { seen.add(o.w); list.push(o); } });
    return list;
  }

  function nextWord() {
    if (!running) return;
    locked = false;
    const item = words[qi % words.length]; qi++;
    word = item.w; emoji = item.e;
    blankIdx = Shell.randInt(0, word.length - 1);
    $("spell-pic").textContent = emoji;
    renderWord();
    renderChoices();
    setTimeout(sayCurrent, 350);
  }

  function sayCurrent() {
    Shell.speak("Finish the word " + word + "!");
  }

  function renderWord() {
    $("spell-word").innerHTML = word.split("").map((ch, i) =>
      i === blankIdx
        ? `<span class="lbox blank" id="blankbox">?</span>`
        : `<span class="lbox">${ch}</span>`
    ).join("");
  }

  function renderChoices() {
    const correct = word[blankIdx];
    const used = new Set([correct]);
    const opts = [correct];
    let guard = 0;
    while (opts.length < 3 && guard++ < 50) {
      const ch = "abcdefghijklmnopqrstuvwxyz"[Shell.randInt(0, 25)];
      if (used.has(ch)) continue;
      used.add(ch); opts.push(ch);
    }
    Shell.shuffle(opts);
    const wrap = $("spell-choices");
    wrap.innerHTML = "";
    opts.forEach(ch => {
      const b = document.createElement("button");
      b.className = "lchoice";
      b.textContent = ch;
      b.addEventListener("click", () => choose(b, ch));
      wrap.appendChild(b);
    });
  }

  function choose(btn, ch) {
    if (locked) return;
    const correct = word[blankIdx];
    if (ch === correct) {
      locked = true;
      const box = $("blankbox");
      if (box) { box.textContent = ch; box.classList.remove("blank"); box.classList.add("filled"); }
      btn.classList.add("ok");
      Shell.speak(Shell._letterName(ch), {
        onend: () => Shell.speak(word, {
          onend: () => { if (running) nextWord(); }
        })
      });
      score++; $("spell-score").textContent = score;
      Shell.bumpProgress("spellWords", 1);
      Shell.confetti();
      swingSpidey();
      // safety advance if speech stalls
      clearTimeout(choose._t);
      choose._t = setTimeout(() => { if (running && locked) nextWord(); }, 5000);
    } else {
      btn.classList.add("no");
      setTimeout(() => btn.classList.remove("no"), 450);
      Shell.speak("Try the letter " + Shell._letterName(correct));
    }
  }

  function swingSpidey() {
    const s = $("spidey");
    if (!s) return;
    s.classList.remove("swing");
    void s.offsetWidth;     // restart animation
    s.classList.add("swing");
    setTimeout(() => s.classList.remove("swing"), 1800);
  }

  window.Spelling = { init, start, stop };
})();
