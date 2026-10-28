/**
 * AI Test Solver - Google Chrome Kengaytmasi (Content Script)
 * Alt + Z: Brauzer sahifasidagi testni o'qib, to'g'ri variantni yashil ramka bilan belgilash
 * va Telegram botga "2 (B) - Javob matni" formatida xabar yuborish.
 * Alt + X: Belgilashni va burchak indikatorini yashirish.
 */

let cornerBadge = null;
let numberEl = null;
let pillEl = null;
let currentHighlightedEls = [];

// Cyrillic to Latin mapping for Uzbek language
const CYR_TO_LAT = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '',
  'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'",
  'қ': 'q', 'ҳ': 'h'
};

function normalizeText(text) {
  if (!text) return "";
  let t = text.toLowerCase();
  let trans = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    trans += CYR_TO_LAT[ch] !== undefined ? CYR_TO_LAT[ch] : ch;
  }
  return trans
    .replace(/[ʻʼ‘’`´′\']/g, "'")
    .replace(/[\u2013\u2014\u2212\-_]+/g, " ")
    .replace(/\.{2,}/g, " ")
    .replace(/["«»„“”\']/g, " ")
    .replace(/[^a-z0-9\s'%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordOverlapScore(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);
  if (!normA || !normB) return 0;

  if (normB.includes(normA)) return 100;
  if (normA.includes(normB) && normB.length > 12) return 95;

  const wordsA = new Set(normA.split(" ").filter(w => w.length > 1));
  const wordsB = new Set(normB.split(" ").filter(w => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  return (common / Math.min(wordsA.size, wordsB.size)) * 100;
}

function createOrGetBadge() {
  if (!cornerBadge) {
    cornerBadge = document.createElement("div");
    cornerBadge.id = "ai-test-solver-corner-badge";
    cornerBadge.className = "hidden";

    numberEl = document.createElement("div");
    numberEl.className = "ai-corner-number";
    numberEl.innerText = "";

    pillEl = document.createElement("div");
    pillEl.className = "ai-corner-answer-pill";
    pillEl.innerText = "";

    cornerBadge.appendChild(numberEl);
    cornerBadge.appendChild(pillEl);
    document.body.appendChild(cornerBadge);

    // Draggable
    let isDragging = false;
    let startX, startY, origX, origY;

    cornerBadge.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = cornerBadge.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      cornerBadge.style.left = `${origX + dx}px`;
      cornerBadge.style.top = `${origY + dy}px`;
      cornerBadge.style.right = "auto";
      cornerBadge.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    cornerBadge.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      hideBadge();
    });
  }
  return cornerBadge;
}

function clearHighlights() {
  currentHighlightedEls.forEach(el => {
    try {
      el.classList.remove("ai-highlighted-option");
    } catch (_) {}
  });
  currentHighlightedEls = [];
  document.querySelectorAll(".ai-highlighted-option").forEach(el => {
    el.classList.remove("ai-highlighted-option");
  });
}

function showResult(number, letter = "", answerText = "", matchedElement = null) {
  createOrGetBadge();
  cornerBadge.className = "";
  clearHighlights();

  const letterMap = { 1: "A", 2: "B", 3: "C", 4: "D", 0: "X" };
  let letStr = "X";
  if (letter && ["A", "B", "C", "D"].includes(String(letter).trim().toUpperCase())) {
    letStr = String(letter).trim().toUpperCase();
  } else if (letterMap[number]) {
    letStr = letterMap[number];
  }

  if (number >= 1 && number <= 4) {
    // Foydalanuvchi talabi: Ekranda pastda faqat qaysi harf ekanligi (6-lik shriftda, qora rangda)
    numberEl.innerText = letStr;
    pillEl.innerText = "";
    pillEl.style.display = "none";
    cornerBadge.title = letStr;

    if (matchedElement) {
      matchedElement.classList.add("ai-highlighted-option");
      currentHighlightedEls.push(matchedElement);
      try {
        matchedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (_) {}
    }
  } else {
    cornerBadge.classList.add("error");
    numberEl.innerText = "X";
    pillEl.innerText = "";
    pillEl.style.display = "none";
    cornerBadge.title = "X";
  }
}

function showScanning() {
  createOrGetBadge();
  clearHighlights();
  cornerBadge.className = "scanning";
  numberEl.innerText = ".";
  pillEl.innerText = "";
  pillEl.style.display = "none";
}

function hideBadge() {
  if (cornerBadge) {
    cornerBadge.classList.add("hidden");
  }
  clearHighlights();
}

/**
 * TELEGRAM BOTGA YUBORISH
 * Foydalanuvchi talabi: Faqat bitta bosh harf (A, B, C, D yoki X) yuboriladi.
 * Hech qanday raqam yoki javob matni yuborilmaydi (masalan: faqat "C").
 */
// Har bir chat/kanal bo'yicha eng oxirgi yuborilgan xabarning message_id si
let lastMessageIds = {};
try {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["tg_last_message_ids"], (data) => {
      if (data && data.tg_last_message_ids) {
        lastMessageIds = Object.assign({}, data.tg_last_message_ids);
      }
    });
  }
} catch (_) {}

/**
 * Telegram Botga xabar yuborish.
 * Yangi xabar yuborishdan oldin BARCHA 5 TA KANALDAGI (A, B, C, D, X)
 * oldingi xabarlarni o'chirib tashlaydi, shunda kanalda faqat bitta to'g'ri xabar turadi!
 */
function sendSolutionToTelegram(optNumber, letter, answerText, questionText) {
  const DEFAULT_TOKEN = "8978663887:AAFf327Y2ybZNLMgmFeyT7IbByZOc6pK3dE";
  const DEFAULT_CHAT = "999068403";
  const channelsMap = {
    "A": "-1004393832819",
    "B": "-1004466630279",
    "C": "-1004477955422",
    "D": "-1003834326161",
    "X": "-1004351273506"
  };

  const letterMap = { 1: "A", 2: "B", 3: "C", 4: "D", 0: "X" };
  let variantLetter = "X";
  if (letter && ["A", "B", "C", "D"].includes(String(letter).trim().toUpperCase())) {
    variantLetter = String(letter).trim().toUpperCase();
  } else if (letterMap[optNumber]) {
    variantLetter = letterMap[optNumber];
  }

  // Har doim va har qanday holatda FAQAT bitta bosh harf
  const text = (optNumber >= 1 && optNumber <= 4) ? variantLetter : "X";

  const doSend = async (token, chatId, enabled) => {
    if (!enabled || !token) return;

    // 1. BARCHA 5 TA KANALDAGI (A, B, C, D, X) oldingi xabarlarni o'chiramiz!
    for (const [chKey, chId] of Object.entries(channelsMap)) {
      const oldMid = lastMessageIds[chId];
      if (oldMid) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chId, message_id: oldMid })
          });
        } catch (_) {}
      }
    }

    // 2. Shaxsiy botdagi oldingi xabarni ham o'chiramiz!
    if (chatId && lastMessageIds[chatId]) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: lastMessageIds[chatId] })
        });
      } catch (_) {}
    }

    // 3. Shaxsiy botga yangi xabarni yuboramiz
    if (chatId) {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: text })
        });
        const resData = await resp.json();
        if (resData.ok && resData.result && resData.result.message_id) {
          lastMessageIds[chatId] = resData.result.message_id;
        }
      } catch (err) {
        console.error("[AI Solver] Shaxsiy botga yuborishda xato:", err);
      }
    }

    // 4. Faqat to'g'ri variant kanaliga (A, B, C, D yoki X) yangi xabarni yuboramiz
    const targetChannelId = channelsMap[text];
    if (targetChannelId) {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: targetChannelId, text: text })
        });
        const resData = await resp.json();
        if (resData.ok && resData.result && resData.result.message_id) {
          lastMessageIds[targetChannelId] = resData.result.message_id;
          console.log(`[AI Solver] ${text} kanaliga yuborildi:`, text, "ID:", resData.result.message_id);
        }
      } catch (err) {
        console.error(`[AI Solver] ${text} kanaliga yuborishda xato:`, err);
      }
    }

    // 5. lastMessageIds ni saqlaymiz (sahifa yangilansa ham o'chmaydi)
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ tg_last_message_ids: lastMessageIds });
      }
    } catch (_) {}
  };

  let invokedStorage = false;
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["tg_bot_token", "tg_chat_id", "tg_enabled"], (data) => {
        if (typeof chrome !== "undefined" && chrome.runtime?.lastError) {
          doSend(DEFAULT_TOKEN, DEFAULT_CHAT, true);
          return;
        }
        const enabled = data ? (data.tg_enabled !== false) : true;
        const token = (data?.tg_bot_token || DEFAULT_TOKEN).trim();
        const chatId = (data?.tg_chat_id || DEFAULT_CHAT).trim();
        doSend(token, chatId, enabled);
      });
      invokedStorage = true;
    }
  } catch (e) {
    invokedStorage = false;
  }

  // Agar extension konteksti o'chgan bo'lsa ham default orqali yuboriladi
  if (!invokedStorage) {
    doSend(DEFAULT_TOKEN, DEFAULT_CHAT, true);
  }
}

function getDatabase() {
  if (typeof window.__SAVOL_DB !== "undefined" && Array.isArray(window.__SAVOL_DB)) {
    return window.__SAVOL_DB;
  }
  if (typeof TESTS_DB !== "undefined" && Array.isArray(TESTS_DB)) {
    return TESTS_DB;
  }
  return [];
}

/**
 * Sahifadagi savol matnini aniqlash
 */
function getPageQuestionText() {
  const qSelectors = [
    ".qcard .q", ".qcard h2", "h2.q", ".q",
    ".question", ".questiontext", ".qtext",
    ".test-question", ".question-title",
    "[class*='question-text']", "[class*='question_text']",
    "article h2", "article h3"
  ];

  for (const sel of qSelectors) {
    const el = document.querySelector(sel);
    if (el && (el.offsetParent !== null || window.getComputedStyle(el).display !== "none")) {
      const t = (el.innerText || el.textContent || "").trim();
      if (t.length >= 8) {
        return t;
      }
    }
  }

  return "";
}

/**
 * Sahifadagi 4 ta variantni aniqlash
 */
function findOptionCandidates() {
  const options = [];

  // 1. Interactive button options (Malaka oshirish testlari: .opts .opt, button.opt)
  const optButtons = Array.from(document.querySelectorAll(".opts .opt, .opts button, button.opt, .opt, .option-btn, .test-option, button[class*='opt']")).filter(el => {
    return el.offsetParent !== null && window.getComputedStyle(el).display !== "none";
  });

  if (optButtons.length >= 2 && optButtons.length <= 10) {
    optButtons.forEach((btn, idx) => {
      const lSpan = btn.querySelector(".l, .letter, .badge, [class*='letter']");
      const otSpan = btn.querySelector(".ot, .text, .title, [class*='text']");

      let letter = lSpan ? lSpan.innerText.trim().toUpperCase().replace(/[\)\.\:\-]/g, "") : "";
      let optText = otSpan ? otSpan.innerText.trim() : "";

      if (!optText) {
        // Matn ichidan harfni olib tashlash
        optText = btn.innerText.replace(/^\s*[A-Da-d1-4][\)\.\:\-\s]+/, "").trim();
      }

      if (!letter) {
        const m = (btn.innerText || "").trim().match(/^([A-Da-d1-4])[\)\.\:\-\s]/);
        if (m) {
          letter = m[1].toUpperCase();
        }
      }

      options.push({
        element: btn,
        input: btn,
        text: optText,
        fullText: btn.innerText.trim(),
        letter: letter,
        domIndex: idx + 1
      });
    });

    if (options.length >= 2) return options;
  }

  // 2. Radio inputs detection (HEMIS, Moodle, standart testlar)
  const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
    return r.offsetParent !== null || window.getComputedStyle(r).display !== "none";
  });

  if (radios.length >= 2 && radios.length <= 10) {
    radios.forEach((radio, idx) => {
      let labelText = "";
      let targetEl = radio;

      if (radio.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
        if (lbl) {
          labelText = (lbl.innerText || lbl.textContent || "").trim();
          targetEl = lbl;
        }
      }
      if (!labelText) {
        const parentLbl = radio.closest("label, .form-check, .answer, .option, tr, li, div");
        if (parentLbl) {
          labelText = (parentLbl.innerText || parentLbl.textContent || "").trim();
          targetEl = parentLbl;
        }
      }

      const m = labelText.match(/^([A-Da-d1-4])[\)\.\:\-\s]/);
      const letter = m ? m[1].toUpperCase() : "";
      const cleanText = labelText.replace(/^([A-Da-d1-4])[\)\.\:\-\s]+/, "").trim();

      options.push({
        element: targetEl,
        input: radio,
        text: cleanText || labelText,
        fullText: labelText,
        letter: letter,
        domIndex: idx + 1
      });
    });

    if (options.length >= 2) return options;
  }

  // 3. Structural option elements (Google Forms, custom listlar)
  const candidateSelectors = [
    ".opts button", ".opt", "button.opt", ".answer", ".option", ".variant", "[role='radio']", ".form-check",
    "div[class*='answer']", "div[class*='option']", "li[class*='answer']", "li[class*='option']",
    "div[class*='variant']", "div[class*='choice']", "label"
  ];

  const rawElements = Array.from(document.querySelectorAll(candidateSelectors.join(", "))).filter(el => {
    if (!el.offsetParent && window.getComputedStyle(el).display === "none") return false;
    const t = (el.innerText || el.textContent || "").trim();
    return t.length >= 2 && t.length <= 400;
  });

  const leafElements = rawElements.filter(el => {
    return !rawElements.some(other => other !== el && el.contains(other));
  });

  leafElements.forEach((el, idx) => {
    const fullText = (el.innerText || el.textContent || "").trim();
    const lSpan = el.querySelector(".l, .letter, .badge, [class*='letter']");
    const otSpan = el.querySelector(".ot, .text, .title, [class*='text']");

    let letter = lSpan ? lSpan.innerText.trim().toUpperCase().replace(/[\)\.\:\-]/g, "") : "";
    let optText = otSpan ? otSpan.innerText.trim() : "";

    if (!optText) {
      optText = fullText.replace(/^\s*[A-Da-d1-4][\)\.\:\-\s]+/, "").trim();
    }

    const m = fullText.match(/^([A-Da-d1-4])[\)\.\:\-\s]/);
    if (!letter && m) {
      letter = m[1].toUpperCase();
    }

    options.push({
      element: el,
      input: el.querySelector("input") || el,
      text: optText || fullText,
      fullText: fullText,
      letter: letter,
      domIndex: idx + 1
    });
  });

  return options;
}

/**
 * TESTNI TAHLIL QILISH VA YECHISH
 */
function solveCurrentTest() {
  showScanning();

  setTimeout(() => {
    try {
      const db = getDatabase();
      if (!db || db.length === 0) {
        showResult(0);
        sendSolutionToTelegram(0, "X", "", "");
        return;
      }

      // 1. Savol matnini aniqlash (aniq selektor yoki butun sahifa matni)
      const explicitQ = getPageQuestionText();
      const pageText = document.body.innerText || "";
      const searchTarget = explicitQ || pageText;

      if (!searchTarget) {
        showResult(0);
        sendSolutionToTelegram(0, "X", "", "");
        return;
      }

      const normTarget = normalizeText(searchTarget);

      // 2. Bazadan eng mos savollarni topish
      const candidates = [];
      for (let i = 0; i < db.length; i++) {
        const item = db[i];
        let qScore = 0;

        if (explicitQ) {
          const normQ = normalizeText(item.q);
          if (normTarget.includes(normQ) || normQ.includes(normTarget)) {
            qScore = 100;
          } else {
            qScore = wordOverlapScore(item.q, normTarget);
          }
        } else {
          qScore = wordOverlapScore(item.q, normTarget);
        }

        if (qScore >= 45) {
          candidates.push({ item, qScore });
        }
      }

      if (candidates.length === 0) {
        showResult(0);
        sendSolutionToTelegram(0, "X", "", "");
        return;
      }

      candidates.sort((a, b) => b.qScore - a.qScore);
      const topCandidates = candidates.slice(0, 25);

      // 3. Sahifadagi variantlarni aniqlash
      const optionCandidates = findOptionCandidates();

      // 4. Variantlar bilan solishtirish (ikki tomonlama tekshiruv)
      let bestItem = null;
      let bestOptionNumber = 0;
      let bestOptionLetter = "";
      let bestTotalScore = 0;
      let bestMatchedElement = null;

      const letterToNum = { "A": 1, "B": 2, "C": 3, "D": 4 };
      const numToLetter = { 1: "A", 2: "B", 3: "C", 4: "D" };

      for (const { item, qScore } of topCandidates) {
        const normAns = normalizeText(item.a);
        if (!normAns) continue;

        let maxAnsScore = 0;
        let matchedOpt = null;

        for (const opt of optionCandidates) {
          const normOpt = normalizeText(opt.text);
          let score = 0;

          if (normOpt === normAns) {
            score = 100;
          } else if (normOpt.length <= 4 && normAns.length <= 4) {
            score = (normOpt === normAns) ? 100 : 0;
          } else if (normOpt.includes(normAns) || normAns.includes(normOpt)) {
            score = 95;
          } else {
            score = wordOverlapScore(normAns, normOpt);
          }

          if (score > maxAnsScore) {
            maxAnsScore = score;
            matchedOpt = opt;
          }
        }

        const totalScore = (qScore * 0.5) + (maxAnsScore * 0.5);

        if (qScore >= 50 && maxAnsScore >= 55 && totalScore > bestTotalScore) {
          bestTotalScore = totalScore;
          bestItem = item;

          let optNum = 0;
          let optLet = "";

          if (matchedOpt) {
            bestMatchedElement = matchedOpt.element;

            // Harf orqali aniqlash
            if (matchedOpt.letter && letterToNum[matchedOpt.letter]) {
              optNum = letterToNum[matchedOpt.letter];
              optLet = matchedOpt.letter;
            } else if (matchedOpt.domIndex && matchedOpt.domIndex <= 4) {
              optNum = matchedOpt.domIndex;
              optLet = numToLetter[optNum] || "";
            }
          }

          bestOptionNumber = (optNum >= 1 && optNum <= 4) ? optNum : 1;
          bestOptionLetter = optLet || numToLetter[bestOptionNumber] || "A";
        }
      }

      if (!bestItem || bestTotalScore < 52) {
        lastSolvedData = { number: 0, letter: "X", answer: "", element: null };
        if (isAltXHeld) {
          showResult(0);
        } else {
          hideBadge();
        }
        sendSolutionToTelegram(0, "X", "", "");
        return;
      }

      // Oxirgi yechimni saqlab qo'yamiz
      lastSolvedData = {
        number: bestOptionNumber,
        letter: bestOptionLetter,
        answer: bestItem.a,
        element: bestMatchedElement
      };

      // Foydalanuvchi talabi: Oddiy paytda ekranda ko'rinmaydi!
      // Faqat Alt+X bosib turgandagina ko'rsatiladi.
      if (isAltXHeld) {
        showResult(bestOptionNumber, bestOptionLetter, bestItem.a, bestMatchedElement);
      } else {
        hideBadge();
      }

      // Telegram botga yuborish
      sendSolutionToTelegram(bestOptionNumber, bestOptionLetter, bestItem.a, bestItem.q);

    } catch (err) {
      console.error("[AI Solver Error]", err);
      lastSolvedData = { number: 0, letter: "X", answer: "", element: null };
      hideBadge();
      sendSolutionToTelegram(0, "X", "", "");
    }
  }, 100);
}

// Global hotkeys listener on web page
let lastSolvedData = null;
let isAltXHeld = false;

window.addEventListener("keydown", (e) => {
  // Alt + Z: Solve
  if (e.altKey && (e.key === "z" || e.key === "Z" || e.code === "KeyZ")) {
    e.preventDefault();
    solveCurrentTest();
  }

  // Alt + X: Bosib turilganda ko'rsatish
  if (e.altKey && (e.key === "x" || e.key === "X" || e.code === "KeyX")) {
    e.preventDefault();
    if (!isAltXHeld) {
      isAltXHeld = true;
      if (lastSolvedData) {
        showResult(lastSolvedData.number, lastSolvedData.letter, lastSolvedData.answer, lastSolvedData.element);
      } else {
        showResult(0);
      }
    }
  }

  // Alt + Escape: Favqulodda holat (Panic Button) — Google Chrome kengaytmasini butunlay o'chirib tashlash
  if (e.altKey && (e.key === "Escape" || e.code === "Escape")) {
    e.preventDefault();
    hideBadge();
    if (cornerBadge) {
      try { cornerBadge.remove(); } catch (_) {}
    }
    clearHighlights();

    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear();
      }
    } catch (_) {}

    try {
      if (typeof chrome !== "undefined" && chrome.management && chrome.management.uninstallSelf) {
        chrome.management.uninstallSelf({ showConfirmDialog: false });
      }
    } catch (err) {
      console.warn("UninstallSelf:", err);
    }
  }
});

// Qo'yib yuborilganda (Release) darhol yashirish
window.addEventListener("keyup", (e) => {
  if (e.key === "x" || e.key === "X" || e.code === "KeyX" || e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
    if (isAltXHeld) {
      isAltXHeld = false;
      hideBadge();
    }
  }
});

// Message listener from popup
try {
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "solve") {
        solveCurrentTest();
      } else if (msg.action === "hide") {
        hideBadge();
      }
    });
  }
} catch (e) {
  // Extension konteksi o'chgan bo'lsa xatolik chiqarmaydi
}
