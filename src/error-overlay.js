// client/src/error-overlay.js
// Creates an on-page "chat" that displays errors, warnings, and logs.
// Exports: initErrorOverlay() and reportError(msg, level)

export function initErrorOverlay(options = {}) {
  const maxMessages = options.maxMessages || 80;
  const containerId = options.containerId || 'errorChat';
  if (document.getElementById(containerId)) return window.__errorOverlay;

  // container
  const wrap = document.createElement('div');
  wrap.id = containerId;
  Object.assign(wrap.style, {
    position: 'fixed',
    left: '12px',
    top: '12px',
    width: '360px',
    maxHeight: '45vh',
    overflowY: 'auto',
    zIndex: 9999,
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontFamily: 'system-ui,Segoe UI,Roboto,Arial',
    fontSize: '12px',
    borderRadius: '8px',
    padding: '8px',
    boxSizing: 'border-box',
    backdropFilter: 'blur(4px)'
  });

  const header = document.createElement('div');
  header.textContent = 'Debug Chat';
  Object.assign(header.style, { fontWeight: '700', marginBottom: '6px' });
  wrap.appendChild(header);

  const list = document.createElement('div');
  list.id = containerId + '-list';
  wrap.appendChild(list);

  const controls = document.createElement('div');
  Object.assign(controls.style, { marginTop: '8px', display: 'flex', gap: '6px' });

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  Object.assign(clearBtn.style, { padding: '6px 8px', cursor: 'pointer' });
  clearBtn.addEventListener('click', () => { list.innerHTML = ''; });

  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'Hide';
  Object.assign(hideBtn.style, { padding: '6px 8px', cursor: 'pointer' });
  hideBtn.addEventListener('click', () => { wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none'; });

  controls.appendChild(clearBtn);
  controls.appendChild(hideBtn);
  wrap.appendChild(controls);

  document.body.appendChild(wrap);

  const messages = [];

  function addMessage(text, level = 'error') {
    const time = new Date().toLocaleTimeString();
    const el = document.createElement('div');
    el.style.marginBottom = '6px';
    el.style.padding = '6px';
    el.style.borderRadius = '6px';
    el.style.whiteSpace = 'pre-wrap';
    el.style.wordBreak = 'break-word';
    el.style.boxSizing = 'border-box';
    el.style.fontSize = '12px';

    if (level === 'error') {
      el.style.background = 'linear-gradient(90deg, rgba(120,20,20,0.12), rgba(60,10,10,0.06))';
      el.style.border = '1px solid rgba(200,80,80,0.12)';
    } else if (level === 'warn') {
      el.style.background = 'linear-gradient(90deg, rgba(120,80,20,0.08), rgba(60,40,10,0.04))';
      el.style.border = '1px solid rgba(200,160,80,0.08)';
    } else {
      el.style.background = 'rgba(255,255,255,0.02)';
      el.style.border = '1px solid rgba(255,255,255,0.02)';
    }

    el.innerHTML = `<strong style="display:block;color:#fff">${level.toUpperCase()} • ${time}</strong><div style="margin-top:4px;color:#ddd">${escapeHtml(text)}</div>`;
    list.appendChild(el);
    messages.push(el);
    // trim
    while (messages.length > maxMessages) {
      const rm = messages.shift();
      if (rm && rm.parentNode) rm.parentNode.removeChild(rm);
    }
    // auto-scroll
    list.scrollTop = list.scrollHeight;
  }

  function escapeHtml(s) {
    if (typeof s !== 'string') s = String(s);
    return s.replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  // global handlers
  window.addEventListener('error', (ev) => {
    try {
      const msg = `${ev.message || 'Error'}\n${ev.filename || ''}:${ev.lineno || ''}:${ev.colno || ''}\n${ev.error && ev.error.stack ? ev.error.stack : ''}`;
      addMessage(msg, 'error');
    } catch (e) { /* ignore overlay errors */ }
  });

  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const reason = ev.reason && ev.reason.stack ? ev.reason.stack : (ev.reason ? JSON.stringify(ev.reason) : 'unhandled rejection');
      addMessage(`UnhandledRejection: ${reason}`, 'error');
    } catch (e) { /* ignore */ }
  });

  // wrap console.error/warn/log to also show in overlay
  const origConsole = {
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    log: console.log.bind(console)
  };

  console.error = function(...args) {
    try { addMessage(args.map(a => stringifyArg(a)).join(' '), 'error'); } catch (e) {}
    origConsole.error(...args);
  };
  console.warn = function(...args) {
    try { addMessage(args.map(a => stringifyArg(a)).join(' '), 'warn'); } catch (e) {}
    origConsole.warn(...args);
  };
  console.log = function(...args) {
    try { addMessage(args.map(a => stringifyArg(a)).join(' '), 'log'); } catch (e) {}
    origConsole.log(...args);
  };

  function stringifyArg(a) {
    try {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      return JSON.stringify(a, null, 2);
    } catch (e) {
      return String(a);
    }
  }

  // exported API
  const api = {
    add: addMessage,
    clear: () => { list.innerHTML = ''; },
    hide: () => { wrap.style.display = 'none'; },
    show: () => { wrap.style.display = 'block'; }
  };

  // attach to window for easy access
  window.__errorOverlay = api;
  return api;
}

// convenience reporter
export function reportError(msg, level = 'error') {
  if (window.__errorOverlay && typeof window.__errorOverlay.add === 'function') {
    window.__errorOverlay.add(msg, level);
  } else {
    // fallback to console
    if (level === 'error') console.error(msg);
    else if (level === 'warn') console.warn(msg);
    else console.log(msg);
  }
}
