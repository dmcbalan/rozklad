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
const LABEL = { present: 'Був', absent: 'Пропустив', excused: 'Перенесено' };
const remaining = (paid, records) => (paid || 0) - records.filter(r => CHARGED.includes(r.status)).length;
console.assert(remaining(8, [{ status: 'present' }, { status: 'absent' }, { status: 'excused' }]) === 6, 'remaining()');

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const pad = h => String(h).padStart(2, '0');
const hue = name => [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
const dayIdx = date => (date.getDay() + 6) % 7;
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const parseIso = v => new Date(v + 'T12:00');

const configured = !!(window.FIREBASE_CONFIG && FIREBASE_CONFIG.projectId);
let lessons = {}, students = {}, attendance = {};
let isTeacher = false, db, F;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}
const run = p => p.catch(e => toast('Помилка: ' + e.message));

const chip = (name, q) =>
  `<span class="chip${q && !name.toLowerCase().includes(q) ? ' dim' : ''}" style="--h:${hue(name)}">${esc(name)}</span>`;

// ---------- Публічна частина ----------
function renderGrid(q) {
  const now = new Date(), t = dayIdx(now), nowH = now.getHours();
  const tag = isTeacher ? 'button' : 'div';
  let html = '<div class="cell corner">Час</div>' +
    DAYS.map((d, i) => `<div class="cell head${i === t ? ' today' : ''}">${d}</div>`).join('');
  for (const h of HOURS) {
    html += `<div class="cell time${h === nowH ? ' now' : ''}">${pad(h)}:00 – ${pad((h + 1) % 24)}:00</div>`;
    for (let d = 0; d < 7; d++) {
      const key = `${d}-${h}`, name = lessons[key];
      const cls = `cell slot${d === t ? ' today' : ''}${d === t && h === nowH ? ' live' : ''}`;
      html += `<${tag} class="${cls}" data-key="${key}">${name ? chip(name, q) : ''}</${tag}>`;
    }
  }
  $('#grid').innerHTML = html;
}

function renderAgenda(q) {
  const t = dayIdx(new Date());
  $('#agenda').innerHTML = DAYS.map((_, i) => (t + i) % 7).map(d => {
    const hs = HOURS.filter(h => lessons[`${d}-${h}`]);
    if (!hs.length) return '';
    return `<section class="day${d === t ? ' today' : ''}">
      <h3>${DAYS[d]}${d === t ? '<em>сьогодні</em>' : ''}</h3>
      ${hs.map(h => `<div class="arow"><time>${pad(h)}:00</time>${chip(lessons[`${d}-${h}`], q)}</div>`).join('')}
    </section>`;
  }).join('');
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  renderGrid(q);
  renderAgenda(q);
  const names = new Set(Object.values(lessons));
  $('#stats').innerHTML = `<b>${Object.keys(lessons).length}</b> занять на тижні <i></i> <b>${names.size}</b> учнів`;
  if (isTeacher) renderTeacher();
}

// ---------- Кабінет викладача ----------
function allNames() {
  return [...new Set([...Object.keys(students), ...Object.values(lessons)])].sort((a, b) => a.localeCompare(b, 'uk'));
}
function recordsBy() {
  const m = {};
  for (const r of Object.values(attendance)) (m[r.student] ||= []).push(r);
  return m;
}

function renderTeacher() {
  $('#seed').hidden = Object.keys(lessons).length > 0;
  $('#names').innerHTML = allNames().map(n => `<option value="${esc(n)}">`).join('');
  const recs = recordsBy();
  const rem = n => remaining(students[n]?.paid, recs[n] || []);

  // Відмітки за день: усі учні; хто за розкладом цього дня — зверху.
  // Кожен клік додає окремий урок, тож 2 уроки на день = 2 кліки.
  const date = $('#date').value, d = dayIdx(parseIso(date));
  $('#dayName').textContent = DAYS[d] + (date === iso(new Date()) ? ' · сьогодні' : '');
  const dayRecs = {};
  for (const [id, x] of Object.entries(attendance)) if (x.date === date) (dayRecs[x.student] ||= []).push([id, x]);
  const rows = allNames().map(n => ({ n, hs: HOURS.filter(h => lessons[`${d}-${h}`] === n) }))
    .sort((a, b) => (a.hs[0] ?? 99) - (b.hs[0] ?? 99) || a.n.localeCompare(b.n, 'uk'));
  const row = ({ n, hs }) => {
    const list = dayRecs[n] || [], r = rem(n);
    const count = s => list.filter(([, x]) => x.status === s).length;
    const btn = s => { const c = count(s); return `<button data-s="${s}" class="${c ? 'on ' + s : ''}" aria-pressed="${!!c}">${LABEL[s]}${c > 1 ? ` ×${c}` : ''}</button>`; };
    return `<div class="mrow${count('present') ? ' done' : ''}" data-student="${esc(n)}" data-hours="${hs.join(',')}">
      <span class="avatar" style="--h:${hue(n)}">${esc(n[0])}</span>
      <div class="who">
        <b>${esc(n)}</b>
        <small>${hs.map(h => `${pad(h)}:00`).join(', ') || 'не за розкладом'} · <span class="${r <= 0 ? 'bad' : r <= 2 ? 'warn' : ''}">залишилось ${r}</span></small>
        ${list.length ? `<div class="recs">${list.map(([id, x]) => `<button class="rec ${x.status}" data-del="${id}" title="Скасувати цю відмітку">${LABEL[x.status]} ✕</button>`).join('')}</div>` : ''}
      </div>
      <div class="seg">${btn('present')}${btn('absent')}${btn('excused')}</div>
    </div>`;
  };
  const planned = rows.filter(x => x.hs.length), others = rows.filter(x => !x.hs.length);
  $('#marks').innerHTML =
    (planned.length ? `<h4 class="sep">За розкладом · ${planned.length}</h4>${planned.map(row).join('')}` : '<p class="empty">За розкладом цього дня занять немає</p>') +
    (others.length ? `<h4 class="sep">Інші учні</h4>${others.map(row).join('')}` : '');

  // Учні: першими ті, у кого абонемент закінчується
  const sched = n => Object.entries(lessons).filter(([, v]) => v === n)
    .map(([k]) => k.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([dd, h]) => `${SHORT[dd]} ${pad(h)}:00`).join(' · ');
  $('#students').innerHTML = allNames().sort((a, b) => rem(a) - rem(b)).map(n => {
    const r = rem(n), paid = students[n]?.paid || 0;
    const last = (recs[n] || []).sort((a, b) => (b.date + pad(b.hour ?? 0)).localeCompare(a.date + pad(a.hour ?? 0))).slice(0, 10).reverse();
    return `<article class="stu${r <= 0 ? ' over' : r <= 2 ? ' low' : ''}">
      <span class="avatar" style="--h:${hue(n)}">${esc(n[0])}</span>
      <div class="info">
        <b>${esc(n)}</b>
        <small>${sched(n) || 'немає в розкладі'}</small>
        <div class="dots" aria-label="Останні уроки">${last.map(x => `<i class="${x.status}" title="${x.date} · ${LABEL[x.status]}"></i>`).join('')}</div>
      </div>
      <div class="rem"><strong>${r}</strong><small>з ${paid} оплачених</small></div>
      <form class="topup" data-name="${esc(n)}">
        <input type="number" value="8" min="-200" max="200" aria-label="Скільки уроків додати">
        <button class="ghost">+ уроки</button>
      </form>
    </article>`;
  }).join('');
}

// ---------- Події ----------
$('#search').oninput = render;
$('#date').value = iso(new Date());
$('#date').onchange = render;
const shift = n => { const d = parseIso($('#date').value); d.setDate(d.getDate() + n); $('#date').value = iso(d); render(); };
$('#prevDay').onclick = () => shift(-1);
$('#nextDay').onclick = () => shift(1);

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('#tab-marks').hidden = b.dataset.tab !== 'marks';
  $('#tab-students').hidden = b.dataset.tab !== 'students';
});

$('#grid').onclick = e => {
  const cell = e.target.closest('.slot');
  if (!cell || !isTeacher) return;
  const [d, h] = cell.dataset.key.split('-').map(Number);
  const dlg = $('#edit');
  dlg.dataset.key = cell.dataset.key;
  $('#editTitle').textContent = `${DAYS[d]}, ${pad(h)}:00`;
  $('#editName').value = lessons[cell.dataset.key] || '';
  dlg.showModal();
};

$('#editForm').onsubmit = e => {
  e.preventDefault();
  const dlg = $('#edit'), act = e.submitter?.value || 'save', key = dlg.dataset.key;
  const name = $('#editName').value.trim().replace(/\//g, '-'); // "/" ламає id документа
  dlg.close();
  if (act === 'cancel') return;
  if (act === 'del' || !name) return run(F.deleteDoc(F.doc(db, 'lessons', key)));
  run(Promise.all([
    F.setDoc(F.doc(db, 'lessons', key), { student: name }),
    F.setDoc(F.doc(db, 'students', name), { name }, { merge: true }),
  ]));
};

$('#marks').onclick = e => {
  const del = e.target.closest('[data-del]');
  if (del) return run(F.deleteDoc(F.doc(db, 'attendance', del.dataset.del)));
  const b = e.target.closest('.seg button');
  if (!b) return;
  const row = b.closest('.mrow'), student = row.dataset.student, date = $('#date').value;
  // година: наступний слот з розкладу цього дня (для 2-го уроку — другий слот), інакше null
  const done = Object.values(attendance).filter(x => x.date === date && x.student === student).length;
  const hs = row.dataset.hours ? row.dataset.hours.split(',').map(Number) : [];
  run(F.addDoc(F.collection(db, 'attendance'), { student, date, hour: hs[done] ?? hs[0] ?? null, status: b.dataset.s })
    .then(() => toast(`${student}: ${LABEL[b.dataset.s].toLowerCase()}`)));
};

$('#students').onsubmit = e => {
  e.preventDefault();
  const n = parseInt(e.target.querySelector('input').value, 10);
  if (!n) return;
  run(F.setDoc(F.doc(db, 'students', e.target.dataset.name), { paid: F.increment(n) }, { merge: true })
    .then(() => toast(`${e.target.dataset.name}: ${n > 0 ? '+' : ''}${n} уроків`)));
};

$('#addStudent').onsubmit = e => {
  e.preventDefault();
  const f = e.target, el = f.elements, name = el['name'].value.trim().replace(/\//g, '-');
  if (!name) return;
  run(F.setDoc(F.doc(db, 'students', name), { name, paid: F.increment(+el['n'].value || 0) }, { merge: true }));
  f.reset();
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

// ---------- Firebase ----------
if (!configured) {
  lessons = { ...SEED };
  $('#setup').hidden = false;
  $('#login').onclick = () => toast('Спочатку підключи Firebase у config.js');
  render();
} else {
  const V = 'https://www.gstatic.com/firebasejs/10.12.2/';
  Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-firestore.js'), import(V + 'firebase-auth.js')])
    .then(([App, Fs, A]) => {
      F = Fs;
      const app = App.initializeApp(FIREBASE_CONFIG);
      db = F.getFirestore(app);
      const auth = A.getAuth(app);

      F.onSnapshot(F.collection(db, 'lessons'), s => {
        lessons = {};
        s.forEach(d => lessons[d.id] = d.data().student);
        render();
      }, e => toast('Не вдалося завантажити розклад: ' + e.message));

      let unsub = [];
      A.onAuthStateChanged(auth, user => {
        unsub.forEach(u => u()); unsub = [];
        isTeacher = !!user && user.email === TEACHER_EMAIL;
        document.body.classList.toggle('teacher', isTeacher);
        $('#login').textContent = user ? 'Вийти' : 'Вхід для викладача';
        if (user && !isTeacher) toast('Цей акаунт не має доступу до редагування');
        if (isTeacher) {
          const sub = (name, set) => F.onSnapshot(F.collection(db, name), s => {
            const m = {}; s.forEach(d => m[d.id] = d.data()); set(m); render();
          }, e => toast(e.message));
          unsub = [sub('students', m => students = m), sub('attendance', m => attendance = m)];
        }
        render();
      });

      $('#login').onclick = () => auth.currentUser
        ? A.signOut(auth)
        : A.signInWithPopup(auth, new A.GoogleAuthProvider()).catch(e => toast(e.message));
    })
    .catch(e => toast('Firebase не завантажився: ' + e.message));
}
