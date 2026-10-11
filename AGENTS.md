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
- `data/`: everything the user made (characters, chats, lorebooks, settings),
  under `data/root/default-user/`. Never delete or rewrite it wholesale.
- `node_modules/sillytavern/`: the program. Read it to learn how something
  works. Do not edit it: the next version replaces it.

## Changing what the app holds

Characters and lorebooks are changed through the program's own API, with the
`app_request` tool. Load the `tavern-api` skill first: it has the routes and
the token every change needs.

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
