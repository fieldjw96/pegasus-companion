// The demo persona: one invented traveler, their contacts, chats, habits and
// earlier conversations. Kept apart from the route and fare data on purpose:
// anything exported for another prototype (scripts/export-classic.mjs) ships
// without it.

export const ME = { id: 'me', first: 'Yitzy', last: 'Rosenberg', dob: '1996-05-14', src: 'profile' };

// Contacts. `src` is where the companion found the birthday.
export const PEOPLE = {
  ali: { first: 'Ali', last: 'Demir', dob: '1995-07-02', src: 'trip' },
  mert: { first: 'Mert', last: 'Kaya', dob: '1996-01-21', src: 'trip' },
  daniel: { first: 'Daniel', last: 'Cohen', dob: '1995-09-09', src: 'contacts' },
  emre: { first: 'Emre', last: 'Yıldız', dob: '1997-04-30', src: 'whatsapp' },
  josh: { first: 'Josh', last: 'Miller', dob: null, src: 'contacts' },
  dana: { first: 'Dana', last: 'Levi', dob: '1996-11-20', src: 'trip' },
};

// Who "my wife" / "my partner" means for this persona (a PEOPLE id).
export const PARTNER = 'dana';

export const GROUPS = {
  boys: {
    name: 'The Boys',
    src: 'whatsapp',
    members: ['ali', 'mert', 'daniel', 'emre', 'josh'],
    plan: { out: '2026-11-13', back: '2026-11-16', quote: 'Barca 13 to 16 Nov?' },
  },
};

// What the companion learned from earlier bookings.
export const HISTORY = { trips: 9, usualBags: 'cabin', usualNights: 3 };

// Earlier conversations ("Previous"). Each one is replayed through the same
// parser, so a thread always matches what the companion would do today.
export const THREADS = [
  { id: 'boys', emoji: '🎉', title: "Boys' trip", city: 'Barcelona', status: 'draft', note: 'Waiting on Josh', ago: '2d',
    intent: 'Barcelona with the boys, cheapest, no bags, no insurance' },
  { id: 'grandma', emoji: '🕊️', title: "Grandma's funeral", city: 'Izmir', status: 'booked', note: 'Booked', ago: 'Yesterday',
    intent: 'Grandma passed. Get me home to Izmir on 6 Oct, morning flight, back 9 Oct, plans might change, one bag' },
  { id: 'berlin', emoji: '💼', title: 'Client week', city: 'Berlin', status: 'draft', note: 'Needs dates', ago: 'Mon',
    intent: 'Berlin for client meetings, carry-on only, morning flights' },
  { id: 'mom60', emoji: '🎂', title: "Mom's 60th", city: 'Ankara', status: 'booked', note: 'Booked', ago: 'Sep 28',
    intent: "Ankara with Dana for Mom's 60th, 27 to 29 Nov, evening, carry-on" },
  { id: 'ski', emoji: '⛷️', title: 'Ski weekend', city: 'Erzurum', status: 'idea', note: 'Idea', ago: 'Sep 20',
    intent: 'Ski weekend in Erzurum with the boys in January, evening flights, one bag' },
  { id: 'tbilisi', emoji: '🥟', title: 'Food trip', city: 'Tbilisi', status: 'flown', note: 'Flown', ago: 'Aug',
    intent: 'Tbilisi with Dana 14 to 17 Aug 2026, cheapest, carry-on' },
  { id: 'athens', emoji: '☀️', title: 'Athens with Dana', city: 'Athens', status: 'flown', note: 'Flown', ago: 'Jun',
    intent: 'Athens with Dana 5 to 8 Jun 2026, morning, one bag' },
  { id: 'dubai', emoji: '🏙️', title: 'Dubai stopover', city: 'Dubai', status: 'flown', note: 'Flown', ago: 'May',
    intent: 'Dubai solo 2 to 5 May 2026, night flight, carry-on' },
  { id: 'prague', emoji: '🎆', title: 'New Year', city: 'Prague', status: 'flown', note: 'Flown', ago: 'Jan',
    intent: 'Prague with Ali and Mert 30 Dec 2025 to 2 Jan 2026, cheapest, no bags' },
];

// "Suggested": trips the companion spotted in connected apps. Shown five at a
// time; "more" reveals the next ones.
export const SUGGESTIONS = [
  { id: 'wedding', src: 'gmail', title: "Elif & Can's wedding", sub: 'Antalya · 12 Jun',
    intent: "Antalya for Elif and Can's wedding with Dana, 11 to 13 Jun, one bag" },
  { id: 'newyear', src: 'whatsapp', from: 'Family', title: 'Home for New Year?', sub: 'Ankara · 31 Dec',
    intent: 'Ankara with Dana 31 Dec to 2 Jan, carry-on' },
  { id: 'offsite', src: 'work', title: 'Q4 offsite', sub: 'Amsterdam · 23 Nov',
    intent: 'Amsterdam for the work offsite 23 to 25 Nov, morning flights, carry-on' },
  { id: 'holiday', src: 'calendar', title: 'Long weekend', sub: '29 Oct · Republic Day',
    intent: 'Tbilisi with Dana 29 Oct to 1 Nov, cheapest, carry-on' },
  { id: 'bday', src: 'contacts', title: "Dana's birthday", sub: '20 Nov · Rome?',
    intent: "Rome with Dana for her birthday, 20 to 22 Nov, evening, carry-on" },
  { id: 'vienna', src: 'link', title: 'Christmas markets', sub: 'Vienna · saved link',
    intent: 'Vienna with Dana 11 to 13 Dec, cheapest, carry-on' },
  { id: 'baku', src: 'trip', title: 'Baku from €39', sub: 'Fares dip in November',
    intent: 'Baku solo 6 to 8 Nov, cheapest, no bags' },
  { id: 'concert', src: 'gmail', title: 'Concert tickets', sub: 'London · 4 Dec',
    intent: 'London with Daniel 4 to 6 Dec, afternoon, carry-on' },
  { id: 'mom', src: 'trip', title: 'Visit Mom?', sub: 'You go every 6 weeks',
    intent: 'Ankara solo next weekend, evening, carry-on' },
];

// The sentence the mic types out when the browser has no speech recognition.
export const DEMO_UTTERANCE =
  "I'm going to Barcelona with five of my friends. I don't need any bags, I just want the cheapest option. No insurance. Don't make me go through any of the steps.";
