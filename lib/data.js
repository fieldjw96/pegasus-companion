// Mock world for the "Where to" prototype.
// Fare families follow the real Pegasus rules (Light is international only,
// Saver checked bag is 15 kg domestic / 20 kg international, Saver Plus seats
// are standard, Comfort Flex adds extra legroom, a free change and a refund).
// People, chats, schedules and prices are invented.

export const HOME = { code: 'SAW', city: 'Istanbul', airport: 'Sabiha Gökçen', tz: 'TR' };

// Hours vs UTC as [winter, summer]. Türkiye, Georgia, Azerbaijan and the UAE keep one offset.
export const TZ = { TR: [3, 3], CET: [1, 2], UK: [0, 1], EET: [2, 3], GE: [4, 4], AZ: [4, 4], AE: [4, 4] };

// Pegasus destinations from SAW. out/back are block minutes, fare is a Light
// fare in EUR (Saver fare on domestic routes, where Light is not sold).
export const NETWORK = [
  { code: 'BCN', city: 'Barcelona', country: 'Spain', tz: 'CET', out: 220, back: 200, fare: 49, intl: true, aka: ['barca', 'barcelona'] },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', tz: 'CET', out: 225, back: 205, fare: 59, intl: true },
  { code: 'BER', city: 'Berlin', country: 'Germany', tz: 'CET', out: 180, back: 165, fare: 45, intl: true },
  { code: 'MUC', city: 'Munich', country: 'Germany', tz: 'CET', out: 160, back: 145, fare: 47, intl: true },
  { code: 'STN', city: 'London', country: 'UK', tz: 'UK', out: 245, back: 225, fare: 55, intl: true, aka: ['stansted'] },
  { code: 'CDG', city: 'Paris', country: 'France', tz: 'CET', out: 230, back: 210, fare: 57, intl: true },
  { code: 'FCO', city: 'Rome', country: 'Italy', tz: 'CET', out: 160, back: 145, fare: 44, intl: true },
  { code: 'PRG', city: 'Prague', country: 'Czechia', tz: 'CET', out: 155, back: 140, fare: 42, intl: true },
  { code: 'VIE', city: 'Vienna', country: 'Austria', tz: 'CET', out: 140, back: 130, fare: 39, intl: true },
  { code: 'BUD', city: 'Budapest', country: 'Hungary', tz: 'CET', out: 125, back: 115, fare: 37, intl: true },
  { code: 'ATH', city: 'Athens', country: 'Greece', tz: 'EET', out: 85, back: 80, fare: 35, intl: true },
  { code: 'TBS', city: 'Tbilisi', country: 'Georgia', tz: 'GE', out: 125, back: 140, fare: 35, intl: true },
  { code: 'GYD', city: 'Baku', country: 'Azerbaijan', tz: 'AZ', out: 165, back: 180, fare: 39, intl: true },
  { code: 'DXB', city: 'Dubai', country: 'UAE', tz: 'AE', out: 250, back: 275, fare: 79, intl: true },
  { code: 'ESB', city: 'Ankara', country: 'Türkiye', tz: 'TR', out: 65, back: 65, fare: 29, intl: false },
  { code: 'ADB', city: 'Izmir', country: 'Türkiye', tz: 'TR', out: 65, back: 65, fare: 27, intl: false },
  { code: 'AYT', city: 'Antalya', country: 'Türkiye', tz: 'TR', out: 80, back: 75, fare: 31, intl: false },
  { code: 'BJV', city: 'Bodrum', country: 'Türkiye', tz: 'TR', out: 75, back: 70, fare: 33, intl: false },
  { code: 'TZX', city: 'Trabzon', country: 'Türkiye', tz: 'TR', out: 105, back: 115, fare: 32, intl: false },
  { code: 'ERZ', city: 'Erzurum', country: 'Türkiye', tz: 'TR', out: 110, back: 120, fare: 34, intl: false },
];
export const byCode = (code) => NETWORK.find((d) => d.code === code);

// Places people ask for that Pegasus does not fly to, with the nearest fit.
export const NOT_SERVED = {
  beach: ['barbados', 'bahamas', 'jamaica', 'cancun', 'caribbean', 'hawaii', 'bali', 'miami', 'ibiza'],
  city: ['new york', 'los angeles', 'tokyo', 'sydney', 'singapore', 'toronto', 'rio'],
};
export const ALTERNATIVES = { beach: ['AYT', 'BJV', 'BCN'], city: ['BCN', 'AMS', 'STN'] };
export const POPULAR = ['BCN', 'AMS', 'AYT', 'TBS'];

export const BUNDLES = [
  { id: 'light', name: 'Light', intlOnly: true, under: true, cabin: false, checked: false, seat: false, legroom: false, meal: false, watch: false, change: false, refund: false },
  { id: 'saver', name: 'Saver', under: true, cabin: true, checked: true, seat: false, legroom: false, meal: false, watch: false, change: false, refund: false },
  { id: 'saverplus', name: 'Saver Plus', under: true, cabin: true, checked: true, seat: true, legroom: false, meal: true, watch: true, change: false, refund: false },
  { id: 'comfortflex', name: 'Comfort Flex', under: true, cabin: true, checked: true, seat: true, legroom: true, meal: true, watch: true, change: true, refund: true },
];
export const bundleById = (id) => BUNDLES.find((b) => b.id === id);
export const bundlesFor = (intl) => BUNDLES.filter((b) => intl || !b.intlOnly);

// Bundle price on top of the base fare, per person per flight.
export const BUNDLE_ADD = {
  intl: { light: 0, saver: 24, saverplus: 41, comfortflex: 69 },
  dom: { saver: 0, saverplus: 14, comfortflex: 29 },
};

export const BAGS = {
  under: '40×30×15 cm · 3 kg',
  cabin: '55×40×23 cm · 8 kg',
  checkedKg: { dom: 15, intl: 20 },
};

// Extras sold one by one. Per person per flight unless noted.
export const EXTRAS = {
  seat: 7, // standard seat
  legroom: 18, // extra-legroom seat
  bag: { intl: 28, dom: 19 }, // one more checked bag
  meal: 9,
  insurance: 9, // per person per trip
  lounge: 30, // per person, SAW departure only
  car: 24, // per day, whole party
};

// Where a piece of context came from. Every decision on the trip page shows one.
export const SOURCES = {
  said: { label: 'You said', icon: 'mic', color: '#0A2343' },
  you: { label: 'You picked', icon: 'hand', color: '#0A2343' },
  whatsapp: { label: 'WhatsApp', icon: 'chat', color: '#1FAF55' },
  gmail: { label: 'Email', icon: 'mail', color: '#EA4335' },
  calendar: { label: 'Calendar', icon: 'calendar', color: '#3B82F6' },
  contacts: { label: 'Contacts', icon: 'person', color: '#8B5CF6' },
  work: { label: 'Work', icon: 'briefcase', color: '#0EA5E9' },
  trip: { label: 'Your past trips', icon: 'history', color: '#FF5E00' },
  profile: { label: 'Pegasus profile', icon: 'id', color: '#E31F26' },
  link: { label: 'Link', icon: 'link', color: '#64748B' },
  pegasus: { label: 'Pegasus', icon: 'plane', color: '#E31F26' },
  guess: { label: 'Best guess', icon: 'spark', color: '#FFBF00' },
};

// Connections the user switched on. Turning one off removes its suggestions
// and stops the companion from using it.
export const CONNECTIONS = ['whatsapp', 'gmail', 'calendar', 'contacts', 'work', 'trip', 'link'];

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
