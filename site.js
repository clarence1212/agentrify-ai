(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* nav */
  var mb = $('.menu'), nav = $('.nav');
  if (mb && nav) mb.addEventListener('click', function () {
    var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false');
  });

  /* reveal */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* architecture explorer */
  var arch = $('#arch');
  if (arch) {
    var data = JSON.parse($('#arch-data').textContent);
    var det = $('#arch-detail');
    var show = function (k) {
      var d = data[k];
      $$('.layer', arch).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.k === k ? 'true' : 'false'); });
      det.innerHTML = '<span class="tag">' + d.tag + '</span><h3>' + d.title + '</h3><p>' + d.body + '</p><ul>' +
        d.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
    };
    $$('.layer', arch).forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.k); }); });
    show($('.layer', arch).dataset.k);
  }

  /* governed improvement simulator (illustrative, deterministic) */
  var sim = $('#sim');
  if (sim) {
    var CASES = 10000, MANUAL = 9.0; // illustrative: cases per month, manual cost per case (S$)
    var fmtS = function (n) { return 'S$' + Math.round(n).toLocaleString('en-SG'); };
    var value = function (m) { return CASES * ((m.pass / 100) * MANUAL - m.cost); };
    var versions = [{ v: 'v1.0', label: 'Baseline', pass: 82, cost: 1.40, esc: 18 }];
    var live = 0, step = 0, pending = null;
    var CANDS = [
      { title: 'Add a vendor-master lookup tool', why: 'Most failed cases lack the supplier’s registered details. Giving the agent a read-only lookup should resolve them.',
        d: { pass: 6, cost: 0.05, esc: -4 }, checks: ['Data access: read-only', 'Limits unchanged', 'Audit log on'], deleg: 'No change to authority', ok: true },
      { title: 'Route routine cases to a smaller model', why: 'Two-thirds of cases are simple matches. A smaller, cheaper model handles them; complex ones stay on the frontier model.',
        d: { pass: -1, cost: -0.55, esc: 1 }, checks: ['Model approved for this data class', 'Fallback configured', 'Audit log on'], deleg: 'No change to authority', ok: true },
      { title: 'Raise the auto-approval limit from S$5,000 to S$50,000', why: 'The agent’s optimiser found that a higher limit would clear more exceptions without escalation.',
        d: { pass: 0, cost: -0.10, esc: -9 }, checks: ['Data access: read-only', 'Limit increase requested', 'Audit log on'], deleg: 'Expands the agent’s authority', ok: false },
      { title: 'Add examples from last month’s resolved exceptions', why: 'Curated, human-reviewed examples teach the agent the patterns reviewers corrected most often.',
        d: { pass: 3, cost: 0.02, esc: -2 }, checks: ['Examples reviewed by owner', 'No personal data in examples', 'Audit log on'], deleg: 'No change to authority', ok: true }
    ];
    var logEl = $('#sim-log');
    var log = function (t) { var d = new Date(); var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      logEl.insertAdjacentHTML('afterbegin', '<div>' + hh + '  ' + t + '</div>'); };
    var cls = function (n, goodUp) { return n === 0 ? 'flat' : ((n > 0) === goodUp ? 'up' : 'down'); };
    var sgn = function (n, dp, suf) { return (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toFixed(dp) + (suf || ''); };

    var renderKpis = function () {
      var m = versions[live];
      $('#k-ver').textContent = m.v; $('#k-pass').textContent = m.pass + '%';
      $('#k-cost').textContent = 'S$' + m.cost.toFixed(2); $('#k-esc').textContent = m.esc + '%';
      $('#k-val').textContent = fmtS(value(m)) + ' / month';
      $('#vers').innerHTML = versions.map(function (x, i) {
        return '<li class="' + (i === live ? 'live' : '') + '"><span><span class="v">' + x.v + '</span>' + x.label + '</span>' +
          (i === live ? '<em>LIVE</em>' : '<button type="button" data-i="' + i + '">Roll back</button>') + '</li>';
      }).reverse().join('');
      $$('#vers button').forEach(function (b) { b.addEventListener('click', function () {
        live = +b.dataset.i; log('Rolled back to ' + versions[live].v + ' by agent owner.'); renderKpis();
      }); });
    };

    var cbox = $('#cand');
    var renderCand = function () {
      if (!pending) {
        cbox.innerHTML = step >= CANDS.length
          ? '<div class="empty"><div>No further candidates in this demonstration.<br><button class="btn g" type="button" id="sim-reset" style="margin-top:16px">Reset demo</button></div></div>'
          : '<div class="empty"><div>Run an improvement cycle to generate and test a candidate change.</div></div>';
        var r = $('#sim-reset'); if (r) r.addEventListener('click', reset);
        $('#sim-run').disabled = step >= CANDS.length;
        return;
      }
      var c = pending, base = versions[live];
      var n = { pass: base.pass + c.d.pass, cost: Math.max(0.2, +(base.cost + c.d.cost).toFixed(2)), esc: Math.max(0, base.esc + c.d.esc) };
      c.next = n;
      var dv = value(n) - value(base);
      cbox.innerHTML = '<span class="tag">Candidate ' + (step + 1) + ' of ' + CANDS.length + '</span>' +
        '<div class="ct">' + c.title + '</div><div class="cd">' + c.why + '</div>' +
        '<table class="evt"><thead><tr><th>Evaluation · 500 test cases</th><th>Live</th><th>Candidate</th><th>Change</th></tr></thead><tbody>' +
        '<tr><td>Cases resolved correctly</td><td class="d">' + base.pass + '%</td><td class="d">' + n.pass + '%</td><td class="d ' + cls(c.d.pass, true) + '">' + sgn(n.pass - base.pass, 0, ' pts') + '</td></tr>' +
        '<tr><td>Cost per case</td><td class="d">S$' + base.cost.toFixed(2) + '</td><td class="d">S$' + n.cost.toFixed(2) + '</td><td class="d ' + cls(n.cost - base.cost, false) + '">' + sgn(n.cost - base.cost, 2) + '</td></tr>' +
        '<tr><td>Escalated to people</td><td class="d">' + base.esc + '%</td><td class="d">' + n.esc + '%</td><td class="d ' + cls(n.esc - base.esc, false) + '">' + sgn(n.esc - base.esc, 0, ' pts') + '</td></tr>' +
        '<tr><td>Ledger value</td><td class="d">' + fmtS(value(base)) + '</td><td class="d">' + fmtS(value(n)) + '</td><td class="d ' + cls(dv, true) + '">' + (dv >= 0 ? '+' : '−') + fmtS(Math.abs(dv)) + '</td></tr>' +
        '</tbody></table>' +
        '<h4>Governance checks</h4><div class="checks">' +
        c.checks.map(function (k) { var bad = /increase/i.test(k); return '<span class="chk ' + (bad ? 'no' : 'ok') + '">' + (bad ? '✕ ' : '✓ ') + k + '</span>'; }).join('') +
        '<span class="chk ' + (c.ok ? 'ok' : 'no') + '">' + (c.ok ? '✓ ' : '✕ ') + 'Delegation Map: ' + c.deleg + '</span></div>' +
        (c.ok ? '' : '<div class="block"><b>Blocked.</b> An agent cannot raise its own authority, however good the numbers look. Moving a decision outward needs evidence and approval by the named owner through the Delegation Map, outside the improvement loop.</div>') +
        '<div class="btns">' + (c.ok ? '<button class="btn p" type="button" id="sim-ok">Approve and deploy</button>' : '<button class="btn p" type="button" disabled>Approve and deploy</button>') +
        '<button class="btn g" type="button" id="sim-no">' + (c.ok ? 'Reject' : 'Dismiss and refer to owner') + '</button></div>';
      var ok = $('#sim-ok'); if (ok) ok.addEventListener('click', function () {
        var nv = 'v1.' + versions.length; versions.push({ v: nv, label: c.title, pass: n.pass, cost: n.cost, esc: n.esc });
        live = versions.length - 1; log('Approved by agent owner. ' + nv + ' deployed.'); pending = null; step++; renderKpis(); renderCand();
      });
      $('#sim-no').addEventListener('click', function () {
        log(c.ok ? 'Candidate rejected by agent owner.' : 'Authority change blocked; referred to agent owner for Delegation Map review.');
        pending = null; step++; renderCand();
      });
      $('#sim-run').disabled = true;
    };

    var run = function () {
      if (pending || step >= CANDS.length) return;
      var b = $('#sim-run'); b.disabled = true; b.textContent = 'Testing candidate…';
      log('Improvement cycle started: proposing change and running evaluation suite.');
      setTimeout(function () { b.textContent = 'Run improvement cycle'; pending = CANDS[step];
        log('Evaluation complete for "' + pending.title + '".'); renderCand(); }, 900);
    };
    var reset = function () { versions = versions.slice(0, 1); live = 0; step = 0; pending = null; logEl.innerHTML = ''; log('Demo reset to baseline.'); renderKpis(); renderCand(); };
    $('#sim-run').addEventListener('click', run);
    renderKpis(); renderCand(); log('Agent v1.0 live. Owner: Finance operations lead.');
  }

  /* design partner form -> email */
  var f = $('#partner');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { return (f.elements[n] && f.elements[n].value || '').trim(); };
    var err = $('.err', f);
    if (!g('name') || !g('org') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('email'))) { err.textContent = 'Please add your name, organisation and a valid email.'; return; }
    err.textContent = '';
    var body = ['Name: ' + g('name'), 'Role: ' + g('role'), 'Organisation: ' + g('org'), 'Email: ' + g('email'),
      'Interest: ' + g('track'), 'Industry: ' + g('industry'), '', 'Use case:', g('msg')].join('\n');
    location.href = 'mailto:' + f.dataset.to + '?subject=' + encodeURIComponent('Agentrify design partner: ' + g('org')) + '&body=' + encodeURIComponent(body);
  });
})();
