// 24px stroke icons, drawn for this prototype.

const P = {
  mic: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"/><path d="M12 17v4"/>',
  arrowUp: '<path d="M12 19V5"/><path d="M5.5 11.5 12 5l6.5 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  back: '<path d="M15 18 9 12l6-6"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 13.3 7.6 4M15.8 6.7l-7.6 4"/>',
  link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.8.5l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4L11.6 6.4"/><path d="M14 10.5a4.5 4.5 0 0 0-6.8-.5l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>',
  copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2.2"/><path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v.5"/>',
  check: '<path d="M20 6.5 9.5 17 4 11.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plane: '<path d="M21 15.5v-1.7l-8-5V3.6a1.6 1.6 0 0 0-3.2 0v5.2l-8 5v1.7l8-2.5v4.6l-2 1.5v1.4l3.6-1 3.6 1v-1.4l-2-1.5V13Z"/>',
  takeoff: '<path d="M2.5 20.5h19"/><path d="m4 13.4 2.7 2.3c.5.4 1.2.5 1.8.2l11.6-5.6a2 2 0 0 0-1.8-3.6l-3.9 1.9L7 5.3 5.3 6l4 4.3-3.3 1.6-2-1.2-1.3.6Z"/>',
  landing: '<path d="M2.5 20.5h19"/><path d="m3.7 9.3.2 3.3c0 .6.5 1.2 1.1 1.4l12.4 3.4a2 2 0 0 0 1-3.9l-4.2-1.1-4.4-7.6-1.8-.5 1.6 5.6-3.5-1-.9-2.1-1.4-.4Z"/>',
  backpack: '<path d="M6 10a6 6 0 0 1 12 0v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M9.5 4.5v-.3a2.5 2.5 0 0 1 5 0v.3"/><path d="M9 21v-4.5h6V21"/>',
  cabin: '<rect x="6" y="6.5" width="12" height="12.5" rx="2.2"/><path d="M9.5 6.5v-3h5v3"/><path d="M9 19v2M15 19v2M10.5 10v5.5M13.5 10v5.5"/>',
  suitcase: '<rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M8.5 7V5a1.8 1.8 0 0 1 1.8-1.8h3.4A1.8 1.8 0 0 1 15.5 5v2"/><path d="M8 11v5M16 11v5"/>',
  seat: '<path d="M7 4.5h6.5a2 2 0 0 1 2 2V12"/><path d="M7 4.5V13a2 2 0 0 0 2 2h8.5"/><path d="M4.5 15h15v2.5h-15Z"/><path d="M7 17.5V21M17 17.5V21"/>',
  legroom: '<path d="M7 3.5V12a2 2 0 0 0 2 2h5"/><path d="M14 14l3.5 6.5"/><path d="M2.5 20.5h19"/><path d="M15 9h6M19 7l2 2-2 2"/>',
  shield: '<path d="M12 21.5s7.5-3.6 7.5-9.4V5.3L12 2.5 4.5 5.3v6.8c0 5.8 7.5 9.4 7.5 9.4Z"/>',
  meal: '<path d="M4 11h16"/><path d="M5 11a7 7 0 0 1 14 0"/><path d="M4.5 14.5h15l-1.2 3.6a2 2 0 0 1-1.9 1.4H7.6a2 2 0 0 1-1.9-1.4Z"/>',
  lounge: '<path d="M16.5 8.5h1a3.5 3.5 0 0 1 0 7h-1"/><path d="M3.5 8.5h13V16a4 4 0 0 1-4 4h-5a4 4 0 0 1-4-4Z"/><path d="M7 2.5v3M10.5 2.5v3M14 2.5v3"/>',
  car: '<path d="M4 16.5V12l2-5.2A2 2 0 0 1 7.9 5.5h8.2a2 2 0 0 1 1.9 1.3L20 12v4.5"/><path d="M3.5 12h17v4.5h-17Z"/><circle cx="7.5" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/>',
  people: '<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20.5v-.8a5.2 5.2 0 0 1 5.2-5.2h2.6a5.2 5.2 0 0 1 5.2 5.2v.8"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.6a5.2 5.2 0 0 1 3.5 4.9v1"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21v-.6a6.4 6.4 0 0 1 6.4-6.4h2.2a6.4 6.4 0 0 1 6.4 6.4v.6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.4"/><path d="M8 3v4M16 3v4M3.5 10.5h17"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.3 2"/>',
  pin: '<path d="M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  tag: '<path d="M20.4 13.4 13.4 20.4a2 2 0 0 1-2.8 0L3 12.8V3h9.8l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.6" cy="7.6" r="1.4"/>',
  spark: '<path d="m12 3 1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9-4.9-1.8 4.9-1.8Z"/><path d="M18.5 15.5v4M16.5 17.5h4"/>',
  chat: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.5-4.4a8.4 8.4 0 1 1 15.5-4.5Z"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.4"/><path d="m3 6.5 9 6.5 9-6.5"/>',
  briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2.4"/><path d="M8.5 7V5a1.8 1.8 0 0 1 1.8-1.8h3.4A1.8 1.8 0 0 1 15.5 5v2M2.5 12.5h19"/>',
  history: '<path d="M3.5 12A8.5 8.5 0 1 0 6 6"/><path d="M3 3v4.5h4.5"/><path d="M12 7.5V12l3 1.8"/>',
  id: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.4"/><circle cx="8.5" cy="11" r="2.3"/><path d="M5.2 16.5a3.6 3.6 0 0 1 6.6 0M14 9.5h4.5M14 13h3"/>',
  hand: '<path d="M8.5 13V5.2a1.6 1.6 0 0 1 3.2 0V12"/><path d="M11.7 11V4a1.6 1.6 0 0 1 3.2 0v7"/><path d="M14.9 11V5.6a1.6 1.6 0 0 1 3.2 0v8.9a7 7 0 0 1-7 7h-.4a6.7 6.7 0 0 1-5.2-2.5l-2.6-3.4a1.6 1.6 0 0 1 2.5-2l2.3 2.4"/>',
  dots: '<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><path d="M2.5 10h19M6.5 15h3"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1L20.5 8.5"/><path d="M20.5 3.5v5h-5"/>',
  refund: '<path d="M3.5 7v5h5"/><path d="M4 12a8.5 8.5 0 1 1 2.5 6"/><path d="M12 8v8M14.5 9.5h-3.2a1.6 1.6 0 0 0 0 3.2h1.4a1.6 1.6 0 0 1 0 3.2H9.5"/>',
  tv: '<rect x="2.5" y="6.5" width="19" height="13" rx="2.4"/><path d="m8 2.5 4 4 4-4"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  userPlus: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20.5v-.6A5.4 5.4 0 0 1 7.9 14.5h2.2a5.4 5.4 0 0 1 5.4 5.4v.6M19 8v6M22 11h-6"/>',
  send: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5Z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// Top-view plane pointing along +x, centred on 0,0. Used on motion paths.
export const PLANE_PATH =
  'M8 0C8-.9 6.6-1.3 5.2-1.3H1.6L-2.4-7.6H-4.1L-1.6-1.3H-5.4L-7.1-3.7H-8.3L-7.1-.5V.5L-8.3 3.7H-7.1L-5.4 1.3H-1.6L-4.1 7.6H-2.4L1.6 1.3H5.2C6.6 1.3 8 .9 8 0Z';
