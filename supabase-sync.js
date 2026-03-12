/* ================================================================
   DOJO OS — Supabase Sync Module  (supabase-sync.js)
   ================================================================
   HOW TO USE:
   1. Create a free Supabase project at https://supabase.com
   2. Run supabase_setup.sql in your Supabase SQL editor
   3. Copy your project URL and anon key from:
      Supabase Dashboard → Settings → API
   4. Create a file called  config.js  in the same folder:

        // config.js  — NEVER commit this with real values
        // Add config.js to your .gitignore
        window.DOJO_CONFIG = {
          supabaseUrl:  'https://YOUR_PROJECT_REF.supabase.co',
          supabaseKey:  'YOUR_ANON_KEY'   // anon key is safe for client use
        };                                // it can only read/write via RLS

   5. Add these two script tags to index.html <head>, BEFORE
      the closing </body>, in this order:

        <script src="config.js"></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js"
          integrity="sha384-YOUR_HASH_HERE"
          crossorigin="anonymous">
        </script>
        <script src="supabase-sync.js"></script>

   ⚠️  SECURITY NOTES:
   - The anon key is safe in client code — Supabase designed it for this.
     It has ZERO access without a valid user JWT + RLS policies.
   - NEVER use the service_role key in client code. Ever.
   - config.js must be in .gitignore if your repo is public.
   - All data is encrypted in transit (HTTPS) and at rest (Supabase default).
   ================================================================ */

(function () {
  'use strict';

  /* ── CONSTANTS ─────────────────────────────────────────────── */
  var SYNC_KEYS = [
    'dojo_v1', 'dojo_tf_v1', 'dojo_bm_v1', 'dojo_phys_v1',
    'dojo_craft_scores', 'dojo_scenes', 'dojo_tapes',
    'dojo_contacts', 'dojo_events', 'dojo_reel_notes',
    'dojo_tl_tasks_v1', 'dojo_h30_v1', 'dojo_history_v1'
  ];

  var OFFLINE_QUEUE_KEY = 'dojo_sync_queue';   /* localStorage key for queued writes */
  var SESSION_KEY       = 'dojo_session';       /* localStorage key for session cache */

  /* ── STATE ──────────────────────────────────────────────────── */
  var _supabase   = null;
  var _session    = null;
  var _isCoach    = false;
  var _syncActive = false;

  /* ── INIT ───────────────────────────────────────────────────── */
  function init() {
    /* Validate config exists before doing anything */
    if (!window.DOJO_CONFIG ||
        !window.DOJO_CONFIG.supabaseUrl ||
        !window.DOJO_CONFIG.supabaseKey) {
      _log('warn', 'DOJO_CONFIG missing — cloud sync disabled. See supabase-sync.js header.');
      _renderAuthUI('config-missing');
      return;
    }

    /* Validate URL format — prevent config typos causing silent failures */
    var urlPattern = /^https:\/\/[a-z0-9]+\.supabase\.co$/;
    if (!urlPattern.test(window.DOJO_CONFIG.supabaseUrl)) {
      _log('error', 'Invalid supabaseUrl format. Expected: https://xyz.supabase.co');
      return;
    }

    /* Supabase JS must be loaded before this script */
    if (typeof window.supabase === 'undefined') {
      _log('error', 'Supabase JS not loaded. Check script tag order in index.html.');
      return;
    }

    _supabase = window.supabase.createClient(
      window.DOJO_CONFIG.supabaseUrl,
      window.DOJO_CONFIG.supabaseKey,
      {
        auth: {
          persistSession:   true,
          autoRefreshToken: true,
          detectSessionInUrl: true   /* handles magic link token in URL */
        }
      }
    );

    /* Listen for auth state changes (login, logout, token refresh) */
    _supabase.auth.onAuthStateChange(function (event, session) {
      _log('info', 'Auth event:', event);
      _session = session;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        _onSignedIn(session);
      } else if (event === 'SIGNED_OUT') {
        _onSignedOut();
      }
    });

    /* Also check for existing session on load */
    _supabase.auth.getSession().then(function (result) {
      if (result.data && result.data.session) {
        _session = result.data.session;
        _onSignedIn(result.data.session);
      } else {
        _renderAuthUI('logged-out');
      }
    });

    /* Flush offline queue when connection restored */
    window.addEventListener('online', _flushOfflineQueue);
  }

  /* ── AUTH HANDLERS ──────────────────────────────────────────── */
  function _onSignedIn(session) {
    _detectCoachRole(session).then(function (isCoach) {
      _isCoach = isCoach;
      _renderAuthUI('logged-in');

      if (_isCoach) {
        /* Coach: pull athlete data for viewing, no writes */
        _log('info', 'Signed in as COACH — read-only mode');
        _pullCoachView();
      } else {
        /* Athlete: full sync */
        _log('info', 'Signed in as ATHLETE — full sync active');
        _pullAll().then(function () {
          _flushOfflineQueue();
          _patchSaveFunctions();
        });
      }
    });
  }

  function _onSignedOut() {
    _isCoach    = false;
    _syncActive = false;
    _renderAuthUI('logged-out');
    _unpatchSaveFunctions();
  }

  /* ── COACH DETECTION ────────────────────────────────────────── */
  /* A user is a coach if they have NO rows in dojo_sync for themselves
     but DO exist in someone's coach_access table.
     We detect this by attempting to read their own dojo_v1 row.
     If null AND they can read another user's data = coach. */
  function _detectCoachRole(session) {
    return _supabase
      .from('dojo_sync')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('data_key', 'dojo_v1')
      .maybeSingle()
      .then(function (result) {
        /* If no personal data row exists, they are likely the coach */
        return result.data === null;
      })
      .catch(function () { return false; });
  }

  /* ── PULL — SUPABASE → LOCALSTORAGE ─────────────────────────── */
  function _pullAll() {
    if (!_session) return Promise.resolve();

    return _supabase
      .from('dojo_sync')
      .select('data_key, data_value, updated_at')
      .eq('user_id', _session.user.id)
      .then(function (result) {
        if (result.error) {
          _log('error', 'Pull failed:', result.error.message);
          return;
        }
        var rows = result.data || [];
        rows.forEach(function (row) {
          /* Validate key is in whitelist before writing to localStorage */
          if (SYNC_KEYS.indexOf(row.data_key) === -1) return;

          var localRaw = localStorage.getItem(row.data_key);
          if (!localRaw) {
            /* Nothing local — take cloud value */
            _safeSetLocal(row.data_key, row.data_value);
          } else {
            /* Conflict resolution: last-write-wins by updated_at */
            var localTs  = _getLocalTimestamp(row.data_key);
            var cloudTs  = new Date(row.updated_at).getTime();
            if (cloudTs > localTs) {
              _safeSetLocal(row.data_key, row.data_value);
              _log('info', 'Cloud newer — pulled:', row.data_key);
            } else {
              _log('info', 'Local newer — keeping:', row.data_key);
            }
          }
        });
        _log('info', 'Pull complete —', rows.length, 'keys synced');
        /* Refresh app UI after pulling fresh data */
        if (typeof window.loadD === 'function') window.loadD();
        if (typeof window.updDash === 'function') window.updDash();
      });
  }

  function _pullCoachView() {
    /* Coach reads data where their email is in coach_access.
       RLS policy on dojo_sync enforces this server-side. */
    return _supabase
      .from('dojo_sync')
      .select('user_id, data_key, data_value, updated_at')
      .then(function (result) {
        if (result.error) {
          _log('error', 'Coach pull failed:', result.error.message);
          return;
        }
        _log('info', 'Coach view loaded —', (result.data || []).length, 'rows');
        /* Store coach view separately — never overwrites athlete localStorage */
        try {
          localStorage.setItem('dojo_coach_view', JSON.stringify(result.data || []));
        } catch (e) {}
        _renderCoachDashboard(result.data || []);
      });
  }

  /* ── PUSH — LOCALSTORAGE → SUPABASE ─────────────────────────── */
  function _push(key, value) {
    /* Block coach from pushing any data — enforced client-side AND by RLS */
    if (_isCoach) {
      _log('warn', 'Coach cannot write data — push blocked');
      return;
    }
    if (!_session) {
      _queueOffline(key, value);
      return;
    }

    /* Validate key against whitelist before sending to server */
    if (SYNC_KEYS.indexOf(key) === -1) {
      _log('warn', 'Rejected unknown key:', key);
      return;
    }

    var payload = {
      user_id:    _session.user.id,
      data_key:   key,
      data_value: value,   /* already parsed JSON object */
      updated_at: new Date().toISOString()
    };

    _supabase
      .from('dojo_sync')
      .upsert(payload, { onConflict: 'user_id,data_key' })
      .then(function (result) {
        if (result.error) {
          _log('error', 'Push failed for', key, ':', result.error.message);
          _queueOffline(key, value);
        } else {
          _updateLocalTimestamp(key);
          _log('info', 'Pushed:', key);
        }
      });
  }

  /* ── OFFLINE QUEUE ───────────────────────────────────────────── */
  function _queueOffline(key, value) {
    var queue = _getOfflineQueue();
    /* Overwrite any existing queued entry for the same key */
    queue[key] = { value: value, ts: Date.now() };
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}
    _log('info', 'Queued offline:', key);
  }

  function _flushOfflineQueue() {
    if (!_session || _isCoach || !navigator.onLine) return;

    var queue = _getOfflineQueue();
    var keys  = Object.keys(queue);
    if (keys.length === 0) return;

    _log('info', 'Flushing offline queue —', keys.length, 'items');
    keys.forEach(function (key) {
      _push(key, queue[key].value);
    });
    /* Clear queue after flush attempt */
    try { localStorage.removeItem(OFFLINE_QUEUE_KEY); } catch (e) {}
  }

  function _getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '{}');
    } catch (e) { return {}; }
  }

  /* ── MONKEY-PATCH SAVE FUNCTIONS ─────────────────────────────── */
  /* Intercepts every localStorage save the app makes and mirrors
     it to Supabase. Zero changes needed to existing app code. */
  var _originals = {};

  var PATCH_MAP = {
    'saveD':          'dojo_v1',
    'tfSaveData':     'dojo_tf_v1',
    'saveHistory':    'dojo_history_v1',
    'wpSave':         'dojo_phys_v1',
    'tlSaveTasks':    'dojo_tl_tasks_v1',
    'h30Save':        'dojo_h30_v1',
    'scSaveScenes':   'dojo_scenes',
    'rtSaveTapes':    'dojo_tapes',
    'neSaveContacts': 'dojo_contacts',
    'neSaveEvents':   'dojo_events'
  };

  /* Craft scores and reel notes use localStorage directly,
     so we patch localStorage.setItem itself for those keys */
  var DIRECT_KEYS = ['dojo_craft_scores', 'dojo_bm_v1', 'dojo_reel_notes'];

  function _patchSaveFunctions() {
    if (_syncActive) return;
    _syncActive = true;

    /* Patch named save functions */
    Object.keys(PATCH_MAP).forEach(function (fnName) {
      if (typeof window[fnName] !== 'function') return;
      var key = PATCH_MAP[fnName];
      _originals[fnName] = window[fnName];
      window[fnName] = function (data) {
        _originals[fnName].call(this, data);   /* call original first */
        var parsed = _parseArg(data);
        _push(key, parsed);
      };
    });

    /* Patch localStorage.setItem for direct-write keys */
    var origSetItem = localStorage.setItem.bind(localStorage);
    _originals['_setItem'] = origSetItem;

    localStorage.setItem = function (key, value) {
      origSetItem(key, value);   /* always call original */
      if (DIRECT_KEYS.indexOf(key) !== -1 && _session && !_isCoach) {
        var parsed;
        try { parsed = JSON.parse(value); } catch (e) { parsed = value; }
        _push(key, parsed);
      }
    };

    _log('info', 'Save functions patched — auto-sync active');
  }

  function _unpatchSaveFunctions() {
    if (!_syncActive) return;
    _syncActive = false;

    /* Restore original functions */
    Object.keys(_originals).forEach(function (fnName) {
      if (fnName === '_setItem') {
        localStorage.setItem = _originals['_setItem'];
      } else if (window[fnName]) {
        window[fnName] = _originals[fnName];
      }
    });
    _originals = {};
    _log('info', 'Save functions unpatched');
  }

  /* ── MAGIC LINK AUTH ACTIONS ─────────────────────────────────── */
  function signIn(email) {
    /* Validate email format before sending to Supabase */
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(email)) {
      _showSyncStatus('error', 'Invalid email address');
      return;
    }

    /* Sanitise — trim whitespace, lowercase */
    var cleanEmail = email.trim().toLowerCase();

    _supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.href
      }
    }).then(function (result) {
      if (result.error) {
        _showSyncStatus('error', 'Login failed: ' + result.error.message);
      } else {
        _renderAuthUI('magic-link-sent');
      }
    });
  }

  function signOut() {
    _supabase.auth.signOut().then(function () {
      _onSignedOut();
    });
  }

  /* Public API */
  window.dojoSync = {
    signIn:  signIn,
    signOut: signOut,
    pullAll: function () { return _pullAll(); },
    push:    function (key, value) { _push(key, value); }
  };

  /* ── AUTH UI ─────────────────────────────────────────────────── */
  function _renderAuthUI(state) {
    var banner = document.getElementById('syncBanner');
    if (!banner) return;

    if (state === 'config-missing') {
      banner.innerHTML = '<span class="sync-txt" style="color:var(--red)">⚠ SYNC: config.js missing — see supabase-sync.js</span>';
      banner.classList.add('show');
      return;
    }

    if (state === 'logged-out') {
      banner.innerHTML =
        '<span class="sync-txt">☁ CLOUD SYNC</span>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<input id="syncEmail" type="email" class="sync-input" placeholder="your@email.com" autocomplete="email">' +
          '<button class="sync-btn" onclick="(function(){var e=document.getElementById(\'syncEmail\');if(e)window.dojoSync.signIn(e.value);})()">SEND LINK</button>' +
        '</div>';
      banner.classList.add('show');
      return;
    }

    if (state === 'magic-link-sent') {
      banner.innerHTML =
        '<span class="sync-txt" style="color:var(--grn)">✓ CHECK YOUR EMAIL — tap the link to sign in</span>';
      return;
    }

    if (state === 'logged-in') {
      var user  = _session && _session.user;
      var email = user ? _sanitiseDisplay(user.email) : '';
      var role  = _isCoach ? '👁 COACH VIEW' : '✓ SYNCED';
      var color = _isCoach ? 'var(--pur)' : 'var(--grn)';

      banner.innerHTML =
        '<span class="sync-txt" style="color:' + color + '">' + role + ' · ' + email + '</span>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<button class="sync-btn-sm" onclick="window.dojoSync.pullAll()">↓ PULL</button>' +
          '<button class="sync-btn-sm" onclick="window.dojoSync.signOut()">SIGN OUT</button>' +
        '</div>';
      banner.classList.add('show');

      if (_isCoach) {
        /* Lock all input fields — read-only mode for coach */
        _applyCoachReadOnly();
      }
      return;
    }
  }

  function _renderCoachDashboard(rows) {
    /* Group rows by key for display */
    var byKey = {};
    rows.forEach(function (row) { byKey[row.data_key] = row; });

    var panel = document.getElementById('coachPanel');
    if (!panel) return;

    var html = '<div class="coach-header">COACH VIEW — READ ONLY</div>';

    /* Habit completion % from dojo_tf_v1 */
    if (byKey['dojo_tf_v1'] && byKey['dojo_tf_v1'].data_value) {
      var tf = byKey['dojo_tf_v1'].data_value;
      html += _coachSection('DAILY HABITS', tf);
    }

    /* Craft scores from dojo_craft_scores */
    if (byKey['dojo_craft_scores'] && byKey['dojo_craft_scores'].data_value) {
      html += _coachSection('CRAFT SCORES', byKey['dojo_craft_scores'].data_value);
    }

    /* Combat logs from dojo_phys_v1 */
    if (byKey['dojo_phys_v1'] && byKey['dojo_phys_v1'].data_value) {
      html += _coachSection('COMBAT TRAINING', byKey['dojo_phys_v1'].data_value);
    }

    panel.innerHTML = html;
    panel.style.display = 'block';
  }

  function _coachSection(title, data) {
    /* Sanitise output — data comes from DB, not user input, but still escape */
    var json = _sanitiseDisplay(JSON.stringify(data, null, 2));
    return '<div class="coach-section"><div class="coach-section-title">' +
      title + '</div><pre class="coach-pre">' + json + '</pre></div>';
  }

  function _applyCoachReadOnly() {
    /* Disable all interactive elements for coach */
    var elements = document.querySelectorAll(
      'input, textarea, select, button:not(.sync-btn-sm)'
    );
    elements.forEach(function (el) {
      el.disabled = true;
      el.style.opacity = '0.5';
      el.style.cursor  = 'not-allowed';
    });
    _showSyncStatus('info', 'Coach view — all fields are read-only');
  }

  function _showSyncStatus(type, message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var colors = { error: 'var(--red)', info: 'var(--gold)', success: 'var(--grn)' };
    toast.style.background = colors[type] || colors.info;
    /* Sanitise message before injecting as text */
    toast.textContent = message;
    toast.classList.add('on');
    setTimeout(function () { toast.classList.remove('on'); }, 3000);
  }

  /* ── UTILITIES ───────────────────────────────────────────────── */
  function _safeSetLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      _log('error', 'localStorage write failed for', key, ':', e.message);
    }
  }

  function _parseArg(data) {
    if (data === null || data === undefined) return null;
    if (typeof data === 'object') return data;
    try { return JSON.parse(data); } catch (e) { return data; }
  }

  /* Timestamps stored in localStorage for conflict resolution */
  function _getLocalTimestamp(key) {
    try {
      return parseInt(localStorage.getItem('__ts_' + key) || '0', 10);
    } catch (e) { return 0; }
  }
  function _updateLocalTimestamp(key) {
    try { localStorage.setItem('__ts_' + key, Date.now().toString()); } catch (e) {}
  }

  /* Escape HTML to prevent XSS when inserting dynamic content */
  function _sanitiseDisplay(str) {
    if (typeof str !== 'string') str = String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function _log(level, /* ...args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    var prefix = '[DOJO SYNC]';
    if (level === 'error') console.error.apply(console, [prefix].concat(args));
    else if (level === 'warn')  console.warn.apply(console, [prefix].concat(args));
    else                        console.log.apply(console, [prefix].concat(args));
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
