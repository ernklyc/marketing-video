// Example capture-proxy rules (copy to <job>/proxy/rules.js). The proxy forwards the app's API calls to your
// staging server, then lets you replace thin or private data with clearly fake demo data, and FIXTURES every
// write call so recording never changes the server. Keep invented names obviously fictional.
const PLACES = [['Harbor Studio', 'Downtown'], ['Riverside Loft', 'Old Town'], ['Sunset Hall', 'Bay Area']];
const PEOPLE = ['Alex Rivera', 'Sam Lee', 'Jordan Kim', 'Taylor Brooks', 'Morgan Diaz', 'Casey Patel'];
let i = 0;
const fake = (o) => {
  if (o && typeof o === 'object') {
    if ('venue_name' in o) o.venue_name = PLACES[i++ % PLACES.length][0];
    if ('user_name' in o) o.user_name = PEOPLE[i++ % PEOPLE.length];
    if ('email' in o) o.email = 'demo@example.com';
    if ('phone' in o) o.phone = '+00 000 000 00 00';
    Object.values(o).forEach(fake);
  }
};
module.exports = {
  // return a value to answer without touching the server
  fixture: (method, url) => (method !== 'GET' && !/\/auth\//.test(url) ? { success: true, message: 'ok', data: {} } : undefined),
  // edit real responses before the app sees them
  patch: (method, url, json) => { if (!url.includes('/auth/')) fake(json); return json; },
};
