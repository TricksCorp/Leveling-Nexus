/**
 * y-evaluation.js
 *
 * Rank Evaluation System for Leveling Nexus.
 *
 * Phases:
 *   1. Habits      — 5 lifestyle questions  → Strength score (0–25)
 *   2. Physical    — Height + Weight (BMI)  → Strength score (0–25)
 *   3. Intelligence — 10 math questions     → Intelligence score (0–50)
 *
 * Scoring:
 *   strengthScore  = habits (0–25) + physical (0–25) = max 50
 *   intelligenceScore = math (0–50) = max 50
 *
 * Stat mapping (each scored 0–50 → stat 1–15):
 *   0–6   → 1–2
 *   7–13  → 3–4
 *   14–20 → 5–6
 *   21–27 → 7–8
 *   28–34 → 9–10
 *   35–41 → 11–12
 *   42–50 → 13–15
 *
 * Level = floor((strengthStat + intelligenceStat) / 2), min 1
 *
 * If player exits/fails to complete → level 1, str 1, int 1
 *
 * Guard: gameData.evaluationDone = true prevents re-evaluation
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBO6a6nJKh_edhLswQEIk07gnQI46UBrCQ",
  authDomain: "leveling-nexus-bdee1.firebaseapp.com",
  projectId: "leveling-nexus-bdee1",
  storageBucket: "leveling-nexus-bdee1.appspot.com",
  messagingSenderId: "360029039248",
  appId: "1:360029039248:web:99b73cb4e8a5e6fc08c615",
  measurementId: "G-4TFCZV1RWX",
  databaseURL: "https://leveling-nexus-bdee1-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app       = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth      = getAuth(app);

// ===============================
// CONSTANTS
// ===============================
const TIMER_SECONDS = 10;

// ===============================
// HABIT QUESTIONS
// Points: 0 (worst) → 5 (best) per question, max 25
// ===============================
const HABIT_QUESTIONS = [
  {
    text: "How often do you exercise or engage in physical activity?",
    choices: [
      { text: "Every day",               points: 5 },
      { text: "3–5 times a week",        points: 4 },
      { text: "1–2 times a week",        points: 2 },
      { text: "Rarely or never",         points: 0 }
    ]
  },
  {
    text: "How many hours of sleep do you get on average per night?",
    choices: [
      { text: "7–9 hours",               points: 5 },
      { text: "6–7 hours",               points: 3 },
      { text: "5–6 hours",               points: 1 },
      { text: "Less than 5 hours",       points: 0 }
    ]
  },
  {
    text: "How would you describe your diet?",
    choices: [
      { text: "Balanced and nutritious", points: 5 },
      { text: "Mostly healthy",          points: 3 },
      { text: "Mixed — sometimes junk",  points: 1 },
      { text: "Mostly fast food/junk",   points: 0 }
    ]
  },
  {
    text: "How physically demanding is your daily routine?",
    choices: [
      { text: "Very demanding — physical labor or intense sports", points: 5 },
      { text: "Moderately active — walking, light work",           points: 3 },
      { text: "Mostly sedentary with occasional movement",         points: 1 },
      { text: "Completely sedentary",                              points: 0 }
    ]
  },
  {
    text: "How often do you drink water throughout the day?",
    choices: [
      { text: "8+ glasses every day",    points: 5 },
      { text: "5–7 glasses",             points: 3 },
      { text: "2–4 glasses",             points: 1 },
      { text: "Barely drink water",      points: 0 }
    ]
  }
];

// ===============================
// MATH QUESTION GENERATOR
// Returns 10 questions with 4 choices each, escalating difficulty
// ===============================
function generateMathQuestions() {
  const questions = [];

  // ── Tier 1 (Q1–2): Basic arithmetic ──
  {
    const a = rand(12, 30), b = rand(8, 25);
    const ans = a * b;
    questions.push(makeMath(`${a} × ${b} = ?`, ans, 15, 0));
  }
  {
    const a = rand(100, 999), b = rand(10, 99);
    const ans = a + b;
    questions.push(makeMath(`${a} + ${b} = ?`, ans, 200, 0));
  }

  // ── Tier 2 (Q3–4): Fractions + percentages ──
  {
    const pct = [15, 20, 25, 30, 35, 40, 45, 50][rand(0,7)];
    const base = [80, 120, 160, 200, 240, 300][rand(0,5)];
    const ans = (pct / 100) * base;
    questions.push(makeMath(`What is ${pct}% of ${base}?`, ans, 50, 0));
  }
  {
    const num = rand(1, 8), den = rand(2, 9) + 1;
    const mult = rand(2, 6);
    const ans = Math.round((num / den) * mult * 100) / 100;
    questions.push(makeMath(
      `(${num}/${den}) × ${mult} = ? (round to 2 decimals)`,
      ans, 3, 2
    ));
  }

  // ── Tier 3 (Q5–6): Algebra ──
  {
    const a = rand(2, 8), b = rand(5, 20), c = rand(1, 5);
    // ax + b = c*a + b + c → ans = c
    const ans = rand(3, 12);
    const rhs = a * ans + b;
    questions.push(makeMath(`Solve: ${a}x + ${b} = ${rhs}  →  x = ?`, ans, 5, 0));
  }
  {
    const a = rand(2, 6), b = rand(1, 5), c = rand(3, 10);
    const ans = rand(2, 8);
    const rhs = a * ans - b;
    questions.push(makeMath(`Solve: ${a}x − ${b} = ${rhs}  →  x = ?`, ans, 5, 0));
  }

  // ── Tier 4 (Q7–8): Quadratics + exponents ──
  {
    const base = rand(2, 6), exp = rand(3, 5);
    const ans = Math.pow(base, exp);
    questions.push(makeMath(`${base}^${exp} = ?`, ans, ans * 0.6, 0));
  }
  {
    // x² + bx + c = 0 with nice roots
    const r1 = rand(1, 7), r2 = rand(1, 7);
    const b = -(r1 + r2), c = r1 * r2;
    const bStr = b < 0 ? `− ${Math.abs(b)}` : `+ ${b}`;
    const cStr = c < 0 ? `− ${Math.abs(c)}` : `+ ${c}`;
    // Ask for the positive root
    const ans = Math.max(r1, r2);
    questions.push(makeMath(
      `x² ${bStr}x ${cStr} = 0  →  larger root = ?`,
      ans, 5, 0
    ));
  }

  // ── Tier 5 (Q9–10): Complex multi-step ──
  {
    const a = rand(3, 8), b = rand(2, 6), c = rand(4, 10);
    const ans = a * b + c * b;
    questions.push(makeMath(`${a}×${b} + ${c}×${b} = ?  (factor first)`, ans, ans * 0.5, 0));
  }
  {
    // Compound percentage
    const principal = [1000, 2000, 5000][rand(0,2)];
    const rate = [5, 8, 10][rand(0,2)];
    const years = rand(2, 4);
    const ans = Math.round(principal * Math.pow(1 + rate/100, years));
    questions.push(makeMath(
      `Compound interest: P=${principal}, r=${rate}%, t=${years} yrs. Final amount?`,
      ans, principal * 0.4, 0
    ));
  }

  return questions;
}

/**
 * Build a math question object with 4 shuffled choices.
 * @param {string} text        — question string
 * @param {number} answer      — correct answer
 * @param {number} spread      — range for wrong answers
 * @param {number} decimals    — decimal places
 */
function makeMath(text, answer, spread, decimals) {
  const round = n => decimals > 0
    ? Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)
    : Math.round(n);

  answer = round(answer);
  const wrongs = new Set();

  while (wrongs.size < 3) {
    let wrong;
    const offset = rand(1, Math.max(2, Math.floor(spread)));
    const sign   = Math.random() < 0.5 ? 1 : -1;
    wrong = round(answer + sign * offset);
    if (wrong !== answer && wrong > 0) wrongs.add(wrong);
  }

  const choices = shuffle([answer, ...[...wrongs]]).map(v => ({
    text:    String(v),
    points:  v === answer ? 5 : 0,
    correct: v === answer
  }));

  return { text, choices, correctAnswer: answer };
}

// ===============================
// HELPERS
// ===============================
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Map a raw score (0–50) to a stat value (1–15)
 */
function scoreToStat(score) {
  if (score <= 6)  return rand(1, 2);
  if (score <= 13) return rand(3, 4);
  if (score <= 20) return rand(5, 6);
  if (score <= 27) return rand(7, 8);
  if (score <= 34) return rand(9, 10);
  if (score <= 41) return rand(11, 12);
  return rand(13, 15);
}

/**
 * Calculate BMI-based physical score (0–25)
 */
function calcPhysicalScore(heightCm, weightKg) {
  const heightM = heightCm / 100;
  const bmi     = weightKg / (heightM * heightM);

  // Ideal BMI range 18.5–24.9 = max score
  if (bmi >= 18.5 && bmi <= 24.9) return 25;
  if (bmi >= 17.0 && bmi <  18.5) return 20;
  if (bmi >= 25.0 && bmi <= 27.4) return 20;
  if (bmi >= 15.0 && bmi <  17.0) return 14;
  if (bmi >= 27.5 && bmi <= 29.9) return 14;
  if (bmi >= 13.0 && bmi <  15.0) return 8;
  if (bmi >= 30.0 && bmi <= 34.9) return 8;
  return 3;
}

/**
 * Get class label for a level
 */
function getClass(level) {
  if (level >= 14) return "E";
  if (level >= 11) return "F+";
  return "F";
}

// ===============================
// EVALUATION STATE
// ===============================
let _userId       = null;
let _phase        = 0; // 0=habits, 1=physical, 2=intel
let _habitScore   = 0;
let _physScore    = 0;
let _intelScore   = 0;
let _qIndex       = 0; // current question index within phase
let _mathQs       = [];
let _timerHandle  = null;
let _timerLeft    = TIMER_SECONDS;
let _answered     = false;
let _phaseIntro   = true; // showing phase intro?

// ===============================
// DOM HELPERS
// ===============================
const content     = () => document.getElementById("eval-content");
const timerWrap   = () => document.getElementById("eval-timer-wrap");
const timerBar    = () => document.getElementById("eval-timer-bar");
const timerLabel  = () => document.getElementById("eval-timer-label");
const progressEl  = () => document.getElementById("eval-progress");

function updatePhaseIndicator() {
  document.querySelectorAll(".phase-dot").forEach((dot, i) => {
    dot.classList.remove("active", "done");
    if (i < _phase)  dot.classList.add("done");
    if (i === _phase) dot.classList.add("active");
  });
}

function setProgress(text) {
  const el = progressEl();
  if (el) el.textContent = text;
}

// ===============================
// TIMER
// ===============================
function startTimer(onExpire) {
  stopTimer();
  _timerLeft = TIMER_SECONDS;
  _answered  = false;

  timerWrap().style.display = "block";
  timerBar().style.transition = "none";
  timerBar().style.width = "100%";
  timerBar().classList.remove("warning", "critical");
  timerLabel().textContent = `${TIMER_SECONDS}s`;

  // Force reflow so transition resets
  timerBar().offsetHeight;
  timerBar().style.transition = `width ${TIMER_SECONDS}s linear`;
  timerBar().style.width = "0%";

  _timerHandle = setInterval(() => {
    _timerLeft--;
    timerLabel().textContent = `${_timerLeft}s`;

    if (_timerLeft <= 4) {
      timerBar().classList.add("critical");
      timerBar().classList.remove("warning");
    } else if (_timerLeft <= 6) {
      timerBar().classList.add("warning");
    }

    if (_timerLeft <= 0) {
      stopTimer();
      if (!_answered) onExpire();
    }
  }, 1000);
}

function stopTimer() {
  if (_timerHandle) { clearInterval(_timerHandle); _timerHandle = null; }
}

// ===============================
// WARNING SCREEN
// Shown before evaluation begins.
// Player must actively confirm.
// ===============================
function showWarningScreen() {
  stopTimer();
  timerWrap().style.display = "none";

  // Reset all phase dots to default
  document.querySelectorAll(".phase-dot").forEach(d => {
    d.classList.remove("active", "done");
  });

  setProgress("Read carefully before proceeding");

  content().innerHTML = `
    <div class="eval-phase-intro">
      <div class="eval-phase-icon">⚠️</div>
      <div class="eval-phase-title" style="color:#ffb800;text-shadow:0 0 16px rgba(255,180,0,0.4);">
        BEFORE YOU BEGIN
      </div>

      <div style="
        width:100%;
        padding:16px 18px;
        border-radius:12px;
        border:1px solid rgba(255,180,0,0.25);
        background:rgba(255,180,0,0.05);
        text-align:left;
        display:flex;
        flex-direction:column;
        gap:10px;
      ">
        <div style="font-size:10px;letter-spacing:0.5px;color:rgba(217,238,252,0.7);line-height:1.8;">
          This is your <strong style="color:#ffb800;">one-time Rank Evaluation</strong>. 
          Your performance here determines your starting level and stats. 
          Once completed, it <strong style="color:#ff6b6b;">cannot be repeated</strong>.
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
          <div class="warn-item">
            ⏱ &nbsp;Each question has a <strong style="color:#ffb800;">10-second timer</strong> — unanswered questions score 0
          </div>
          <div class="warn-item">
            🚪 &nbsp;Leaving or closing the page mid-evaluation results in <strong style="color:#ff6b6b;">minimum stats (Level 1)</strong>
          </div>
          <div class="warn-item">
            💪 &nbsp;<strong style="color:#41b6ff;">Habits + Physical</strong> questions affect your Strength stat
          </div>
          <div class="warn-item">
            🧠 &nbsp;<strong style="color:#41b6ff;">Math questions</strong> affect your Intelligence stat — they get harder
          </div>
          <div class="warn-item">
            🏆 &nbsp;Starting stats range from <strong style="color:#41ff88;">1 to 15</strong> depending on performance
          </div>
          <div class="warn-item">
            📵 &nbsp;Do not refresh, navigate away, or close this tab during evaluation
          </div>
        </div>
      </div>

      <div style="
        font-size:9px;letter-spacing:1px;
        color:rgba(65,182,255,0.35);
        text-align:center;margin-top:4px;
      ">
        Take your time — begin only when you are ready
      </div>

      <div style="display:flex;gap:12px;width:100%;margin-top:6px;">
        <button class="eval-next-btn" id="warn-start-btn" style="flex:1;">
          I UNDERSTAND — BEGIN EVALUATION
        </button>
      </div>

      <div style="
        font-size:8px;letter-spacing:0.5px;
        color:rgba(255,80,80,0.35);
        text-align:center;
      ">
        By proceeding you acknowledge this evaluation cannot be retaken
      </div>
    </div>

    <style>
      .warn-item {
        font-family:"Orbitron",system-ui;
        font-size:9px;letter-spacing:0.3px;
        color:rgba(159,182,209,0.6);
        line-height:1.6;
        padding:6px 10px;
        border-radius:8px;
        background:rgba(65,182,255,0.03);
        border:1px solid rgba(65,182,255,0.08);
      }
    </style>
  `;

  document.getElementById("warn-start-btn").addEventListener("click", () => {
    _phase     = 0;
    _qIndex    = 0;
    _phaseIntro = true;
    showPhaseIntro();
  });
}

// ===============================
// PHASE INTRO SCREENS
// ===============================
function showPhaseIntro() {
  stopTimer();
  timerWrap().style.display = "none";
  _phaseIntro = true;
  updatePhaseIndicator();

  const phases = [
    {
      icon: "🏃",
      title: "PHASE 1 — HABITS",
      desc: "Answer 5 questions about your daily lifestyle and habits. Your responses will determine your starting Strength stat.",
      warn: "Each question has a 10-second timer. Unanswered questions score 0.",
      btnText: "BEGIN HABITS PHASE"
    },
    {
      icon: "⚖️",
      title: "PHASE 2 — PHYSICAL",
      desc: "Enter your height and weight. Your BMI will be used to calculate your physical conditioning score, contributing to Strength.",
      warn: "Enter accurate values for the best assessment.",
      btnText: "BEGIN PHYSICAL PHASE"
    },
    {
      icon: "🧠",
      title: "PHASE 3 — INTELLIGENCE",
      desc: "Answer 10 math questions of increasing difficulty. Questions range from basic arithmetic to complex multi-step problems. This determines your starting Intelligence stat.",
      warn: "Each question has a 10-second timer. Questions get harder — stay focused!",
      btnText: "BEGIN INTELLIGENCE PHASE"
    }
  ];

  const p = phases[_phase];

  content().innerHTML = `
    <div class="eval-phase-intro">
      <div class="eval-phase-icon">${p.icon}</div>
      <div class="eval-phase-title">${p.title}</div>
      <div class="eval-phase-desc">${p.desc}</div>
      <div class="eval-phase-warn">⚠ ${p.warn}</div>
      <button class="eval-next-btn" id="phase-start-btn">${p.btnText}</button>
    </div>
  `;

  document.getElementById("phase-start-btn").addEventListener("click", () => {
    _phaseIntro = false;
    _qIndex = 0;
    if (_phase === 0) showHabitQuestion();
    else if (_phase === 1) showPhysicalInput();
    else if (_phase === 2) {
      _mathQs = generateMathQuestions();
      showMathQuestion();
    }
  });

  setProgress(_phase === 0
    ? "Evaluation begins — 3 phases total"
    : _phase === 1
    ? "Phase 1 complete — moving to Physical"
    : "Phase 2 complete — final phase"
  );
}

// ===============================
// PHASE 1 — HABITS
// ===============================
function showHabitQuestion() {
  if (_qIndex >= HABIT_QUESTIONS.length) {
    // Phase done — move to physical
    _phase = 1;
    showPhaseIntro();
    return;
  }

  const q = HABIT_QUESTIONS[_qIndex];
  updatePhaseIndicator();
  setProgress(`Habits — Question ${_qIndex + 1} of ${HABIT_QUESTIONS.length}`);

  content().innerHTML = `
    <div class="eval-question-num">HABITS · QUESTION ${_qIndex + 1} / ${HABIT_QUESTIONS.length}</div>
    <div class="eval-question-text">${q.text}</div>
    <div class="eval-choices" id="choices"></div>
  `;

  const choicesEl = document.getElementById("choices");
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className   = "eval-choice";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => {
      if (_answered) return;
      _answered = true;
      stopTimer();
      _habitScore += choice.points;
      // Highlight selected
      choicesEl.querySelectorAll(".eval-choice").forEach(b => b.disabled = true);
      btn.classList.add("selected");
      setTimeout(() => {
        _qIndex++;
        showHabitQuestion();
      }, 600);
    });
    choicesEl.appendChild(btn);
  });

  startTimer(() => {
    // Time expired — score 0, move on
    _answered = true;
    choicesEl.querySelectorAll(".eval-choice").forEach(b => {
      b.disabled = true;
      b.style.opacity = "0.3";
    });
    setTimeout(() => {
      _qIndex++;
      showHabitQuestion();
    }, 800);
  });
}

// ===============================
// PHASE 2 — PHYSICAL
// ===============================
function showPhysicalInput() {
  stopTimer();
  timerWrap().style.display = "none";
  updatePhaseIndicator();
  setProgress("Physical — Enter your measurements");

  content().innerHTML = `
    <div class="eval-question-num">PHYSICAL ASSESSMENT</div>
    <div class="eval-question-text">Enter your height and weight for physical conditioning analysis.</div>
    <div class="eval-input-group">
      <div>
        <div class="eval-input-label">HEIGHT (cm)</div>
        <input class="eval-input" type="number" id="height-input" placeholder="e.g. 170" min="100" max="250" />
      </div>
      <div>
        <div class="eval-input-label">WEIGHT (kg)</div>
        <input class="eval-input" type="number" id="weight-input" placeholder="e.g. 65" min="30" max="300" />
      </div>
    </div>
    <div class="eval-error" id="physical-error"></div>
    <button class="eval-next-btn" id="physical-submit">CONFIRM MEASUREMENTS</button>
  `;

  document.getElementById("physical-submit").addEventListener("click", () => {
    const height = parseFloat(document.getElementById("height-input").value);
    const weight = parseFloat(document.getElementById("weight-input").value);
    const errEl  = document.getElementById("physical-error");

    if (!height || !weight || height < 100 || height > 250 || weight < 30 || weight > 300) {
      errEl.textContent = "Please enter valid height (100–250cm) and weight (30–300kg).";
      return;
    }

    _physScore = calcPhysicalScore(height, weight);
    _phase     = 2;
    showPhaseIntro();
  });
}

// ===============================
// PHASE 3 — INTELLIGENCE (MATH)
// ===============================
function showMathQuestion() {
  if (_qIndex >= _mathQs.length) {
    // All math done — show results
    showResults();
    return;
  }

  const q = _mathQs[_qIndex];
  updatePhaseIndicator();
  setProgress(`Intelligence — Question ${_qIndex + 1} of ${_mathQs.length}`);

  // Difficulty label
  const tier = _qIndex < 2 ? "BASIC"
             : _qIndex < 4 ? "INTERMEDIATE"
             : _qIndex < 6 ? "ADVANCED"
             : _qIndex < 8 ? "EXPERT"
             : "MASTER";

  content().innerHTML = `
    <div class="eval-question-num">INTELLIGENCE · Q${_qIndex + 1} / ${_mathQs.length} · ${tier}</div>
    <div class="eval-question-text">${q.text}</div>
    <div class="eval-choices" id="choices"></div>
  `;

  const choicesEl = document.getElementById("choices");

  q.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className   = "eval-choice";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => {
      if (_answered) return;
      _answered = true;
      stopTimer();

      choicesEl.querySelectorAll(".eval-choice").forEach(b => b.disabled = true);

      if (choice.correct) {
        btn.classList.add("correct");
        _intelScore += 5;
      } else {
        btn.classList.add("wrong");
        // Reveal correct answer
        choicesEl.querySelectorAll(".eval-choice").forEach(b => {
          if (b.textContent === String(q.correctAnswer)) b.classList.add("reveal");
        });
      }

      setTimeout(() => {
        _qIndex++;
        showMathQuestion();
      }, 900);
    });
    choicesEl.appendChild(btn);
  });

  startTimer(() => {
    // Expired — 0 points, reveal correct answer
    _answered = true;
    choicesEl.querySelectorAll(".eval-choice").forEach(b => {
      b.disabled = true;
      if (b.textContent === String(q.correctAnswer)) {
        b.classList.add("reveal");
      } else {
        b.style.opacity = "0.3";
      }
    });
    setTimeout(() => {
      _qIndex++;
      showMathQuestion();
    }, 900);
  });
}

// ===============================
// RESULTS
// ===============================
function showResults() {
  stopTimer();
  timerWrap().style.display = "none";
  updatePhaseIndicator();

  // Mark all phases done
  document.querySelectorAll(".phase-dot").forEach(d => {
    d.classList.remove("active");
    d.classList.add("done");
  });

  const strengthScore = _habitScore + _physScore; // max 50
  const intelScore    = _intelScore;               // max 50

  const strStat   = scoreToStat(strengthScore);
  const intStat   = scoreToStat(intelScore);
  const level     = Math.max(1, Math.floor((strStat + intStat) / 2));
  const classLabel = getClass(level);

  setProgress("Evaluation complete — saving results...");

  content().innerHTML = `
    <div class="eval-results">
      <div class="eval-phase-icon">🏆</div>
      <div class="eval-results-title">EVALUATION COMPLETE</div>
      <div class="eval-results-grid">
        <div class="eval-result-card highlight">
          <div class="eval-result-label">LEVEL</div>
          <div class="eval-result-value">${level}</div>
        </div>
        <div class="eval-result-card">
          <div class="eval-result-label">STRENGTH</div>
          <div class="eval-result-value">${strStat}</div>
        </div>
        <div class="eval-result-card">
          <div class="eval-result-label">INTELLIGENCE</div>
          <div class="eval-result-value">${intStat}</div>
        </div>
      </div>
      <div class="eval-rank-badge">CLASS ${classLabel} — RANK ASSIGNED</div>
      <button class="eval-next-btn" id="save-btn">ENTER THE NEXUS</button>
    </div>
  `;

  document.getElementById("save-btn").addEventListener("click", async () => {
    document.getElementById("save-btn").disabled = true;
    document.getElementById("save-btn").textContent = "Saving...";
    await saveResults(level, strStat, intStat);
  });
}

// ===============================
// SAVE TO FIRESTORE
// ===============================
async function saveResults(level, strStat, intStat) {
  try {
    const gameRef = doc(firestore, "gameData", _userId);

    await updateDoc(gameRef, {
      "player.level":               level,
      "player.xp":                  0,
      "player.stats.strength":      strStat,
      "player.stats.intelligence":  intStat,
      "player.evaluationDone":      true,
      updatedAt:                    Date.now()
    });

    setProgress("Results saved! Entering the Nexus...");
    setTimeout(() => {
      window.location.href = "home.html";
    }, 1000);

  } catch (err) {
    console.error("[evaluation] Save failed:", err);
    setProgress("Failed to save — check your connection.");
    document.getElementById("save-btn").disabled   = false;
    document.getElementById("save-btn").textContent = "TRY AGAIN";
  }
}

// ===============================
// HANDLE INCOMPLETE — page unload
// If player closes/navigates away
// before finishing, save minimum stats.
// ===============================
window.addEventListener("beforeunload", () => {
  if (_userId && !_evaluationComplete) {
    // Fire-and-forget — best effort
    const gameRef = doc(firestore, "gameData", _userId);
    updateDoc(gameRef, {
      "player.evaluationDone": true,
      updatedAt: Date.now()
    }).catch(() => {});
  }
});

let _evaluationComplete = false;

// ===============================
// AUTH + GUARD
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "Login.html";
    return;
  }

  _userId = user.uid;

  try {
    const snap = await getDoc(doc(firestore, "gameData", user.uid));
    if (!snap.exists()) {
      window.location.href = "Login.html";
      return;
    }

    const data = snap.data();

    // Guard — already evaluated, skip to home
    if (data.player?.evaluationDone === true) {
      window.location.href = "home.html";
      return;
    }

    // Start evaluation with warning screen first
    showWarningScreen();

  } catch (err) {
    console.error("[evaluation] Auth load failed:", err);
  }
});