# USBD1 A1 report format

**Format id:** `usbd1-a1.dh5z.webapp-2024-11-29`
**Captured application:** the public `e.dh5z.com` report page
**Investigation date:** 2026-11-06
**Status:** verified against the captured renderer, with differential tests.

This document describes the `d` query parameter of a USBD1 A1 report URL:

```
https://e.dh5z.com/?d=<payload>
```

The QR code contains the whole URL. The payload is the only measurement data;
the website performs no server-side lookup.

## 1. Payload

* Exactly **53 UTF-16 code units** in every verified report.
* The captured page does **not** validate the length, the alphabet or a
  checksum. It reads fixed positions and ignores anything after position 52.
* Observed characters: digits `0`–`9` in numeric fields, and single-character
  codes. The language field uses `a`–`j` as well; therefore “digits only” is
  wrong.
* The payload has no report ID, serial number, VIN, plate number or timestamp.

The decoder preserves the payload and each raw slice as strings. Numeric
values are additionally exposed as numbers.

## 2. Field layout

All slices are zero-based, end-exclusive, and measured on the original string.

| Slice | Len | Field | Raw meaning | Decoding |
|---|---|---|---|---|
| `[0,1)` | 1 | `battery_type` | battery technology code | enum, §3.1 |
| `[1,5)` | 4 | `rated` | rated value | integer; unit depends on standard, §4 |
| `[5,9)` | 4 | `voltage` | battery voltage × 100 | integer ÷ 100 = V |
| `[9,13)` | 4 | `measured` | measured current | integer = A |
| `[13,14)` | 1 | `standard` | rating standard code | enum, §3.6 |
| `[14,15)` | 1 | `battery_result` | battery verdict code | enum, §3.2 |
| `[15,18)` | 3 | `soc` | state of charge | integer = % |
| `[18,21)` | 3 | `soh` | state of health | integer = % |
| `[21,26)` | 5 | `resistance` | internal resistance × 100 | integer ÷ 100 = mΩ |
| `[26,27)` | 1 | `vehicle_type` | measurement target code | enum, §3.5 |
| `[27,31)` | 4 | `cranking_voltage` | cranking voltage × 100 | integer ÷ 100 = V |
| `[31,35)` | 4 | `cranking_duration` | cranking duration | integer = ms |
| `[35,36)` | 1 | `cranking_result` | cranking verdict code | enum, §3.3 |
| `[36,38)` | 2 | `reserved` | not read by the page | unknown; observed `00` |
| `[38,42)` | 4 | `charging_loaded` | loaded voltage × 100 | integer ÷ 100 = V |
| `[42,46)` | 4 | `charging_unloaded` | unloaded voltage × 100 | integer ÷ 100 = V |
| `[46,50)` | 4 | `charging_ripple` | ripple voltage | integer = mV |
| `[50,51)` | 1 | `charging_result` | charging verdict code | enum, §3.4 |
| `[51,52)` | 1 | `language` | display language code | enum, §3.7 |
| `[52,53)` | 1 | `report_type` | which test section(s) to show | enum, §3.8 |

Note the order: **SoC `[15,18)` comes before SoH `[18,21)`**, and RATED is near
the start (`[1,5)`), not after SoH. Earlier published guesses that placed SoH
at `[1,4)` and RATED at `[18,22)` are wrong.

`[36,38)` is a gap: the page never reads it. It is not a checksum, version or
language field. Its meaning is **unknown**.

## 3. Code tables

These are the tables present in the captured application. Unknown codes are
listed in the decoder output with `known: false` and the literal i18n key the
page would show; no meaning is invented.

### 3.1 Battery technology (`[0,1)`)

| Code | English label |
|---|---|
| `0` | `--` |
| `1` | Regular Flooded |
| `2` | AGM Flat Plate |
| `3` | AGM Spiral |
| `4` | GEL |
| `5` | EFB |
| `6` | Lithium Ion |

### 3.2 Battery verdict (`[14,15)`)

| Code | English label |
|---|---|
| `0` | `--` |
| `1` | GOOD BATTERY |
| `2` | REPLACE |
| `3` | GOOD-RECHARGE |
| `4` | CHARGE & RETEST |
| `5` | BAD CELL |

These are **tester-reported** verdicts. The project does not reconstruct the
tester's diagnostic algorithm and does not recalculate a verdict.

### 3.3 Cranking verdict (`[35,36)`)

| Code | English label |
|---|---|
| `0` | `--` |
| `1` | NORMAL |
| `2` | LOW |
| `3` | HIGH |

### 3.4 Charging verdict (`[50,51)`)

| Code | English label |
|---|---|
| `0` | NO OUTPUT |
| `1` | VOLTAGE NORMAL |
| `2` | VOLTAGE HIGH |
| `3` | VOLTAGE LOW |

### 3.5 Vehicle type / measurement target (`[26,27)`)

| Code | English label |
|---|---|
| `0` | `--` |
| `1` | Motorcycle |
| `2` | Car |
| `3` | Truck |

### 3.6 Rating standard (`[13,14)`)

| Code | Label | RATED unit |
|---|---|---|
| `0` | CCA | A |
| `1` | DIN | A |
| `2` | JIS | none (designation, §4) |
| `3` | EN | A |
| `4` | IEC | A |
| `5` | GB | **Ah** (as captured) |
| `6` | SAE | A |
| `7` | MCA | A |
| `8` | BCI | A |
| `9` | CA | A |
| other | blank | A (page default) |

The GB → `Ah` unit is what the captured page displays; it is recorded as an
observed display rule, not as a claim that GB ratings are normally expressed in
Ah.

### 3.7 Language (`[51,52)`)

The code is case-sensitive.

| Code | Locale | Language |
|---|---|---|
| `1` | `de` | German |
| `2` | `en` | English |
| `3` | `es` | Spanish |
| `4` | `fr` | French |
| `5` | `it` | Italian |
| `6` | `nl` | Dutch |
| `7` | `zh` | Chinese |
| `8` | `jp` | Japanese |
| `9` | `ko` | Korean |
| `a` | `ru` | Russian |
| `b` | `pt` | Portuguese |
| `c` | `pl` | Polish |
| `d` | `fi` | Finnish |
| `e` | `gr` | Greek |
| `f` | `se` | Swedish |
| `g` | `cz` | Czech |
| `h` | `dk` | Danish |
| `i` | `bg` | Bulgarian |
| `j` | `hr` | Croatian |
| other | `en` | English fallback |

The code selects the language of the rendered labels at load time. The page's
language selector can change it afterwards; that is presentation only and is
not written back to the payload.

The language tables were captured from the page. They include a few vendor
translation quirks (for example Danish `charging_0` is the Czech string
`ŽÁDNÝ VÝSTUP`); these are reproduced as captured, not corrected silently.

### 3.8 Report type (`[52,53)`)

| Code | Meaning | Sections shown |
|---|---|---|
| `1` | Battery Test | battery |
| `2` | Cranking Test | cranking |
| `3` | Charging Test | charging |
| `4` | All tests | battery + cranking + charging |
| other | unknown | no section (page behaviour) |

A type-4 payload contains all three tests in one 53-character payload.

## 4. RATED and JIS

`RATED` uses the numeric value from `[1,5)`, but the display depends on the
standard:

* standard `2` (JIS): the numeric value is an **index** into a 71-entry
  designation table (`0` → `26A17`, `26` → `65D23`, `70` → `N200Z`).
  Indexes outside `0..70` render blank. No unit is shown.
* standard `5` (GB): the number is shown with `Ah`.
* every other standard, including unknown: the number is shown with `A`.

The JIS table:

```
 0 26A17    1 26A19    2 30A19    3 34A19    4 26B17    5 28B17
 6 28B19    7 34B17    8 34B19    9 36B20   10 38B19   11 38B20
12 40B19   13 42B19   14 44B19   15 44B20   16 46B24   17 50B24
18 55B24   19 60B24   20 65B24   21 32C24   22 48D26   23 50D20
24 55D23   25 55D26   26 65D23   27 65D26   28 65D31   29 70D23
30 75D23   31 75D26   32 75D31   33 80D23   34 80D26   35 85D23
36 85D26   37 90D26   38 95D31   39 105D31  40 110D26  41 115D31
42 95E41   43 100E41  44 105E41  45 110E41  46 115E41  47 120E41
48 130E41  49 115F51  50 130F51  51 145F51  52 150F51  53 170F51
54 145G51  55 155G51  56 165G51  57 180G51  58 195G51  59 190H52
60 210H52  61 225H52  62 245H52  63 NS40Z   64 NS50Z   65 NS60Z
66 NS70Z   67 N100Z   68 N120Z   69 N150Z   70 N200Z
```

## 5. Parsing rules (important for fidelity)

The captured page performs:

```js
var ary = payload.split("");
parseInt(ary[a] + ary[b] + ...);       // no radix
```

Consequences, all reproduced and tested:

* Leading zeros are dropped from the **numeric value**; the raw text keeps
  them. `"0510"` → `510`.
* `parseInt` with no radix accepts:
  * leading whitespace,
  * an optional `+` or `-`,
  * a `0x` prefix (hexadecimal),
  * a decimal prefix followed by trailing junk.
* A slice that does not start with a number becomes `NaN`. The page displays
  `NaN`; the decoder records `invalid: true`, `value: null`, and the display
  string that the page would show.
* A missing slice (short payload) becomes `NaN` in the page. The decoder
  records `missing: true`, `raw: null`, and flags the truncation.
* Zero, missing, invalid and unknown are four different states and are not
  conflated.
* There is no alphabet validation, no length validation, and no checksum
  validation.
* `split("")` uses UTF-16 code units; the decoder uses the same slicing.

## 6. Display formatting

The page interpolates JavaScript values directly, with these suffixes:

| Field | Display |
|---|---|
| SoH / SoC | `N%` |
| Measured | `N A` |
| Voltage | `N V` |
| Rated | `N A`, `N Ah`, or a JIS designation (no unit) |
| Resistance | `N mΩ` |
| Cranking voltage | `N V` |
| Duration | `N ms` |
| Charging unloaded / loaded | `N V` |
| Ripple | `N mV` |

There is no fixed decimal count. `1200` → `12` (not `12.00`); `1253` →
`12.53`. The suffix is appended even for `NaN` (`NaN V`, `NaN A`, …). For JIS,
the number is replaced by the designation, so a valid index has no trailing
unit and an invalid index is blank.

Verdict/type/vehicle labels are looked up in the language selected by
`[51,52)`. An unknown code renders the literal i18n key, for example
`batteryTest.type_9`, `batteryTest.result_6`, `crankingTest.cranking_4`,
`chargingTest.charging_2` (if 2 were unknown in a language), `carType_4`.
The decoder exposes that fallback as `vendor_fallback`.

## 7. TIME

**The payload contains no date or time.** The page displays a `TIME` field
because it initialises `testDate` to `new Date()` at page load:

* reload → a new time;
* browser timezone change → a different local time for the same instant;
* editing the date picker → URL gets an opaque `u` parameter containing
  `{testDate: "yyyy-MM-dd HH:mm:ss"}`; that value survives reload;
* `u` without `d` → date is applied, then the page throws before rendering a
  report.

Therefore the on-screen TIME is a **page-generation / user-edited display
value**, not the measurement time. This decoder reports `encoded_in_payload:
false` and never invents a measurement timestamp.

## 8. Checksum, length and validation

In the captured page:

* no length check;
* no alphabet check;
* no checksum calculation or verification;
* `hex2Int()` exists but is dead code (never called);
* extra characters after index 52 are ignored;
* a short payload produces `NaN`/blank fields rather than an error page.

Whether the tester itself computes a checksum or stores more data is **not
observable** from the web page. The decoder does not claim one exists or does
not exist on the device.

## 9. Worked examples

### 9.1 Battery (EFB, GOOD BATTERY)

```
50510126103663109505100606200000000000000000000000021
```

| Field | Raw | Value |
|---|---|---|
| battery type | `5` | EFB |
| rated | `0510` | 510 A (standard EN) |
| voltage | `1261` | 12.61 V |
| measured | `0366` | 366 A |
| standard | `3` | EN |
| verdict | `1` | GOOD BATTERY |
| SoC | `095` | 95% |
| SoH | `051` | 51% |
| resistance | `00606` | 6.06 mΩ |
| vehicle | `2` | Car |
| cranking voltage | `0000` | 0 V (not shown) |
| cranking duration | `0000` | 0 ms (not shown) |
| cranking verdict | `0` | -- (not shown) |
| reserved | `00` | unknown |
| loaded / unloaded / ripple | `0000` `0000` `0000` | not shown |
| charging verdict | `0` | NO OUTPUT (not shown) |
| language | `2` | en |
| report type | `1` | Battery Test |

### 9.2 Cranking (NORMAL)

```
00000000000000000000000000010603580100000000000000022
```

| Field | Raw | Value |
|---|---|---|
| cranking voltage | `1060` | 10.6 V |
| cranking duration | `3580` | 3580 ms |
| cranking verdict | `1` | NORMAL |
| vehicle | `0` | -- |
| language | `2` | en |
| report type | `2` | Cranking Test |

All battery/charging fields are `000…` and are not shown because the report
type is 2.

### 9.3 Public indexed sample (Polish, AGM)

```
207601253061833083066003592000000000000000000000000c1
```

| Field | Raw | Value |
|---|---|---|
| battery type | `2` | AGM Flat Plate / `Bateria tabletu AGM` |
| rated | `0760` | 760 A (EN) |
| voltage | `1253` | 12.53 V |
| measured | `0618` | 618 A |
| standard | `3` | EN |
| verdict | `3` | GOOD-RECHARGE / `DOBRZE - ŁADOWANIA` |
| SoC | `083` | 83% |
| SoH | `066` | 66% |
| resistance | `00359` | 3.59 mΩ |
| vehicle | `2` | Car / `Samochód` |
| language | `c` | pl |
| report type | `1` | Battery Test |

The `c` is the **language code for Polish**, which explains the indexed Polish
title. It is not a checksum, version or hexadecimal marker.

## 10. Compatibility statement

This specification is complete for:

* the captured application version above (stable in the Wayback snapshot of
  a 2025-09-28 archive snapshot of the same application);
* 53-character payloads;
* report types `1`–`4`;
* every code present in the captured tables in §3;
* JIS indexes `0`–`70`;
* all 19 language codes in §3.7;
* the parser behaviours in §5 and §6.

It is **not** verified for:

* another firmware version that emits a different length or layout;
* unknown code values not present in the captured tables;
* the meaning of `[36,38)`;
* the optional opaque `u` parameter (deliberately not decoded);
* the tester's measurement or diagnostic algorithm;
* whether the tester computes a checksum;
* any future change to the vendor web application.

Unsupported lengths are decoded best-effort but marked `ok: false` and
`format.supported: false`; the CLI exits with code 3. Unknown codes are shown
as unknown, never assigned a guessed meaning.
