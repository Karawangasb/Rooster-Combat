// ================================= //
// --- ROOSTERFI TAP MINER - GAME.JS --- //
// ================================= //

// --- Firebase Imports (v10.7.1 modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc,
  collection, getDocs, query, orderBy, where, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Konfigurasi Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDOFgwhenY_asKM32mgG_n8_d1rAnMKny0",
  authDomain: "taro-9b8c5.firebaseapp.com",
  projectId: "taro-9b8c5",
  storageBucket: "taro-9b8c5.appspot.com",
  messagingSenderId: "856610794983",
  appId: "1:856610794983:web:49c9eab3d62af46f5da142"
};

// --- Inisialisasi Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variabel global
let gameState = null;
let quests = null;
let currentUserId = null; // akan diisi alamat wallet

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM ELEMENTS ---
  const connectBtn = document.getElementById("connect-btn");
  const walletAddressEl = document.getElementById("wallet-address");
  const playerNameDisplay = document.getElementById("player-name-display");
  const editNameBtn = document.getElementById("edit-name-btn");

  const balanceValue = document.getElementById("balance-value");
  const energyValue = document.getElementById("energy-value");
  const growPowerValue = document.getElementById("grow-power-value");
  const energyBar = document.getElementById("energy-bar");
  const tapArea = document.getElementById("tap-area");
  const roosterMaskot = document.getElementById("rooster-maskot");
  const notification = document.getElementById("notification");
  const userRank = document.getElementById("user-rank");

  const capacityLevel = document.getElementById("capacity-level");
  const powerLevel = document.getElementById("power-level");
  const speedLevel = document.getElementById("speed-level");

  const capacityCost = document.getElementById("capacity-cost");
  const powerCost = document.getElementById("power-cost");
  const speedCost = document.getElementById("speed-cost");

  const stakeBtn = document.getElementById("stake-btn");
  const unstakeBtn = document.getElementById("unstake-btn");
  const stakeInput = document.getElementById("stake-input");
  const stakedAmountDisplay = document.getElementById("staked-amount");
  const rewardEstimateEl = document.getElementById("reward-estimate");

  // ========================
  // --- WALLET CONNECTION ---
  // ========================

  async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
      showNotification("Please install MetaMask!");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0].toLowerCase();
      currentUserId = address;
      walletAddressEl.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
      connectBtn.textContent = "Connected";
      connectBtn.disabled = true;
      connectBtn.style.opacity = "0.7";

      console.log("✅ Wallet connected:", address);
      await initGame();
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      showNotification("Connection rejected!");
    }
  }

  connectBtn.addEventListener("click", connectWallet);

  // ========================
  // --- CHANGE PLAYER NAME ---
  // ========================

  async function changePlayerName() {
    if (!currentUserId) {
      showNotification("Connect wallet first!");
      return;
    }

    const newName = prompt("Enter your new name (2-15 characters):", gameState.name || "");
    
    if (!newName || newName.trim().length < 2 || newName.trim().length > 15) {
      showNotification("Name must be 2-15 characters!");
      return;
    }

    const cleanName = newName.trim().replace(/[<>]/g, "");
    gameState.name = cleanName;

    try {
      const userRef = doc(db, "users", currentUserId);
      await setDoc(userRef, { name: cleanName }, { merge: true });
      playerNameDisplay.textContent = cleanName;
      showNotification("Name updated!");
      loadAndRenderLeaderboard();
    } catch (err) {
      console.error("❌ Failed to update name:", err);
      showNotification("Failed to save name!");
    }
  }

  if (editNameBtn) {
    editNameBtn.addEventListener("click", changePlayerName);
  }

  // ========================
  // --- GAME LOGIC FUNCTIONS ---
  // ========================

  function calculateStakingRewards() {
    if (!gameState || gameState.stakedAmount <= 0) return 0;

    const now = Date.now();
    const elapsedSeconds = (now - gameState.lastStakeUpdate) / 1000;
    const rewardRatePerSecond = 0.00001;

    const rewards = gameState.stakedAmount * rewardRatePerSecond * elapsedSeconds;

    if (rewards >= 0.01) {
      gameState.troBalance += rewards;
      gameState.lastStakeUpdate = now;
      return rewards;
    }
    return 0;
  }

  function stakeTokens() {
    if (!currentUserId) {
      showNotification("Connect wallet first!");
      return;
    }
    const amount = parseFloat(stakeInput.value);
    if (isNaN(amount) || amount <= 0) {
      showNotification("Enter a valid amount!");
      return;
    }
    if (gameState.troBalance < amount) {
      showNotification("Not enough ROOFI to stake!");
      return;
    }

    gameState.troBalance -= amount;
    gameState.stakedAmount += amount;
    stakeInput.value = "";
    showNotification(`${amount.toFixed(2)} ROOFI Staked!`);
    checkQuests();
    updateUI();
  }

  function unstakeTokens() {
    if (!currentUserId) {
      showNotification("Connect wallet first!");
      return;
    }
    if (gameState.stakedAmount <= 0) {
      showNotification("No ROOFI to unstake!");
      return;
    }

    calculateStakingRewards();
    gameState.troBalance += gameState.stakedAmount;
    gameState.stakedAmount = 0;
    gameState.lastStakeUpdate = Date.now();
    showNotification("All ROOFI unstaked!");
    updateUI();
  }

  function handleTap(event) {
    if (!currentUserId) {
      showNotification("Connect wallet to play!");
      return;
    }
    if (gameState.energy >= gameState.energyCost) {
      let stakeBonus = 1 + gameState.stakedAmount / 1000;
      let effectiveGrowPower = gameState.growPower * stakeBonus;

      gameState.energy -= gameState.energyCost;
      gameState.troBalance += effectiveGrowPower;
      gameState.totalTaps++;

      showFloatingNumber(event.clientX, event.clientY, effectiveGrowPower);

      roosterMaskot.style.transform = "scale(0.9)";
      setTimeout(() => {
        roosterMaskot.style.transform = "scale(1)";
      }, 100);

      checkQuests();
      updateUI();
    } else {
      showNotification("Not enough energy! ⚡️");
    }
  }

  function showFloatingNumber(x, y, value) {
    const floatingNumber = document.createElement("div");
    floatingNumber.textContent = `+${value.toFixed(2)}`;
    floatingNumber.className = "floating-number";
    floatingNumber.style.left = `${x}px`;
    floatingNumber.style.top = `${y}px`;
    document.body.appendChild(floatingNumber);
    setTimeout(() => floatingNumber.remove(), 1000);
  }

  if (!document.querySelector(".floating-number-style")) {
    const style = document.createElement("style");
    style.className = "floating-number-style";
    style.innerHTML = `
      .floating-number {
        position: fixed;
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-shadow: 0 0 6px #fbc02d, 0 0 12px #e53935;
        animation: floatUp 1s ease-out forwards;
        pointer-events: none;
        z-index: 9999;
      }
      @keyframes floatUp {
        to { transform: translateY(-80px); opacity: 0; }
      }`;
    document.head.appendChild(style);
  }

  function rechargeEnergy() {
    if (!gameState || gameState.energy >= gameState.energyMax) return;
    gameState.energy += gameState.rechargeRate;
    if (gameState.energy > gameState.energyMax) gameState.energy = gameState.energyMax;
    updateUI();
  }

  function buyUpgrade(type) {
    if (!currentUserId) {
      showNotification("Connect wallet first!");
      return;
    }
    const upgrade = gameState.upgrades[type];
    if (gameState.troBalance >= upgrade.cost) {
      gameState.troBalance -= upgrade.cost;
      upgrade.level++;
      gameState.totalUpgrades++;

      switch (type) {
        case "capacity":
          gameState.energyMax = Math.floor(100 * 1.2 ** (upgrade.level - 1));
          break;
        case "power":
          gameState.growPower = +(0.1 * 1.5 ** (upgrade.level - 1)).toFixed(2);
          break;
        case "speed":
          gameState.rechargeRate = +(1 * 1.3 ** (upgrade.level - 1)).toFixed(2);
          break;
      }

      upgrade.cost = Math.floor(upgrade.cost * 2.5);
      showNotification(`${type} upgraded!`);
      checkQuests();
      updateUI();
    } else {
      showNotification("Not enough ROOFI Coin!");
    }
  }

  // ========================
  // --- UI & QUESTS ---
  // ========================

  function updateUI() {
    if (!gameState) return;

    balanceValue.textContent = Math.floor(gameState.troBalance).toLocaleString();
    document.getElementById("balance-value-stake").textContent = `${Math.floor(gameState.troBalance).toLocaleString()} ROOFI`;
    energyValue.textContent = `${Math.floor(gameState.energy)}/${gameState.energyMax}`;
    growPowerValue.textContent = gameState.growPower;

    const energyPercentage = (gameState.energy / gameState.energyMax) * 100;
    energyBar.style.width = `${energyPercentage}%`;

    capacityLevel.textContent = gameState.upgrades.capacity.level;
    powerLevel.textContent = gameState.upgrades.power.level;
    speedLevel.textContent = gameState.upgrades.speed.level;

    capacityCost.textContent = gameState.upgrades.capacity.cost;
    powerCost.textContent = gameState.upgrades.power.cost;
    speedCost.textContent = gameState.upgrades.speed.cost;

    stakedAmountDisplay.textContent = `${gameState.stakedAmount.toLocaleString()} ROOFI`;

    const rewardPerMinute = (gameState.stakedAmount * 0.00001 * 60).toFixed(2);
    if (rewardEstimateEl) {
      rewardEstimateEl.textContent = rewardPerMinute;
    }
  }

  function showNotification(message) {
    notification.textContent = message;
    notification.classList.add("show");
    setTimeout(() => notification.classList.remove("show"), 2500);
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        const tabId = tab.getAttribute("data-tab");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  function checkQuests() {
    if (!quests || !gameState) return;

    if (!quests.tap100.completed) {
      const progress = (gameState.totalTaps / quests.tap100.target) * 100;
      document.getElementById("quest-tap100-progress").style.width = `${Math.min(progress, 100)}%`;
      if (gameState.totalTaps >= quests.tap100.target) {
        gameState.troBalance += quests.tap100.reward;
        quests.tap100.completed = true;
        showNotification(`Quest Complete! +${quests.tap100.reward} ROOFI`);
        document.getElementById("quest-tap100").style.opacity = "0.6";
      }
    }

    if (!quests.upgrade3.completed) {
      const progress = (gameState.totalUpgrades / quests.upgrade3.target) * 100;
      document.getElementById("quest-upgrade3-progress").style.width = `${Math.min(progress, 100)}%`;
      if (gameState.totalUpgrades >= quests.upgrade3.target) {
        gameState.troBalance += quests.upgrade3.reward;
        quests.upgrade3.completed = true;
        showNotification(`Quest Complete! +${quests.upgrade3.reward} ROOFI`);
        document.getElementById("quest-upgrade3").style.opacity = "0.6";
      }
    }

    if (!quests.stake50.completed) {
      const progress = (gameState.stakedAmount / quests.stake50.target) * 100;
      document.getElementById("quest-stake50-progress").style.width = `${Math.min(progress, 100)}%`;
      if (gameState.stakedAmount >= quests.stake50.target) {
        gameState.troBalance += quests.stake50.reward;
        quests.stake50.completed = true;
        showNotification(`Quest Complete! +${quests.stake50.reward} ROOFI`);
        document.getElementById("quest-stake50").style.opacity = "0.6";
      }
    }
  }

  // ========================
  // --- LEADERBOARD ---
  // ========================

  async function fetchLeaderboard() {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("troBalance", "desc"), limit(10));
      const querySnapshot = await getDocs(q);

      const topPlayers = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        topPlayers.push({
          id: doc.id,
          troBalance: data.troBalance || 0,
          name: data.name || "Player"
        });
      });
      return topPlayers;
    } catch (err) {
      console.error("❌ Leaderboard fetch error:", err);
      return [];
    }
  }

  async function updateUserRank() {
    if (!currentUserId || !gameState) return;
    try {
      const userBalance = gameState.troBalance;
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("troBalance", ">=", userBalance), orderBy("troBalance", "desc"));
      const querySnapshot = await getDocs(q);

      let rank = 1;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.troBalance > userBalance) rank++;
      });

      userRank.textContent = `#${rank} • ${Math.floor(gameState.troBalance).toLocaleString()} ROOFI`;
    } catch (err) {
      console.error("❌ Rank fetch error:", err);
    }
  }

  function renderLeaderboard(topPlayers) {
    const leaderboardList = document.querySelector("#leaderboard-tab .leaderboard-list");
    if (!leaderboardList) return;

    leaderboardList.innerHTML = "";
    topPlayers.forEach((player, index) => {
      const isCurrentUser = player.id === currentUserId;
      const item = document.createElement("div");
      item.className = `leaderboard-item ${isCurrentUser ? "current-user" : ""}`;
      item.innerHTML = `
        <div>
          <span class="leaderboard-rank">${index + 1}.</span>
          ${isCurrentUser ? "You" : (player.name || "Player")}
        </div>
        <div>${Math.floor(player.troBalance).toLocaleString()} ROOFI</div>
      `;
      leaderboardList.appendChild(item);
    });
  }

  async function loadAndRenderLeaderboard() {
    const topPlayers = await fetchLeaderboard();
    renderLeaderboard(topPlayers);
    if (currentUserId) updateUserRank();
  }

  // ========================
  // --- FIRESTORE SAVE/LOAD ---
  // ========================

  async function saveGame() {
    if (!currentUserId || !gameState) return;
    try {
      const gameStateRef = doc(db, "users", currentUserId);
      await setDoc(gameStateRef, { 
        ...gameState, 
        quests,
        lastStakeUpdate: gameState.lastStakeUpdate
        // Nama TIDAK ditimpa — dipertahankan dari gameState.name
      }, { merge: true });
    } catch (err) {
      console.error("❌ Save error:", err);
    }
  }

  async function loadGame() {
    if (!currentUserId) return;
    try {
      const gameStateRef = doc(db, "users", currentUserId);
      const snap = await getDoc(gameStateRef);
      const defaultState = {
        troBalance: 0,
        energy: 100,
        energyMax: 100,
        growPower: 0.1,
        energyCost: 1,
        rechargeRate: 1,
        upgrades: {
          capacity: { level: 1, cost: 5 },
          power: { level: 1, cost: 5 },
          speed: { level: 1, cost: 7 }
        },
        stakedAmount: 0,
        lastStakeUpdate: Date.now(),
        lastUpdate: Date.now(),
        totalTaps: 0,
        totalUpgrades: 0,
        name: `Player-${currentUserId.slice(2, 8)}`
      };

      const defaultQuests = {
        tap100: { target: 100, reward: 10, completed: false },
        upgrade3: { target: 3, reward: 25, completed: false },
        stake50: { target: 50, reward: 5, completed: false }
      };

      if (snap.exists()) {
        const data = snap.data();
        gameState = { ...defaultState, ...data };
        quests = { ...defaultQuests, ...data.quests };
        gameState.lastStakeUpdate = data.lastStakeUpdate || Date.now();
      } else {
        gameState = defaultState;
        quests = defaultQuests;
        await setDoc(gameStateRef, { ...gameState, quests, lastStakeUpdate: gameState.lastStakeUpdate });
      }

      // ✅ Tampilkan nama setelah gameState dimuat
      if (playerNameDisplay) {
        playerNameDisplay.textContent = gameState.name || `Player-${currentUserId.slice(2, 8)}`;
      }
    } catch (err) {
      console.error("❌ Load error:", err);
    }
  }

  // ========================
  // --- INIT GAME ---
  // ========================

  async function initGame() {
    if (!currentUserId) return;

    console.log("🐔 RoosterFi Tap Miner Initializing...");
    await loadGame();

    tapArea.addEventListener("click", handleTap);
    document.querySelectorAll(".upgrade-card").forEach((card) => {
      card.addEventListener("click", () => buyUpgrade(card.getAttribute("data-upgrade")));
    });
    stakeBtn.addEventListener("click", stakeTokens);
    unstakeBtn.addEventListener("click", unstakeTokens);
    setupTabs();

    updateUI();
    checkQuests();

    loadAndRenderLeaderboard();
    setInterval(loadAndRenderLeaderboard, 30000);
    setInterval(rechargeEnergy, 1000);
    setInterval(() => {
      if (gameState?.stakedAmount > 0) {
        const reward = calculateStakingRewards();
        if (reward > 0) updateUI();
      }
    }, 10000);
    setInterval(saveGame, 10000);
  }

  setupTabs();
});
