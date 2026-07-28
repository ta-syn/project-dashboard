/* ============================================================
   PROJECT DASHBOARD — app.js
   All application logic: storage, routing, rendering, modals
============================================================ */
(function () {
  'use strict';

  /* ============================================================
     STORAGE & CONSTANTS
  ============================================================ */
  var STORAGE_KEY = 'projectDashboard.projects.v1';

  var STATUS = {
    active:    { label: 'Active',    cls: 'status-active' },
    paused:    { label: 'Paused',    cls: 'status-paused' },
    completed: { label: 'Completed', cls: 'status-completed' },
    archived:  { label: 'Archived',  cls: 'status-archived' }
  };

  var projects = [];
  var currentProjectId = null;
  var rowSeq = 0;
  var timestampInterval = null;

  /* ============================================================
     THEME TOGGLE
  ============================================================ */
  function isDarkActive() {
    var manual = document.documentElement.getAttribute('data-theme');
    if (manual === 'dark')  return true;
    if (manual === 'light') return false;
    // No manual override — follow system
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function updateThemeBtn() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var dark = isDarkActive();
    var sunIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    var moonIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    btn.innerHTML = dark ? sunIcon : moonIcon;
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  // Also update icon if system preference changes while page is open
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeBtn);
  }

  /* ============================================================
     PERSISTENCE
  ============================================================ */
  function loadProjects() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load projects from localStorage', e);
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage', e);
      showToast('Could not save — browser storage may be full.', true);
      return false;
    }
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function blankProject(name, description, status) {
    var now = Date.now();
    return {
      id: uid(),
      name: (name || '').trim(),
      description: (description || '').trim(),
      status: status || 'active',
      gmail: '',
      createdAt: now,
      updatedAt: now,
      supabase:    { email: '', url: '', anonKey: '' },
      github:      { repoUrl: '', mainBranch: '', account: '' },
      deployment:  { platform: '', liveUrl: '', account: '' },
      envVariables: []
    };
  }

  function findProject(id) {
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) return projects[i];
    }
    return null;
  }

  /* ============================================================
     UTILITIES
  ============================================================ */
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function relativeTime(ts) {
    var diff = Date.now() - ts;
    var sec  = Math.round(diff / 1000);
    if (sec < 10)  return 'just now';
    if (sec < 60)  return sec + 's ago';
    var min = Math.round(sec / 60);
    if (min < 60)  return min + (min === 1 ? ' minute ago' : ' minutes ago');
    var hr  = Math.round(min / 60);
    if (hr  < 24)  return hr  + (hr  === 1 ? ' hour ago'  : ' hours ago');
    var day = Math.round(hr  / 24);
    if (day < 30)  return day + (day === 1 ? ' day ago'   : ' days ago');
    var mo  = Math.round(day / 30);
    if (mo  < 12)  return mo  + (mo  === 1 ? ' month ago' : ' months ago');
    var yr  = Math.round(mo  / 12);
    return yr + (yr === 1 ? ' year ago' : ' years ago');
  }

  /* Auto-refresh relative timestamps every 60 seconds */
  function startTimestampRefresh() {
    clearInterval(timestampInterval);
    timestampInterval = setInterval(function () {
      if (currentProjectId) {
        var p = findProject(currentProjectId);
        if (p) {
          var subEl = document.getElementById('detailSub');
          if (subEl) subEl.textContent = 'Updated ' + relativeTime(p.updatedAt) + ' · Created ' + relativeTime(p.createdAt);
        }
      } else {
        var metas = document.querySelectorAll('[data-ts]');
        for (var i = 0; i < metas.length; i++) {
          metas[i].textContent = 'Updated ' + relativeTime(Number(metas[i].getAttribute('data-ts')));
        }
      }
    }, 60000);
  }

  /* ============================================================
     TOAST
  ============================================================ */
  var toastTimer = null;
  function showToast(msg, isErr) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = isErr ? 'show err' : 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 3400);
  }

  /* ============================================================
     FOCUS TRAP (modals)
  ============================================================ */
  function trapFocus(el) {
    var focusable = el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
    el.addEventListener('keydown', handler);
    return function removeTrap() { el.removeEventListener('keydown', handler); };
  }

  /* ============================================================
     HASH ROUTING
  ============================================================ */
  function pushHash(hash) {
    history.pushState(null, '', hash || '#');
  }

  window.addEventListener('popstate', function () {
    var hash = location.hash;
    if (hash && hash.indexOf('#project/') === 0) {
      var id = hash.slice('#project/'.length);
      var p  = findProject(id);
      if (p) { openProjectView(id); return; }
    }
    showDashboard(false);
  });

  /* ============================================================
     VIEW SWITCHING
  ============================================================ */
  function showDashboard(pushState) {
    currentProjectId = null;
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('brandSub').textContent = 'Manage every project in one place';
    document.title = 'Project Dashboard';
    renderTopbar();
    renderDashboard();
    startTimestampRefresh();
    window.scrollTo(0, 0);
    if (pushState !== false) pushHash('#');
  }

  function openProjectView(id) {
    var p = findProject(id);
    if (!p) return;
    currentProjectId = id;
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    document.getElementById('brandSub').textContent = 'Editing a project';
    document.title = p.name + ' — Project Dashboard';
    renderTopbar();
    renderDetail(p);
    startTimestampRefresh();
    window.scrollTo(0, 0);
  }

  function openProject(id) {
    openProjectView(id);
    pushHash('#project/' + id);
  }

  function renderTopbar() {
    var right = document.getElementById('topbarRight');
    right.innerHTML = '';
    
    var themeBtn = document.createElement('button');
    themeBtn.className = 'btn-icon theme-toggle-btn';
    themeBtn.id = 'themeToggle';
    themeBtn.title = 'Toggle dark / light mode';
    themeBtn.addEventListener('click', function () {
      var newTheme = isDarkActive() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('pdTheme', newTheme);
      updateThemeBtn();
    });
    right.appendChild(themeBtn);

    var btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.setAttribute('aria-label', 'Create a new project');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">' +
        '<line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>' +
      '</svg> New Project';
    btn.addEventListener('click', function () { openCreateModal(); });
    right.appendChild(btn);
    
    updateThemeBtn();
  }

  /* ============================================================
     DASHBOARD RENDERING
  ============================================================ */
  function computeStats() {
    var total = projects.length;
    var active = projects.filter(function (p) { return p.status === 'active'; }).length;
    var envTotal = projects.reduce(function (sum, p) {
      return sum + p.envVariables.filter(function (v) { return v.key.trim() !== ''; }).length;
    }, 0);
    var configured = projects.filter(function (p) {
      return p.supabase.url || p.github.repoUrl || p.deployment.liveUrl;
    }).length;
    return { total: total, active: active, envTotal: envTotal, configured: configured };
  }

  function renderStatsStrip() {
    var s     = computeStats();
    var strip = document.getElementById('statsStrip');
    strip.innerHTML =
      '<div class="stat-tile"><div class="n">' + s.total     + '</div><div class="l">Total projects</div></div>' +
      '<div class="stat-tile active-tile"><div class="n">' + s.active    + '</div><div class="l">Active</div></div>' +
      '<div class="stat-tile"><div class="n">' + s.envTotal  + '</div><div class="l">Env variables</div></div>' +
      '<div class="stat-tile"><div class="n">' + s.configured + '</div><div class="l">With integrations</div></div>';
  }

  function getFilteredSorted() {
    var search       = document.getElementById('searchInput').value.trim().toLowerCase();
    var statusFilter = document.getElementById('statusFilter').value;
    var sortBy       = document.getElementById('sortBy').value;

    var list = projects.slice();
    if (search) {
      list = list.filter(function (p) {
        return p.name.toLowerCase().indexOf(search) !== -1 ||
               (p.description || '').toLowerCase().indexOf(search) !== -1;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter(function (p) { return p.status === statusFilter; });
    }
    if (sortBy === 'name') {
      list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (sortBy === 'created') {
      list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    } else if (sortBy === 'status') {
      var order = { active: 0, paused: 1, completed: 2, archived: 3 };
      list.sort(function (a, b) {
        return (order[a.status] !== undefined ? order[a.status] : 9) -
               (order[b.status] !== undefined ? order[b.status] : 9);
      });
    } else {
      list.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    }
    return list;
  }

  function projectCardHtml(p) {
    var st       = STATUS[p.status] || STATUS.active;
    var badges = [];
    var svgDb    = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>';
    var svgGit   = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M6 9v6"></path><path d="M18 9v2c0 1.1-.9 2-2 2h-4"></path><path d="M6 12h4c1.1 0 2 .9 2 2v1"></path></svg>';
    var svgGlobe = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
    var svgMail  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>';
    var svgKey   = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>';

    var hasSb = p.supabase.url || p.supabase.anonKey || p.supabase.email;
    badges.push('<span class="badge ' + (hasSb ? 'badge-green' : 'badge-off') + '" aria-label="Supabase ' + (hasSb ? 'configured' : 'not configured') + '">' + svgDb + ' Supabase</span>');
    var hasGit = p.github.repoUrl || p.github.account;
    badges.push('<span class="badge ' + (hasGit ? 'badge-gray' : 'badge-off') + '" aria-label="GitHub ' + (hasGit ? 'configured' : 'not configured') + '">' + svgGit + ' GitHub</span>');
    var hasDeploy = p.deployment.liveUrl || p.deployment.platform;
    badges.push('<span class="badge ' + (hasDeploy ? 'badge-blue' : 'badge-off') + '" aria-label="Deployment ' + (hasDeploy ? 'configured' : 'not configured') + '">' + svgGlobe + ' Deploy</span>');
    if (p.gmail && p.gmail.trim() !== '') {
      badges.push('<span class="badge badge-red" aria-label="Gmail configured">' + svgMail + ' ' + escapeHtml(p.gmail.trim()) + '</span>');
    }
    var envCount = p.envVariables.length;
    if (envCount > 0) {
      badges.push('<span class="badge badge-orange" aria-label="' + envCount + ' environment variables">' + svgKey + ' ' + envCount + ' env vars</span>');
    } else {
      badges.push('<span class="badge badge-off" aria-label="0 environment variables">' + svgKey + ' 0 env vars</span>');
    }
    var chipsHtml = '<div class="pc-badges">' + badges.join('') + '</div>';

    return (
      '<article class="project-card" data-id="' + p.id + '" tabindex="0" role="button" aria-label="Open project: ' + escapeHtml(p.name) + '">' +
        '<div class="pc-top">' +
          '<div class="pc-name">' + escapeHtml(p.name || 'Untitled project') + '</div>' +
          '<span class="status-pill ' + st.cls + '" aria-label="Status: ' + st.label + '">' +
            '<span class="status-dot" aria-hidden="true"></span>' + st.label +
          '</span>' +
        '</div>' +
        '<p class="pc-desc">' + (p.description ? escapeHtml(p.description) : '<em style="color:var(--muted)">No description yet</em>') + '</p>' +
        chipsHtml +
        '<div class="pc-meta" data-ts="' + p.updatedAt + '">Updated ' + relativeTime(p.updatedAt) + '</div>' +
        '<div class="pc-actions">' +
          '<button class="btn-icon" data-action="clone"  data-id="' + p.id + '" title="Duplicate project" aria-label="Duplicate project: ' + escapeHtml(p.name) + '" type="button">⧉</button>' +
          '<button class="btn-icon" data-action="edit"   data-id="' + p.id + '" title="Edit project"      aria-label="Edit project: '      + escapeHtml(p.name) + '" type="button">✎</button>' +
          '<button class="btn-icon danger" data-action="delete" data-id="' + p.id + '" title="Delete project" aria-label="Delete project: ' + escapeHtml(p.name) + '" type="button">🗑</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderDashboard() {
    renderStatsStrip();
    var grid = document.getElementById('projectsGrid');
    var list = getFilteredSorted();

    if (projects.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<div class="es-icon">🗂️</div>' +
          '<h3>No projects yet</h3>' +
          '<p>Create your first project to start tracking Supabase, GitHub, deployment and environment variable info — saved right in this browser.</p>' +
          '<button class="btn btn-primary" id="emptyCreateBtn" aria-label="Create your first project">+ Create your first project</button>' +
        '</div>';
      document.getElementById('emptyCreateBtn').addEventListener('click', function () { openCreateModal(); });
      return;
    }

    if (list.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<div class="es-icon">🔎</div>' +
          '<h3>No projects match</h3>' +
          '<p>Try a different search term or clear the filters.</p>' +
          '<button class="btn btn-ghost" id="clearFiltersBtn">Clear filters</button>' +
        '</div>';
      document.getElementById('clearFiltersBtn').addEventListener('click', function () {
        document.getElementById('searchInput').value    = '';
        document.getElementById('statusFilter').value   = 'all';
        document.getElementById('sortBy').value         = 'updated';
        renderDashboard();
      });
      return;
    }

    grid.innerHTML = list.map(projectCardHtml).join('');

    /* Card click → open project */
    var cards = grid.querySelectorAll('.project-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('[data-action]')) return;
          openProject(card.getAttribute('data-id'));
        });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProject(card.getAttribute('data-id'));
          }
        });
      })(cards[i]);
    }

    /* Action button delegation */
    var editBtns   = grid.querySelectorAll('[data-action="edit"]');
    var deleteBtns = grid.querySelectorAll('[data-action="delete"]');
    var cloneBtns  = grid.querySelectorAll('[data-action="clone"]');

    for (var j = 0; j < editBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); openEditModal(btn.getAttribute('data-id')); });
      })(editBtns[j]);
    }
    for (var k = 0; k < deleteBtns.length; k++) {
      (function (btn) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); openDeleteConfirm(btn.getAttribute('data-id')); });
      })(deleteBtns[k]);
    }
    for (var l = 0; l < cloneBtns.length; l++) {
      (function (btn) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); cloneProject(btn.getAttribute('data-id')); });
      })(cloneBtns[l]);
    }
  }

  /* ============================================================
     CLONE PROJECT (shared between card & detail view)
  ============================================================ */
  function cloneProject(id) {
    var src = findProject(id);
    if (!src) return;
    var copy = blankProject(src.name + ' (copy)', src.description, src.status);
    copy.gmail        = src.gmail;
    copy.supabase     = Object.assign({}, src.supabase);
    copy.github       = Object.assign({}, src.github);
    copy.deployment   = Object.assign({}, src.deployment);
    copy.envVariables = src.envVariables.map(function (v) { return { id: ++rowSeq, key: v.key, value: v.value }; });
    projects.push(copy);
    persist();
    showToast('Project duplicated.');
    return copy;
  }

  /* Filter/sort listeners */
  var filterIds = ['searchInput', 'statusFilter', 'sortBy'];
  for (var fi = 0; fi < filterIds.length; fi++) {
    (function (elId) {
      var el = document.getElementById(elId);
      el.addEventListener('input',  renderDashboard);
      el.addEventListener('change', renderDashboard);
    })(filterIds[fi]);
  }

  /* ============================================================
     CREATE / EDIT MODAL
  ============================================================ */
  function openCreateModal() { openProjectModal({ mode: 'create' }); }
  function openEditModal(id) {
    var p = findProject(id);
    if (!p) return;
    openProjectModal({ mode: 'edit', project: p });
  }

  function openProjectModal(opts) {
    var isEdit     = opts.mode === 'edit';
    var p          = opts.project;
    var prevFocused = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    var modalId = 'modal-title-' + Date.now();
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="' + modalId + '">' +
        '<h3 id="' + modalId + '">' + (isEdit ? 'Edit project' : 'Create a new project') + '</h3>' +
        '<p class="modal-desc">' + (isEdit ? 'Update the basics. Full details on the project page.' : 'Give it a name to get started — you can add all the details next.') + '</p>' +
        '<label for="mName">Project name <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>' +
        '<input type="text" id="mName" maxlength="80" placeholder="e.g. Bagan Bazaar App" value="' + (isEdit ? escapeHtml(p.name) : '') + '" autocomplete="off">' +
        '<div class="field-error" id="mNameError" role="alert">Project name can\'t be empty.</div>' +
        '<label for="mDesc">Short description</label>' +
        '<textarea id="mDesc" maxlength="400" placeholder="What this project does…">' + (isEdit ? escapeHtml(p.description) : '') + '</textarea>' +
        '<label for="mStatus">Status</label>' +
        '<select id="mStatus" aria-label="Project status">' +
          '<option value="active">Active</option>' +
          '<option value="paused">Paused</option>' +
          '<option value="completed">Completed</option>' +
          '<option value="archived">Archived</option>' +
        '</select>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" id="mCancel" type="button">Cancel</button>' +
          '<button class="btn btn-primary" id="mSubmit" type="button">' + (isEdit ? 'Save changes' : 'Create project') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var nameInput    = overlay.querySelector('#mName');
    var statusSelect = overlay.querySelector('#mStatus');
    if (isEdit) statusSelect.value = p.status;
    nameInput.focus();

    var removeTrap = trapFocus(overlay.querySelector('.modal'));

    function close() {
      removeTrap();
      document.body.removeChild(overlay);
      if (prevFocused && prevFocused.focus) prevFocused.focus();
    }

    overlay.addEventListener('click',   function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    overlay.querySelector('#mCancel').addEventListener('click', close);

    overlay.querySelector('#mSubmit').addEventListener('click', function () {
      var name   = nameInput.value.trim();
      var desc   = overlay.querySelector('#mDesc').value.trim();
      var status = statusSelect.value;
      if (!name) {
        nameInput.classList.add('invalid');
        overlay.querySelector('#mNameError').classList.add('show');
        nameInput.focus();
        return;
      }
      if (isEdit) {
        p.name = name; p.description = desc; p.status = status; p.updatedAt = Date.now();
        persist(); close(); renderDashboard(); showToast('Project updated.');
      } else {
        var np = blankProject(name, desc, status);
        projects.push(np); persist(); close();
        showToast('Project created.'); openProject(np.id);
      }
    });

    nameInput.addEventListener('input', function () {
      nameInput.classList.remove('invalid');
      overlay.querySelector('#mNameError').classList.remove('show');
    });
    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') overlay.querySelector('#mSubmit').click();
    });
  }

  document.getElementById('newProjectBtn').addEventListener('click', openCreateModal);

  /* ============================================================
     DELETE CONFIRMATION MODAL
  ============================================================ */
  function openDeleteConfirm(id) {
    var p = findProject(id);
    if (!p) return;
    var prevFocused = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    var modalId = 'del-title-' + Date.now();
    overlay.innerHTML =
      '<div class="modal danger" role="dialog" aria-modal="true" aria-labelledby="' + modalId + '">' +
        '<h3 id="' + modalId + '">Delete "' + escapeHtml(p.name || 'Untitled project') + '"?</h3>' +
        '<p class="modal-desc">This permanently removes the project and all saved details — Supabase, GitHub, deployment, and environment variables. This can\'t be undone.</p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" id="delCancel" type="button">Cancel</button>' +
          '<button class="btn btn-danger" id="delConfirm" type="button">Delete project</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    var removeTrap = trapFocus(overlay.querySelector('.modal'));
    overlay.querySelector('#delConfirm').focus();

    function close() {
      removeTrap();
      document.body.removeChild(overlay);
      if (prevFocused && prevFocused.focus) prevFocused.focus();
    }

    overlay.addEventListener('click',   function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    overlay.querySelector('#delCancel').addEventListener('click', close);
    overlay.querySelector('#delConfirm').addEventListener('click', function () {
      projects = projects.filter(function (x) { return x.id !== id; });
      persist(); close();
      if (currentProjectId === id) { showDashboard(); } else { renderDashboard(); }
      showToast('Project deleted.');
    });
  }

  document.getElementById('backBtn').addEventListener('click', function () { showDashboard(); });

  document.getElementById('btnUpdateProject').addEventListener('click', function () {
    var p = findProject(currentProjectId);
    if (p && !p.name.trim()) {
      showToast('Project name is required.', true);
      document.getElementById('projName').classList.add('invalid');
      document.getElementById('projNameError').classList.add('show');
      document.getElementById('projName').focus();
      return;
    }
    showToast('Project updated successfully!');
    showDashboard();
  });

  document.getElementById('deleteProjectBtn').addEventListener('click', function () {
    if (currentProjectId) openDeleteConfirm(currentProjectId);
  });

  document.getElementById('duplicateProjectBtn').addEventListener('click', function () {
    if (!currentProjectId) return;
    var copy = cloneProject(currentProjectId);
    if (copy) {
      renderDashboard();
      renderStatsStrip();
      openProject(copy.id);
    }
  });

  /* ============================================================
     DETAIL VIEW
  ============================================================ */
  function flashSaved() {
    var el = document.getElementById('saveIndicator');
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  var debouncedSave = debounce(function () { persist(); flashSaved(); }, 500);

  function touchAndSave(p) {
    p.updatedAt = Date.now();
    var subEl = document.getElementById('detailSub');
    if (subEl) subEl.textContent = 'Updated ' + relativeTime(p.updatedAt) + ' · Created ' + relativeTime(p.createdAt);
    debouncedSave();
  }

  function bindField(elId, setVal) {
    var el = document.getElementById(elId);
    el.addEventListener('input', function () {
      var p = findProject(currentProjectId);
      if (!p) return;
      setVal(p, el.value);
      if (elId === 'projName') {
        var trimmed = el.value.trim();
        document.getElementById('detailName').textContent = trimmed || 'Untitled project';
        document.title = (trimmed || 'Untitled project') + ' — Project Dashboard';
        if (trimmed) {
          el.classList.remove('invalid');
          document.getElementById('projNameError').classList.remove('show');
        }
      }
      touchAndSave(p);
    });
  }

  function renderDetail(p) {
    document.getElementById('detailName').textContent = p.name || 'Untitled project';
    document.getElementById('detailSub').textContent  = 'Updated ' + relativeTime(p.updatedAt) + ' · Created ' + relativeTime(p.createdAt);
    var st = STATUS[p.status] || STATUS.active;
    document.getElementById('detailStatusPill').innerHTML =
      '<span class="status-pill ' + st.cls + '" aria-label="Status: ' + st.label + '">' +
        '<span class="status-dot" aria-hidden="true"></span>' + st.label +
      '</span>';

    document.getElementById('projName').value  = p.name || '';
    document.getElementById('projName').classList.remove('invalid');
    document.getElementById('projNameError').classList.remove('show');
    document.getElementById('projStatus').value = p.status || 'active';
    document.getElementById('projDesc').value  = p.description || '';
    document.getElementById('projGmail').value = p.gmail || '';

    document.getElementById('sbEmail').value  = p.supabase.email   || '';
    document.getElementById('sbUrl').value    = p.supabase.url     || '';
    document.getElementById('sbKey').value    = p.supabase.anonKey || '';
    document.getElementById('sbKey').type     = 'password';

    document.getElementById('ghRepo').value   = p.github.repoUrl    || '';
    document.getElementById('ghBranch').value = p.github.mainBranch || '';
    document.getElementById('ghOwner').value  = p.github.account    || '';

    document.getElementById('deployPlatform').value = p.deployment.platform || '';
    document.getElementById('deployUrl').value       = p.deployment.liveUrl  || '';
    document.getElementById('deployEmail').value     = p.deployment.account  || '';

    document.getElementById('statusLine').textContent = '';
    document.getElementById('statusLine').className   = 'status-line';

    renderEnvRows(p);
  }

  /* Field bindings */
  bindField('projName',    function (p, v) { p.name = v; });
  bindField('projDesc',    function (p, v) { p.description = v; });
  bindField('projGmail',   function (p, v) { p.gmail = v; });
  bindField('sbEmail',     function (p, v) { p.supabase.email = v; });
  bindField('sbUrl',       function (p, v) { p.supabase.url = v; });
  bindField('sbKey',       function (p, v) { p.supabase.anonKey = v; });
  bindField('ghRepo',      function (p, v) { p.github.repoUrl = v; });
  bindField('ghBranch',    function (p, v) { p.github.mainBranch = v; });
  bindField('ghOwner',     function (p, v) { p.github.account = v; });
  bindField('deployUrl',   function (p, v) { p.deployment.liveUrl = v; });
  bindField('deployEmail', function (p, v) { p.deployment.account = v; });

  document.getElementById('projName').addEventListener('blur', function () {
    var p = findProject(currentProjectId);
    if (!p) return;
    if (!p.name.trim()) {
      this.classList.add('invalid');
      document.getElementById('projNameError').classList.add('show');
    }
  });

  document.getElementById('projStatus').addEventListener('change', function () {
    var p = findProject(currentProjectId);
    if (!p) return;
    p.status = this.value;
    var st = STATUS[p.status] || STATUS.active;
    document.getElementById('detailStatusPill').innerHTML =
      '<span class="status-pill ' + st.cls + '" aria-label="Status: ' + st.label + '">' +
        '<span class="status-dot" aria-hidden="true"></span>' + st.label +
      '</span>';
    touchAndSave(p);
  });

  document.getElementById('deployPlatform').addEventListener('change', function () {
    var p = findProject(currentProjectId);
    if (!p) return;
    p.deployment.platform = this.value;
    touchAndSave(p);
  });

  document.getElementById('toggleKey').addEventListener('click', function () {
    var sbKey   = document.getElementById('sbKey');
    var showing = sbKey.type === 'text';
    sbKey.type  = showing ? 'password' : 'text';
    this.setAttribute('aria-label', (showing ? 'Show' : 'Hide') + ' Supabase API key');
    this.title = (showing ? 'Show' : 'Hide') + ' key';
  });

  /* ============================================================
     ENV VARIABLE ROWS
  ============================================================ */
  function renderEnvRows(p) {
    var envListEl  = document.getElementById('envList');
    var envEmptyMsg = document.getElementById('envEmptyMsg');
    envListEl.innerHTML = '';
    envEmptyMsg.style.display = p.envVariables.length ? 'none' : 'block';

    p.envVariables.forEach(function (row, idx) {
      var wrap = document.createElement('div');
      wrap.className = 'env-row';

      var keyInput = document.createElement('input');
      keyInput.type = 'text'; keyInput.className = 'env-key';
      keyInput.placeholder = 'KEY_NAME'; keyInput.value = row.key;
      keyInput.setAttribute('aria-label', 'Environment variable ' + (idx + 1) + ' key');
      keyInput.addEventListener('input', function (e) {
        row.key = e.target.value; updateEnvSummary(p);
        var cur = findProject(currentProjectId); if (cur) touchAndSave(cur);
      });

      var valInput = document.createElement('input');
      valInput.type = 'password'; valInput.className = 'env-val';
      valInput.placeholder = 'value'; valInput.value = row.value;
      valInput.setAttribute('aria-label', 'Environment variable ' + (idx + 1) + ' value');
      valInput.addEventListener('input', function (e) {
        row.value = e.target.value;
        var cur = findProject(currentProjectId); if (cur) touchAndSave(cur);
      });

      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn-icon'; toggleBtn.type = 'button';
      toggleBtn.textContent = '👁';
      toggleBtn.setAttribute('aria-label', 'Show or hide environment variable ' + (idx + 1) + ' value');
      toggleBtn.addEventListener('click', function () {
        var showing = valInput.type === 'text';
        valInput.type = showing ? 'password' : 'text';
        toggleBtn.setAttribute('aria-label', (showing ? 'Show' : 'Hide') + ' environment variable ' + (idx + 1) + ' value');
      });

      var delBtn = document.createElement('button');
      delBtn.className = 'btn-icon danger'; delBtn.type = 'button';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', 'Remove environment variable ' + (idx + 1));
      delBtn.addEventListener('click', function () {
        p.envVariables = p.envVariables.filter(function (r) { return r.id !== row.id; });
        renderEnvRows(p); updateEnvSummary(p); touchAndSave(p);
      });

      wrap.appendChild(keyInput); wrap.appendChild(valInput);
      wrap.appendChild(toggleBtn); wrap.appendChild(delBtn);
      envListEl.appendChild(wrap);
    });

    updateEnvSummary(p);
  }

  function addEnvRow(p) {
    p.envVariables.push({ id: ++rowSeq, key: '', value: '' });
    renderEnvRows(p); touchAndSave(p);
    /* Focus the new key input */
    var rows = document.getElementById('envList').querySelectorAll('.env-row');
    if (rows.length) {
      var keyInput = rows[rows.length - 1].querySelector('input');
      if (keyInput) keyInput.focus();
    }
  }

  function updateEnvSummary(p) {
    var filled = p.envVariables.filter(function (r) { return r.key.trim() !== ''; });
    var total  = p.envVariables.length;
    document.getElementById('envCount').textContent = filled.length;
    var pct = total ? Math.round((filled.length / total) * 100) : 0;
    document.getElementById('envBar').style.width = pct + '%';
    document.getElementById('envBarWrapper').setAttribute('aria-valuenow', pct);
    document.getElementById('envSummarySub').textContent = total
      ? filled.length + ' of ' + total + ' rows have a key set'
      : 'Add variables to see them tracked here.';
  }

  document.getElementById('addEnvBtn').addEventListener('click', function () {
    var p = findProject(currentProjectId); if (p) addEnvRow(p);
  });

  /* ============================================================
     EXPORT / IMPORT (single project)
  ============================================================ */
  function collectProjectData(p) {
    return {
      projectName:        p.name,
      projectDescription: p.description,
      status:             p.status,
      gmail:              p.gmail,
      supabase:           p.supabase,
      github:             p.github,
      deployment:         p.deployment,
      envVariables:       p.envVariables.map(function (r) { return { key: r.key, value: r.value }; }),
      exportedAt:         new Date().toISOString()
    };
  }

  document.getElementById('exportOneBtn').addEventListener('click', function () {
    var p = findProject(currentProjectId); if (!p) return;
    var data = collectProjectData(p);
    var name = (p.name || 'project').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
    downloadJson(data, name + '-dashboard.json');
    var line = document.getElementById('statusLine');
    line.textContent = 'Exported. Keep this file safe — it may contain your Supabase key.';
    line.className   = 'status-line ok';
  });

  document.getElementById('importBtn').addEventListener('click', function () {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
      var line = document.getElementById('statusLine');
      try {
        var data = JSON.parse(evt.target.result);
        var p    = findProject(currentProjectId); if (!p) return;
        openImportOneConfirm(p, data);
      } catch (err) {
        line.textContent = 'Could not read that file — make sure it is a JSON file exported from this page.';
        line.className   = 'status-line err';
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function openImportOneConfirm(p, data) {
    var prevFocused = document.activeElement;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    var modalId = 'io-title-' + Date.now();
    overlay.innerHTML =
      '<div class="modal danger" role="dialog" aria-modal="true" aria-labelledby="' + modalId + '">' +
        '<h3 id="' + modalId + '">Overwrite this project?</h3>' +
        '<p class="modal-desc">Importing will replace the current values of "' + escapeHtml(p.name || 'Untitled project') + '" (Supabase, GitHub, deployment, and environment variables). This can\'t be undone.</p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" id="ioCancel" type="button">Cancel</button>' +
          '<button class="btn btn-danger" id="ioConfirm" type="button">Overwrite</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    var removeTrap = trapFocus(overlay.querySelector('.modal'));
    overlay.querySelector('#ioConfirm').focus();

    function close() {
      removeTrap();
      document.body.removeChild(overlay);
      if (prevFocused && prevFocused.focus) prevFocused.focus();
    }

    overlay.addEventListener('click',   function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    overlay.querySelector('#ioCancel').addEventListener('click', close);
    overlay.querySelector('#ioConfirm').addEventListener('click', function () {
      var line = document.getElementById('statusLine');
      p.name        = data.projectName        || p.name;
      p.description = data.projectDescription || '';
      p.status      = STATUS[data.status]     ? data.status : p.status;
      p.gmail       = data.gmail              || '';
      p.supabase    = Object.assign({ email: '', url: '', anonKey: '' }, data.supabase   || {});
      p.github      = Object.assign({ repoUrl: '', mainBranch: '', account: '' },  data.github || {});
      p.deployment  = Object.assign({ platform: '', liveUrl: '', account: '' },    data.deployment || {});
      p.envVariables = (data.envVariables || []).map(function (v) { return { id: ++rowSeq, key: v.key || '', value: v.value || '' }; });
      p.updatedAt   = Date.now();
      persist(); renderDetail(p); close();
      line.textContent = 'Imported successfully.'; line.className = 'status-line ok';
      showToast('Project data imported.');
    });
  }

  /* ============================================================
     DOWNLOAD JSON — anchor appended to DOM for Firefox compatibility
  ============================================================ */
  function downloadJson(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ============================================================
     BACKUP ALL / IMPORT ALL
  ============================================================ */
  document.getElementById('exportAllBtn').addEventListener('click', function () {
    downloadJson(
      { projects: projects, exportedAt: new Date().toISOString(), version: 1 },
      'all-projects-backup.json'
    );
    var line = document.getElementById('backupStatusLine');
    line.textContent = 'All projects exported. This file may contain sensitive keys — store it safely.';
    line.className   = 'status-line ok';
  });

  document.getElementById('importAllBtn').addEventListener('click', function () {
    document.getElementById('importAllFile').click();
  });

  document.getElementById('importAllFile').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
      var line = document.getElementById('backupStatusLine');
      try {
        var data     = JSON.parse(evt.target.result);
        var incoming = Array.isArray(data) ? data : (Array.isArray(data.projects) ? data.projects : null);
        if (!incoming) throw new Error('bad format');
        openReplaceConfirm(incoming);
      } catch (err) {
        line.textContent = 'Could not read that file — make sure it is a backup exported from this page.';
        line.className   = 'status-line err';
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function openReplaceConfirm(incoming) {
    var prevFocused = document.activeElement;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    var modalId = 'ra-title-' + Date.now();
    overlay.innerHTML =
      '<div class="modal danger" role="dialog" aria-modal="true" aria-labelledby="' + modalId + '">' +
        '<h3 id="' + modalId + '">Replace all projects?</h3>' +
        '<p class="modal-desc">Importing this backup will replace all ' + Number(projects.length) + ' current project(s) with ' + Number(incoming.length) + ' project(s) from the file. This can\'t be undone.</p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" id="raCancel" type="button">Cancel</button>' +
          '<button class="btn btn-danger" id="raConfirm" type="button">Replace all</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    var removeTrap = trapFocus(overlay.querySelector('.modal'));
    overlay.querySelector('#raConfirm').focus();

    function close() {
      removeTrap();
      document.body.removeChild(overlay);
      if (prevFocused && prevFocused.focus) prevFocused.focus();
    }

    overlay.addEventListener('click',   function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    overlay.querySelector('#raCancel').addEventListener('click', close);
    overlay.querySelector('#raConfirm').addEventListener('click', function () {
      projects = incoming.map(function (raw) {
        var np = blankProject(raw.name, raw.description, STATUS[raw.status] ? raw.status : 'active');
        np.id          = raw.id          || np.id;
        np.createdAt   = raw.createdAt   || Date.now();
        np.updatedAt   = raw.updatedAt   || Date.now();
        np.supabase    = Object.assign({ email: '', url: '', anonKey: '' },            raw.supabase    || {});
        np.github      = Object.assign({ repoUrl: '', mainBranch: '', account: '' },  raw.github      || {});
        np.deployment  = Object.assign({ platform: '', liveUrl: '', account: '' },    raw.deployment  || {});
        np.envVariables = (raw.envVariables || []).map(function (v) { return { id: ++rowSeq, key: v.key || '', value: v.value || '' }; });
        return np;
      });
      persist(); close(); showDashboard(); showToast('Backup restored successfully.');
    });
  }

  /* ============================================================
     INIT — load data & handle initial hash
  ============================================================ */
  projects = loadProjects();
  renderTopbar();
  updateThemeBtn(); // sync icon with current theme

  var initHash    = location.hash;
  var initProject = null;
  if (initHash && initHash.indexOf('#project/') === 0) {
    initProject = findProject(initHash.slice('#project/'.length));
  }

  if (initProject) {
    openProjectView(initProject.id);
  } else {
    showDashboard(false);
  }

  startTimestampRefresh();

})();
