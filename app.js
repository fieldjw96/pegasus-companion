import { wordmark } from './lib/logo.js';
import { icon, PLANE_PATH } from './lib/icons.js';
import * as D from './lib/data.js';
import { parse, normalize } from './lib/parse.js';
import { resolve, optionsFor, priceTrip, bundleWhy, bundlePrice, flightOf, codeFor, waitingOn, partyLabel, TIME_LABEL } from './lib/agent.js';
import { replay, gate, headsUp, typeFromDob } from './lib/talk.js';
import { todayISO, fmtDay, fmtDob, fmtDuration, daysBetween, addDays, MONTHS } from './lib/dates.js';

const VERSION = '0.2.0';
const params = new URLSearchParams(location.search);
const TODAY = params.get('today') || todayISO();
const NAME = params.get('name') || D.ME.first;

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const overlay = $('#overlay');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const euro = (n) => `€${Math.round(n).toLocaleString('en-US')}`;
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// ---- state ----------------------------------------------------------------------
// The trip is never stored, only what you said and tapped (lib/talk.js replays it).

const store = {
  get(key, fallback) {
    try {
      const v = sessionStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: the session still works, it just won't survive a reload */
    }
  },
};

const S = {
  events: store.get('wt.events', []),
  status: store.get('wt.status', 'draft'),
  pnr: store.get('wt.pnr', null),
  connections: store.get('wt.connections', { trip: true }),
  draft: '', // the first sentence, while you type or say it
  open: null, // the row that is open
  filling: null, // the traveler whose details are being typed
  pickingDates: false,
  strip: null, // the change whose receipt shows above the bar
  privacy: false,
  listening: null, // 'first' | 'change'
};
// A scripted demo (?say=) always starts from an empty trip.
if (params.get('say')) Object.assign(S, { events: [], status: 'draft', pnr: null });

let V = null; // what the events add up to: { r, trip, said, orange }
let TIPS = [];
const started = () => S.events.length > 0;
const locked = () => S.status === 'booked';
const save = () => {
  store.set('wt.events', S.events);
  store.set('wt.status', S.status);
  store.set('wt.pnr', S.pnr);
  store.set('wt.connections', S.connections);
};
function recompute() {
  if (started()) V = replay(S.events, TODAY, S.connections);
  else V = S.draft.trim() ? replay([{ id: 'draft', k: 'say', text: S.draft }], TODAY, S.connections) : null;
}
let seq = 0;
const newId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;
function push(e) {
  S.events.push({ id: newId(), ...e });
  save();
  recompute();
}

// ---- small pieces ---------------------------------------------------------------

function src(key, withLabel = false) {
  const s = D.SOURCES[key === 'agent' ? 'pegasus' : key] || D.SOURCES.guess;
  return `<span class="src" style="--c:${s.color}" title="${esc(s.label)}">${icon(s.icon)}${withLabel ? `<em>${esc(s.label)}</em>` : ''}</span>`;
}
const initials = (p) => (p.guest ? '+' : `${p.first[0]}${p.last[0] || ''}`);
const hue = (i) => [212, 28, 150, 268, 340, 190, 45, 100][i % 8];
const avatar = (p, i, extra = '') => `<span class="av ${extra}" style="--h:${hue(i)}" title="${esc(`${p.first} ${p.last}`)}">${esc(initials(p))}</span>`;
const listNames = (xs) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// Only touch the DOM when the markup really changed, so nothing re-animates on a repaint.
function setHTML(el, html) {
  if (el && el.lastHTML !== html) {
    el.innerHTML = html;
    el.lastHTML = html;
  }
}

let toastTimer;
function toast(html) {
  const el = $('#toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function bump(el) {
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ---- the flying logo ---------------------------------------------------------------

const ORBIT = 'M160 110C78 110 8 92 8 60S78 10 160 10s152 18 152 50-70 50-152 50Z';
function flyer() {
  const trail = (len, w, op) =>
    `<path d="${ORBIT}" pathLength="100" class="trail" stroke-width="${w}" opacity="${op}" stroke-dasharray="${len} ${100 - len}">` +
    `<animate attributeName="stroke-dashoffset" values="${len};${len - 100}" dur="8s" repeatCount="indefinite"/></path>`;
  return `<div class="flyer">
    <svg class="orbit" viewBox="0 0 320 120" aria-hidden="true">
      <defs><linearGradient id="trailGrad" x1="0" x2="1"><stop offset="0" stop-color="#FFBF00"/><stop offset=".6" stop-color="#FF5E00"/><stop offset="1" stop-color="#E31F26"/></linearGradient></defs>
      ${trail(36, 1.4, 0.22)}${trail(20, 2.4, 0.5)}${trail(8, 3.4, 1)}
      <g><path d="${PLANE_PATH}" fill="#E31F26" transform="scale(1.3)"/><animateMotion dur="8s" repeatCount="indefinite" rotate="auto" path="${ORBIT}"/></g>
    </svg>
    <div class="wm">${wordmark()}</div>
  </div>`;
}

// ---- the one screen ----------------------------------------------------------------

const EXAMPLES = [
  'Antalya with my wife and our baby, 10 to 14 Nov, morning',
  'Barcelona with the boys, cheapest, no bags',
  'Home to Izmir Friday morning, back Sunday',
  'Amsterdam next weekend, evening flights',
];
const CHANGES = ['make it 5 nights', 'add my mom', 'evening flight back', 'seats together', 'a day earlier', 'switch to Saver Plus'];

function renderTalk() {
  document.title = 'Pegasus · Where to';
  app.className = 'page-talk';
  app.innerHTML = `
    <div class="sky" aria-hidden="true"><i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i></div>
    <header class="topbar">
      <button class="me" data-act="privacy" aria-label="What it uses" title="What it uses">${esc(NAME[0])}</button>
      <div class="top-right">
        <button class="icon-btn" data-act="newtrip" id="newTrip" aria-label="New trip" title="New trip">${icon('refresh')}</button>
        <button class="icon-btn" data-act="classic" aria-label="Classic booking" title="Classic booking">${icon('grid')}</button>
      </div>
      <div id="privacy"></div>
    </header>
    <main class="talk">
      <section class="hero">${flyer()}<h1>Where to next, <span>${esc(NAME)}</span>?</h1></section>
      <div id="top"></div>
      <section class="frame" id="frame"></section>
      <footer class="foot">Where to · v${VERSION} · prototype with mock data</footer>
    </main>
    <div class="dock" id="dock" hidden>
      <div class="dock-inner">
        <div id="strip"></div>
        <form class="say" id="say" autocomplete="off">
          <button type="button" class="mic" data-act="mic" data-for="change" aria-label="Say a change" title="Say a change">${icon('mic')}<span class="ring"></span><span class="ring r2"></span></button>
          <input id="chg" aria-label="Change anything" placeholder="Change anything: “${esc(CHANGES[0])}”" enterkeyhint="send" />
          <button type="submit" class="go" aria-label="Change it" title="Change it">${icon('arrowUp')}</button>
        </form>
        <div id="bookbar"></div>
      </div>
    </div>`;
  $('#say').addEventListener('submit', (e) => {
    e.preventDefault();
    submitChange();
  });
  rotate($('#chg'), CHANGES.map((c) => `Change anything: “${c}”`));
  recompute();
  paintAll();
}

function paintAll() {
  app.classList.toggle('started', started());
  $('#newTrip').hidden = !started();
  paintPrivacy();
  paintTop();
  paintFrame();
  paintDock();
}

// ---- top: the sentence box, then what you said ------------------------------------

function paintTop() {
  const el = $('#top');
  if (!started()) {
    if ($('#q')) return paintMeter();
    el.innerHTML = `
      <form class="ask" id="ask" autocomplete="off">
        <div class="ask-main">
          <textarea id="q" rows="1" aria-label="Where to?" placeholder="${esc(EXAMPLES[0])}"></textarea>
          <div class="wave" aria-hidden="true">${Array.from({ length: 32 }, (_, i) => `<i style="--d:${(0.42 + ((i * 37) % 11) / 22).toFixed(2)}s"></i>`).join('')}</div>
        </div>
        <button type="button" class="mic" data-act="mic" data-for="first" aria-label="Speak" title="Speak">${icon('mic')}<span class="ring"></span><span class="ring r2"></span></button>
        <button type="submit" class="go" aria-label="Go"><svg class="meter" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20.5" pathLength="3"/></svg>${icon('arrowUp')}</button>
      </form>
      <p class="lead">Where, when and what time of day is enough. It fills in the rest, and you change anything by talking.</p>`;
    wireComposer();
    return paintMeter();
  }
  const s = V.said;
  setHTML(el, `<section class="said" id="said" aria-label="What you said">
    <ol>${s
      .map(
        (x) => `<li class="${x.first ? 'first' : 'chg'}${x.id === S.strip ? ' fresh' : ''}">
        <p class="words">${icon('mic')}<q>${readback(x)}</q></p>
        ${x.receipt ? `<p class="rc"><span>${x.receipt.map(esc).join(' · ')}</span>${locked() ? '' : `<button class="undo" data-act="undo" data-id="${x.id}">Undo</button>`}</p>` : ''}
      </li>`,
      )
      .join('')}</ol>
    ${V.orange.length && !locked() ? `<p class="ow-note">${icon('spark')}<span>Orange words weren't used. Tap one to let it go, or say it another way.</span></p>` : ''}
  </section>`);
}

// Your words come back as you said them; the ones it couldn't use are orange buttons.
function readback(s) {
  const queue = s.unplaced.map((u) => ({ ...u }));
  let out = '';
  let at = 0;
  for (const m of s.text.matchAll(/[\p{L}\d][\p{L}\d'’\-]*/gu)) {
    out += esc(s.text.slice(at, m.index));
    at = m.index + m[0].length;
    const n = normalize(m[0]);
    const k = queue.findIndex((u) => u.word === n);
    if (k < 0) {
      out += esc(m[0]);
      continue;
    }
    const u = queue.splice(k, 1)[0];
    out += u.cleared || locked()
      ? `<span class="ow done" title="Let go">${esc(m[0])}</span>`
      : `<button class="ow" data-act="clear" data-say="${s.id}" data-word="${esc(u.word)}" title="Not used. Tap to let it go">${esc(m[0])}</button>`;
  }
  return out + esc(s.text.slice(at));
}

function wireComposer() {
  const ta = $('#q');
  ta.value = S.draft;
  autosize(ta);
  ta.addEventListener('input', () => {
    S.draft = ta.value;
    autosize(ta);
    live();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitFirst();
    }
  });
  $('#ask').addEventListener('submit', (e) => {
    e.preventDefault();
    commitFirst();
  });
  rotate(ta, EXAMPLES);
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
}

const rotations = new WeakMap();
function rotate(el, list) {
  clearInterval(rotations.get(el));
  let i = 0;
  rotations.set(
    el,
    setInterval(() => {
      if (!document.body.contains(el)) return clearInterval(rotations.get(el));
      i = (i + 1) % list.length;
      el.classList.add('ph-out');
      setTimeout(() => {
        el.placeholder = list[i];
        el.classList.remove('ph-out');
      }, 220);
    }, 3600),
  );
}

function setDraft(txt) {
  S.draft = txt;
  const ta = $('#q');
  if (ta) {
    ta.value = txt;
    autosize(ta);
  }
  live();
}

// Re-read the sentence on every keystroke (or every word heard) so the trip fills as you talk.
function live() {
  recompute();
  paintFrame();
  paintMeter();
}

function paintMeter() {
  const ask = $('#ask');
  if (!ask) return;
  const filled = V && V.r ? ['where', 'when', 'time'].filter((k) => V.r.slots[k]).length : 0;
  ask.style.setProperty('--fill', filled);
  ask.dataset.fill = filled;
  ask.classList.toggle('ready', filled === 3);
}

function commitFirst() {
  const text = S.draft.trim();
  if (!text) {
    bump($('#ask'));
    return $('#q') && $('#q').focus();
  }
  Object.assign(S, { events: [{ id: newId(), k: 'say', text }], draft: '', status: 'draft', pnr: null, strip: null, open: null, filling: null, pickingDates: false });
  save();
  recompute();
  if (V.r && V.r.missing.length) S.open = V.r.missing[0];
  paintAll();
}

function submitChange() {
  const input = $('#chg');
  const text = input.value.trim();
  if (!text || locked()) return bump($('#say'));
  input.value = '';
  push({ k: 'say', text });
  showStrip(S.events[S.events.length - 1].id);
  if (V.r && V.r.missing.length) S.open = V.r.missing[0];
  paintAll();
}

// The receipt sits above the bar for a few seconds; the list of what you said keeps it.
let stripTimer;
function showStrip(id) {
  S.strip = id;
  clearTimeout(stripTimer);
  stripTimer = setTimeout(() => {
    if (S.strip !== id) return;
    S.strip = null;
    if (started()) paintDock();
  }, 7000);
}

// ---- the trip, filling in --------------------------------------------------------

let lastSigs = null;
function paintFrame() {
  const el = $('#frame');
  if (!el) return;
  const t = V && V.trip;
  el.className = `frame${t ? ' full' : ''}${locked() ? ' locked' : ''}`;
  const head = t
    ? `<h2>${t.emoji} ${esc(t.title)}</h2><span>${locked() ? `Booked · PNR ${esc(S.pnr)}` : 'Say a change, or tap a row'}</span>`
    : `<h2>Your trip</h2><span>${started() ? 'A tap or a sentence finishes it' : 'Fills in as you talk'}</span>`;
  el.innerHTML = `<div class="frame-head">${head}</div>${(!V || !V.r ? ghostRows() : t ? fullRows(V) : partialRows(V.r)).join('')}`;
  // a row whose value just changed flashes once
  const sigs = new Map([...el.querySelectorAll('.row')].map((r) => [r.dataset.row, r.dataset.sig]));
  if (lastSigs) for (const r of el.querySelectorAll('.row')) if (lastSigs.has(r.dataset.row) && lastSigs.get(r.dataset.row) !== r.dataset.sig) r.classList.add('flash');
  lastSigs = sigs;
}

function row(key, o) {
  const isOpen = !locked() && !!(o.force || (S.open === key && o.body));
  const tappable = !locked() && !!o.body && !o.force;
  return `<div class="row ${o.state || 'on'}${isOpen ? ' open' : ''}" data-row="${key}" data-sig="${esc(o.main + (o.sub || ''))}">
    <button class="row-main" data-act="row" data-row="${key}" ${tappable ? `aria-expanded="${isOpen}"` : 'disabled'}>
      <span class="row-ic">${icon(o.ic)}</span>
      <span class="row-txt"><b>${o.main}</b>${o.sub ? `<span>${o.sub}</span>` : ''}</span>
      ${o.from ? src(o.from) : ''}
      ${tappable ? `<span class="row-more">${icon('chevron', isOpen ? 'up' : '')}</span>` : ''}
    </button>
    ${isOpen ? `<div class="row-body">${o.body}</div>` : ''}
    ${o.tip || ''}
  </div>`;
}

const rule = (text) => `<p class="rule">${src('pegasus')}<span>${esc(text)}</span></p>`;
function tipHTML(tip) {
  const i = TIPS.indexOf(tip);
  return `<div class="tip">${icon('spark')}<span>${esc(tip.text)}</span>${locked() ? '' : `<button class="tip-act" data-act="tip" data-i="${i}">${esc(tip.label)}</button>`}</div>`;
}

function ghostRows() {
  return [
    row('where', { ic: 'pin', main: 'Where to?', sub: 'Needed', state: 'ghost' }),
    row('when', { ic: 'calendar', main: 'When?', sub: 'Needed', state: 'ghost' }),
    row('time', { ic: 'clock', main: 'What time of day?', sub: 'Needed', state: 'ghost' }),
    row('who', { ic: 'people', main: 'Just you', sub: 'Unless you say who', state: 'ghost' }),
    row('bags', { ic: 'cabin', main: 'Bags', sub: 'From what you say, or your past trips', state: 'ghost' }),
  ];
}

const SLOT_Q = { where: 'Where to?', when: 'When?', time: 'What time of day?', who: 'How many of you?', lap: 'A seat or a lap?' };
function askBody(k, r) {
  const mo = r.p.dates.monthOnly;
  const q =
    k === 'where' && r.p.unknown
      ? `Pegasus doesn't fly to ${r.p.unknown.name} yet. Closest fit:`
      : k === 'when' && mo
        ? `Which weekend in ${MONTHS[mo - 1]}?`
        : k === 'lap'
          ? `${r.party.infants} babies, ${r.party.adults} adult${r.party.adults > 1 ? 's' : ''}: one baby per adult can sit on a lap (Pegasus rule).`
          : null;
  const opts = optionsFor(k, r, TODAY);
  return `${q ? `<p class="ask-q">${esc(q)}</p>` : ''}
    <div class="opts">${opts.map((o, i) => `<button type="button" class="opt" style="--i:${i}" data-act="pick" data-slot="${k}" data-value="${esc(JSON.stringify(o.value))}">${esc(o.label)}</button>`).join('')}</div>
    ${k === 'when' && S.pickingDates ? `<div class="datepick"><input type="date" id="dOut" min="${TODAY}" aria-label="Departure"><span>${icon('back', 'flip')}</span><input type="date" id="dBack" min="${TODAY}" aria-label="Return"><button type="button" class="opt" data-act="dates-done" aria-label="Use these dates">${icon('check')}</button></div>` : ''}
    <p class="or-say">${icon('mic')}Or just say it</p>`;
}

function backNote(wh) {
  if (!wh.back || !['trip', 'guess'].includes(wh.backSrc)) return '';
  return wh.backSrc === 'trip' ? `Back after your usual ${daysBetween(wh.out, wh.back)} nights` : 'Return is a guess: say another';
}

function partialRows(r) {
  const ask = started();
  const rows = [];
  const w = r.slots.where;
  rows.push(
    w
      ? row('where', { ic: 'pin', main: esc(w.label), sub: esc(`From ${D.HOME.city} ${D.HOME.code}`), from: w.src, body: askBody('where', r) })
      : row('where', { ic: 'pin', main: r.p.unknown ? `${esc(r.p.unknown.name)}?` : 'Where to?', sub: r.p.unknown ? "Pegasus doesn't fly there yet" : 'Needed', state: r.p.unknown ? 'warn' : ask ? 'need' : 'ghost', body: ask ? askBody('where', r) : '', force: ask }),
  );
  const wh = r.slots.when;
  rows.push(
    wh
      ? row('when', { ic: 'calendar', main: esc(wh.label), sub: esc(backNote(wh)), from: wh.backSrc === 'trip' || wh.backSrc === 'guess' ? wh.backSrc : wh.src })
      : row('when', { ic: 'calendar', main: 'When?', sub: 'Needed', state: ask ? 'need' : 'ghost', body: ask ? askBody('when', r) : '', force: ask }),
  );
  const tm = r.slots.time;
  rows.push(
    tm
      ? row('time', { ic: 'clock', main: esc(tm.label), sub: tm.note ? esc(tm.note) : '', from: tm.src })
      : row('time', { ic: 'clock', main: 'What time of day?', sub: 'Needed', state: ask ? 'need' : 'ghost', body: ask ? askBody('time', r) : '', force: ask }),
  );
  const party = r.party;
  if (r.missing.includes('who')) rows.push(row('who', { ic: 'people', main: 'How many of you?', sub: 'It won’t guess a head count', state: ask ? 'need' : 'ghost', body: ask ? askBody('who', r) : '', force: ask }));
  else if (r.missing.includes('lap')) rows.push(row('who', { ic: 'people', main: esc(partyLabel(party)), sub: 'One baby per adult on a lap', state: ask ? 'need' : 'ghost', body: ask ? askBody('lap', r) : '', force: ask }));
  else {
    const who = [D.ME.first, ...party.members.map((id) => D.PEOPLE[id].first), ...party.extras.map((e) => e.label), ...(party.guests ? [`${party.guests} more`] : [])];
    rows.push(row('who', { ic: 'people', main: esc(partyLabel(party)), sub: esc(listNames(who)), from: party.src }));
  }
  const bags = r.p.bags;
  rows.push(
    bags
      ? row('bags', { ic: bags.kind === 'none' ? 'backpack' : bags.kind === 'cabin' ? 'cabin' : 'suitcase', main: { none: 'No bags', cabin: 'Cabin bag', checked: `${bags.count || 1} checked bag${bags.count > 1 ? 's' : ''} each` }[bags.kind], from: 'said' })
      : S.connections.trip !== false
        ? row('bags', { ic: 'cabin', main: 'Cabin bag', sub: 'Like your past trips', from: 'trip' })
        : row('bags', { ic: 'backpack', main: 'No bags yet', sub: 'Say if you’re bringing one', from: 'guess' }),
  );
  return rows;
}

function fullRows(v) {
  const t = v.trip;
  const r = v.r;
  TIPS = headsUp(t);
  const tipsFor = (key) => TIPS.filter((x) => x.row === key).map(tipHTML).join('');
  const dest = D.byCode(t.dest);
  return [
    row('where', { ic: 'pin', main: esc(dest.city), sub: esc(`${D.HOME.city} ${D.HOME.code} to ${dest.city} ${dest.code}${dest.intl ? '' : ' · domestic'}`), from: r.slots.where.src, body: askBody('where', r) }),
    legRow(t, r, 'out', tipsFor('out')),
    legRow(t, r, 'back', tipsFor('back')),
    whoRow(t, r),
    bundleRow(t, tipsFor('bundle')),
    seatsRow(t, tipsFor('seats')),
    extrasRow(t),
    priceRow(t),
  ];
}

function legRow(t, r, dir, tip) {
  const leg = t.flights[dir];
  if (!leg) return row('back', { ic: 'landing', main: 'One way', sub: esc('Say “back on Sunday” to add a return'), from: r.slots.when.src });
  const f = flightOf(t, dir);
  const slot = t.time[dir];
  const when = r.slots.when;
  const reason = leg.byYou ? 'Your pick' : leg.bySaid ? 'As you said' : slot === 'any' ? 'Cheapest of the day' : `Cheapest ${TIME_LABEL[slot].toLowerCase()} flight`;
  const guessedBack = dir === 'back' && ['trip', 'guess'].includes(when.backSrc);
  const from = leg.byYou ? 'you' : leg.bySaid ? 'said' : guessedBack ? when.backSrc : t.time.src === 'you' || when.src === 'you' ? 'you' : t.time.src === 'guess' && !t.cheapest ? 'guess' : 'said';
  const nights = dir === 'back' ? daysBetween(t.out, t.back) : null;
  const extra = dir === 'back' ? (nights ? ` · ${nights} night${nights > 1 ? 's' : ''}${guessedBack ? (when.backSrc === 'trip' ? ', your usual' : ', a guess') : ''}` : ' · same day') : '';
  const sameday = dir === 'back' && t.heard.find((h) => h.k === 'sameday');
  return row(dir, {
    ic: dir === 'out' ? 'takeoff' : 'landing',
    main: `${fmtDay(f.date)} <span class="hm">${f.dep} to ${f.arr}${f.nextDay ? '<sup>+1</sup>' : ''}</span>`,
    sub: esc(`${f.no} · ${fmtDuration(f.mins)} · ${reason}${extra}`),
    from,
    body: timesHTML(t, dir),
    tip: (sameday ? rule(sameday.label) : '') + tip,
  });
}

function timesHTML(t, dir) {
  const leg = t.flights[dir];
  const f = flightOf(t, dir);
  const low = Math.min(...leg.list.map((x) => x.fare));
  return `<div class="times" role="radiogroup" aria-label="${dir === 'out' ? 'Flight out' : 'Flight home'}">${leg.list
    .map((x) => {
      const shut = leg.minDep != null && minutes(x.dep) < leg.minDep;
      return `<button class="time${x.no === f.no ? ' on' : ''}" data-act="flight" data-dir="${dir}" data-no="${x.no}" role="radio" aria-checked="${x.no === f.no}"${shut ? ' disabled title="Too soon after you land"' : ''}><b>${x.dep}</b><span>${euro(x.fare)}</span>${x.fare === low ? '<i class="low" title="Lowest fare"></i>' : ''}</button>`;
    })
    .join('')}</div>`;
}

const TYPE_TAG = { child: 'Child', infant: 'Baby · on lap' };
function whoRow(t, r) {
  const waiting = waitingOn(t).length;
  const n = { count: t.travelers.length, adults: 0, children: 0, infants: 0 };
  for (const x of t.travelers) n[x.type === 'infant' ? 'infants' : x.type === 'child' ? 'children' : 'adults'] += 1;
  const names = t.travelers.map((x) => (x.guest ? 'a guest' : x.first));
  const rules = t.heard.filter((h) => h.k === 'two' || h.k === 'lapseat').map((h) => rule(h.label)).join('');
  const lap = n.infants ? rule(`Under 2 flies on a lap: €${D.EXTRAS.infant} per flight, no seat`) : '';
  return row('who', {
    ic: 'people',
    main: `<span class="avatars">${t.travelers.map((p, k) => avatar(p, k, p.confirmed ? 'done' : '')).join('')}</span>${esc(partyLabel(n))}`,
    sub: `${esc(listNames(names))}${waiting && !locked() ? ` · <em class="warn">${waiting} to fill in</em>` : ''}`,
    from: r.party.src,
    state: waiting && !locked() ? 'on todo' : 'on',
    body: paxHTML(t),
    tip: rules + lap,
  });
}

const LINK_FILL = {
  Mom: ['Leah', 'Rosenberg', '1966-03-09'], Dad: ['David', 'Rosenberg', '1963-11-21'],
  Grandma: ['Ruth', 'Rosenberg', '1941-05-30'], Grandpa: ['Sam', 'Rosenberg', '1939-08-14'],
  Sister: ['Tali', 'Rosenberg', '1999-02-17'], Brother: ['Eli', 'Rosenberg', '2001-07-26'],
  Guest: ['Can', 'Aydın', '1995-12-01'],
};

function paxHTML(t) {
  const list = t.travelers
    .map((p, k) => {
      if (S.filling === p.id) return fillRow(t, p, k);
      const needsName = p.placeholder;
      const needsDob = !p.dob && !needsName;
      const required = needsName || (needsDob && p.type !== 'adult');
      const name = p.guest ? 'Guest' : p.placeholder ? p.first : `${p.first} ${p.last}`;
      const sub = p.dob
        ? `${icon('calendar')}${fmtDob(p.dob)}`
        : p.asked
          ? `${icon('send')}Asked through the group link`
          : needsName
            ? p.type === 'adult' ? 'Name needed' : 'Name and birthday needed'
            : p.type !== 'adult' ? 'Birthday needed' : 'Birthday not saved (optional)';
      const action = (needsName || needsDob) && !p.asked
        ? p.type === 'adult'
          ? `<button class="mini" data-act="ask" data-id="${p.id}">${icon('send')}Ask</button>`
          : `<button class="mini" data-act="fill" data-id="${p.id}">${icon('plus')}Add</button>`
        : '';
      return `<li class="${required ? 'missing' : needsDob ? 'soft' : ''}">
        ${avatar(p, k)}
        <span class="pax-main"><b>${esc(name)}${p.id === 'me' ? ' <em>you</em>' : ''}${TYPE_TAG[p.type] ? ` <i class="ptype">${TYPE_TAG[p.type]}</i>` : ''}</b><span>${sub}</span></span>
        ${p.dob ? src(p.src) : ''}
        ${action}
        ${p.confirmed ? `<span class="ok" title="Confirmed">${icon('check')}</span>` : ''}
      </li>`;
    })
    .join('');
  return `<ul class="pax">${list}</ul>
    <div class="linkbox"><span>flypgs.com/t/${esc(t.code)}</span><button class="icon-btn small" data-act="copy" aria-label="Copy the group link" title="Copy the group link">${icon('copy')}</button></div>
    <p class="fine">Everyone on the trip can open this link and type their own details.</p>`;
}

function fillRow(t, p, k) {
  return `<li class="filling">${avatar(p, k)}
    <form class="fill" data-id="${p.id}">
      <input name="first" placeholder="First name" aria-label="First name" value="${esc(p.placeholder ? '' : p.first)}" required>
      <input name="last" placeholder="Last name" aria-label="Last name" value="${esc(p.placeholder ? D.ME.last : p.last)}" required>
      <input name="dob" type="date" max="${t.out}" aria-label="Date of birth" value="${p.dob || ''}" ${p.type === 'adult' ? '' : 'required'}>
      <button type="submit" class="mini">${icon('check')}Save</button>
    </form></li>`;
}

function bundleRow(t, tip) {
  const b = D.bundleById(t.bundle);
  const w = bundleWhy(t);
  const kg = D.BAGS.checkedKg[t.intl ? 'intl' : 'dom'];
  const perks = [
    ['backpack', 'Under seat', '3 kg', b.under, D.BAGS.under],
    ['cabin', 'Cabin bag', '8 kg', b.cabin, D.BAGS.cabin],
    ['suitcase', 'Checked', `${kg} kg`, b.checked, `${kg} kg ${t.intl ? 'international' : 'domestic'}`],
    ['seat', 'Seat', 'Standard', b.seat, 'Free seat selection'],
    ['legroom', 'Legroom', 'Extra', b.legroom, 'Extra-legroom seats'],
    ['meal', 'Sandwich', '', b.meal, 'Sandwich on board'],
    ['tv', 'Fly & Watch', '', b.watch, 'In-flight entertainment'],
    ['refresh', 'Free change', '1×', b.change, 'One free change up to 2 h before departure'],
    ['refund', 'Refund', 'Full', b.refund, 'Full refund on cancellation, service fee excluded'],
  ];
  const base = Math.min(...D.bundlesFor(t.intl).map((o) => bundlePrice(t, o.id)));
  const body = `<div class="bundles">${D.bundlesFor(t.intl)
    .map((o) => {
      const extra = bundlePrice(t, o.id) - base;
      return `<button class="bundle${o.id === t.bundle ? ' on' : ''}" data-act="bundle" data-id="${o.id}" aria-pressed="${o.id === t.bundle}"><b>${o.name}</b><span>${extra ? `+${euro(extra)} each` : 'Lowest'}</span></button>`;
    })
    .join('')}</div>
    <div class="perks">${perks.map(([ic, label, sub, on, title]) => `<div class="perk${on ? ' on' : ''}" title="${esc(title)}">${icon(ic)}<b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</div>`).join('')}</div>`;
  return row('bundle', { ic: 'suitcase', main: esc(b.name), sub: esc(w.text), from: w.src, body, tip });
}

const SEAT_LABEL = { free: 'Seats at check-in', together: 'Seats together', window: 'Window seat', aisle: 'Aisle seat', legroom: 'Extra legroom' };
function seatsRow(t, tip) {
  const b = D.bundleById(t.bundle);
  const seated = t.travelers.filter((x) => x.type !== 'infant').length;
  const fee = (k) => (k === 'free' ? 'Free' : k === 'legroom' ? (b.legroom ? 'Included' : `+${euro(D.EXTRAS.legroom)}`) : b.seat ? 'Included' : `+${euro(D.EXTRAS.seat)}`);
  const options = seated > 1 ? [['free', 'At check-in'], ['together', 'Together']] : [['free', 'At check-in'], ['window', 'Window'], ['aisle', 'Aisle'], ['legroom', 'Legroom']];
  const sub = t.seat === 'free' ? (t.cheapest ? 'Free, since you said cheapest' : 'Free, given at check-in') : fee(t.seat) === 'Included' ? 'In your bundle' : `${fee(t.seat)} each per flight`;
  const from = t.seatSrc === 'you' ? 'you' : t.seatSrc === 'said' || t.cheapest ? 'said' : 'pegasus';
  const body = `<div class="seg">${options.map(([k, l]) => `<button class="${t.seat === k ? 'on' : ''}" data-act="seat" data-v="${k}" aria-pressed="${t.seat === k}"><b>${l}</b><span>${fee(k)}</span></button>`).join('')}</div>`;
  return row('seats', { ic: 'seat', main: SEAT_LABEL[t.seat], sub: esc(sub), from, body, tip });
}

function extrasRow(t) {
  const b = D.bundleById(t.bundle);
  const items = [
    ['insurance', 'shield', 'Insurance', `${euro(D.EXTRAS.insurance)}`],
    ['meal', 'meal', 'Meal', b.meal ? 'Included' : `${euro(D.EXTRAS.meal)}`],
    ['lounge', 'lounge', 'SAW lounge', `${euro(D.EXTRAS.lounge)}`],
    ['car', 'car', 'Car', `${euro(D.EXTRAS.car)}/day`],
  ];
  const on = items.filter(([k]) => t.extras[k] || (k === 'meal' && b.meal)).map(([, , label]) => label);
  const said = Object.entries(t.extrasSrc).some(([, v]) => v === 'said');
  const declined = t.extrasSrc.insurance === 'said' && !t.extras.insurance;
  const body = `<div class="extras">${items
    .map(([k, ic, label, price]) => {
      const lit = t.extras[k] || (k === 'meal' && b.meal);
      return `<button class="extra${lit ? ' on' : ''}" data-act="extra" data-k="${k}" aria-pressed="${!!lit}"${k === 'meal' && b.meal ? ' disabled' : ''}>${icon(ic)}<b>${label}</b><span>${price}</span>${t.extrasSrc[k] === 'said' ? src('said') : ''}</button>`;
    })
    .join('')}</div>`;
  return row('extras', { ic: 'plus', main: on.length ? esc(listNames(on)) : 'No extras', sub: declined ? 'No insurance, as you said' : 'Nothing paid unless you ask', from: said ? 'said' : null, body });
}

function priceRow(t) {
  const price = priceTrip(t);
  const body = `<div class="lines">${price.lines.map((l) => `<div><span>${esc(l.label)}</span><b>${euro(l.amount)}</b></div>`).join('')}
      <div class="total"><span>Total</span><b>${euro(price.total)}</b></div></div>
    <div class="payrow">${icon('card')}<span>Visa •••• 4242</span>${src('profile')}</div>
    <div class="payrow">${icon('mail')}<span>Receipt to y••••@gmail.com</span>${src('profile')}</div>`;
  return row('price', { ic: 'card', main: euro(price.total), sub: esc(price.seated > 1 ? `${euro(price.each)} each · Visa •••• 4242` : 'Visa •••• 4242'), from: 'profile', body });
}

// ---- the bar at the bottom: say a change, see the receipt, book ---------------------

const NEEDS = { where: 'a place', when: 'dates', time: 'a time', who: 'a head count', lap: 'an answer' };
function paintDock() {
  const dock = $('#dock');
  dock.hidden = !started();
  if (!started()) return;
  $('#say').hidden = locked();
  const s = S.strip && !locked() && V.said.find((x) => x.id === S.strip);
  setHTML(
    $('#strip'),
    s ? `<div class="strip">${icon('check')}<span><q>${esc(s.text)}</q> ${esc(s.receipt.join(' · '))}</span><button class="undo" data-act="undo" data-id="${s.id}">Undo</button></div>` : '',
  );
  const g = gate(V);
  const price = V.trip && priceTrip(V.trip);
  const sum = price
    ? `<div class="sum"><b>${euro(price.total)}</b><span>${price.seated > 1 ? `${euro(price.each)} each` : 'total'}</span></div>`
    : `<div class="sum"><b>Almost</b><span>${g.k === 'missing' ? `needs ${g.slots.map((k) => NEEDS[k]).join(' and ')}` : ''}</span></div>`;
  const btn = locked()
    ? `<div class="booked-pill">${icon('check')}Booked · ${esc(S.pnr)}</div>`
    : g.k === 'missing'
      ? `<button class="btn book wait" data-act="to-row" data-row="${g.slots[0]}">Needs ${NEEDS[g.slots[0]]}</button>`
      : g.k === 'orange'
        ? `<button class="btn book wait" data-act="to-said">${icon('spark')}Check ${g.n} word${g.n > 1 ? 's' : ''}</button>`
        : g.k === 'names'
          ? `<button class="btn book wait" data-act="to-who">${icon('people')}Waiting on ${g.n}</button>`
          : `<button class="btn primary book" data-act="book">${icon('check')}Book it</button>`;
  setHTML($('#bookbar'), `<div class="bar">${sum}${btn}</div>`);
}

// ---- what it uses ------------------------------------------------------------------

function paintPrivacy() {
  const el = $('#privacy');
  if (!S.privacy) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<div class="priv" role="dialog" aria-label="What it uses">
    <h3>${icon('lock')}What it uses</h3>
    <ul>
      <li>${src('said')}<span><b>What you say.</b> Speech becomes text on your phone; the audio isn't kept.</span></li>
      <li>${src('profile')}<span><b>Your Pegasus profile.</b> Your name, birthday and saved card.</span></li>
      <li>${src('trip')}<span><b>Your past Pegasus trips.</b> Who you flew with, your usual bags and trip length.</span>
        <label class="switch-wrap"><input type="checkbox" data-c="trip" ${S.connections.trip !== false ? 'checked' : ''} aria-label="Use my past Pegasus trips"><i class="switch"></i></label></li>
    </ul>
    <p>No chats, email, calendar or contacts. What you said is deleted at checkout.</p>
  </div>`;
}

// ---- voice -------------------------------------------------------------------------

let rec = null;
let demoTimer = null;
function setListening(target, demo = false) {
  S.listening = target;
  document.body.classList.toggle('listening', target === 'first');
  document.body.classList.toggle('demo-voice', !!target && demo);
  document.querySelectorAll('.mic').forEach((m) => m.setAttribute('aria-pressed', String(!!target && m.dataset.for === target)));
}
const put = (target, txt) => (target === 'first' ? setDraft(txt) : ($('#chg').value = txt));
const finish = (target) => (target === 'first' ? commitFirst() : submitChange());

function startMic(target) {
  if (S.listening) return stopMic();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  put(target, '');
  if (!SR) return demoVoice(target);
  let heard = false;
  let failed = false;
  try {
    rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      heard = true;
      put(target, Array.from(e.results).map((x) => x[0].transcript).join(' '));
    };
    rec.onerror = () => {
      failed = !heard;
    };
    rec.onend = () => {
      rec = null;
      if (failed) return demoVoice(target);
      setListening(null);
      finish(target);
    };
    rec.start();
    setListening(target);
  } catch {
    demoVoice(target);
  }
}

// No speech recognition here (or it was refused): play the demo sentence instead, labelled as such.
function demoVoice(target) {
  setListening(target, true);
  const words = (target === 'first' ? D.DEMO_UTTERANCE : D.DEMO_CHANGE).split(' ');
  let i = 0;
  clearInterval(demoTimer);
  demoTimer = setInterval(() => {
    put(target, words.slice(0, ++i).join(' '));
    if (i >= words.length) {
      clearInterval(demoTimer);
      demoTimer = null;
      setTimeout(() => {
        setListening(null);
        finish(target);
      }, 450);
    }
  }, 115);
}

function stopMic() {
  if (rec) {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  }
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  setListening(null);
}

let typeTimer;
function typeInto(text, target, done) {
  clearInterval(typeTimer);
  let i = 0;
  typeTimer = setInterval(() => {
    i = Math.min(text.length, i + 3);
    put(target, text.slice(0, i));
    if (i >= text.length) {
      clearInterval(typeTimer);
      setTimeout(done, 380);
    }
  }, 16);
}

// ---- overlays ----------------------------------------------------------------------

function closeOverlay() {
  overlay.innerHTML = '';
}

function showBooked(t) {
  const colors = ['#FFBF00', '#FF5E00', '#E31F26', '#0A2343', '#3B82F6'];
  overlay.innerHTML = `<div class="ov booked">
    <div class="confetti" aria-hidden="true">${Array.from(
      { length: 42 },
      (_, i) => `<i style="--x:${(i * 41) % 100};--r:${(i * 67) % 360}deg;--t:${(1.8 + ((i * 13) % 10) / 10).toFixed(1)}s;--dl:${(i % 7) * 60}ms;background:${colors[i % colors.length]}"></i>`,
    ).join('')}</div>
    <div class="booked-card">
      <svg class="loop" viewBox="0 0 220 110" aria-hidden="true">
        <path d="M10 90C60 90 80 20 120 20s40 50 10 50-20-50 30-50 60 20 60 20" fill="none" stroke="url(#lpGrad)" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"><animate attributeName="stroke-dashoffset" from="100" to="0" dur="1.6s" fill="freeze"/></path>
        <defs><linearGradient id="lpGrad" x1="0" x2="1"><stop offset="0" stop-color="#FFBF00"/><stop offset="1" stop-color="#E31F26"/></linearGradient></defs>
        <g><path d="${PLANE_PATH}" fill="#E31F26" transform="scale(1.6)"/><animateMotion dur="1.6s" fill="freeze" rotate="auto" path="M10 90C60 90 80 20 120 20s40 50 10 50-20-50 30-50 60 20 60 20"/></g>
      </svg>
      <h2>You're going to ${esc(D.byCode(t.dest).city)}!</h2>
      <div class="pnr"><span>PNR</span><b>${esc(S.pnr)}</b></div>
      ${t.travelers.length > 1 ? `<p class="sent">${src('link')} Everyone on the trip gets it through the group link</p>` : ''}
      <button class="btn primary" data-act="close-ov">Done</button>
    </div></div>`;
}

// ---- classic layout ------------------------------------------------------------------

function renderClassic() {
  document.title = 'Pegasus · Book a flight';
  app.className = 'page-classic';
  const isoLabel = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };
  app.innerHTML = `
    <header class="classic-bar">
      <div class="wm-mini">${wordmark()}</div>
      <button class="icon-btn" data-act="home" aria-label="Back to Where to" title="Where to">${icon('spark')}</button>
    </header>
    <main class="classic">
      <h1>Book a flight</h1>
      <form class="classic-card" id="classic">
        <div class="seg trip-type"><button type="button" class="on" data-act="tt" data-v="rt"><b>Round trip</b></button><button type="button" data-act="tt" data-v="ow"><b>One way</b></button></div>
        <label class="field"><span>From</span><select disabled><option>Istanbul Sabiha Gökçen (SAW)</option></select></label>
        <label class="field"><span>To</span><select name="to">${D.NETWORK.map((d) => `<option value="${d.code}">${esc(d.city)} (${d.code})</option>`).join('')}</select></label>
        <div class="two">
          <label class="field"><span>Departure</span><input type="date" name="out" required min="${TODAY}" value="${addDays(TODAY, 14)}"></label>
          <label class="field" id="backField"><span>Return</span><input type="date" name="back" min="${TODAY}" value="${addDays(TODAY, 17)}"></label>
        </div>
        <label class="field"><span>Passengers</span><select name="pax">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<option>${k}</option>`).join('')}</select></label>
        <button class="btn primary wide" type="submit">Search flights</button>
      </form>
    </main>`;
  $('#classic').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const oneWay = $('#backField').hidden;
    const out = f.get('out');
    let back = f.get('back');
    if (!oneWay && (!back || back <= out)) back = addDays(out, 3);
    const city = D.byCode(f.get('to')).city;
    // The form is just another way of saying it: it becomes the first sentence.
    const text = `${city} ${isoLabel(out)}${oneWay ? ' one way' : ` to ${isoLabel(back)}`}, ${f.get('pax')} people, any time`;
    if (!resolve(parse(text, TODAY), { connections: S.connections }).complete) return bump(e.target);
    Object.assign(S, { events: [{ id: newId(), k: 'say', text }], status: 'draft', pnr: null, strip: null, open: null, draft: '' });
    save();
    location.hash = '#/';
  });
}

// ---- actions ---------------------------------------------------------------------------

function scrollTo(el) {
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function openRow(key) {
  S.open = key;
  paintFrame();
  scrollTo($(`.row[data-row="${key}"]`));
}

const actions = {
  classic: () => (location.hash = '#/classic'),
  home: () => (location.hash = '#/'),
  privacy: () => {
    S.privacy = !S.privacy;
    paintPrivacy();
  },
  newtrip: () => {
    stopMic();
    Object.assign(S, { events: [], status: 'draft', pnr: null, draft: '', open: null, strip: null, filling: null, pickingDates: false });
    save();
    lastSigs = null;
    renderTalk();
    window.scrollTo(0, 0);
  },
  mic: (el) => startMic(el.dataset.for),
  row: (el) => {
    const k = el.dataset.row;
    S.open = S.open === k ? null : k;
    S.filling = null;
    paintFrame();
  },
  pick: (el) => {
    const value = JSON.parse(el.dataset.value);
    if (value === 'pick') {
      S.pickingDates = true;
      return paintFrame();
    }
    S.pickingDates = false;
    push({ k: 'pick', slot: el.dataset.slot, value });
    S.open = V.r && V.r.missing.length ? V.r.missing[0] : null;
    paintAll();
  },
  'dates-done': () => {
    const out = $('#dOut').value;
    const back = $('#dBack').value;
    if (!out) return bump($('#dOut'));
    S.pickingDates = false;
    push({ k: 'pick', slot: 'when', value: { out, back: back && back > out ? back : null } });
    S.open = V.r && V.r.missing.length ? V.r.missing[0] : null;
    paintAll();
  },
  flight: (el) => {
    push({ k: 'flight', dir: el.dataset.dir, no: el.dataset.no });
    paintAll();
  },
  bundle: (el) => {
    if (V.trip.bundle === el.dataset.id) return;
    push({ k: 'bundle', bundle: el.dataset.id });
    paintAll();
  },
  seat: (el) => {
    push({ k: 'seat', v: el.dataset.v });
    paintAll();
  },
  extra: (el) => {
    push({ k: 'extra', key: el.dataset.k, on: !V.trip.extras[el.dataset.k] });
    paintAll();
  },
  tip: (el) => {
    const tip = TIPS[+el.dataset.i];
    if (!tip) return;
    push(tip.act);
    paintAll();
    toast(`${icon('check')} ${esc(tip.label)}`);
  },
  clear: (el) => {
    push({ k: 'clear', say: el.dataset.say, word: el.dataset.word });
    paintAll();
  },
  undo: (el) => {
    const id = el.dataset.id;
    S.events = S.events.filter((e) => e.id !== id && !(e.k === 'clear' && e.say === id));
    S.strip = null;
    save();
    recompute();
    paintAll();
    toast(`${icon('refresh')} Undone`);
  },
  ask: (el) => {
    const id = el.dataset.id;
    const x = V.trip.travelers.find((p) => p.id === id);
    push({ k: 'person', pid: id, data: { asked: true } });
    paintAll();
    toast(`${icon('send')} Group link sent to ${esc(x.guest ? 'your guest' : x.first)}`);
    // Demo: they answer from their own phone a moment later.
    const trip = V.trip.id;
    setTimeout(() => {
      if (!V || !V.trip || V.trip.id !== trip || locked()) return;
      const q = V.trip.travelers.find((p) => p.id === id);
      if (!q || (!q.placeholder && q.dob)) return;
      const [first, last, dob] = q.placeholder ? LINK_FILL[q.guest ? 'Guest' : q.first] || LINK_FILL.Guest : [q.first, q.last, '1996-08-03'];
      push({ k: 'person', pid: id, data: { first, last, dob, src: 'link', confirmed: true } });
      paintAll();
      toast(`${icon('check')} ${esc(first)} typed in their own details`);
    }, 2600);
  },
  fill: (el) => {
    S.filling = el.dataset.id;
    S.open = 'who';
    paintFrame();
    const f = $('form.fill input[name="first"]');
    if (f) f.focus();
  },
  copy: () => {
    const url = `https://flypgs.com/t/${V.trip.code}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    toast(`${icon('copy')} Link copied`);
  },
  'to-row': (el) => openRow(el.dataset.row),
  'to-said': () => {
    scrollTo($('#said'));
    document.querySelectorAll('.ow:not(.done)').forEach(bump);
  },
  'to-who': () => {
    openRow('who');
    toast(`${icon('people')} Fill in the travelers marked in orange`);
  },
  book: () => {
    if (gate(V).k !== 'ready') return;
    S.status = 'booked';
    S.pnr = codeFor(`${V.trip.id}pnr`);
    S.strip = null;
    save();
    paintAll();
    showBooked(V.trip);
  },
  'close-ov': () => closeOverlay(),
  tt: (el) => {
    const ow = el.dataset.v === 'ow';
    el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el));
    $('#backField').hidden = ow;
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (S.privacy && !e.target.closest('.priv') && !e.target.closest('.me')) {
    S.privacy = false;
    paintPrivacy();
  }
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el, e);
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form.fill');
  if (!f) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  if (!v.first.trim() || !v.last.trim()) return bump(f);
  const before = V.trip.travelers.find((p) => p.id === f.dataset.id);
  const data = { first: v.first.trim(), last: v.last.trim(), src: 'you', confirmed: true };
  if (v.dob) {
    data.dob = v.dob;
    const { age, type } = typeFromDob(v.dob, V.trip.out);
    if (type !== before.type) toast(`${icon('people')} ${esc(data.first)} is ${age} on the day you fly, so booked as ${type === 'infant' ? 'a baby on a lap' : type === 'child' ? 'a child' : 'an adult'}`);
  }
  S.filling = null;
  push({ k: 'person', pid: f.dataset.id, data });
  paintAll();
});

document.addEventListener('change', (e) => {
  const c = e.target.dataset && e.target.dataset.c;
  if (!c) return;
  S.connections[c] = e.target.checked;
  save();
  recompute();
  paintAll();
});

// ---- routing ---------------------------------------------------------------------------

function route() {
  closeOverlay();
  clearInterval(typeTimer);
  stopMic();
  window.scrollTo(0, 0);
  if (location.hash === '#/classic') renderClassic();
  else renderTalk();
}
addEventListener('hashchange', route);
route();

// ?say=... types a sentence in and runs it; &then=... says a change after it. For demos and screenshots.
const say = params.get('say');
const then = params.get('then');
if (say && location.hash !== '#/classic') {
  setTimeout(
    () =>
      typeInto(say, 'first', () => {
        commitFirst();
        if (then) setTimeout(() => typeInto(then, 'change', submitChange), 900);
      }),
    700,
  );
}
