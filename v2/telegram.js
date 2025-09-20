// telegram.js - Integrasi Telegram Web App SDK

// Inisialisasi SDK Telegram
const tg = window.Telegram?.WebApp;

if (!tg) {
  console.warn("Telegram WebApp SDK not detected. Running in standalone mode.");
} else {
  // Perluas viewport ke fullscreen
  tg.expand();

  // Sembunyikan splash screen Telegram
  tg.ready();

  // Tampilkan tombol back
  tg.BackButton.show();

  // Terapkan tema Telegram ke body (light/dark)
  document.body.classList.add(tg.colorScheme);

  // Update tema jika berubah
  tg.onEvent('themeChanged', () => {
    document.body.className = ''; // reset
    document.body.classList.add(tg.colorScheme);
  });

  // Tampilkan nama user
  const user = tg.initDataUnsafe?.user;
  if (user?.first_name) {
    document.getElementById("userName").textContent = `Hi, ${user.first_name}!`;
  } else {
    document.getElementById("userName").textContent = "Welcome!";
  }

  // Fungsi simpan game state ke CloudStorage Telegram
  function saveGameState() {
    const state = {
      score,
      tapPower,
      autoPower,
      lastPlayed: Date.now(),
      upgrades: upgrades.map(u => ({
        id: u.id,
        owned: u.owned,
        cost: u.cost
      }))
    };

    tg.CloudStorage.setItem('gameState', JSON.stringify(state), (error) => {
      if (error) {
        console.error("Save failed:", error);
      } else {
        console.log("Game saved at", new Date().toLocaleTimeString());
      }
    });
  }

  // Fungsi muat game state dari CloudStorage
  function loadGameState() {
    tg.CloudStorage.getItem('gameState', (error, value) => {
      if (error) {
        console.error("Load failed:", error);
        return;
      }

      if (!value) {
        console.log("No saved game found. Starting fresh.");
        return;
      }

      try {
        const state = JSON.parse(value);

        // Restore nilai
        score = state.score || 0;
        tapPower = state.tapPower || 1;
        autoPower = state.autoPower || 0;
        lastPlayed = state.lastPlayed || Date.now();

        // Restore upgrades
        if (state.upgrades && Array.isArray(state.upgrades)) {
          state.upgrades.forEach(saved => {
            const upg = upgrades.find(u => u.id === saved.id);
            if (upg) {
              upg.owned = saved.owned || 0;
              upg.cost = saved.cost || upg.baseCost || upg.cost;
            }
          });
        }

        // Hitung poin otomatis yang terlewat saat offline
        const now = Date.now();
        const elapsedSec = Math.floor((now - lastPlayed) / 1000);
        if (elapsedSec > 0 && autoPower > 0) {
          const offlineEarned = elapsedSec * autoPower;
          score += offlineEarned;
          console.log(`Earned ${offlineEarned} coins offline (${elapsedSec}s * ${autoPower}/s)`);
        }

        // Update tampilan
        updateUI();
        console.log("Game loaded successfully!");

      } catch (e) {
        console.error("Error parsing saved game:", e);
      }
    });
  }

  // Jalankan load game saat pertama kali
  loadGameState();

  // Auto-save tiap 30 detik
  setInterval(saveGameState, 30000);

  // Simpan juga saat halaman ditutup
  window.addEventListener('beforeunload', saveGameState);

  // Atur perilaku tombol back Telegram
  tg.BackButton.onClick(() => {
    if (menuArea.classList.contains("active")) {
      menuArea.classList.remove("active"); // tutup menu
    } else {
      tg.close(); // keluar dari Mini App
    }
  });

  // Export fungsi agar bisa dipakai di core.js
  window.saveGameState = saveGameState;
}