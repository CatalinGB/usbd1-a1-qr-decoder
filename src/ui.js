/* Browser UI for decoder.html / index.html. No dependencies, no network. */
(function () {
  'use strict';
  var lib = window.USBD1;
  var current = null;

  var input = document.getElementById('input');
  var decodeBtn = document.getElementById('decode');
  var pasteBtn = document.getElementById('paste');
  var clearBtn = document.getElementById('clear');
  var sampleWrap = document.getElementById('samples');
  var output = document.getElementById('output');
  var exportBar = document.getElementById('export-bar');
  var inputStatus = document.getElementById('input-status');
  var themeBtn = document.getElementById('theme');
  var downloadJsonBtn = document.getElementById('download-json');
  var downloadMdBtn = document.getElementById('download-md');
  var copyJsonBtn = document.getElementById('copy-json');
  var copyMdBtn = document.getElementById('copy-md');
  var shareLinkBtn = document.getElementById('share-link');

  var SAMPLES = [
    { label: 'Battery · EFB', value: 'https://e.dh5z.com/?d=50510126103663109505100606200000000000000000000000021' },
    { label: 'Cranking · NORMAL', value: 'https://e.dh5z.com/?d=00000000000000000000000000010603580100000000000000022' },
    { label: 'Public · Polish AGM', value: 'https://e.dh5z.com/?d=207601253061833083066003592000000000000000000000000c1' },
    { label: 'Warnings demo · 52 chars', value: '5051012610366310950510060620000000000000000000000002' }
  ];

  var ICONS = {
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
    alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.2 21h19.6L12 3Z"/><path d="M12 9v5"/><path d="M12 17.2h.01"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    chevron: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
    battery: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="2.5" y="7" width="16.5" height="10" rx="2.5"/><path d="M22 10.5v3"/><path d="M6.5 10.5v3M10 10.5v3M13.5 10.5v3"/></svg>',
    bolt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    plug: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z"/><path d="M12 17v5"/></svg>'
  };

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'style') e.setAttribute('style', v);
        else if (v === true) e.setAttribute(k, '');
        else e.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function icon(name, cls) {
    return el('span', { class: cls || '', html: ICONS[name] || '', 'aria-hidden': 'true' });
  }

  function codeLabel(field) {
    if (!field) return '—';
    if (field.known) return field.label_localized || field.label || '—';
    return field.vendor_fallback || ('Unknown code ' + field.code);
  }

  function toneForBattery(code) {
    if (code === '1') return 'good';
    if (code === '2') return 'warn';
    if (code === '3') return 'info';
    if (code === '4') return 'warn';
    if (code === '5') return 'bad';
    return 'neutral';
  }
  function toneForCranking(code) {
    if (code === '1') return 'good';
    if (code === '2' || code === '3') return 'warn';
    if (code === '0') return 'neutral';
    return 'bad';
  }
  function toneForCharging(code) {
    if (code === '1') return 'good';
    if (code === '2' || code === '3') return 'warn';
    if (code === '0') return 'neutral';
    return 'bad';
  }

  function statusOf(r) {
    if (!r.input || r.input.payload === null) return { tone: 'bad', label: 'No payload' };
    if (!r.format.supported) return { tone: 'bad', label: 'Unsupported length' };
    if (!r.ok) return { tone: 'bad', label: 'Decode error' };
    var warnings = r.issues.filter(function (i) { return i.severity === 'warning'; });
    if (warnings.length) return { tone: 'warn', label: 'Decoded with warnings' };
    return { tone: 'good', label: 'Verified layout' };
  }

  function primaryVerdict(r) {
    if (r.battery && r.battery.visible) {
      return { section: 'Battery Test', field: r.battery.verdict, tone: toneForBattery(r.battery.verdict.code) };
    }
    if (r.cranking && r.cranking.visible) {
      return { section: 'Cranking Test', field: r.cranking.verdict, tone: toneForCranking(r.cranking.verdict.code) };
    }
    if (r.charging && r.charging.visible) {
      return { section: 'Charging Test', field: r.charging.verdict, tone: toneForCharging(r.charging.verdict.code) };
    }
    return null;
  }

  function otherVerdicts(r, primary) {
    var out = [];
    if (r.cranking && r.cranking.visible && (!primary || primary.section !== 'Cranking Test')) {
      out.push({ section: 'Cranking Test', field: r.cranking.verdict, tone: toneForCranking(r.cranking.verdict.code) });
    }
    if (r.charging && r.charging.visible && (!primary || primary.section !== 'Charging Test')) {
      out.push({ section: 'Charging Test', field: r.charging.verdict, tone: toneForCharging(r.charging.verdict.code) });
    }
    return out;
  }

  function statusPill(status) {
    return el('span', { class: 'status-pill ' + status.tone }, [
      el('span', { class: 'dot' }),
      document.createTextNode(status.label)
    ]);
  }

  function metaPill(label, value) {
    if (!value || value === '—') return null;
    return el('span', { class: 'meta-pill' }, [
      el('span', { class: 'mono', text: label }),
      document.createTextNode(' ' + value)
    ]);
  }

  function hex(code) {
    return code === null || code === undefined ? 'missing' : code;
  }

  function hero(r, primary, status) {
    var tone = primary ? primary.tone : 'neutral';
    var card = el('section', { class: 'hero card tone-' + tone });
    var main = el('div', { class: 'hero-main' });
    main.appendChild(el('div', { class: 'eyebrow', text: primary ? primary.section + ' · tester-reported' : 'Report' }));
    main.appendChild(el('h2', { text: primary ? codeLabel(primary.field) : 'No test section' }));

    var meta = el('div', { class: 'hero-meta' });
    if (r.battery && r.battery.visible) {
      var t = metaPill('Technology', codeLabel(r.battery.technology));
      if (t) meta.appendChild(t);
      var rated = metaPill('Rated', r.battery.rated.display);
      if (rated) meta.appendChild(rated);
    }
    var veh = metaPill('Vehicle', r.vehicle_type.display);
    if (veh) meta.appendChild(veh);
    meta.appendChild(metaPill('Language', r.language.name));
    main.appendChild(meta);

    var side = el('div', { class: 'hero-side' });
    side.appendChild(statusPill(status));
    if (primary) side.appendChild(el('span', { class: 'hero-code', text: 'verdict code ' + hex(primary.field.code) }));
    side.appendChild(el('span', { class: 'hero-code', text: 'payload ' + r.format.actual_length + ' / ' + r.format.expected_length }));
    card.appendChild(main);
    card.appendChild(side);
    return card;
  }

  function verdictStrip(items) {
    var wrap = el('div', { class: 'verdict-strip' });
    items.forEach(function (item) {
      var tone = item.tone;
      var card = el('div', { class: 'verdict-card tone-' + tone });
      card.appendChild(icon(tone === 'good' ? 'check' : (tone === 'bad' ? 'x' : 'alert'), 'verdict-icon'));
      var copy = el('div', { class: 'verdict-copy' });
      copy.appendChild(el('span', { text: item.section }));
      copy.appendChild(el('strong', { text: codeLabel(item.field) }));
      card.appendChild(copy);
      card.appendChild(el('span', { class: 'verdict-code', text: 'code ' + hex(item.field.code) }));
      wrap.appendChild(card);
    });
    return wrap;
  }

  function splitValue(field) {
    if (!field) return { main: '—', unit: '' };
    if (field.missing) return { main: '—', unit: field.unit || '' };
    var text = String(field.display === null || field.display === undefined ? '' : field.display);
    if (!text) return { main: '—', unit: field.unit || '' };
    if (field.unit === '%' && text.charAt(text.length - 1) === '%') {
      return { main: text.slice(0, -1), unit: '%' };
    }
    if (field.unit && text.length > field.unit.length + 1 && text.slice(-(field.unit.length + 1)) === ' ' + field.unit) {
      return { main: text.slice(0, -(field.unit.length + 1)), unit: field.unit };
    }
    return { main: text, unit: '' };
  }

  function statCard(label, field, note) {
    var card = el('div', { class: 'stat-card card' });
    card.appendChild(el('span', { class: 'stat-label', text: label }));
    var v = splitValue(field);
    var strong = el('strong', { class: 'stat-value' });
    strong.appendChild(document.createTextNode(v.main));
    if (v.unit) {
      strong.appendChild(document.createTextNode(' '));
      strong.appendChild(el('small', { text: v.unit }));
    }
    card.appendChild(strong);
    var rawText = field && field.raw !== null ? 'raw ' + field.raw : 'missing';
    if (field && field.invalid && !field.missing) rawText += ' · invalid';
    card.appendChild(el('span', { class: 'stat-raw', text: rawText }));
    if (note) card.appendChild(el('div', { class: 'stat-note', text: note }));
    if (field && field.missing) card.classList.add('tone-warn');
    return card;
  }

  function gaugeCard(label, sublabel, field, toneVar) {
    var value = field && field.value !== null && !field.invalid ? Number(field.value) : null;
    var pct = value === null ? 0 : Math.max(0, Math.min(100, value));
    var display = value === null ? '—' : String(value);
    var card = el('div', { class: 'gauge-card card' });
    var gauge = el('div', { class: 'gauge', role: 'img', 'aria-label': label + ': ' + (value === null ? 'not available' : display + '%'), style: '--pct:' + pct + ';--tone:var(--' + toneVar + ')' });
    var inner = el('div', { class: 'gauge-label' });
    inner.appendChild(el('strong', { text: value === null ? '—' : display + '%' }));
    gauge.appendChild(inner);
    card.appendChild(gauge);
    var copy = el('div', { class: 'gauge-copy' });
    copy.appendChild(el('h4', { text: label }));
    copy.appendChild(el('p', { text: value === null ? 'Not available in this payload' : sublabel }));
    if (field) {
      var rawText = field.raw === null ? 'missing' : ('raw ' + field.raw);
      if (field.invalid && !field.missing) rawText += ' · invalid';
      if (value !== null && (value < 0 || value > 100)) rawText += ' · outside 0–100';
      copy.appendChild(el('span', { class: 'raw', text: rawText }));
    }
    card.appendChild(copy);
    return card;
  }

  function sectionHead(title, note) {
    return el('div', { class: 'section-head' }, [
      el('h3', { text: title }),
      el('span', { text: note || '' })
    ]);
  }

  function batterySection(r) {
    var wrap = el('section', { class: 'report-enter' });
    wrap.appendChild(sectionHead('Battery measurements', 'tester-reported values'));
    var metrics = el('div', { class: 'metrics' });
    metrics.appendChild(gaugeCard('State of health', 'SoH from the tester', r.battery.soh_percent, 'accent'));
    metrics.appendChild(gaugeCard('State of charge', 'SoC from the tester', r.battery.soc_percent, 'info'));
    wrap.appendChild(metrics);
    var stats = el('div', { class: 'stat-grid' });
    stats.appendChild(statCard('Measured current', r.battery.measured_a));
    stats.appendChild(statCard('Battery voltage', r.battery.voltage_v));
    stats.appendChild(statCard('Internal resistance', r.battery.resistance_mohm));
    var ratedNote = r.battery.standard.code === '2' ? 'JIS designation; the raw value is an index' : (r.battery.standard.code === '5' ? 'Displayed with Ah by the captured page' : null);
    stats.appendChild(statCard('Rated', r.battery.rated, ratedNote));
    wrap.appendChild(stats);
    return wrap;
  }

  function crankingSection(r) {
    var wrap = el('section', { class: 'report-enter' });
    wrap.appendChild(sectionHead('Cranking measurements', 'tester-reported values'));
    var stats = el('div', { class: 'stat-grid' });
    stats.appendChild(statCard('Cranking voltage', r.cranking.voltage_v));
    stats.appendChild(statCard('Duration', r.cranking.duration_ms));
    wrap.appendChild(stats);
    return wrap;
  }

  function chargingSection(r) {
    var wrap = el('section', { class: 'report-enter' });
    wrap.appendChild(sectionHead('Charging measurements', 'tester-reported values'));
    var stats = el('div', { class: 'stat-grid' });
    stats.appendChild(statCard('Unloaded voltage', r.charging.unloaded_v));
    stats.appendChild(statCard('Loaded voltage', r.charging.loaded_v));
    stats.appendChild(statCard('Ripple', r.charging.ripple_mv));
    wrap.appendChild(stats);
    return wrap;
  }

  function detail(label, value, code, raw) {
    var item = el('div', { class: 'detail' });
    item.appendChild(el('span', { text: label }));
    item.appendChild(el('strong', { text: value || '—' }));
    var bits = [];
    if (code !== null && code !== undefined) bits.push('code ' + code);
    if (raw !== null && raw !== undefined) bits.push('raw ' + raw);
    if (bits.length) item.appendChild(el('em', { text: bits.join(' · ') }));
    return item;
  }

  function detailsCard(r) {
    var card = el('section', { class: 'detail-card card' });
    card.appendChild(el('div', { class: 'section-head', style: 'margin:0 0 12px' }, [el('h3', { text: 'Report details' })]));
    var grid = el('div', { class: 'detail-grid' });
    if (r.battery) {
      grid.appendChild(detail('Battery technology', codeLabel(r.battery.technology), r.battery.technology.code, r.battery.technology.raw));
      grid.appendChild(detail('Rating standard', r.battery.standard.known ? r.battery.standard.label : 'Unknown', r.battery.standard.code, r.battery.standard.raw));
    }
    grid.appendChild(detail('Vehicle type', r.vehicle_type.display, r.vehicle_type.code, r.vehicle_type.raw));
    grid.appendChild(detail('Report type', r.report_type.name || 'Unknown', r.report_type.code, r.report_type.raw));
    grid.appendChild(detail('Language', r.language.name + ' (' + r.language.resolved + ')', r.language.code, r.language.raw));
    grid.appendChild(detail('Payload length', r.format.actual_length + ' / ' + r.format.expected_length, null, null));
    grid.appendChild(detail('Checksum', 'Not checked by the page', null, null));
    if (r.reserved && r.reserved.raw !== null) grid.appendChild(detail('Reserved [36,38)', r.reserved.raw, null, r.reserved.raw));
    card.appendChild(grid);
    return card;
  }

  function timeCallout(r) {
    var box = el('div', { class: 'callout' });
    box.appendChild(icon('clock', 'callout-icon'));
    var copy = el('div');
    copy.appendChild(el('strong', { text: 'TIME is not encoded in the QR payload' }));
    copy.appendChild(el('p', { text: r.display_time.explanation }));
    box.appendChild(copy);
    return box;
  }

  function issueCard(r) {
    var problems = r.issues.filter(function (i) { return i.severity !== 'info'; });
    var notes = r.issues.filter(function (i) { return i.severity === 'info'; });
    var frag = document.createDocumentFragment();
    if (problems.length) {
      var card = el('section', { class: 'detail-card card' });
      card.appendChild(el('div', { class: 'section-head', style: 'margin:0 0 12px' }, [el('h3', { text: 'Checks' })]));
      var ul = el('ul', { class: 'issues' });
      problems.forEach(function (i) {
        var li = el('li', { class: 'issue' });
        li.appendChild(el('span', { class: 'badge ' + i.severity, text: i.severity }));
        var text = el('div', { class: 'issue-text' });
        text.appendChild(document.createTextNode(i.message + ' '));
        text.appendChild(el('code', { text: i.code + (i.field ? ' · ' + i.field : '') }));
        li.appendChild(text);
        ul.appendChild(li);
      });
      card.appendChild(ul);
      frag.appendChild(card);
    }
    if (notes.length) {
      var det = el('details', { class: 'card raw-card' });
      var summary = el('summary');
      summary.appendChild(el('span', { text: 'Notes (' + notes.length + ')' }));
      summary.appendChild(el('span', { html: ICONS.chevron }));
      det.appendChild(summary);
      var body = el('div', { class: 'raw-body' });
      var list = el('ul', { class: 'issues' });
      notes.forEach(function (i) {
        var li = el('li', { class: 'issue' });
        li.appendChild(el('span', { class: 'badge info', text: 'info' }));
        var text = el('div', { class: 'issue-text' });
        text.appendChild(document.createTextNode(i.message));
        li.appendChild(text);
        list.appendChild(li);
      });
      body.appendChild(list);
      det.appendChild(body);
      frag.appendChild(det);
    }
    return frag;
  }

  function fieldMap(r) {
    return [
      ['battery_type', 'Battery technology', r.battery ? codeLabel(r.battery.technology) : '—'],
      ['rated', 'Rated', r.battery ? r.battery.rated.display : '—'],
      ['voltage', 'Voltage', r.battery ? r.battery.voltage_v.display : '—'],
      ['measured', 'Measured', r.battery ? r.battery.measured_a.display : '—'],
      ['standard', 'Standard', r.battery ? (r.battery.standard.label || 'unknown') : '—'],
      ['battery_result', 'Battery verdict', r.battery ? codeLabel(r.battery.verdict) : '—'],
      ['soc', 'SoC', r.battery ? r.battery.soc_percent.display : '—'],
      ['soh', 'SoH', r.battery ? r.battery.soh_percent.display : '—'],
      ['resistance', 'Resistance', r.battery ? r.battery.resistance_mohm.display : '—'],
      ['vehicle_type', 'Vehicle type', r.vehicle_type ? r.vehicle_type.display : '—'],
      ['cranking_voltage', 'Cranking voltage', r.cranking ? r.cranking.voltage_v.display : '—'],
      ['cranking_duration', 'Cranking duration', r.cranking ? r.cranking.duration_ms.display : '—'],
      ['cranking_result', 'Cranking verdict', r.cranking ? codeLabel(r.cranking.verdict) : '—'],
      ['reserved', 'Reserved', 'unused by the captured page'],
      ['charging_loaded', 'Charging loaded', r.charging ? r.charging.loaded_v.display : '—'],
      ['charging_unloaded', 'Charging unloaded', r.charging ? r.charging.unloaded_v.display : '—'],
      ['charging_ripple', 'Charging ripple', r.charging ? r.charging.ripple_mv.display : '—'],
      ['charging_result', 'Charging verdict', r.charging ? codeLabel(r.charging.verdict) : '—'],
      ['language', 'Language', r.language ? r.language.name + ' (' + r.language.resolved + ')' : '—'],
      ['report_type', 'Report type', r.report_type ? (r.report_type.name || 'unknown') : '—']
    ];
  }

  function rawCard(r) {
    var det = el('details', { class: 'raw-card card' });
    var summary = el('summary');
    summary.appendChild(el('span', { text: 'Raw payload & field map' }));
    summary.appendChild(el('span', { html: ICONS.chevron }));
    det.appendChild(summary);
    var body = el('div', { class: 'raw-body' });
    var toolbar = el('div', { class: 'raw-toolbar' });
    toolbar.appendChild(el('span', { text: r.format.actual_length + ' characters · UTF-16 code units · expected ' + r.format.expected_length }));
    var copyBtn = el('button', { class: 'btn btn-ghost', type: 'button', style: 'min-height:32px;padding:5px 10px;font-size:12px', text: 'Copy payload' });
    copyBtn.addEventListener('click', function () {
      copyText(r.input.payload);
      flashButton(copyBtn, 'Copied');
    });
    toolbar.appendChild(copyBtn);
    body.appendChild(toolbar);
    body.appendChild(el('pre', { class: 'payload', text: r.input.payload }));
    var table = el('table', { class: 'slices' });
    var thead = el('thead');
    thead.appendChild(el('tr', null, [
      el('th', { text: 'Slice' }),
      el('th', { text: 'Field' }),
      el('th', { text: 'Raw' }),
      el('th', { text: 'Decoded' })
    ]));
    table.appendChild(thead);
    var tbody = el('tbody');
    fieldMap(r).forEach(function (row) {
      var key = row[0];
      var range = lib.SLICES[key];
      var tr = el('tr');
      tr.appendChild(el('td', { text: '[' + range[0] + ',' + range[1] + ')' }));
      tr.appendChild(el('td', { text: row[1] }));
      var raw = r.raw_slices[key];
      tr.appendChild(el('td', { text: raw === null ? '—' : raw }));
      tr.appendChild(el('td', { text: row[2] }));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    det.appendChild(body);
    return det;
  }

  function renderFatal(r) {
    exportBar.hidden = false;
    var card = el('section', { class: 'card detail-card' });
    var head = el('div', { class: 'section-head', style: 'margin:0 0 12px' }, [el('h3', { text: 'No report payload found' })]);
    card.appendChild(head);
    var issue = r.issues && r.issues[0] ? r.issues[0].message : 'The input did not contain a d parameter.';
    card.appendChild(el('p', { text: issue, style: 'margin:0 0 8px;color:var(--ink-2)' }));
    card.appendChild(el('p', { text: 'The captured original page throws a TypeError and renders no test section when d is missing. Paste a full report URL or the raw 53-character payload.', style: 'margin:0;color:var(--muted);font-size:13px' }));
    output.appendChild(card);
  }

  function render(r) {
    current = r;
    output.innerHTML = '';
    inputStatus.textContent = r.format.actual_length + ' characters · ' + (r.format.supported ? 'supported length' : 'unsupported length');
    exportBar.hidden = false;
    if (!r.input || r.input.payload === null) {
      renderFatal(r);
      return;
    }
    var status = statusOf(r);
    var primary = primaryVerdict(r);
    var wrap = el('div', { class: 'report-enter' });
    if (!r.format.supported) {
      var banner = el('div', { class: 'callout', style: 'background:var(--bad-soft);border-color:color-mix(in srgb, var(--bad) 25%, var(--line));' });
      banner.appendChild(el('span', { class: 'callout-icon', style: 'color:var(--bad)', html: ICONS.alert, 'aria-hidden': 'true' }));
      var bcopy = el('div');
      bcopy.appendChild(el('strong', { text: 'Unsupported payload length: ' + r.format.actual_length + ' (expected ' + r.format.expected_length + ')' }));
      bcopy.appendChild(el('p', { text: 'The values below are a best-effort decode using the captured layout. Do not treat them as verified for this firmware.' }));
      banner.appendChild(bcopy);
      wrap.appendChild(banner);
    }
    wrap.appendChild(hero(r, primary, status));
    var extra = otherVerdicts(r, primary);
    if (extra.length) wrap.appendChild(verdictStrip(extra));
    if (r.battery && r.battery.visible) wrap.appendChild(batterySection(r));
    if (r.cranking && r.cranking.visible) wrap.appendChild(crankingSection(r));
    if (r.charging && r.charging.visible) wrap.appendChild(chargingSection(r));
    wrap.appendChild(detailsCard(r));
    wrap.appendChild(timeCallout(r));
    wrap.appendChild(issueCard(r));
    wrap.appendChild(rawCard(r));
    output.appendChild(wrap);
  }

  function decodeNow() {
    var text = input.value.trim();
    if (!text) {
      current = null;
      output.innerHTML = '';
      var empty = el('section', { class: 'card empty', id: 'empty-state' });
      empty.appendChild(el('div', { class: 'glyph', text: '⌁' }));
      empty.appendChild(el('strong', { text: 'No report decoded yet' }));
      empty.appendChild(el('p', { text: 'Paste a QR report link above, or try one of the samples.' }));
      output.appendChild(empty);
      exportBar.hidden = true;
      inputStatus.textContent = 'Waiting for a report…';
      return;
    }
    try {
      render(lib.decode(text));
    } catch (e) {
      current = null;
      output.innerHTML = '';
      var card = el('section', { class: 'card detail-card' });
      card.appendChild(el('h3', { text: 'Decoder error', style: 'margin:0 0 8px' }));
      card.appendChild(el('p', { text: e && e.message ? e.message : String(e) }));
      output.appendChild(card);
      exportBar.hidden = true;
      inputStatus.textContent = 'Decoder error';
    }
  }

  function updateInputStatus() {
    var text = input.value.trim();
    if (!text) { inputStatus.textContent = 'Waiting for a report…'; return; }
    if (/^https?:\/\//i.test(text)) {
      inputStatus.textContent = 'URL detected · ' + text.length + ' characters';
    } else if (/d=/.test(text)) {
      inputStatus.textContent = 'Query detected · ' + text.length + ' characters';
    } else {
      inputStatus.textContent = 'Payload · ' + text.length + ' characters';
    }
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function safeName() {
    var p = current && current.input && current.input.payload ? current.input.payload.slice(0, 12) : 'report';
    return 'usbd1-report-' + p;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  function flashButton(btn, label) {
    if (!btn) return;
    var old = btn.textContent;
    btn.textContent = label;
    setTimeout(function () { btn.textContent = old; }, 1400);
  }

  function shareLink() {
    if (!current || !current.input || !current.input.payload) return null;
    var base;
    if (location.protocol === 'file:') {
      base = location.href.split('?')[0].split('#')[0];
    } else {
      base = location.origin + location.pathname;
    }
    return base + '?d=' + encodeURIComponent(current.input.payload);
  }

  function currentTheme() {
    var stored = document.documentElement.dataset.theme;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('usbd1-theme', theme); } catch (e) {}
    themeBtn.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
    themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeBtn.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Wire up
  decodeBtn.addEventListener('click', decodeNow);
  input.addEventListener('input', updateInputStatus);
  input.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') decodeNow();
  });
  input.addEventListener('paste', function () {
    setTimeout(decodeNow, 0);
  });
  pasteBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        if (text) { input.value = text; decodeNow(); }
        else { input.focus(); }
      }).catch(function () {
        input.focus();
        inputStatus.textContent = 'Press Ctrl/Cmd+V to paste';
      });
    } else {
      input.focus();
      inputStatus.textContent = 'Press Ctrl/Cmd+V to paste';
    }
  });
  clearBtn.addEventListener('click', function () {
    input.value = '';
    current = null;
    decodeNow();
    input.focus();
  });
  SAMPLES.forEach(function (s) {
    var b = el('button', { class: 'sample', type: 'button', text: s.label });
    b.addEventListener('click', function () {
      input.value = s.value;
      decodeNow();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    sampleWrap.appendChild(b);
  });
  downloadJsonBtn.addEventListener('click', function () {
    if (current) download(safeName() + '.json', JSON.stringify(current, null, 2), 'application/json');
  });
  downloadMdBtn.addEventListener('click', function () {
    if (current) download(safeName() + '.md', lib.toMarkdown(current), 'text/markdown');
  });
  copyJsonBtn.addEventListener('click', function () {
    if (current) { copyText(JSON.stringify(current, null, 2)); flashButton(copyJsonBtn, 'Copied'); }
  });
  copyMdBtn.addEventListener('click', function () {
    if (current) { copyText(lib.toMarkdown(current)); flashButton(copyMdBtn, 'Copied'); }
  });
  shareLinkBtn.addEventListener('click', function () {
    var url = shareLink();
    if (url) { copyText(url); flashButton(shareLinkBtn, 'Link copied'); }
  });
  themeBtn.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  // Initial theme icon
  applyTheme(currentTheme());

  // Auto-fill from ?d= or #d= / #?d=
  var auto = '';
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('d')) auto = window.location.search;
    else if (window.location.hash) {
      var h = window.location.hash.replace(/^#/, '');
      if (h.indexOf('d=') >= 0) auto = h.indexOf('?') === 0 ? h : '?' + h;
    }
  } catch (e) {}
  if (auto) {
    input.value = auto;
    decodeNow();
  } else {
    input.focus();
    updateInputStatus();
  }
})();
