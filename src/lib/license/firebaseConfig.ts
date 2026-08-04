// ============================================================================
// FILL THIS IN AFTER CREATING YOUR FIREBASE PROJECT.
// Firebase console -> Project settings -> General -> Your apps -> Web app
// -> copy the `firebaseConfig` object shown there and paste the values below.
//
// This is NOT a secret - Firebase's client (`apiKey` etc.) config is safe to
// ship in a public app. The actual security boundary is firestore.rules
// (see /firestore.rules), not hiding this object.
// ============================================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyDsGzi6lETs3JIW8xjLen5-yx4mK8qhlRY',
  authDomain: 'jontrocrm.firebaseapp.com',
  projectId: 'jontrocrm',
  storageBucket: 'jontrocrm.firebasestorage.app',
  messagingSenderId: '930049294226',
  appId: '1:930049294226:web:94943a02590c9b44c98b4b',
};

// The Firestore collection licenses are stored in. Keep this in sync with
// firestore.rules and admin/app.js if you rename it.
export const LICENSES_COLLECTION = 'licenses';

// The only email allowed to create/revoke/list licenses (must match
// isAdmin() in firestore.rules, and is the account you sign into admin/ with).
export const ADMIN_EMAIL = 'zihad.connects@gmail.com';

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey !== 'REPLACE_ME' && firebaseConfig.projectId !== 'REPLACE_ME';
