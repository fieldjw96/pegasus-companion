// The demo persona: one invented traveler, the people they have booked with
// before, and their habits. Kept apart from the route and fare data on purpose:
// anything exported for another prototype (scripts/export-classic.mjs) ships
// without it.
//
// All of it stands for data Pegasus already holds: the passenger's own profile
// and their past Pegasus bookings, used with their permission. No chats, email,
// calendar or phone contacts are read.

export const ME = { id: 'me', first: 'Yitzy', last: 'Rosenberg', dob: '1996-05-14', src: 'profile' };

// People this passenger has booked on Pegasus before, with what that booking saved.
export const PEOPLE = {
  ali: { first: 'Ali', last: 'Demir', dob: '1995-07-02', src: 'trip' },
  mert: { first: 'Mert', last: 'Kaya', dob: '1996-01-21', src: 'trip' },
  daniel: { first: 'Daniel', last: 'Cohen', dob: '1995-09-09', src: 'trip' },
  emre: { first: 'Emre', last: 'Yıldız', dob: '1997-04-30', src: 'trip' },
  josh: { first: 'Josh', last: 'Miller', dob: null, src: 'trip' },
  dana: { first: 'Dana', last: 'Levi', dob: '1996-11-20', src: 'trip' },
};

// Who "my wife" / "my partner" means for this persona (a PEOPLE id).
export const PARTNER = 'dana';

// "The boys" / "my friends": the friends this passenger books with most. Used
// when no head count is said or the count matches; otherwise it asks.
export const GROUPS = {
  boys: { name: 'Friends you fly with', src: 'trip', members: ['ali', 'mert', 'daniel', 'emre', 'josh'] },
};

// What the companion learned from earlier bookings.
export const HISTORY = { trips: 9, usualBags: 'cabin', usualNights: 3 };

// The sentence the mic types out when the browser has no speech recognition.
export const DEMO_UTTERANCE = 'Antalya with my wife and our 6 month old, 10 to 14 Nov, morning flights, one bag';
// ...and the change it says next, to show talking to change the trip.
export const DEMO_CHANGE = 'Make it five nights and add my mom';
