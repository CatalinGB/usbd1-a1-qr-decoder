/*
 * USBD1 A1 QR report decoder
 *
 * Independent, clean-room-style reimplementation of the report format that the
 * publicly served e.dh5z.com report page (captured 2026-11-06) parses from the
 * `d` query parameter. No vendor source code is included or required.
 *
 * Format facts and their evidence are documented in FORMAT.md and
 * INVESTIGATION.md. The parser deliberately mirrors the captured page's
 * JavaScript semantics (including parseInt quirks and missing-value display)
 * and additionally reports every place where the input is not a clean,
 * 53-character report.
 *
 * License: MIT (see LICENSE). Label strings are short functional UI labels
 * observed in the captured page; see NOTICE.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./locales.js'));
  } else {
    root.USBD1 = factory(root.USBD1_LOCALES);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LOCALES) {
  'use strict';

  var FORMAT_ID = 'usbd1-a1.dh5z.webapp-2024-11-29';
  var EXPECTED_LENGTH = 53;

  var SLICES = {
    battery_type: [0, 1],
    rated: [1, 5],
    voltage: [5, 9],
    measured: [9, 13],
    standard: [13, 14],
    battery_result: [14, 15],
    soc: [15, 18],
    soh: [18, 21],
    resistance: [21, 26],
    vehicle_type: [26, 27],
    cranking_voltage: [27, 31],
    cranking_duration: [31, 35],
    cranking_result: [35, 36],
    reserved: [36, 38],
    charging_unloaded: [42, 46],
    charging_loaded: [38, 42],
    charging_ripple: [46, 50],
    charging_result: [50, 51],
    language: [51, 52],
    report_type: [52, 53]
  };

  var STANDARDS = {
    '0': 'CCA', '1': 'DIN', '2': 'JIS', '3': 'EN', '4': 'IEC',
    '5': 'GB', '6': 'SAE', '7': 'MCA', '8': 'BCI', '9': 'CA'
  };

  // Language codes are single case-sensitive characters; the captured page
  // maps 1-9 and a-j, with every other value falling back to English.
  var LANGUAGES = {
    '1': 'de', '2': 'en', '3': 'es', '4': 'fr', '5': 'it', '6': 'nl',
    '7': 'zh', '8': 'jp', '9': 'ko', 'a': 'ru', 'b': 'pt', 'c': 'pl',
    'd': 'fi', 'e': 'gr', 'f': 'se', 'g': 'cz', 'h': 'dk', 'i': 'bg', 'j': 'hr'
  };

  var LANGUAGE_NAMES = {
    en: 'English', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian',
    nl: 'Dutch', zh: 'Chinese', jp: 'Japanese', ko: 'Korean', ru: 'Russian',
    pt: 'Portuguese', pl: 'Polish', fi: 'Finnish', gr: 'Greek', se: 'Swedish',
    cz: 'Czech', dk: 'Danish', bg: 'Bulgarian', hr: 'Croatian'
  };

  // JIS battery-size designations, indexed by the numeric `rated` value when
  // the standard code is 2 (JIS). Captured verbatim as a factual lookup table.
  var JIS_VALUES = [
    '26A17', '26A19', '30A19', '34A19', '26B17', '28B17', '28B19', '34B17',
    '34B19', '36B20', '38B19', '38B20', '40B19', '42B19', '44B19', '44B20',
    '46B24', '50B24', '55B24', '60B24', '65B24', '32C24', '48D26', '50D20',
    '55D23', '55D26', '65D23', '65D26', '65D31', '70D23', '75D23', '75D26',
    '75D31', '80D23', '80D26', '85D23', '85D26', '90D26', '95D31', '105D31',
    '110D26', '115D31', '95E41', '100E41', '105E41', '110E41', '115E41',
    '120E41', '130E41', '115F51', '130F51', '145F51', '150F51', '170F51',
    '145G51', '155G51', '165G51', '180G51', '195G51', '190H52', '210H52',
    '225H52', '245H52', 'NS40Z', 'NS50Z', 'NS60Z', 'NS70Z', 'N100Z', 'N120Z',
    'N150Z', 'N200Z'
  ];

  var REPORT_TYPES = {
    '1': { name: 'Battery Test', sections: ['battery'] },
    '2': { name: 'Cranking Test', sections: ['cranking'] },
    '3': { name: 'Charging Test', sections: ['charging'] },
    '4': { name: 'All tests', sections: ['battery', 'cranking', 'charging'] }
  };

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function sliceRaw(payload, range) {
    var a = range[0], b = range[1];
    if (payload === null || payload === undefined || payload.length <= a) return null;
    return payload.slice(a, Math.min(b, payload.length));
  }

  function sliceComplete(payload, range) {
    return payload !== null && payload !== undefined && payload.length >= range[1];
  }

  function charAtOrNull(payload, index) {
    if (payload === null || payload === undefined || payload.length <= index) return null;
    return payload.charAt(index);
  }

  // The captured page calls parseInt() with no radix on the concatenated
  // characters, so "0x..." is hexadecimal, leading whitespace is skipped,
  // a sign is accepted, and trailing characters are ignored.
  function parseIntCompat(raw) {
    if (raw === null || raw === undefined) return NaN;
    return parseInt(raw); // intentionally no radix
  }

  function numberDisplay(value) {
    return String(value);
  }

  function safeDecode(value) {
    if (value === null) return null;
    try { return decodeURIComponent(value); } catch (e) { return value; }
  }

  // The original page parses the query itself: percent-decoding only, '+' is
  // left alone (it is not converted to a space). Mirror that here.
  function parseQueryString(qs) {
    var out = [];
    var s = String(qs || '').replace(/^\?/, '');
    if (!s) return out;
    var parts = s.split('&');
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var eq = parts[i].indexOf('=');
      var k = eq < 0 ? parts[i] : parts[i].slice(0, eq);
      var v = eq < 0 ? null : parts[i].slice(eq + 1);
      out.push([safeDecode(k), safeDecode(v)]);
    }
    return out;
  }

  function redactUrl(text) {
    return String(text || '').replace(/([?&]u=)[^&#]*/g, '$1[redacted]');
  }

  function parseInput(input) {
    var text = String(input === null || input === undefined ? '' : input).trim();
    if (!text) {
      return {
        kind: 'payload', raw: '', url: null, payload: null,
        d_count: 0, has_u: false, query_keys: []
      };
    }
    var qIndex = text.indexOf('?');
    var hashIndex = qIndex >= 0 ? text.indexOf('#', qIndex) : -1;
    var hasQuery = qIndex >= 0;
    var qs = hasQuery ? text.slice(qIndex + 1, hashIndex < 0 ? undefined : hashIndex) : (/^d=/.test(text) ? text : '');
    var pairs = (hasQuery || /^d=/.test(text)) ? parseQueryString(qs) : [];
    var dValues = [], keys = [], hasU = false;
    for (var i = 0; i < pairs.length; i++) {
      keys.push(pairs[i][0]);
      if (pairs[i][0] === 'd') dValues.push(pairs[i][1]);
      if (pairs[i][0] === 'u') hasU = true;
    }
    var isUrl = /^https?:\/\//i.test(text);
    var queryLike = hasQuery || /^d=/.test(text);
    if (isUrl && !queryLike) {
      return {
        kind: 'url', raw: text, url: redactUrl(text), payload: null,
        d_count: 0, has_u: false, query_keys: []
      };
    }
    if (queryLike && (isUrl || /^[?&]/.test(text) || dValues.length || /^d=/.test(text))) {
      return {
        kind: isUrl ? 'url' : 'query',
        raw: text,
        url: isUrl ? redactUrl(text) : null,
        payload: dValues.length ? dValues[0] : null,
        d_count: dValues.length,
        has_u: hasU,
        query_keys: keys
      };
    }
    return {
      kind: 'payload',
      raw: text,
      url: null,
      payload: text,
      d_count: 0,
      has_u: false,
      query_keys: []
    };
  }

  function issue(severity, code, field, message) {
    return { severity: severity, code: code, field: field || null, message: message };
  }

  function codeField(payload, range, map, locale, fieldName, issues, fallbackPrefix) {
    var raw = sliceRaw(payload, range);
    var missing = !sliceComplete(payload, range);
    var known = raw !== null && has(map, raw);
    if (missing) {
      issues.push(issue('error', 'truncated_field', fieldName,
        'Field ' + fieldName + ' is not fully present in this payload.'));
    } else if (!known) {
      issues.push(issue('warning', 'unknown_code', fieldName,
        'Code "' + raw + '" is not present in the captured ' + fallbackPrefix + ' table.'));
    }
    return {
      code: raw,
      raw: raw,
      known: known,
      missing: missing,
      label: known ? map[raw] : null,
      label_localized: known ? ((LOCALES[locale] && has(LOCALES[locale], fallbackPrefix) && LOCALES[locale][fallbackPrefix][raw]) || map[raw]) : null,
      vendor_fallback: known ? null : (fallbackPrefix === 'battery_type' ? 'batteryTest.type_' + raw :
        fallbackPrefix === 'battery_result' ? 'batteryTest.result_' + raw :
        fallbackPrefix === 'cranking_result' ? 'crankingTest.cranking_' + raw :
        fallbackPrefix === 'charging_result' ? 'chargingTest.charging_' + raw :
        fallbackPrefix === 'vehicle_type' ? 'carType_' + raw : null)
    };
  }

  function numericField(payload, range, divisor, unit, fieldName, issues) {
    var raw = sliceRaw(payload, range);
    var complete = sliceComplete(payload, range);
    var parsed = parseIntCompat(raw);
    var invalid = Number.isNaN(parsed);
    var value = invalid ? null : (divisor ? parsed / divisor : parsed);
    var decimal = raw !== null && /^[0-9]+$/.test(raw);
    if (!complete) {
      issues.push(issue('error', 'truncated_field', fieldName,
        'Field ' + fieldName + ' is not fully present in this payload.'));
    } else if (!decimal) {
      issues.push(issue('warning', 'non_decimal_numeric', fieldName,
        'Field ' + fieldName + ' is not plain decimal ("' + raw + '"); the captured page uses parseInt(), so the value shown here follows its JavaScript conversion.'));
    }
    if (complete && invalid) {
      issues.push(issue('warning', 'invalid_number', fieldName,
        'Field ' + fieldName + ' ("' + raw + '") converts to NaN in the captured page.'));
    }
    return {
      raw: raw,
      raw_complete: complete,
      value: value,
      invalid: invalid,
      missing: !complete,
      decimal: decimal,
      parse: 'js-parseInt',
      display: (invalid ? 'NaN' : numberDisplay(value)) + (unit ? ' ' + unit : ''),
      unit: unit || null
    };
  }

  function percentField(payload, range, fieldName, issues) {
    var f = numericField(payload, range, 0, '', fieldName, issues);
    f.display = f.invalid ? 'NaN%' : numberDisplay(f.value) + '%';
    f.unit = '%';
    return f;
  }

  function decode(input) {
    var parsed = parseInput(input);
    var issues = [];
    var payload = parsed.payload;

    if (payload === null) {
      issues.push(issue('error', 'missing_d', 'd',
        'No d parameter was found. The captured page throws a TypeError and renders no report section when d is absent.'));
      return emptyResult(parsed, issues);
    }

    if (parsed.d_count > 1) {
      issues.push(issue('warning', 'duplicate_d', 'd',
        'The input contains ' + parsed.d_count + ' d parameters. The captured page receives an array and throws; this decoder uses the first value.'));
    }
    if (parsed.has_u) {
      issues.push(issue('info', 'u_parameter_ignored', 'u',
        'A u parameter is present. It is not part of the QR payload; it carries an opaque display-date value and is ignored by this decoder.'));
    }

    var lengthOk = payload.length === EXPECTED_LENGTH;
    if (!lengthOk) {
      issues.push(issue('error', 'unsupported_length', 'payload',
        'Payload length is ' + payload.length + '; the captured renderer expects ' + EXPECTED_LENGTH + ' characters. Best-effort decode follows, but this is not a verified report layout.'));
      if (payload.length > EXPECTED_LENGTH) {
        issues.push(issue('info', 'trailing_characters', 'payload',
          'Characters after position ' + EXPECTED_LENGTH + ' are ignored by the captured renderer.'));
      }
    }

    var langRaw = charAtOrNull(payload, 51);
    var resolved = langRaw !== null && has(LANGUAGES, langRaw) ? LANGUAGES[langRaw] : 'en';
    if (langRaw !== null && !has(LANGUAGES, langRaw)) {
      issues.push(issue('warning', 'unknown_language', 'language',
        'Language code "' + langRaw + '" is not in the captured table; the page falls back to English.'));
    }
    if (langRaw === null) {
      issues.push(issue('error', 'truncated_field', 'language',
        'Language code is missing; the page falls back to English.'));
    }

    var typeRaw = charAtOrNull(payload, 52);
    var typeKnown = typeRaw !== null && has(REPORT_TYPES, typeRaw);
    if (typeRaw !== null && !typeKnown) {
      issues.push(issue('warning', 'unknown_report_type', 'report_type',
        'Report type code "' + typeRaw + '" is not in the captured table; the page renders no test section.'));
    }
    if (typeRaw === null) {
      issues.push(issue('error', 'truncated_field', 'report_type',
        'Report type code is missing; the page renders no test section.'));
    }

    var battery = {
      visible: typeKnown && REPORT_TYPES[typeRaw].sections.indexOf('battery') >= 0,
      technology: codeField(payload, SLICES.battery_type, LOCALES.en.battery_type, resolved, 'battery.technology', issues, 'battery_type'),
      standard: codeField(payload, SLICES.standard, STANDARDS, resolved, 'battery.standard', issues, 'standard'),
      verdict: codeField(payload, SLICES.battery_result, LOCALES.en.battery_result, resolved, 'battery.verdict', issues, 'battery_result'),
      soc_percent: percentField(payload, SLICES.soc, 'battery.soc', issues),
      soh_percent: percentField(payload, SLICES.soh, 'battery.soh', issues),
      measured_a: numericField(payload, SLICES.measured, 0, 'A', 'battery.measured', issues),
      voltage_v: numericField(payload, SLICES.voltage, 100, 'V', 'battery.voltage', issues),
      resistance_mohm: numericField(payload, SLICES.resistance, 100, 'mΩ', 'battery.resistance', issues),
      rated: null
    };

    // RATED is display-dependent: JIS uses a designation table and no unit;
    // GB is shown with Ah; every other/unknown standard is shown with A.
    var ratedRaw = sliceRaw(payload, SLICES.rated);
    var ratedComplete = sliceComplete(payload, SLICES.rated);
    var ratedParsed = parseIntCompat(ratedRaw);
    var ratedInvalid = Number.isNaN(ratedParsed);
    var standardCode = battery.standard.code;
    var ratedUnit = standardCode === '2' ? null : (standardCode === '5' ? 'Ah' : 'A');
    var jisDesignation = null;
    var ratedDisplay;
    if (standardCode === '2') {
      if (!ratedInvalid && ratedParsed >= 0 && ratedParsed < JIS_VALUES.length) {
        jisDesignation = JIS_VALUES[ratedParsed];
        ratedDisplay = jisDesignation;
      } else {
        ratedDisplay = '';
        issues.push(issue('warning', 'jis_index_out_of_range', 'battery.rated',
          'JIS index ' + (ratedInvalid ? 'NaN' : ratedParsed) + ' has no designation in the captured table; the page renders RATED blank.'));
      }
    } else {
      ratedDisplay = numberDisplay(ratedParsed) + ' ' + ratedUnit;
    }
    battery.rated = {
      raw: ratedRaw,
      raw_complete: ratedComplete,
      value: ratedInvalid ? null : ratedParsed,
      invalid: ratedInvalid,
      missing: !ratedComplete,
      decimal: ratedRaw !== null && /^[0-9]+$/.test(ratedRaw),
      parse: 'js-parseInt',
      unit: ratedUnit,
      jis_designation: jisDesignation,
      display: ratedDisplay
    };
    if (!ratedComplete) {
      issues.push(issue('error', 'truncated_field', 'battery.rated',
        'Field battery.rated is not fully present in this payload.'));
    }
    if (ratedComplete && ratedRaw !== null && !/^[0-9]+$/.test(ratedRaw)) {
      issues.push(issue('warning', 'non_decimal_numeric', 'battery.rated',
        'Field battery.rated is not plain decimal ("' + ratedRaw + '"); the captured page uses parseInt().'));
    }
    if (ratedComplete && ratedInvalid) {
      issues.push(issue('warning', 'invalid_number', 'battery.rated',
        'Field battery.rated ("' + ratedRaw + '") converts to NaN in the captured page.'));
    }

    var cranking = {
      visible: typeKnown && REPORT_TYPES[typeRaw].sections.indexOf('cranking') >= 0,
      verdict: codeField(payload, SLICES.cranking_result, LOCALES.en.cranking_result, resolved, 'cranking.verdict', issues, 'cranking_result'),
      voltage_v: numericField(payload, SLICES.cranking_voltage, 100, 'V', 'cranking.voltage', issues),
      duration_ms: numericField(payload, SLICES.cranking_duration, 0, 'ms', 'cranking.duration', issues)
    };

    var charging = {
      visible: typeKnown && REPORT_TYPES[typeRaw].sections.indexOf('charging') >= 0,
      verdict: codeField(payload, SLICES.charging_result, LOCALES.en.charging_result, resolved, 'charging.verdict', issues, 'charging_result'),
      unloaded_v: numericField(payload, SLICES.charging_unloaded, 100, 'V', 'charging.unloaded', issues),
      loaded_v: numericField(payload, SLICES.charging_loaded, 100, 'V', 'charging.loaded', issues),
      ripple_mv: numericField(payload, SLICES.charging_ripple, 0, 'mV', 'charging.ripple', issues)
    };

    var vehicle = codeField(payload, SLICES.vehicle_type, LOCALES.en.vehicle_type, resolved, 'vehicle_type', issues, 'vehicle_type');
    vehicle.display = vehicle.known ? (vehicle.label_localized || vehicle.label) : (vehicle.missing ? '' : 'carType_' + vehicle.code);

    var reservedRaw = sliceRaw(payload, SLICES.reserved);
    var reservedComplete = sliceComplete(payload, SLICES.reserved);
    if (!reservedComplete) {
      issues.push(issue('error', 'truncated_field', 'reserved',
        'Reserved slice [36,38) is not fully present.'));
    } else if (reservedRaw !== '00') {
      issues.push(issue('info', 'reserved_nonzero', 'reserved',
        'Reserved slice [36,38) is "' + reservedRaw + '" instead of "00". The captured renderer never reads it; its meaning is unknown.'));
    }

    issues.push(issue('info', 'timestamp_not_encoded', 'time',
      'The d payload contains no date or time. The captured page displays the current browser-local time at page load (or a user-edited date carried in u), so TIME is not the measurement time.'));
    issues.push(issue('info', 'verdict_reported_not_computed', 'verdict',
      'Verdict labels are tester-reported codes decoded from the payload. The tester diagnostic algorithm is not reconstructed.'));
    issues.push(issue('info', 'no_checksum', 'payload',
      'The captured renderer validates no checksum and no payload length. Presence or absence of a tester-side checksum is unknown.'));

    var reportType = {
      code: typeRaw,
      raw: typeRaw,
      known: typeKnown,
      name: typeKnown ? REPORT_TYPES[typeRaw].name : null,
      sections: typeKnown ? REPORT_TYPES[typeRaw].sections.slice() : [],
      vendor_display: typeKnown ? REPORT_TYPES[typeRaw].name : null
    };

    var lang = {
      code: langRaw,
      raw: langRaw,
      known: langRaw !== null && has(LANGUAGES, langRaw),
      resolved: resolved,
      name: LANGUAGE_NAMES[resolved] || resolved,
      available_in_selector: ['en', 'de', 'fr', 'pl', 'it', 'gr', 'pt', 'fi', 'se', 'cz', 'dk', 'bg', 'hr', 'es'].indexOf(resolved) >= 0
    };

    return {
      decoder: {
        name: 'usbd1-qr-decoder',
        version: '1.0.0',
        format_id: FORMAT_ID,
        parse_mode: 'js-parseInt',
        behavior_verified: true
      },
      input: {
        kind: parsed.kind,
        raw: parsed.raw,
        url: parsed.url,
        payload: payload,
        payload_length: payload.length,
        d_count: parsed.d_count,
        has_u: parsed.has_u,
        query_keys: parsed.query_keys
      },
      format: {
        id: FORMAT_ID,
        expected_length: EXPECTED_LENGTH,
        actual_length: payload.length,
        length_ok: lengthOk,
        supported: lengthOk,
        checksum: null,
        checksum_status: 'none-in-captured-renderer'
      },
      ok: !issues.some(function (i) { return i.severity === 'error'; }),
      report_type: reportType,
      language: lang,
      battery: battery,
      cranking: cranking,
      charging: charging,
      vehicle_type: vehicle,
      reserved: {
        raw: reservedRaw,
        complete: reservedComplete,
        note: 'Not read by the captured renderer; semantics unknown.'
      },
      display_time: {
        encoded_in_payload: false,
        value: null,
        source: 'not-available',
        explanation: 'The captured page sets TIME from new Date() in the browser at page load, or from an opaque u query parameter. Neither is part of the QR payload.'
      },
      raw_slices: rawSlices(payload),
      issues: issues
    };
  }

  function rawSlices(payload) {
    var out = {};
    for (var k in SLICES) if (has(SLICES, k)) out[k] = sliceRaw(payload, SLICES[k]);
    return out;
  }

  function emptyResult(parsed, issues) {
    return {
      decoder: { name: 'usbd1-qr-decoder', version: '1.0.0', format_id: FORMAT_ID, parse_mode: 'js-parseInt', behavior_verified: true },
      input: {
        kind: parsed.kind, raw: parsed.raw, url: parsed.url, payload: null,
        payload_length: 0, d_count: parsed.d_count, has_u: parsed.has_u, query_keys: parsed.query_keys
      },
      format: { id: FORMAT_ID, expected_length: EXPECTED_LENGTH, actual_length: 0, length_ok: false, supported: false, checksum: null, checksum_status: 'none-in-captured-renderer' },
      ok: false,
      report_type: { code: null, raw: null, known: false, name: null, sections: [], vendor_display: null },
      language: { code: null, raw: null, known: false, resolved: 'en', name: 'English', available_in_selector: true },
      battery: null, cranking: null, charging: null, vehicle_type: null,
      reserved: { raw: null, complete: false, note: 'Not read by the captured renderer; semantics unknown.' },
      display_time: { encoded_in_payload: false, value: null, source: 'not-available', explanation: 'No payload was supplied.' },
      raw_slices: rawSlices(null),
      issues: issues
    };
  }

  function toRows(result) {
    if (!result || !result.battery) return [];
    var rows = [];
    var lang = result.language.resolved;
    function add(group, label, field, code, note) {
      rows.push({ group: group, label: label, value: field ? field.display : '', raw: field ? field.raw : null, code: code || null, note: note || null });
    }
    function codeDisplay(f) {
      if (!f) return '';
      if (f.known) return f.label_localized || f.label || '';
      if (f.vendor_fallback) return f.vendor_fallback;
      return f.label || '';
    }
    if (result.battery.visible) {
      add('Battery Test', 'Battery technology', { display: codeDisplay(result.battery.technology), raw: result.battery.technology.raw }, result.battery.technology.code);
      add('Battery Test', 'Verdict (tester-reported)', { display: codeDisplay(result.battery.verdict), raw: result.battery.verdict.raw }, result.battery.verdict.code);
      add('Battery Test', 'SoH', result.battery.soh_percent);
      add('Battery Test', 'SoC', result.battery.soc_percent);
      add('Battery Test', 'Measured', result.battery.measured_a);
      add('Battery Test', 'Voltage', result.battery.voltage_v);
      add('Battery Test', 'Standard', { display: result.battery.standard.label || '', raw: result.battery.standard.raw }, result.battery.standard.code);      add('Battery Test', 'Rated', result.battery.rated);
      add('Battery Test', 'Resistance', result.battery.resistance_mohm);
    }
    if (result.cranking.visible) {
      add('Cranking Test', 'Verdict (tester-reported)', { display: codeDisplay(result.cranking.verdict), raw: result.cranking.verdict.raw }, result.cranking.verdict.code);
      add('Cranking Test', 'Cranking voltage', result.cranking.voltage_v);
      add('Cranking Test', 'Duration', result.cranking.duration_ms);
    }
    if (result.charging.visible) {
      add('Charging Test', 'Verdict (tester-reported)', { display: codeDisplay(result.charging.verdict), raw: result.charging.verdict.raw }, result.charging.verdict.code);
      add('Charging Test', 'Unloaded', result.charging.unloaded_v);
      add('Charging Test', 'Loaded', result.charging.loaded_v);
      add('Charging Test', 'Ripple', result.charging.ripple_mv);
    }
    add('Report', 'Vehicle type', { display: result.vehicle_type.display, raw: result.vehicle_type.raw }, result.vehicle_type.code);
    rows.push({ group: 'Report', label: 'Report type', value: result.report_type.name || 'Unknown', raw: result.report_type.code, code: result.report_type.code, note: null });
    rows.push({ group: 'Report', label: 'Language', value: result.language.name, raw: result.language.code, code: result.language.code, note: null });
    rows.push({ group: 'Report', label: 'Reserved [36,38)', value: result.reserved.raw, raw: result.reserved.raw, code: null, note: result.reserved.note });
    rows.push({ group: 'Report', label: 'TIME', value: 'not encoded', raw: null, code: null, note: result.display_time.explanation });
    return rows;
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  function toMarkdown(result) {
    var lines = [];
    if (!result || !result.input || result.input.payload === null) {
      lines.push('# USBD1 A1 report');
      lines.push('');
      lines.push('**Error:** ' + ((result.issues[0] && result.issues[0].message) || 'no payload'));
      return lines.join('\n') + '\n';
    }
    lines.push('# USBD1 A1 report');
    lines.push('');
    lines.push('- Payload: `' + result.input.payload + '`');
    lines.push('- Length: ' + result.input.payload_length + ' (expected ' + result.format.expected_length + ')');
    lines.push('- Report type: ' + (result.report_type.name || 'Unknown') + ' (code ' + (result.report_type.code === null ? 'missing' : '`' + result.report_type.code + '`') + ')');
    lines.push('- Language: ' + result.language.name + ' (code ' + (result.language.code === null ? 'missing' : '`' + result.language.code + '`') + ', resolved `' + result.language.resolved + '`)');
    lines.push('- Tester-reported verdicts; diagnostic algorithm not reconstructed.');
    lines.push('');
    lines.push('| Group | Field | Value | Raw | Code |');
    lines.push('|---|---|---|---|---|');
    var rows = toRows(result);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      lines.push('| ' + esc(r.group) + ' | ' + esc(r.label) + ' | ' + esc(r.value) + ' | ' + esc(r.raw) + ' | ' + esc(r.code) + ' |');
    }
    lines.push('');
    lines.push('## TIME');
    lines.push('');
    lines.push(result.display_time.explanation);
    lines.push('');
    lines.push('## Issues');
    lines.push('');
    if (!result.issues.length) lines.push('None.');
    for (var j = 0; j < result.issues.length; j++) {
      var it = result.issues[j];
      lines.push('- **' + it.severity + '** `' + it.code + '`' + (it.field ? ' (' + it.field + ')' : '') + ': ' + it.message);
    }
    lines.push('');
    lines.push('---');
    lines.push('Decoded by usbd1-qr-decoder ' + result.decoder.version + '; format ' + result.decoder.format_id + '.');
    return lines.join('\n') + '\n';
  }

  return {
    FORMAT_ID: FORMAT_ID,
    EXPECTED_LENGTH: EXPECTED_LENGTH,
    SLICES: SLICES,
    STANDARDS: STANDARDS,
    LANGUAGES: LANGUAGES,
    LANGUAGE_NAMES: LANGUAGE_NAMES,
    JIS_VALUES: JIS_VALUES,
    REPORT_TYPES: REPORT_TYPES,
    parseInput: parseInput,
    decode: decode,
    toRows: toRows,
    toMarkdown: toMarkdown
  };
});
