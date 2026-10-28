const CYR_TO_LAT_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '',
  'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'",
  'қ': 'q', 'ҳ': 'h'
};

function normalizeQuery(text) {
  if (!text) return "";
  let t = text.toLowerCase();
  let trans = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    trans += CYR_TO_LAT_MAP[ch] !== undefined ? CYR_TO_LAT_MAP[ch] : ch;
  }
  return trans
    .replace(/[ʻʼ‘’`´′\']/g, "'")
    .replace(/[^a-z0-9\s'%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------------------------------------
// TAB NAVIGATION
// ----------------------------------------------------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-tab");
    const targetContent = document.getElementById(targetId);
    if (targetContent) targetContent.classList.add("active");
  });
});

// ----------------------------------------------------
// ACTIONS (SOLVE / HIDE)
// ----------------------------------------------------
document.getElementById("btn-solve").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "solve" });
  }
  window.close();
});

document.getElementById("btn-hide").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "hide" });
  }
  window.close();
});

// ----------------------------------------------------
// TELEGRAM CONFIGURATION
// ----------------------------------------------------
const inpToken = document.getElementById("inp-tg-token");
const inpChat = document.getElementById("inp-tg-chat");
const chkEnabled = document.getElementById("chk-tg-enabled");
const btnSaveTg = document.getElementById("btn-save-tg");
const btnTestTg = document.getElementById("btn-test-tg");
const tgFeedback = document.getElementById("tg-msg-feedback");
const tgStatusBadge = document.getElementById("tg-status-badge");

function updateStatusBadge(hasConfig, enabled) {
  if (!tgStatusBadge) return;
  if (!enabled) {
    tgStatusBadge.innerText = "O'chirilgan ⏸️";
    tgStatusBadge.style.color = "#94a3b8";
  } else if (hasConfig) {
    tgStatusBadge.innerText = "Ulangan ✅";
    tgStatusBadge.style.color = "#10b981";
  } else {
    tgStatusBadge.innerText = "Sozlanmagan ⚠️";
    tgStatusBadge.style.color = "#f59e0b";
  }
}

const DEFAULT_TOKEN = "8978663887:AAFf327Y2ybZNLMgmFeyT7IbByZOc6pK3dE";
const DEFAULT_CHAT = "999068403";

// Load settings from storage
if (typeof chrome !== "undefined" && chrome.storage?.local) {
  chrome.storage.local.get(["tg_bot_token", "tg_chat_id", "tg_enabled", "tg_msg_mode"], (data) => {
    inpToken.value = data.tg_bot_token || DEFAULT_TOKEN;
    inpChat.value = data.tg_chat_id || DEFAULT_CHAT;
    if (typeof data.tg_enabled !== "undefined") chkEnabled.checked = data.tg_enabled;

    const mode = data.tg_msg_mode || "letter";
    const radio = document.querySelector(`input[name="msg-mode"][value="${mode}"]`);
    if (radio) radio.checked = true;

    const hasConfig = Boolean(inpToken.value && inpChat.value);
    updateStatusBadge(hasConfig, chkEnabled.checked);
  });
} else {
  inpToken.value = DEFAULT_TOKEN;
  inpChat.value = DEFAULT_CHAT;
  updateStatusBadge(true, true);
}

function showFeedback(text, isSuccess) {
  tgFeedback.innerText = text;
  tgFeedback.className = "status-msg " + (isSuccess ? "success" : "error");
  setTimeout(() => {
    tgFeedback.style.display = "none";
  }, 4000);
}

btnSaveTg.addEventListener("click", () => {
  const token = inpToken.value.trim();
  const chatId = inpChat.value.trim();
  const enabled = chkEnabled.checked;
  const mode = document.querySelector('input[name="msg-mode"]:checked')?.value || "letter";

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.set({
      tg_bot_token: token,
      tg_chat_id: chatId,
      tg_enabled: enabled,
      tg_msg_mode: mode
    }, () => {
      showFeedback("Sozlamalar muvaffaqiyatli saqlandi! ✅", true);
      updateStatusBadge(Boolean(token && chatId), enabled);
    });
  }
});

btnTestTg.addEventListener("click", () => {
  const token = inpToken.value.trim();
  const chatId = inpChat.value.trim();

  if (!token || !chatId) {
    showFeedback("Iltimos, Bot Token va Chat ID ni kiriting!", false);
    return;
  }

  showFeedback("Xabar yuborilmoqda...", true);

  const testMsg = "🤖 <b>AI Test Solver:</b> Telegram bot muvaffaqiyatli ulandi! Alt+Z bosilganda to'g'ri javoblar shu yerga yuboriladi.";

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: testMsg,
      parse_mode: "HTML"
    })
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        showFeedback("Test xabar Telegramga yuborildi! ✅", true);
        updateStatusBadge(true, true);
      } else {
        showFeedback(`Telegram xatosi: ${res.description}`, false);
      }
    })
    .catch(err => {
      showFeedback(`Ulanish xatosi: ${err.message}`, false);
    });
});

// ----------------------------------------------------
// DATABASE SEARCH LOGIC
// ----------------------------------------------------
const searchInput = document.getElementById("search-input");
const resultsBox = document.getElementById("results-box");
const resultsCount = document.getElementById("results-count");
const badgeCount = document.getElementById("badge-count");

const db = (typeof window.__SAVOL_DB !== "undefined" && Array.isArray(window.__SAVOL_DB))
  ? window.__SAVOL_DB
  : ((typeof TESTS_DB !== "undefined" && Array.isArray(TESTS_DB)) ? TESTS_DB : []);

if (badgeCount && db.length > 0) {
  badgeCount.innerText = `${db.length.toLocaleString()} ta savol`;
}

if (searchInput && resultsBox) {
  let debounceTimer = null;

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 150);
  });

  function performSearch() {
    const rawVal = searchInput.value.trim();
    if (!rawVal || rawVal.length < 2) {
      resultsBox.innerHTML = '<div class="empty-hint">Savol yoki kalit so\'z kiriting...</div>';
      resultsCount.innerText = "";
      return;
    }

    const normVal = normalizeQuery(rawVal);
    const words = normVal.split(" ").filter(w => w.length > 1);

    if (words.length === 0) return;

    const matches = [];

    for (let i = 0; i < db.length; i++) {
      const item = db[i];
      const normQ = normalizeQuery(item.q);
      const normA = normalizeQuery(item.a);

      let matchedWords = 0;
      for (const w of words) {
        if (normQ.includes(w) || normA.includes(w)) {
          matchedWords++;
        }
      }

      if (matchedWords === words.length) {
        matches.push(item);
        if (matches.length >= 20) break;
      }
    }

    resultsCount.innerText = matches.length > 0 ? `${matches.length} ta` : "";

    if (matches.length === 0) {
      resultsBox.innerHTML = '<div class="empty-hint">Hech qanday savol topilmadi</div>';
      return;
    }

    resultsBox.innerHTML = "";
    matches.forEach(m => {
      const itemEl = document.createElement("div");
      itemEl.className = "result-item";
      itemEl.title = "Nusxa olish uchun bosing";

      const modEl = document.createElement("div");
      modEl.className = "result-mod";
      modEl.innerText = `[${m.mod || m.f || "Fan"}]`;

      const qEl = document.createElement("div");
      qEl.className = "result-q";
      qEl.innerText = m.q;

      const aEl = document.createElement("div");
      aEl.className = "result-a";
      aEl.innerText = `✅ ${m.a}`;

      itemEl.appendChild(modEl);
      itemEl.appendChild(qEl);
      itemEl.appendChild(aEl);

      itemEl.addEventListener("click", () => {
        navigator.clipboard.writeText(m.a).then(() => {
          const origText = aEl.innerText;
          aEl.innerText = `📋 Nusxalandi!`;
          setTimeout(() => {
            aEl.innerText = origText;
          }, 1200);
        });
      });

      resultsBox.appendChild(itemEl);
    });
  }
}
