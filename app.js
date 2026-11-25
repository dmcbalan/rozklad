const DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
const SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00 … 23:00

// Розклад з таблиці. Ключ "день-година", день: 0 = понеділок
const SEED = {
  '0-18': 'Ілья', '0-19': 'Варя', '0-20': 'Саша', '0-21': 'Михайло',
  '1-15': 'Артем', '1-18': 'Давид', '1-21': 'Діма',
  '2-18': 'Ілья', '2-20': 'Саша', '2-22': 'Аврора',
  '3-17': 'Діна', '3-19': 'Богдан', '3-20': 'Ілья',
  '4-16': 'Аня Wix', '4-18': 'Давид', '4-19': 'Богдан', '4-20': 'Аня CapCut', '4-21': 'Діма',
  '5-10': 'Ростислав', '5-15': 'Аня', '5-17': 'Діма', '5-19': 'Богдан', '5-20': 'Андрій',
  '6-12': 'Михайло', '6-14': 'Аврора', '6-16': 'Діма', '6-17': 'Аня', '6-20': 'Андрій',
};

const CHARGED = ['present', 'absent'];
// Ціни: кнопки швидкої оплати в «Учнях»
const PACKS = [{ n: 1, sum: 350 }, { n: 10, sum: 3500 }, { n: 20, sum: 6500 }];
const LABEL = { present: 'Був', absent: 'Пропустив', excused: 'Перенесено' };
const KIND = { regular: 'За розкладом', makeup: 'Відпрацювання', extra: 'Додаткове', moved: 'Перенос' };
const remaining = (paid, records) => (paid || 0) - records.filter(r => CHARGED.includes(r.status)).length;
console.assert(remaining(8, [{ status: 'present' }, { status: 'absent' }, { status: 'excused' }]) === 6, 'remaining()');

const MEET = 'https://meet.google.com/fyx-nwim-wno'; // одне посилання для всіх уроків
// Значки, які викладач видає вручну
const BADGES = ['Перший проєкт 🚀', 'Своя гра 🎮', 'Свій сайт 🌐', 'Python-майстер 🐍', 'Креатив 🎨', 'Старанність ⭐', 'Монтажер 🎬', 'Дизайнер 🖌️'];
const plural = (n, one, few, many) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? many : k === 1 ? one : k >= 2 && k <= 4 ? few : many; };
console.assert(plural(1, 'а', 'б', 'в') === 'а' && plural(3, 'а', 'б', 'в') === 'б' && plural(11, 'а', 'б', 'в') === 'в' && plural(22, 'а', 'б', 'в') === 'б', 'plural()');
// Серія = уроки «Був» поспіль; «Пропустив» обнуляє, «Перенесено» не впливає
function progress(recs) {
  const asc = recs.slice().sort((a, b) => (a.date + pad(a.hour ?? 0)).localeCompare(b.date + pad(b.hour ?? 0)));
  let streak = 0, best = 0, present = 0;
  for (const r of asc) {
    if (r.status === 'present') { present++; streak++; best = Math.max(best, streak); }
    else if (r.status === 'absent') streak = 0;
  }
  return { present, streak, best };
}
const autoBadges = ({ present, best }) => [
  ...[[1, 'Перший урок 🎉'], [10, '10 уроків 💪'], [25, '25 уроків 🏅'], [50, '50 уроків 🏆'], [100, '100 уроків 👑']].filter(([n]) => present >= n),
  ...[[5, 'Серія 5 🔥'], [10, 'Серія 10 ⚡']].filter(([n]) => best >= n),
].map(x => x[1]);

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const pad = h => String(h).padStart(2, '0');
const hue = name => [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
const dayIdx = date => (date.getDay() + 6) % 7;
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const parseIso = v => new Date(v + 'T12:00');
const addDays = (v, n) => { const d = parseIso(v); d.setDate(d.getDate() + n); return iso(d); };
const longDate = v => parseIso(v).toLocaleDateString('uk', { day: 'numeric', month: 'long' });
const money = n => Math.round(n).toLocaleString('uk') + ' ₴';
const cleanName = s => s.trim().replace(/\//g, '-'); // "/" ламає id документа
const shortSlot = s => { const [d, h] = s.split(' '); return `${SHORT[dayIdx(parseIso(d))]} ${parseIso(d).getDate()}.${pad(parseIso(d).getMonth() + 1)} ${pad(h)}:00`; };
console.assert(progress([{ date: '2026-01-01', status: 'present' }, { date: '2026-01-02', status: 'absent' }, { date: '2026-01-03', status: 'present' }, { date: '2026-01-04', status: 'excused' }, { date: '2026-01-05', status: 'present' }]).streak === 2, 'progress()');

const configured = !!(window.FIREBASE_CONFIG && FIREBASE_CONFIG.projectId);
let lessons = {}, changes = {}, students = {}, attendance = {}, payments = {}, requests = {}, notes = {}, photos = {}, mePhotos = {};
const imgCache = {}; // id фото → data URL
let isTeacher = false, db, F, me = null;
let week = addDays(iso(new Date()), -dayIdx(new Date())); // понеділок поточного тижня
let statMonth = iso(new Date()).slice(0, 7);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}
const run = p => p.catch(e => toast('Помилка: ' + e.message));

// Розклад на конкретну дату: постійні заняття + разові зміни (changes)
function slotsOn(date) {
  const d = dayIdx(parseIso(date)), res = {};
  for (const h of HOURS) if (lessons[`${d}-${h}`]) res[h] = { student: lessons[`${d}-${h}`], kind: 'regular' };
  for (const [id, c] of Object.entries(changes)) {
    if (c.date !== date) continue;
    if (c.kind === 'cancel') { if (res[c.hour]?.kind === 'regular') Object.assign(res[c.hour], { cancelled: id, to: c.to }); }
    else res[c.hour] = { student: c.student, kind: c.kind, id, from: c.from };
  }
  return res;
}

function chip(s, q) {
  const dim = q && !s.student.toLowerCase().includes(q) ? ' dim' : '';
  const tag = s.cancelled ? `<em>${s.to ? '→ ' + shortSlot(s.to) : 'скасовано'}</em>`
    : s.kind !== 'regular' ? `<em>${KIND[s.kind]}</em>` : '';
  return `<span class="chip k-${s.kind}${s.cancelled ? ' off' : ''}${dim}" style="--h:${hue(s.student)}"><span>${esc(s.student)}</span>${tag}</span>`;
}

// ---------- Публічна частина ----------
function renderGrid(q) {
  const now = new Date(), today = iso(now), nowH = now.getHours();
  const free = document.body.classList.contains('free');
  const tag = isTeacher || free ? 'button' : 'div';
  const dates = DAYS.map((_, i) => addDays(week, i));
  let html = '<div class="cell corner">Час</div>' + dates.map((dt, i) =>
    `<div class="cell head${dt === today ? ' today' : ''}">${DAYS[i]}<small>${longDate(dt)}</small></div>`).join('');
  const day = dates.map(slotsOn);
  for (const h of HOURS) {
    html += `<div class="cell time${h === nowH ? ' now' : ''}">${pad(h)}:00 – ${pad((h + 1) % 24)}:00</div>`;
    dates.forEach((dt, i) => {
      const s = day[i][h];
      const past = dt < today || (dt === today && h <= nowH);
      const isFree = free && !past && (!s || s.cancelled);
      const cls = `cell slot${dt === today ? ' today' : ''}${dt === today && h === nowH ? ' live' : ''}${isFree ? ' open' : ''}`;
      html += `<${tag} class="${cls}" data-date="${dt}" data-hour="${h}"${tag === 'button' && free && !isFree && !isTeacher ? ' disabled' : ''}>${s ? chip(s, q) : ''}</${tag}>`;
    });
  }
  $('#grid').innerHTML = html;
}

// Телефон: стрічка днів + список обраного дня (замість широкої таблиці)
let mDay = dayIdx(new Date());
const resetDay = () => { const t = iso(new Date()); mDay = week <= t && t < addDays(week, 7) ? dayIdx(new Date()) : 0; };
function renderAgenda(q) {
  const today = iso(new Date()), nowH = new Date().getHours();
  const free = document.body.classList.contains('free');
  const dates = DAYS.map((_, i) => addDays(week, i));
  const strip = dates.map((dt, i) => {
    const n = Object.values(slotsOn(dt)).filter(s => !s.cancelled).length;
    return `<button class="dchip${i === mDay ? ' on' : ''}${dt === today ? ' today' : ''}" data-i="${i}" aria-label="${DAYS[i]}">
      <small>${SHORT[i]}</small><b>${parseIso(dt).getDate()}</b><i>${n ? n + ' зан.' : '—'}</i></button>`;
  }).join('');
  const dt = dates[mDay], s = slotsOn(dt);
  const hours = isTeacher || free ? HOURS : Object.keys(s).map(Number).sort((a, b) => a - b);
  const rows = hours.map(h => {
    const x = s[h], past = dt < today || (dt === today && h <= nowH);
    const open = free && !past && (!x || x.cancelled);
    const tag = isTeacher || open ? 'button' : 'div';
    const hint = open ? 'вільно · записатися' : isTeacher && !x ? '+ додати' : '';
    return `<${tag} class="drow${dt === today && h === nowH ? ' live' : ''}${open ? ' open' : ''}${past ? ' past' : ''}" data-date="${dt}" data-hour="${h}">
      <time>${pad(h)}:00</time>${x ? chip(x, q) : `<span class="hint">${hint}</span>`}</${tag}>`;
  }).join('');
  $('#agenda').innerHTML = `<div class="dstrip">${strip}</div>
    <h3 class="dtitle">${DAYS[mDay]}, ${longDate(dt)}${dt === today ? ' <em>сьогодні</em>' : ''}</h3>
    <div class="dlist">${rows || '<p class="empty">У цей день занять немає 🎉</p>'}</div>`;
}

function renderWeek() {
  const end = addDays(week, 6), today = iso(new Date());
  const a = parseIso(week), b = parseIso(end);
  $('#weekLabel').textContent = a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${longDate(end)}` : `${longDate(week)} – ${longDate(end)}`;
  $('#thisWeek').hidden = week <= today && today <= end;
  const all = DAYS.map((_, i) => Object.values(slotsOn(addDays(week, i)))).flat().filter(s => !s.cancelled);
  $('#stats').innerHTML = `<div><b>${all.length}</b><small>занять цього тижня</small></div>
    <div><b>${new Set(all.map(s => s.student)).size}</b><small>учнів</small></div>
    <div><b>1:1</b><small>індивідуально</small></div>`;
}

function renderMe() {
  const box = $('#me');
  if (!me) { box.hidden = true; return; }
  box.hidden = false;
  const today = iso(new Date()), nowH = new Date().getHours();
  let next = null;
  for (let i = 0; i < 21 && !next; i++) {
    const dt = addDays(today, i), s = slotsOn(dt);
    const h = Object.keys(s).map(Number).sort((a, b) => a - b)
      .find(h => s[h].student === me.name && !s[h].cancelled && (i > 0 || h >= nowH));
    if (h !== undefined) next = { dt, h, kind: s[h].kind };
  }
  const r = me.remaining ?? 0, paid = me.paid || 0;
  const pct = paid > 0 ? Math.max(0, Math.min(100, r / paid * 100)) : 0;
  // Кнопка Meet: за 10 хв до початку і до кінця уроку
  const mins = next ? (new Date(`${next.dt}T${pad(next.h)}:00`) - Date.now()) / 60000 : null;
  const live = next && mins <= 10 && mins > -60;
  const join = live
    ? `<a class="btn join" href="${MEET}" target="_blank" rel="noopener">🎥 ${mins > 0 ? `Приєднатися · старт через ${Math.ceil(mins)} хв` : 'Приєднатися до уроку'}</a>`
    : next ? `<p class="muted small">Кнопка входу на урок з'явиться тут за 10 хв до початку</p>` : '';
  const hw = (me.notes || []).find(x => x.homework), last = (me.notes || [])[0];
  const badges = me.badges || [];
  $('#meMain').innerHTML = `
    <div class="me-hi">
      <span class="avatar big" style="--h:${hue(me.name)}">${esc(me.name[0])}</span>
      <div><h2>Привіт, ${esc(me.name)}!</h2><p class="muted">Твоя особиста сторінка</p></div>
      <button class="x" id="forget" title="Це не я" aria-label="Закрити особисту сторінку">✕</button>
    </div>
    <div class="me-body">
      <div class="ring${r <= 0 ? ' bad' : r <= 2 ? ' warn' : ''}" style="--p:${pct}">
        <strong>${r}</strong><small>${r === 1 ? 'урок' : r >= 2 && r <= 4 ? 'уроки' : 'уроків'}<br>залишилось</small>
      </div>
      <div class="me-next">
        <p class="label">Наступне заняття</p>
        ${next ? `<p class="when">${DAYS[dayIdx(parseIso(next.dt))]}, ${longDate(next.dt)}<b>${pad(next.h)}:00</b></p>
          ${next.kind !== 'regular' ? `<span class="tag k-${next.kind}">${KIND[next.kind]}</span>` : ''}`
          : '<p class="when">Поки не заплановано</p>'}
        ${join}
        <p class="muted">Оплачено уроків: ${paid}${r <= 1 ? ' · <b class="bad">час поповнити абонемент</b>' : ''}</p>
      </div>
      <div class="me-hist">
        <p class="label">Останні заняття</p>
        ${(me.history || []).length ? `<ul>${me.history.map(x => `<li><span>${longDate(x.date)}</span>
          ${x.kind && x.kind !== 'regular' ? `<span class="tag k-${x.kind}">${KIND[x.kind]}</span>` : ''}
          <b class="st ${x.status}">${LABEL[x.status]}</b></li>`).join('')}</ul>` : '<p class="muted">Ще немає відміток</p>'}
      </div>
    </div>
    <div class="me-extra">
      <div class="hw">
        <p class="label">📚 Домашнє завдання</p>
        ${hw ? `<p class="hw-text">${esc(hw.homework)}</p><p class="muted small">від ${longDate(hw.date)}${hw.topic ? ' · тема: ' + esc(hw.topic) : ''}</p>`
          : '<p class="muted">Поки немає домашнього завдання</p>'}
        ${last && last !== hw && last.topic ? `<p class="muted small">Останній урок (${longDate(last.date)}): ${esc(last.topic)}</p>` : ''}
      </div>
      <div class="awards">
        <p class="label">🏆 Мої нагороди</p>
        ${me.streak ? `<p class="streak">🔥 <b>${me.streak}</b> ${plural(me.streak, 'урок', 'уроки', 'уроків')} поспіль без пропусків</p>` : ''}
        ${badges.length ? `<div class="bdgs">${badges.map(b => `<span class="bdg">${esc(b)}</span>`).join('')}</div>`
          : '<p class="muted small">Перша нагорода — після першого уроку 🎉</p>'}
      </div>
    </div>`;
  $('#forget').onclick = () => {
    try { localStorage.removeItem('rozklad-token'); } catch {}
    me = null; history.replaceState(null, '', location.pathname); $('#search').value = ''; render();
  };
  renderPhotoGrid($('#photoGrid'), token, mePhotos, false);
}

// ---------- Фото (учень завантажує на своїй сторінці, викладач бачить у «Учнях») ----------
// Картинки лежать окремо (photoData), щоб список фото був легким
function loadImg(tok, id) {
  if (imgCache[id]) return;
  imgCache[id] = 'loading';
  F.getDoc(F.doc(db, 'public', tok, 'photoData', id)).then(d => {
    const src = d.data()?.image;
    imgCache[id] = typeof src === 'string' && src.startsWith('data:image/') ? src : 'none';
    render();
    if ($('#photoDlg').open) openPhotos($('#photoDlg').dataset.name);
  }).catch(() => { imgCache[id] = 'none'; });
}
const ms = t => t?.toMillis ? t.toMillis() : 0;
function renderPhotoGrid(el, tok, list, canDelete) {
  const items = Object.entries(list).sort((a, b) => ms(b[1].created) - ms(a[1].created));
  el.innerHTML = items.length ? items.map(([id, p]) => {
    loadImg(tok, id);
    const src = imgCache[id];
    return `<figure>${src && src.startsWith('data:') ? `<a href="${src}" target="_blank"><img src="${src}" alt="${esc(p.caption || 'Фото')}" loading="lazy"></a>` : '<div class="ph-wait"></div>'}
      <figcaption>${p.caption ? esc(p.caption) + ' · ' : ''}${p.created ? new Date(ms(p.created)).toLocaleDateString('uk', { day: 'numeric', month: 'short' }) : 'щойно'}</figcaption>
      ${canDelete ? `<button class="x" data-delphoto="${id}" data-tok="${esc(tok)}" aria-label="Видалити фото">✕</button>` : ''}</figure>`;
  }).join('') : '<p class="muted small">Ще немає фото</p>';
}

async function compress(file) {
  const img = await createImageBitmap(file);
  let max = 1280, q = .75;
  for (let i = 0; i < 6; i++) {
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL('image/jpeg', q);
    if (out.length < 600000) return out; // ліміт документа Firestore — 1 МБ
    max *= .8; q = Math.max(.45, q - .08);
  }
  throw new Error('фото завелике');
}

function openPhotos(name) {
  const st = students[name] || {}, dlg = $('#photoDlg');
  dlg.dataset.name = name;
  $('#photoTitle').textContent = `Фото: ${name}`;
  const list = Object.fromEntries(Object.entries(photos).filter(([, p]) => p.token === st.token));
  renderPhotoGrid($('#photoDlgGrid'), st.token, list, true);
  if (!dlg.open) {
    dlg.showModal();
    run(F.setDoc(F.doc(db, 'students', name), { seenPhotos: Date.now() }, { merge: true }));
  }
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  renderWeek();
  renderGrid(q);
  renderAgenda(q);
  renderMe();
  if (isTeacher) renderTeacher();
}

// ---------- Кабінет викладача ----------
function allNames() {
  return [...new Set([...Object.keys(students), ...Object.values(lessons)])].sort((a, b) => a.localeCompare(b, 'uk'));
}
function recordsBy() {
  const m = {};
  for (const r of Object.values(attendance)) (m[r.student] ||= []).push(r);
  for (const l of Object.values(m)) l.sort((a, b) => (b.date + pad(b.hour ?? 0)).localeCompare(a.date + pad(a.hour ?? 0)));
  return m;
}

function renderTeacher() {
  $('#seed').hidden = Object.keys(lessons).length > 0;
  $('#names').innerHTML = allNames().map(n => `<option value="${esc(n)}">`).join('');
  const recs = recordsBy();
  const rem = n => remaining(students[n]?.paid, recs[n] || []);
  renderMarks(rem);
  renderStudents(recs, rem);
  renderStats();
  renderRequests();
  syncPublic(recs, rem);
}

function renderMarks(rem) {
  // Усі учні; хто має заняття цього дня — зверху. Кожен клік = окремий урок.
  const date = $('#date').value, d = dayIdx(parseIso(date));
  $('#dayName').textContent = DAYS[d] + (date === iso(new Date()) ? ' · сьогодні' : '');
  const dayRecs = {};
  for (const [id, x] of Object.entries(attendance)) if (x.date === date) (dayRecs[x.student] ||= []).push([id, x]);
  const slots = {}, off = {};
  for (const [h, s] of Object.entries(slotsOn(date))) {
    if (s.cancelled) (off[s.student] ||= []).push(s.to ? '→ ' + shortSlot(s.to) : 'скасовано');
    else (slots[s.student] ||= []).push({ h: +h, kind: s.kind });
  }
  const rows = allNames().map(n => ({ n, sl: slots[n] || [] }));
  const row = ({ n, sl }) => {
    const list = dayRecs[n] || [], r = rem(n);
    const count = s => list.filter(([, x]) => x.status === s).length;
    const btn = s => { const c = count(s); return `<button data-s="${s}" class="${c ? 'on ' + s : ''}" aria-pressed="${!!c}">${LABEL[s]}${c > 1 ? ` ×${c}` : ''}</button>`; };
    const when = sl.map(x => `${pad(x.h)}:00${x.kind !== 'regular' ? ` <i class="tag k-${x.kind}">${KIND[x.kind]}</i>` : ''}`).join(', ')
      || (off[n] ? `<s>${off[n].join(', ')}</s>` : 'не за розкладом');
    const note = notes[`${date}_${n}`];
    const prev = sl.length && Object.values(notes).filter(x => x.student === n && x.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
    const noteTxt = x => `${esc(x.topic || '')}${x.homework ? `${x.topic ? ' · ' : ''}ДЗ: ${esc(x.homework)}` : ''}`;
    return `<div class="mrow${count('present') ? ' done' : ''}" data-student="${esc(n)}" data-hours="${sl.map(x => x.h)}" data-kinds="${sl.map(x => x.kind)}">
      <span class="avatar" style="--h:${hue(n)}">${esc(n[0])}</span>
      <div class="who">
        <b>${esc(n)}</b>
        <small>${when} · <span class="${r <= 0 ? 'bad' : r <= 2 ? 'warn' : ''}">залишилось ${r}</span></small>
        ${list.length ? `<div class="recs">${list.map(([id, x]) => `<button class="rec ${x.status}" data-del="${id}" title="Скасувати цю відмітку">${LABEL[x.status]}${x.kind && x.kind !== 'regular' ? ' · ' + KIND[x.kind].toLowerCase() : ''} ✕</button>`).join('')}</div>` : ''}
        ${note ? `<p class="ncur">📝 ${noteTxt(note)}</p>` : prev ? `<p class="nprev">↩ Минулого разу (${longDate(prev.date)}): ${noteTxt(prev)}</p>` : ''}
      </div>
      <div class="mact">
        <button class="ghost link-btn${note ? ' has' : ''}" data-note="${esc(n)}">📝 ${note ? 'Нотатка ✓' : 'Нотатка / ДЗ'}</button>
        <div class="seg">${btn('present')}${btn('absent')}${btn('excused')}</div>
      </div>
    </div>`;
  };
  const planned = rows.filter(x => x.sl.length).sort((a, b) => a.sl[0].h - b.sl[0].h), others = rows.filter(x => !x.sl.length);
  $('#marks').innerHTML =
    (planned.length ? `<h4 class="sep">За розкладом · ${planned.length}</h4>${planned.map(row).join('')}` : '<p class="empty">Цього дня занять немає</p>') +
    (others.length ? `<h4 class="sep">Інші учні</h4>${others.map(row).join('')}` : '');
}

function renderStudents(recs, rem) {
  const sched = n => Object.entries(lessons).filter(([, v]) => v === n)
    .map(([k]) => k.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([dd, h]) => `${SHORT[dd]} ${pad(h)}:00`).join(' · ');
  // Нагадування про оплату: коли в абонементі лишилось 3 уроки чи менше
  const due = allNames().filter(n => (students[n]?.paid || 0) > 0 && rem(n) <= 3).sort((a, b) => rem(a) - rem(b));
  const dueBox = due.length ? `<div class="due"><p><b>⏰ Час нагадати про оплату</b> <span class="muted small">натисни, щоб скопіювати готове повідомлення</span></p>
    <div class="due-list">${due.map(n => `<button class="pack" data-msg="remind" data-name="${esc(n)}">💬 ${esc(n)} · <b>${rem(n)}</b></button>`).join('')}</div></div>` : '';
  $('#students').innerHTML = dueBox + allNames().sort((a, b) => rem(a) - rem(b)).map(n => {
    const r = rem(n), st = students[n] || {};
    const last = (recs[n] || []).slice(0, 10).reverse();
    const pr = progress(recs[n] || []);
    const myPhotos = st.token ? Object.values(photos).filter(p => p.token === st.token) : [];
    const fresh = myPhotos.filter(p => ms(p.created) > (st.seenPhotos || 0)).length;
    return `<article class="stu${r <= 0 ? ' over' : r <= 3 ? ' low' : ''}">
      <span class="avatar" style="--h:${hue(n)}">${esc(n[0])}</span>
      <div class="info">
        <b>${esc(n)}</b>${pr.streak >= 3 ? ` <span class="streak-mini" title="Уроків поспіль без пропусків">🔥${pr.streak}</span>` : ''}
        <small>${sched(n) || 'немає в розкладі'}</small>
        <div class="dots" aria-label="Останні уроки">${last.map(x => `<i class="${x.status}" title="${longDate(x.date)} · ${LABEL[x.status]}"></i>`).join('')}</div>
        <div class="bdgs sm">${(st.badges || []).map(b => `<button class="bdg" data-unbadge="${esc(b)}" data-name="${esc(n)}" title="Забрати значок">${esc(b)} ✕</button>`).join('')}
          <select class="bdg-add" data-badge="${esc(n)}" aria-label="Видати значок"><option value="">+ значок</option>${BADGES.filter(b => !(st.badges || []).includes(b)).map(b => `<option>${esc(b)}</option>`).join('')}</select></div>
      </div>
      <div class="rem"><strong>${r}</strong><small>з ${st.paid || 0} оплачених</small></div>
      <div class="stu-actions">
        <div class="packs">${PACKS.map((p, i) => `<button class="pack" data-pack="${i}" data-name="${esc(n)}"><b>+${p.n}</b> ${money(p.sum)}</button>`).join('')}</div>
        ${r <= 3 && (st.paid || 0) > 0 ? `<button class="ghost link-btn warnbtn" data-msg="remind" data-name="${esc(n)}">💬 Нагадування</button>` : ''}
        <button class="ghost link-btn" data-msg="report" data-name="${esc(n)}">📊 Звіт</button>
        ${myPhotos.length ? `<button class="ghost link-btn${fresh ? ' fresh' : ''}" data-photos="${esc(n)}">📷 ${myPhotos.length}${fresh ? ` · нових ${fresh}` : ''}</button>` : ''}
        ${st.token
          ? `<a class="ghost link-btn" href="?s=${esc(st.token)}" target="_blank" rel="noopener" title="Відкрити особисту сторінку учня">Кабінет ↗</a>
             <button class="ghost link-btn" data-link="${esc(n)}" title="Скопіювати посилання для учня">🔗 Копіювати</button>`
          : `<button class="ghost link-btn" data-link="${esc(n)}" title="Створити особисту сторінку й скопіювати посилання">+ Кабінет учня</button>`}
        <form class="topup" data-name="${esc(n)}">
          <input name="n" type="number" min="-200" max="200" placeholder="уроків" aria-label="Уроків">
          <input name="sum" type="number" min="0" step="10" placeholder="₴" aria-label="Сума, грн">
          <button class="ghost">Інша сума</button>
        </form>
      </div>
    </article>`;
  }).join('');
}

// ----- Статистика -----
function monthStats(m) {
  const at = Object.values(attendance).filter(x => x.date.startsWith(m));
  const ch = Object.values(changes).filter(x => x.date.startsWith(m));
  const held = at.filter(x => x.status === 'present');
  const charged = at.filter(x => CHARGED.includes(x.status)).length;
  return {
    income: Object.values(payments).filter(p => p.date.startsWith(m)).reduce((s, p) => s + (p.amount || 0), 0),
    held: held.length,
    makeup: held.filter(x => x.kind === 'makeup').length,
    extra: held.filter(x => x.kind === 'extra').length,
    absent: at.filter(x => x.status === 'absent').length,
    absentPct: charged ? Math.round(at.filter(x => x.status === 'absent').length / charged * 100) : 0,
    byMe: ch.filter(x => x.kind === 'makeup').length,
    byStudent: ch.filter(x => x.kind === 'moved').length,
    cancelled: ch.filter(x => x.kind === 'cancel' && !x.to).length,
    extraPlanned: ch.filter(x => x.kind === 'extra').length,
  };
}
const monthName = m => new Date(m + '-15T12:00').toLocaleDateString('uk', { month: 'long', year: 'numeric' });
const shiftMonth = (m, n) => { const d = new Date(m + '-15T12:00'); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); };

function renderStats() {
  $('#monthLabel').textContent = monthName(statMonth);
  const s = monthStats(statMonth);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(statMonth, i - 5));
  const rows = months.map(m => ({ m, ...monthStats(m) }));
  const max = Math.max(1, ...rows.map(r => r.income));
  const absentTop = Object.entries(Object.values(attendance)
    .filter(x => x.status === 'absent' && x.date >= shiftMonth(statMonth, -2) && x.date.slice(0, 7) <= statMonth)
    .reduce((a, x) => (a[x.student] = (a[x.student] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $('#statsBody').innerHTML = `
    <div class="st-top">
      <div class="hero-num"><small>Дохід за місяць</small><strong>${money(s.income)}</strong>
        <small>оплати, внесені цього місяця</small></div>
      <dl class="st-list">
        <div><dt>Проведено уроків</dt><dd>${s.held}</dd></div>
        <div><dt><i class="tag k-makeup">Відпрацювання</i> проведено</dt><dd>${s.makeup}</dd></div>
        <div><dt><i class="tag k-extra">Додаткові</i> проведено</dt><dd>${s.extra}</dd></div>
        <div><dt>Пропуски</dt><dd>${s.absent}<small> · ${s.absentPct}%</small></dd></div>
        <div><dt>Переніс я (відпрацювання)</dt><dd>${s.byMe}</dd></div>
        <div><dt>Переніс учень</dt><dd>${s.byStudent}</dd></div>
        <div><dt>Скасовано</dt><dd>${s.cancelled}</dd></div>
      </dl>
    </div>
    <h4 class="sep">Дохід за 6 місяців</h4>
    <div class="bars" role="img" aria-label="Дохід по місяцях">
      ${rows.map(r => `<div class="bar${r.m === statMonth ? ' cur' : ''}" tabindex="0">
        <span class="tip">${money(r.income)} · ${r.held} уроків</span>
        <i style="height:${r.income / max * 100}%"></i>
        <small>${new Date(r.m + '-15T12:00').toLocaleDateString('uk', { month: 'short' })}</small></div>`).join('')}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Місяць</th><th>Дохід</th><th>Проведено</th><th>Відпрац.</th><th>Додат.</th><th>Пропуски</th><th>Переноси</th></tr></thead>
      <tbody>${rows.slice().reverse().map(r => `<tr${r.m === statMonth ? ' class="cur"' : ''}><td>${monthName(r.m)}</td><td>${money(r.income)}</td><td>${r.held}</td><td>${r.makeup}</td><td>${r.extra}</td><td>${r.absent}</td><td>${r.byMe + r.byStudent}</td></tr>`).join('')}</tbody>
    </table></div>
    ${absentTop.length ? `<h4 class="sep">Найчастіше пропускають (3 міс.)</h4><p>${absentTop.map(([n, c]) => `<b>${esc(n)}</b> — ${c}`).join(' · ')}</p>` : ''}`;
}

function renderRequests() {
  const list = Object.entries(requests).sort((a, b) => (a[1].date + pad(a[1].hour)).localeCompare(b[1].date + pad(b[1].hour)));
  $('#reqCount').hidden = !list.length;
  $('#reqCount').textContent = list.length;
  $('#requests').innerHTML = list.length ? list.map(([id, r]) => `
    <div class="req">
      <span class="avatar" style="--h:${hue(r.name)}">${esc(r.name[0] || '?')}</span>
      <div class="who"><b>${esc(r.name)}</b>
        <small>${DAYS[dayIdx(parseIso(r.date))]}, ${longDate(r.date)} · ${pad(r.hour)}:00 · ${r.type === 'regular' ? 'щотижня' : 'разово'}</small>
        ${r.note ? `<small>${esc(r.note)}</small>` : ''}</div>
      <div class="req-actions"><button class="ghost danger" data-req="${id}" data-act="no">Відхилити</button><button class="primary" data-req="${id}" data-act="yes">Прийняти</button></div>
    </div>`).join('') : '<p class="empty">Нових заявок немає. Учні залишають їх через кнопку «Вільні вікна».</p>';
}

// ----- Готові повідомлення батькам (копіюються в буфер) -----
const lessonsWord = n => plural(n, 'заняття', 'заняття', 'занять');
function msgRemind(n) {
  const r = remaining(students[n]?.paid, recordsBy()[n] || []);
  return `Добрий день! 😊\nНагадую, що в абонементі ${n} ${r > 0 ? `залишилось ${r} ${lessonsWord(r)}` : 'заняття вже закінчились'}.\n` +
    `Щоб продовжити навчання без перерви, можна оплатити наступний абонемент:\n` +
    PACKS.filter(p => p.n > 1).map(p => `• ${p.n} занять — ${money(p.sum)} (${money(p.sum / p.n)} за заняття)`).join('\n') +
    `\nДякую! 🙌`;
}
function msgReport(n) {
  const m = iso(new Date()).slice(0, 7), recs = recordsBy()[n] || [];
  const at = recs.filter(x => x.date.startsWith(m));
  const held = at.filter(x => x.status === 'present').length, abs = at.filter(x => x.status === 'absent').length;
  const topics = notesOf(n).filter(x => x.date.startsWith(m) && x.topic).reverse().map(x => `• ${x.topic}`);
  const r = remaining(students[n]?.paid, recs), pr = progress(recs);
  return `Добрий день! 😊\nЗвіт за ${new Date(m + '-15T12:00').toLocaleDateString('uk', { month: 'long' })} — ${n}\n` +
    `✅ Проведено: ${held} ${lessonsWord(held)}\n` + (abs ? `❌ Пропусків: ${abs}\n` : '') +
    (pr.streak >= 3 ? `🔥 ${pr.streak} ${lessonsWord(pr.streak)} поспіль без пропусків\n` : '') +
    (topics.length ? `📚 Що вивчили:\n${topics.join('\n')}\n` : '') +
    `🎟 Залишилось в абонементі: ${r} ${lessonsWord(r)}`;
}
async function copyText(text, ok) {
  try { await navigator.clipboard.writeText(text); toast(ok); }
  catch { $('#copyArea').value = text; $('#copyDlg').showModal(); $('#copyArea').select(); }
}

// Особисті сторінки: копія потрібних даних у public/{код}; читати можна лише знаючи код
const notesOf = n => Object.values(notes).filter(x => x.student === n).sort((a, b) => b.date.localeCompare(a.date));
const synced = {};
function syncPublic(recs, rem) {
  if (!syncPublic.ready) return;
  for (const [n, st] of Object.entries(students)) {
    if (!st.token) continue;
    const pr = progress(recs[n] || []);
    const data = { name: n, paid: st.paid || 0, remaining: rem(n),
      history: (recs[n] || []).slice(0, 8).map(x => ({ date: x.date, status: x.status, kind: x.kind || 'regular' })),
      notes: notesOf(n).slice(0, 5).map(x => ({ date: x.date, topic: x.topic || '', homework: x.homework || '' })),
      streak: pr.streak, present: pr.present, badges: [...autoBadges(pr), ...(st.badges || [])] };
    const json = JSON.stringify(data);
    if (synced[st.token] === json) continue;
    synced[st.token] = json;
    run(F.setDoc(F.doc(db, 'public', st.token), data));
  }
}

// ---------- Діалог клітинки (викладач) ----------
function openCell(date, h) {
  const d = dayIdx(parseIso(date)), s = slotsOn(date)[h], dlg = $('#edit');
  dlg.dataset.date = date; dlg.dataset.hour = h;
  let body = `<button type="button" class="x" data-act="close" aria-label="Закрити">✕</button>
    <h3>${DAYS[d]}, ${longDate(date)} · ${pad(h)}:00</h3>`;
  if (s && s.kind !== 'regular') {
    body += `<p class="kind-line"><span class="tag k-${s.kind}">${KIND[s.kind]}</span> <b>${esc(s.student)}</b> — разове заняття${s.from ? `, перенесено з ${shortSlot(s.from)}` : ''}</p>
      <div class="actions"><button data-act="delOnce" class="ghost danger">${s.from ? 'Скасувати перенос (повернути назад)' : 'Видалити разове заняття'}</button></div>`;
  } else if (s?.cancelled) {
    body += `<p class="kind-line"><b>${esc(s.student)}</b>: цього тижня ${s.to ? 'перенесено на ' + shortSlot(s.to) : 'скасовано'}</p>
      <div class="actions"><button data-act="restore" class="primary">Повернути заняття на місце</button></div>`;
  } else {
    body += `<label class="fl">Учень<input id="editName" list="names" value="${esc(s?.student || '')}" placeholder="Ім'я учня" autocomplete="off"></label>
      <div class="actions"><button data-act="save" class="primary">${s ? 'Зберегти в постійному розкладі' : 'Додати в постійний розклад'}</button>
        ${s ? '<button data-act="del" class="ghost danger">Прибрати з розкладу</button>' : ''}</div>
      <h4 class="sep">Тільки ${longDate(date)}</h4>`;
    body += s ? `
      <div class="move">
        <label class="fl">Перенести на<input type="date" id="mvDate" value="${date}"></label>
        <label class="fl">Час<select id="mvHour">${HOURS.map(x => `<option value="${x}"${x === h ? ' selected' : ''}>${pad(x)}:00</option>`).join('')}</select></label>
        <label class="fl">Причина<select id="mvKind"><option value="makeup">Я не можу → відпрацювання</option><option value="moved">Учень попросив → перенос</option></select></label>
      </div>
      <div class="actions"><button data-act="move" class="primary">Перенести</button><button data-act="cancelOnce" class="ghost">Просто скасувати</button></div>`
      : `<div class="actions"><button data-act="once-makeup" class="ghost tagbtn k-makeup">+ Відпрацювання</button><button data-act="once-extra" class="ghost tagbtn k-extra">+ Додаткове</button></div>
      <p class="muted small">Разове заняття тільки на цю дату для учня з поля вище.</p>`;
  }
  dlg.innerHTML = body;
  dlg.showModal();
}

function delChange(id) {
  const b = F.writeBatch(db), link = changes[id]?.link;
  b.delete(F.doc(db, 'changes', id));
  if (link) b.delete(F.doc(db, 'changes', link));
  return b.commit();
}
const ensureStudent = n => F.setDoc(F.doc(db, 'students', n), { name: n }, { merge: true });

$('#edit').onclick = e => {
  const b = e.target.closest('[data-act]'), dlg = $('#edit');
  if (!b) return;
  if (b.dataset.act === 'close') return dlg.close();
  const date = dlg.dataset.date, h = +dlg.dataset.hour, key = `${dayIdx(parseIso(date))}-${h}`;
  const s = slotsOn(date)[h], name = cleanName($('#editName')?.value || '');
  const needName = () => { if (!name) toast("Впиши ім'я учня"); return !name; };
  let p;
  switch (b.dataset.act) {
    case 'save': if (needName()) return; p = Promise.all([F.setDoc(F.doc(db, 'lessons', key), { student: name }), ensureStudent(name)]); break;
    case 'del': p = F.deleteDoc(F.doc(db, 'lessons', key)); break;
    case 'once-makeup': case 'once-extra':
      if (needName()) return;
      p = Promise.all([F.addDoc(F.collection(db, 'changes'), { date, hour: h, student: name, kind: b.dataset.act.slice(5) }), ensureStudent(name)]);
      break;
    case 'cancelOnce': p = F.addDoc(F.collection(db, 'changes'), { date, hour: h, student: s.student, kind: 'cancel' }); break;
    case 'move': {
      const to = $('#mvDate').value, th = +$('#mvHour').value, kind = $('#mvKind').value;
      if (!to || (to === date && th === h)) return toast('Обери інший день або час');
      const busy = slotsOn(to)[th];
      if (busy && !busy.cancelled) return toast(`Цей час уже зайнятий: ${busy.student}`);
      const bt = F.writeBatch(db), cRef = F.doc(F.collection(db, 'changes')), oRef = F.doc(F.collection(db, 'changes'));
      bt.set(cRef, { date, hour: h, student: s.student, kind: 'cancel', to: `${to} ${th}`, link: oRef.id });
      bt.set(oRef, { date: to, hour: th, student: s.student, kind, from: `${date} ${h}`, link: cRef.id });
      p = bt.commit();
      break;
    }
    case 'restore': p = delChange(s.cancelled); break;
    case 'delOnce': p = delChange(s.id); break;
  }
  dlg.close();
  if (p) run(p.then(() => toast('Збережено')));
};

// ---------- Події ----------
$('#search').oninput = render;
$('#prevWeek').onclick = () => { week = addDays(week, -7); resetDay(); render(); };
$('#nextWeek').onclick = () => { week = addDays(week, 7); resetDay(); render(); };
$('#thisWeek').onclick = () => { week = addDays(iso(new Date()), -dayIdx(new Date())); resetDay(); render(); };

// Перемикач теми; вибір зберігається, без вибору — як у системі
const darkNow = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
const themeIcon = () => {
  $('#theme').innerHTML = darkNow()
    ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
  $('#theme').setAttribute('aria-label', darkNow() ? 'Світла тема' : 'Темна тема');
};
themeIcon();
$('#theme').onclick = () => {
  const t = darkNow() ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('rozklad-theme', t); } catch {}
  themeIcon();
};

// Свайп по списку дня на телефоні — сусідній день
let touchX = null;
$('#agenda').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
$('#agenda').addEventListener('touchend', e => {
  if (touchX === null || e.target.closest('.dstrip')) return;
  const dx = e.changedTouches[0].clientX - touchX; touchX = null;
  if (Math.abs(dx) < 60) return;
  mDay += dx < 0 ? 1 : -1;
  if (mDay > 6) { week = addDays(week, 7); mDay = 0; }
  if (mDay < 0) { week = addDays(week, -7); mDay = 6; }
  render();
});
$('#date').value = iso(new Date());
$('#date').onchange = render;
const shiftDay = n => { $('#date').value = addDays($('#date').value, n); render(); };
$('#prevDay').onclick = () => shiftDay(-1);
$('#nextDay').onclick = () => shiftDay(1);
$('#prevMonth').onclick = () => { statMonth = shiftMonth(statMonth, -1); render(); };
$('#nextMonth').onclick = () => { statMonth = shiftMonth(statMonth, 1); render(); };

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(t => t.hidden = t.id !== 'tab-' + b.dataset.tab);
});

$('#freeBtn').onclick = () => {
  const on = document.body.classList.toggle('free');
  $('#freeBtn').setAttribute('aria-pressed', on);
  $('#freeHint').hidden = !on;
  render();
};

$('#grid').onclick = $('#agenda').onclick = e => {
  const day = e.target.closest('.dchip');
  if (day) { mDay = +day.dataset.i; return render(); }
  const cell = e.target.closest('[data-date][data-hour]');
  if (!cell) return;
  const date = cell.dataset.date, h = +cell.dataset.hour;
  if (document.body.classList.contains('free') && cell.classList.contains('open')) {
    if (!configured) return toast('Спочатку підключи Firebase');
    const f = $('#bookForm');
    f.dataset.date = date; f.dataset.hour = h;
    $('#bookSlot').textContent = `${DAYS[dayIdx(parseIso(date))]}, ${longDate(date)} о ${pad(h)}:00`;
    return $('#book').showModal();
  }
  if (isTeacher) openCell(date, h);
};

$('#book').onclick = e => { if (e.target.closest('[data-close]')) $('#book').close(); };
$('#bookForm').onsubmit = e => {
  e.preventDefault();
  const f = e.target, el = f.elements;
  const data = { date: f.dataset.date, hour: +f.dataset.hour, name: el['name'].value.trim().slice(0, 60), note: el['note'].value.trim().slice(0, 300),
    type: el['type'].value, created: F.serverTimestamp() };
  if (!data.name) return toast("Вкажи своє ім'я");
  run(F.addDoc(F.collection(db, 'requests'), data).then(() => {
    $('#book').close(); f.reset(); toast('Заявку надіслано! Викладач зв\'яжеться з тобою');
  }));
};

$('#requests').onclick = e => {
  const b = e.target.closest('[data-req]');
  if (!b) return;
  const id = b.dataset.req, r = requests[id];
  if (b.dataset.act === 'no') return run(F.deleteDoc(F.doc(db, 'requests', id)));
  const name = cleanName(r.name), slot = slotsOn(r.date)[r.hour];
  if (slot && !slot.cancelled) return toast(`Цей час уже зайнятий: ${slot.student}`);
  const bt = F.writeBatch(db);
  if (r.type === 'regular') bt.set(F.doc(db, 'lessons', `${dayIdx(parseIso(r.date))}-${r.hour}`), { student: name });
  else bt.set(F.doc(F.collection(db, 'changes')), { date: r.date, hour: r.hour, student: name, kind: 'extra' });
  bt.set(F.doc(db, 'students', name), { name }, { merge: true });
  bt.delete(F.doc(db, 'requests', id));
  run(bt.commit().then(() => toast(`${name} додано в розклад`)));
};

$('#marks').onclick = e => {
  const del = e.target.closest('[data-del]');
  if (del) return run(F.deleteDoc(F.doc(db, 'attendance', del.dataset.del)));
  const nb = e.target.closest('[data-note]');
  if (nb) {
    const n = nb.dataset.note, date = $('#date').value, note = notes[`${date}_${n}`] || {};
    const f = $('#noteForm');
    f.dataset.name = n; f.dataset.date = date;
    $('#noteTitle').textContent = `${n} · ${longDate(date)}`;
    f.elements['topic'].value = note.topic || '';
    f.elements['homework'].value = note.homework || '';
    const prev = notesOf(n).find(x => x.date < date);
    $('#notePrev').textContent = prev ? `Минулого разу (${longDate(prev.date)}): ${prev.topic || '—'}${prev.homework ? ' · ДЗ: ' + prev.homework : ''}` : '';
    return $('#noteDlg').showModal();
  }
  const b = e.target.closest('.seg button');
  if (!b) return;
  const row = b.closest('.mrow'), student = row.dataset.student, date = $('#date').value;
  // година і тип: наступний слот цього дня (2-й урок → 2-й слот); поза розкладом — додаткове
  const done = Object.values(attendance).filter(x => x.date === date && x.student === student).length;
  const hs = row.dataset.hours ? row.dataset.hours.split(',').map(Number) : [];
  const ks = row.dataset.kinds ? row.dataset.kinds.split(',') : [];
  const i = hs[done] !== undefined ? done : 0;
  run(F.addDoc(F.collection(db, 'attendance'), { student, date, hour: hs[i] ?? null, kind: ks[i] ?? 'extra', status: b.dataset.s })
    .then(() => toast(`${student}: ${LABEL[b.dataset.s].toLowerCase()}`)));
};

$('#noteForm').onsubmit = e => {
  e.preventDefault();
  const f = e.target, n = f.dataset.name, date = f.dataset.date;
  const topic = f.elements['topic'].value.trim(), homework = f.elements['homework'].value.trim();
  const ref = F.doc(db, 'notes', `${date}_${n}`);
  $('#noteDlg').close();
  run((topic || homework ? F.setDoc(ref, { student: n, date, topic, homework }) : F.deleteDoc(ref)).then(() => toast('Нотатку збережено')));
};
document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

$('#photoDlg').onclick = e => {
  const b = e.target.closest('[data-delphoto]');
  if (!b || b.dataset.sure !== '1') { if (b) { b.dataset.sure = '1'; b.textContent = 'Видалити?'; } return; }
  const bt = F.writeBatch(db), tok = b.dataset.tok, id = b.dataset.delphoto;
  bt.delete(F.doc(db, 'public', tok, 'photos', id));
  bt.delete(F.doc(db, 'public', tok, 'photoData', id));
  run(bt.commit().then(() => toast('Фото видалено')));
};

$('#photoFile').onchange = async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !configured || !token) return;
  const btn = $('#photoBtn');
  btn.classList.add('busy');
  try {
    const image = await compress(file);
    const id = F.doc(F.collection(db, 'public', token, 'photos')).id, bt = F.writeBatch(db);
    bt.set(F.doc(db, 'public', token, 'photoData', id), { image });
    bt.set(F.doc(db, 'public', token, 'photos', id), { caption: $('#photoCap').value.trim().slice(0, 200), created: F.serverTimestamp() });
    await bt.commit();
    imgCache[id] = image;
    $('#photoCap').value = '';
    toast('Фото надіслано викладачу ✅');
  } catch (err) { toast('Не вдалося завантажити: ' + err.message); }
  btn.classList.remove('busy');
};

function pay(name, n, sum) {
  if (!n && !sum) return;
  const bt = F.writeBatch(db);
  bt.set(F.doc(db, 'students', name), { name, paid: F.increment(n) }, { merge: true });
  if (sum) bt.set(F.doc(F.collection(db, 'payments')), { student: name, date: iso(new Date()), lessons: n, amount: sum });
  run(bt.commit().then(() => toast(`${name}: ${n > 0 ? '+' : ''}${n} уроків${sum ? ', ' + money(sum) : ''}`)));
}

$('#students').onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  pay(f.dataset.name, parseInt(f.elements['n'].value, 10) || 0, Math.max(0, +f.elements['sum'].value || 0));
  f.reset();
};

$('#students').onchange = e => {
  const s = e.target.closest('select[data-badge]');
  if (!s || !s.value) return;
  run(F.setDoc(F.doc(db, 'students', s.dataset.badge), { badges: F.arrayUnion(s.value) }, { merge: true })
    .then(() => toast(`${s.dataset.badge} отримує значок ${s.value}`)));
};

$('#students').onclick = async e => {
  const pk = e.target.closest('[data-pack]');
  if (pk) return pay(pk.dataset.name, PACKS[pk.dataset.pack].n, PACKS[pk.dataset.pack].sum);
  const msg = e.target.closest('[data-msg]');
  if (msg) {
    const n = msg.dataset.name;
    return copyText(msg.dataset.msg === 'remind' ? msgRemind(n) : msgReport(n), `Повідомлення для ${n} скопійовано — встав у Telegram/Viber`);
  }
  const ub = e.target.closest('[data-unbadge]');
  if (ub) return run(F.setDoc(F.doc(db, 'students', ub.dataset.name), { badges: F.arrayRemove(ub.dataset.unbadge) }, { merge: true }));
  const ph = e.target.closest('[data-photos]');
  if (ph) return openPhotos(ph.dataset.photos);
  const b = e.target.closest('[data-link]');
  if (!b) return;
  const name = b.dataset.link;
  let token = students[name]?.token;
  if (!token) {
    token = [...crypto.getRandomValues(new Uint8Array(8))].map(x => (x % 36).toString(36)).join('');
    await run(F.setDoc(F.doc(db, 'students', name), { token }, { merge: true }));
  }
  const url = `${location.origin}${location.pathname}?s=${token}`;
  try { await navigator.clipboard.writeText(url); toast(`Посилання для ${name} скопійовано`); }
  catch { toast(url); }
};

$('#addStudent').onsubmit = e => {
  e.preventDefault();
  const name = cleanName(e.target.elements['name'].value);
  if (!name) return;
  run(ensureStudent(name));
  e.target.reset();
};

$('#seed').onclick = () => {
  const b = F.writeBatch(db);
  for (const [k, n] of Object.entries(SEED)) {
    b.set(F.doc(db, 'lessons', k), { student: n });
    b.set(F.doc(db, 'students', n), { name: n }, { merge: true });
  }
  run(b.commit().then(() => toast('Розклад імпортовано')));
};

setInterval(render, 60_000); // оновлює підсвітку поточної години

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
let installEvt;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#install').hidden = false; });
$('#install').onclick = () => { installEvt?.prompt(); $('#install').hidden = true; };

// ---------- Firebase ----------
let token = new URLSearchParams(location.search).get('s');
// Збережений код підставляємо лише у встановленому застосунку (він стартує без ?s=);
// у браузері особиста сторінка відкривається тільки за посиланням з ?s=
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
try { token ? localStorage.setItem('rozklad-token', token) : standalone && (token = localStorage.getItem('rozklad-token')); } catch {}

if (!configured) {
  lessons = { ...SEED };
  $('#setup').hidden = false;
  $('#login').onclick = () => toast('Спочатку підключи Firebase у config.js');
  render();
} else {
  render(); // каркас тижня одразу, дані підтягнуться зі snapshot
  const V = 'https://www.gstatic.com/firebasejs/10.12.2/';
  Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-firestore.js'), import(V + 'firebase-auth.js')])
    .then(([App, Fs, A]) => {
      F = Fs;
      const app = App.initializeApp(FIREBASE_CONFIG);
      db = F.getFirestore(app);
      const auth = A.getAuth(app);
      const sub = (name, set, onErr) => F.onSnapshot(F.collection(db, name), s => {
        const m = {}; s.forEach(d => m[d.id] = d.data()); set(m); render();
      }, onErr || (e => toast(e.message)));

      F.onSnapshot(F.collection(db, 'lessons'), s => {
        lessons = {};
        s.forEach(d => lessons[d.id] = d.data().student);
        render();
      }, e => toast('Не вдалося завантажити розклад: ' + e.message));
      sub('changes', m => changes = m);

      if (token) F.onSnapshot(F.doc(db, 'public', token), d => {
        me = d.exists() ? d.data() : null;
        if (me && !$('#search').value) $('#search').value = me.name;
        render();
      }, () => {});
      if (token) F.onSnapshot(F.collection(db, 'public', token, 'photos'), s => {
        mePhotos = {}; s.forEach(d => mePhotos[d.id] = d.data()); render();
      }, () => {});

      let unsub = [];
      A.onAuthStateChanged(auth, user => {
        unsub.forEach(u => u()); unsub = [];
        syncPublic.ready = false;
        isTeacher = !!user && user.email === TEACHER_EMAIL;
        document.body.classList.toggle('teacher', isTeacher);
        $('#login').textContent = user ? 'Вийти' : 'Вхід для викладача';
        if (user && !isTeacher) toast('Цей акаунт не має доступу до редагування');
        if (isTeacher) {
          // public/ оновлюємо лише після того, як завантажились і учні, і відмітки
          const loaded = new Set();
          const mark = n => { loaded.add(n); syncPublic.ready = ['students', 'attendance', 'notes'].every(x => loaded.has(x)); };
          unsub = [
            sub('students', m => { students = m; mark('students'); }),
            sub('attendance', m => { attendance = m; mark('attendance'); }),
            sub('notes', m => { notes = m; mark('notes'); }),
            sub('payments', m => payments = m),
            sub('requests', m => requests = m),
            // метадані всіх фото учнів (самі картинки вантажаться лише при перегляді)
            F.onSnapshot(F.collectionGroup(db, 'photos'), s => {
              photos = {}; s.forEach(d => photos[d.id] = { ...d.data(), token: d.ref.parent.parent.id }); render();
            }, e => toast(e.message)),
          ];
        }
        render();
      });

      $('#login').onclick = () => auth.currentUser
        ? A.signOut(auth)
        : A.signInWithPopup(auth, new A.GoogleAuthProvider()).catch(e => toast(e.message));
    })
    .catch(e => toast('Firebase не завантажився: ' + e.message));
}
