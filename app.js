import { wordmark } from './lib/logo.js';
import { icon, PLANE_PATH } from './lib/icons.js';
import * as D from './lib/data.js';
import { parse } from './lib/parse.js';
import { resolve, optionsFor, buildTrip, priceTrip, buildSteps, bundleWhy, bundlePrice, flightOf, codeFor, TIME_LABEL } from './lib/agent.js';
import { todayISO, fmtDay, fmtDob, fmtDuration, addDays, MONTHS } from './lib/dates.js';

const VERSION = '0.1.1';
const params = new URLSearchParams(location.search);
const TODAY = params.get('today') || todayISO();
const NAME = params.get('name') || D.ME.first;

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const overlay = $('#overlay');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const euro = (n) => `€${Math.round(n).toLocaleString('en-US')}`;

// ---- state --------------------------------------------------------------

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
  text: '',
  attachments: [],
  picks: {},
  asking: null,
  pickingDates: false,
  r: null,
  origin: null,
  resume: null,
  attachOpen: false,
  connOpen: false,
  threadsAll: false,
  threadsSeen: 5,
  suggShown: 5,
  suggSeen: 5,
  generating: false,
  listening: false,
  connections: store.get('wt.connections', Object.fromEntries(D.CONNECTIONS.map((c) => [c, true]))),
  trips: store.get('wt.trips', {}),
};
const save = () => {
  store.set('wt.trips', S.trips);
  store.set('wt.connections', S.connections);
};
const fullText = () => [S.text, ...S.attachments.map((a) => a.text)].join(' ').trim();
const resolveNow = () => resolve(parse(fullText(), TODAY), { picks: S.picks, connections: S.connections });

// ---- small pieces ---------------------------------------------------------

function src(key, withLabel = false) {
  const s = D.SOURCES[key === 'agent' ? 'pegasus' : key] || D.SOURCES.guess;
  return `<span class="src" style="--c:${s.color}" title="${esc(s.label)}">${icon(s.icon)}${withLabel ? `<em>${esc(s.label)}</em>` : ''}</span>`;
}
const why = (text, from) => `<div class="why">${src(from)}<span>${esc(text)}</span></div>`;
const initials = (p) => (p.guest ? '+' : `${p.first[0]}${p.last[0] || ''}`);
const hue = (i) => [212, 28, 150, 268, 340, 190, 45, 100][i % 8];
const avatar = (p, i, extra = '') => `<span class="av ${extra}" style="--h:${hue(i)}" title="${esc(`${p.first} ${p.last}`)}">${esc(initials(p))}</span>`;

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

// ---- the flying logo --------------------------------------------------------

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

// ---- home -------------------------------------------------------------------

const EXAMPLES = [
  'Barcelona with the boys, cheapest, no bags',
  'Home to Izmir Friday morning, back Sunday',
  'Antalya with Dana for the wedding',
  'Amsterdam next weekend, evening flights',
];

function renderHome() {
  document.title = 'Pegasus · Where to';
  app.className = 'page-home';
  S.attachOpen = false;
  app.innerHTML = `
    <div class="sky" aria-hidden="true"><i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i></div>
    <header class="topbar">
      <span class="me" title="${esc(NAME)}">${esc(NAME[0])}</span>
      <button class="icon-btn" data-act="classic" aria-label="Classic booking" title="Classic booking">${icon('grid')}</button>
    </header>
    <main class="home">
      <section class="hero">
        ${flyer()}
        <h1>Where to next, <span>${esc(NAME)}</span>?</h1>
      </section>
      <form class="ask" id="ask" autocomplete="off">
        <button type="button" class="ask-plus" data-act="attach" aria-label="Add context" title="Add context">${icon('plus')}</button>
        <div class="ask-main">
          <div class="att" id="att"></div>
          <textarea id="q" rows="1" aria-label="Where to?" placeholder="${esc(EXAMPLES[0])}"></textarea>
          <div class="wave" aria-hidden="true">${Array.from({ length: 32 }, (_, i) => `<i style="--d:${(0.42 + ((i * 37) % 11) / 22).toFixed(2)}s"></i>`).join('')}</div>
        </div>
        <button type="button" class="mic" data-act="mic" aria-label="Speak" title="Speak">${icon('mic')}<span class="ring"></span><span class="ring r2"></span></button>
        <button type="submit" class="go" aria-label="Go"><svg class="meter" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20.5" pathLength="3"/></svg>${icon('arrowUp')}</button>
        <div class="menu" id="attachMenu" hidden></div>
      </form>
      <div class="slots" id="slots"></div>
      <div class="asking" id="asking"></div>
      <section class="context">
        <div class="col" id="prev"></div>
        <div class="col" id="sugg"></div>
      </section>
      <footer class="foot">Where to · v${VERSION} · prototype with mock data</footer>
    </main>`;
  wireComposer();
  paintAttachments();
  live();
  paintPrev();
  paintSugg();
}

function wireComposer() {
  const ta = $('#q');
  ta.value = S.text;
  autosize(ta);
  ta.addEventListener('input', () => {
    S.text = ta.value;
    autosize(ta);
    live();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  $('#ask').addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });
  rotatePlaceholder(ta);
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
}

let phTimer;
function rotatePlaceholder(ta) {
  let i = 0;
  clearInterval(phTimer);
  phTimer = setInterval(() => {
    if (!document.body.contains(ta)) return clearInterval(phTimer);
    i = (i + 1) % EXAMPLES.length;
    ta.classList.add('ph-out');
    setTimeout(() => {
      ta.placeholder = EXAMPLES[i];
      ta.classList.remove('ph-out');
    }, 220);
  }, 3600);
}

function setText(txt) {
  S.text = txt;
  const ta = $('#q');
  if (ta) {
    ta.value = txt;
    autosize(ta);
  }
  live();
}

// Re-read the sentence on every keystroke so the three slots fill as you talk.
function live() {
  const text = fullText();
  if (!text) {
    S.r = null;
    S.asking = null;
    S.picks = {};
    S.pickingDates = false;
  } else {
    S.r = resolveNow();
    if (S.asking && S.r.slots[S.asking]) S.asking = S.r.missing[0] || null;
  }
  paintSlots();
  paintAsking();
}

function previewChips(p) {
  const out = [];
  if (p.party.count > 1 || p.party.explicit) out.push(['people', p.party.count === 1 ? 'Just you' : `${p.party.count} people`, p.party.src]);
  if (p.bags) out.push([p.bags.kind === 'none' ? 'backpack' : p.bags.kind === 'cabin' ? 'cabin' : 'suitcase', { none: 'No bags', cabin: 'Cabin bag', checked: `${p.bags.count || 1} bag` }[p.bags.kind], 'said']);
  if (p.budget.cheapest) out.push(['tag', 'Cheapest', 'said']);
  if (p.budget.flex) out.push(['refresh', 'Flexible', 'said']);
  if (p.insurance === false) out.push(['shield', 'No insurance', 'said']);
  if (p.seats === 'together') out.push(['seat', 'Together', 'said']);
  if (p.autopilot) out.push(['spark', 'No steps', 'said']);
  return out;
}

function paintSlots() {
  const el = $('#slots');
  if (!el) return;
  const r = S.r;
  const pill = (k, ic, empty) => {
    const s = r && r.slots[k];
    const unknown = k === 'where' && !s && r && r.p.unknown;
    const cls = ['slot', s ? 'on' : '', S.asking === k ? 'pending' : '', unknown ? 'warn' : ''].join(' ');
    const label = s ? s.label : unknown ? `${unknown.name}?` : empty;
    return `<button type="button" class="${cls}" data-act="slot" data-slot="${k}">${icon(ic)}<span>${esc(label)}</span>${s ? src(s.src) : ''}</button>`;
  };
  const filled = r ? 3 - r.missing.length : 0;
  el.innerHTML =
    `<div class="slot-row">${pill('where', 'pin', 'Where')}${pill('when', 'calendar', 'When')}${pill('time', 'clock', 'What time')}</div>` +
    (r ? `<div class="chip-row">${previewChips(r.p).map(([ic, label, from]) => `<span class="pchip">${icon(ic)}${esc(label)}${src(from)}</span>`).join('')}</div>` : '');
  const ask = $('#ask');
  ask.style.setProperty('--fill', filled);
  ask.dataset.fill = filled;
  ask.classList.toggle('ready', filled === 3);
}

function paintAsking() {
  const el = $('#asking');
  if (!el) return;
  if (!S.asking || !S.r) {
    el.className = 'asking';
    el.innerHTML = '';
    return;
  }
  const k = S.asking;
  const unknown = k === 'where' && S.r.p.unknown;
  const mo = S.r.p.dates.monthOnly;
  const q = {
    where: unknown ? `Pegasus doesn't fly to ${unknown.name} yet. Closest fit:` : 'Where to?',
    when: mo ? `Which weekend in ${MONTHS[mo - 1]}?` : 'When?',
    time: 'What time of day?',
  }[k];
  const opts = optionsFor(k, S.r, TODAY);
  el.className = 'asking show';
  el.innerHTML = `
    <div class="ask-q">${icon(k === 'where' ? 'pin' : k === 'when' ? 'calendar' : 'clock')}<span>${esc(q)}</span></div>
    <div class="opts">${opts
      .map((o, i) => `<button type="button" class="opt" style="--i:${i}" data-act="pick" data-slot="${k}" data-value="${esc(JSON.stringify(o.value))}">${esc(o.label)}</button>`)
      .join('')}</div>
    ${S.pickingDates ? `<div class="datepick"><input type="date" id="dOut" min="${TODAY}" aria-label="Departure"><span>${icon('back', 'flip')}</span><input type="date" id="dBack" min="${TODAY}" aria-label="Return"><button type="button" class="opt" data-act="dates-done">${icon('check')}</button></div>` : ''}`;
}

function paintAttachments() {
  const el = $('#att');
  if (!el) return;
  el.innerHTML = S.attachments
    .map((a, i) => `<span class="att-chip">${src(a.src)}${esc(a.label)}<button type="button" data-act="detach" data-i="${i}" aria-label="Remove">${icon('x')}</button></span>`)
    .join('');
}

function paintMenu() {
  const m = $('#attachMenu');
  if (!m) return;
  m.hidden = !S.attachOpen;
  m.innerHTML = `
    <button type="button" data-act="attach-link">${src('link')}<span>Paste a link</span></button>
    <button type="button" data-act="attach-person" data-id="boys">${src('whatsapp')}<span>The Boys</span></button>
    <button type="button" data-act="attach-person" data-id="dana">${src('contacts')}<span>Dana</span></button>`;
}

function threadItems() {
  const mine = Object.values(S.trips)
    .filter((t) => t.origin !== 'thread')
    .sort((a, b) => b.created - a.created)
    .map((t) => ({ id: t.id, emoji: t.emoji, title: t.title, city: D.byCode(t.dest).city, status: t.status, note: t.status === 'booked' ? 'Booked' : 'Draft', ago: 'Just now' }));
  const threads = D.THREADS.map((th) => {
    const t = S.trips[`th-${th.id}`];
    return t && t.status !== th.status ? { ...th, status: t.status, note: t.status === 'booked' ? 'Booked' : th.note } : th;
  });
  return [...mine, ...threads];
}

function paintPrev() {
  const el = $('#prev');
  if (!el) return;
  const items = threadItems();
  const shown = S.threadsAll ? items : items.slice(0, 5);
  el.innerHTML = `
    <div class="col-head"><h2>Previous</h2><span class="count">${items.length}</span></div>
    <ul class="list">${shown
      .map(
        (t, i) => `<li class="${i >= S.threadsSeen ? 'new' : ''}" style="--i:${i - S.threadsSeen}"><button class="row" data-act="thread" data-id="${t.id}">
          <span class="emoji">${t.emoji}</span>
          <span class="row-main"><b>${esc(t.title)}</b><span>${esc(t.city)} · <i class="st ${t.status}"></i>${esc(t.note)}</span></span>
          <span class="ago">${esc(t.ago)}</span></button></li>`,
      )
      .join('')}</ul>
    ${items.length > 5 ? `<button class="more" data-act="more-threads" aria-label="${S.threadsAll ? 'Show fewer' : 'More threads'}" title="${S.threadsAll ? 'Show fewer' : 'More threads'}">${S.threadsAll ? icon('chevron', 'up') : icon('dots')}</button>` : ''}`;
  S.threadsSeen = shown.length;
}

function paintSugg() {
  const el = $('#sugg');
  if (!el) return;
  const pool = D.SUGGESTIONS.filter((s) => S.connections[s.src] !== false);
  const shown = pool.slice(0, S.suggShown);
  const on = D.CONNECTIONS.filter((c) => S.connections[c]);
  el.innerHTML = `
    <div class="col-head"><h2>Suggested</h2>
      <button class="conn-btn" data-act="connections" aria-label="Connected apps" title="Connected apps" aria-expanded="${S.connOpen}">${on
        .map((c) => `<i style="--c:${D.SOURCES[c].color}"></i>`)
        .join('')}${icon('settings')}</button></div>
    ${S.connOpen ? connPanel() : ''}
    <ul class="list">${shown
      .map(
        (s, i) => `<li class="${i >= S.suggSeen ? 'new' : ''}" style="--i:${i - S.suggSeen}"><button class="row sugg" data-act="suggest" data-id="${s.id}">
          ${src(s.src)}
          <span class="row-main"><b>${esc(s.title)}</b><span>${esc(s.sub)}</span></span>
          <span class="arrow">${icon('arrowUp')}</span></button></li>`,
      )
      .join('')}${S.generating ? '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>' : ''}</ul>
    ${
      pool.length > S.suggShown && !S.generating
        ? `<button class="more" data-act="more-sugg" aria-label="More ideas" title="More ideas">${icon('dots')}</button>`
        : !S.generating
          ? `<p class="list-end">${pool.length ? 'That is everything from your apps' : 'Switch on an app to get ideas'}</p>`
          : ''
    }`;
  S.suggSeen = shown.length;
}

function connPanel() {
  return `<div class="conn-panel">${D.CONNECTIONS.map(
    (c) => `<label class="conn">${src(c)}<span>${esc(D.SOURCES[c].label)}</span><input type="checkbox" data-c="${c}" ${S.connections[c] ? 'checked' : ''}><i class="switch"></i></label>`,
  ).join('')}<p class="conn-note">${icon('lock')}Used only to plan trips. Off means off.</p></div>`;
}

// ---- asking and going ---------------------------------------------------------

function submit() {
  if (!fullText()) {
    bump($('#ask'));
    $('#q').focus();
    return;
  }
  S.r = resolveNow();
  if (!S.r.complete) {
    S.asking = S.r.missing[0];
    paintSlots();
    paintAsking();
    return;
  }
  launch(S.r);
}

function launch(r) {
  const opts = S.resume ? { id: S.resume.id, title: S.resume.title, emoji: S.resume.emoji, origin: 'thread' } : { origin: S.origin || 'text' };
  const trip = buildTrip(r, opts);
  S.trips[trip.id] = trip;
  save();
  Object.assign(S, { text: '', attachments: [], picks: {}, asking: null, pickingDates: false, r: null, origin: null, resume: null });
  showBuilding(trip, () => {
    location.hash = `#/trip/${trip.id}`;
  });
}

function afterPick() {
  S.r = resolveNow();
  if (S.r.complete) return launch(S.r);
  S.asking = S.r.missing[0];
  paintSlots();
  paintAsking();
}

let typeTimer;
function typeInto(text, done) {
  clearInterval(typeTimer);
  let i = 0;
  typeTimer = setInterval(() => {
    i = Math.min(text.length, i + 3);
    setText(text.slice(0, i));
    if (i >= text.length) {
      clearInterval(typeTimer);
      setTimeout(done, 380);
    }
  }, 16);
}

// ---- voice ------------------------------------------------------------------

let rec = null;
let demoTimer = null;
function setListening(on, demo = false) {
  S.listening = on;
  document.body.classList.toggle('listening', on);
  document.body.classList.toggle('demo-voice', on && demo);
  const mic = $('.mic');
  if (mic) mic.setAttribute('aria-pressed', String(on));
}

function startMic() {
  if (S.listening) return stopMic();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  setText('');
  if (!SR) return demoVoice();
  let heard = false;
  let failed = false;
  try {
    rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      heard = true;
      setText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    };
    rec.onerror = () => {
      failed = !heard;
    };
    rec.onend = () => {
      rec = null;
      if (failed) return demoVoice();
      setListening(false);
      if (fullText()) submit();
    };
    rec.start();
    setListening(true);
  } catch {
    demoVoice();
  }
}

// No speech recognition here (or it was refused): play the demo sentence instead, labelled as such.
function demoVoice() {
  setListening(true, true);
  const words = D.DEMO_UTTERANCE.split(' ');
  let i = 0;
  clearInterval(demoTimer);
  demoTimer = setInterval(() => {
    setText(words.slice(0, ++i).join(' '));
    if (i >= words.length) {
      clearInterval(demoTimer);
      demoTimer = null;
      setTimeout(() => {
        setListening(false);
        submit();
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
  setListening(false);
}

// ---- overlays -----------------------------------------------------------------

let ovTimer;
function closeOverlay() {
  clearTimeout(ovTimer);
  overlay.innerHTML = '';
}

const TAKEOFF = 'M-30 150C80 150 110 70 200 78S330 22 440 28';
function showBuilding(trip, done) {
  const steps = buildSteps(trip);
  const per = matchMedia('(prefers-reduced-motion: reduce)').matches ? 90 : 430;
  const total = steps.length * per + 650;
  overlay.innerHTML = `<div class="ov building" data-act="skip" title="Tap to skip">
    <div class="ov-inner">
      <svg class="takeoff" viewBox="0 0 400 170" aria-hidden="true">
        <defs><linearGradient id="tkGrad" x1="0" x2="1"><stop offset="0" stop-color="#FFBF00" stop-opacity="0"/><stop offset=".55" stop-color="#FF5E00"/><stop offset="1" stop-color="#E31F26"/></linearGradient></defs>
        <path d="${TAKEOFF}" fill="none" stroke="url(#tkGrad)" stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"><animate attributeName="stroke-dashoffset" from="100" to="0" dur="${total}ms" fill="freeze"/></path>
        <g><path d="${PLANE_PATH}" fill="#E31F26" transform="scale(2)"/><animateMotion dur="${total}ms" fill="freeze" rotate="auto" path="${TAKEOFF}"/></g>
      </svg>
      <p class="ov-title">${trip.emoji} ${esc(trip.title)} · ${esc(D.byCode(trip.dest).city)}</p>
      <ul class="steps">${steps.map((s, i) => `<li style="--d:${i * per}ms">${src(s.src)}<span>${esc(s.text)}</span>${icon('check', 'tick')}</li>`).join('')}</ul>
    </div></div>`;
  const finish = () => {
    closeOverlay();
    done();
  };
  ovTimer = setTimeout(finish, total);
  actions.skip = finish;
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
        <path id="loopPath" d="M10 90C60 90 80 20 120 20s40 50 10 50-20-50 30-50 60 20 60 20" fill="none" stroke="url(#lpGrad)" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"><animate attributeName="stroke-dashoffset" from="100" to="0" dur="1.6s" fill="freeze"/></path>
        <defs><linearGradient id="lpGrad" x1="0" x2="1"><stop offset="0" stop-color="#FFBF00"/><stop offset="1" stop-color="#E31F26"/></linearGradient></defs>
        <g><path d="${PLANE_PATH}" fill="#E31F26" transform="scale(1.6)"/><animateMotion dur="1.6s" fill="freeze" rotate="auto" path="M10 90C60 90 80 20 120 20s40 50 10 50-20-50 30-50 60 20 60 20"/></g>
      </svg>
      <h2>You're going to ${esc(D.byCode(t.dest).city)}!</h2>
      <div class="pnr"><span>PNR</span><b>${esc(t.pnr)}</b></div>
      ${t.group ? `<p class="sent">${src('whatsapp')} Trip link sent to ${esc(D.GROUPS.boys.name)}</p>` : ''}
      <button class="btn primary" data-act="close-ov">Done</button>
    </div></div>`;
}

// ---- trip page ------------------------------------------------------------------

const seenTrips = new Set();
const current = () => S.trips[decodeURIComponent(location.hash.replace(/^#\/trip\//, ''))];
const locked = (t) => t.status === 'booked' || t.status === 'flown';

function renderTrip(id) {
  const t = S.trips[id];
  if (!t) {
    location.hash = '#/';
    return;
  }
  const dest = D.byCode(t.dest);
  const price = priceTrip(t);
  const first = !seenTrips.has(id);
  seenTrips.add(id);
  document.title = `${t.title} · ${dest.city}`;
  app.className = `page-trip${first ? ' enter' : ''}${locked(t) ? ' locked' : ''}`;
  let i = 0;
  const n = () => i++;
  app.innerHTML = `
    <header class="tripbar">
      <button class="icon-btn" data-act="home" aria-label="Back" title="Back">${icon('back')}</button>
      <div class="tripbar-title"><span>${t.emoji}</span>${esc(t.title)}</div>
      <button class="icon-btn" data-act="to-share" aria-label="Share" title="Share">${icon('share')}</button>
    </header>
    <main class="trip">
      ${routeHero(t, dest, n())}
      ${heardRow(t, n())}
      ${flightsCard(t, n())}
      ${bundleCard(t, n())}
      ${seatsCard(t, n())}
      ${extrasCard(t, n())}
      ${travelersCard(t, n())}
      ${shareCard(t, n())}
      ${payCard(t, price, n())}
    </main>
    ${confirmBar(t, price)}`;
}

function routeHero(t, dest, i) {
  const arc = 'M10 58Q110 -12 210 58';
  const status = locked(t)
    ? `<div class="banner">${icon('check')}${t.status === 'flown' ? 'Flown' : 'Booked'} · PNR ${esc(t.pnr)}${t.bundle === 'comfortflex' && t.status === 'booked' ? ' · 1 free change left' : ''}</div>`
    : '';
  return `<section class="card route" style="--i:${i}">
    ${status}
    <div class="route-row">
      <div class="ap"><b>${D.HOME.code}</b><span>${D.HOME.city}</span></div>
      <svg class="arc" viewBox="0 0 220 64" aria-hidden="true">
        <path d="${arc}" fill="none" class="arc-line"/>
        <g><path d="${PLANE_PATH}" fill="#FFBF00" transform="scale(1.1)"/><animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" path="${arc}"/></g>
      </svg>
      <div class="ap end"><b>${dest.code}</b><span>${esc(dest.city)}</span></div>
    </div>
    <div class="route-meta">
      <span>${icon('calendar')}${fmtDay(t.out)}${t.back ? ` <i class="to">→</i> ${fmtDay(t.back)}` : ' · one way'}</span>
      <span class="avatars">${t.travelers.map((p, k) => avatar(p, k)).join('')}</span>
    </div>
  </section>`;
}

function heardRow(t, i) {
  const used = [...new Set([...t.heard.map((h) => h.src), ...t.travelers.map((p) => p.src), bundleWhy(t).src])].filter((s) => !['guess', 'you', 'agent', 'pegasus'].includes(s));
  return `<section class="heard" style="--i:${i}">
    <div class="heard-chips">${t.heard.map((h) => `<span class="chip">${icon(h.icon)}${esc(h.label)}${src(h.src)}</span>`).join('')}</div>
    <div class="built"><span>Built from</span>${used.map((s) => src(s, true)).join('')}</div>
  </section>`;
}

function flightsCard(t, i) {
  return `<section class="card" style="--i:${i}">
    <h3>${icon('plane')}Flights<span class="h-note">Direct · Pegasus</span></h3>
    ${legHTML(t, 'out')}${legHTML(t, 'back')}
  </section>`;
}

function legHTML(t, dir) {
  const leg = t.flights[dir];
  if (!leg) return '';
  const f = flightOf(t, dir);
  const low = Math.min(...leg.list.map((x) => x.fare));
  const reason = leg.byYou ? 'Your pick' : leg.slot === 'any' ? 'Cheapest of the day' : `Cheapest ${TIME_LABEL[leg.slot].toLowerCase()} flight`;
  const from = leg.byYou ? 'you' : t.time.src === 'guess' && t.cheapest ? 'said' : t.time.src;
  const cheaper = !leg.byYou && f.fare > low ? leg.list.find((x) => x.fare === low) : null;
  return `<div class="leg">
    <div class="leg-head">${icon(dir === 'out' ? 'takeoff' : 'landing')}<b>${fmtDay(f.date)}</b><span class="fno">${f.no}</span></div>
    <div class="leg-line">
      <div class="t"><b>${f.dep}</b><span>${f.from}</span></div>
      <div class="mid"><span>${fmtDuration(f.mins)}</span><i>${icon('plane')}</i></div>
      <div class="t end"><b>${f.arr}${f.nextDay ? '<sup>+1</sup>' : ''}</b><span>${f.to}</span></div>
    </div>
    <div class="times" role="radiogroup" aria-label="Departure time">${leg.list
      .map(
        (x) => `<button class="time${x.no === f.no ? ' on' : ''}" data-act="flight" data-dir="${dir}" data-no="${x.no}" role="radio" aria-checked="${x.no === f.no}"><b>${x.dep}</b><span>${euro(x.fare)}</span>${x.fare === low ? '<i class="low" title="Lowest fare"></i>' : ''}</button>`,
      )
      .join('')}</div>
    ${why(reason, from)}
    ${cheaper ? `<button class="hint" data-act="flight" data-dir="${dir}" data-no="${cheaper.no}">${icon('spark')}${cheaper.dep} is ${euro(f.fare - cheaper.fare)} less per person</button>` : ''}
  </div>`;
}

function bundleCard(t, i) {
  const b = D.bundleById(t.bundle);
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
  const w = bundleWhy(t);
  const base = Math.min(...D.bundlesFor(t.intl).map((o) => bundlePrice(t, o.id)));
  return `<section class="card" style="--i:${i}">
    <h3>${icon('suitcase')}Bundle<span class="h-note">per person</span></h3>
    <div class="bundles">${D.bundlesFor(t.intl)
      .map((o) => {
        const extra = bundlePrice(t, o.id) - base;
        return `<button class="bundle${o.id === t.bundle ? ' on' : ''}" data-act="bundle" data-id="${o.id}" aria-pressed="${o.id === t.bundle}"><b>${o.name}</b><span>${extra ? `+${euro(extra)}` : 'Lowest'}</span></button>`;
      })
      .join('')}</div>
    <div class="perks">${perks.map(([ic, label, sub, on, title]) => `<div class="perk${on ? ' on' : ''}" title="${esc(title)}">${icon(ic)}<b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</div>`).join('')}</div>
    ${why(w.text, w.src)}
  </section>`;
}

function seatMap(t) {
  const n = t.travelers.length;
  const cols = ['A', 'B', 'C', '', 'D', 'E', 'F'];
  const rows = [11, 12, 13, 14];
  const mine = new Set();
  const unknown = new Set();
  if (t.seat === 'together') ['12A', '12B', '12C', '12D', '12E', '12F', '13A', '13B', '13C'].slice(0, n).forEach((s) => mine.add(s));
  else if (t.seat === 'window') mine.add('12A');
  else if (t.seat === 'aisle') mine.add('12C');
  else if (t.seat === 'legroom') mine.add('11C');
  else ['11E', '12B', '13F', '14C', '12D', '14A', '13B', '11A', '14F'].slice(0, n).forEach((s) => unknown.add(s));
  return `<div class="seatmap${t.seat === 'legroom' ? ' exit' : ''}" aria-hidden="true">${rows
    .map((r) => cols.map((c) => (c ? `<i class="s${mine.has(r + c) ? ' me' : ''}${unknown.has(r + c) ? ' q' : ''}"></i>` : `<b>${r}</b>`)).join(''))
    .join('')}</div>`;
}

function seatsCard(t, i) {
  const b = D.bundleById(t.bundle);
  const n = t.travelers.length;
  const fee = (k) => (k === 'free' ? 'Free' : k === 'legroom' ? (b.legroom ? 'Included' : `+${euro(D.EXTRAS.legroom)}`) : b.seat ? 'Included' : `+${euro(D.EXTRAS.seat)}`);
  const options = n > 1 ? [['free', 'At check-in'], ['together', 'Together']] : [['free', 'At check-in'], ['window', 'Window'], ['aisle', 'Aisle'], ['legroom', 'Legroom']];
  const label = { window: 'Window', aisle: 'Aisle', legroom: 'Legroom', together: 'Together' }[t.seat];
  const reason = t.seatSrc === 'you' ? 'Your pick' : t.seat === 'free' ? (t.cheapest ? 'Cheapest: seats assigned free at check-in' : 'Assigned free at check-in') : `${label}, as you asked`;
  const from = t.seatSrc === 'you' ? 'you' : t.seatSrc === 'said' || t.cheapest ? 'said' : 'pegasus';
  return `<section class="card" style="--i:${i}">
    <h3>${icon('seat')}Seats<span class="h-note">per person, per flight</span></h3>
    ${seatMap(t)}
    <div class="seg">${options.map(([k, l]) => `<button class="${t.seat === k ? 'on' : ''}" data-act="seat" data-v="${k}" aria-pressed="${t.seat === k}"><b>${l}</b><span>${fee(k)}</span></button>`).join('')}</div>
    ${why(reason, from)}
  </section>`;
}

function extrasCard(t, i) {
  const b = D.bundleById(t.bundle);
  const items = [
    ['insurance', 'shield', 'Insurance', `${euro(D.EXTRAS.insurance)}`],
    ['meal', 'meal', 'Meal', b.meal ? 'Included' : `${euro(D.EXTRAS.meal)}`],
    ['lounge', 'lounge', 'SAW lounge', `${euro(D.EXTRAS.lounge)}`],
    ['car', 'car', 'Car', `${euro(D.EXTRAS.car)}/day`],
  ];
  const declined = t.extrasSrc.insurance === 'said' && !t.extras.insurance;
  return `<section class="card" style="--i:${i}">
    <h3>${icon('plus')}Extras<span class="h-note">per person</span></h3>
    <div class="extras">${items
      .map(([k, ic, label, price]) => {
        const on = t.extras[k] || (k === 'meal' && b.meal);
        return `<button class="extra${on ? ' on' : ''}" data-act="extra" data-k="${k}" aria-pressed="${on}"${k === 'meal' && b.meal ? ' disabled' : ''}>${icon(ic)}<b>${label}</b><span>${price}</span>${t.extrasSrc[k] === 'said' ? src('said') : ''}</button>`;
      })
      .join('')}</div>
    ${declined ? why('No insurance, as you said', 'said') : ''}
  </section>`;
}

function travelersCard(t, i) {
  return `<section class="card" style="--i:${i}">
    <h3>${icon('people')}Travelers<span class="count">${t.travelers.length}</span></h3>
    <ul class="pax">${t.travelers
      .map((p, k) => {
        const missing = !p.dob && !locked(t);
        const sub = p.dob
          ? `${icon('calendar')}${fmtDob(p.dob)}`
          : locked(t)
            ? 'On file'
            : p.asked
              ? `${icon('send')}Asked in the group link`
              : p.guest
                ? 'Joins from the group link'
                : 'Birthday missing';
        return `<li class="${missing ? 'missing' : ''}">
          ${avatar(p, k)}
          <span class="pax-main"><b>${esc(p.guest ? 'Friend' : `${p.first} ${p.last}`)}${p.id === 'me' ? ' <em>you</em>' : ''}</b><span>${sub}</span></span>
          ${p.dob ? src(p.src) : ''}
          ${missing && !p.asked ? `<button class="mini" data-act="ask" data-id="${p.id}">${icon('send')}Ask</button>` : ''}
          ${p.confirmed ? `<span class="ok" title="Confirmed">${icon('check')}</span>` : ''}
        </li>`;
      })
      .join('')}</ul>
  </section>`;
}

function shareCard(t, i) {
  const done = t.travelers.filter((p) => p.confirmed).length;
  const label = t.sent ? 'Sent' : t.group ? `Send to ${D.GROUPS.boys.name}` : 'Send';
  return `<section class="card share" id="c-share" style="--i:${i}">
    <h3>${icon('link')}Group link<span class="h-note">everyone checks their own details</span></h3>
    <div class="linkbox"><span>flypgs.com/t/${esc(t.code)}</span><button class="icon-btn small" data-act="copy" aria-label="Copy link" title="Copy link">${icon('copy')}</button></div>
    <div class="share-row">
      <button class="btn wa${t.sent ? ' sent' : ''}" data-act="send">${icon(t.sent ? 'check' : 'chat')}${esc(label)}</button>
      <div class="confirmed"><span class="avatars">${t.travelers.map((p, k) => avatar(p, k, p.confirmed ? 'done' : 'wait')).join('')}</span><b>${done}/${t.travelers.length}</b></div>
    </div>
  </section>`;
}

function payCard(t, price, i) {
  return `<section class="card" style="--i:${i}">
    <h3>${icon('card')}Pay</h3>
    <div class="payrow">${icon('card')}<span>Visa •••• 4242</span>${src('profile')}</div>
    <div class="payrow">${icon('mail')}<span>Receipt to y••••@gmail.com</span>${src('profile')}</div>
    <div class="lines">${price.lines.map((l) => `<div><span>${esc(l.label)}</span><b>${euro(l.amount)}</b></div>`).join('')}
      <div class="total"><span>Total</span><b>${euro(price.total)}</b></div></div>
  </section>`;
}

function confirmBar(t, price) {
  return `<div class="confirm-bar"><div class="confirm-inner">
    <div class="sum"><b>${euro(price.total)}</b><span>${price.n > 1 ? `${euro(price.each)} each` : 'total'}</span></div>
    ${
      locked(t)
        ? `<div class="booked-pill">${icon('check')}${t.status === 'flown' ? 'Flown' : 'Booked'}</div>`
        : `<button class="btn primary book" data-act="book">${icon('check')}Book it</button>`
    }
  </div></div>`;
}

function commit(t) {
  save();
  renderTrip(t.id);
}

// ---- classic layout ------------------------------------------------------------

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
    const text = `${city} ${isoLabel(out)}${oneWay ? ' one way' : ` to ${isoLabel(back)}`}, ${f.get('pax')} people, any time`;
    const r = resolve(parse(text, TODAY), { connections: S.connections });
    S.origin = 'classic';
    if (r.complete) launch(r);
  });
}

// ---- actions ---------------------------------------------------------------------

const actions = {
  classic: () => (location.hash = '#/classic'),
  home: () => (location.hash = '#/'),
  mic: () => startMic(),
  attach: () => {
    S.attachOpen = !S.attachOpen;
    paintMenu();
  },
  'attach-link': () => {
    const m = $('#attachMenu');
    m.innerHTML = `<div class="link-in"><input id="linkIn" type="url" placeholder="https://" aria-label="Link"><button type="button" class="opt" data-act="attach-link-add">${icon('check')}</button></div>`;
    const input = $('#linkIn');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        actions['attach-link-add']();
      }
    });
  },
  'attach-link-add': () => {
    const v = ($('#linkIn').value || '').trim();
    if (!/^https?:\/\/\S+\.\S+/.test(v)) return bump($('#linkIn'));
    S.attachments.push({ src: 'link', label: v.replace(/^https?:\/\/(www\.)?/, '').slice(0, 28), text: v });
    S.attachOpen = false;
    paintMenu();
    paintAttachments();
    live();
  },
  'attach-person': (el) => {
    const boys = el.dataset.id === 'boys';
    S.attachments.push(boys ? { src: 'whatsapp', label: 'The Boys', text: 'with the boys' } : { src: 'contacts', label: 'Dana', text: 'with Dana' });
    S.attachOpen = false;
    paintMenu();
    paintAttachments();
    live();
  },
  detach: (el) => {
    S.attachments.splice(+el.dataset.i, 1);
    paintAttachments();
    live();
  },
  slot: (el) => {
    const k = el.dataset.slot;
    const s = S.r && S.r.slots[k];
    if (s && s.src === 'said') return $('#q').focus();
    if (!S.r) S.r = resolveNow();
    S.asking = k;
    paintSlots();
    paintAsking();
  },
  pick: (el) => {
    const v = JSON.parse(el.dataset.value);
    if (v === 'pick') {
      S.pickingDates = true;
      return paintAsking();
    }
    S.pickingDates = false;
    S.picks[el.dataset.slot] = v;
    afterPick();
  },
  'dates-done': () => {
    const out = $('#dOut').value;
    const back = $('#dBack').value;
    if (!out) return bump($('#dOut'));
    S.picks.when = { out, back: back && back > out ? back : null };
    S.pickingDates = false;
    afterPick();
  },
  thread: (el) => {
    const id = el.dataset.id;
    if (S.trips[id]) return (location.hash = `#/trip/${id}`);
    const th = D.THREADS.find((x) => x.id === id);
    const tid = `th-${id}`;
    if (S.trips[tid]) return (location.hash = `#/trip/${tid}`);
    const r = resolve(parse(th.intent, TODAY), { connections: S.connections });
    if (!r.complete) {
      // This conversation stopped because something was missing. Pick it up there.
      Object.assign(S, { text: th.intent, attachments: [], picks: {}, origin: 'thread', resume: { id: tid, title: th.title, emoji: th.emoji } });
      const ta = $('#q');
      ta.value = S.text;
      autosize(ta);
      paintAttachments();
      S.r = r;
      S.asking = r.missing[0];
      paintSlots();
      paintAsking();
      $('#ask').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const trip = buildTrip(r, { id: tid, title: th.title, emoji: th.emoji, origin: 'thread', status: th.status === 'idea' ? 'draft' : th.status });
    if (locked(trip)) {
      trip.pnr = codeFor(`${tid}pnr`);
      trip.sent = true;
      trip.travelers.forEach((p) => (p.confirmed = true));
    }
    S.trips[tid] = trip;
    save();
    location.hash = `#/trip/${tid}`;
  },
  suggest: (el) => {
    const s = D.SUGGESTIONS.find((x) => x.id === el.dataset.id);
    Object.assign(S, { origin: 'suggestion', picks: {}, asking: null, resume: null, attachments: [] });
    paintAttachments();
    $('#ask').scrollIntoView({ behavior: 'smooth', block: 'center' });
    typeInto(s.intent, submit);
  },
  'more-threads': () => {
    S.threadsAll = !S.threadsAll;
    if (!S.threadsAll) S.threadsSeen = 5;
    paintPrev();
  },
  'more-sugg': () => {
    S.generating = true;
    paintSugg();
    setTimeout(() => {
      S.generating = false;
      S.suggShown += 3;
      paintSugg();
    }, 900);
  },
  connections: () => {
    S.connOpen = !S.connOpen;
    paintSugg();
  },
  flight: (el) => {
    const t = current();
    if (locked(t)) return;
    Object.assign(t.flights[el.dataset.dir], { pick: el.dataset.no, byYou: true });
    commit(t);
  },
  bundle: (el) => {
    const t = current();
    if (locked(t) || t.bundle === el.dataset.id) return;
    Object.assign(t, { bundle: el.dataset.id, bundleSrc: 'you' });
    commit(t);
  },
  seat: (el) => {
    const t = current();
    if (locked(t)) return;
    Object.assign(t, { seat: el.dataset.v, seatSrc: 'you' });
    commit(t);
  },
  extra: (el) => {
    const t = current();
    if (locked(t)) return;
    const k = el.dataset.k;
    t.extras[k] = !t.extras[k];
    t.extrasSrc[k] = 'you';
    commit(t);
  },
  ask: (el) => {
    const t = current();
    const p = t.travelers.find((x) => x.id === el.dataset.id);
    p.asked = true;
    t.sent = true;
    commit(t);
    toast(`${icon('send')} Link sent to ${esc(p.guest ? 'your friend' : p.first)}`);
    setTimeout(() => {
      const live = S.trips[t.id];
      const q = live && live.travelers.find((x) => x.id === p.id);
      if (!q || q.dob) return;
      Object.assign(q, { dob: '1996-08-03', src: 'link', confirmed: true, first: q.guest ? 'Can' : q.first, last: q.guest ? 'Aydın' : q.last, guest: false });
      if (current() === live) commit(live);
      else save();
      toast(`${icon('check')} ${esc(q.first)} filled in their details`);
    }, 2600);
  },
  send: () => {
    const t = current();
    if (!t.sent) {
      t.sent = true;
      commit(t);
      toast(`${icon('chat')} Sent${t.group ? ` to ${esc(D.GROUPS.boys.name)}` : ''}`);
    }
    // Friends with complete details confirm from the link, one by one.
    const waiting = t.travelers.filter((p) => !p.confirmed && p.dob);
    waiting.forEach((p, k) =>
      setTimeout(() => {
        p.confirmed = true;
        if (current() === t) commit(t);
        else save();
      }, 700 * (k + 1)),
    );
  },
  copy: () => {
    const t = current();
    const url = `https://flypgs.com/t/${t.code}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    toast(`${icon('copy')} Link copied`);
  },
  'to-share': () => $('#c-share').scrollIntoView({ behavior: 'smooth', block: 'center' }),
  book: () => {
    const t = current();
    t.status = 'booked';
    t.pnr = codeFor(`${t.id}pnr`);
    if (t.group) t.sent = true;
    commit(t);
    showBooked(t);
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
  if (S.attachOpen && !e.target.closest('#attachMenu') && !e.target.closest('.ask-plus')) {
    S.attachOpen = false;
    paintMenu();
  }
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el, e);
});

document.addEventListener('change', (e) => {
  const c = e.target.dataset && e.target.dataset.c;
  if (!c) return;
  S.connections[c] = e.target.checked;
  save();
  paintSugg();
  live();
});

// ---- routing ------------------------------------------------------------------------

function route() {
  closeOverlay();
  clearInterval(typeTimer);
  stopMic();
  const h = location.hash.replace(/^#/, '') || '/';
  window.scrollTo(0, 0);
  if (h.startsWith('/trip/')) renderTrip(decodeURIComponent(h.slice(6)));
  else if (h === '/classic') renderClassic();
  else renderHome();
}
addEventListener('hashchange', route);
route();

// ?say=... plays a sentence into the composer on load, for demos and screenshots.
const say = params.get('say');
if (say && !location.hash.startsWith('#/trip/')) setTimeout(() => typeInto(say, submit), 700);
