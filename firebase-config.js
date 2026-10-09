(function () {
  if (new URLSearchParams(location.search).get('lan') === '1') return;

  if (!globalThis.firebase) {
    console.error('[Sektor] Firebase SDK failed to load; using local storage.');
    return;
  }

  const firebaseConfig = {
    apiKey: 'AIzaSyD8eBtfrl86bOoQj9qu3cxdx0bqjDl1MRI',
    authDomain: 'sektor-b5021.firebaseapp.com',
    databaseURL: 'https://sektor-b5021-default-rtdb.firebaseio.com',
    projectId: 'sektor-b5021',
    storageBucket: 'sektor-b5021.firebasestorage.app',
    messagingSenderId: '63842268705',
    appId: '1:63842268705:web:8fbfb1394280620f4b1560',
    measurementId: 'G-05F79Y9VB6'
  };

  if (!globalThis.firebase.apps.length) {
    globalThis.firebase.initializeApp(firebaseConfig);
  }
})();
