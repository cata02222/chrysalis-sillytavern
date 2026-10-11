# SillyTavern, as a Chrysalis service app

This app is a thin wrapper. The program itself is the `sillytavern` npm
package, pinned in `package.json` and installed into `node_modules/` by the
manifest's setup step. The engine starts `start.js`, which prepares a few
things and then hands over to the server.

## What is where

- `manifest.json`: how the engine runs it. A change to `command`, `setup` or
  `env` needs the admin to allow the program again, so say so before editing
  those.
- `package.json`: the one line that decides which version runs.
- `start.js`: runs before the server on every start. It writes the engine's
  model address and key into the server's settings (once, then it is the
  user's to change) and links `extensions/` (below).
- `extensions/`: your own extensions, one folder each. This is where changes
  to how the app looks or behaves belong.
- `data/`: everything the user made (characters, chats, lorebooks, presets,
  settings), under `data/root/default-user/`. Never delete or rewrite it
  wholesale. It is not kept in git, so there is nothing to commit after
  changing it. `secrets.json` there holds keys: never read it out or print it.
- `node_modules/sillytavern/`: the program. Read it to learn how something
  works. Do not edit it: the next version replaces it. The shell and `grep` do
  not see this folder. Only `read_file` with an exact path does (it also lists
  a folder), so do not search for it, open it:
  - `node_modules/sillytavern/src/endpoints/<area>.js`: the routes under
    `/api/<area>/`. Areas: `characters`, `chats`, `worldinfo`, `presets`,
    `settings`, `avatars`, `groups`, `backgrounds`, `themes`, `quick-replies`,
    `extensions`, `secrets`, `content-manager`.
  - `node_modules/sillytavern/public/scripts/`: what the page does.

## Changing what the app holds

What the user made is read and changed through the program's own API with the
`app_request` tool, and for a few things by editing a file in `data/`. Load the
skill for the job before the first call. Each has the routes, the bodies and
the file shapes, so nothing has to be worked out from the source:

- `tavern-characters`: make, edit, copy, rename, import, delete a character,
  change its picture.
- `tavern-lorebooks`: make and edit a lorebook (world info) and its entries,
  and turn a book on everywhere, for one character or for one chat.
- `tavern-presets`: presets and the prompt list of the chat completion
  panel, samplers, instruct and context templates, system prompts.
- `tavern-personas`: the user's personas.
- `tavern-chats`: read, write, rename and delete chats.
- `tavern-settings`: everything kept in the settings file: tags, regex
  scripts, any option of the page. Themes, quick replies, backgrounds and
  groups are pointed to from there.

What holds for every call:

- Get the token once with `app_request { route: "/csrf-token" }` and send it on
  every POST, the ones that only read as well, as
  `headers: { "X-CSRF-Token": "<token>" }`. A `403` means the header was left
  out or the token went stale: fetch a new one and repeat the call.
- The open page reads its lists once. Set `reload: true` on the last call of a
  job that added, renamed or removed something. To only refresh the page, call
  `/csrf-token` again with `reload: true`. With no page open there is nothing
  to refresh, and the change shows the next time the user opens the tab.
- Reading a file in `data/` with `read_file`, or with `jq` in the shell, is
  quicker than asking the API and is never cut off. The tool cuts a long
  answer, so do not ask the API for everything at once
  (`/api/characters/all`, `/api/settings/get`).
- A character's `.png` holds its card inside the picture. Never decode one in
  the shell: ask the API for the card.
- Do not guess a route or a body. One that no skill lists is read from its
  endpoint file first.

## Changing how the app looks or behaves

Write an extension in `extensions/<name>/`:

```
extensions/<name>/manifest.json   { "display_name": "...", "js": "index.js", "css": "style.css", "loading_order": 100, "author": "...", "version": "1.0.0" }
extensions/<name>/index.js        a module the page loads at start
extensions/<name>/style.css       optional
```

- A new folder is picked up at the next start of the program, so ask the user
  to press Restart in the app's tab after adding one.
- After that, edits are live: a saved stylesheet swaps in place, a change
  inside a function of `index.js` is swapped into the open page, and a change
  to top-level code reloads the page.
- `index.js` can import from the page's own modules, for example
  `import { eventSource, event_types } from "../../../../script.js";` and
  `import { getContext } from "../../../extensions.js";`.
- Code that runs once at load shows its change only after a reload. Put
  behaviour in functions and handlers.

## Moving to a new version

Change the version in `package.json` and the `version` in `manifest.json` to
match, then ask the user to press Restart. Setup installs the new version
before the program starts again. `data/` and `extensions/` are untouched.
`start.js` relies on a few names in the server's settings files; if a new
version stops connecting to the models by itself, that is the place to look.
