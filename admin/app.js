import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import {
  getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { firebaseConfig, LICENSES_COLLECTION, ADMIN_EMAIL } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const loginScreen = $('login-screen');
const dashboard = $('dashboard');
const errorMsg = $('error-msg');

// --- Auth ---

$('login-btn').addEventListener('click', async () => {
  errorMsg.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, $('login-email').value.trim(), $('login-password').value);
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});

$('signout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    $('who').textContent = user.email;
    loadLicenses();
  } else {
    if (user && user.email !== ADMIN_EMAIL) {
      errorMsg.textContent = `Signed in as ${user.email}, which is not the admin account. Firestore will reject all requests.`;
      signOut(auth);
    }
    dashboard.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  }
});

// --- Create license ---

function generateKey() {
  // A fresh, unused Firestore document ID doubles as the license key -
  // ~20 random base62 chars, effectively unguessable.
  return doc(collection(db, LICENSES_COLLECTION)).id;
}

$('create-btn').addEventListener('click', async () => {
  const email = $('new-email').value.trim();
  if (!email) { alert('Customer email is required.'); return; }

  const key = generateKey();
  const license = {
    email,
    name: $('new-name').value.trim() || null,
    plan: $('new-plan').value,
    status: 'active',
    expiresAt: computeExpiry($('new-plan').value),
    deviceLimit: parseInt($('new-device-limit').value, 10) || 1,
    activatedDevices: [],
  };

  await setDoc(doc(db, LICENSES_COLLECTION, key), license);

  const resultBox = $('new-key-result');
  resultBox.classList.remove('hidden');
  resultBox.textContent = `License key for ${email}: ${key}`;

  $('new-email').value = '';
  $('new-name').value = '';
  loadLicenses();
});

function computeExpiry(plan) {
  const now = Date.now();
  if (plan === 'monthly') return now + 31 * 24 * 60 * 60 * 1000;
  if (plan === 'yearly') return now + 366 * 24 * 60 * 60 * 1000;
  return null; // lifetime
}

// --- List / manage licenses ---

async function loadLicenses() {
  const rowsEl = $('license-rows');
  rowsEl.innerHTML = '<tr><td colspan="7" class="dim">Loading...</td></tr>';

  const snap = await getDocs(query(collection(db, LICENSES_COLLECTION), orderBy('email')));
  if (snap.empty) {
    rowsEl.innerHTML = '<tr><td colspan="7" class="dim">No licenses yet.</td></tr>';
    return;
  }

  rowsEl.innerHTML = '';
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const key = docSnap.id;
    const tr = document.createElement('tr');

    const expires = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'Never';
    const badgeClass = data.status === 'active' ? 'badge-active' : `badge-${data.status}`;
    const deviceCount = (data.activatedDevices || []).length;

    tr.innerHTML = `
      <td class="mono" title="${key}">${key.slice(0, 8)}...</td>
      <td>${data.email}</td>
      <td>${data.plan}</td>
      <td><span class="badge ${badgeClass}">${data.status}</span></td>
      <td>${deviceCount} / ${data.deviceLimit}</td>
      <td>${expires}</td>
      <td class="row-actions"></td>
    `;

    const actionsCell = tr.querySelector('.row-actions');
    actionsCell.appendChild(makeButton('Copy Key', 'btn-secondary btn-sm', () => {
      navigator.clipboard.writeText(key);
    }));

    if (data.status === 'active') {
      actionsCell.appendChild(makeButton('Revoke', 'btn-danger btn-sm', () => setStatus(key, 'revoked')));
    } else {
      actionsCell.appendChild(makeButton('Reactivate', 'btn-secondary btn-sm', () => setStatus(key, 'active')));
    }

    if (deviceCount > 0) {
      actionsCell.appendChild(makeButton('Clear Devices', 'btn-secondary btn-sm', () => clearDevices(key)));
    }

    actionsCell.appendChild(makeButton('Delete', 'btn-danger btn-sm', () => removeLicense(key)));

    rowsEl.appendChild(tr);
  });
}

function makeButton(label, className, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener('click', onClick);
  return btn;
}

async function setStatus(key, status) {
  await updateDoc(doc(db, LICENSES_COLLECTION, key), { status });
  loadLicenses();
}

async function clearDevices(key) {
  if (!confirm('Free up all activated device slots for this license?')) return;
  await updateDoc(doc(db, LICENSES_COLLECTION, key), { activatedDevices: [] });
  loadLicenses();
}

async function removeLicense(key) {
  if (!confirm('Permanently delete this license? This cannot be undone.')) return;
  await deleteDoc(doc(db, LICENSES_COLLECTION, key));
  loadLicenses();
}
