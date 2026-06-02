/* Wires the home menu, back buttons, mute, and break pause/resume to the games. */
(function () {
  let activeGame = null;

  document.addEventListener("DOMContentLoaded", () => {
    WordSnake.init();
    Fishing.init();
    Spelling.init();

    // Home cards
    document.querySelectorAll(".game-card").forEach(card => {
      card.addEventListener("click", () => openGame(card.dataset.game));
    });

    // Back buttons
    document.querySelectorAll("[data-back]").forEach(b =>
      b.addEventListener("click", goHome));

    // Mute
    document.getElementById("mute-toggle").addEventListener("click", () =>
      Shell.setMuted(!Shell.muted));

    // First tap anywhere primes speech synthesis on iOS/Safari
    const prime = () => { Shell.speak(" "); document.removeEventListener("pointerdown", prime); };
    document.addEventListener("pointerdown", prime);

    // Register service worker for offline/installable use (only when served over http/https)
    // Skip the service worker on the dev preview port so edits aren't cached.
    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && location.port !== "8733") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
      // when a new version takes over, reload once so updates appear right away
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return; refreshing = true; location.reload();
      });
    }
  });

  function openGame(game) {
    activeGame = game;
    Shell.go(game);
    if (game === "snake") WordSnake.start();
    if (game === "fishing") Fishing.start();
    if (game === "spelling") Spelling.start();
  }

  function goHome() {
    if (activeGame === "snake") WordSnake.stop();
    if (activeGame === "fishing") Fishing.stop();
    if (activeGame === "spelling") Spelling.stop();
    activeGame = null;
    Shell.go("home");
  }

  // Pause the running game during a wiggle break, resume after.
  Shell.onBreakStart = () => { if (activeGame === "snake") WordSnake.pause(); };
  Shell.onBreakEnd = () => { if (activeGame === "snake") WordSnake.resume(); };
})();
