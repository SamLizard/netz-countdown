import type { StepsList } from '@/types';
import {
  formatOffset,
  labelErrors,
  MAX_STEPS,
  NAME_MAX,
  newStepId,
  normalizeLabel,
  offsetRangeError,
  sunriseDisplayLabel,
  type StepError
} from './steps';

/** One line of a pasted list, or one item of an imported file. */
export interface ParsedLine {
  lineNo: number;
  raw: string;
  label?: string;
  offsetSeconds?: number;
  error?: StepError;
}

export type PreviewStatus = 'new' | 'updated' | 'unchanged' | 'error';

export interface PreviewRow {
  lineNo: number;
  label: string;
  offsetSeconds?: number;
  status: PreviewStatus;
  error?: StepError;
}

export type MergeMode = 'merge' | 'replace';

export type StepsFileErrorCode = 'tooLarge' | 'invalidJson' | 'isCalendarFile' | 'notStepsFile' | 'newerVersion' | 'unknown';

export class StepsError extends Error {
  constructor(public readonly code: StepsFileErrorCode) {
    super(code);
  }
}

export const STEPS_FILE_KIND = 'netz.steps';
export const PASTE_MAX_CHARS = 5000;
export const PASTE_MAX_LINES = 50;
export const MAX_STEPS_INPUT_LENGTH = 100 * 1024;

interface ParsedSteps {
  name: string;
  items: ParsedLine[];
}

// ---------------------------------------------------------------------------------------------
// Offset expression: [direction] [sign] number [unit] [direction], or a "sunrise" word (= 0).

const BEFORE = 'before|avant|לפני';
const AFTER = 'after|après|apres|אחרי';
const END = '(?![\\p{L}\\p{N}])';
const MIN_UNIT = `(?:minutes?|min|mn|m|דקות|דק'?|')${END}`;
const SEC_UNIT = `(?:secondes?|seconds?|sec|s|שניות|")${END}`;
const CORE =
  `(?:(\\d{1,3})\\s*${MIN_UNIT}\\s*(\\d{1,2})\\s*${SEC_UNIT}` + // 17 min 30 s, 17m30s
  `|(\\d{1,3})\\s*${SEC_UNIT}` + // 45 s
  `|(\\d{1,3})(?:[:'.](\\d{2})(?!\\d)|\\.(\\d)(?!\\d))?(?:\\s*${MIN_UNIT})?)`; // 21, 17:30, 17.5, 21 min
const EXPR =
  `(?:(?:(${BEFORE}|${AFTER})${END}\\s*)?([-−–—+])?\\s*${CORE}(?:\\s*(${BEFORE}|${AFTER})${END})?` +
  `|(at sunrise|au lever|netz|נץ)${END})`;

// No lookbehind: it is a syntax error on iOS Safari before 16.4. The "at end" search scans start positions instead.
const FULL_RE = new RegExp(`^${EXPR}$`, 'iu');
const AT_START_RE = new RegExp(`^${EXPR}${END}`, 'iu');
const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
const AFTER_RE = new RegExp(`^(?:${AFTER})$`, 'iu');

/** Characters removed from both ends of the label where it joins the offset. */
const SEPARATORS = /^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/gu;

type OffsetResult = { seconds: number } | { error: StepError };

/** Removes BOM and bidi marks, turns NBSP into spaces, trims. */
export function cleanLine(text: string): string {
  return text
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function fromMatch(m: RegExpExecArray): OffsetResult {
  if (m[10]) return { seconds: 0 };
  const [dirBefore, sign, minA, secA, secOnly, minC, secC, tenthC, dirAfter] = m.slice(1, 10);
  let seconds: number;
  if (minA !== undefined) {
    if (Number(secA) > 59) return { error: { code: 'secondsRange' } };
    seconds = Number(minA) * 60 + Number(secA);
  } else if (secOnly !== undefined) {
    seconds = Number(secOnly);
  } else {
    if (secC !== undefined && Number(secC) > 59) return { error: { code: 'secondsRange' } };
    seconds = Number(minC) * 60 + (secC !== undefined ? Number(secC) : tenthC !== undefined ? Number(tenthC) * 6 : 0);
  }

  const words = [dirBefore, dirAfter].filter((w): w is string => !!w);
  const after = words.some((w) => AFTER_RE.test(w));
  const before = words.some((w) => !AFTER_RE.test(w));
  const plus = sign === '+';
  const minus = sign !== undefined && !plus;
  if ((after && before) || (plus && before) || (minus && after)) return { error: { code: 'conflictSign' } };
  // Unsigned = before sunrise (most steps are before; the preview shows the sign).
  return { seconds: plus || after ? seconds : -seconds };
}

/** Parses a cell that must be only an offset. Null when it is not an offset at all. */
export function parseOffset(text: string): OffsetResult | null {
  const m = FULL_RE.exec(cleanLine(text));
  return m ? fromMatch(m) : null;
}

function splitLine(line: string): { label: string; offset: OffsetResult | null } {
  const lastTab = line.lastIndexOf('\t');
  if (lastTab >= 0) {
    const offset = parseOffset(line.slice(lastTab + 1));
    if (offset) return { label: line.slice(0, lastTab).trim(), offset };
  }
  const tab = line.indexOf('\t');
  if (tab >= 0) {
    const a = line.slice(0, tab).trim();
    const b = line.slice(tab + 1).trim();
    const offA = parseOffset(a);
    if (offA) return { label: b, offset: offA };
    return { label: a, offset: null };
  }
  // Offset at the end: earliest start (longest expression) that begins a word and runs to the end of the line.
  for (let i = 1; i < line.length; i++) {
    if (WORD_CHAR_RE.test(line[i - 1])) continue;
    const end = FULL_RE.exec(line.slice(i));
    if (end) return { label: line.slice(0, i).replace(SEPARATORS, ''), offset: fromMatch(end) };
  }
  const start = AT_START_RE.exec(line);
  if (start) return { label: line.slice(start[0].length).replace(SEPARATORS, ''), offset: fromMatch(start) };
  return { label: line, offset: null };
}

/** Checks one item: label, offset, and the range. Offset 0 is allowed (it renames sunrise). */
function checkItem(item: ParsedLine): ParsedLine {
  if (item.error) return item;
  if (item.offsetSeconds === undefined) return { ...item, error: { code: 'noOffset' } };
  if (!item.label) return { ...item, error: { code: 'noLabel' } };
  const labelError = labelErrors(item.label)[0];
  if (labelError) return { ...item, error: labelError };
  const range = offsetRangeError(item.offsetSeconds);
  return range ? { ...item, error: range } : item;
}

/** Second item with the same name or offset as an earlier valid item gets the error. */
function markDuplicates(items: ParsedLine[]): ParsedLine[] {
  const labels = new Set<string>();
  const offsets = new Map<number, string>();
  return items.map((item) => {
    if (item.error || item.label === undefined || item.offsetSeconds === undefined) return item;
    const key = normalizeLabel(item.label);
    if (labels.has(key)) return { ...item, error: { code: 'labelDuplicate' } };
    const other = offsets.get(item.offsetSeconds);
    if (other !== undefined) return { ...item, error: { code: 'offsetDuplicate', params: { label: other } } };
    labels.add(key);
    offsets.set(item.offsetSeconds, item.label);
    return item;
  });
}

/** One step per line: a name and an offset, in either order, or two tab-separated cells. */
export function parsePastedText(text: string): ParsedSteps {
  if (text.length > PASTE_MAX_CHARS) throw new StepsError('tooLarge');
  const items: ParsedLine[] = [];
  let name = '';
  text.split(/\r\n|\r|\n/).forEach((rawLine, i) => {
    const line = cleanLine(rawLine);
    if (!line) return;
    if (line.startsWith('#') && !line.includes('\t')) {
      if (!name && !items.length && line.startsWith('# ')) name = line.slice(2).trim().slice(0, NAME_MAX);
      return;
    }
    const base = { lineNo: i + 1, raw: rawLine };
    if (items.length >= PASTE_MAX_LINES) {
      items.push({ ...base, error: { code: 'tooMany', params: { max: PASTE_MAX_LINES } } });
      return;
    }
    const { label, offset } = splitLine(line);
    if (offset && 'error' in offset) items.push({ ...base, label, error: offset.error });
    else items.push(checkItem({ ...base, label: label || undefined, offsetSeconds: offset?.seconds }));
  });
  return { name, items: markDuplicates(items) };
}

export function parseStepsInput(text: string): ParsedSteps {
  return /^\s*\{\s*(?:"|}|$)/.test(text) ? parseStepsFile(text) : parsePastedText(text);
}

// ---------------------------------------------------------------------------------------------
// Files

/** Validates a shared steps file. Throws StepsError; per-item problems are returned as item errors. */
export function parseStepsFile(text: string): ParsedSteps {
  if (text.length > MAX_STEPS_INPUT_LENGTH) throw new StepsError('tooLarge');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new StepsError('invalidJson');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new StepsError('notStepsFile');
  const file = raw as Record<string, unknown>;
  if (file.kind === undefined && typeof file.days === 'object' && file.days !== null) throw new StepsError('isCalendarFile');
  if (file.kind !== STEPS_FILE_KIND) throw new StepsError('notStepsFile');
  if (typeof file.schemaVersion === 'number' && file.schemaVersion > 1) throw new StepsError('newerVersion');
  if (file.schemaVersion !== 1 || !Array.isArray(file.steps)) throw new StepsError('notStepsFile');

  const items = file.steps.map((value: unknown, i): ParsedLine => {
    const item = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const label = typeof item.label === 'string' ? cleanLine(item.label) : undefined;
    const offset = Number.isInteger(item.offsetSeconds) ? (item.offsetSeconds as number) : undefined;
    return checkItem({ lineNo: i + 1, raw: JSON.stringify(value) ?? '', label: label || undefined, offsetSeconds: offset });
  });
  const name = typeof file.name === 'string' ? cleanLine(file.name).slice(0, NAME_MAX) : '';
  return { name, items: markDuplicates(items) };
}

const sortedSteps = (list: StepsList) => [...list.steps].sort((a, b) => a.offsetSeconds - b.offsetSeconds);

/** Shared file (StepsFileV1), 2-space JSON. The sunrise item is written only for a custom label. */
export function serializeSteps(list: StepsList, now: Date): string {
  const steps: { label: string; offsetSeconds: number }[] = sortedSteps(list).map((s) => ({ label: s.label, offsetSeconds: s.offsetSeconds }));
  if (list.sunriseLabel) {
    steps.push({ label: list.sunriseLabel, offsetSeconds: 0 });
    steps.sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  }
  return JSON.stringify({ kind: STEPS_FILE_KIND, schemaVersion: 1, name: list.name, steps, exportedAt: now.toISOString() }, null, 2);
}

/** The paste format, for sending the list as a text message. ASCII "-" so any app can paste it back. */
export function stepsToText(list: StepsList): string {
  const lines = sortedSteps(list).map((s) => ({ label: s.label, offsetSeconds: s.offsetSeconds }));
  if (list.sunriseLabel) lines.push({ label: list.sunriseLabel, offsetSeconds: 0 });
  lines.sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  const body = lines.map((l) => `${l.label}\t${formatOffset(l.offsetSeconds, '-')}`);
  return [...(list.name ? [`# ${list.name}`] : []), ...body].join('\n');
}

// ---------------------------------------------------------------------------------------------
// Merge / replace preview

/**
 * Applies parsed items to the current list in memory and reports one row per item.
 * Merge: same names (normalized) are updated, others added, nothing removed.
 * Replace: all non-sunrise steps are replaced; the sunrise label is set only if an item has offset 0.
 */
export function previewMerge(
  current: StepsList,
  items: ParsedLine[],
  mode: MergeMode,
  incomingName = ''
): { rows: PreviewRow[]; result: StepsList; applicable: number } {
  const result: StepsList = {
    name: mode === 'replace' ? incomingName || current.name : current.name || incomingName,
    sunriseLabel: current.sunriseLabel,
    steps: mode === 'merge' ? current.steps.map((s) => ({ ...s })) : []
  };
  const previous = new Map(current.steps.map((s) => [normalizeLabel(s.label), s]));

  const rows = items.map((item): PreviewRow => {
    const label = item.label ?? cleanLine(item.raw);
    const row = { lineNo: item.lineNo, label, offsetSeconds: item.offsetSeconds };
    if (item.error || item.label === undefined || item.offsetSeconds === undefined) {
      return { ...row, status: 'error', error: item.error ?? { code: 'noOffset' } };
    }
    const key = normalizeLabel(item.label);
    const fail = (error: StepError): PreviewRow => ({ ...row, status: 'error', error });

    if (item.offsetSeconds === 0) {
      if (result.steps.some((s) => normalizeLabel(s.label) === key)) return fail({ code: 'labelDuplicate' });
      const same = normalizeLabel(sunriseDisplayLabel(result)) === key;
      result.sunriseLabel = item.label;
      return { ...row, status: same ? 'unchanged' : 'updated' };
    }

    if (normalizeLabel(sunriseDisplayLabel(result)) === key) return fail({ code: 'labelDuplicate' });
    const existing = result.steps.find((s) => normalizeLabel(s.label) === key);
    const clash = result.steps.find((s) => s.offsetSeconds === item.offsetSeconds && s !== existing);
    if (clash) return fail({ code: 'offsetDuplicate', params: { label: clash.label } });
    if (existing) {
      const changed = existing.offsetSeconds !== item.offsetSeconds || existing.label !== item.label;
      existing.offsetSeconds = item.offsetSeconds;
      existing.label = item.label;
      return { ...row, status: changed ? 'updated' : 'unchanged' };
    }
    if (result.steps.length + 1 >= MAX_STEPS) return fail({ code: 'tooMany', params: { max: MAX_STEPS } });

    const before = previous.get(key);
    result.steps.push({ id: before?.id ?? newStepId(), label: item.label, offsetSeconds: item.offsetSeconds });
    const status: PreviewStatus = !before ? 'new' : before.offsetSeconds === item.offsetSeconds && before.label === item.label ? 'unchanged' : 'updated';
    return { ...row, status };
  });

  return { rows, result, applicable: rows.filter((r) => r.status !== 'error').length };
}
