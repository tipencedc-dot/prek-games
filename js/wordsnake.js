/* Word Snake — a smooth, slithering snake character that grows by eating letters
   in order to build a word. A PICTURE of the word is shown so he knows what he's
   spelling. Audio is clear whole-words + letter names (no robotic phoneme sounds).
   Forgiving: solid walls (no death), wrong letters give a gentle hint, and the
   player can REVERSE by steering back (great for getting off a wall).
   Sparkle "treats" decorate the body; after a few words the snake becomes a DRAGON. */
(function () {
  const COLS = 9, ROWS = 9;
  const SPEED = 500;                 // ms per grid step (slow & toddler-friendly)
  const DRAGON_AT = 4;
  const GEM_COLORS = ["#ff5d8f", "#ffd23f", "#5db0ff", "#b06bf0", "#ff8f3f", "#4ee0a0"];
  const WORDS = [
    { w: "cat", e: "🐱" }, { w: "dog", e: "🐶" }, { w: "sun", e: "☀️" },
    { w: "pig", e: "🐷" }, { w: "bug", e: "🐛" }, { w: "hat", e: "🎩" },
    { w: "bus", e: "🚌" }, { w: "fox", e: "🦊" }, { w: "cup", e: "🥤" },
    { w: "bed", e: "🛏️" }, { w: "box", e: "📦" }, { w: "car", e: "🚗" },
    { w: "cow", e: "🐄" }, { w: "ant", e: "🐜" }, { w: "egg", e: "🥚" },
    { w: "web", e: "🕸️" }, { w: "bee", e: "🐝" }, { w: "owl", e: "🦉" }
  ];
  // unlocked once he's built enough 3-letter words (adaptive difficulty)
  const ADV = [
    { w: "frog", e: "🐸" }, { w: "star", e: "⭐" }, { w: "milk", e: "🥛" },
    { w: "cake", e: "🍰" }, { w: "moon", e: "🌙" }, { w: "tree", e: "🌳" },
    { w: "fish", e: "🐟" }, { w: "ball", e: "⚽" }
  ];

  let canvas, ctx, cell = 36;
  let snake, prevCells, tickAt = 0, dir, nextDir, tiles, treat, gems, word, emoji, idx, score;
  let moveTimer, rafId = 0, running = false, isDragon = false;

  function init() {
    canvas = document.getElementById("snake-canvas");
    ctx = canvas.getContext("2d");
    document.querySelectorAll("#snake .dpad-btn").forEach(b =>
      b.addEventListener("click", () => setDir(b.dataset.dir)));
    let sx = 0, sy = 0;
    canvas.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    canvas.addEventListener("touchend", e => {
      const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "right" : "left");
      else setDir(dy > 0 ? "down" : "up");
    }, { passive: true });
    window.addEventListener("resize", () => { if (running) sizeCanvas(); });
  }

  function sizeCanvas() {
    const wrap = canvas.parentElement, pad = 16;
    const avail = Math.min(wrap.clientWidth - pad, wrap.clientHeight - pad);
    cell = Math.max(28, Math.floor(avail / COLS));
    canvas.width = cell * COLS;
    canvas.height = cell * ROWS;
  }

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function setDir(d) {
    nextDir = DIRS[d].slice();   // any direction allowed; pressing back reverses the snake
  }

  function start() {
    running = true; score = 0; isDragon = false;
    document.getElementById("snake-score").textContent = "0";
    snake = [{ x: 5, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }];
    prevCells = snake.map(c => ({ ...c }));
    dir = [1, 0]; nextDir = [1, 0];
    gems = []; treat = null;
    sizeCanvas();
    newWord();
    spawnTreat();
    tickAt = performance.now();
    clearInterval(moveTimer);
    moveTimer = setInterval(tick, SPEED);
    cancelAnimationFrame(rafId);
    renderLoop();
  }

  function stop() { running = false; clearInterval(moveTimer); cancelAnimationFrame(rafId); }
  function pause() { clearInterval(moveTimer); cancelAnimationFrame(rafId); }
  function resume() {
    if (!running) return;
    tickAt = performance.now();
    clearInterval(moveTimer); moveTimer = setInterval(tick, SPEED);
    cancelAnimationFrame(rafId); renderLoop();
  }

  function newWord() {
    const pool = (Shell.getProgress().snakeWords || 0) >= 10 ? WORDS.concat(ADV) : WORDS;
    const item = pool[Shell.randInt(0, pool.length - 1)];
    word = item.w; emoji = item.e; idx = 0;
    document.getElementById("snake-pic").textContent = emoji;
    renderWord();
    spawnTiles();
    Shell.speak("Spell " + word + "!");
  }

  function renderWord() {
    document.getElementById("snake-word").innerHTML = word.split("").map((ch, i) => {
      const cls = i < idx ? "done" : i === idx ? "next" : "todo";
      return `<span class="${cls}">${ch}</span>`;
    }).join("");
  }

  function freeCells(extra) {
    const occ = new Set(snake.map(s => s.x + "," + s.y));
    if (tiles) tiles.forEach(t => occ.add(t.x + "," + t.y));
    if (treat) occ.add(treat.x + "," + treat.y);
    if (extra) extra.forEach(c => occ.add(c));
    const free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
      if (!occ.has(x + "," + y)) free.push({ x, y });
    return free;
  }

  // The cells just ahead of the head — never spawn a letter here, so he can't
  // auto-collide with one before he has time to steer.
  function forbiddenAhead() {
    const set = new Set(), h = snake[0];
    for (let k = 1; k <= 3; k++) set.add((h.x + dir[0] * k) + "," + (h.y + dir[1] * k));
    return set;
  }

  function spawnTiles() {
    tiles = [];
    const forbid = forbiddenAhead();
    placeTile(word[idx], true, forbid);
    const used = new Set([word[idx]]);
    let g = 0;
    while (tiles.length < 3 && g++ < 50) {
      const ch = "abcdefghijklmnopqrstuvwxyz"[Shell.randInt(0, 25)];
      if (used.has(ch)) continue;
      used.add(ch); placeTile(ch, false, forbid);
    }
  }

  function placeTile(letter, correct, forbid) {
    const free = freeCells(forbid);
    if (!free.length) return;
    const c = free[Shell.randInt(0, free.length - 1)];
    tiles.push({ x: c.x, y: c.y, letter, correct });
  }

  // a sparkly bonus circle (not a letter) — eating it adds a glowing gem to the body
  function spawnTreat() {
    const free = freeCells();
    treat = free.length ? { ...free[Shell.randInt(0, free.length - 1)] } : null;
  }
  function addGem() {
    gems.push({ t: 0.2 + Math.random() * 0.65, color: GEM_COLORS[Shell.randInt(0, GEM_COLORS.length - 1)] });
    if (gems.length > 10) gems.shift();
  }

  function tick() {
    prevCells = snake.map(c => ({ ...c }));
    // reverse: if the player steers back toward the tail, flip the snake
    if (snake.length > 1) {
      const hX = snake[0].x - snake[1].x, hY = snake[0].y - snake[1].y;
      if (nextDir[0] === -hX && nextDir[1] === -hY) { snake.reverse(); prevCells = snake.map(c => ({ ...c })); }
    }
    dir = nextDir;
    const hx = snake[0].x + dir[0];
    const hy = snake[0].y + dir[1];
    if (hx < 0 || hx >= COLS || hy < 0 || hy >= ROWS) { tickAt = performance.now(); return; } // bump wall & wait
    const hit = tiles.find(t => t.x === hx && t.y === hy);
    const gotTreat = treat && treat.x === hx && treat.y === hy;
    snake.unshift({ x: hx, y: hy });

    if (gotTreat) {
      snake.pop();
      addGem(); Shell.confetti(12); spawnTreat();   // small sparkle, gem on body is the reward
    } else if (hit && hit.correct) {
      Shell.speak(Shell._letterName(hit.letter));   // clear letter name
      idx++; renderWord();
      if (idx >= word.length) wordComplete();
      else spawnTiles();
    } else if (hit && !hit.correct) {
      snake.pop();
      Shell.speak("Not that one.");
      tiles = tiles.filter(t => t !== hit);
      placeTile(pickDistractor(), false, forbiddenAhead());
    } else {
      snake.pop();
    }
    tickAt = performance.now();
  }

  function pickDistractor() {
    const used = new Set(tiles.map(t => t.letter).concat([word[idx]]));
    let ch, g = 0;
    do { ch = "abcdefghijklmnopqrstuvwxyz"[Shell.randInt(0, 25)]; } while (used.has(ch) && g++ < 50);
    return ch;
  }

  function wordComplete() {
    score++;
    document.getElementById("snake-score").textContent = score;
    rememberWord(word);
    Shell.bumpProgress("snakeWords", 1);
    clearInterval(moveTimer);
    Shell.confetti();
    const became = !isDragon && score >= DRAGON_AT;
    if (became) isDragon = true;
    Shell.speak(word, {
      onend: () => {
        if (became) Shell.speak("You turned into a DRAGON!");
        if (running) { newWord(); tickAt = performance.now(); moveTimer = setInterval(tick, SPEED); }
      }
    });
  }

  function rememberWord(w) {
    try {
      const set = new Set(JSON.parse(localStorage.getItem("pl_spelled") || "[]"));
      set.add(w); localStorage.setItem("pl_spelled", JSON.stringify([...set]));
    } catch (e) {}
  }

  // ---------- smooth rendering ----------
  function renderLoop() {
    if (!running) return;
    const p = Math.min(1, (performance.now() - tickAt) / SPEED);
    draw(p);
    rafId = requestAnimationFrame(renderLoop);
  }

  function cellCenter(c) { return { x: c.x * cell + cell / 2, y: c.y * cell + cell / 2 }; }

  // Smooth, undulating tube of points (head first), densely sampled so the
  // body circles overlap into one continuous snake.
  function bodyPoints(p) {
    const n = snake.length;
    // motion-interpolated segment centres (glide between cells)
    const M = [];
    for (let i = 0; i < n; i++) {
      const cur = cellCenter(snake[i]); const pv = prevCells[i];
      if (pv) { const a = cellCenter(pv); M.push({ x: a.x + (cur.x - a.x) * p, y: a.y + (cur.y - a.y) * p }); }
      else M.push(cur);
    }
    // sub-divide each gap so the tube is continuous
    const K = 4, D = [];
    for (let i = 0; i < n - 1; i++)
      for (let s = 0; s < K; s++) {
        const f = s / K;
        D.push({ x: M[i].x + (M[i + 1].x - M[i].x) * f, y: M[i].y + (M[i + 1].y - M[i].y) * f });
      }
    D.push(M[n - 1]);
    // gentle slither: perpendicular sine offset travelling down the body
    const t = performance.now() / 1000, amp = cell * 0.09;
    return D.map((pt, i) => {
      const a = D[i - 1] || pt, b = D[i + 1] || pt;
      let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const off = (i === 0) ? 0 : Math.sin(t * 6 - i * 0.5) * amp;
      return { x: pt.x - dy * off, y: pt.y + dx * off };
    });
  }
  const SUBK = 4;

  function draw(p) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // soft grid
    ctx.strokeStyle = isDragon ? "#f3d6c0" : "#d7f1e2"; ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke(); }
    for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(0, j * cell); ctx.lineTo(canvas.width, j * cell); ctx.stroke(); }

    // letter tiles (big)
    tiles && tiles.forEach(t => {
      const c = cellCenter(t);
      ctx.beginPath(); ctx.fillStyle = "#ffcf3f"; ctx.arc(c.x, c.y, cell * 0.44, 0, 7); ctx.fill();
      ctx.lineWidth = Math.max(2, cell * 0.05); ctx.strokeStyle = "#e3a91d"; ctx.stroke();
      ctx.fillStyle = "#5a3d00";
      ctx.font = `bold ${Math.floor(cell * 0.66)}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t.letter, c.x, c.y + cell * 0.02);
    });

    if (treat) drawTreat();
    if (!snake) return;
    drawSnake(bodyPoints(p));
  }

  function drawSnake(P) {
    const n = P.length;
    const headR = cell * 0.42;
    const olw = Math.max(2, cell * 0.07);
    const outline = isDragon ? "#a8311c" : "#137a48";
    const body = isDragon ? "#ef5d3a" : "#2fbd75";

    // dragon ridge spikes (drawn under the body so they peek out)
    if (isDragon) {
      ctx.fillStyle = "#ffd23f";
      for (let i = SUBK; i < n - 1; i += SUBK) {
        const a = P[i - 1], b = P[i + 1];
        let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const r = cell * 0.32;
        tri(P[i].x - dy * r, P[i].y + dx * r, P[i].x - dy * (r + cell * 0.24), P[i].y + dx * (r + cell * 0.24), P[i].x, P[i].y, cell * 0.12, dx, dy);
      }
    }

    // one continuous tapered tube: densely overlapping circles, radius graded
    // from head to a pointy tail. Outline pass first (tail->head), then fill.
    const rAt = i => headR * (1 - 0.62 * (i / Math.max(1, n - 1)));
    ctx.fillStyle = outline;
    for (let i = n - 1; i >= 0; i--) circ(P[i].x, P[i].y, rAt(i) + olw);
    ctx.fillStyle = body;
    for (let i = n - 1; i >= 0; i--) circ(P[i].x, P[i].y, rAt(i));

    // glowing gems collected from sparkle treats
    const tm = performance.now() / 1000;
    gems.forEach((g, k) => {
      const i = Math.min(n - 1, Math.max(1, Math.round(g.t * (n - 1))));
      const pt = P[i], r = rAt(i) * 0.62;
      ctx.fillStyle = g.color; circ(pt.x, pt.y, r);
      ctx.fillStyle = "rgba(255,255,255,0.85)"; circ(pt.x - r * 0.3, pt.y - r * 0.35, r * 0.35);
      const s = r * (1.15 + 0.25 * Math.sin(tm * 6 + k));
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = Math.max(1, cell * 0.03); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pt.x - s, pt.y); ctx.lineTo(pt.x + s, pt.y);
      ctx.moveTo(pt.x, pt.y - s); ctx.lineTo(pt.x, pt.y + s); ctx.stroke();
    });

    drawHead(P[0], headR, outline);
  }

  function drawHead(h, headR, outline) {
    const f = dir, perp = [-f[1], f[0]];
    if (isDragon) drawWings(h, headR);
    ctx.fillStyle = outline; circ(h.x, h.y, headR * 1.12 + Math.max(2, cell * 0.07));
    ctx.fillStyle = isDragon ? "#c43620" : "#1e9e62"; circ(h.x, h.y, headR * 1.12);

    if (isDragon) { // horns
      ctx.fillStyle = "#ffe08a";
      [-1, 1].forEach(side => {
        const bx = h.x - f[0] * headR * 0.4 + perp[0] * headR * 0.7 * side;
        const by = h.y - f[1] * headR * 0.4 + perp[1] * headR * 0.7 * side;
        tri(bx, by, bx - f[0] * headR * 0.9 + perp[0] * headR * 0.2 * side, by - f[1] * headR * 0.9 + perp[1] * headR * 0.2 * side, bx, by, headR * 0.22, f[0], f[1]);
      });
    }
    // eyes
    const ex = h.x + f[0] * headR * 0.25, ey = h.y + f[1] * headR * 0.25;
    [-1, 1].forEach(side => {
      const cx = ex + perp[0] * headR * 0.5 * side, cy = ey + perp[1] * headR * 0.5 * side;
      ctx.fillStyle = "#fff"; circ(cx, cy, headR * 0.34);
      ctx.fillStyle = "#111"; circ(cx + f[0] * headR * 0.1, cy + f[1] * headR * 0.1, headR * 0.17);
    });
    // mouth output
    const mx = h.x + f[0] * headR * 1.05, my = h.y + f[1] * headR * 1.05;
    const t = performance.now() / 1000;
    if (isDragon) {
      ctx.fillStyle = "rgba(255,150,30,0.95)";
      const fl = headR * (1.0 + 0.3 * Math.sin(t * 14));
      ctx.beginPath();
      ctx.moveTo(mx + perp[0] * headR * 0.25, my + perp[1] * headR * 0.25);
      ctx.lineTo(mx + f[0] * fl, my + f[1] * fl);
      ctx.lineTo(mx - perp[0] * headR * 0.25, my - perp[1] * headR * 0.25);
      ctx.closePath(); ctx.fill();
    } else {
      const flick = headR * (0.45 + 0.3 * Math.max(0, Math.sin(t * 9)));
      const tx = mx + f[0] * flick, ty = my + f[1] * flick;
      ctx.strokeStyle = "#e23b3b"; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + f[0] * headR * 0.15 + perp[0] * headR * 0.16, ty + f[1] * headR * 0.15 + perp[1] * headR * 0.16);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + f[0] * headR * 0.15 - perp[0] * headR * 0.16, ty + f[1] * headR * 0.15 - perp[1] * headR * 0.16);
      ctx.stroke();
    }
  }

  function drawWings(h, headR) {
    ctx.fillStyle = "rgba(120,40,160,0.85)";
    const perp = [-dir[1], dir[0]];
    [-1, 1].forEach(side => {
      const bx = h.x - dir[0] * headR * 1.6, by = h.y - dir[1] * headR * 1.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + perp[0] * headR * 1.6 * side - dir[0] * headR, by + perp[1] * headR * 1.6 * side - dir[1] * headR);
      ctx.lineTo(bx + perp[0] * headR * 0.7 * side - dir[0] * headR * 1.8, by + perp[1] * headR * 0.7 * side - dir[1] * headR * 1.8);
      ctx.closePath(); ctx.fill();
    });
  }

  function drawTreat() {
    const c = cellCenter(treat), t = performance.now() / 1000;
    const pulse = 1 + 0.12 * Math.sin(t * 5);
    ctx.fillStyle = "rgba(255,221,90,0.35)"; circ(c.x, c.y, cell * 0.42 * pulse);
    ctx.fillStyle = "#ffd23f"; circ(c.x, c.y, cell * 0.26 * pulse);
    ctx.fillStyle = "#fff7cf"; circ(c.x - cell * 0.06, c.y - cell * 0.07, cell * 0.09);
    drawStar(c.x, c.y, cell * 0.4 * pulse, "rgba(255,255,255,0.95)");
  }
  function drawStar(cx, cy, r, color) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, cell * 0.045); ctx.lineCap = "round";
    const d = r * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx - d, cy + d); ctx.lineTo(cx + d, cy - d);
    ctx.stroke();
  }

  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function tri(ax, ay, bx, by, baseX, baseY, w, dx, dy) {
    // simple triangle: apex (bx,by), base around (ax,ay) widened by w along (dx,dy)
    ctx.beginPath();
    ctx.moveTo(ax + dx * w, ay + dy * w);
    ctx.lineTo(bx, by);
    ctx.lineTo(ax - dx * w, ay - dy * w);
    ctx.closePath(); ctx.fill();
  }

  window.WordSnake = { init, start, stop, pause, resume,
    _state: () => ({ head: { ...snake[0] }, neck: { ...snake[1] }, dir: dir.slice(), len: snake.length }) };
})();
