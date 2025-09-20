// core.js - versi Telegram Mini App + Navigasi Dinamis + Musik Latar

let score = 0;
let tapPower = 1;
let autoPower = 0;
let lastPlayed = Date.now();
let isMusicPlaying = false;

// DOM Elements
const scoreCount = document.getElementById("scoreCount");
const scorePerSec = document.getElementById("scorePerSec");
const tapArea = document.getElementById("tapArea");
const rooster = document.getElementById("rooster");
const clickSound = document.getElementById("clickSound");
const bgMusic = document.getElementById("bgMusic");
const menuArea = document.getElementById("menuArea");
const menuContent = document.getElementById("menuContent");
const pageTitle = document.getElementById("pageTitle");

// Navigation buttons
document.getElementById("btnPlay").addEventListener("click", () => showMenu("play"));
document.getElementById("btnUpgrades").addEventListener("click", () => showMenu("upgrades"));
document.getElementById("btnStats").addEventListener("click", () => showMenu("stats"));
document.getElementById("btnSettings").addEventListener("click", () => showMenu("settings"));

// Musik latar — kontrol ON/OFF
document.getElementById("btnMusic")?.addEventListener("click", () => {
  if (!bgMusic) return;

  if (isMusicPlaying) {
    bgMusic.pause();
    document.getElementById("btnMusic").textContent = "🔇 Music: OFF";
  } else {
    bgMusic.play().catch(e => console.log("Gagal play musik:", e));
    document.getElementById("btnMusic").textContent = "🔊 Music: ON";
  }
  isMusicPlaying = !isMusicPlaying;
});

// Tap handler — mulai musik saat pertama kali tap
tapArea.addEventListener("click", () => {
  score += tapPower;
  updateUI();

  // Mainkan efek suara tap
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(e => console.log("Audio tap gagal:", e));
  }

  // Mainkan musik latar jika belum main
  if (!isMusicPlaying && bgMusic) {
    bgMusic.volume = 0.3; // jangan terlalu keras
    bgMusic.play().catch(e => console.log("Musik latar gagal:", e));
    isMusicPlaying = true;
    if (document.getElementById("btnMusic")) {
      document.getElementById("btnMusic").textContent = "🔊 Music: ON";
    }
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

// Tampilkan menu / ganti konten dinamis (header tetap tampil)
function showMenu(type) {
  // Sembunyikan hanya konten dinamis
  tapArea.style.display = "none";
  menuArea.style.display = "none";

  // Tampilkan konten sesuai pilihan
  if (type === "play") {
    tapArea.style.display = "block";
    pageTitle.textContent = "RoosterFi Tap";
  } else if (type === "upgrades") {
    menuArea.style.display = "block";
    renderUpgrades();
    pageTitle.textContent = "🛠 Upgrades";
  } else if (type === "stats") {
    menuArea.style.display = "block";
    menuContent.innerHTML = `
      <h3>📊 Your Stats</h3>
      <p><strong>Total Score:</strong> ${Math.floor(score)}</p>
      <p><strong>Tap Power:</strong> ${tapPower}</p>
      <p><strong>Auto Power:</strong> ${autoPower}/s</p>
      <p><strong>Time Played:</strong> ${Math.floor((Date.now() - lastPlayed) / 1000)}s</p>
    `;
    pageTitle.textContent = "📊 Stats";
  } else if (type === "settings") {
    menuArea.style.display = "block";
    menuContent.innerHTML = `
      <h3>⚙️ Settings</h3>
      <button onclick="resetGame()">🗑️ Reset Game</button>
      <p style="margin-top: 15px; font-size: 12px; color: #aaa;">
        Data saved to Telegram Cloud.
      </p>
    `;
    pageTitle.textContent = "⚙️ Settings";
  }

  // Simpan state
  if (typeof saveGameState === 'function') {
    saveGameState();
  }
}

// Render daftar upgrade
function renderUpgrades() {
  menuContent.innerHTML = "<h3>🛠 Upgrades</h3>";
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
    upg.cost = Math.floor(upg.cost * 1.5);
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
    // Fallback jika bukan di Telegram
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
    u.cost = u.baseCost || u.cost;
  });
  updateUI();
  showMenu("play"); // kembali ke layar utama

  // Simpan state reset
  if (typeof saveGameState === 'function') {
    saveGameState();
  }
}