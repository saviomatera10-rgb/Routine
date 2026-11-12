'use strict';

/* ========= Costanti ========= */
const STORAGE_KEY = 'routine-v1';
const DAY_SHORT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
const ICON_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

/* ========= Stato ========= */
// activities: [{ id, name, start: "HH:MM"|null, end: "HH:MM"|null, days: [0..6] (0 = lunedì), order }]
// done: { "AAAA-MM-GG": [id, ...] }  -> le spunte sono legate alla data reale
let state = load();
let selected = startOfDay(new Date());
let followToday = true;   // se sto guardando oggi, a mezzanotte passo al giorno nuovo
let reorderMode = false;
let editingId = null;
let editDays = [];
let copyDays = [];

const $ = (id) => document.getElementById(id);

/* ========= Salvataggio ========= */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.activities)) {
        return { activities: data.activities, done: data.done || {} };
      }
    }
  } catch (e) { /* dati illeggibili: riparto da zero */ }
  return { activities: [], done: {} };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Non riesco a salvare i dati in questo browser');
  }
}

/* ========= Date ========= */
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function weekdayIndex(d) { return (d.getDay() + 6) % 7; } // 0 = lunedì
function startOfWeek(d) { return addDays(startOfDay(d), -weekdayIndex(d)); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}
function toMin(t) { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function nowMin() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

/* ========= Attività ========= */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function nextOrder() { return state.activities.reduce((m, a) => Math.max(m, a.order || 0), 0) + 1; }

function compare(a, b) {
  const sa = toMin(a.start), sb = toMin(b.start);
  if (sa !== null && sb !== null && sa !== sb) return sa - sb;
  if (sa !== null && sb === null) return -1;
  if (sa === null && sb !== null) return 1;
  return (a.order || 0) - (b.order || 0);
}

function activitiesFor(date) {
  const wd = weekdayIndex(date);
  return state.activities.filter((a) => a.days.includes(wd)).sort(compare);
}

function doneSet(date) { return new Set(state.done[dateKey(date)] || []); }

function statusOf(a, date, done) {
  if (done.has(a.id)) return 'done';
  if (sameDay(date, new Date()) && a.start && a.end) {
    const n = nowMin();
    if (n >= toMin(a.start) && n < toMin(a.end)) return 'now';
  }
  return 'todo';
}

function groupKey(a) { return a.start || 'none'; }

/* ========= Disegno interfaccia ========= */
function render() {
  const today = startOfDay(new Date());
  const isToday = sameDay(selected, today);
  const wd = weekdayIndex(selected);

  $('weekday').textContent = isToday ? `${DAY_NAMES[wd]} · oggi` : DAY_NAMES[wd];
  $('date').textContent = `${selected.getDate()} ${MONTHS[selected.getMonth()]}`
    + (selected.getFullYear() !== today.getFullYear() ? ` ${selected.getFullYear()}` : '');
  $('todayBtn').hidden = isToday;

  renderWeek(today);

  const list = activitiesFor(selected);
  const done = doneSet(selected);
  const doneCount = list.filter((a) => done.has(a.id)).length;
  const total = list.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  $('pct').textContent = `${pct}%`;
  $('barFill').style.width = `${pct}%`;
  $('bar').setAttribute('aria-valuenow', String(pct));
  if (!total) $('summary').textContent = 'Nessuna attività';
  else if (doneCount === total) $('summary').textContent = 'Giornata completata';
  else $('summary').textContent = `${doneCount} completat${doneCount === 1 ? 'a' : 'e'} · ${total - doneCount} da fare`;

  $('reorderBar').hidden = !reorderMode;
  renderList(list, done);
}

function renderWeek(today) {
  const start = startOfWeek(selected);
  const wrap = $('days');
  wrap.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const acts = activitiesFor(d);
    const done = doneSet(d);
    const full = acts.length > 0 && acts.every((a) => done.has(a.id));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day' + (sameDay(d, selected) ? ' selected' : '') + (sameDay(d, today) ? ' today' : '') + (full ? ' full' : '');
    b.setAttribute('aria-label', `${DAY_NAMES[i]} ${d.getDate()} ${MONTHS[d.getMonth()]}`);
    if (sameDay(d, selected)) b.setAttribute('aria-current', 'date');
    b.innerHTML = `<span class="dl">${DAY_SHORT[i]}</span><span class="dn">${d.getDate()}</span><span class="dot"></span>`;
    b.addEventListener('click', () => selectDate(d));
    wrap.appendChild(b);
  }
}

function renderList(list, done) {
  const el = $('list');
  el.innerHTML = '';

  if (!list.length) {
    el.innerHTML = `
      <div class="empty">
        <h2>Organizza il tuo ${DAY_NAMES[weekdayIndex(selected)].toLowerCase()}</h2>
        <p>Aggiungi la prima attività di questo giorno.</p>
        <button class="btn primary" type="button" id="emptyAdd">Aggiungi attività</button>
      </div>`;
    $('emptyAdd').addEventListener('click', () => openEdit(null));
    return;
  }

  const timed = list.filter((a) => a.start);
  const untimed = list.filter((a) => !a.start);

  timed.forEach((a, i) => el.appendChild(renderItem(a, done, list)));
  if (untimed.length) {
    const label = document.createElement('p');
    label.className = 'group-label';
    label.textContent = 'Senza orario';
    el.appendChild(label);
    untimed.forEach((a) => el.appendChild(renderItem(a, done, list)));
  }
}

function renderItem(a, done, list) {
  const st = statusOf(a, selected, done);
  const row = document.createElement('div');
  row.className = `item ${st}`;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'toggle';
  toggle.setAttribute('aria-pressed', st === 'done' ? 'true' : 'false');
  toggle.setAttribute('aria-label', `${a.name}${a.start ? ', ' + a.start : ''}: ${st === 'done' ? 'completata' : 'da completare'}`);

  const time = a.start
    ? `<span class="time"><span>${a.start}</span>${a.end ? `<span class="end">${a.end}</span>` : ''}</span>`
    : '<span class="time"><span>—</span></span>';

  toggle.innerHTML = `<span class="check">${ICON_CHECK}</span>${time}<span class="name"></span>${st === 'now' ? '<span class="badge">in corso</span>' : ''}`;
  toggle.querySelector('.name').textContent = a.name;
  toggle.addEventListener('click', () => toggleDone(a.id));
  row.appendChild(toggle);

  if (reorderMode) {
    const idx = list.indexOf(a);
    const prev = list[idx - 1], next = list[idx + 1];
    const canUp = prev && groupKey(prev) === groupKey(a);
    const canDown = next && groupKey(next) === groupKey(a);
    const mv = document.createElement('div');
    mv.className = 'move';
    mv.innerHTML = `<button type="button" aria-label="Sposta su">${ICON_UP}</button><button type="button" aria-label="Sposta giù">${ICON_DOWN}</button>`;
    const [up, down] = mv.querySelectorAll('button');
    up.disabled = !canUp; down.disabled = !canDown;
    up.addEventListener('click', () => swapOrder(a, prev));
    down.addEventListener('click', () => swapOrder(a, next));
    row.appendChild(mv);
  } else {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit';
    edit.setAttribute('aria-label', `Modifica ${a.name}`);
    edit.innerHTML = ICON_EDIT;
    edit.addEventListener('click', () => openEdit(a.id));
    row.appendChild(edit);
  }
  return row;
}

/* ========= Azioni ========= */
function selectDate(d) {
  selected = startOfDay(d);
  followToday = sameDay(selected, new Date());
  render();
}

function toggleDone(id) {
  const key = dateKey(selected);
  const set = new Set(state.done[key] || []);
  if (set.has(id)) set.delete(id); else set.add(id);
  if (set.size) state.done[key] = [...set]; else delete state.done[key];
  save();
  render();
}

function swapOrder(a, b) {
  if (!b) return;
  // con ordini uguali lo scambio non avrebbe effetto: li rendo distinti
  if ((a.order || 0) === (b.order || 0)) b.order = (b.order || 0) + 0.5;
  const t = a.order; a.order = b.order; b.order = t;
  save();
  render();
}

/* ========= Pannello attività ========= */
function buildChips(container, selectedDays, disabledDay, onChange) {
  container.innerHTML = '';
  DAY_SHORT.forEach((l, i) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'chip';
    c.textContent = l;
    c.setAttribute('aria-label', DAY_NAMES[i]);
    c.setAttribute('aria-pressed', selectedDays.includes(i) ? 'true' : 'false');
    if (i === disabledDay) c.disabled = true;
    c.addEventListener('click', () => {
      const on = c.getAttribute('aria-pressed') !== 'true';
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      onChange(i, on);
    });
    container.appendChild(c);
  });
}

function openEdit(id) {
  editingId = id;
  const a = id ? state.activities.find((x) => x.id === id) : null;
  $('editTitle').textContent = a ? 'Modifica attività' : 'Nuova attività';
  $('fName').value = a ? a.name : '';
  const noTime = a ? !a.start : false;
  $('fNoTime').checked = noTime;
  $('timeRow').hidden = noTime;
  $('fStart').value = a && a.start ? a.start : '';
  $('fEnd').value = a && a.end ? a.end : '';
  editDays = a ? [...a.days] : [weekdayIndex(selected)];
  buildChips($('fDays'), editDays, -1, (i, on) => {
    editDays = on ? [...new Set([...editDays, i])] : editDays.filter((d) => d !== i);
  });
  $('daysHint').hidden = !a;
  $('deleteBtn').hidden = !a;
  resetDelete();
  $('editError').textContent = '';
  openSheet('editSheet');
  if (!a) setTimeout(() => $('fName').focus(), 50);
}

function resetDelete() {
  const b = $('deleteBtn');
  b.classList.remove('confirm');
  b.textContent = 'Elimina';
  b.dataset.armed = '';
}

function saveEdit(e) {
  e.preventDefault();
  const name = $('fName').value.trim();
  const noTime = $('fNoTime').checked;
  const start = noTime ? null : ($('fStart').value || null);
  const end = noTime ? null : ($('fEnd').value || null);
  const err = $('editError');

  if (!name) { err.textContent = 'Scrivi il nome dell\'attività.'; $('fName').focus(); return; }
  if (!noTime && !start) { err.textContent = 'Inserisci l\'orario di inizio, oppure attiva "Senza orario".'; return; }
  if (start && end && toMin(end) <= toMin(start)) { err.textContent = 'L\'orario di fine deve essere dopo quello di inizio.'; return; }
  if (!editDays.length) { err.textContent = 'Scegli almeno un giorno.'; return; }

  const days = [...editDays].sort((a, b) => a - b);
  if (editingId) {
    const a = state.activities.find((x) => x.id === editingId);
    Object.assign(a, { name, start, end, days });
  } else {
    state.activities.push({ id: uid(), name, start, end, days, order: nextOrder() });
  }
  save();
  closeSheet('editSheet');
  render();
  toast(editingId ? 'Attività aggiornata' : 'Attività aggiunta');
}

function deleteActivity() {
  const b = $('deleteBtn');
  const a = state.activities.find((x) => x.id === editingId);
  if (!a) return;
  if (!b.dataset.armed) {
    b.dataset.armed = '1';
    b.classList.add('confirm');
    b.textContent = a.days.length > 1 ? 'Elimina da tutti i giorni' : 'Conferma eliminazione';
    return;
  }
  state.activities = state.activities.filter((x) => x.id !== editingId);
  for (const k of Object.keys(state.done)) {
    state.done[k] = state.done[k].filter((id) => id !== editingId);
    if (!state.done[k].length) delete state.done[k];
  }
  save();
  closeSheet('editSheet');
  render();
  toast('Attività eliminata');
}

/* ========= Copia giorno ========= */
function openCopy() {
  const src = weekdayIndex(selected);
  if (!activitiesFor(selected).length) { toast('Questo giorno non ha attività da copiare'); return; }
  $('copyTitle').textContent = `Copia ${DAY_NAMES[src].toLowerCase()}`;
  copyDays = [];
  $('cReplace').checked = false;
  $('copyError').textContent = '';
  buildChips($('cDays'), copyDays, src, (i, on) => {
    copyDays = on ? [...new Set([...copyDays, i])] : copyDays.filter((d) => d !== i);
  });
  openSheet('copySheet');
}

function doCopy(e) {
  e.preventDefault();
  if (!copyDays.length) { $('copyError').textContent = 'Scegli almeno un giorno.'; return; }
  const src = weekdayIndex(selected);
  const replace = $('cReplace').checked;
  const sourceActs = activitiesFor(selected);
  const sourceIds = new Set(sourceActs.map((a) => a.id));

  for (const t of copyDays) {
    if (replace) {
      // tolgo il giorno t dalle attività che non fanno parte della routine copiata
      for (const a of state.activities) {
        if (a.days.includes(t) && !sourceIds.has(a.id)) a.days = a.days.filter((d) => d !== t);
      }
      state.activities = state.activities.filter((a) => a.days.length);
    }
    for (const a of sourceActs) {
      if (a.days.includes(t)) continue; // già presente (attività ricorrente)
      state.activities.push({ id: uid(), name: a.name, start: a.start, end: a.end, days: [t], order: nextOrder() });
    }
  }
  save();
  closeSheet('copySheet');
  render();
  toast(`Routine di ${DAY_NAMES[src].toLowerCase()} copiata su ${copyDays.length} ${copyDays.length === 1 ? 'giorno' : 'giorni'}`);
}

/* ========= Backup ========= */
function exportBackup() {
  const blob = new Blob([JSON.stringify({ app: 'routine', version: 1, ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `routine-backup-${dateKey(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  closeSheet('menuSheet');
  toast('Backup esportato');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const valid = data && Array.isArray(data.activities) && data.activities.every((a) =>
        a && typeof a.id === 'string' && typeof a.name === 'string' && Array.isArray(a.days));
      if (!valid) throw new Error('formato');
      if (!confirm('Il backup sostituirà la routine attuale. Continuare?')) return;
      state = { activities: data.activities, done: data.done && typeof data.done === 'object' ? data.done : {} };
      save();
      closeSheet('menuSheet');
      render();
      toast('Backup importato');
    } catch (err) {
      toast('Questo file non è un backup valido');
    }
  };
  reader.readAsText(file);
}

/* ========= Pannelli e avvisi ========= */
function openSheet(id) {
  const d = $(id);
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
}
function closeSheet(id) {
  const d = $(id);
  if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ========= Avvio ========= */
function init() {
  $('todayBtn').addEventListener('click', () => selectDate(new Date()));
  $('prevWeek').addEventListener('click', () => selectDate(addDays(selected, -7)));
  $('nextWeek').addEventListener('click', () => selectDate(addDays(selected, 7)));
  $('addBtn').addEventListener('click', () => openEdit(null));
  $('menuBtn').addEventListener('click', () => openSheet('menuSheet'));

  $('editForm').addEventListener('submit', saveEdit);
  $('deleteBtn').addEventListener('click', deleteActivity);
  $('fNoTime').addEventListener('change', (e) => { $('timeRow').hidden = e.target.checked; });
  $('fName').addEventListener('input', () => { $('editError').textContent = ''; });
  $('copyForm').addEventListener('submit', doCopy);

  $('mCopy').addEventListener('click', () => { closeSheet('menuSheet'); openCopy(); });
  $('mReorder').addEventListener('click', () => { closeSheet('menuSheet'); reorderMode = true; render(); });
  $('reorderDone').addEventListener('click', () => { reorderMode = false; render(); });
  $('mExport').addEventListener('click', exportBackup);
  $('mImport').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importBackup(f);
    e.target.value = '';
  });

  // chiusura pannelli: pulsante X o tocco fuori dal pannello
  document.querySelectorAll('dialog.sheet').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d) closeSheet(d.id); });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeSheet(d.id)));
  });

  // scorrimento orizzontale sulla striscia dei giorni = settimana precedente/successiva
  let sx = null;
  const week = document.querySelector('.week');
  week.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  week.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 60) selectDate(addDays(selected, dx < 0 ? 7 : -7));
    sx = null;
  });

  // aggiornamento automatico dello stato "in corso" e del cambio giorno
  const tick = () => {
    const today = startOfDay(new Date());
    if (followToday && !sameDay(selected, today)) selected = today;
    if (!document.querySelector('dialog[open]')) render();
  };
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  // chiede al browser di non cancellare i dati salvati
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  render();
}

init();
