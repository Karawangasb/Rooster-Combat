// core.js - versi Telegram Mini App

let score = 0;
let tapPower = 1;
let autoPower = 0;
let lastPlayed = Date.now(); // untuk hitung offline income

// DOM Elements
const scoreCount = document.getElementById("scoreCount");
const scorePerSec = document.getElementById("scorePerSec");
const tapArea = document.getElementById("tapArea");
const rooster = document.getElementById("rooster");
const clickSound = document.getElementById("clickSound");
const menuArea = document.getElementById("menuArea");
const menuContent = document.getElementById("menuContent");

// Navigation buttons
document.getElementById("btnPlay").addEventListener("click", () => showMenu("play"));
document.getElementById("btnUpgrades").addEventListener("click", () => showMenu("upgrades"));
document.getElementById("btnStats").addEventListener("click", () => showMenu("stats"));
document.getElementById("btnSettings").addEventListener("click", () => showMenu("settings"));

// Tap handler
tapArea.addEventListener("click", () => {
  score += tapPower;
  updateUI();
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(e => console.log("Audio play failed:", e)); // aman jika gagal
  }
});

// Auto income per detik
setInterval(() => {
  score += autoPower;
  updateUI();
}, 1000);

// Update tampilan UI
function updateUI() {
  scoreCount.textContent = Math.floor(score);
  scorePerSec.textContent = autoPower;
}

// Tampilkan menu
function showMenu(type) {
  menuArea.classList.add("active");
  menuContent.innerHTML = "";

  if (type === "play") {
    menuArea.classList.remove("active");
  } else if (type === "upgrades") {
    renderUpgrades();
  } else if (type === "stats") {
    menuContent.innerHTML = `
      <h3>Stats</h3>
      <p>Total Score: ${Math.floor(score)}</p>
      <p>Tap Power: ${tapPower}</p>
      <p>Auto Power: ${autoPower}/s</p>
      <p>Time Played: ${Math.floor((Date.now() - lastPlayed) / 1000)}s since last load</p>
    `;
  } else if (type === "settings") {
    menuContent.innerHTML = `
      <h3>Settings</h3>
      <button onclick="resetGame()">Reset Game</button>
    `;
  }
}

// Render daftar upgrade
function renderUpgrades() {
  menuContent.innerHTML = "<h3>Upgrades</h3>";
  upgrades.forEach((u) => {
    const item = document.createElement("div");
    item.className = "upgrade-item";
    item.innerHTML = `
      <span>${u.name} (Owned: ${u.owned}) - Cost: ${u.cost}</span>
      <button ${score < u.cost ? "disabled" : ""}>Buy</button>
    `;
    item.querySelector("button").addEventListener("click", () => buyUpgrade(u));
    menuContent.appendChild(item);
  });
}

// Beli upgrade
function buyUpgrade(upg) {
  if (score >= upg.cost) {
    score -= upg.cost;
    upg.owned++;
    if (upg.effect.tap) tapPower += upg.effect.tap;
    if (upg.effect.auto) autoPower += upg.effect.auto;
    upg.cost = Math.floor(upg.cost * 1.5); // naikkan harga
    updateUI();
    renderUpgrades();

    // Simpan progress
    if (typeof saveGameState === 'function') {
      saveGameState();
    }
  }
}

// Reset game dengan konfirmasi
function resetGame() {
  if (typeof Telegram !== 'undefined' && Telegram.WebApp?.showPopup) {
    const tg = Telegram.WebApp;
    tg.showPopup({
      title: "Confirm Reset",
      message: "All your progress will be lost. Continue?",
      buttons: [
        { type: "ok", text: "Yes, Reset" },
        { type: "cancel", text: "Cancel" }
      ]
    }, (buttonId) => {
      if (buttonId === "ok") {
        performReset();
      }
    });
  } else {
    // Fallback jika bukan di Telegram (misal: buka di browser biasa)
    if (confirm("Reset game? All progress will be lost.")) {
      performReset();
    }
  }
}

// Fungsi reset sebenarnya
function performReset() {
  score = 0;
  tapPower = 1;
  autoPower = 0;
  lastPlayed = Date.now();
  upgrades.forEach((u) => {
    u.owned = 0;
    u.cost = u.baseCost || u.cost; // kembalikan ke harga awal
  });
  updateUI();
  menuArea.classList.remove("active");

  // Simpan state reset
  if (typeof saveGameState === 'function') {
    saveGameState();
  }
}