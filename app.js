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
const KIND = { regular: 'За розкладом', makeup: 'Відпрацювання', extra: 'Додаткове', moved: 'Перенос', trial: 'Пробний', busy: 'Зайнято' };
const TRIAL_RES = { yes: '✅ Продовжує', think: '🤔 Думає', no: '❌ Не продовжує' };
// «Приведи друга»: друг прийшов за посиланням, пробний → «Продовжує» = REF_BONUS ₴ тому, хто запросив
const REF_BONUS = 500, REF_MAX = 3; // shortcut: друзі понад REF_MAX не оплачуються — змінити тут
// Код запрошення — короткий хеш коду кабінету: у посиланні не світиться доступ до кабінету
const refCode = tok => { let h = 2166136261; for (const c of String(tok)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h.toString(36).padStart(7, '0'); };
console.assert(refCode('abc') === refCode('abc') && refCode('abc') !== refCode('abd') && /^[a-z0-9]{7}$/.test(refCode('k3f9x2ab')), 'refCode()');
const refEarned = joined => Math.min(joined, REF_MAX) * REF_BONUS;
console.assert(refEarned(0) === 0 && refEarned(1) === 500 && refEarned(3) === 1500 && refEarned(5) === 1500, 'refEarned()');
// Хто прийшов за посиланням: ?ref=код запам'ятовується, поки друг не залишить заявку
const refIn = (new URLSearchParams(location.search).get('ref') || '').toLowerCase();
if (/^[a-z0-9]{4,12}$/.test(refIn)) try { localStorage.setItem('rozklad-ref', refIn); } catch {}
const myRef = () => { try { return localStorage.getItem('rozklad-ref') || ''; } catch { return ''; } };
const remaining = (paid, records) => (paid || 0) - records.filter(r => CHARGED.includes(r.status)).length;
console.assert(remaining(8, [{ status: 'present' }, { status: 'absent' }, { status: 'excused' }]) === 6, 'remaining()');

const MEET = 'https://meet.google.com/fyx-nwim-wno'; // одне посилання для всіх уроків
// Значки, які викладач видає вручну
// Медалі: [назва, емодзі, рівень: b — бронза, s — срібло, g — золото, p — особлива, розділ]. Рядок «назва емодзі» — id у базі.
const MEDALS = [
  ['Перший проєкт', '🚀', 'b', 'Курси'], ['Своя гра', '🎮', 's', 'Курси'], ['Свій сайт', '🌐', 's', 'Курси'], ['Python-майстер', '🐍', 'g', 'Курси'],
  ['Креатив', '🎨', 'b', 'Курси'], ['Монтажер', '🎬', 's', 'Курси'], ['Дизайнер', '🖌️', 's', 'Курси'], ['Аніматор', '🎞️', 's', 'Курси'],
  ['Робототехнік', '🤖', 'g', 'Курси'], ['3D-творець', '🧊', 's', 'Курси'], ['ШІ-дослідник', '🧠', 'g', 'Курси'],
  ['Логік', '🧩', 'b', 'Навички'], ['Дебагер', '🐞', 's', 'Навички'], ['Швидкі пальці', '⌨️', 'b', 'Навички'], ['Алгоритміст', '🔢', 'g', 'Навички'],
  ['Презентація', '🎤', 's', 'Навички'], ['Англійська в коді', '🔤', 'b', 'Навички'], ['Самостійність', '🧭', 's', 'Навички'],
  ['Старанність', '⭐', 's', 'Характер'], ['Наполегливість', '🧗', 'g', 'Характер'], ['Допитливість', '🔍', 'b', 'Характер'], ['Пунктуальність', '⏰', 'b', 'Характер'],
  ['Креативна ідея', '💡', 's', 'Характер'], ['Допомога іншим', '🤝', 's', 'Характер'], ['Сміливість', '🦸', 'g', 'Характер'], ['Великий прогрес', '📈', 'g', 'Характер'],
  ['Ідеальне ДЗ', '✅', 's', 'Характер'],
  ['Учень місяця', '👑', 'p', 'Особливі'], ['Олімпіада', '🥇', 'p', 'Особливі'], ['Хакатон', '🏁', 'p', 'Особливі'], ['Річниця навчання', '🎂', 'g', 'Особливі'],
  ['Привів друга', '🎟️', 'g', 'Особливі'], ['Друг Balan Study', '💙', 's', 'Особливі'],
  ['Перший урок', '🎉', 'b', 'Автоматичні'], ['10 уроків', '💪', 'b', 'Автоматичні'], ['25 уроків', '🏅', 's', 'Автоматичні'], ['50 уроків', '🏆', 'g', 'Автоматичні'],
  ['100 уроків', '👑', 'p', 'Автоматичні'], ['Серія 5', '🔥', 's', 'Автоматичні'], ['Серія 10', '⚡', 'g', 'Автоматичні'], ['Перше ДЗ', '📬', 'b', 'Автоматичні'],
  ['10 ДЗ', '📚', 'g', 'Автоматичні'], ['Рівень 5', '🌟', 's', 'Автоматичні'], ['Рівень 10', '💎', 'p', 'Автоматичні'], ['Щасливчик', '🍀', 's', 'Автоматичні'],
  ['Випускник', '🎓', 'g', 'Автоматичні'],
];
const MEDAL = Object.fromEntries(MEDALS.map(([n, e, t, c]) => [`${n} ${e}`, { n, e, t, c }]));
const BADGES = MEDALS.filter(m => m[3] !== 'Автоматичні').map(([n, e]) => `${n} ${e}`); // ті, що видає викладач
const medalOf = s => MEDAL[s] || { n: s.replace(/\s*\S+$/, '') || s, e: s.split(' ').pop(), t: 'b', c: 'Інші' };
const isManual = b => MEDAL[b]?.c !== 'Автоматичні';
// Колесо фортуни: раз на тиждень, якщо за останні 7 днів був урок. s — підпис на колесі, w — вага (шанс)
const PRIZES = [
  { s: '+10', t: '+10 XP', xp: 10, w: 22 }, { s: '+25', t: '+25 XP', xp: 25, w: 15 }, { s: '🎯', t: 'Тема уроку на вибір 🎯', w: 9 }, { s: '+15', t: '+15 XP', xp: 15, w: 20 },
  { s: '+50', t: '+50 XP', xp: 50, w: 6 }, { s: '⏱', t: '+10 хв до уроку ⏱', w: 0 }, { s: '🍀', t: 'Медаль «Щасливчик» 🍀 і +20 XP', xp: 20, lucky: true, w: 8 }, { s: '🎁', t: 'Сюрприз від викладача 🎁', w: 11 },
  // нові призи — лише в кінець: у базі зберігається індекс
  { s: '+70', t: '+70 XP', xp: 70, w: 5 }, { s: '🦄', t: 'Ріг єдинорога для персонажа 🦄', item: 'unicorn', w: 5 }, { s: '🌈', t: 'Веселкові крила для персонажа 🌈', item: 'rainbow', w: 5 },
];
const WHEEL = PRIZES.map((_, i) => i).filter(i => PRIZES[i].w > 0); // сектори колеса; призи з w: 0 лише показуються тим, хто їх виграв
// Рівень: 1→2 потрібно 100 XP, далі кожен рівень на 50 XP довший
function levelOf(xp) { let lvl = 1, need = 100, rest = xp; while (rest >= need) { rest -= need; lvl++; need += 50; } return { lvl, rest, need }; }
console.assert(levelOf(0).lvl === 1 && levelOf(100).lvl === 2 && levelOf(249).lvl === 2 && levelOf(250).lvl === 3, 'levelOf()');
const RANKS = ['Новачок', 'Учень', 'Дослідник', 'Винахідник', 'Майстер', 'Експерт', 'Гуру', 'Легенда'];
const rank = lvl => RANKS[Math.min(RANKS.length - 1, Math.floor((lvl - 1) / 2))];
const XP = { lesson: 10, hw: 15, medal: 5 };
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
const autoBadges = ({ present, best, hwOk = 0, lucky = false, certs = 0, lvl = 1 }) => [
  ...[[1, 'Перший урок 🎉'], [10, '10 уроків 💪'], [25, '25 уроків 🏅'], [50, '50 уроків 🏆'], [100, '100 уроків 👑']].filter(([n]) => present >= n),
  ...[[5, 'Серія 5 🔥'], [10, 'Серія 10 ⚡']].filter(([n]) => best >= n),
  ...[[1, 'Перше ДЗ 📬'], [10, '10 ДЗ 📚']].filter(([n]) => hwOk >= n),
  ...[[5, 'Рівень 5 🌟'], [10, 'Рівень 10 💎']].filter(([n]) => lvl >= n),
  ...(lucky ? [[0, 'Щасливчик 🍀']] : []), ...(certs ? [[0, 'Випускник 🎓']] : []),
].map(x => x[1]);
// Рівень і всі медалі учня: відвідування, зараховані ДЗ, медалі від викладача, бонуси колеса
function growth({ present = 0, best = 0, manual = [], subsList = [], spinsList = [], certs = [] }) {
  const hwOk = subsList.filter(x => x.status === 'ok').length;
  const bonus = spinsList.reduce((a, x) => a + (PRIZES[x.prize]?.xp || 0), 0);
  const xp = present * XP.lesson + hwOk * XP.hw + manual.length * XP.medal + bonus;
  const lv = levelOf(xp);
  const auto = autoBadges({ present, best, hwOk, lucky: spinsList.some(x => PRIZES[x.prize]?.lucky), certs: certs.length, lvl: lv.lvl });
  return { xp, hwOk, ...lv, medals: [...new Set([...manual, ...auto])] };
}
console.assert(growth({ present: 10, manual: ['Логік 🧩'], subsList: [{ status: 'ok' }, { status: 'new' }], spinsList: [{ prize: 6 }] }).xp === 100 + 15 + 5 + 20, 'growth()');

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

// ---------- Часові пояси: розклад ведеться за Києвом, показати можна в будь-якому поясі ----------
const HOUR = 3600000;
const validTz = z => { try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch { return false; } };
const BASE_TZ = validTz('Europe/Kyiv') ? 'Europe/Kyiv' : 'Europe/Kiev'; // старі браузери знають лише Kiev
const norm = z => z === 'Europe/Kiev' || z === 'Europe/Kyiv' ? BASE_TZ : z;
const tzFmt = {};
function tzParts(z, t) {
  const f = tzFmt[z] ||= new Intl.DateTimeFormat('en-CA', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(t).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const offMin = (z, t) => { const p = tzParts(z, t); return Math.round((Date.parse(p.date + 'T00:00Z') + p.min * 60000 - t) / 60000); };
// момент часу для «дата + хвилина доби» в поясі z (друга ітерація — на випадок переходу на літній час)
const instant = (date, min, z) => { const g = Date.parse(date + 'T00:00Z') + min * 60000; return g - offMin(z, g - offMin(z, g) * 60000) * 60000; };
const hm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const gmt = z => { const o = offMin(z, Date.now()), a = Math.abs(o); return 'GMT' + (o ? (o < 0 ? '-' : '+') + Math.floor(a / 60) + (a % 60 ? ':' + pad(a % 60) : '') : ''); };
console.assert(instant('2026-01-05', 18 * 60, BASE_TZ) === Date.parse('2026-01-05T16:00Z') && instant('2026-07-06', 18 * 60, BASE_TZ) === Date.parse('2026-07-06T15:00Z')
  && tzParts('Asia/Kolkata', Date.parse('2026-01-05T16:00Z')).min === 21 * 60 + 30 && tzParts('America/New_York', Date.parse('2026-01-05T03:00Z')).date === '2026-01-04', 'tz');
// Українські назви, щоб знаходилось і «Варшава», і «Warsaw»
const TZ_UK = { 'Europe/Warsaw': 'Варшава Польща', 'Europe/Berlin': 'Берлін Німеччина', 'Europe/Prague': 'Прага Чехія', 'Europe/London': 'Лондон Велика Британія Англія',
  'Europe/Dublin': 'Дублін Ірландія', 'Europe/Paris': 'Париж Франція', 'Europe/Madrid': 'Мадрид Іспанія', 'Europe/Rome': 'Рим Італія', 'Europe/Lisbon': 'Лісабон Португалія',
  'Europe/Vienna': 'Відень Австрія', 'Europe/Amsterdam': 'Амстердам Нідерланди', 'Europe/Brussels': 'Брюссель Бельгія', 'Europe/Zurich': 'Цюрих Швейцарія',
  'Europe/Stockholm': 'Стокгольм Швеція', 'Europe/Oslo': 'Осло Норвегія', 'Europe/Copenhagen': 'Копенгаген Данія', 'Europe/Helsinki': 'Гельсінкі Фінляндія',
  'Europe/Tallinn': 'Таллінн Естонія', 'Europe/Riga': 'Рига Латвія', 'Europe/Vilnius': 'Вільнюс Литва', 'Europe/Bucharest': 'Бухарест Румунія', 'Europe/Chisinau': 'Кишинів Молдова',
  'Europe/Budapest': 'Будапешт Угорщина', 'Europe/Bratislava': 'Братислава Словаччина', 'Europe/Sofia': 'Софія Болгарія', 'Europe/Athens': 'Афіни Греція',
  'Europe/Istanbul': 'Стамбул Туреччина', 'Asia/Tbilisi': 'Тбілісі Грузія', 'Asia/Dubai': 'Дубай ОАЕ Емірати', 'Asia/Jerusalem': 'Єрусалим Ізраїль',
  'America/New_York': 'Нью-Йорк США', 'America/Chicago': 'Чикаго США', 'America/Denver': 'Денвер США', 'America/Los_Angeles': 'Лос-Анджелес США',
  'America/Toronto': 'Торонто Канада', 'America/Vancouver': 'Ванкувер Канада', 'America/Edmonton': 'Едмонтон Канада', 'Australia/Sydney': 'Сідней Австралія',
  'Asia/Tokyo': 'Токіо Японія', 'Asia/Shanghai': 'Шанхай Пекін Китай', 'Asia/Kolkata': 'Колката Індія', 'Asia/Almaty': 'Алмати Казахстан', 'Asia/Bangkok': 'Бангкок Таїланд' };
const LOCAL_TZ = norm(Intl.DateTimeFormat().resolvedOptions().timeZone);
const tzName = z => z === BASE_TZ ? 'Київ' : (TZ_UK[z] || '').split(' ')[0] || z.split('/').pop().replace(/_/g, ' ');
let tz = BASE_TZ;
try { const t = localStorage.getItem('rozklad-tz'); if (t && validTz(t)) tz = norm(t); } catch {}

const configured = !!(window.FIREBASE_CONFIG && FIREBASE_CONFIG.projectId);
let lessons = {}, changes = {}, students = {}, attendance = {}, payments = {}, requests = {}, notes = {}, photos = {}, mePhotos = {}, msgs = {}, meMsgs = {};
// ДЗ на перевірку, колесо, персонажі, сповіщення (subs/spins/avatars — у викладача по всіх учнях, me* — в учня свої)
let subs = {}, spins = {}, avatars = {}, meSubs = {}, meSpins = {}, meNotifs = {}, meAvatar = {};
// Відгуки про уроки (ratings) і публічне портфоліо (?p=код портфоліо, окремий від коду кабінету)
let ratings = {}, meRatings = {}, folio = null, folioWorks = {};
// Хто з учнів зараз у кабінеті: токен → час останнього «я тут» (кабінет пише раз на хвилину)
let presence = {};
const ONLINE_MS = 150000;
function onlineDot(n) {
  const tok = students[n]?.token;
  if (!tok) return '';
  const at = presence[tok] || 0, on = Date.now() - at < ONLINE_MS;
  const t = on ? 'У мережі' : at ? `Не в мережі · був(ла) ${new Date(at).toLocaleString('uk', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Не в мережі';
  return ` <i class="online${on ? ' on' : ''}" title="${t}" aria-label="${t}"></i>`;
}
const folioId = new URLSearchParams(location.search).get('p');
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
const errText = e => e?.code === 'permission-denied'
  ? 'Немає доступу. Якщо щойно змінювались правила — опублікуй firestore.rules у Firebase і зачекай хвилину'
  : 'Помилка: ' + e.message;
const run = p => p.catch(e => toast(errText(e)));

// Розклад на конкретну дату: постійні заняття + разові зміни (changes)
function slotsOn(date) {
  const d = dayIdx(parseIso(date)), res = {};
  for (const h of HOURS) if (lessons[`${d}-${h}`]) res[h] = { student: lessons[`${d}-${h}`], kind: 'regular' };
  for (const [id, c] of Object.entries(changes)) {
    if (c.date !== date) continue;
    if (c.kind === 'trial' && c.done) continue; // проведений пробний знімається з розкладу, лишається в «Заявки → Пробні»
    if (c.kind === 'cancel') { if (res[c.hour]?.kind === 'regular') Object.assign(res[c.hour], { cancelled: id, to: c.to }); }
    else res[c.hour] = { student: c.student, kind: c.kind, id, from: c.from, note: c.note };
  }
  return res;
}

function chip(s, q) {
  if (s.kind === 'busy') return `<span class="chip k-busy${q ? ' dim' : ''}"><span>⛔ Зайнято</span>${isTeacher && s.note ? `<em>${esc(s.note)}</em>` : ''}</span>`;
  const dim = q && !s.student.toLowerCase().includes(q) ? ' dim' : '';
  const tag = s.cancelled ? `<em>${s.to ? '→ ' + shortSlot(s.to) : 'скасовано'}</em>`
    : s.kind !== 'regular' ? `<em>${KIND[s.kind]}</em>` : '';
  return `<span class="chip k-${s.kind}${s.cancelled ? ' off' : ''}${dim}" style="--h:${hue(s.student)}"><span>${esc(s.student)}</span>${tag}</span>`;
}

// ---------- Публічна частина ----------
// Тиждень в обраному поясі: клітинка (дата, хвилина доби) → київський слот (date, h).
// data-date/data-hour у клітинках лишаються київськими, тому редагування й заявки працюють як раніше.
function viewWeek() {
  const dates = DAYS.map((_, i) => addDays(week, i)), cells = {}, rows = new Set();
  for (let i = -1; i < 8; i++) {
    const d = addDays(week, i);
    for (const h of HOURS) {
      const t = instant(d, h * 60, BASE_TZ), v = tzParts(tz, t);
      if (!dates.includes(v.date)) continue;
      cells[`${v.date} ${v.min}`] = { date: d, h, t };
      rows.add(v.min);
    }
  }
  return { dates, cells, rows: [...rows].sort((a, b) => a - b) };
}

function renderGrid(q, v, on) {
  const now = Date.now(), cur = tzParts(tz, now);
  const free = document.body.classList.contains('free');
  const tag = isTeacher || free ? 'button' : 'div';
  let html = '<div class="cell corner">Час</div>' + v.dates.map((dt, i) =>
    `<div class="cell head${dt === cur.date ? ' today' : ''}">${DAYS[i]}<small>${longDate(dt)}</small></div>`).join('');
  for (const m of v.rows) {
    html += `<div class="cell time${cur.min >= m && cur.min < m + 60 ? ' now' : ''}">${hm(m)} – ${hm(m + 60)}</div>`;
    for (const dt of v.dates) {
      const c = v.cells[`${dt} ${m}`];
      if (!c) { html += '<div class="cell slot none"></div>'; continue; }
      const s = on(c.date)[c.h], past = now >= c.t;
      const isFree = free && !past && (!s || s.cancelled);
      const cls = `cell slot${dt === cur.date ? ' today' : ''}${past && now < c.t + HOUR ? ' live' : ''}${isFree ? ' open' : ''}`;
      html += `<${tag} class="${cls}" data-date="${c.date}" data-hour="${c.h}"${tag === 'button' && free && !isFree && !isTeacher ? ' disabled' : ''}>${s ? chip(s, q) : ''}</${tag}>`;
    }
  }
  $('#grid').innerHTML = html;
}

// Телефон: стрічка днів + список обраного дня (замість широкої таблиці)
let mDay = 0;
const resetDay = () => { const t = tzParts(tz, Date.now()).date; mDay = week <= t && t < addDays(week, 7) ? dayIdx(parseIso(t)) : 0; };
resetDay();
function renderAgenda(q, v, on) {
  const now = Date.now(), today = tzParts(tz, now).date;
  const free = document.body.classList.contains('free');
  const day = dt => v.rows.map(m => ({ m, c: v.cells[`${dt} ${m}`] })).filter(r => r.c).map(r => ({ ...r, s: on(r.c.date)[r.c.h] }));
  const strip = v.dates.map((dt, i) => {
    const n = day(dt).filter(r => r.s && !r.s.cancelled).length;
    return `<button class="dchip${i === mDay ? ' on' : ''}${dt === today ? ' today' : ''}" data-i="${i}" aria-label="${DAYS[i]}">
      <small>${SHORT[i]}</small><b>${parseIso(dt).getDate()}</b><i>${n ? n + ' зан.' : '—'}</i></button>`;
  }).join('');
  const dt = v.dates[mDay];
  const rows = day(dt).filter(r => isTeacher || free || r.s).map(({ m, c, s: x }) => {
    const past = now >= c.t, live = past && now < c.t + HOUR;
    const open = free && !past && (!x || x.cancelled);
    const tag = isTeacher || open ? 'button' : 'div';
    const hint = open ? 'вільно · записатися' : isTeacher && !x ? '+ додати' : '';
    return `<${tag} class="drow${live ? ' live' : ''}${open ? ' open' : ''}${past ? ' past' : ''}" data-date="${c.date}" data-hour="${c.h}">
      <time>${hm(m)}</time>${x ? chip(x, q) : `<span class="hint">${hint}</span>`}</${tag}>`;
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
  const all = DAYS.map((_, i) => Object.values(slotsOn(addDays(week, i)))).flat().filter(s => !s.cancelled && s.kind !== 'busy');
  $('#stats').innerHTML = `<div><b>${all.length}</b><small>занять цього тижня</small></div>
    <div><b>${new Set(all.filter(s => s.kind !== 'trial').map(s => s.student)).size}</b><small>учнів</small></div>
    <div><b>1:1</b><small>індивідуально</small></div>`;
}

// Мої заняття на найближчі дні (з урахуванням переносів), t — момент початку
function myLessons(days) {
  const out = [], now = Date.now(), start = tzParts(BASE_TZ, now).date;
  for (let i = 0; i < days; i++) {
    const dt = addDays(start, i), s = slotsOn(dt);
    for (const h of Object.keys(s).map(Number).sort((a, b) => a - b)) {
      const t = instant(dt, h * 60, BASE_TZ);
      if (s[h].student === me.name && t + HOUR > now) out.push({ ...s[h], dt, h, t });
    }
  }
  return out;
}
const whenText = t => { const v = tzParts(tz, t); return `${DAYS[dayIdx(parseIso(v.date))]}, ${longDate(v.date)} · ${hm(v.min)}`; };
const kyivNote = h => tz === BASE_TZ ? '' : `за Києвом ${pad(h)}:00`;
const histList = list => list.length ? `<ul>${list.map(x => `<li><span>${longDate(x.date)}${x.hour != null ? `, ${hm(tzParts(tz, instant(x.date, x.hour * 60, BASE_TZ)).min)}` : ''}${ratingFor(x) ? ` <b class="rated">${'★'.repeat(ratingFor(x).stars)}</b>` : ''}</span>
  ${x.kind && x.kind !== 'regular' ? `<span class="tag k-${x.kind}">${KIND[x.kind]}</span>` : ''}
  ${x.status === 'present' && !ratingFor(x) ? `<button class="rate-btn" data-rate="${esc(rkey(x))}">☆ Оцінити</button>` : ''}
  <b class="st ${x.status}">${LABEL[x.status]}</b></li>`).join('')}</ul>` : '<p class="muted">Ще немає відміток</p>';

function renderMe() {
  const box = $('#me');
  if (!me) { box.hidden = true; return; }
  box.hidden = false;
  const up = myLessons(28), next = up.find(x => !x.cancelled), nv = next && tzParts(tz, next.t);
  const r = me.remaining ?? 0, paid = me.paid || 0;
  const pct = paid > 0 ? Math.max(0, Math.min(100, r / paid * 100)) : 0;
  // Кнопка Meet: за 10 хв до початку і до кінця уроку
  const mins = next ? (next.t - Date.now()) / 60000 : null;
  const live = next && mins <= 10 && mins > -60;
  const join = live
    ? `<a class="btn join" href="${MEET}" target="_blank" rel="noopener">🎥 ${mins > 0 ? `Приєднатися · старт через ${Math.ceil(mins)} хв` : 'Приєднатися до уроку'}</a>`
    : next ? `<p class="muted small">Кнопка входу на урок з'явиться тут за 10 хв до початку</p>` : '';
  const hw = (me.notes || []).find(x => x.homework), last = (me.notes || [])[0];
  const g = myGrowth();
  $('#meHi').innerHTML = `
    <span class="av-face">${avatarSvg(meAv(), g.lvl, 56)}</span>
    <div><h2>Привіт, ${esc(me.name)}!</h2><p class="muted">Твій кабінет учня</p></div>
    <button class="x" id="forget" title="Це не я" aria-label="Закрити кабінет">✕</button>`;
  $('#meMain').innerHTML = `
    <div class="me-body">
      <div class="ring${r <= 0 ? ' bad' : r <= 2 ? ' warn' : ''}" style="--p:${pct}">
        <strong>${r}</strong><small>${r === 1 ? 'урок' : r >= 2 && r <= 4 ? 'уроки' : 'уроків'}<br>залишилось</small>
      </div>
      <div class="me-next">
        <p class="label">Наступне заняття</p>
        ${next ? `<p class="when">${DAYS[dayIdx(parseIso(nv.date))]}, ${longDate(nv.date)}<b>${hm(nv.min)}</b></p>
          ${tz !== BASE_TZ ? `<p class="muted small">${esc(tzName(tz))} · ${kyivNote(next.h)}</p>` : ''}
          ${next.kind !== 'regular' ? `<span class="tag k-${next.kind}">${KIND[next.kind]}</span>` : ''}`
          : '<p class="when">Поки не заплановано</p>'}
        ${join}
        <p class="muted">Оплачено уроків: ${paid}${r <= 1 ? ' · <b class="bad">час поповнити абонемент</b>' : ''}</p>
      </div>
      <div class="me-hist">
        <p class="label">Останні заняття</p>
        ${histList((me.history || []).slice(0, 5))}
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
        <p class="label">🏆 Мій рівень</p>
        ${lvlHtml(g)}
        ${me.streak ? `<p class="streak">🔥 <b>${me.streak}</b> ${plural(me.streak, 'урок', 'уроки', 'уроків')} поспіль без пропусків</p>` : ''}
        ${g.medals.length ? `<div class="medals">${g.medals.slice(-6).map(b => medalHtml(b, 'mini')).join('')}</div>`
          : '<p class="muted small">Перша медаль — після першого уроку 🎉</p>'}
      </div>
    </div>`;
  $('#meLessons').innerHTML = `<div class="me-hist">
      <p class="label">Найближчі 4 тижні${tz !== BASE_TZ ? ` · час: ${esc(tzName(tz))}` : ''}</p>
      ${up.length ? `<ul>${up.map(x => `<li${x.cancelled ? ' class="off"' : ''}><span>${whenText(x.t)}${tz !== BASE_TZ ? ` <small class="muted">(${kyivNote(x.h)})</small>` : ''}</span>
        ${x.cancelled ? `<b class="st absent">${x.to ? 'перенесено' : 'скасовано'}</b>` : x.kind !== 'regular' ? `<span class="tag k-${x.kind}">${KIND[x.kind]}</span>` : ''}</li>`).join('')}</ul>`
        : '<p class="muted">Поки нічого не заплановано</p>'}
      <p class="label lbl-gap">Історія відвідувань</p>
      ${histList(me.history || [])}
    </div>`;
  const ns = me.notes || [];
  $('#meHw').innerHTML = ns.length ? ns.map(x => {
    const mine = Object.values(meSubs).filter(y => y.hw === x.date).sort((a, b) => ms(a.created) - ms(b.created)), lastSub = mine.at(-1);
    return `<div class="hw-item">
      <p class="muted small"><b>${longDate(x.date)}</b>${x.topic ? ' · тема: ' + esc(x.topic) : ''}</p>
      ${x.homework ? `<p class="hw-text">${esc(x.homework)}</p>` : '<p class="muted small">Без домашнього завдання</p>'}
      ${mine.map(subLine).join('')}
      ${x.homework && (!lastSub || lastSub.status === 'redo') ? `<button class="btn sm" data-submit="${x.date}">📤 ${lastSub ? 'Надіслати ще раз' : 'Здати ДЗ'}</button>` : ''}</div>`;
  }).join('')
    : '<p class="muted">Тут з\'являться теми уроків і домашні завдання</p>';
  $('#forget').onclick = forget;
  renderMeChat();
  renderAwards(g);
  renderAvatarTab(g);
  renderFriends();
  renderRate();
  renderPhotoGrid($('#photoGrid'), token, mePhotos, false);
}

// ---------- Чат учень ↔ викладач: public/{код}/messages ----------
const byTime = list => list.sort((a, b) => ms(a.created) - ms(b.created));
const msgText = m => m.text || { image: '📷 Фото', file: '📎 ' + (m.name || 'Файл'), voice: '🎤 Голосове' }[m.kind] || '';
function loadMsgData(tok, id) {
  if (imgCache[id]) return;
  imgCache[id] = 'loading';
  F.getDoc(F.doc(db, 'public', tok, 'msgData', id)).then(d => {
    const src = d.data()?.data;
    imgCache[id] = isData(src) ? src : 'none';
    render();
  }).catch(() => { imgCache[id] = 'none'; });
}
function msgAtt(m, tok) {
  if (!m.file || !tok) return '';
  loadMsgData(tok, m.file);
  const src = imgCache[m.file];
  if (src === 'none') return '<i>Файл недоступний</i>';
  if (!src || src === 'loading') return '<div class="ph-wait msg-wait"></div>';
  if (m.kind === 'image' && src.startsWith('data:image/')) return `<a href="${src}" target="_blank"><img class="msg-img" src="${src}" alt="${esc(m.name || 'Фото')}"></a>`;
  if (m.kind === 'voice') return `<audio controls preload="metadata" src="${src}"></audio>`;
  return `<a class="msg-file" href="${src}" download="${esc(m.name || 'file')}">📎 ${esc(m.name || 'Файл')}</a>`;
}
function renderMsgs(el, list, mine, key, tok) {
  const stick = el.scrollHeight - el.scrollTop - el.clientHeight < 60 || el.dataset.k !== key + list.length;
  let day = '';
  const html = list.length ? list.map((m, i) => {
    const t = new Date(ms(m.created) || Date.now()), d = iso(t);
    const sep = d !== day ? `<p class="chat-day">${longDate(d)}</p>` : '';
    day = d;
    return `${sep}<div class="msg${m.by === mine ? ' mine' : ''}${list[i + 1]?.by !== m.by || iso(new Date(ms(list[i + 1].created))) !== d ? ' tail' : ''}">${m.by === mine && m.id ? `<button class="msg-del" data-delmsg="${m.id}" title="Скасувати повідомлення" aria-label="Скасувати повідомлення">✕</button>` : ''}${msgAtt(m, tok)}${esc(m.text || '')}<small>${t.toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' })}</small></div>`;
  }).join('') : `<p class="empty">${mine === 'student' ? 'Напиши викладачу: питання про урок, ДЗ чи перенос заняття.' : 'Ще немає повідомлень'}</p>`;
  // перемальовуємо лише при змінах — інакше голосове обривається на кожному оновленні
  if (el._html !== html) el.innerHTML = el._html = html;
  if (stick) el.scrollTop = el.scrollHeight;
  el.dataset.k = key + list.length;
}

let meSeen = 0; // час останнього прочитаного повідомлення (у цьому браузері)
function renderMeChat() {
  const list = byTime(Object.entries(meMsgs).map(([id, m]) => ({ ...m, id })));
  if (!$('#tab-me-chat').hidden && list.length && ms(list.at(-1).created) > meSeen) {
    meSeen = ms(list.at(-1).created);
    try { localStorage.setItem('rozklad-chat-' + token, meSeen); } catch {}
  }
  const unread = list.filter(m => m.by === 'teacher' && ms(m.created) > meSeen).length;
  $('#meUnread').hidden = !unread;
  $('#meUnread').textContent = unread;
  renderMsgs($('#meChat'), list, 'student', '', token);
}

let chatName = null;
function renderChats() {
  const byTok = {};
  for (const [id, m] of Object.entries(msgs)) (byTok[m.token] ||= []).push({ ...m, id });
  const people = Object.entries(students).filter(([n, st]) => st.token && !isArchived(n)).map(([n, st]) => {
    const list = byTime(byTok[st.token] || []);
    return { n, list, last: list.at(-1), unread: list.filter(m => m.by === 'student' && ms(m.created) > (st.seenChat || 0)).length };
  }).sort((a, b) => ms(b.last?.created) - ms(a.last?.created) || a.n.localeCompare(b.n, 'uk'));
  const total = people.reduce((s, p) => s + p.unread, 0);
  $('#chatCount').hidden = !total;
  $('#chatCount').textContent = total;
  if (!people.some(p => p.n === chatName)) chatName = people[0]?.n || null;
  $('#chatList').innerHTML = people.length ? people.map(p => `<button class="chat-item${p.n === chatName ? ' on' : ''}" data-chat="${esc(p.n)}">
      ${faceOf(p.n)}
      <span><b>${esc(p.n)}</b>${onlineDot(p.n)}<small>${p.last ? (p.last.by === 'teacher' ? 'Ви: ' : '') + esc(msgText(p.last)) : 'Ще немає повідомлень'}</small></span>
      ${p.unread ? `<b class="n">${p.unread}</b>` : ''}</button>`).join('')
    : '<p class="empty">Чат з\'являється, коли в учня є кабінет: «Учні» → «+ Кабінет учня».</p>';
  const cur = people.find(p => p.n === chatName);
  $('#chatWith').textContent = cur ? `Чат: ${cur.n}` : '';
  $('#tChatForm').hidden = !cur;
  renderMsgs($('#tChat'), cur?.list || [], 'teacher', chatName, students[chatName]?.token);
  // прочитано, коли розмова відкрита; max — щоб розбіжність годинників не зациклила запис
  if (cur?.unread && !$('#tab-chats').hidden && document.visibilityState === 'visible')
    run(F.setDoc(F.doc(db, 'students', cur.n), { seenChat: Math.max(Date.now(), ms(cur.last.created) + 1) }, { merge: true }));
}

// Вкладення: дані — у msgData (як photoData у фото), у повідомленні лише kind/name/file
async function postMsg(tok, by, text, att) {
  const extra = att ? { kind: att.kind, name: att.name, file: (await F.addDoc(F.collection(db, 'public', tok, 'msgData'), { data: att.data })).id } : {};
  await F.addDoc(F.collection(db, 'public', tok, 'messages'), { by, text, created: F.serverTimestamp(), ...extra });
}
const chatAtt = new Map(); // форма → вкладення, що чекає на «Надіслати»
function setAtt(form, a) {
  a ? chatAtt.set(form, a) : chatAtt.delete(form);
  const box = form.querySelector('.att');
  box.hidden = !a;
  box.innerHTML = a ? `${a.kind === 'image' ? `<img src="${a.data}" alt="">` : '📎'}<span>${esc(a.name)}</span><button type="button" class="x" data-unatt aria-label="Прибрати">✕</button>` : '';
}
async function attach(form, file) {
  try {
    const kind = /^image\/(jpeg|png|webp|heic|heif|bmp)$/.test(file.type) ? 'image' : 'file';
    setAtt(form, { kind, name: (file.name || 'image.jpg').slice(0, 200), data: kind === 'image' ? await compress(file) : await readData(file) });
    form.elements['text'].focus();
  } catch (e) { toast('Не додано: ' + e.message); }
}
function sendMsg(form, tok, by) {
  const ta = form.elements['text'], text = ta.value.trim().slice(0, 1000), att = chatAtt.get(form);
  if ((!text && !att) || !tok || !configured || !F) return;
  ta.value = ''; ta.style.height = '';
  setAtt(form, null);
  postMsg(tok, by, text, att).catch(e => { ta.value ||= text; if (att) setAtt(form, att); toast('Не надіслано: ' + e.message); });
}
// Голосове: перше натискання — запис, друге — надіслати (до 3 хв, щоб влізти в документ Firestore)
let rec = null;
async function voice(btn, tok, by) {
  if (rec) return rec.stop();
  if (!tok || !F) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Цей браузер не вміє записувати голос');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('Немає доступу до мікрофона'); }
  const icon = btn.innerHTML, chunks = [], t0 = Date.now(), r = rec = new MediaRecorder(stream, { audioBitsPerSecond: 24000 }), cancelBtn = btn.form.querySelector('[data-voicecancel]');
  r.ondataavailable = e => e.data.size && chunks.push(e.data);
  const tick = setInterval(() => {
    const sec = (Date.now() - t0) / 1000 | 0;
    btn.textContent = `⏹ ${sec / 60 | 0}:${String(sec % 60).padStart(2, '0')}`;
    if (sec >= 180 && r.state === 'recording') r.stop();
  }, 250);
  r.onstop = () => {
    clearInterval(tick); stream.getTracks().forEach(t => t.stop());
    rec = null; btn.innerHTML = icon; btn.classList.remove('rec'); cancelBtn.hidden = true;
    if (r.cancelled) return toast('Запис скасовано');
    if (Date.now() - t0 < 1000 || !chunks.length) return toast('Запис закороткий');
    const fr = new FileReader();
    fr.onload = () => fr.result.length > 890000 ? toast('Запис завеликий, спробуй коротше')
      : postMsg(tok, by, '', { kind: 'voice', name: 'voice', data: fr.result }).catch(e => toast('Не надіслано: ' + e.message));
    fr.readAsDataURL(new Blob(chunks, { type: chunks[0].type || r.mimeType || 'audio/webm' }));
  };
  r.start(1000);
  btn.classList.add('rec');
  cancelBtn.hidden = false;
}

// ---------- Фото (учень завантажує на своїй сторінці, викладач бачить у «Учнях») ----------
// Картинки лежать окремо (photoData), щоб список фото був легким
// Дані з бази пише учень — пропускаємо лише чистий base64 data:, щоб у src/href не пролізли лапки й атрибути
const isData = v => typeof v === 'string' && /^data:[\w.+-]+\/[\w.+-]+(;[\w.+-]+=[\w.+-]+)*;base64,[A-Za-z0-9+/=]+$/.test(v);
function loadImg(tok, id) {
  if (imgCache[id]) return;
  imgCache[id] = 'loading';
  F.getDoc(F.doc(db, 'public', tok, 'photoData', id)).then(d => {
    const src = d.data()?.image;
    imgCache[id] = isData(src) && src.startsWith('data:image/') ? src : 'none';
    render();
    if ($('#photoDlg').open) openPhotos($('#photoDlg').dataset.name);
  }).catch(() => { imgCache[id] = 'none'; });
}
const ms = t => t?.toMillis ? t.toMillis() : 0;
function renderPhotoGrid(el, tok, list, canDelete, pubs) {
  const items = Object.entries(list).sort((a, b) => ms(b[1].created) - ms(a[1].created));
  el.innerHTML = items.length ? items.map(([id, p]) => {
    loadImg(tok, id);
    const src = imgCache[id];
    return `<figure>${src && src.startsWith('data:') ? `<a href="${src}" target="_blank"><img src="${src}" alt="${esc(p.caption || 'Фото')}" loading="lazy"></a>` : '<div class="ph-wait"></div>'}
      <figcaption>${p.caption ? esc(p.caption) + ' · ' : ''}${p.created ? new Date(ms(p.created)).toLocaleDateString('uk', { day: 'numeric', month: 'short' }) : 'щойно'}</figcaption>
      ${pubs ? `<button class="ghost link-btn pub${pubs.includes(id) ? ' has' : ''}" data-pub="${id}" data-tok="${esc(tok)}">${pubs.includes(id) ? '✓ У портфоліо' : '🌐 В портфоліо'}</button>` : ''}
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
  renderPhotoGrid($('#photoDlgGrid'), st.token, list, true, st.pubWorks || []);
  if (!dlg.open) {
    dlg.showModal();
    run(F.setDoc(F.doc(db, 'students', name), { seenPhotos: Date.now() }, { merge: true }));
  }
}

// Вихід з кабінету: забуваємо код і перезавантажуємо без нього (щоб зупинити підписки)
function forget() {
  try { localStorage.removeItem('rozklad-token'); localStorage.removeItem('rozklad-login'); } catch {}
  location.href = location.pathname + '#profile';
}

// ---------- Нижнє меню на телефоні: екрани Розклад / Чат / Профіль / Налаштування ----------
// Екран у викладача: 'tab:marks' — його кабінет з однією вкладкою на весь екран
const VIEWS = ['schedule', 'chat', 'profile', 'settings', 'tab:marks', 'tab:students', 'tab:chats', 'tab:hw', 'tab:stats', 'tab:requests'];
let meMissing = false, curView = 'schedule';
function setView(v) {
  curView = v;
  document.body.dataset.view = v.startsWith('tab:') ? 'tab' : v;
  history.replaceState(null, '', location.pathname + location.search + (v === 'schedule' ? '' : '#' + v));
  const tl = $('#me .tabs');
  if (v.startsWith('tab:')) showTab($('#panel .tabs'), v.slice(4));
  else if (v === 'chat') showTab(tl, 'me-chat');
  else if (v === 'profile' && !$('#tab-me-chat').hidden) showTab(tl, 'me-home');
  else render();
  scrollTo(0, 0);
}
const NAV_ICON = {
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chat: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1-4.2A8 8 0 1 1 20 12Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  gear: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  check: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12 3 3 5-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const cnt = id => $(id).hidden ? 0 : +$(id).textContent || 0;
function renderNav() {
  const teacherNav = isTeacher && !me;
  const items = teacherNav
    ? [['schedule', 'cal', 'Розклад'], ['tab:marks', 'check', 'Відмітки'], ['tab:students', 'users', 'Учні'], ['tab:chats', 'chat', 'Чати', cnt('#chatCount')],
       ['settings', 'more', 'Ще', cnt('#hwCount') + cnt('#reqCount')]]
    : [['schedule', 'cal', 'Розклад'], ['chat', 'chat', 'Чат', cnt('#meUnread')], ['profile', 'user', 'Профіль'], ['settings', 'gear', 'Налаштування']];
  const active = ['tab:hw', 'tab:stats', 'tab:requests'].includes(curView) ? 'settings' : curView;
  $('.bnav').innerHTML = items.map(([v, i, t, n]) => `<button data-view="${v}"${v === active ? ' class="on"' : ''}><svg viewBox="0 0 24 24">${NAV_ICON[i]}</svg>${t}${n ? `<b>${n}</b>` : ''}</button>`).join('');
  $('#signin').hidden = !!me || teacherNav;
  $('#signinErr').hidden = !(token && meMissing);
  $('#setTitle').textContent = teacherNav ? 'Ще' : 'Налаштування';
  const perm = 'Notification' in window ? { granted: 'увімкнено', denied: 'заблоковано в браузері' }[Notification.permission] || 'вимкнено' : 'не підтримується';
  $('#setList').innerHTML = [
    teacherNav && ['go:tab:hw', '📬', 'ДЗ на перевірку', cnt('#hwCount') ? `нових ${cnt('#hwCount')}` : ''],
    teacherNav && ['go:tab:requests', '📝', 'Заявки', cnt('#reqCount') ? `нових ${cnt('#reqCount')}` : ''],
    teacherNav && ['go:tab:stats', '📊', 'Статистика', ''],
    ['notif', '🔔', 'Сповіщення на пристрої', perm],
    ['theme', '🌓', 'Тема', darkNow() ? 'Темна' : 'Світла'],
    ['tz', '🌍', 'Часовий пояс', tz === BASE_TZ ? 'Київ' : `${tzName(tz)} · ${gmt(tz)}`],
    installEvt && ['install', '📲', 'Встановити як застосунок', ''],
    me && ['logout', '🚪', 'Вийти з кабінету', me.name],
    ['teacher', '🎓', $('#login').textContent, ''],
  ].filter(Boolean).map(([a, i, t, v]) => `<button data-set="${a}"><span>${i}</span><b>${esc(t)}</b><small>${esc(v)}</small><i>›</i></button>`).join('');
}

function render() {
  if (folioId) return renderFolio();
  $('#trialBtn').hidden = !!me;
  $('#refHi').hidden = !myRef() || !!me || isTeacher;
  const q = $('#search').value.trim().toLowerCase(), v = viewWeek(), memo = {}, on = d => memo[d] ||= slotsOn(d);
  $('#tzLabel').textContent = tz === BASE_TZ ? 'Київський час' : `${tzName(tz)} · ${gmt(tz)}`;
  $('#tzBtn').classList.toggle('on', tz !== BASE_TZ);
  renderWeek();
  renderGrid(q, v, on);
  renderAgenda(q, v, on);
  renderMe();
  if (isTeacher) renderTeacher();
  renderNav();
  renderBell();
}

// ---------- Кабінет викладача ----------
// Учні, що «Завершили навчання», не показуються у відмітках, підказках і основному списку
const isArchived = n => !!students[n]?.archived;
function allNames() {
  return [...new Set([...Object.keys(students), ...Object.values(lessons)])].filter(n => !isArchived(n)).sort((a, b) => a.localeCompare(b, 'uk'));
}
function recordsBy() {
  const m = {};
  for (const [id, r] of Object.entries(attendance)) (m[r.student] ||= []).push({ ...r, id });
  for (const l of Object.values(m)) l.sort((a, b) => (b.date + pad(b.hour ?? 0)).localeCompare(a.date + pad(a.hour ?? 0)) || (b.id || '').localeCompare(a.id || ''));
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
  renderChats();
  renderSubs();
  renderNewRevs();
  if ($('#awardDlg').open) openAwards($('#awardDlg').dataset.name);
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
    if (s.kind === 'busy' || s.kind === 'trial') continue; // пробний закривається у своєму вікні, не абонементом
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
        <small>${when} · <span class="${r <= 0 ? 'bad' : r <= 2 ? 'warn' : ''}">залишилось ${r}</span>${rateOf(n, date) ? ` · <b class="rated" title="Оцінка учня">${'★'.repeat(rateOf(n, date).stars)}</b>` : ''}</small>
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
    const g = growthOf(n, recs), spin = st.token && Object.values(spins).find(x => x.token === st.token && x.week === weekKey());
    return `<article class="stu${r <= 0 ? ' over' : r <= 3 ? ' low' : ''}">
      ${faceOf(n, g.lvl)}
      <div class="info">
        <b>${esc(n)}</b> <span class="lvl-chip" title="${g.xp} XP">рів. ${g.lvl}</span>${onlineDot(n)}${pr.streak >= 3 ? ` <span class="streak-mini" title="Уроків поспіль без пропусків">🔥${pr.streak}</span>` : ''}
        <small>${sched(n) || 'немає в розкладі'}</small>
        ${last.length ? `<div class="dots" aria-label="Останні уроки"><small>Уроки</small>${last.map(x => `<i class="${x.status}" title="${longDate(x.date)} · ${LABEL[x.status]}">${{ present: '✓', absent: '✕', excused: '↻' }[x.status] || ''}</i>`).join('')}</div>` : ''}
        <div class="medals">${g.medals.map(b => medalHtml(b, 'mini')).join('')}</div>
        ${spin ? `<small>🎡 Колесо цього тижня: <b>${esc(PRIZES[spin.prize]?.t || '')}</b></small>` : ''}
        ${refLine(n, st)}
      </div>
      <div class="rem"><strong>${r}</strong><small>з ${st.paid || 0} оплачених</small></div>
      <div class="stu-actions">
        <div class="packs">${PACKS.map((p, i) => `<button class="pack" data-pack="${i}" data-name="${esc(n)}"><b>+${p.n}</b> ${money(p.sum)}</button>`).join('')}</div>
        ${r <= 3 && (st.paid || 0) > 0 ? `<button class="ghost link-btn warnbtn" data-msg="remind" data-name="${esc(n)}">💬 Нагадування</button>` : ''}
        <button class="ghost link-btn" data-msg="report" data-name="${esc(n)}">📊 Звіт</button>
        <button class="ghost link-btn" data-awards="${esc(n)}">🏅 Медалі</button>
        <button class="ghost link-btn" data-cert="${esc(n)}">🎓 Сертифікат${(st.certs || []).length ? ` · ${st.certs.length}` : ''}</button>
        ${st.token ? `<button class="ghost link-btn" data-chatwith="${esc(n)}">💬 Чат</button>` : ''}
        ${myPhotos.length ? `<button class="ghost link-btn${fresh ? ' fresh' : ''}" data-photos="${esc(n)}">📷 ${myPhotos.length}${fresh ? ` · нових ${fresh}` : ''}</button>` : ''}
        ${st.token
          ? `<a class="ghost link-btn" href="?s=${esc(st.token)}" target="_blank" rel="noopener" title="Відкрити особисту сторінку учня">Кабінет ↗</a>
             <button class="ghost link-btn" data-link="${esc(n)}" title="Скопіювати посилання для учня">🔗 Копіювати</button>`
          : `<button class="ghost link-btn" data-link="${esc(n)}" title="Створити особисту сторінку й скопіювати посилання">+ Кабінет учня</button>`}
        <button class="ghost link-btn" data-folio="${esc(n)}" title="Публічна сторінка з роботами, медалями й сертифікатами — для батьків">🌐 ${st.pid ? 'Портфоліо' : '+ Портфоліо'}</button>
        <form class="topup" data-name="${esc(n)}">
          <input name="n" type="number" min="-200" max="200" placeholder="уроків" aria-label="Уроків">
          <input name="sum" type="number" min="0" step="10" placeholder="₴" aria-label="Сума, грн">
          <button class="ghost">Інша сума</button>
        </form>
        ${sure.arch === n ? `<button class="ghost link-btn danger sure" data-archive="${esc(n)}">Точно? Перенести в «Завершили навчання»</button>`
          : `<button class="ghost link-btn danger" data-archive="${esc(n)}" title="Перенести в «Завершили навчання»">🗑 Видалити</button>`}
      </div>
    </article>`;
  }).join('') + archivedHtml();
}
// Підтвердження видалення: друге натискання протягом 8 с (стан живе поза розміткою, бо список перемальовується)
const sure = {};
const askSure = (kind, n) => { sure[kind] = n; clearTimeout(sure.t); sure.t = setTimeout(() => { sure.arch = sure.purge = null; render(); }, 8000); render(); };
let archOpen = false;
const slotName = k => { const [d, h] = k.split('-'); return `${SHORT[d]} ${pad(h)}:00`; };
function archivedHtml() {
  const list = Object.keys(students).filter(isArchived).sort((a, b) => a.localeCompare(b, 'uk'));
  if (!list.length) return '';
  return `<div class="arch"><button class="arch-head" data-archtoggle aria-expanded="${archOpen}">🎓 Завершили навчання · ${list.length} <i>${archOpen ? '▴' : '▾'}</i></button>
    ${archOpen ? list.map(n => { const st = students[n]; return `<div class="arch-row">${faceOf(n)}
      <div class="who"><b>${esc(n)}</b><small>завершив(ла) ${longDate(st.archived)} ${st.archived.slice(0, 4)}${(st.certs || []).length ? ` · 🎓 ${st.certs.length}` : ''}${(st.archivedSlots || []).length ? ` · був(ла) у розкладі: ${st.archivedSlots.map(slotName).join(', ')}` : ''}</small></div>
      <div class="arch-act"><button class="ghost link-btn" data-restore="${esc(n)}">↩ Повернути</button>
        ${sure.purge === n ? `<button class="ghost link-btn danger sure" data-purge="${esc(n)}">Так, стерти все: відмітки, оплати (дохід у статистиці зменшиться), чат, ДЗ, фото, портфоліо</button>`
          : `<button class="ghost link-btn danger" data-purge="${esc(n)}">🗑 Видалити назавжди</button>`}</div></div>`; }).join('') : ''}</div>`;
}
// Крок 1: «Завершив навчання» — прибираємо зі списку й постійного розкладу (слоти запам'ятовуємо для «Повернути»)
async function archiveStudent(n) {
  const slots = Object.entries(lessons).filter(([, v]) => v === n).map(([k]) => k), bt = F.writeBatch(db);
  slots.forEach(k => bt.delete(F.doc(db, 'lessons', k)));
  bt.set(F.doc(db, 'students', n), { name: n, archived: iso(new Date()), archivedSlots: slots }, { merge: true });
  await bt.commit();
  toast(`${n} — у «Завершили навчання»`);
}
async function restoreStudent(n) {
  const st = students[n] || {}, bt = F.writeBatch(db), busy = [];
  for (const k of st.archivedSlots || []) lessons[k] ? busy.push(k) : bt.set(F.doc(db, 'lessons', k), { student: n });
  bt.set(F.doc(db, 'students', n), { archived: F.deleteField(), archivedSlots: F.deleteField() }, { merge: true });
  await bt.commit();
  toast(busy.length ? `${n} повернуто. Слоти, вже зайняті іншими, не відновлено: ${busy.map(slotName).join(', ')}` : `${n} повернуто до списку учнів`);
}
// Крок 2: повне видалення з бази — учень, відмітки, оплати, нотатки, розклад, кабінет з усім вмістом, портфоліо
async function purgeStudent(n) {
  const st = students[n] || {}, refs = [F.doc(db, 'students', n)];
  const own = (coll, map) => Object.entries(map).forEach(([id, x]) => x.student === n && refs.push(F.doc(db, coll, id)));
  own('attendance', attendance); own('payments', payments); own('notes', notes); own('changes', changes);
  Object.entries(lessons).forEach(([k, v]) => v === n && refs.push(F.doc(db, 'lessons', k)));
  const all = async (...path) => (await F.getDocs(F.collection(db, ...path))).forEach(d => refs.push(d.ref));
  if (st.token) {
    for (const c of ['photos', 'photoData', 'messages', 'msgData', 'notifs', 'subs', 'subData', 'spins', 'ratings', 'presence', 'avatar']) await all('public', st.token, c);
    refs.push(F.doc(db, 'public', st.token));
  }
  if (st.pid) { await all('portfolio', st.pid, 'works'); refs.push(F.doc(db, 'portfolio', st.pid)); }
  for (let i = 0; i < refs.length; i += 400) { // у пакеті Firestore до 500 операцій
    const bt = F.writeBatch(db);
    refs.slice(i, i + 400).forEach(r => bt.delete(r));
    await bt.commit();
  }
  toast(`${n} повністю видалено з бази`);
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
    ...avgRating(Object.values(ratings).filter(x => x.date.startsWith(m))),
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
        <div><dt>⭐ Оцінка уроків</dt><dd>${s.rate ? s.rate.toFixed(1) : '—'}<small> · ${s.rated} ${plural(s.rated, 'відгук', 'відгуки', 'відгуків')}</small></dd></div>
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
      <thead><tr><th>Місяць</th><th>Дохід</th><th>Проведено</th><th>Відпрац.</th><th>Додат.</th><th>Пропуски</th><th>Переноси</th><th>Оцінка</th></tr></thead>
      <tbody>${rows.slice().reverse().map(r => `<tr${r.m === statMonth ? ' class="cur"' : ''}><td>${monthName(r.m)}</td><td>${money(r.income)}</td><td>${r.held}</td><td>${r.makeup}</td><td>${r.extra}</td><td>${r.absent}</td><td>${r.byMe + r.byStudent}</td><td>${r.rate ? '★ ' + r.rate.toFixed(1) : '—'}</td></tr>`).join('')}</tbody>
    </table></div>
    ${reviewsHtml()}
    ${absentTop.length ? `<h4 class="sep">Найчастіше пропускають (3 міс.)</h4><p>${absentTop.map(([n, c]) => `<b>${esc(n)}</b> — ${c}`).join(' · ')}</p>` : ''}`;
}

const refName = code => Object.entries(students).find(([, st]) => st.token && refCode(st.token) === code)?.[0] || '';
const refFriends = code => Object.entries(changes).filter(([, c]) => c.kind === 'trial' && c.ref === code);
// Картка учня: друзі за його посиланням, зароблено/виплачено, кнопка «Виплатив»
function refLine(n, st) {
  if (!st.token) return '';
  const fr = refFriends(refCode(st.token)), joined = fr.filter(([, c]) => c.result === 'yes').length, paid = st.refPaid || 0, due = refEarned(joined) - paid;
  if (!fr.length && !paid) return '';
  return `<small>🎁 Друзі: ${fr.length}, займаються ${joined} · заробив(ла) ${money(refEarned(joined))}, виплачено ${money(paid)}</small>
    ${due > 0 ? `<button class="ghost link-btn warnbtn" data-refpay="${esc(n)}" data-sum="${due}">💸 Виплатив ${money(due)}</button>` : ''}`;
}
function renderRequests() {
  const list = Object.entries(requests).sort((a, b) => (a[1].date + pad(a[1].hour)).localeCompare(b[1].date + pad(b[1].hour)));
  $('#reqCount').hidden = !list.length;
  $('#reqCount').textContent = list.length;
  $('#requests').innerHTML = list.length ? list.map(([id, r]) => `
    <div class="req">
      <span class="avatar" style="--h:${hue(r.name)}">${esc(r.name[0] || '?')}</span>
      <div class="who"><b>${esc(r.name)}</b>
        <small>${DAYS[dayIdx(parseIso(r.date))]}, ${longDate(r.date)} · ${pad(r.hour)}:00 · ${{ regular: 'щотижня', once: 'разово', trial: '🎁 пробний урок' }[r.type] || ''}</small>
        ${r.contact ? `<small>📞 ${esc(r.contact)}</small>` : ''}${r.ref ? `<small>🎁 Від друга: ${esc(refName(r.ref) || 'код ' + r.ref)}</small>` : ''}${r.note ? `<small>${esc(r.note)}</small>` : ''}</div>
      <div class="req-actions"><button class="ghost danger" data-req="${id}" data-act="no">Відхилити</button><button class="primary" data-req="${id}" data-act="yes">Прийняти</button></div>
    </div>`).join('') : '<p class="empty">Нових заявок немає. Учні залишають їх через кнопку «Вільні вікна» або «Пробний урок».</p>';
  const trials = Object.entries(changes).filter(([, c]) => c.kind === 'trial')
    .sort((a, b) => (b[1].date + pad(b[1].hour)).localeCompare(a[1].date + pad(a[1].hour)));
  $('#requests').innerHTML += `<h4 class="sep">🎁 Пробні уроки</h4>` + (trials.length ? trials.map(([id, c]) => `
    <div class="req">
      <span class="avatar" style="--h:${hue(c.student)}">${esc(c.student[0] || '?')}</span>
      <div class="who"><b>${esc(c.student)}</b>
        <small>${DAYS[dayIdx(parseIso(c.date))]}, ${longDate(c.date)} · ${pad(c.hour)}:00 · ${c.done ? TRIAL_RES[c.result] || 'проведено' : 'заплановано'}</small>
        ${c.note ? `<small>${esc(c.note)}</small>` : ''}${c.ref ? `<small>🎁 Порадив(ла): ${esc(refName(c.ref) || 'код ' + c.ref)}</small>` : ''}</div>
      <div class="req-actions"><button class="ghost" data-trial="${id}">${c.done ? 'Змінити' : 'Підсумок'}</button></div>
    </div>`).join('') : '<p class="muted small">Ще не було пробних. Додай через клітинку розкладу («+ Пробний») або прийми заявку.</p>');
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
    if (st.pid) syncFolio(n, st, recs);
    if (!st.token) continue;
    const pr = progress(recs[n] || []);
    const data = { name: n, paid: st.paid || 0, remaining: rem(n),
      history: (recs[n] || []).slice(0, 30).map(x => ({ id: x.id, date: x.date, hour: x.hour ?? null, status: x.status, kind: x.kind || 'regular' })),
      notes: notesOf(n).slice(0, 20).map(x => ({ date: x.date, topic: x.topic || '', homework: x.homework || '' })),
      streak: pr.streak, present: pr.present, best: pr.best, badges: st.badges || [], certs: st.certs || [], pid: st.pid || '', refPaid: st.refPaid || 0 };
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
  if (s?.kind === 'trial') return openTrial(s.id);
  if (s?.kind === 'busy') {
    body += `<p class="kind-line"><span class="tag k-busy">⛔ Зайнято</span> ${esc(s.note || 'без причини')}</p>
      <p class="muted small">Усі бачать цей час як зайнятий, записатися на нього не можна.</p>
      <div class="actions"><button data-act="delOnce" class="ghost danger">Звільнити час</button></div>`;
  } else if (s && s.kind !== 'regular') {
    body += `<p class="kind-line"><span class="tag k-${s.kind}">${KIND[s.kind]}</span> <b>${esc(s.student)}</b> — разове заняття${s.from ? `, перенесено з ${shortSlot(s.from)}` : ''}</p>
      <div class="actions"><button data-act="delOnce" class="ghost danger">${s.from ? 'Скасувати перенос (повернути назад)' : 'Видалити разове заняття'}</button></div>`;
  } else if (s?.cancelled) {
    body += `<p class="kind-line"><b>${esc(s.student)}</b>: цього тижня ${s.to ? 'перенесено на ' + shortSlot(s.to) : 'скасовано'}</p>
      <div class="actions"><button data-act="restore" class="primary">Повернути заняття на місце</button></div>` + BUSY_FORM;
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
      : `<div class="actions"><button data-act="once-makeup" class="ghost tagbtn k-makeup">+ Відпрацювання</button><button data-act="once-extra" class="ghost tagbtn k-extra">+ Додаткове</button><button data-act="once-trial" class="ghost tagbtn k-trial">+ Пробний</button></div>
      <p class="muted small">Разове заняття тільки на цю дату для учня з поля вище. Пробний не створює учня.</p>` + BUSY_FORM;
  }
  dlg.innerHTML = body;
  dlg.showModal();
}

const BUSY_FORM = `<h4 class="sep">⛔ Зайняти цей час</h4>
  <label class="fl">Причина (у розкладі не показується, лише тобі)<input id="busyNote" maxlength="80" placeholder="Напр.: созвон по сайту"></label>
  <div class="actions"><button data-act="busy" class="ghost tagbtn k-busy">Позначити зайнятим</button></div>`;

// Пробний: після уроку — хто був, чи продовжує, поповнення абонемента; проведений зникає з розкладу
function openTrial(id) {
  const c = changes[id], dlg = $('#edit');
  if (!c) return;
  dlg.dataset.date = c.date; dlg.dataset.hour = c.hour; dlg.dataset.trial = id;
  dlg.innerHTML = `<button type="button" class="x" data-act="close" aria-label="Закрити">✕</button>
    <h3>🎁 Пробний · ${DAYS[dayIdx(parseIso(c.date))]}, ${longDate(c.date)} · ${pad(c.hour)}:00</h3>
    ${c.note ? `<p class="muted">${esc(c.note)}</p>` : ''}
    <label class="fl">Хто був на пробному<input id="editName" list="names" value="${esc(c.student)}" autocomplete="off"></label>
    <label class="fl">Результат<select id="trRes">${Object.entries(TRIAL_RES).map(([k, v]) => `<option value="${k}"${c.result === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="fl">Хто порадив (отримає ${money(REF_BONUS)}, якщо продовжує)<select id="trRef"><option value="">Ніхто / знайшов сам</option>${Object.entries(students)
      .filter(([n, st]) => st.token && !isArchived(n)).sort((a, b) => a[0].localeCompare(b[0], 'uk'))
      .map(([n, st]) => `<option value="${refCode(st.token)}"${c.ref === refCode(st.token) ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="fl">Поповнення абонемента<select id="trPack"><option value="">Без оплати зараз</option>${PACKS.map((p, i) => `<option value="${i}">${p.n} ${lessonsWord(p.n)} — ${money(p.sum)}</option>`).join('')}</select></label>
    <p class="muted small">«Продовжує» додає учня в «Учні», оплата йде в абонемент. Пробний зникає з розкладу й лишається в «Заявки → Пробні уроки».</p>
    <div class="actions"><button data-act="trialDone" class="primary">✅ Проведено</button><button data-act="trialDel" class="ghost danger">Видалити пробний</button></div>`;
  if (!dlg.open) dlg.showModal();
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
    case 'once-makeup': case 'once-extra': case 'once-trial': {
      if (needName()) return;
      const kind = b.dataset.act.slice(5);
      p = F.addDoc(F.collection(db, 'changes'), { date, hour: h, student: name, kind });
      if (kind !== 'trial') p = Promise.all([p, ensureStudent(name)]); // пробний — ще не учень
      break;
    }
    case 'busy': p = F.addDoc(F.collection(db, 'changes'), { date, hour: h, student: '', kind: 'busy', note: ($('#busyNote').value || '').trim().slice(0, 80) }); break;
    case 'trialDone': {
      if (needName()) return;
      const res = $('#trRes').value, pk = PACKS[$('#trPack').value];
      p = F.setDoc(F.doc(db, 'changes', dlg.dataset.trial), { done: true, result: res, student: name, ref: $('#trRef').value }, { merge: true });
      if (res === 'yes') p = Promise.all([p, ensureStudent(name)]);
      if (pk) pay(name, pk.n, pk.sum);
      break;
    }
    case 'trialDel': p = F.deleteDoc(F.doc(db, 'changes', dlg.dataset.trial)); break;
    case 'cancelOnce': p = F.addDoc(F.collection(db, 'changes'), { date, hour: h, student: s.student, kind: 'cancel' }); break;
    case 'move': {
      const to = $('#mvDate').value, th = +$('#mvHour').value, kind = $('#mvKind').value;
      if (!to || (to === date && th === h)) return toast('Обери інший день або час');
      const busy = slotsOn(to)[th];
      if (busy && !busy.cancelled) return toast(`Цей час уже зайнятий: ${busy.student || 'зайнято'}`);
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

// Вкладки: кожен набір (кабінет учня / викладача) перемикає лише свою секцію
function showTab(tl, name) {
  const sec = tl.closest('section');
  tl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.tab === name));
  sec.querySelectorAll('.tab').forEach(t => t.hidden = t.id !== 'tab-' + name);
  render();
  sec.querySelectorAll('.tab:not([hidden]) .chat-msgs').forEach(c => c.scrollTop = c.scrollHeight);
}
document.querySelectorAll('.tabs').forEach(tl => tl.onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) showTab(tl, b.dataset.tab); });

// Чати
document.querySelectorAll('.chat-form').forEach(f => {
  const by = f.id === 'meChatForm' ? 'student' : 'teacher', tok = () => by === 'student' ? token : students[chatName]?.token;
  f.onsubmit = e => { e.preventDefault(); sendMsg(f, tok(), by); };
  f.onchange = e => { const i = e.target.closest('[data-att]'); if (i?.files[0]) attach(f, i.files[0]); if (i) i.value = ''; };
  f.onclick = e => {
    if (e.target.closest('[data-unatt]')) setAtt(f, null);
    if (e.target.closest('[data-voicecancel]') && rec) { rec.cancelled = true; return rec.stop(); }
    const v = e.target.closest('[data-voice]');
    if (v) voice(v, tok(), by);
  };
  // Ctrl+V / «Вставити» на телефоні: картинка чи файл з буфера обміну
  // Скасувати своє повідомлення: зникає в обох разом із файлом
  const box = f.previousElementSibling;
  box.onclick = e => {
    const b = e.target.closest('[data-delmsg]'), id = b?.dataset.delmsg, m = id && (by === 'student' ? meMsgs : msgs)[id];
    if (!b) return e.target.closest('.msg.mine')?.classList.toggle('sel');
    if (!m || !tok() || !confirm('Скасувати це повідомлення? Воно зникне і в співрозмовника.')) return;
    const bt = F.writeBatch(db);
    bt.delete(F.doc(db, 'public', tok(), 'messages', id));
    if (m.file) bt.delete(F.doc(db, 'public', tok(), 'msgData', m.file));
    run(bt.commit());
  };
  // поле росте разом із текстом (як у Telegram)
  f.elements['text'].oninput = e => { const t = e.target; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
  f.elements['text'].onpaste = e => { const file = e.clipboardData?.files?.[0]; if (file) { e.preventDefault(); attach(f, file); } };
});
// Enter — надіслати, Shift+Enter — новий рядок
document.querySelectorAll('.chat-form textarea').forEach(t => t.onkeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); t.form.requestSubmit(); }
});
$('#chatList').onclick = e => {
  const b = e.target.closest('[data-chat]');
  if (!b) return;
  chatName = b.dataset.chat;
  render();
  $('#tChat').scrollTop = $('#tChat').scrollHeight;
  $('#tChatForm').elements['text'].focus();
};
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && render());

// Часовий пояс: пошук по назві міста (укр/англ), країні чи GMT+N
let zoneList;
function zones() {
  if (zoneList) return zoneList;
  let all = [];
  try { all = Intl.supportedValuesOf('timeZone'); } catch {}
  const now = Date.now();
  zoneList = [...new Set([BASE_TZ, LOCAL_TZ, ...Object.keys(TZ_UK), ...all].map(norm))].filter(validTz)
    .map(z => ({ z, off: offMin(z, now), hay: `${z} ${TZ_UK[z] || ''} ${z === BASE_TZ ? 'Київ Україна Kyiv' : ''} ${gmt(z)}`.replace(/_/g, ' ').toLowerCase() }))
    .sort((a, b) => a.off - b.off || a.z.localeCompare(b.z));
  return zoneList;
}
function renderTz() {
  const q = $('#tzQ').value.trim().toLowerCase().replace(/utc/g, 'gmt').replace(/_/g, ' '), now = Date.now();
  const mine = x => x.z === BASE_TZ || x.z === LOCAL_TZ;
  const list = q ? zones().filter(x => x.hay.includes(q)) : [...zones().filter(mine), ...zones().filter(x => !mine(x))];
  $('#tzList').innerHTML = list.map(({ z }) => `<button data-tz="${esc(z)}"${z === tz ? ' class="on"' : ''}>
      <span><b>${esc(tzName(z))}</b>${z === BASE_TZ ? ' <i class="tag k-regular">розклад</i>' : z === LOCAL_TZ ? ' <i class="tag k-moved">мій</i>' : ''}<small>${esc(z.replace(/_/g, ' '))}</small></span>
      <span class="tzr"><b>${hm(tzParts(z, now).min)}</b><small>${gmt(z)}</small></span></button>`).join('')
    || '<p class="empty">Нічого не знайдено. Спробуй назву міста англійською (напр. Warsaw) або GMT+1</p>';
}
$('#tzBtn').onclick = () => {
  $('#tzQ').value = '';
  renderTz();
  $('#tzDlg').showModal();
  $('#tzList .on')?.scrollIntoView({ block: 'center' });
};
$('#tzQ').oninput = renderTz;
$('#tzList').onclick = e => {
  const b = e.target.closest('[data-tz]');
  if (!b) return;
  tz = b.dataset.tz;
  try { localStorage.setItem('rozklad-tz', tz); } catch {}
  $('#tzDlg').close();
  resetDay();
  render();
};

let bookTrial = false; // заявку відкрито кнопкою «Пробний урок»
$('#freeBtn').onclick = () => {
  const on = document.body.classList.toggle('free');
  if (!on) bookTrial = false;
  $('#freeBtn').setAttribute('aria-pressed', on);
  $('#freeHint').hidden = !on;
  $('#freeHint').textContent = bookTrial ? 'Обери зручну вільну клітинку — це буде твій пробний урок 🎁' : 'Обери вільну клітинку, щоб залишити заявку на заняття.';
  render();
};
$('#trialBtn').onclick = () => {
  bookTrial = true;
  document.body.classList.remove('free');
  $('#freeBtn').click();
  $('#freeHint').scrollIntoView({ block: 'center', behavior: 'smooth' });
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
    f.elements['type'].value = bookTrial || myRef() ? 'trial' : 'regular';
    $('#bookSlot').textContent = whenText(instant(date, h * 60, BASE_TZ)) + (tz !== BASE_TZ ? ` (${kyivNote(h)})` : '');
    return $('#book').showModal();
  }
  if (isTeacher) openCell(date, h);
};

$('#book').onclick = e => { if (e.target.closest('[data-close]')) $('#book').close(); };
$('#bookForm').onsubmit = e => {
  e.preventDefault();
  const f = e.target, el = f.elements;
  const data = { date: f.dataset.date, hour: +f.dataset.hour, name: el['name'].value.trim().slice(0, 60), note: el['note'].value.trim().slice(0, 300),
    contact: el['contact'].value.trim().slice(0, 100), type: el['type'].value, created: F.serverTimestamp(), ...(myRef() ? { ref: myRef() } : {}) };
  if (!data.name) return toast("Вкажи своє ім'я");
  if (data.type === 'trial' && !data.contact) return toast('Залиш телефон або Telegram, щоб викладач підтвердив пробний');
  run(F.addDoc(F.collection(db, 'requests'), data).then(() => {
    $('#book').close(); f.reset(); if (bookTrial) $('#freeBtn').click(); toast('Заявку надіслано! Викладач зв\'яжеться з тобою');
  }));
};

$('#requests').onclick = e => {
  const t = e.target.closest('[data-trial]');
  if (t) return openTrial(t.dataset.trial);
  const b = e.target.closest('[data-req]');
  if (!b) return;
  const id = b.dataset.req, r = requests[id];
  if (b.dataset.act === 'no') return run(F.deleteDoc(F.doc(db, 'requests', id)));
  const name = cleanName(r.name), slot = slotsOn(r.date)[r.hour];
  if (slot && !slot.cancelled) return toast(`Цей час уже зайнятий: ${slot.student || 'зайнято'}`);
  const bt = F.writeBatch(db);
  if (r.type === 'regular') bt.set(F.doc(db, 'lessons', `${dayIdx(parseIso(r.date))}-${r.hour}`), { student: name });
  else if (r.type === 'trial') bt.set(F.doc(F.collection(db, 'changes')), { date: r.date, hour: r.hour, student: name, kind: 'trial', note: [r.contact, r.note].filter(Boolean).join(' · ').slice(0, 300), ...(r.ref ? { ref: r.ref } : {}) });
  else bt.set(F.doc(F.collection(db, 'changes')), { date: r.date, hour: r.hour, student: name, kind: 'extra' });
  if (r.type !== 'trial') bt.set(F.doc(db, 'students', name), { name }, { merge: true });
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
  if (homework && homework !== notes[`${date}_${n}`]?.homework) notifyStudent(n, 'hw', `Нове домашнє завдання: ${homework}`);
  $('#noteDlg').close();
  run((topic || homework ? F.setDoc(ref, { student: n, date, topic, homework }) : F.deleteDoc(ref)).then(() => toast('Нотатку збережено')));
};
document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

$('#photoDlg').onclick = e => {
  const pb = e.target.closest('[data-pub]');
  if (pb) return togglePub($('#photoDlg').dataset.name, pb.dataset.pub, pb.dataset.tok);
  const b = e.target.closest('[data-delphoto]');
  if (!b || b.dataset.sure !== '1') { if (b) { b.dataset.sure = '1'; b.textContent = 'Видалити?'; } return; }
  const bt = F.writeBatch(db), tok = b.dataset.tok, id = b.dataset.delphoto;
  bt.delete(F.doc(db, 'public', tok, 'photos', id));
  bt.delete(F.doc(db, 'public', tok, 'photoData', id));
  const n = $('#photoDlg').dataset.name, st = students[n] || {};
  if (st.pid && (st.pubWorks || []).includes(id)) { // прибрати й з портфоліо
    bt.delete(F.doc(db, 'portfolio', st.pid, 'works', id));
    bt.set(F.doc(db, 'students', n), { pubWorks: F.arrayRemove(id) }, { merge: true });
  }
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

$('#students').onclick = async e => {
  if (e.target.closest('[data-archtoggle]')) { archOpen = !archOpen; return render(); }
  const ar = e.target.closest('[data-archive]');
  if (ar) { const n = ar.dataset.archive; if (sure.arch !== n) return askSure('arch', n); sure.arch = null; return archiveStudent(n).catch(err => toast(errText(err))); }
  const rs = e.target.closest('[data-restore]');
  if (rs) return restoreStudent(rs.dataset.restore).catch(err => toast(errText(err)));
  const pu = e.target.closest('[data-purge]');
  if (pu) { const n = pu.dataset.purge; if (sure.purge !== n) return askSure('purge', n); sure.purge = null; toast(`Видаляю ${n}…`); return purgeStudent(n).catch(err => toast(errText(err))); }
  const pk = e.target.closest('[data-pack]');
  if (pk) return pay(pk.dataset.name, PACKS[pk.dataset.pack].n, PACKS[pk.dataset.pack].sum);
  const msg = e.target.closest('[data-msg]');
  if (msg) {
    const n = msg.dataset.name;
    return copyText(msg.dataset.msg === 'remind' ? msgRemind(n) : msgReport(n), `Повідомлення для ${n} скопійовано — встав у Telegram/Viber`);
  }
  const rp = e.target.closest('[data-refpay]');
  if (rp) return run(F.setDoc(F.doc(db, 'students', rp.dataset.refpay), { refPaid: F.increment(+rp.dataset.sum) }, { merge: true })
    .then(() => toast(`Виплату ${money(+rp.dataset.sum)} записано`)));
  const aw = e.target.closest('[data-awards]');
  if (aw) return openAwards(aw.dataset.awards);
  const ce = e.target.closest('[data-cert]');
  if (ce) return openCertIssue(ce.dataset.cert);
  const cw = e.target.closest('[data-chatwith]');
  if (cw) { chatName = cw.dataset.chatwith; return showTab($('#panel .tabs'), 'chats'); }
  const ph = e.target.closest('[data-photos]');
  if (ph) return openPhotos(ph.dataset.photos);
  const fo = e.target.closest('[data-folio]');
  if (fo) {
    const n = fo.dataset.folio, pid = students[n]?.pid || await ensurePid(n);
    return copyText(folioUrl(pid), `Посилання на портфоліо ${n} скопійовано. Роботи додаються кнопкою «🌐 В портфоліо» у фото учня`);
  }
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

setInterval(render, 30_000); // оновлює підсвітку поточної години й статус «в мережі»

// ---------- Рівні й медалі ----------
const myGrowth = () => growth({ present: me.present || 0, best: me.best || 0, manual: (me.badges || []).filter(isManual),
  subsList: Object.values(meSubs), spinsList: Object.values(meSpins), certs: me.certs || [] });
function growthOf(n, recs) {
  const st = students[n] || {}, tok = st.token, pr = progress(recs[n] || []);
  return growth({ present: pr.present, best: pr.best, manual: st.badges || [], certs: st.certs || [],
    subsList: tok ? Object.values(subs).filter(x => x.token === tok) : [], spinsList: tok ? Object.values(spins).filter(x => x.token === tok) : [] });
}
const lvlHtml = g => `<div class="lvl"><b>${g.lvl}</b><div><span><b>${rank(g.lvl)}</b> · ${g.xp} XP</span>
  <div class="xpbar"><i style="width:${g.rest / g.need * 100}%"></i></div><small class="muted">до рівня ${g.lvl + 1}: ${g.need - g.rest} XP</small></div></div>`;
const medalHtml = (b, cls = '', tag = 'span', attrs = '') => {
  const m = medalOf(b);
  return `<${tag} class="medal t-${m.t} ${cls}" title="${esc(m.n)}"${attrs}><i>${m.e}</i>${cls.includes('mini') ? '' : `<b>${esc(m.n)}</b>`}</${tag}>`;
};
const weekKey = () => { const t = tzParts(BASE_TZ, Date.now()).date; return addDays(t, -dayIdx(parseIso(t))); };

// ---------- Персонаж: SVG, речі відкриваються з рівнями ----------
const AV = {
  kind: [['blob', 'Круглик', 1], ['cat', 'Котик', 1], ['robot', 'Робот', 4]],
  color: [['#3D5AFE', '', 1], ['#0FB48F', '', 1], ['#E0408A', '', 1], ['#FFB020', '', 1], ['#9B5CFF', '', 3], ['#12C2A0', '', 3], ['#FF6B3D', '', 5], ['#1E293B', '', 7], ['#E8B923', '', 9]],
  head: [['none', 'Нічого', 1], ['cap', 'Кепка', 2], ['phones', 'Навушники', 4], ['wizard', 'Капелюх мага', 6], ['crown', 'Корона', 10], ['unicorn', 'Ріг єдинорога', 'wheel']],
  face: [['none', 'Нічого', 1], ['glasses', 'Окуляри', 3], ['shades', 'Темні окуляри', 5], ['mask', 'Маска героя', 8]],
  back: [['none', 'Нічого', 1], ['cape', 'Плащ', 4], ['wings', 'Крила', 7], ['jet', 'Реактивний ранець', 12], ['rainbow', 'Веселкові крила', 'wheel']],
};
const AV_LABEL = { kind: 'Персонаж', color: 'Колір', head: 'Голова', face: 'Обличчя', back: 'Спина' };
const AV_DEFAULT = { kind: 'blob', color: '#3D5AFE', head: 'none', face: 'none', back: 'none' };
const meAv = () => ({ ...AV_DEFAULT, ...meAvatar });
function avatarSvg(a = AV_DEFAULT, lvl = 1, px = 120) {
  const c = /^#[0-9A-Fa-f]{6}$/.test(a.color) ? a.color : AV_DEFAULT.color, robot = a.kind === 'robot';
  const back = { cape: '<path d="M34 62Q60 50 86 62L98 112Q60 100 22 112Z" fill="#E5364F"/>',
    wings: '<path d="M30 66Q2 38 8 80Q18 72 30 86ZM90 66Q118 38 112 80Q102 72 90 86Z" fill="#fff" stroke="#BFD0FF" stroke-width="2"/>',
    rainbow: '<defs><linearGradient id="avRb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4D6D"/><stop offset=".25" stop-color="#FFB020"/><stop offset=".5" stop-color="#3DDC84"/><stop offset=".75" stop-color="#3D8BFF"/><stop offset="1" stop-color="#9B5CFF"/></linearGradient></defs><path d="M30 66Q-2 30 4 84Q16 74 30 90ZM90 66Q122 30 116 84Q104 74 90 90Z" fill="url(#avRb)" stroke="#fff" stroke-width="2"/>',
    jet: '<rect x="18" y="56" width="14" height="36" rx="6" fill="#8A97AB"/><rect x="88" y="56" width="14" height="36" rx="6" fill="#8A97AB"/><path d="M20 92l5 16 5-16ZM90 92l5 16 5-16Z" fill="#FFB020"/>' }[a.back] || '';
  const ears = a.kind === 'cat' ? `<path d="M30 52L33 16L56 38ZM90 52L87 16L64 38Z" fill="${c}"/><path d="M36 42L38 26L49 37ZM84 42L82 26L71 37Z" fill="#fff" opacity=".45"/>` : '';
  const ant = robot ? '<path d="M60 32V18" stroke="#8A97AB" stroke-width="3"/><circle cx="60" cy="15" r="5" fill="#FFD23F"/>' : '';
  const body = robot ? `<rect x="24" y="32" width="72" height="72" rx="18" fill="${c}"/>` : `<ellipse cx="60" cy="70" rx="38" ry="36" fill="${c}"/>`;
  const mask = a.face === 'mask' ? '<rect x="32" y="54" width="56" height="18" rx="9" fill="#14213D"/>' : '';
  const eyes = '<circle cx="47" cy="63" r="8" fill="#fff"/><circle cx="73" cy="63" r="8" fill="#fff"/><circle cx="48.5" cy="64" r="4" fill="#14213D"/><circle cx="74.5" cy="64" r="4" fill="#14213D"/>';
  const mouth = '<path d="M52 80Q60 87 68 80" fill="none" stroke="#14213D" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="76" r="4" fill="#FF6FB0" opacity=".55"/><circle cx="82" cy="76" r="4" fill="#FF6FB0" opacity=".55"/>';
  const face = { glasses: '<g fill="none" stroke="#14213D" stroke-width="2.5"><circle cx="47" cy="63" r="11"/><circle cx="73" cy="63" r="11"/><path d="M58 63h4"/></g>',
    shades: '<rect x="34" y="56" width="24" height="14" rx="5" fill="#14213D"/><rect x="62" y="56" width="24" height="14" rx="5" fill="#14213D"/><path d="M58 61h4" stroke="#14213D" stroke-width="3"/>' }[a.face] || '';
  const head = { cap: '<path d="M30 46Q60 12 90 46Z" fill="#E5364F"/><path d="M80 44Q100 44 104 50H82Z" fill="#B3243A"/>',
    phones: '<path d="M22 64Q22 24 60 24Q98 24 98 64" fill="none" stroke="#14213D" stroke-width="5"/><rect x="14" y="56" width="14" height="22" rx="6" fill="#14213D"/><rect x="92" y="56" width="14" height="22" rx="6" fill="#14213D"/>',
    wizard: '<path d="M34 42L60 0L86 42Z" fill="#7A4DFF"/><path d="M26 42Q60 52 94 42Q60 34 26 42Z" fill="#5B3DF0"/><path d="M60 14l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="#FFD23F"/>',
    unicorn: '<path d="M53 38L60 2L67 38Z" fill="#FFE3F4" stroke="#E0408A" stroke-width="2" stroke-linejoin="round"/><path d="M55 30l10-4M57 20l7-3M58 12l4-1.5" stroke="#E0408A" stroke-width="2" stroke-linecap="round"/>',
    crown: '<path d="M38 40L36 16L48 28L60 10L72 28L84 16L82 40Z" fill="#FFD23F" stroke="#C98B00" stroke-width="2"/><circle cx="60" cy="30" r="3" fill="#E5364F"/>' }[a.head] || '';
  const aura = lvl >= 10 ? '<circle cx="60" cy="66" r="58" fill="#FFD23F" opacity=".22"/><circle cx="60" cy="66" r="50" fill="#FFD23F" opacity=".18"/>' : '';
  return `<svg viewBox="0 0 120 120" width="${px}" height="${px}" aria-hidden="true">${aura}${back}${ears}${ant}${body}<ellipse cx="60" cy="88" rx="20" ry="13" fill="#fff" opacity=".25"/>${mask}${eyes}${mouth}${face}${head}</svg>`;
}
// У викладача: персонаж учня, якщо він його вже створив, інакше літера
const faceOf = (n, lvl = 1) => { const a = avatars[students[n]?.token]; return a ? `<span class="av-face sm">${avatarSvg(a, lvl, 40)}</span>` : `<span class="avatar" style="--h:${hue(n)}">${esc(n[0])}</span>`; };

function renderAvatarTab(g) {
  const a = meAv(), won = new Set(Object.values(meSpins).map(x => PRIZES[x.prize]?.item).filter(Boolean));
  $('#meAvatar').innerHTML = `<div class="av-stage"><div class="av-big">${avatarSvg(a, g.lvl, 170)}</div>
      <div><h3>${esc(me.name)}</h3><p class="muted">Рівень ${g.lvl} · ${rank(g.lvl)}</p>
      <p class="muted small">Нові речі відкриваються з рівнями, а речі з 🎡 — лише в колесі фортуни. Ходи на уроки, здавай ДЗ і збирай медалі!</p></div></div>
    ${Object.entries(AV).map(([k, opts]) => `<p class="label lbl-gap">${AV_LABEL[k]}</p><div class="av-opts">${opts.map(([v, name, need]) => {
      const wheel = need === 'wheel', lock = wheel ? !won.has(v) : g.lvl < need;
      return `<button class="av-opt${a[k] === v ? ' on' : ''}" data-av="${k}" data-v="${v}"${lock ? ` disabled title="${wheel ? 'Тільки з колеса фортуни' : 'Відкриється на рівні ' + need}"` : ''}>${k === 'color' ? `<i style="background:${v}"></i>` : esc(name)}${wheel ? ' <small>🎡</small>' : lock ? ` <small>🔒 ${need}</small>` : ''}</button>`;
    }).join('')}</div>`).join('')}`;
}
$('#meAvatar').onclick = e => {
  const b = e.target.closest('[data-av]');
  if (!b || b.disabled || !token || !F) return;
  meAvatar = { ...meAv(), [b.dataset.av]: b.dataset.v };
  render();
  run(F.setDoc(F.doc(db, 'public', token, 'avatar', 'me'), meAvatar));
};

// ---------- «Приведи друга»: посилання, доріжка з подарунками, друзі й виплати ----------
const refUrl = () => location.origin + location.pathname + '?ref=' + refCode(token);
const REF_TEXT = 'Привіт! Я займаюсь у Balan Study — там цікаво 🚀 Записуйся на пробний урок за моїм посиланням:';
function renderFriends() {
  const fr = refFriends(refCode(token)).sort((a, b) => b[1].date.localeCompare(a[1].date));
  const joined = fr.filter(([, c]) => c.result === 'yes').length, earned = refEarned(joined), paid = me.refPaid || 0, url = refUrl();
  const steps = Array.from({ length: REF_MAX }, (_, i) => `<button class="ref-step${joined > i ? ' got' : joined === i ? ' next' : ''}" data-gift="${i}">
      <span class="ref-gift">${joined > i ? '💸' : '🎁'}</span><b>${money(REF_BONUS * (i + 1))}</b><small>${i + 1} ${plural(i + 1, 'друг', 'друзі', 'друзів')}</small></button>`).join('<i class="ref-line"></i>');
  const html = `<div class="ref-hero"><span class="ref-big">🤝</span><div><h3>Приведи друга — отримай до ${money(refEarned(REF_MAX))}</h3>
      <p>За кожного друга, який почне займатися, — <b>${money(REF_BONUS)}</b> на картку батьків.</p></div></div>
    <div class="ref-road">${steps}</div>
    <div class="ref-bar"><i style="width:${Math.min(joined, REF_MAX) / REF_MAX * 100}%"></i></div>
    <div class="ref-sum"><div><b>${money(earned)}</b><small>заробив(ла)</small></div><div><b>${money(paid)}</b><small>отримав(ла) на картку</small></div>
      ${earned > paid ? `<div class="wait"><b>${money(earned - paid)}</b><small>чекає на виплату</small></div>` : ''}</div>
    ${earned > paid ? `<p class="ref-note">💬 Напиши викладачу в <button class="link" data-gotab="me-chat">чат</button>, на яку картку батьків переказати.</p>` : ''}
    <p class="label lbl-gap">Твоє посилання-запрошення</p>
    <div class="ref-link"><input readonly value="${esc(url)}" aria-label="Посилання-запрошення"><button class="btn sm" data-refshare>Поділитися</button></div>
    <div class="ref-apps"><a class="ghost link-btn" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&amp;text=${encodeURIComponent(REF_TEXT)}">✈️ Telegram</a>
      <a class="ghost link-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(REF_TEXT + ' ' + url)}">💬 WhatsApp</a>
      <button class="ghost link-btn" data-refcopy>📋 Копіювати</button></div>
    <p class="label lbl-gap">Як це працює</p>
    <ol class="ref-how"><li><span>1</span>Надішли посилання другу чи подрузі</li><li><span>2</span>Друг записується на пробний урок</li><li><span>3</span>Друг починає займатися — тобі ${money(REF_BONUS)}! 🎉</li></ol>
    <p class="label lbl-gap">Мої друзі</p>
    ${fr.length ? `<ul class="ref-list">${fr.map(([, c]) => `<li class="${c.result === 'yes' ? 'yes' : ''}"><span class="avatar" style="--h:${hue(c.student)}">${esc(c.student[0] || '?')}</span><b>${esc(c.student)}</b>
      <small>${c.result === 'yes' ? `✅ займається · +${money(REF_BONUS)}` : c.done ? (c.result === 'think' ? '🤔 ще думає' : 'не продовжив(ла)') : `📅 пробний ${longDate(c.date)}`}</small></li>`).join('')}</ul>`
      : '<p class="muted small">Поки нікого. Надішли посилання — перший подарунок зовсім поруч! 🎁</p>'}`;
  const box = $('#meFriends');
  if (box._html !== html) box.innerHTML = box._html = html;
  $('#refTeaser').innerHTML = `<span>🤝</span><span><b>Приведи друга — ${money(REF_BONUS)} на картку</b><small>${joined ? `Вже ${joined} ${plural(joined, 'друг займається', 'друзі займаються', 'друзів займаються')} · ${money(earned)}` : 'За кожного друга, який почне займатися'}</small></span><i>›</i>`;
  // новий друг почав займатися — конфеті (один раз на цьому пристрої)
  let seen = 0; try { seen = +localStorage.getItem('rozklad-refseen-' + token) || 0; } catch {}
  if (joined > seen && !$('#tab-me-friends').hidden) { try { localStorage.setItem('rozklad-refseen-' + token, joined); } catch {} burst(box); }
}
function burst(box) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('i');
    s.className = 'confetti'; s.textContent = ['🎉', '💸', '⭐', '🎁'][i % 4];
    s.style.left = Math.random() * 100 + '%'; s.style.animationDelay = Math.random() * .5 + 's';
    box.append(s); setTimeout(() => s.remove(), 3000);
  }
}
$('#me').addEventListener('click', e => {
  const go = e.target.closest('[data-gotab]')?.dataset.gotab;
  if (go) return go === 'me-chat' ? setView('chat') : showTab($('#me .tabs'), go);
  if (e.target.closest('[data-refcopy]')) return copyText(refUrl(), 'Посилання скопійовано — надішли другу 🚀');
  if (e.target.closest('[data-refshare]')) return navigator.share
    ? navigator.share({ title: 'Balan Study', text: REF_TEXT, url: refUrl() }).catch(() => {}) : copyText(refUrl(), 'Посилання скопійовано — надішли другу 🚀');
  const g = e.target.closest('[data-gift]');
  if (g) {
    g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
    const i = +g.dataset.gift, joined = refFriends(refCode(token)).filter(([, c]) => c.result === 'yes').length;
    toast(joined > i ? `Цей подарунок вже твій: ${money(REF_BONUS * (i + 1))} 🎉` : `Ще ${i + 1 - joined} ${plural(i + 1 - joined, 'друг', 'друзі', 'друзів')} — і подарунок відкриється!`);
  }
});

// ---------- Нагороди учня: рівень, сертифікати, колесо, колекція медалей ----------
function renderAwards(g) {
  const certs = me.certs || [];
  $('#meLevel').innerHTML = `${me.pid ? `<div class="folio-link"><span>🌐</span><div><b>Моє портфоліо</b><small class="muted">Сторінка з твоїми роботами, медалями й сертифікатами — покажи рідним</small></div>
      <a class="ghost link-btn" href="${esc(folioUrl(me.pid))}" target="_blank" rel="noopener">Відкрити</a><button class="btn sm" data-sharefolio>Поділитися</button></div>` : ''}
    <div class="lvl-card"><span class="av-face">${avatarSvg(meAv(), g.lvl, 72)}</span>${lvlHtml(g)}</div>
    <p class="muted small">XP: урок +${XP.lesson} · зараховане ДЗ +${XP.hw} · медаль від викладача +${XP.medal} · бонуси колеса</p>
    ${certs.length ? `<p class="label lbl-gap">🎓 Сертифікати</p><div class="certs">${certs.map((c, i) => `<button class="cert-card" data-showcert="${i}"><b>«${esc(c.course)}»</b><small>${longDate(c.date)} · відкрити</small></button>`).join('')}</div>` : ''}`;
  const have = new Set(g.medals), cats = [...new Set(MEDALS.map(m => m[3]))];
  $('#meMedals').innerHTML = `<p class="label lbl-gap">🏅 Колекція медалей · ${MEDALS.filter(m => have.has(`${m[0]} ${m[1]}`)).length} з ${MEDALS.length}</p>
    ${cats.map(c => `<p class="muted small cat">${c}</p><div class="medals">${MEDALS.filter(m => m[3] === c).map(([n, e]) => medalHtml(`${n} ${e}`, have.has(`${n} ${e}`) ? '' : 'lock')).join('')}</div>`).join('')}`;
  renderWheel();
}
$('#meLevel').onclick = e => {
  const b = e.target.closest('[data-showcert]');
  if (b) return openCert(me.name, me.certs[+b.dataset.showcert]);
  if (e.target.closest('[data-sharefolio]')) shareFolio(folioUrl(me.pid), me.name);
};

let spinning = false;
$('#wheelDisc').innerHTML = (() => {
  const n = WHEEL.length, col = ['#3D5AFE', '#9B5CFF', '#0FB48F', '#E0408A', '#FFB020', '#2F6BFF', '#12C2A0', '#7A4DFF', '#FF6B3D', '#E8B923'];
  const pt = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `<svg viewBox="-100 -100 200 200">${WHEEL.map(pi => PRIZES[pi]).map((p, i) => {
    const a0 = i / n * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2, am = (a0 + a1) / 2, [x, y] = pt(64, am).split(' ');
    return `<path d="M0 0L${pt(96, a0)}A96 96 0 0 1 ${pt(96, a1)}Z" fill="${col[i]}"/>
      <text x="${x}" y="${y}" transform="rotate(${am * 180 / Math.PI + (Math.sin(am) > 0.01 ? 270 : 90)} ${x} ${y})" text-anchor="middle" dominant-baseline="central">${p.s}</text>`;
  }).join('')}<circle r="96" fill="none" stroke="#fff" stroke-width="4"/><circle r="15" fill="#fff"/></svg>`;
})();
const wheelAngle = i => 360 - (Math.max(0, WHEEL.indexOf(i)) + .5) * 360 / WHEEL.length; // сектор призу i під стрілкою зверху
function renderWheel() {
  if (spinning) return;
  const got = meSpins[weekKey()], today = tzParts(BASE_TZ, Date.now()).date;
  const active = (me.history || []).some(x => x.status === 'present' && x.date >= addDays(today, -7));
  if (got) $('#wheelDisc').style.transform = `rotate(${wheelAngle(got.prize)}deg)`;
  $('#spinBtn').disabled = !!got || !active;
  $('#wheelMsg').innerHTML = got ? `Приз цього тижня: <b>${esc(PRIZES[got.prize]?.t || '')}</b>. Наступна спроба — з понеділка 🙂`
    : active ? 'Ти був(ла) на уроці цього тижня — крути колесо!' : 'Колесо відкривається, коли за останні 7 днів був хоча б один урок.';
}
$('#spinBtn').onclick = async () => {
  if (spinning || !token || !F || meSpins[weekKey()]) return;
  let r = Math.random() * PRIZES.reduce((a, p) => a + p.w, 0);
  const i = PRIZES.findIndex(p => (r -= p.w) < 0);
  spinning = true;
  $('#spinBtn').disabled = true;
  // shortcut: приз обирається в браузері учня (правила лише обмежують 1 спробу на тиждень); для грошових призів — перевіряти на сервері
  try { await F.setDoc(F.doc(db, 'public', token, 'spins', weekKey()), { prize: i, created: F.serverTimestamp() }); }
  catch (e) { spinning = false; $('#spinBtn').disabled = false; return toast('Не вдалося: ' + e.message); }
  const d = $('#wheelDisc');
  d.style.transition = 'transform 4.5s cubic-bezier(.15,.7,.1,1)';
  d.style.transform = `rotate(${360 * 6 + wheelAngle(i)}deg)`;
  setTimeout(() => { spinning = false; d.style.transition = 'none'; toast(`🎉 Твій приз: ${PRIZES[i].t}`); render(); }, 4700);
};

// ---------- ДЗ: учень здає (текст, посилання, файл), викладач перевіряє ----------
const safeUrl = u => /^https?:\/\/\S+$/i.test(u || '') ? u : '';
const ST_LABEL = { new: '⏳ На перевірці', ok: '✅ Зараховано', redo: '↩ Треба доопрацювати' };
const subLine = x => `<div class="sub-line st-${x.status}"><b>${ST_LABEL[x.status] || ''}</b>
  <small class="muted">${x.created ? new Date(ms(x.created)).toLocaleDateString('uk', { day: 'numeric', month: 'short' }) : ''}${x.file ? ' · 📎 ' + esc(x.file) : ''}${safeUrl(x.link) ? ' · 🔗 посилання' : ''}</small>
  ${x.comment ? `<p>💬 ${esc(x.comment)}</p>` : ''}</div>`;
const readData = file => new Promise((ok, bad) => {
  if (file.size > 650000) return bad(new Error('файл завеликий (до 650 КБ). Завантаж його на Google Диск і додай посилання'));
  const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(r.error); r.readAsDataURL(file);
});
$('#meHw').onclick = e => {
  const b = e.target.closest('[data-submit]');
  if (!b) return;
  const f = $('#subForm'), note = (me.notes || []).find(x => x.date === b.dataset.submit);
  f.dataset.hw = b.dataset.submit;
  $('#subTask').textContent = note?.homework || '';
  $('#subDlg').showModal();
};
$('#subForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, el = f.elements, text = el['text'].value.trim().slice(0, 2000), link = el['link'].value.trim().slice(0, 500), file = el['file'].files[0];
  if (link && !safeUrl(link)) return toast('Посилання має починатися з https://');
  if (!text && !link && !file) return toast('Додай відповідь, посилання або файл');
  if (!token || !F) return;
  const btn = f.querySelector('button.btn');
  btn.disabled = true;
  try {
    const data = file ? (file.type.startsWith('image/') ? await compress(file) : await readData(file)) : '';
    const id = F.doc(F.collection(db, 'public', token, 'subs')).id, bt = F.writeBatch(db);
    if (data) bt.set(F.doc(db, 'public', token, 'subData', id), { data });
    bt.set(F.doc(db, 'public', token, 'subs', id), { hw: f.dataset.hw, text, link, file: file ? file.name.slice(0, 200) : '', status: 'new', created: F.serverTimestamp() });
    await bt.commit();
    $('#subDlg').close(); f.reset();
    toast('ДЗ надіслано на перевірку 📬');
  } catch (err) { toast('Не вдалося надіслати: ' + err.message); }
  btn.disabled = false;
};

const nameByToken = tok => Object.keys(students).find(n => students[n].token === tok) || 'Учень';
function renderSubs() {
  const list = Object.values(subs).sort((a, b) => (b.status === 'new') - (a.status === 'new') || ms(b.created) - ms(a.created));
  const fresh = list.filter(x => x.status === 'new').length;
  $('#hwCount').hidden = !fresh;
  $('#hwCount').textContent = fresh;
  $('#subsList').innerHTML = list.length ? list.slice(0, fresh + 30).map(x => {
    const n = nameByToken(x.token), task = notes[`${x.hw}_${n}`]?.homework, url = safeUrl(x.link);
    return `<div class="sub st-${x.status}">
      ${faceOf(n)}
      <div class="who"><b>${esc(n)}</b> <small>здано ${x.created ? new Date(ms(x.created)).toLocaleString('uk', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'щойно'} · ДЗ від ${longDate(x.hw)}</small>
        ${task ? `<p class="nprev">Завдання: ${esc(task)}</p>` : ''}
        ${x.text ? `<p class="sub-text">${esc(x.text)}</p>` : ''}
        <div class="sub-att">${url ? `<a class="ghost link-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">🔗 Відкрити посилання</a>` : ''}
          ${x.file ? `<button class="ghost link-btn" data-file="${x.id}" data-tok="${esc(x.token)}" data-fname="${esc(x.file)}">📎 ${esc(x.file)}</button>` : ''}</div>
        ${x.status !== 'new' ? `<p class="sub-res"><b>${ST_LABEL[x.status]}</b>${x.comment ? ' · ' + esc(x.comment) : ''}</p>` : ''}
      </div>
      ${x.status === 'new' ? `<form class="review" data-sub="${x.id}" data-tok="${esc(x.token)}">
        <input name="comment" maxlength="500" placeholder="Коментар учню (необов'язково)" aria-label="Коментар">
        <button class="ghost" data-st="redo">↩ Доопрацювати</button><button class="primary" data-st="ok">✅ Зарахувати</button></form>` : ''}
    </div>`;
  }).join('') : '<p class="empty">Поки ніхто не здав ДЗ. Учні надсилають його з кабінету: вкладка «Домашні».</p>';
}
$('#subsList').onsubmit = e => {
  e.preventDefault();
  const f = e.target, st = e.submitter?.dataset.st || 'ok', comment = f.elements['comment'].value.trim().slice(0, 500), n = nameByToken(f.dataset.tok);
  run(F.updateDoc(F.doc(db, 'public', f.dataset.tok, 'subs', f.dataset.sub), { status: st, comment, reviewed: F.serverTimestamp() }).then(() => {
    notifyStudent(n, 'review', st === 'ok' ? `ДЗ зараховано ✅ +${XP.hw} XP${comment ? ` · ${comment}` : ''}` : `ДЗ треба доопрацювати ↩${comment ? `: ${comment}` : ''}`);
    toast(`${n}: ${ST_LABEL[st].toLowerCase()}`);
  }));
};
$('#subsList').onclick = e => {
  const b = e.target.closest('[data-file]');
  if (!b) return;
  run(F.getDoc(F.doc(db, 'public', b.dataset.tok, 'subData', b.dataset.file)).then(d => {
    const data = d.data()?.data;
    if (typeof data !== 'string' || !data.startsWith('data:')) return toast('Файл не знайдено');
    const a = document.createElement('a'); a.href = data; a.download = b.dataset.fname || 'dz'; a.click();
  }));
};

// ---------- Медалі: видача викладачем ----------
function openAwards(n) {
  const dlg = $('#awardDlg'), own = new Set(students[n]?.badges || []);
  dlg.dataset.name = n;
  $('#awardTitle').textContent = `Медалі: ${n}`;
  $('#awardGrid').innerHTML = [...new Set(MEDALS.filter(m => m[3] !== 'Автоматичні').map(m => m[3]))].map(c => `<p class="muted small cat">${c}</p>
    <div class="medals">${BADGES.filter(b => MEDAL[b].c === c).map(b => medalHtml(b, own.has(b) ? 'on' : 'lock', 'button', ` data-medal="${esc(b)}"`)).join('')}</div>`).join('');
  if (!dlg.open) dlg.showModal();
}
$('#awardGrid').onclick = e => {
  const b = e.target.closest('[data-medal]');
  if (!b) return;
  const n = $('#awardDlg').dataset.name, m = b.dataset.medal, has = (students[n]?.badges || []).includes(m);
  run(F.setDoc(F.doc(db, 'students', n), { badges: has ? F.arrayRemove(m) : F.arrayUnion(m) }, { merge: true }).then(() => {
    if (!has) { notifyStudent(n, 'badge', `Нова медаль: ${m} (+${XP.medal} XP)`); toast(`${n} отримує медаль ${m}`); }
  }));
};

// ---------- Сертифікати: викладач позначає завершений курс → сертифікат створюється сам ----------
const COURSES = ['Розробка ігор у Scratch', 'Розробка ігор у Roblox Studio', 'Розробка ігор у Kodu Game Lab', 'Розробка ігор у Construct 3',
  'Відеомонтаж у CapCut', 'Створення сайтів на Wix', 'Створення сайтів на WordPress', 'Створення сайтів: HTML, CSS, JavaScript', 'Веб-дизайн у Figma',
  'Штучний інтелект', '3D-моделювання в Tinkercad', 'Arduino в Tinkercad', "Комп'ютерна грамотність (базова інформатика)",
  'Програмування на Python', 'Програмування на C++'];
$('#courses').innerHTML = COURSES.map(c => `<option value="${esc(c)}">`).join('');
function openCertIssue(n) {
  const f = $('#certForm'), certs = students[n]?.certs || [];
  f.dataset.name = n;
  $('#certWho').textContent = n;
  $('#certList').innerHTML = certs.map((c, i) => `<button type="button" class="cert-card" data-showcert="${i}"><b>«${esc(c.course)}»</b><small>${longDate(c.date)} · відкрити</small></button>`).join('');
  $('#certIssue').showModal();
}
$('#certList').onclick = e => { const b = e.target.closest('[data-showcert]'), n = $('#certForm').dataset.name; if (b) openCert(n, students[n].certs[+b.dataset.showcert]); };
$('#certForm').onsubmit = e => {
  e.preventDefault();
  const n = e.target.dataset.name, course = e.target.elements['course'].value.trim().slice(0, 80);
  if (!course) return;
  const cert = { course, date: iso(new Date()), lessons: progress(recordsBy()[n] || []).present };
  run(F.setDoc(F.doc(db, 'students', n), { certs: F.arrayUnion(cert) }, { merge: true }).then(() => {
    notifyStudent(n, 'cert', `Вітаю! Ти завершив(ла) курс «${course}» — сертифікат уже в кабінеті 🎓`);
    $('#certIssue').close(); e.target.reset();
    openCert(n, cert);
  }));
};
const certNo = (n, c) => 'BS-' + [...`${n}|${c.course}|${c.date}`].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase().padStart(7, '0');
function certSvg(n, c) {
  const F1 = "font-family=\"Unbounded, 'Segoe UI', Arial, sans-serif\"", F2 = "font-family=\"Onest, 'Segoe UI', Arial, sans-serif\"";
  const nameSize = n.length > 22 ? 44 : 60, len = c.course.length + 2, courseSize = len > 40 ? 26 : len > 30 ? 30 : 36; // довгі назви не вилазять за рамку
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794">
  <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BFF"/><stop offset=".5" stop-color="#7A4DFF"/><stop offset="1" stop-color="#12C2A0"/></linearGradient>
  <radialGradient id="cm" cx=".35" cy=".3"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".6" stop-color="#FFD23F"/><stop offset="1" stop-color="#C98B00"/></radialGradient></defs>
  <rect width="1123" height="794" fill="#fff"/>
  <path d="M0 0H1123V150Q560 230 0 120Z" fill="url(#cg)" opacity=".08"/>
  <rect x="26" y="26" width="1071" height="742" rx="30" fill="none" stroke="url(#cg)" stroke-width="10"/>
  <rect x="50" y="50" width="1023" height="694" rx="20" fill="none" stroke="#D9DFF5" stroke-width="2"/>
  <rect x="526" y="76" width="70" height="70" rx="22" fill="url(#cg)"/>
  <text x="561" y="124" text-anchor="middle" ${F1} font-size="38" font-weight="700" fill="#fff">B</text>
  <text x="561" y="182" text-anchor="middle" ${F2} font-size="20" font-weight="700" letter-spacing="8" fill="#4A5578">BALAN STUDY</text>
  <text x="561" y="270" text-anchor="middle" ${F1} font-size="66" font-weight="700" fill="url(#cg)">СЕРТИФІКАТ</text>
  <text x="561" y="322" text-anchor="middle" ${F2} font-size="24" fill="#4A5578">цим підтверджується, що</text>
  <text x="561" y="${400 + (60 - nameSize) / 3}" text-anchor="middle" ${F1} font-size="${nameSize}" font-weight="700" fill="#0F1733">${esc(n)}</text>
  <path d="M311 428H811" stroke="#D9DFF5" stroke-width="2"/>
  <text x="561" y="476" text-anchor="middle" ${F2} font-size="24" fill="#4A5578">успішно завершив(ла) курс</text>
  <text x="561" y="534" text-anchor="middle" ${F1} font-size="${courseSize}" font-weight="700" fill="#3D5AFE">«${esc(c.course)}»</text>
  ${c.lessons ? `<text x="561" y="578" text-anchor="middle" ${F2} font-size="20" fill="#4A5578">${c.lessons} ${plural(c.lessons, 'заняття', 'заняття', 'занять')} індивідуально 1:1</text>` : ''}
  <circle cx="561" cy="660" r="48" fill="url(#cm)" stroke="#C98B00" stroke-width="4"/><text x="561" y="676" text-anchor="middle" font-size="44">🎓</text>
  <text x="150" y="650" ${F2} font-size="18" fill="#4A5578">Дата видачі</text>
  <text x="150" y="680" ${F2} font-size="22" font-weight="700" fill="#0F1733">${longDate(c.date)} ${c.date.slice(0, 4)}</text>
  <text x="973" y="650" text-anchor="end" ${F2} font-size="18" fill="#4A5578">Номер</text>
  <text x="973" y="680" text-anchor="end" ${F2} font-size="22" font-weight="700" fill="#0F1733">${certNo(n, c)}</text>
</svg>`;
}
function openCert(n, c) {
  if (!c) return;
  $('#certBox').innerHTML = certSvg(n, c);
  $('#certDl').onclick = () => downloadPng(certSvg(n, c), `Сертифікат ${n} — ${c.course}.png`);
  $('#certDlg').showModal();
}
async function downloadPng(svg, file) {
  try {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = 2246; cv.height = 1588;
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = file; a.click();
  } catch (e) { toast('Не вдалося зберегти: ' + e.message); }
}

// ---------- Сповіщення ----------
// Викладач пише в public/{код}/notifs: ДЗ, медаль, перевірка ДЗ, сертифікат. Чат і рівень беруться з наявних даних.
function notifyStudent(n, type, text) {
  const tok = students[n]?.token;
  if (tok) run(F.addDoc(F.collection(db, 'public', tok, 'notifs'), { type, text: text.slice(0, 300), created: F.serverTimestamp() }));
}
const N_ICON = { hw: '📚', badge: '🏅', review: '📝', cert: '🎓' }, N_GO = { hw: 'me-hw', badge: 'me-awards', review: 'me-hw', cert: 'me-awards' };
function feed() {
  const out = [];
  if (me) {
    for (const [id, c] of refFriends(refCode(token))) if (c.result === 'yes') out.push({ id: 'ref' + id, t: Date.parse(c.date + 'T12:00'), icon: '🎉', text: `${c.student} почав(ла) займатися — тобі +${money(REF_BONUS)}!`, go: 'me-friends' });
    for (const [id, x] of Object.entries(meNotifs)) out.push({ id, t: ms(x.created), icon: N_ICON[x.type] || '🔔', text: x.text, go: N_GO[x.type] || 'me-home' });
    for (const [id, m] of Object.entries(meMsgs)) if (m.by === 'teacher') out.push({ id, t: ms(m.created), icon: '💬', text: `Викладач: ${msgText(m)}`, go: 'me-chat' });
  } else if (isTeacher) {
    for (const [id, m] of Object.entries(msgs)) if (m.by === 'student') out.push({ id, t: ms(m.created), icon: '💬', text: `${nameByToken(m.token)}: ${msgText(m)}`, go: 'tab:chats', chat: nameByToken(m.token) });
    for (const x of Object.values(subs)) out.push({ id: x.id, t: ms(x.created), icon: '📬', text: `${nameByToken(x.token)} здав(ла) ДЗ`, go: 'tab:hw' });
    for (const [id, r] of Object.entries(requests)) out.push({ id, t: ms(r.created), icon: '📝', text: `Заявка: ${r.name}, ${shortSlot(`${r.date} ${r.hour}`)}`, go: 'tab:requests' });
    for (const x of Object.values(ratings)) out.push({ id: 'r' + x.id + x.token, t: ms(x.created), icon: '⭐', text: `${nameByToken(x.token)} оцінив(ла) урок ${shortDay(x.date)}: ${'★'.repeat(x.stars)}${x.comment ? ' · ' + x.comment : ''}`, go: 'tab:stats' });
    for (const x of Object.values(spins)) out.push({ id: x.id + x.token, t: ms(x.created), icon: '🎡', text: `${nameByToken(x.token)} виграв(ла): ${PRIZES[x.prize]?.t || ''}`, go: 'tab:students' });
  }
  return out.sort((a, b) => b.t - a.t).slice(0, 60);
}
const seenKey = () => 'rozklad-seen-' + (me ? token : 'teacher');
const getSeen = () => { try { return +localStorage.getItem(seenKey()) || 0; } catch { return 0; } };
const loadedAt = Date.now(), pushed = new Set();
function renderBell() {
  const items = feed(), seen = getSeen(), unread = items.filter(x => x.t > seen).length;
  $('#bell').hidden = !me && !isTeacher;
  $('#bellCount').hidden = !unread;
  $('#bellCount').textContent = unread > 9 ? '9+' : unread;
  if ($('#notifDlg').open) {
    $('#notifList').innerHTML = items.length ? items.map((x, i) => `<button class="nitem${x.t > (+$('#notifDlg').dataset.seen || 0) ? ' new' : ''}" data-i="${i}">
      <span>${x.icon}</span><span><b>${esc(x.text)}</b><small>${x.t ? new Date(x.t).toLocaleString('uk', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</small></span></button>`).join('')
      : '<p class="empty">Поки сповіщень немає</p>';
    $('#notifOn').hidden = !('Notification' in window) || Notification.permission !== 'default';
  }
  // нове після відкриття сторінки → спливашка, а якщо вкладка у фоні — системне сповіщення
  for (const x of items) {
    if (x.t <= loadedAt || pushed.has(x.id)) continue;
    pushed.add(x.id);
    if (document.visibilityState === 'visible') toast(`${x.icon} ${x.text}`);
    else systemNotify(`${x.icon} ${x.text}`, x.id);
  }
  // новий рівень учня
  if (me && token) {
    const lvl = myGrowth().lvl, k = 'rozklad-lvl-' + token;
    let was = 0; try { was = +localStorage.getItem(k) || 0; } catch {}
    if (lvl > was) {
      // перші секунди дані ще догружаються — рівень лише запам'ятовуємо, без вітання
      if (was && Date.now() - loadedAt > 6000) { toast(`🎉 Новий рівень ${lvl}! Ти тепер ${rank(lvl)}`); systemNotify(`🎉 Новий рівень ${lvl}!`, 'lvl' + lvl); }
      try { localStorage.setItem(k, lvl); } catch {}
    }
  }
}
function systemNotify(body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opt = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png' };
  navigator.serviceWorker?.getRegistration().then(r => r ? r.showNotification('Balan Study', opt) : new Notification('Balan Study', opt)).catch(() => {});
}
function askNotif() {
  if (!('Notification' in window)) return toast('Цей браузер не підтримує сповіщення. На iPhone спершу додай сайт на головний екран');
  if (Notification.permission === 'denied') return toast('Сповіщення заблоковані — дозволь їх у налаштуваннях браузера для цього сайту');
  Notification.requestPermission().then(p => { if (p === 'granted') systemNotify('Сповіщення увімкнено 👌', 'hello'); render(); });
}
$('#bell').onclick = () => {
  const dlg = $('#notifDlg'), items = feed();
  dlg.dataset.seen = getSeen();
  try { localStorage.setItem(seenKey(), Math.max(getSeen(), ...items.map(x => x.t), 0)); } catch {}
  dlg.showModal();
  render();
};
$('#notifOn').onclick = askNotif;
$('#notifList').onclick = e => {
  const b = e.target.closest('[data-i]');
  if (!b) return;
  const x = feed()[+b.dataset.i];
  $('#notifDlg').close();
  if (!x) return;
  if (x.chat) chatName = x.chat;
  if (x.go.startsWith('tab:')) { setView(x.go); if (matchMedia('(min-width: 761px)').matches) $('#panel').scrollIntoView(); return; }
  setView(x.go === 'me-chat' ? 'chat' : 'profile');
  if (x.go !== 'me-chat') showTab($('#me .tabs'), x.go);
  if (matchMedia('(min-width: 761px)').matches) $('#me').scrollIntoView();
};

// ---------- Відгуки: учень оцінює урок 1–5 зірок, викладач бачить середнє в статистиці ----------
const shortDay = d => parseIso(d).toLocaleDateString('uk', { day: 'numeric', month: 'short' });
const avgRating = list => ({ rate: list.length ? list.reduce((a, x) => a + x.stars, 0) / list.length : 0, rated: list.length });
console.assert(avgRating([{ stars: 5 }, { stars: 4 }]).rate === 4.5 && avgRating([]).rate === 0, 'avgRating()');
// Оцінка дня у «Відмітках» (якщо уроків кілька — остання)
const rateOf = (n, date) => Object.values(ratings).filter(x => x.token === students[n]?.token && x.date === date).sort((a, b) => ms(b.created) - ms(a.created))[0];
const starsHtml = n => `<span class="rev-stars" aria-label="${n} з 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
const revSeen = () => { try { return +localStorage.getItem('rozklad-rev-seen') || 0; } catch { return 0; } };
function renderNewRevs() {
  const list = Object.values(ratings).filter(x => ms(x.created) > revSeen()).sort((a, b) => ms(b.created) - ms(a.created));
  const box = $('#newRevs');
  box.hidden = !list.length;
  if (!list.length) return;
  box.innerHTML = `<div class="nr-head"><b>⭐ ${list.length === 1 ? 'Новий відгук' : `Нові відгуки · ${list.length}`}</b><button class="ghost link-btn" data-revseen>Прочитано ✓</button></div>
    ${list.slice(0, 5).map(x => { const n = nameByToken(x.token); return `<div class="nr">${faceOf(n)}<div>
      <p><b>${esc(n)}</b> ${starsHtml(x.stars)} <small class="muted">урок ${shortDay(x.date)} · ${new Date(ms(x.created)).toLocaleString('uk', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></p>
      ${x.comment ? `<blockquote>${esc(x.comment)}</blockquote>` : '<small class="muted">без коментаря</small>'}</div></div>`; }).join('')}
    ${list.length > 5 ? `<p class="muted small">Ще ${list.length - 5} — у «Статистиці»</p>` : ''}`;
}
$('#newRevs').onclick = e => {
  if (!e.target.closest('[data-revseen]')) return;
  try { localStorage.setItem('rozklad-rev-seen', Math.max(...Object.values(ratings).map(x => ms(x.created)), Date.now())); } catch {}
  render();
};
function reviewsHtml() {
  const all = Object.values(ratings).sort((a, b) => b.date.localeCompare(a.date) || ms(b.created) - ms(a.created)), a = avgRating(all);
  if (!all.length) return '<h4 class="sep">Відгуки учнів</h4><p class="empty">Ще немає відгуків. Учні оцінюють урок у кабінеті після відмітки «Був».</p>';
  return `<h4 class="sep">Відгуки учнів · загалом ★ ${a.rate.toFixed(1)} (${a.rated})</h4>
    <div class="reviews">${all.slice(0, 8).map(x => `<div class="rev">${starsHtml(x.stars)}
      <b>${esc(nameByToken(x.token))}</b> <small class="muted">урок ${shortDay(x.date)}</small>${x.comment ? `<p>${esc(x.comment)}</p>` : ''}</div>`).join('')}</div>`;
}
// Картка оцінки перемальовується лише коли змінюється урок — щоб не стерти обрані зірки й текст
// Урок, який можна оцінити: щойно минув за розкладом (останні 3 дні) або відмічений «Був» за 7 днів; пропущені — ні
let meRatingsReady = false;
// Оцінка належить конкретній відмітці «Був» (id). Старі оцінки «на день» (id = дата) зараховуємо лише одному уроку того дня.
// Ключ уроку: id відмітки, а якщо кабінет ще в старому форматі без id — «дата_номер уроку в цей день»
const sameDay = x => (me.history || []).filter(h => h.date === x.date && h.status === 'present').reverse();
const rkey = x => x.id || `${x.date}_${sameDay(x).indexOf(x)}`;
function ratingFor(x) {
  if (x.id && meRatings[x.id]) return meRatings[x.id];
  const fb = meRatings[`${x.date}_${sameDay(x).indexOf(x)}`];
  if (fb) return fb;
  const old = meRatings[x.date];
  return old && !old.date && (me.history || []).find(h => h.date === x.date && h.status === 'present') === x ? old : null;
}
// Неоцінені уроки «Був» за 7 днів, найновіший перший
const unrated = () => { const today = tzParts(BASE_TZ, Date.now()).date;
  return (me.history || []).filter(x => x.status === 'present' && x.date >= addDays(today, -7) && !ratingFor(x)); };
const rateCandidate = () => unrated()[0];
const RATE_HINT = ['', 'Зовсім не сподобалось 😕', 'Могло бути краще 🤔', 'Нормально 🙂', 'Добре! 😊', 'Супер! 🤩'];
const starButtons = () => [1, 2, 3, 4, 5].map(i => `<button type="button" data-star="${i}" aria-label="${i} з 5">★</button>`).join('');
const sendRating = (id, date, stars, comment) => run(F.setDoc(F.doc(db, 'public', token, 'ratings', id), { date, stars, comment: comment.trim().slice(0, 300), created: F.serverTimestamp() })
  .then(() => toast(stars >= 4 ? 'Дякую за відгук! 💙' : 'Дякую! Врахуємо, щоб наступний урок був кращим 💙')));
// Спливне вікно після кожної відмітки «Був» — один раз на урок.
// Показуючи його, позначаємо «запитано» всі неоцінені уроки, щоб старі не вискакували чергою одне за одним.
function askRating(x, force) {
  const k = id => `rozklad-rateask-${token}-${id}`;
  if (!force) try { if (localStorage.getItem(k(rkey(x)))) return; unrated().forEach(u => localStorage.setItem(k(rkey(u)), 1)); } catch { return; }
  const f = $('#rateForm'), today = tzParts(BASE_TZ, Date.now()).date;
  f.dataset.id = rkey(x); f.dataset.date = x.date; f.dataset.v = ''; f.reset();
  $('#rateFace').innerHTML = avatarSvg(meAv(), myGrowth().lvl, 84);
  $('#rateTitle').textContent = `Як пройшов урок ${x.date === today ? 'сьогодні' : longDate(x.date)}${x.hour != null ? ` о ${hm(tzParts(tz, instant(x.date, x.hour * 60, BASE_TZ)).min)}` : ''}?`;
  $('#rateStars').innerHTML = starButtons();
  $('#rateHint').textContent = 'Обери від 1 до 5 зірок';
  $('#rateDlgSend').disabled = true;
  $('#rateDlg').showModal();
}
$('#rateStars').onclick = e => {
  const b = e.target.closest('[data-star]');
  if (!b) return;
  const v = +b.dataset.star;
  $('#rateForm').dataset.v = v;
  $('#rateStars').querySelectorAll('[data-star]').forEach(x => x.classList.toggle('on', +x.dataset.star <= v));
  $('#rateHint').textContent = RATE_HINT[v];
  $('#rateDlgSend').disabled = false;
};
$('#rateForm').onsubmit = e => {
  e.preventDefault();
  const f = e.target, v = +f.dataset.v;
  if (!v || !token || !F) return;
  sendRating(f.dataset.id, f.dataset.date, v, f.elements['comment'].value);
  $('#rateDlg').close();
};

function renderRate() {
  const box = $('#rateBox'), x = rateCandidate();
  if (x && meRatingsReady && !isTeacher && !document.querySelector('dialog[open]')) askRating(x);
  const key = x ? rkey(x) : '';
  if (box.dataset.id === key) return;
  box.dataset.id = key;
  box.dataset.d = x ? x.date : '';
  box.dataset.v = '';
  box.hidden = !x;
  box.innerHTML = x ? `<p class="label">⭐ Як тобі урок ${longDate(x.date)}${x.hour != null ? ` о ${hm(tzParts(tz, instant(x.date, x.hour * 60, BASE_TZ)).min)}` : ''}?</p>
    <div class="stars" role="group" aria-label="Оцінка уроку">${starButtons()}</div>
    <div class="rate-more" hidden><input id="rateText" maxlength="300" placeholder="Що сподобалось або що покращити (необов'язково)" aria-label="Коментар"><button class="btn sm" id="rateSend">Надіслати</button></div>` : '';
}
// «☆ Оцінити» в історії — те саме вікно, якщо спливне випадково закрили
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rate]');
  if (!b || !me) return;
  const x = (me.history || []).find(h => rkey(h) === b.dataset.rate);
  if (x) askRating(x, true);
});
$('#rateBox').onclick = e => {
  const box = $('#rateBox'), st = e.target.closest('[data-star]');
  if (st) {
    box.dataset.v = st.dataset.star;
    box.querySelectorAll('[data-star]').forEach(b => b.classList.toggle('on', +b.dataset.star <= +st.dataset.star));
    box.querySelector('.rate-more').hidden = false;
    return;
  }
  if (!e.target.closest('#rateSend') || !+box.dataset.v || !token || !F) return;
  sendRating(box.dataset.id, box.dataset.d, +box.dataset.v, $('#rateText').value);
};

// ---------- Портфоліо: публічна сторінка ?p=код (окремий від коду кабінету, тож нею можна ділитися) ----------
const newCode = len => [...crypto.getRandomValues(new Uint8Array(len))].map(x => (x % 36).toString(36)).join('');
const folioUrl = pid => `${location.origin}${location.pathname}?p=${pid}`;
async function ensurePid(n) {
  const pid = newCode(10);
  await F.setDoc(F.doc(db, 'students', n), { pid }, { merge: true });
  students[n] = { ...students[n], pid };
  return pid;
}
// Дані портфоліо пише викладач (як і кабінет): рівень, медалі, сертифікати, персонаж
function syncFolio(n, st, recs) {
  const g = growthOf(n, recs), all = recs[n] || [], av = avatars[st.token];
  const data = { name: n, lvl: g.lvl, xp: g.xp, medals: g.medals, certs: st.certs || [], lessons: progress(all).present, since: all.length ? all.at(-1).date : '',
    avatar: av ? Object.fromEntries(Object.keys(AV_DEFAULT).map(k => [k, av[k] || AV_DEFAULT[k]])) : null };
  const json = JSON.stringify(data);
  if (synced['p' + st.pid] === json) return;
  synced['p' + st.pid] = json;
  run(F.setDoc(F.doc(db, 'portfolio', st.pid), data));
}
// Роботи в портфоліо обирає викладач: копія фото з «Моїх робіт» учня
async function togglePub(n, id, tok) {
  const st = students[n] || {}, on = (st.pubWorks || []).includes(id);
  try {
    const pid = st.pid || await ensurePid(n), ref = F.doc(db, 'portfolio', pid, 'works', id);
    if (on) {
      await Promise.all([F.deleteDoc(ref), F.setDoc(F.doc(db, 'students', n), { pubWorks: F.arrayRemove(id) }, { merge: true })]);
      return toast('Роботу прибрано з портфоліо');
    }
    let image = imgCache[id];
    if (!image?.startsWith('data:')) image = (await F.getDoc(F.doc(db, 'public', tok, 'photoData', id))).data()?.image;
    if (!image?.startsWith('data:image/')) return toast('Фото ще не завантажилось, спробуй за секунду');
    await Promise.all([F.setDoc(ref, { image, caption: photos[id]?.caption || '', created: photos[id]?.created || F.serverTimestamp() }),
      F.setDoc(F.doc(db, 'students', n), { pubWorks: F.arrayUnion(id) }, { merge: true })]);
    toast('Робота в портфоліо 🌐');
  } catch (e) { toast(errText(e)); }
}
function shareFolio(url, name) {
  if (navigator.share) return navigator.share({ title: `${name} — портфоліо | Balan Study`, url }).catch(() => {});
  copyText(url, 'Посилання на портфоліо скопійовано');
}

function renderFolio() {
  document.body.classList.add('folio-mode');
  const box = $('#folio');
  box.hidden = false;
  if (folio === null) { box.innerHTML = `<p class="empty">${configured ? 'Завантаження портфоліо…' : 'Firebase не підключено'}</p>`; return; }
  if (!folio) { box.innerHTML = '<div class="folio-hero"><div><h1>Портфоліо не знайдено</h1><p class="lead">Перевір посилання або попроси нове у викладача.</p></div></div>'; return; }
  const f = folio, certs = f.certs || [], medals = f.medals || [];
  const works = Object.entries(folioWorks).filter(([, w]) => typeof w.image === 'string' && w.image.startsWith('data:image/')).sort((a, b) => ms(b[1].created) - ms(a[1].created));
  document.title = `${f.name} — портфоліо | Balan Study`;
  box.innerHTML = `
    <div class="folio-hero">
      <div class="av-big">${avatarSvg(f.avatar || AV_DEFAULT, f.lvl, 150)}</div>
      <div>
        <span class="badge">🌐 Портфоліо учня</span>
        <h1>${esc(f.name)}</h1>
        <p class="lead">Рівень ${f.lvl} · ${rank(f.lvl)}${f.since ? ` · навчається в Balan Study з ${longDate(f.since)} ${f.since.slice(0, 4)}` : ''}</p>
        <div class="nums">
          <div><b>${f.lessons || 0}</b><small>${plural(f.lessons || 0, 'заняття', 'заняття', 'занять')}</small></div>
          <div><b>${medals.length}</b><small>${plural(medals.length, 'медаль', 'медалі', 'медалей')}</small></div>
          ${certs.length ? `<div><b>${certs.length}</b><small>${plural(certs.length, 'сертифікат', 'сертифікати', 'сертифікатів')}</small></div>` : ''}
          ${works.length ? `<div><b>${works.length}</b><small>${plural(works.length, 'робота', 'роботи', 'робіт')}</small></div>` : ''}
        </div>
        <button class="btn ghost sm" data-fshare>📤 Поділитися</button>
      </div>
    </div>
    ${certs.length ? `<h2 class="fh">🎓 Сертифікати</h2><div class="folio-certs">${certs.map((c, i) => `<button class="folio-cert" data-fcert="${i}" aria-label="Сертифікат «${esc(c.course)}»">${certSvg(f.name, c)}</button>`).join('')}</div>` : ''}
    ${works.length ? `<h2 class="fh">🚀 Роботи</h2><div class="folio-works">${works.map(([, w]) => `<figure><a href="${w.image}" target="_blank"><img src="${w.image}" alt="${esc(w.caption || 'Робота')}" loading="lazy"></a>${w.caption ? `<figcaption>${esc(w.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
    ${medals.length ? `<h2 class="fh">🏅 Медалі</h2><div class="medals">${medals.map(b => medalHtml(b)).join('')}</div>` : ''}
    <div class="folio-cta">
      <div><h2>Хочете, щоб ваша дитина теж створювала ігри, сайти й 3D-моделі?</h2>
      <p>Індивідуальні онлайн-заняття 1:1 з програмування, створення ігор, сайтів і відеомонтажу.</p></div>
      <a class="btn" href="https://balanstudy.com.ua/" target="_blank" rel="noopener">Дізнатися про заняття</a>
    </div>`;
}
$('#folio').onclick = e => {
  const c = e.target.closest('[data-fcert]');
  if (c) return openCert(folio.name, folio.certs[+c.dataset.fcert]);
  if (e.target.closest('[data-fshare]')) shareFolio(location.href, folio.name);
};

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
let installEvt;
$('.bnav').onclick = e => {
  const b = e.target.closest('[data-view]');
  if (!b) return;
  // у викладача чати живуть у його кабінеті
  setView(b.dataset.view);
};
$('#setList').onclick = e => {
  const a = e.target.closest('[data-set]')?.dataset.set;
  if (a?.startsWith('go:')) return setView(a.slice(3));
  if (a === 'notif') askNotif();
  if (a === 'theme') { $('#theme').click(); render(); }
  if (a === 'tz') $('#tzBtn').click();
  if (a === 'install') $('#install').click();
  if (a === 'logout') forget();
  if (a === 'teacher') $('#login').click();
};
$('#signinForm').onsubmit = e => {
  e.preventDefault();
  const v = e.target.elements['code'].value.trim();
  const code = (v.match(/[?&]s=([a-z0-9]+)/i)?.[1] || v).toLowerCase();
  if (!/^[a-z0-9]{4,32}$/.test(code)) return toast('Перевір код: лише латинські літери й цифри');
  try { localStorage.setItem('rozklad-login', code); } catch {}
  location.href = location.pathname + '?s=' + code + '#profile';
};
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#install').hidden = false; });
$('#install').onclick = () => { installEvt?.prompt(); $('#install').hidden = true; };

// ---------- Firebase ----------
let token = new URLSearchParams(location.search).get('s');
// Збережений код підставляємо лише у встановленому застосунку (він стартує без ?s=);
// у браузері особиста сторінка відкривається тільки за посиланням з ?s=
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// Плюс код, яким учень сам увійшов через «Профіль», — його пам'ятаємо і в браузері
try { token ? localStorage.setItem('rozklad-token', token) : token = (standalone && localStorage.getItem('rozklad-token')) || localStorage.getItem('rozklad-login'); } catch {}
try { meSeen = +localStorage.getItem('rozklad-chat-' + token) || 0; } catch {}

{ const h = decodeURIComponent(location.hash.slice(1)); setView(VIEWS.includes(h) ? h : 'schedule'); }

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
        meMissing = !d.exists();
        if (meMissing) try { if (localStorage.getItem('rozklad-login') === token) localStorage.removeItem('rozklad-login'); } catch {}
        if (me && !$('#search').value) $('#search').value = me.name;
        render();
      }, () => {});
      if (token) F.onSnapshot(F.collection(db, 'public', token, 'photos'), s => {
        mePhotos = {}; s.forEach(d => mePhotos[d.id] = d.data()); render();
      }, () => {});
      if (token) F.onSnapshot(F.collection(db, 'public', token, 'messages'), s => {
        meMsgs = {}; s.forEach(d => meMsgs[d.id] = d.data({ serverTimestamps: 'estimate' })); render();
      }, () => {});
      const mine = (name, set) => token && F.onSnapshot(F.collection(db, 'public', token, name), s => {
        const m = {}; s.forEach(d => m[d.id] = d.data({ serverTimestamps: 'estimate' })); set(m); render();
      }, () => {});
      mine('subs', m => meSubs = m);
      mine('spins', m => meSpins = m);
      mine('notifs', m => meNotifs = m);
      mine('avatar', m => meAvatar = m.me || {});
      mine('ratings', m => { meRatings = m; meRatingsReady = true; });
      // «я в мережі»: раз на хвилину, поки кабінет відкритий на екрані
      const beat = () => token && me && document.visibilityState === 'visible'
        && F.setDoc(F.doc(db, 'public', token, 'presence', 'me'), { at: F.serverTimestamp() }).catch(() => {});
      setInterval(beat, 60_000);
      document.addEventListener('visibilitychange', beat);
      beat.first = setInterval(() => { if (me) { beat(); clearInterval(beat.first); } }, 1000);
      if (folioId) {
        F.onSnapshot(F.doc(db, 'portfolio', folioId), d => { folio = d.exists() ? d.data() : false; render(); }, () => { folio = false; render(); });
        F.onSnapshot(F.collection(db, 'portfolio', folioId, 'works'), s => { folioWorks = {}; s.forEach(d => folioWorks[d.id] = d.data()); render(); }, () => {});
      }

      let unsub = [];
      A.onAuthStateChanged(auth, user => {
        unsub.forEach(u => u()); unsub = [];
        syncPublic.ready = false;
        isTeacher = !!user && user.email === TEACHER_EMAIL;
        document.body.classList.toggle('teacher', isTeacher);
        $('#login').textContent = user ? 'Вийти' : 'Вхід для викладача';
        if (user && !isTeacher) toast('Цей акаунт не має доступу до редагування');
        if (!isTeacher && curView.startsWith('tab:')) setView('schedule');
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
            ...['subs', 'spins', 'avatar', 'ratings', 'presence'].map(name => F.onSnapshot(F.collectionGroup(db, name), s => {
              const m = {};
              s.forEach(d => m[d.id + '@' + d.ref.parent.parent.id] = { ...d.data({ serverTimestamps: 'estimate' }), id: d.id, token: d.ref.parent.parent.id });
              if (name === 'subs') subs = m;
              if (name === 'spins') spins = Object.fromEntries(Object.entries(m).map(([k, x]) => [k, { ...x, week: x.id }]));
              if (name === 'presence') presence = Object.fromEntries(Object.values(m).map(x => [x.token, ms(x.at)]));
              if (name === 'ratings') ratings = Object.fromEntries(Object.entries(m).map(([k, x]) => [k, { ...x, date: x.date || x.id }]));
              if (name === 'avatar') avatars = Object.fromEntries(Object.values(m).map(x => [x.token, x]));
              render();
            }, e => toast(e.message))),
            F.onSnapshot(F.collectionGroup(db, 'messages'), s => {
              msgs = {}; s.forEach(d => msgs[d.id] = { ...d.data({ serverTimestamps: 'estimate' }), token: d.ref.parent.parent.id }); render();
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

// ---------- Мова сайту: Google Translate через cookie googtrans (оригінал — українська) ----------
// shortcut: машинний переклад усієї сторінки; якщо треба вивірений текст — окремі словники i18n
const LANGS = { uk: 'Українська', ru: 'Русский', en: 'English', de: 'Deutsch', pl: 'Polski', fr: 'Français', es: 'Español', it: 'Italiano',
  pt: 'Português', nl: 'Nederlands', cs: 'Čeština', sk: 'Slovenčina', ro: 'Română', hu: 'Magyar', bg: 'Български', el: 'Ελληνικά',
  sv: 'Svenska', da: 'Dansk', no: 'Norsk', fi: 'Suomi', et: 'Eesti', lv: 'Latviešu', lt: 'Lietuvių', hr: 'Hrvatski', sl: 'Slovenščina', sr: 'Српски', ga: 'Gaeilge' };
const siteLang = document.cookie.match(/(?:^|;\s*)googtrans=\/uk\/([\w-]+)/)?.[1] || 'uk';
$('#lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}"${k === siteLang ? ' selected' : ''}>${v}</option>`).join('');
$('#langCode').textContent = siteLang.toUpperCase();
$('#lang').onchange = e => {
  const v = e.target.value, gone = v === 'uk' ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '';
  // Google ставить cookie і на домен, і на .домен — ставимо/чистимо всі варіанти
  for (const d of ['', '; domain=' + location.hostname, '; domain=.' + location.hostname.replace(/^www\./, '')])
    document.cookie = `googtrans=/uk/${v}; path=/${d}${gone}`;
  location.reload();
};
if (siteLang !== 'uk') {
  window.gtInit = () => new google.translate.TranslateElement({ pageLanguage: 'uk', autoDisplay: false }, 'gt');
  const sc = document.createElement('script');
  sc.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit';
  sc.onerror = () => toast('Переклад недоступний — перевір інтернет');
  document.head.append(sc);
}
