(function () {
  if (new URLSearchParams(location.search).get('lan') === '1') return;

  if (!globalThis.firebase) {
    console.error('[Sektor] Firebase SDK failed to load; using local storage.');
    return;
  }

  const firebaseConfig = {
    apiKey: 'AIzaSyBVC5MoEFFfZpH_VQQKKHT1G6zEfJyP4Mw',
    authDomain: 'sektor-61253.firebaseapp.com',
    databaseURL: 'https://sektor-61253-default-rtdb.firebaseio.com',
    projectId: 'sektor-61253',
    storageBucket: 'sektor-61253.firebasestorage.app',
    messagingSenderId: '734978618972',
    appId: '1:734978618972:web:8c0399e92fee408f6d9899',
    measurementId: 'G-911TMM5EXZ'
  };

  if (!globalThis.firebase.apps.length) {
    globalThis.firebase.initializeApp(firebaseConfig);
  }
})();
