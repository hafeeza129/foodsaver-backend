// FoodSaver — Shared JS

const DB = {
  get: k => JSON.parse(localStorage.getItem('fs_' + k) || 'null'),
  set: (k, v) => localStorage.setItem('fs_' + k, JSON.stringify(v)),
  del: k => localStorage.removeItem('fs_' + k),
};

// ── Session ──
function getSession() { return DB.get('session'); }
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function logout() {
  DB.del('session');
  const r = window.location.pathname.includes('/pages/') ? '../' : '';
  window.location.href = r + 'login.html';
}
function requireAuth() {
  if (!getSession()) {
    const r = window.location.pathname.includes('/pages/') ? '../' : '';
    window.location.href = r + 'login.html';
  }
}
function redirectIfLoggedIn() {
  if (getSession()) {
    window.location.href = 'pages/browse.html';
  }
}

// ── Root path ──
function root() { return window.location.pathname.includes('/pages/') ? '../' : ''; }

// ── Listings ──
const DEMO_LISTINGS = [
  { id: 1, restaurant: 'Spice Garden', contact: '+91 98765 43210', email: 'spicegarden@food.in', address: 'MG Road, Near Clock Tower, Vijayawada', food: 'Mixed veg curry & steamed rice', qty: 25, unit: 'portions', category: 'Vegetarian', pickup: '7:00 PM – 8:30 PM', expiry: 95, veg: true, claimed: false, postedBy: 'spicegarden@food.in', postedAt: new Date(Date.now() - 30*60000).toISOString() },
  { id: 2, restaurant: 'Annapoorna Sweets', contact: '+91 96543 21098', email: 'annapoorna@sweets.in', address: 'Labbipet, Vijayawada', food: 'Gulab jamun & medu vada', qty: 40, unit: 'pieces', category: 'Vegetarian', pickup: '6:30 PM – 7:30 PM', expiry: 28, veg: true, claimed: false, postedBy: 'demo@food.in', postedAt: new Date(Date.now() - 60*60000).toISOString() },
  { id: 3, restaurant: 'Hotel Residency', contact: '+91 94445 67890', email: 'residency@hotel.in', address: 'Benz Circle, Vijayawada', food: 'Chicken biryani (full portions)', qty: 15, unit: 'portions', category: 'Non-Veg', pickup: '8:00 PM – 9:00 PM', expiry: 185, veg: false, claimed: false, postedBy: 'demo@food.in', postedAt: new Date(Date.now() - 15*60000).toISOString() },
  { id: 4, restaurant: 'Café Mocha', contact: '+91 87654 32109', email: 'mocha@cafe.in', address: 'Eluru Road, Vijayawada', food: 'Assorted sandwiches & pastries', qty: 18, unit: 'pieces', category: 'Bakery', pickup: '5:30 PM – 6:00 PM', expiry: 22, veg: true, claimed: false, postedBy: 'demo@food.in', postedAt: new Date(Date.now() - 90*60000).toISOString() },
  { id: 5, restaurant: 'Udupi Palace', contact: '+91 99887 65432', email: 'udupi@palace.in', address: 'Governorpet, Vijayawada', food: 'Idli, dosa & fresh sambar', qty: 30, unit: 'servings', category: 'Vegetarian', pickup: '9:00 AM – 10:00 AM', expiry: 480, veg: true, claimed: true, postedBy: 'demo@food.in', postedAt: new Date(Date.now() - 120*60000).toISOString() },
  { id: 6, restaurant: 'Punjab da Dhaba', contact: '+91 77889 90011', email: 'punjab@dhaba.in', address: 'Patamata, Vijayawada', food: 'Dal makhani, naan & salad', qty: 20, unit: 'portions', category: 'Vegetarian', pickup: '9:00 PM – 10:00 PM', expiry: 300, veg: true, claimed: false, postedBy: 'demo@food.in', postedAt: new Date(Date.now() - 10*60000).toISOString() },
];

function getListings() {
  const stored = DB.get('listings') || [];
  const merged = [...DEMO_LISTINGS];
  stored.forEach(s => { if (!merged.find(m => m.id === s.id)) merged.unshift(s); });
  return merged;
}

function saveListings(list) { DB.set('listings', list.filter(l => l.id > 100)); }

function claimListing(id) {
  const listings = getListings();
  const l = listings.find(x => x.id === id);
  if (!l || l.claimed) return;
  l.claimed = true;
  if (id > 100) saveListings(listings);
  else { const extra = DB.get('claimed') || []; extra.push(id); DB.set('claimed', extra); }
  return l;
}

function isClaimedById(id) {
  const claimed = DB.get('claimed') || [];
  const listings = getListings();
  const l = listings.find(x => x.id === id);
  return l ? (l.claimed || claimed.includes(id)) : false;
}

// ── Time helpers ──
function timeFmt(min) {
  if (min <= 0) return 'Expired';
  if (min < 60) return min + 'm left';
  const h = Math.floor(min / 60), m = min % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '') + ' left';
}
function timeCls(min) { return min < 30 ? 'timer-red' : min < 90 ? 'timer-amber' : 'timer-green'; }
function badgeCls(l) {
  if (l.claimed || isClaimedById(l.id)) return 'badge-gray';
  if (l.expiry < 30) return 'badge-coral';
  return 'badge-green';
}
function badgeTxt(l) {
  if (l.claimed || isClaimedById(l.id)) return 'Claimed';
  if (l.expiry < 30) return 'Expiring soon';
  return 'Available';
}

// ── Nav avatar ──
document.addEventListener('DOMContentLoaded', () => {
  const s = getSession();
  document.querySelectorAll('.nav-avatar').forEach(el => {
    el.textContent = s ? getInitials(s.name) : '?';
    el.style.background = s ? 'var(--green-600)' : 'var(--gray-500)';
  });
  // Active nav
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    a.classList.toggle('active', href === path);
  });
});

// ── Toast ──
function showToast(msg, dur = 3500) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

// ── Contact modal ──
function openContact(listing) {
  document.getElementById('modal-rest-name').textContent = listing.restaurant;
  document.getElementById('modal-rest-address').textContent = listing.address;
  document.getElementById('modal-rest-food').textContent = listing.food;
  document.getElementById('modal-rest-pickup').textContent = listing.pickup;
  document.getElementById('modal-rest-phone').textContent = listing.contact;
  document.getElementById('modal-rest-email').textContent = listing.email;
  document.getElementById('contact-modal').classList.add('open');
}
function closeContact() { document.getElementById('contact-modal').classList.remove('open'); }
