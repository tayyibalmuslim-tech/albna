// ============================================================
// خطة الدراسة — Study Plan Tracker
// Persists checkbox state in localStorage, shared across every
// page on the same site (works on GitHub Pages).
// ============================================================
(function () {
  var STORE_KEY = "studyProgress";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore (private browsing etc.) */
    }
  }

  function updateProgressBlocks(state) {
    document.querySelectorAll("[data-progress-ids]").forEach(function (block) {
      var ids = block.getAttribute("data-progress-ids").split(",").filter(Boolean);
      var total = ids.length;
      var done = ids.filter(function (id) { return !!state[id]; }).length;
      var pct = total ? Math.round((done / total) * 100) : 0;

      var fill = block.querySelector(".progress-fill");
      var text = block.querySelector(".progress-count");
      if (fill) fill.style.width = pct + "%";
      if (text) text.textContent = done + " / " + total + " (" + pct + "%)";
    });
  }

  function updateCardLinks(state) {
    document.querySelectorAll("[data-card-ids]").forEach(function (card) {
      var ids = card.getAttribute("data-card-ids").split(",").filter(Boolean);
      var total = ids.length;
      var done = ids.filter(function (id) { return !!state[id]; }).length;
      card.classList.toggle("done", total > 0 && done === total);
      var meta = card.querySelector(".meta");
      if (meta) meta.textContent = done + " / " + total + " مكتمل";
    });
  }

  function updateDayDots(state) {
    document.querySelectorAll(".day-dot[data-id]").forEach(function (dot) {
      dot.classList.toggle("done", !!state[dot.getAttribute("data-id")]);
    });
  }

  function applyRowState(el, id, state) {
    var checked = !!state[id];
    el.classList.toggle("done", checked);
  }

  function initCheckboxes(state) {
    document.querySelectorAll('input[type="checkbox"][data-id]').forEach(function (box) {
      var id = box.getAttribute("data-id");
      box.checked = !!state[id];

      var row = box.closest(".lecture, .top-check");
      if (row) applyRowState(row, id, state);

      box.addEventListener("change", function () {
        var s = loadState();
        s[id] = box.checked;
        saveState(s);
        if (row) applyRowState(row, id, s);
        updateProgressBlocks(s);
        updateCardLinks(s);
        updateDayDots(s);
      });
    });

    // Clicking the lecture text also toggles its checkbox
    document.querySelectorAll(".lec-text[data-for]").forEach(function (label) {
      label.addEventListener("click", function (e) {
        if (e.target.tagName === "A") return;
        var box = document.querySelector('input[data-id="' + label.getAttribute("data-for") + '"]');
        if (box) {
          box.checked = !box.checked;
          box.dispatchEvent(new Event("change"));
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var state = loadState();
    initCheckboxes(state);
    updateProgressBlocks(state);
    updateCardLinks(state);
    updateDayDots(state);
  });
})();
