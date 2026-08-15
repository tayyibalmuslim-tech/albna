// =========================================================
// نظام التتبع والإنجاز - منهجي في طلب العلم
// يعتمد على البيانات الموجودة في data.js (SITE_DATA)
// =========================================================

const STORAGE_PREFIX = 'ilm_';

/* ---------------- Storage helpers ---------------- */
function isDone(id) {
  return localStorage.getItem(STORAGE_PREFIX + id) === '1';
}
function setDone(id, val) {
  localStorage.setItem(STORAGE_PREFIX + id, val ? '1' : '0');
}

/* ---------------- Data helpers ---------------- */
function getStage(stageId) {
  return SITE_DATA.stages[stageId];
}
function getSubject(stageId, subjectKey) {
  const stage = getStage(stageId);
  if (!stage) return null;
  return stage.subjects.find(s => s.key === subjectKey) || null;
}

function subjectProgress(stageId, subjectKey) {
  const subject = getSubject(stageId, subjectKey);
  if (!subject) return { done: 0, total: 0 };
  const total = subject.lectures.length;
  const done = subject.lectures.filter(l => isDone(l.id)).length;
  return { done, total };
}

function stageProgress(stageId) {
  const stage = getStage(stageId);
  if (!stage) return { done: 0, total: 0 };
  let done = 0, total = 0;
  stage.subjects.forEach(s => {
    total += s.lectures.length;
    done += s.lectures.filter(l => isDone(l.id)).length;
  });
  return { done, total };
}

function globalProgress() {
  let done = 0, total = 0;
  Object.keys(SITE_DATA.stages).forEach(stageId => {
    const p = stageProgress(stageId);
    done += p.done;
    total += p.total;
  });
  return { done, total };
}

function pct(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

/* ---------------- Small render helpers ---------------- */
function progressBarHtml(done, total, extraLabel) {
  const p = pct(done, total);
  return `
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${p}%"></div></div>
    <div class="progress-text"><span>${extraLabel || ''}</span><span>${done} / ${total} — ${p}%</span></div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* =========================================================
   صفحة الرئيسية (home)
   ========================================================= */
function renderHome() {
  // إحصائيات عامة
  const gp = globalProgress();
  let totalSubjects = 0;
  Object.values(SITE_DATA.stages).forEach(st => totalSubjects += st.subjects.length);

  const statsEl = document.getElementById('global-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-box"><div class="stat-value">${Object.keys(SITE_DATA.stages).length}</div><div class="stat-label">مراحل متاحة</div></div>
      <div class="stat-box"><div class="stat-value">${totalSubjects}</div><div class="stat-label">إجمالي المواد</div></div>
      <div class="stat-box"><div class="stat-value">${gp.total}</div><div class="stat-label">إجمالي المحاضرات</div></div>
      <div class="stat-box"><div class="stat-value">${gp.done}</div><div class="stat-label">محاضرات مكتملة</div></div>
      <div class="stat-box"><div class="stat-value">${pct(gp.done, gp.total)}%</div><div class="stat-label">نسبة الإنجاز الكلية</div></div>
    `;
  }

  // بطاقات المراحل
  const grid = document.getElementById('stages-grid');
  if (grid) {
    const allStageNums = [1, 2, 3, 4];
    const stageNames = { 1: 'المرحلة الأولى', 2: 'المرحلة الثانية', 3: 'المرحلة الثالثة', 4: 'المرحلة الرابعة' };
    grid.innerHTML = allStageNums.map(num => {
      const stageId = 'stage' + num;
      const stage = SITE_DATA.stages[stageId];
      if (!stage) {
        return `
          <div class="card stage-card disabled">
            <h3>${stageNames[num]}</h3>
            <p class="stage-meta">قريبًا 🚧 — لم تتم إضافة المحتوى بعد</p>
            <div class="card-footer">
              <a class="btn btn-outline btn-sm" href="stage-${num}/index.html">عرض الصفحة</a>
            </div>
          </div>`;
      }
      const sp = stageProgress(stageId);
      const completedSubjects = stage.subjects.filter(s => {
        const p = subjectProgress(stageId, s.key);
        return p.total > 0 && p.done === p.total;
      }).length;
      return `
        <div class="card stage-card">
          <h3>${stage.name}</h3>
          <div class="stage-meta">المواد المكتملة: ${completedSubjects} / ${stage.subjects.length}</div>
          ${progressBarHtml(sp.done, sp.total, 'إنجاز المرحلة')}
          <div class="card-footer">
            <a class="btn btn-sm" href="stage-${num}/index.html">دخول المرحلة</a>
          </div>
        </div>`;
    }).join('');
  }

  setupSearch();
}

function setupSearch() {
  const box = document.getElementById('search-box');
  const resultsEl = document.getElementById('search-results');
  if (!box || !resultsEl) return;

  // فهرسة قابلة للبحث
  const index = [];
  Object.entries(SITE_DATA.stages).forEach(([stageId, stage]) => {
    stage.subjects.forEach(subject => {
      index.push({
        type: 'subject',
        text: [subject.name, subject.sheikh, ...(subject.tags || [])].join(' '),
        title: subject.name,
        meta: `مادة — ${stage.name} — الشيخ ${subject.sheikh}`,
        href: `stage-1/${subject.key}/index.html`
      });
      subject.lectures.forEach(lec => {
        index.push({
          type: 'lecture',
          text: [lec.title, subject.name, subject.sheikh, ...(subject.tags || [])].join(' '),
          title: lec.title,
          meta: `محاضرة — ${subject.name} — اليوم ${lec.day}`,
          href: `stage-1/${subject.key}/${lec.file}`
        });
      });
    });
  });

  box.addEventListener('input', () => {
    const q = box.value.trim().toLowerCase();
    if (!q) { resultsEl.innerHTML = ''; return; }
    const matches = index.filter(item => item.text.toLowerCase().includes(q)).slice(0, 20);
    if (!matches.length) {
      resultsEl.innerHTML = `<div class="search-result-item"><span class="r-meta">لا توجد نتائج مطابقة</span></div>`;
      return;
    }
    resultsEl.innerHTML = matches.map(m => `
      <a class="search-result-item" href="${m.href}">
        <span class="r-title">${escapeHtml(m.title)}</span>
        <span class="r-meta">${escapeHtml(m.meta)}</span>
      </a>
    `).join('');
  });
}

/* =========================================================
   صفحة المرحلة (stage) - تبويبات المواد / الأيام
   ========================================================= */
function renderStagePage() {
  const stageId = document.body.dataset.stageId;
  const stage = getStage(stageId);
  if (!stage) return;

  // رأس الصفحة: تقدم المرحلة
  const headerEl = document.getElementById('stage-progress-header');
  if (headerEl) {
    const sp = stageProgress(stageId);
    const allDone = sp.total > 0 && sp.done === sp.total;
    headerEl.innerHTML = `
      ${progressBarHtml(sp.done, sp.total, 'إنجاز المرحلة')}
      <label class="checkbox-line">
        <input type="checkbox" disabled ${allDone ? 'checked' : ''}>
        <span>إتمام المرحلة (يُحسب تلقائيًا من إتمام جميع المحاضرات)</span>
      </label>
    `;
  }

  // تبويب المواد
  const subjectsEl = document.querySelector(`[data-stage-subjects="${stageId}"]`);
  if (subjectsEl) {
    subjectsEl.innerHTML = stage.subjects.map(s => {
      const p = subjectProgress(stageId, s.key);
      const done = p.total > 0 && p.done === p.total;
      const tagsHtml = (s.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');
      return `
        <div class="card subject-card">
          <div class="subject-card-top">
            <div>
              <h3>${escapeHtml(s.name)}</h3>
              <div class="subject-sub">الشيخ: ${escapeHtml(s.sheikh)}</div>
              <div class="tags">${tagsHtml}</div>
            </div>
            <label class="checkbox-line" title="يُحسب تلقائيًا من إتمام محاضرات المادة">
              <input type="checkbox" disabled ${done ? 'checked' : ''}>
            </label>
          </div>
          ${progressBarHtml(p.done, p.total, `${p.done} من ${p.total} محاضرة`)}
          <div class="card-footer">
            <a class="btn btn-sm" href="${s.key}/index.html">دخول المادة</a>
          </div>
        </div>
      `;
    }).join('');
  }

  // تبويب الأيام
  const daysEl = document.querySelector(`[data-stage-days="${stageId}"]`);
  if (daysEl) {
    daysEl.innerHTML = `<ul class="days-list">` + stage.days.map(d => {
      if (d.kind === 'lecture') {
        const checked = isDone(d.lectureId) ? 'checked' : '';
        return `
          <li class="day-item">
            <div class="day-item-main">
              <span class="day-num">اليوم ${d.day}</span>
              <div>
                <a class="day-title" href="${escapeHtml(d.link)}">${escapeHtml(d.title)}</a>
                <div class="day-subject">${escapeHtml(d.subjectName)}</div>
              </div>
            </div>
            <label class="checkbox-line">
              <input type="checkbox" data-lecture-id="${d.lectureId}" ${checked}>
            </label>
          </li>
        `;
      }
      const checked = isDone(d.id) ? 'checked' : '';
      const cls = d.kind === 'exam' ? 'exam' : 'rest';
      return `
        <li class="day-item ${cls}">
          <div class="day-item-main">
            <span class="day-num">اليوم ${d.day}</span>
            <div class="day-title">${escapeHtml(d.title)}</div>
          </div>
          <label class="checkbox-line">
            <input type="checkbox" data-day-id="${d.id}" ${checked}>
          </label>
        </li>
      `;
    }).join('') + `</ul>`;
  }

  setupTabs();
  wireCheckboxes(renderStagePage);
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  if (!buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('tab-' + btn.dataset.tab);
      if (target) target.classList.add('active');
    }, { once: false });
  });
}

/* =========================================================
   صفحة المادة (subject)
   ========================================================= */
function renderSubjectPage() {
  const stageId = document.body.dataset.stageId;
  const subjectKey = document.body.dataset.subjectKey;
  const subject = getSubject(stageId, subjectKey);
  if (!subject) return;

  const progressEl = document.querySelector(`[data-subject-progress="${stageId}:${subjectKey}"]`);
  if (progressEl) {
    const p = subjectProgress(stageId, subjectKey);
    const done = p.total > 0 && p.done === p.total;
    progressEl.innerHTML = `
      ${progressBarHtml(p.done, p.total)}
      <label class="checkbox-line" title="يُحسب تلقائيًا من إتمام محاضرات المادة">
        <input type="checkbox" disabled ${done ? 'checked' : ''}>
        <span>إتمام المادة (يُحسب تلقائيًا)</span>
      </label>
    `;
  }

  const listEl = document.querySelector(`[data-subject-lectures="${stageId}:${subjectKey}"]`);
  if (listEl) {
    listEl.innerHTML = subject.lectures.map(l => {
      const checked = isDone(l.id) ? 'checked' : '';
      return `
        <li class="lecture-item">
          <div class="lecture-item-main">
            <span class="lecture-num">${l.n}</span>
            <a class="lecture-title" href="${l.file}">${escapeHtml(l.title)}</a>
            <span class="lecture-day-badge">اليوم ${l.day}</span>
          </div>
          <label class="checkbox-line">
            <input type="checkbox" data-lecture-id="${l.id}" ${checked}>
          </label>
        </li>
      `;
    }).join('');
  }

  wireCheckboxes(renderSubjectPage);
}

/* =========================================================
   صفحة المحاضرة (lecture)
   ========================================================= */
function renderLecturePage() {
  const lectureId = document.body.dataset.lectureId;
  const checkbox = document.querySelector(`[data-lecture-id="${lectureId}"]`);
  if (checkbox) checkbox.checked = isDone(lectureId);
  wireCheckboxes(renderLecturePage);
}

/* =========================================================
   ربط أحداث الـ Checkboxes (عام لكل الصفحات)
   ========================================================= */
function wireCheckboxes(rerender) {
  document.querySelectorAll('[data-lecture-id]').forEach(cb => {
    cb.onchange = () => {
      setDone(cb.dataset.lectureId, cb.checked);
      if (rerender) rerender();
    };
  });
  document.querySelectorAll('[data-day-id]').forEach(cb => {
    cb.onchange = () => {
      setDone(cb.dataset.dayId, cb.checked);
      if (rerender) rerender();
    };
  });
}

/* =========================================================
   نقطة الدخول
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (typeof SITE_DATA === 'undefined') return;

  if (page === 'home') renderHome();
  else if (page === 'stage') renderStagePage();
  else if (page === 'subject') renderSubjectPage();
  else if (page === 'lecture') renderLecturePage();
});
