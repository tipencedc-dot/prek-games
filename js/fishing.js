/* Sasquatch Fishing — Russian/Singapore-math style.
   Quantities are shown as countable fish, and he TYPES the answer on a number
   pad — no multiple choice, so there's nothing to guess. Wrong answers trigger a
   guided count-aloud (not a free retry); he only levels up on a FIRST-TRY correct
   answer. A caught fish wiggles up the line. */
(function () {
  let level = 1, score = 0, streak = 0, missesThisRound = 0, firstTry = true;
  let current = null, answer = null, entry = "", locked = false, running = false;

  const $ = id => document.getElementById(id);

  let winVid, wrongVid, activeFinish = null;

  function init() {
    $("fish-problem").addEventListener("click", speakPrompt);
    document.querySelectorAll("#numpad .key").forEach(b =>
      b.addEventListener("click", () => onKey(b.dataset.key)));
    // the top scene is a video; show its first frame, and let a tap skip a clip
    winVid = $("scene-win"); wrongVid = $("scene-wrong");
    if (winVid) winVid.addEventListener("loadeddata", () => { try { winVid.currentTime = 0; } catch (e) {} });
    const stage = $("scene-stage");
    if (stage) stage.addEventListener("click", () => { if (activeFinish) activeFinish(); });
  }

  function start() {
    running = true;
    // resume near his best level so the math keeps pace with him (warm up 1 below)
    const best = Shell.getProgress().fishBest || 1;
    level = Math.max(1, best - 1);
    score = 0; streak = 0;
    $("fish-level").textContent = level;
    $("fish-score").textContent = "0";
    nextRound();
  }
  function stop() { running = false; }

  function r(min, max) { return Shell.randInt(min, max); }

  // ---------- round plan ----------
  function plan(lvl) {
    if (lvl === 1) { const a = r(1, 4), b = r(1, Math.min(5, 6 - a)); return mk("add", a, b); }       // add ≤6
    if (lvl === 2) { let a = r(2, 6), b = r(2, 6); if (a + b > 10) b = 10 - a; return mk("add", a, Math.max(1, b)); } // add ≤10
    if (lvl === 3) { const a = r(3, 9), b = r(1, a - 1); return mk("sub", a, b); }                     // subtract ≤9
    if (lvl === 4) { const total = r(4, 10), a = r(1, total - 1); return mk("missing", a, total); }    // number bond ≤10
    if (lvl === 5) { let a = r(4, 12), b = r(2, 8); if (a + b > 20) b = 20 - a; return mk("add", a, Math.max(1, b)); } // add ≤20
    // 6+: keep stretching, mixing subtraction and number bonds within 20
    if (lvl % 2 === 0) { const total = r(8, 20), a = r(2, total - 1); return mk("missing", a, total); }
    const a = r(6, 20), b = r(2, a - 1); return mk("sub", a, b);
  }

  function mk(op, a, b) {
    if (op === "add") return { op, a, b, answer: a + b, speak: `${a} fish and ${b} fish. How many fish all together?` };
    if (op === "sub") return { op, a, b, answer: a - b, speak: `${a} fish. ${b} swam away. How many fish are left?` };
    /* missing */     return { op, a, total: b, answer: b - a, speak: `${a} fish. How many more to make ${b}?` };
  }

  // ---------- render ----------
  function nextRound() {
    if (!running) return;
    locked = false; missesThisRound = 0; firstTry = true;
    current = plan(level);
    answer = current.answer;
    clearEntry();
    $("answer-box").classList.remove("correct", "wrong");
    renderProblem(current);
    setTimeout(speakPrompt, 300);
  }

  function fish(n, cls) {
    let s = "";
    for (let i = 0; i < n; i++) s += `<span class="fish-item ${cls || ""}">🐟</span>`;
    return s;
  }
  function slots(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += `<span class="fish-item empty-slot">⭕️</span>`;
    return s;
  }
  function group(inner, label) {
    return `<div class="num-group"><div class="group-dots">${inner}</div>` +
           (label != null ? `<div class="group-num">${label}</div>` : "") + `</div>`;
  }

  function renderProblem(round) {
    const p = $("fish-problem");
    if (round.op === "add") {
      p.innerHTML =
        group(fish(round.a), round.a) +
        `<span class="op">+</span>` +
        group(fish(round.b), round.b) +
        `<span class="op">=</span><span class="qmark">?</span>`;
    } else if (round.op === "sub") {
      p.innerHTML = group(fish(round.a)) + `<span class="op">→</span><span class="qmark">?</span>`;
      const items = p.querySelectorAll(".fish-item");
      for (let i = 0; i < round.b; i++) items[items.length - 1 - i].classList.add("gone");
    } else { // missing: a filled + (total-a) empty slots to reach total
      p.innerHTML =
        group(fish(round.a) + slots(round.answer), round.total) +
        `<span class="op">need</span><span class="qmark">?</span>`;
    }
  }

  function speakPrompt() { if (current) Shell.speak(current.speak); }

  // ---------- number pad ----------
  function onKey(k) {
    if (locked) return;
    if (k === "go") return submit();
    if (k === "del") { entry = entry.slice(0, -1); updateEntry(); return; }
    if (entry.length < 2) { entry += k; updateEntry(); Shell.speak(k, { rate: 1 }); }
  }

  function updateEntry() {
    $("answer-entry").textContent = entry;
    $("answer-box").classList.toggle("has-entry", entry.length > 0);
  }
  function clearEntry() { entry = ""; updateEntry(); }

  function submit() {
    if (locked) return;
    if (entry === "") { Shell.speak("Tap your number, then the green fish."); return; }
    const val = parseInt(entry, 10);
    const box = $("answer-box");
    if (val === answer) {
      locked = true;
      box.classList.add("correct");
      score++; $("fish-score").textContent = score;
      Shell.confetti();
      if (firstTry) streak++; else streak = 0;
      const climbed = streak >= 3;
      if (climbed) { level++; streak = 0; $("fish-level").textContent = level; Shell.setProgressMax("fishBest", level); }
      playWin(climbed);   // the win clip plays in the scene, then next round
    } else {
      locked = true;
      box.classList.add("wrong");
      setTimeout(() => box.classList.remove("wrong"), 450);
      missesThisRound++;
      firstTry = false;
      playWrong(() => {
        guidedCount(() => {
          clearEntry();
          locked = false;
          if (missesThisRound >= 2 && level > 1) { level--; $("fish-level").textContent = level; }
        });
      });
    }
  }

  // Teach instead of just "try again": highlight & count the items aloud.
  function guidedCount(done) {
    const p = $("fish-problem");
    let items, lead;
    if (current.op === "add") { items = [...p.querySelectorAll(".fish-item")]; lead = "Let's count them all."; }
    else if (current.op === "sub") { items = [...p.querySelectorAll(".fish-item:not(.gone)")]; lead = "Count the fish still here."; }
    else { items = [...p.querySelectorAll(".empty-slot")]; lead = "Count how many more we need."; }

    const numbers = items.map((_, i) => i + 1);
    let finished = false;
    const finish = () => { if (finished) return; finished = true; items.forEach(el => el.classList.remove("count")); done(); };

    Shell.speak(lead, {
      onend: () => {
        Shell.speakSequence(numbers, {
          onWord: i => {
            items.forEach(el => el.classList.remove("count"));
            if (items[i]) items[i].classList.add("count");
          },
          onend: () => {
            items.forEach(el => el.classList.remove("count"));
            Shell.speak(`That makes ${answer}. Now type ${answer}!`, { onend: finish });
          }
        });
      }
    });
    // Safety net so he's never stuck if speech stalls or is muted.
    setTimeout(finish, numbers.length * 800 + 2500);
  }

  // Play a clip in the scene (in place — no pop-up). Tap the scene to skip;
  // safety backstop in case it can't play. Called inside the tap handler so audio
  // is allowed. `onDone` runs when the clip ends or is skipped.
  function playClip(vid, onDone) {
    if (!vid) { setTimeout(onDone, 400); return; }
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(vid._t); activeFinish = null;
      vid.onended = null;
      try { vid.pause(); vid.currentTime = 0; } catch (e) {}
      onDone();
    };
    activeFinish = finish;          // a tap on the scene calls this
    vid.onended = finish;
    vid.muted = !!Shell.muted;
    try { vid.currentTime = 0; } catch (e) {}
    const p = vid.play();
    if (p && p.catch) p.catch(() => {}); // if blocked, backstop still advances
    vid._t = setTimeout(finish, 12000);
  }

  // Correct: play the win clip in the scene, then go to the next problem.
  function playWin(climbed) {
    if (wrongVid) wrongVid.classList.add("is-hidden");
    playClip(winVid, () => {
      if (winVid) winVid.muted = true;   // back to a silent idle frame
      if (climbed) Shell.speak("Level up!");
      nextRound();
    });
  }

  // Wrong: show + play the wrong clip in the scene, then run `after` (the count).
  function playWrong(after) {
    if (!wrongVid) { after(); return; }
    wrongVid.classList.remove("is-hidden");
    playClip(wrongVid, () => { wrongVid.classList.add("is-hidden"); after(); });
  }

  function pick(a) { return a[Shell.randInt(0, a.length - 1)]; }

  window.Fishing = { init, start, stop };
})();
