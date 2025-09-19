let score = 0;
let tapPower = 1;
let autoPower = 0;

// DOM
const scoreCount = document.getElementById("scoreCount");
const scorePerSec = document.getElementById("scorePerSec");
const tapArea = document.getElementById("tapArea");
const rooster = document.getElementById("rooster");
const clickSound = document.getElementById("clickSound");
const menuArea = document.getElementById("menuArea");
const menuContent = document.getElementById("menuContent");

// tombol nav
document.getElementById("btnPlay").addEventListener("click", () => showMenu("play"));
document.getElementById("btnUpgrades").addEventListener("click", () => showMenu("upgrades"));
document.getElementById("btnStats").addEventListener("click", () => showMenu("stats"));
document.getElementById("btnSettings").addEventListener("click", () => showMenu("settings"));

// klik tap area
tapArea.addEventListener("click", () => {
  score += tapPower;
  updateUI();
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
});

// auto income
setInterval(() => {
  score += autoPower;
  updateUI();
}, 1000);

// update UI
function updateUI() {
  scoreCount.textContent = score;
  scorePerSec.textContent = autoPower;
}

// menu handler
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
      <p>Total Score: ${score}</p>
      <p>Tap Power: ${tapPower}</p>
      <p>Auto Power: ${autoPower}</p>
    `;
  } else if (type === "settings") {
    menuContent.innerHTML = `
      <h3>Settings</h3>
      <button onclick="resetGame()">Reset Game</button>
    `;
  }
}

// render upgrades
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

// beli upgrade
function buyUpgrade(upg) {
  if (score >= upg.cost) {
    score -= upg.cost;
    upg.owned++;
    if (upg.effect.tap) tapPower += upg.effect.tap;
    if (upg.effect.auto) autoPower += upg.effect.auto;
    upg.cost = Math.floor(upg.cost * 1.5);
    updateUI();
    renderUpgrades();
  }
}

// reset
function resetGame() {
  score = 0;
  tapPower = 1;
  autoPower = 0;
  upgrades.forEach((u) => {
    u.owned = 0;
    u.cost = Math.floor(u.cost / (u.owned + 1)); // reset harga awal
  });
  updateUI();
  menuArea.classList.remove("active");
}
