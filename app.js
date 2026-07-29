// PDSCC Curriculum Site — app.js
// Renders everything client-side from data embedded in data.js (WEEKS_DATA, MANIFEST_DATA, QUESTIONS_DATA).
// No fetch(), no network calls — must work from file:// with a plain double-click on index.html.

(function () {
  "use strict";

  var root = document.getElementById("app-root");
  var toolbar = document.getElementById("toolbar");
  var searchInput = document.getElementById("search-input");
  var topicFiltersEl = document.getElementById("topic-filters");
  var navButtons = document.querySelectorAll(".nav-btn");
  var brandHome = document.getElementById("brand-home");

  var POP_LABELS = {
    adult: "Adult",
    peds: "Pediatric",
    neonatal: "Neonatal",
    review: "Review"
  };

  var state = {
    view: "weeks", // 'weeks' | 'weekDetail' | 'quiz' | 'quizSummary'
    searchText: "",
    selectedTopic: null,
    currentWeekNum: null,
    quiz: null // { weekNum, questions, index, selected, revealed, answers: [] }
  };

  // ---------------- Utilities ----------------

  function esc(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function encodePath(relPath) {
    return relPath.split("/").map(encodeURIComponent).join("/");
  }

  function topicTokens(topicStr) {
    if (!topicStr) return [];
    return topicStr.split("/").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function findWeek(weekNum) {
    for (var i = 0; i < WEEKS_DATA.length; i++) {
      if (WEEKS_DATA[i].week === weekNum) return WEEKS_DATA[i];
    }
    return null;
  }

  function findQuestionsForWeek(weekNum) {
    for (var i = 0; i < QUESTIONS_DATA.length; i++) {
      if (QUESTIONS_DATA[i].week === weekNum) return QUESTIONS_DATA[i];
    }
    return null;
  }

  function folderFromRelPath(relPath) {
    // "PDSCC_Library/ECMO/foo.pdf" -> "ECMO"
    var parts = relPath.split("/");
    return parts.length >= 2 ? parts[1] : null;
  }

  // ---------------- Topic index / filters ----------------

  function buildTopicIndex() {
    var counts = {};
    WEEKS_DATA.forEach(function (w) {
      topicTokens(w.topic).forEach(function (tok) {
        counts[tok] = (counts[tok] || 0) + 1;
      });
    });
    return Object.keys(counts).sort().map(function (tok) {
      return { name: tok, count: counts[tok] };
    });
  }

  function renderTopicFilters() {
    var topics = buildTopicIndex();
    var html = "";
    html += '<button class="topic-chip' + (state.selectedTopic === null ? " active" : "") + '" data-topic="">All Topics (' + WEEKS_DATA.length + ')</button>';
    topics.forEach(function (t) {
      html += '<button class="topic-chip' + (state.selectedTopic === t.name ? " active" : "") + '" data-topic="' + esc(t.name) + '">' + esc(t.name) + " (" + t.count + ")</button>";
    });
    topicFiltersEl.innerHTML = html;
    Array.prototype.forEach.call(topicFiltersEl.querySelectorAll(".topic-chip"), function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-topic");
        state.selectedTopic = v === "" ? null : v;
        render();
      });
    });
  }

  function filterWeeks() {
    var q = state.searchText.trim().toLowerCase();
    return WEEKS_DATA.filter(function (w) {
      if (state.selectedTopic && topicTokens(w.topic).indexOf(state.selectedTopic) === -1) {
        return false;
      }
      if (!q) return true;
      var hay = [String(w.week), w.topic, w.title]
        .concat((w.papers || []).map(function (p) { return p.filename + " " + (p.description || ""); }))
        .join(" ")
        .toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  // ---------------- Rendering: Weeks grid ----------------

  function popDots(week) {
    var pops = {};
    (week.papers || []).forEach(function (p) { pops[p.population] = true; });
    var order = ["adult", "peds", "neonatal", "review"];
    return order.filter(function (p) { return pops[p]; }).map(function (p) {
      return '<span class="pop-dot ' + p + '" title="' + POP_LABELS[p] + '"></span>';
    }).join("");
  }

  function renderWeeksView() {
    var weeks = filterWeeks();
    var html = "";
    html += '<div class="result-count">' + weeks.length + " of " + WEEKS_DATA.length + " weeks" +
      (state.selectedTopic ? ' &middot; topic: <strong>' + esc(state.selectedTopic) + '</strong>' : "") +
      (state.searchText ? ' &middot; search: “' + esc(state.searchText) + '”' : "") +
      "</div>";

    if (weeks.length === 0) {
      html += '<div class="empty-state">No weeks match your search/filter.</div>';
    } else {
      html += '<div class="week-grid">';
      weeks.forEach(function (w) {
        html += '<div class="week-card" data-week="' + w.week + '">' +
          '<div class="week-card-top"><span class="week-number">Week ' + w.week + '</span>' +
          '<span class="paper-count">' + (w.papers ? w.papers.length : 0) + ' paper' + ((w.papers && w.papers.length === 1) ? "" : "s") + '</span></div>' +
          '<div class="week-card-title">' + esc(w.title) + '</div>' +
          '<div class="week-card-tags">' + topicTokens(w.topic).map(function (t) { return '<span class="topic-tag">' + esc(t) + '</span>'; }).join("") + '</div>' +
          '<div class="pop-dot-row">' + popDots(w) + '</div>' +
          '</div>';
      });
      html += "</div>";
    }
    root.innerHTML = html;

    Array.prototype.forEach.call(root.querySelectorAll(".week-card"), function (card) {
      card.addEventListener("click", function () {
        state.currentWeekNum = parseInt(card.getAttribute("data-week"), 10);
        state.view = "weekDetail";
        render();
      });
    });
  }

  // ---------------- Rendering: Week detail ----------------

  function paperCard(p) {
    var pop = p.population || "review";
    return '<div class="paper-card pop-' + pop + '">' +
      '<div class="paper-card-top"><div class="paper-title">' + esc(p.description || p.filename) + '</div>' +
      '<span class="pop-badge pop-' + pop + '">' + (POP_LABELS[pop] || pop) + '</span></div>' +
      '<div class="paper-desc">' + esc(p.filename) + '</div>' +
      '<a class="paper-link" href="' + encodePath(p.relative_path) + '" target="_blank" rel="noopener">Open PDF &rarr;</a>' +
      '</div>';
  }

  function renderExtendedReading(week) {
    var folders = {};
    (week.papers || []).forEach(function (p) {
      var f = folderFromRelPath(p.relative_path);
      if (f) folders[f] = true;
    });
    var assignedFiles = {};
    (week.papers || []).forEach(function (p) { assignedFiles[p.relative_path] = true; });

    var extras = MANIFEST_DATA.filter(function (m) {
      return folders[m.topic] && !assignedFiles[m.relative_path];
    });

    if (extras.length === 0) return "";

    var listHtml = extras.map(function (m) {
      return '<div class="ext-item"><a href="' + encodePath(m.relative_path) + '" target="_blank" rel="noopener">' + esc(m.filename) + '</a></div>';
    }).join("");

    return '<div class="ext-reading">' +
      '<button class="ext-toggle" id="ext-toggle-btn">Extended reading in this topic area &mdash; ' + extras.length + ' additional paper' + (extras.length === 1 ? "" : "s") + ' (not assigned to this week)</button>' +
      '<div class="ext-list" id="ext-list">' + listHtml + '</div>' +
      '</div>';
  }

  function renderWeekDetail() {
    var week = findWeek(state.currentWeekNum);
    if (!week) {
      state.view = "weeks";
      return render();
    }
    var papers = week.papers || [];
    var adultPapers = papers.filter(function (p) { return p.population === "adult"; });
    var pedsPapers = papers.filter(function (p) { return p.population === "peds" || p.population === "neonatal"; });
    var reviewPapers = papers.filter(function (p) { return p.population === "review"; });
    var otherPapers = papers.filter(function (p) {
      return p.population !== "adult" && p.population !== "peds" && p.population !== "neonatal" && p.population !== "review";
    });

    var hasBoth = adultPapers.length > 0 && pedsPapers.length > 0;

    var qset = findQuestionsForWeek(week.week);
    var quizBtnHtml;
    if (qset && qset.questions && qset.questions.length > 0) {
      quizBtnHtml = '<button class="btn btn-primary" id="start-quiz-btn">Start Quiz (' + qset.questions.length + ' question' + (qset.questions.length === 1 ? "" : "s") + ')</button>';
    } else {
      quizBtnHtml = '<span class="btn btn-disabled">Quiz not yet available</span><span class="quiz-hint">Question bank for this week is still being generated.</span>';
    }

    var html = "";
    html += '<button class="back-link" id="back-to-weeks">&larr; Back to all weeks</button>';
    html += '<div class="week-detail-header">' +
      '<div class="week-detail-eyebrow"><span class="week-badge">Week ' + week.week + '</span>' +
      topicTokens(week.topic).map(function (t) { return '<span class="topic-tag">' + esc(t) + '</span>'; }).join("") +
      '</div>' +
      '<h2 class="week-detail-title">' + esc(week.title) + '</h2>' +
      '<div class="week-detail-actions">' + quizBtnHtml + '</div>' +
      '</div>';

    html += '<div class="papers-section">';
    html += '<div class="section-heading">Assigned Papers</div>';

    if (hasBoth) {
      html += '<div class="paper-columns">';
      html += '<div class="paper-column"><div class="paper-column-head adult">Adult Evidence</div><div class="paper-list">' + adultPapers.map(paperCard).join("") + '</div></div>';
      html += '<div class="paper-column"><div class="paper-column-head peds">Pediatric / Neonatal Evidence</div><div class="paper-list">' + pedsPapers.map(paperCard).join("") + '</div></div>';
      html += '</div>';
    } else {
      var single = adultPapers.concat(pedsPapers);
      if (single.length > 0) {
        html += '<div class="paper-list single-list">' + single.map(paperCard).join("") + '</div>';
      }
    }

    var leftovers = reviewPapers.concat(otherPapers);
    if (leftovers.length > 0) {
      html += '<div class="section-heading" style="margin-top:20px;">Review / Background</div>';
      html += '<div class="paper-list single-list">' + leftovers.map(paperCard).join("") + '</div>';
    }

    if (papers.length === 0) {
      html += '<div class="empty-state">No papers listed for this week.</div>';
    }

    html += renderExtendedReading(week);
    html += "</div>";

    root.innerHTML = html;

    document.getElementById("back-to-weeks").addEventListener("click", function () {
      state.view = "weeks";
      render();
    });

    var startBtn = document.getElementById("start-quiz-btn");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        startQuiz(week.week);
      });
    }

    var extToggle = document.getElementById("ext-toggle-btn");
    if (extToggle) {
      extToggle.addEventListener("click", function () {
        document.getElementById("ext-list").classList.toggle("open");
      });
    }
  }

  // ---------------- Quiz flow ----------------

  function startQuiz(weekNum) {
    var qset = findQuestionsForWeek(weekNum);
    if (!qset || !qset.questions || qset.questions.length === 0) return;
    state.quiz = {
      weekNum: weekNum,
      title: qset.title,
      questions: qset.questions,
      index: 0,
      selected: null,
      revealed: false,
      answers: [] // { qId, selected, correct, isRight }
    };
    state.view = "quiz";
    render();
  }

  function currentQuestion() {
    return state.quiz.questions[state.quiz.index];
  }

  function renderQuizView() {
    var quiz = state.quiz;
    var q = currentQuestion();
    var total = quiz.questions.length;
    var pct = Math.round(((quiz.index) / total) * 100);

    var html = '<div class="quiz-shell">';
    html += '<button class="back-link" id="quiz-exit">&larr; Exit quiz</button>';
    html += '<div class="quiz-progress">Week ' + quiz.weekNum + ' Quiz &mdash; Question ' + (quiz.index + 1) + ' of ' + total + '</div>';
    html += '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + pct + '%;"></div></div>';
    html += '<div class="quiz-card">';
    html += '<div class="quiz-stem">' + esc(q.stem) + '</div>';

    if (quiz.revealed) {
      var isRight = quiz.selected === q.correct;
      html += '<div class="result-banner ' + (isRight ? "correct" : "incorrect") + '">' +
        (isRight ? "✓ Correct" : "✗ Incorrect &mdash; correct answer is " + q.correct) + '</div>';
    }

    html += '<div class="choice-list">';
    ["A", "B", "C", "D"].forEach(function (letter) {
      if (!q.choices || !(letter in q.choices)) return;
      var cls = "choice-card";
      var tagHtml = "";
      if (quiz.revealed) {
        cls += " revealed";
        if (letter === q.correct) {
          cls += " correct-answer";
          tagHtml = '<span class="choice-tag correct">Correct</span>';
        } else if (letter === quiz.selected) {
          cls += " wrong-answer";
          tagHtml = '<span class="choice-tag incorrect">Your answer</span>';
        }
      } else if (quiz.selected === letter) {
        cls += " selected";
      }
      html += '<div class="' + cls + '" data-letter="' + letter + '">' +
        '<span class="choice-letter">' + letter + '</span>' +
        '<span class="choice-text">' + esc(q.choices[letter]) + '</span>' +
        tagHtml +
        '</div>';
    });
    html += "</div>";

    if (quiz.revealed) {
      html += '<div class="explanation-box"><div class="explanation-label">Explanation</div>' + esc(q.explanation) + '</div>';
    }

    html += '<div class="quiz-actions"><span></span>';
    if (!quiz.revealed) {
      html += '<button class="btn ' + (quiz.selected ? "btn-primary" : "btn-disabled") + '" id="quiz-next-btn" ' + (quiz.selected ? "" : "disabled") + '>Next</button>';
    } else {
      var isLast = quiz.index === total - 1;
      html += '<button class="btn btn-primary" id="quiz-next-btn">' + (isLast ? "See Results" : "Next Question") + '</button>';
    }
    html += "</div>";

    html += "</div>"; // quiz-card
    html += "</div>"; // quiz-shell

    root.innerHTML = html;

    document.getElementById("quiz-exit").addEventListener("click", function () {
      var wk = quiz.weekNum;
      state.quiz = null;
      state.view = "weekDetail";
      state.currentWeekNum = wk;
      render();
    });

    if (!quiz.revealed) {
      Array.prototype.forEach.call(root.querySelectorAll(".choice-card"), function (el) {
        el.addEventListener("click", function () {
          quiz.selected = el.getAttribute("data-letter");
          renderQuizView();
        });
      });
    }

    var nextBtn = document.getElementById("quiz-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (!quiz.revealed) {
          quiz.revealed = true;
          quiz.answers.push({
            qId: q.id,
            selected: quiz.selected,
            correct: q.correct,
            isRight: quiz.selected === q.correct
          });
          renderQuizView();
        } else {
          if (quiz.index < quiz.questions.length - 1) {
            quiz.index += 1;
            quiz.selected = null;
            quiz.revealed = false;
            renderQuizView();
          } else {
            state.view = "quizSummary";
            render();
          }
        }
      });
    }
  }

  function renderQuizSummary() {
    var quiz = state.quiz;
    var total = quiz.answers.length;
    var score = quiz.answers.filter(function (a) { return a.isRight; }).length;

    var html = '<div class="quiz-shell">';
    html += '<div class="quiz-card quiz-summary">';
    html += '<div class="quiz-score">' + score + ' / ' + total + '</div>';
    html += '<div class="quiz-score-label">Week ' + quiz.weekNum + (quiz.title ? " &mdash; " + esc(quiz.title) : "") + ' &mdash; quiz complete</div>';

    html += '<div class="quiz-summary-list">';
    quiz.answers.forEach(function (a, i) {
      var q = quiz.questions[i];
      html += '<div class="summary-row ' + (a.isRight ? "correct" : "incorrect") + '">' +
        '<span class="mark">' + (a.isRight ? "✓" : "✗") + '</span>' +
        '<span class="stem-preview">Q' + (i + 1) + '. ' + esc(q.stem.length > 90 ? q.stem.slice(0, 90) + "…" : q.stem) + '</span>' +
        '<span>' + a.selected + (a.isRight ? "" : " &rarr; " + a.correct) + '</span>' +
        '</div>';
    });
    html += "</div>";

    html += '<div class="week-detail-actions" style="justify-content:center;">' +
      '<button class="btn btn-secondary" id="retake-quiz-btn">Retake Quiz</button>' +
      '<button class="btn btn-outline" id="back-to-week-btn">Back to Week ' + quiz.weekNum + '</button>' +
      '</div>';

    html += "</div></div>";
    root.innerHTML = html;

    document.getElementById("retake-quiz-btn").addEventListener("click", function () {
      startQuiz(quiz.weekNum);
    });
    document.getElementById("back-to-week-btn").addEventListener("click", function () {
      var wk = quiz.weekNum;
      state.quiz = null;
      state.currentWeekNum = wk;
      state.view = "weekDetail";
      render();
    });
  }

  // ---------------- Master render ----------------

  function render() {
    navButtons.forEach(function (btn) {
      btn.classList.add("active");
    });

    if (state.view === "weeks") {
      toolbar.classList.remove("hidden");
      renderTopicFilters();
      renderWeeksView();
    } else if (state.view === "weekDetail") {
      toolbar.classList.add("hidden");
      renderWeekDetail();
    } else if (state.view === "quiz") {
      toolbar.classList.add("hidden");
      renderQuizView();
    } else if (state.view === "quizSummary") {
      toolbar.classList.add("hidden");
      renderQuizSummary();
    }
    window.scrollTo(0, 0);
  }

  // ---------------- Global event wiring ----------------

  searchInput.addEventListener("input", function () {
    state.searchText = searchInput.value;
    renderWeeksView();
    // keep result-count/topic chips in sync without losing focus
  });

  navButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.view = "weeks";
      render();
    });
  });

  brandHome.addEventListener("click", function () {
    state.view = "weeks";
    state.searchText = "";
    state.selectedTopic = null;
    searchInput.value = "";
    render();
  });

  // ---------------- Init ----------------

  render();
})();
