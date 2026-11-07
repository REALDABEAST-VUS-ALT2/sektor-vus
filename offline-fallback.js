(function () {
  const delay = 60_000;
  let timer = null;
  let dismissed = false;
  let previousFocus = null;
  let inertElements = [];

  const style = document.createElement('style');
  style.textContent = `
    .offline-fallback {
      position: fixed;
      z-index: 2147483647;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f4f7f3;
      color: #17201b;
      font: 16px/1.5 system-ui, sans-serif;
    }
    .offline-fallback[hidden] { display: none; }
    .offline-fallback__content {
      width: min(100%, 520px);
      padding: 36px;
      border: 1px solid #d8e0d9;
      border-top: 5px solid #32664d;
      background: #fff;
      box-shadow: 0 16px 48px #17201b1a;
    }
    .offline-fallback__eyebrow {
      margin: 0 0 12px;
      color: #32664d;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .offline-fallback h1 { margin: 0; font-size: 28px; line-height: 1.15; }
    .offline-fallback__copy { margin: 14px 0 24px; color: #536057; }
    .offline-fallback__return {
      min-height: 44px;
      padding: 10px 16px;
      border: 0;
      background: #32664d;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
    }
    .offline-fallback__return:hover { background: #244b38; }
    .offline-fallback__return:focus-visible { outline: 3px solid #9dbda9; outline-offset: 3px; }
    @media (max-width: 480px) {
      .offline-fallback__content { padding: 26px 22px; }
      .offline-fallback h1 { font-size: 24px; }
    }
  `;
  document.head.append(style);

  const overlay = document.createElement('section');
  overlay.className = 'offline-fallback';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'offline-fallback-title');
  overlay.innerHTML = `
    <div class="offline-fallback__content">
      <p class="offline-fallback__eyebrow">Offline study pause</p>
      <h1 id="offline-fallback-title">Your connection is paused.</h1>
      <p class="offline-fallback__copy">Your current page is still open. Return whenever you are ready; your place has been kept.</p>
      <button class="offline-fallback__return" type="button">Return to Sektor</button>
    </div>
  `;
  document.body.append(overlay);

  const returnButton = overlay.querySelector('button');

  function hideFallback() {
    overlay.hidden = true;
    inertElements.forEach(({ element, wasInert }) => { element.inert = wasInert; });
    inertElements = [];
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    previousFocus = null;
  }

  function showFallback() {
    if (dismissed || navigator.onLine) return;
    previousFocus = document.activeElement;
    inertElements = Array.from(document.body.children)
      .filter(element => element !== overlay && element !== style)
      .map(element => ({ element, wasInert: element.inert }));
    inertElements.forEach(({ element }) => { element.inert = true; });
    overlay.hidden = false;
    returnButton.focus();
  }

  function startTimer() {
    window.clearTimeout(timer);
    dismissed = false;
    timer = window.setTimeout(showFallback, delay);
  }

  returnButton.addEventListener('click', () => {
    dismissed = true;
    window.clearTimeout(timer);
    hideFallback();
  });

  window.addEventListener('offline', startTimer);
  window.addEventListener('online', () => {
    window.clearTimeout(timer);
    dismissed = false;
    hideFallback();
  });

  if (!navigator.onLine) startTimer();
})();