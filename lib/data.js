// Mock world for the "Where to" prototype.
// Fare families follow the real Pegasus rules (Light is international only,
// Saver checked bag is 15 kg domestic / 20 kg international, Saver Plus seats
// are standard, Comfort Flex adds extra legroom, a free change and a refund).
// People, schedules and prices are invented.

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
  infant: 20, // infant on a lap, per flight (no seat, no bundle); a demo price, not Pegasus' published fee
};

// Where a piece of context came from. Every decision on the trip shows one.
export const SOURCES = {
  said: { label: 'You said', icon: 'mic', color: '#0A2343' },
  you: { label: 'You picked', icon: 'hand', color: '#0A2343' },
  trip: { label: 'Your past trips', icon: 'history', color: '#FF5E00' },
  profile: { label: 'Pegasus profile', icon: 'id', color: '#E31F26' },
  link: { label: 'Link', icon: 'link', color: '#64748B' },
  pegasus: { label: 'Pegasus rule', icon: 'plane', color: '#E31F26' },
  rule: { label: 'Companion rule', icon: 'shield', color: '#1D4ED8' },
  guess: { label: 'Best guess', icon: 'spark', color: '#FFBF00' },
};

// The one data source with a switch: the passenger's own past Pegasus bookings
// (who they flew with, their usual bags and trip length). Off means off.
export const CONNECTIONS = ['trip'];

// The persona lives in its own file so route and fare data can ship without it.
export * from './persona.js';
