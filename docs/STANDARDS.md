# Project standards: Netz Countdown

## Stack

- Vue 3 with `<script setup lang="ts">` and the Composition API only.
- Vuetify 3 for UI components. Icons come from `@mdi/js` (SVG, tree-shaken), not the icon font.
- Pinia for state (setup-store syntax).
- vue-i18n (Composition mode, `legacy: false`). English is the default and fallback; French is supported.
- Vite + `vite-plugin-pwa` for the build and the service worker.
- TypeScript in `strict` mode. No `any` unless the value comes from untrusted input and is validated right after.

## Folder layout

| Folder | Content |
|---|---|
| `src/components` | Presentational and small feature components |
| `src/views` | Route-level screens |
| `src/stores` | Pinia stores (state + persistence) |
| `src/services` | Pure TypeScript logic, no Vue imports (parsing, time math, colors) |
| `src/composables` | Reusable Vue logic with lifecycle (`useNow`, `useWakeLock`) |
| `src/locales` | One JSON file per language, same keys in every file |
| `src/plugins` | Vuetify, i18n and other app-level setup |
| `docs` | Project documentation, including this file |
| `shortcut` | The older Apple Shortcut version, kept for reference |

## Components

- Keep components under 200-300 lines. Split when a component grows past that.
- Never add a new feature as a big block inside an existing large component; put it in its own file.
- Props are typed with `defineProps<...>()`; events with `defineEmits<...>()`.
- Business logic lives in `services` so it can be tested without Vue.

## Text and languages

- No user-facing text in templates or scripts. Every string goes through `t()` / `$t()`.
- Add every new key to **all** locale files (`en.json`, `fr.json`) in the same change.
- Keys are grouped by feature (`countdown.*`, `settings.*`, `calendar.*`).

## Data and privacy

- The community calendar (`zmanimData.json`, PDFs) is private. It is never committed, never deployed, and never sent to a server. `.gitignore` blocks it.
- Each user imports the file on their own device. It is stored in `localStorage` only.
- Validate imported files at the boundary (`services/calendarParser.ts`) before storing them.
- Times in the calendar are local Israel time with daylight saving already applied. Build `Date` objects from local components; never convert through UTC.

## Styling

- Prefer Vuetify props and utility classes. Use scoped styles for layout that Vuetify does not cover.
- Countdown colors are computed in `services/countdown.ts`, not hard-coded in components.
- Support both display styles: colored background, or black background with only the number colored (OLED friendly).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run type-check` | `vue-tsc` type check |
| `npm run build` | Type check, then production build into `dist` |
| `npm run deploy` | Build, then publish `dist` to the `gh-pages` branch |

## Git

- Small commits with a short imperative message ("Add French locale").
- Do not commit `dist`, `node_modules`, or any calendar data.
