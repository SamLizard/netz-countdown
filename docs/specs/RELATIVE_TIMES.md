# Spec: times relative to sunrise (prayer steps)

Status: ready for implementation review. Nothing here is implemented yet.
Scope: the PWA in `src/`. The Apple Shortcut version (`shortcut/`) is out of scope.

## 1. Summary

The user can add named times relative to sunrise ("Kaddish, 21 min before"). The home screen still shows one
countdown. It counts down to the next step, moves to the following step on its own, and ends on sunrise.
The user can swipe to look at other steps; the screen returns to live after a few seconds.
With no steps defined (the default), the app behaves exactly as today.

### 1.1 Relation to `shortcut/FEATURE_PRAYER_STEPS.md`

This spec supersedes, for the PWA:
- §4 Data model: anchors are sunrise only (no `zman`, `clock` or `step` anchors). No `lateToleranceSeconds`,
  no `enabled`, no `defaults` block. New file format in §5.
- §5 Swipe and return to live, §9 Storage/sharing, and Phase 2 of §10.
- Answers to its open questions: Q2 sunrise only; Q4 advance immediately; Q6 see §3.3; Q7 both tap and
  automatic after 8 s; Q11 an imported list becomes a personal copy the user can edit.

Still valid from that draft: glossary (§2), color fade principle (§7), DST and background-tab edge cases (§8),
Phase 3 hooks (all step changes go through one function; unknown file fields ignored).

## 2. Terms

| Term | Meaning |
|---|---|
| Step | A label + an offset in seconds from today's visible sunrise. |
| Sunrise step | The anchor, offset 0. Always present, cannot be deleted. Its label can be renamed (e.g. "Amida"). |
| Offset | Integer seconds. Negative = before sunrise. Allowed range −7200..+3600 (−120 min..+60 min). |
| Plan | The day's steps with absolute times, sorted by time. |
| Live / Peek | Live: the display follows the clock. Peek: the user swiped to another step. |

## 3. UX

### 3.1 Discoverability

- Settings dialog gets a new section "Prayer steps", placed between the warning slider and the Calendar section.
  It shows a one-line hint, a summary ("None, only sunrise" or "4 steps") and one button ("Add steps" / "Edit steps").
- Nothing changes on the home screen until at least one extra step exists. No banner, no onboarding.

### 3.2 Home screen with steps

```
+-----------------------------------+
|  [Preview · Back to live]      ⚙  |  <- chip only in peek mode
|                                   |
|              03:12                |  <- big number, colored per step
|         until Kaddish             |  <- "until {label}" / "since {label}"
|              • • ○ •              |  <- dots, one per step, current filled
|   ‹ Kaddish            Yishtabach ›   <- prev/next labels, small, dim
|                                   |
|   Kaddish 05:55:45   Now 05:52:33  |  <- bottom line: step time + now
+-----------------------------------+
```
- Label line: `steps.until` before the step, `steps.since` after it (late display). For the sunrise step with no
  custom label, keep today's `countdown.until` / `countdown.after` text.
- Bottom line: replaces "Sunrise" with the current step's label and clock time. When the current step is not
  sunrise, a third item "Sunrise HH:MM:SS" is added in smaller text.
- Hebrew date and "(tomorrow)" stay as today.
- Labels are user text in any script. Render every label with `dir="auto"`, and inside translated sentences wrap
  it in `<bdi>` using `<i18n-t>` slot interpolation, so a Hebrew label inside an English/French sentence keeps
  correct order. Numbers keep `direction: ltr` as today.

### 3.3 Live mode and peeking

- Live: current step = first step in the plan whose time is still in the future. When it is reached
  (`secondsUntil <= 0`), the next step becomes current immediately. No tap needed.
- After the last step: show "+MM:SS since {last label}" in red until `sunrise + LATE_WINDOW_SECONDS` (2 h, existing
  constant). Then the plan switches to tomorrow, as `resolveTarget` does today.
- Opening late: jump straight to the first future step. Passed steps are reachable by peeking and show "+MM:SS".
- Peek: horizontal swipe (pointer events, ≥ 50 px, more horizontal than vertical) or tap on the prev/next labels,
  or ArrowLeft/ArrowRight on desktop. In LTR locales (en, fr) swipe left = next step, swipe right = previous.
  Mirror in RTL locales. Peeking stops at the first and last steps (no wrap).
- In peek mode: the chip "Preview · Back to live" is shown, the number shows the peeked step's countdown or
  "+MM:SS", with its own color, at 70 % opacity. Tap the chip, or 8 s without touch → back to live.
  Live auto-advance keeps running underneath. Any change to the steps list also returns to live.
- With no extra steps: no dots, no prev/next labels, swipe does nothing.

### 3.4 Steps editor (phone first)

Full-screen `v-dialog` opened from Settings.
- Top bar: close (×), title, overflow menu (⋮): Import file, Paste a list, Export / share, Delete all steps.
- "List name" text field (optional, max 60 chars). Used in export file name and share title.
- Caption "Times for {date}": the date of the plan the home screen currently uses (today, or tomorrow after the
  late window). If that day has no sunrise in the calendar or no calendar is loaded, show `steps.noPreview` and
  hide the clock column.
- List, sorted by offset ascending, sunrise row at its place (offset 0). Each row:
  `label (dir=auto)    −21:00 → 05:55:45`. Sunrise row has a lock icon and a subtitle `steps.sunriseLocked`.
- Offset display: sign, then minutes (not wrapped at 60), colon, 2-digit seconds. Minus is U+2212. Examples:
  `−21:00`, `−17:30`, `+5:00`, `0:00`. Clock: `HH:MM:SS` (existing `formatClock`).
- Order is implied by time; there is no drag handle. Rows re-sort after each save.
- FAB / bottom button "Add a step". Empty state text `steps.empty` above it.
- Tap a row → edit bottom sheet (`v-bottom-sheet`):
  - Name (required). Hint shows an example in Latin and Hebrew.
  - Toggle Before / After sunrise (default Before). Minutes (0..120, number keypad) and Seconds (0..59).
  - Live line under the fields: "Today at 05:55:45" (or nothing if no sunrise).
  - "More options" expander: warning override as minutes + seconds (10 s..30 min). Empty = default (§4).
  - Buttons: Save (disabled while invalid), Cancel, Delete (not for sunrise).
  - Sunrise sheet: only Name is editable; clearing it restores the default localized label.
- Delete a step: no confirm; snackbar "Step deleted · Undo" (5 s). Delete all: `window.confirm`, then same undo.
- Changes are saved to `localStorage` on each Save; there is no global save button.

Inline validation (shown under the field as you type, debounce 300 ms):

| Rule | Error key |
|---|---|
| Name trimmed is empty | `labelRequired` |
| Name > 40 characters | `labelTooLong` |
| Same name as another step, including sunrise label (compare after trim, NFC, case-insensitive) | `labelDuplicate` |
| Offset outside −7200..+3600 s | `offsetRange` |
| Offset 0 for a non-sunrise step | `offsetZero` |
| Same offset as another step | `offsetDuplicate` (names the other step) |
| Seconds field not 0..59 | `secondsRange` |
| Adding beyond 20 steps (sunrise included) | `tooMany` |

### 3.5 Paste a list

Dialog with a textarea (max 5000 chars, 50 non-empty lines), a hint with examples, and a live preview table
under it. Before parsing each line, the parser:
1. Removes BOM, bidi marks (U+200E, U+200F, U+202A–U+202E, U+2066–U+2069), replaces NBSP with space, trims.
2. Skips empty lines and lines starting with `#`.

Offset expression (case-insensitive), in this order of parts, spaces optional between parts:
- Direction word before the number (optional): `before|avant|לפני|after|après|apres|אחרי`.
- Sign (optional): `-`, `−` (U+2212), `–`, `—`, `+`.
- Number, one of:
  - `M` minutes (1–3 digits): `21`
  - `M:SS`, `M.SS`, `M'SS` with exactly 2 digits of seconds: `17:30`, `17.30`, `17'30`
  - `M.d` with 1 decimal digit = tenths of a minute: `17.5` = 17:30
  - `M <min-unit> S <sec-unit>`: `17 min 30 s`, `17m30s`, `17 דקות 30 שניות`
  - `S <sec-unit>` alone: `45 s`, `45 sec`
  - min-unit: `min|mn|m|minute(s)|דק|דק'|דקות|'`; sec-unit: `s|sec|seconde(s)|second(s)|שניות|"`.
- Direction word after the number (optional), same list.
- Special zero: `0`, `0:00`, `at sunrise`, `au lever`, `netz`, `נץ` → 0.

Sign rules: `before` or `-` → negative. `after` or `+` → positive. Neither → **negative** (most steps are before
sunrise; the preview shows the sign so the user can fix it). `-` with `after`, or `+` with `before` → `conflictSign`.

Line shapes:
- If the line contains a tab: split on the first tab. The cell that parses fully as an offset is the offset, the
  other cell is the label. If both or neither parse → `noOffset` (neither) or label = first cell (both).
- Otherwise try the offset expression anchored at the end of the line, then anchored at the start.
  The rest, trimmed of spaces and separators `, ; : | - – —` at its joining edge, is the label.

Examples (all valid):

| Input | Label | Offset |
|---|---|---|
| `Kaddish\t-21:00` | Kaddish | −21:00 |
| `Kaddish -21` | Kaddish | −21:00 |
| `Hodu, -17:30` | Hodu | −17:30 |
| `21 min before: Kaddish` | Kaddish | −21:00 |
| `Yishtabach 6` | Yishtabach | −6:00 |
| `קדיש 21 דקות לפני` | קדיש | −21:00 |
| `Amida 0` | Amida | 0:00 (renames sunrise) |
| `Shir shel yom +12` | Shir shel yom | +12:00 |

A line with offset 0 sets the sunrise label. Lines are then validated with the same rules as §3.4.
Within the pasted text, the second line with a duplicate name or offset gets the error; the first is kept.

Preview table columns: #, Name, Offset, Today (clock, hidden without sunrise), Status. Status is one of
New / Updated / Unchanged, or the error message in red. Then:
- Radio Merge (default) / Replace, each with a one-line hint.
  - Merge: incoming names matching an existing step (normalized) update its offset and warning; others are added;
    nothing is removed. Name of the list is kept unless empty.
  - Replace: all non-sunrise steps are replaced; sunrise label is set from the input if given, else kept.
- Statuses and conflicts are recomputed for the chosen mode (e.g. a merged offset that clashes with a kept step
  becomes an `offsetDuplicate` error).
- Footer: "{n} lines with errors will be ignored" and button "Apply ({count})", disabled when count = 0.
- After apply: dialog closes, snackbar "List updated · Undo".

### 3.6 Import and export files

- **Copy as text** produces a list ready for **Paste a list**: an optional list name followed by tab-separated names and offsets.
- **Paste a list** also accepts the JSON contents of an exported steps file and uses the same preview as file import.
- Import file: `<input type="file" accept=".json,application/json">`. Parse with `parseStepsFile`, then show the
  same preview table and Merge/Replace choice as §3.5 (title shows the list name from the file).
- Export / share: build `File` named `netz-steps-<slug>.json` (slug: list name with spaces and `/\:*?"<>|` replaced
  by `-`, max 40 chars; `netz-steps.json` if no name). If `navigator.canShare?.({ files: [file] })` is true, call
  `navigator.share({ files: [file], title })`; ignore `AbortError`. Otherwise download through an object URL and
  show snackbar "File saved".
- Typical flow: the gabbai exports and sends the file in WhatsApp. Others save it to Files (iOS) or Downloads and
  use Import file. Opening the file directly into the PWA (share target / file handler) is out of scope.

## 4. Colors, warning window and planned display features

- Each step uses `colorFor(remaining, effectiveWarning, blackBackground)` unchanged: green, linear fade to red in
  the warning window, red after.
- Effective warning of a step:
  - Override set → the override (not clamped).
  - Sunrise step, no override → `settings.warningMinutes × 60`.
  - Other steps, no override → 120 s.
  - Defaults (not overrides) are clamped to the gap since the previous step, so each step starts green.
    The first step is not clamped. With no extra steps this gives today's behaviour exactly.
- Grey `__:__` placeholder (planned): applies to the current live step, using its effective warning. The label,
  dots and bottom line stay visible. In peek mode, digits are always shown.
- Black background: same rule as today, per step (number colored, background black).
- Auto-dim / close at sunrise (planned): triggers when the last step of the plan passes. That is sunrise unless the
  user has after-sunrise steps. Intermediate steps never trigger it.
- Energy modes (planned): any reduced tick rate must still fire a tick no later than the next step time, so the
  step change and color change happen on time. All state is derived from the clock on each tick; nothing about
  the current step is stored.

## 5. Data model and file format

```ts
// src/types.ts
export interface RelativeStep {
  id: string;               // crypto.randomUUID() (fallback: Date.now + random). Not exported.
  label: string;            // trimmed, 1..40 chars
  offsetSeconds: number;    // integer, -7200..3600, never 0
  warningSeconds?: number;  // 10..1800
}
export interface StepsList {
  name: string;             // may be ''
  sunriseLabel: string | null; // null = localized default "Sunrise"
  steps: RelativeStep[];    // non-sunrise steps, any order in storage
}
export interface PlannedStep {
  id: string | 'sunrise'; label: string | null; offsetSeconds: number;
  time: Date; warningSeconds: number; isSunrise: boolean;
}
```

Shared file (`StepsFileV1`):
```json
{
  "kind": "netz.steps",
  "schemaVersion": 1,
  "name": "Vatikin – Beit Knesset X",
  "steps": [
    { "label": "Kaddish", "offsetSeconds": -1260 },
    { "label": "Hodu", "offsetSeconds": -1050 },
    { "label": "Yishtabach", "offsetSeconds": -360, "warningSeconds": 60 },
    { "label": "Amida", "offsetSeconds": 0 }
  ],
  "exportedAt": "2026-10-25T04:10:00.000Z"
}
```
- A step with `offsetSeconds: 0` is the sunrise label (at most one). Export writes it only if `sunriseLabel` is set.
- Import validation (`parseStepsFile`), first match wins:
  - Text > 100 KB → `tooLarge`. Not JSON → `invalidJson`.
  - Object with a `days` object and no `kind` → `isCalendarFile`.
  - `kind !== "netz.steps"` → `notStepsFile`. `schemaVersion` > 1 → `newerVersion`; not 1 → `notStepsFile`.
  - `steps` not an array → `notStepsFile`. Each item is then validated like a pasted line (errors per item, shown
    in the preview). Unknown fields are ignored (Phase 3 `markers` can be added later).
- Calendar importer: `parseCalendar` gets one extra check: `kind === "netz.steps"` → new `CalendarError`
  code `isStepsFile`. Optionally the calendar exporter adds `"kind": "netz.calendar"` later; not required.

localStorage:

| Key | Content |
|---|---|
| `netz.steps.v1` | `{ schemaVersion: 1, name, sunriseLabel, steps: RelativeStep[] }` |

Peek state and undo buffer are memory only. Missing or invalid stored value → empty list (today's behaviour).

## 6. Code plan

Services (pure TS, no Vue):

```ts
// services/steps.ts
export const OFFSET_MIN = -7200, OFFSET_MAX = 3600, MAX_STEPS = 20, LABEL_MAX = 40;
export const DEFAULT_STEP_WARNING = 120;
export function normalizeLabel(label: string): string;           // trim, NFC, toLocaleLowerCase
export function formatOffset(seconds: number): string;           // "−21:00"
export type StepError = { code: StepErrorCode; params?: Record<string, string | number> };
export function validateStep(step: Pick<RelativeStep, 'label' | 'offsetSeconds' | 'warningSeconds'>,
  list: StepsList, editingId?: string): StepError[];
export function buildPlan(list: StepsList, sunrise: Date, sunriseWarningSeconds: number): PlannedStep[];
export function currentIndex(plan: PlannedStep[], now: Date): number; // plan.length when all passed
export function resolvePlan(data: ZmanimData, list: StepsList, now: Date, sunriseWarningSeconds: number)
  : { plan: PlannedStep[]; day: Date; hebrewDate?: string } | null;    // day choice = resolveTarget's rule

// services/stepsParser.ts
export class StepsError extends Error { constructor(readonly code: StepsFileErrorCode) }
export function parseOffset(text: string): { seconds: number } | { error: StepErrorCode } | null;
export function parseStepsInput(text: string): { name: string; items: ParsedLine[] }; // clipboard text or exported JSON
export function parseStepsFile(text: string): { name: string; items: ParsedLine[] };
export function serializeSteps(list: StepsList, now: Date): string;   // StepsFileV1, 2-space JSON
export function previewMerge(current: StepsList, items: ParsedLine[], mode: 'merge' | 'replace')
  : { rows: PreviewRow[]; result: StepsList; applicable: number };

// services/fileShare.ts (browser APIs, no Vue)
export function exportFileName(name: string): string;
export async function shareOrDownload(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'>;
```

Store `stores/steps.ts` (setup store, persisted with `watch(..., { deep: true })` like `settings.ts`):
- State: `list: Ref<StepsList>`.
- Getters: `hasSteps` (steps.length > 0), `sortedSteps`, `count`.
- Actions: `addStep(input): StepError[]`, `updateStep(id, input): StepError[]`, `removeStep(id)`,
  `setSunriseLabel(label | null)`, `setName(name)`, `apply(result: StepsList)` (used by paste/import),
  `clearSteps()`, `undo()` (restores the snapshot taken before the last remove/clear/apply).

Composables:
- `composables/useStepPlan.ts`: from calendar, steps and settings stores + `now`; returns `plan`, `liveIndex`,
  `hebrewDate`. Single place where step changes happen (`advanceTo(index, source: 'clock' | 'user')`, Phase 3 hook).
- `composables/useStepPeek.ts`: `peekIndex`, `isPeeking`, `next()`, `prev()`, `backToLive()`, swipe/keyboard
  listeners on a target ref, 8 s auto-return timer, reset when the list changes.

Components (each well under 200 lines; new ones under `src/components/steps/`):

| File | Responsibility |
|---|---|
| `views/HomeView.vue` (edit) | Use `useStepPlan` + `useStepPeek`; pass the displayed step to `CountdownDisplay`; add `StepNav`. |
| `components/CountdownDisplay.vue` (edit) | New optional props `label?: string`, `extraTime?: { label, date }`, `dimmed?: boolean`. No step logic. |
| `steps/StepNav.vue` | Dots, prev/next labels, "Preview · Back to live" chip. Emits `prev`, `next`, `live`. |
| `steps/StepsSettingsSection.vue` | Settings section: hint, summary, button opening the editor. Added to `SettingsDialog.vue` (one line). |
| `steps/StepsEditorDialog.vue` | Full-screen list, name field, menu, empty state, undo snackbar. |
| `steps/StepRow.vue` | One row: label, offset, clock. Emits `edit`. |
| `steps/StepEditSheet.vue` | Bottom sheet form with inline validation. Emits `save`, `delete`. |
| `steps/StepsPasteDialog.vue` | Textarea + `StepsImportPreview`. |
| `steps/StepsImportPreview.vue` | Preview table, Merge/Replace, Apply. Shared by paste and file import. |
| `steps/StepsFileActions.vue` | Hidden file input for import, export/share action; errors via snackbar. |

## 7. i18n keys

All new keys go in `en.json`, `fr.json`, and `he.json`. Error keys live under `steps.errors.*`.

| Key | en | fr |
|---|---|---|
| steps.title | Prayer steps | Étapes de la prière |
| steps.sectionHint | Optional. Add times such as Kaddish 21 min before sunrise. The countdown goes through them one by one. | Facultatif. Ajoutez des horaires comme Kaddich 21 min avant le lever du soleil. Le compte à rebours les enchaîne un par un. |
| steps.summaryNone | None, only sunrise | Aucune, seulement le lever du soleil |
| steps.summaryCount | 1 step \| {count} steps | 1 étape \| {count} étapes |
| steps.addSteps | Add steps | Ajouter des étapes |
| steps.editSteps | Edit steps | Modifier les étapes |
| steps.listName | List name | Nom de la liste |
| steps.listNameHint | Shown when you share the list | Affiché quand vous partagez la liste |
| steps.empty | No steps yet. The countdown shows sunrise only. | Aucune étape. Le compte à rebours affiche seulement le lever du soleil. |
| steps.addStep | Add a step | Ajouter une étape |
| steps.sunriseDefaultLabel | Sunrise | Lever du soleil |
| steps.sunriseLocked | Reference time. It can be renamed, not deleted. | Heure de référence. Elle peut être renommée, pas supprimée. |
| steps.previewFor | Times for {date} | Horaires du {date} |
| steps.noPreview | No sunrise in the calendar for this day, so clock times cannot be shown. | Pas de lever du soleil dans le calendrier pour ce jour, les heures ne peuvent pas être affichées. |
| steps.moreActions | More actions | Plus d’actions |
| steps.importFile | Import a file | Importer un fichier |
| steps.exportFile | Export / share | Exporter / partager |
| steps.paste | Paste a list | Coller une liste |
| steps.deleteAll | Delete all steps | Supprimer toutes les étapes |
| steps.deleteAllConfirm | Delete all steps? Sunrise stays. | Supprimer toutes les étapes ? Le lever du soleil reste. |
| steps.deleted | Step deleted | Étape supprimée |
| steps.undo | Undo | Annuler |
| steps.newTitle | New step | Nouvelle étape |
| steps.editTitle | Edit step | Modifier l’étape |
| steps.label | Name | Nom |
| steps.labelHint | For example Kaddish or קדיש | Par exemple Kaddich ou קדיש |
| steps.before | Before sunrise | Avant le lever |
| steps.after | After sunrise | Après le lever |
| steps.minutes | Minutes | Minutes |
| steps.seconds | Seconds | Secondes |
| steps.todayAt | Today at {time} | Aujourd’hui à {time} |
| steps.moreOptions | More options | Plus d’options |
| steps.warning | Start turning red before this step | Commencer à passer au rouge avant cette étape |
| steps.warningDefault | Empty = default ({value}) | Vide = valeur par défaut ({value}) |
| steps.save | Save | Enregistrer |
| steps.cancel | Cancel | Annuler |
| steps.delete | Delete | Supprimer |
| steps.until | until {label} | avant {label} |
| steps.since | since {label} | depuis {label} |
| steps.preview | Preview | Aperçu |
| steps.backToLive | Back to live | Revenir au direct |
| steps.position | Step {index} of {total} | Étape {index} sur {total} |
| steps.prevStep | Previous step | Étape précédente |
| steps.nextStep | Next step | Étape suivante |
| steps.pasteTitle | Paste a list | Coller une liste |
| steps.pasteHint | One step per line: a name and the minutes before sunrise. Examples: "Kaddish -21", "Hodu, -17:30", "6 min before: Yishtabach". Use + or "after" for times after sunrise. | Une étape par ligne : un nom et les minutes avant le lever. Exemples : « Kaddich -21 », « Hodou, -17:30 », « 6 min avant : Ichtabah ». Utilisez + ou « après » pour les horaires après le lever. |
| steps.importTitle | Import “{name}” | Importer « {name} » |
| steps.colLabel | Name | Nom |
| steps.colOffset | Offset | Décalage |
| steps.colTime | Today | Aujourd’hui |
| steps.colStatus | Status | État |
| steps.statusNew | New | Nouveau |
| steps.statusUpdated | Updated | Modifié |
| steps.statusUnchanged | Unchanged | Inchangé |
| steps.modeMerge | Merge with my list | Fusionner avec ma liste |
| steps.modeMergeHint | Same names are updated, others are added. Nothing is removed. | Les noms identiques sont mis à jour, les autres ajoutés. Rien n’est supprimé. |
| steps.modeReplace | Replace my list | Remplacer ma liste |
| steps.modeReplaceHint | Your current steps are removed. | Vos étapes actuelles sont supprimées. |
| steps.ignoredLines | 1 line with errors will be ignored \| {count} lines with errors will be ignored | 1 ligne en erreur sera ignorée \| {count} lignes en erreur seront ignorées |
| steps.apply | Apply ({count}) | Appliquer ({count}) |
| steps.applied | List updated | Liste mise à jour |
| steps.fileSaved | File saved | Fichier enregistré |
| steps.shareTitle | Prayer steps: {name} | Étapes de la prière : {name} |
| steps.errors.labelRequired | Enter a name | Saisissez un nom |
| steps.errors.labelTooLong | {max} characters at most | {max} caractères au maximum |
| steps.errors.labelDuplicate | Another step already has this name | Une autre étape porte déjà ce nom |
| steps.errors.offsetRange | Must be between {min} min before and {max} min after sunrise | Doit être entre {min} min avant et {max} min après le lever |
| steps.errors.offsetZero | 0 is sunrise. Rename the sunrise step instead. | 0 correspond au lever. Renommez plutôt l’étape du lever. |
| steps.errors.offsetDuplicate | “{label}” is already at this time | « {label} » est déjà à cette heure |
| steps.errors.secondsRange | 0 to 59 | De 0 à 59 |
| steps.errors.warningRange | Between 10 s and 30 min | Entre 10 s et 30 min |
| steps.errors.tooMany | {max} steps at most | {max} étapes au maximum |
| steps.errors.noOffset | No time found (for example -21 or -17:30) | Aucun horaire trouvé (par exemple -21 ou -17:30) |
| steps.errors.noLabel | No name found | Aucun nom trouvé |
| steps.errors.conflictSign | Both “+” and “before” (or “-” and “after”) on this line | « + » et « avant » (ou « - » et « après ») sur la même ligne |
| steps.errors.invalidJson | This file is not a valid JSON file. | Ce fichier n’est pas un fichier JSON valide. |
| steps.errors.notStepsFile | This file is not a list of prayer steps. | Ce fichier n’est pas une liste d’étapes de prière. |
| steps.errors.isCalendarFile | This is a calendar file. Import it in Settings, Calendar. | C’est un fichier de calendrier. Importez-le dans Réglages, Calendrier. |
| steps.errors.newerVersion | This list was made with a newer version of the app. Update the app and try again. | Cette liste vient d’une version plus récente de l’application. Mettez-la à jour et réessayez. |
| steps.errors.tooLarge | This file is too large. | Ce fichier est trop volumineux. |
| steps.errors.unknown | The file could not be read. | Le fichier n’a pas pu être lu. |
| calendar.errors.isStepsFile | This is a list of prayer steps. Import it in Settings, Prayer steps. | C’est une liste d’étapes de prière. Importez-la dans Réglages, Étapes de la prière. |

## 8. Edge cases

- No calendar, or no sunrise for the plan day: home shows `countdown.noTime` as today; editor hides clock column.
- Plan day: same rule as `resolveTarget` (today until sunrise + 2 h, then tomorrow). Steps are computed from that
  day's sunrise with local `Date` arithmetic (`new Date(sunrise.getTime() + offset * 1000)`); DST is already in the
  calendar value and no step crosses midnight within the allowed range.
- List edited while the countdown runs: plan recomputes reactively; peek resets to live.
- App in background / phone locked: on return the current step is recomputed from the clock.
- Two steps 1 s apart: the first shows "00:00" then the next one; no skipped tick logic needed.
- Label with mixed Hebrew/Latin and digits ("שמע 2"): shown with `dir="auto"` and `<bdi>`; no reordering bugs.
- Pasted text from WhatsApp containing bidi marks or NBSP: cleaned before parsing (§3.5 step 1).
- Import of a file whose every item is invalid: preview shows all errors, Apply disabled.
- `navigator.share` exists but rejects files (desktop Chrome): `canShare` false → download.

## 9. Acceptance criteria

1. Given a fresh install, when the user imports a calendar, then the home screen is identical to today (no dots,
   no nav, same texts and colors).
2. Given steps Kaddish −21:00, Hodu −17:30, Yishtabach −6:00 and sunrise 06:16:45, when now is 05:50:00, then the
   display shows "05:45 until Kaddish" and bottom line "Kaddish 05:55:45".
3. Given the same list, when the clock reaches 05:55:45, then the display switches to Hodu within one tick.
4. Given the app opens at 06:12:00, then the current step is sunrise, and swiping right shows Yishtabach "+01:15"
   with the Preview chip.
5. Given peek mode, when 8 s pass without touch, then the display returns to live.
6. Given the editor, when the user enters "Hodu" twice, then Save is disabled and `labelDuplicate` is shown.
7. Given the editor, when the user enters 121 minutes before, then `offsetRange` is shown.
8. Given the editor row for Kaddish, then it reads "Kaddish −21:00 → 05:55:45".
9. Given the sunrise row, then there is no Delete button, and renaming it to "Amida" changes the home label.
10. Given the paste text "Kaddish\t-21:00\nHodu, -17:30\n21 min before: Kaddish\nfoo", then the preview shows
    lines 1–2 valid, line 3 `labelDuplicate`, line 4 `noOffset`, and Apply (2).
11. Given an existing list and Merge, when a pasted line has an existing name, then that step is updated and no
    step is removed. With Replace, steps not in the paste are removed.
12. Given a calendar JSON in the steps importer, then `isCalendarFile` is shown; given a steps file in the
    calendar importer, then `calendar.errors.isStepsFile` is shown. Nothing is stored in either case.
13. Given iOS Safari with file sharing, when the user taps Export / share, then the share sheet opens with
    `netz-steps-<slug>.json`; elsewhere the file downloads.
14. Given an exported file imported with Replace on another phone, then both phones show the same list.
15. Given a Hebrew label, then it displays right-to-left in the editor, preview table and home screen, and the
    French sentence "avant קדיש" keeps the label at the end.
16. Given steps exist and black background is on, then only the number is colored, per step.

## 10. Open questions for the product owner

1. "Sunrise is always the last step" vs the requested range up to +60 min: keep after-sunrise steps (this spec
   allows them), or limit offsets to ≤ 0?
2. Unsigned offsets ("Yishtabach 6") are read as before sunrise. OK?
3. Default warning for intermediate steps: 2 min clamped to the gap since the previous step. OK?
4. Auto-dim/close: at sunrise, or after the last step when after-sunrise steps exist?
5. Should Export also offer "Copy as text" (the paste format) for sending the list as a WhatsApp message?
6. Return-to-live delay: 8 s fixed, or a setting?
