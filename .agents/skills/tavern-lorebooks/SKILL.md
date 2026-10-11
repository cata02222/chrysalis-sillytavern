---
name: tavern-lorebooks
description: Make, read, edit, import and delete lorebooks (world info) and their entries in this SillyTavern, and turn a book on for every chat, one character, one chat or one persona. Has the full entry shape with what each field means. Load it before any lorebook or world info work here.
---

# Lorebooks (world info)

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Get the token once: `app_request { route: "/csrf-token" }` answers
  `{"token":"..."}`. Send it on every POST as
  `headers: { "X-CSRF-Token": "<token>" }`. A `403` means it went stale: fetch
  a new one and repeat the call.
- Routes are POST with a `json` body unless said otherwise.
- The open page reads its list of books once. Set `reload: true` on the last
  call of a job that added or removed a book, or changed one the user may have
  open in the editor.
- The user's files are in `data/root/default-user/` in this app's folder ("the
  data folder" below). They are not in git: there is nothing to commit.

## Books

A book is `worlds/<Name>.json` in the data folder, and its name is that file
name without `.json`.

- **Which exist:** `/api/worldinfo/list` with `{}` answers
  `[{ "file_id": "Book", "name": "Book", "extensions": {} }]`.
- **Read one:** `/api/worldinfo/get` with `{ "name": "Book" }`, or read the
  file itself.
- **Create or replace:** `/api/worldinfo/edit` with
  `{ "name": "Book", "data": { "entries": { "0": { ... }, "1": { ... } } } }`.
  The answer is `{"ok":true}`. This writes the whole book: to change one entry,
  read the book, change it and send all of it back. A new name makes a new
  book.
- **Import a book file** the user put in the workspace:
  `route: "/api/worldinfo/import"`, `files: { "avatar": "<path to the json>" }`
  (the field really is called `avatar`). The path starts at the user's folder.
  The answer is `{"name":"<file name without .json>"}`.
- **Delete:** `/api/worldinfo/delete` with `{ "name": "Book" }`, after asking.
- **Rename:** there is no route. Save it under the new name, delete the old
  one, and repoint whatever named it (see "Turning a book on").

## An entry

Entries are keyed by their `uid`, counted from 0. A full entry with the
program's own defaults:

```json
{
  "uid": 0,
  "key": ["harbor", "docks"],
  "keysecondary": [],
  "comment": "Harbor",
  "content": "The harbor freezes in winter.",
  "constant": false,
  "vectorized": false,
  "selective": true,
  "selectiveLogic": 0,
  "addMemo": true,
  "order": 100,
  "position": 0,
  "disable": false,
  "ignoreBudget": false,
  "excludeRecursion": false,
  "preventRecursion": false,
  "delayUntilRecursion": false,
  "probability": 100,
  "useProbability": true,
  "depth": 4,
  "group": "",
  "groupOverride": false,
  "groupWeight": 100,
  "scanDepth": null,
  "caseSensitive": null,
  "matchWholeWords": null,
  "useGroupScoring": null,
  "automationId": "",
  "role": 0,
  "sticky": 0,
  "cooldown": 0,
  "delay": 0,
  "displayIndex": 0,
  "triggers": []
}
```

Send every field: one left out is not filled in for you. When the book already
has entries, copy the shape of one of them.

What the ones that matter do:

- `comment`: the entry's title in the editor. `content`: the text the model
  gets.
- `key`: words that switch the entry on when one appears in the recent
  messages. A key written as `/pattern/i` is a regular expression.
- `constant: true`: always on, keys ignored. `disable: true`: off.
- `keysecondary` with `selectiveLogic`: a second list that must also agree.
  0 any of them appears, 1 not all of them appear, 2 none of them appears,
  3 all of them appear. An empty list means no second test.
- `position`: where the text goes. 0 before the character's description,
  1 after it, 2 top of the author's note, 3 bottom of the author's note,
  4 inside the chat at `depth` messages from the end (as `role`: 0 system,
  1 user, 2 assistant), 5 before the example messages, 6 after them.
- `order`: among entries at the same position, a higher number lands closer to
  the end of the prompt, so it weighs more.
- `probability` with `useProbability`: the chance in percent that a matched
  entry is used.
- `scanDepth`, `caseSensitive`, `matchWholeWords`: `null` follows the page's
  global setting, a value overrides it for this entry.
- `excludeRecursion`: other entries' text cannot switch this one on.
  `preventRecursion`: this one's text cannot switch others on.
- `group`: of the matched entries sharing a group name only one is used,
  picked by chance weighted with `groupWeight`.
- `sticky`, `cooldown`, `delay`: counted in messages. Stay on for that many
  after a match, stay off for that many after, do nothing until the chat has
  that many.
- `displayIndex`: the row's place in the editor. Give each its `uid`.

## Turning a book on

Making a book does not switch it on. Ask which the user means if it is not
clear, and say which you did:

- **For one character:** `/api/characters/merge-attributes` with
  `{ "avatar": "Mira.png", "data": { "extensions": { "world": "Book" } } }`.
- **For every chat:** the list of names at
  `world_info_settings.world_info.globalSelect` in the settings file. Load
  `tavern-settings` and follow its rule for editing that file.
- **For one chat:** `chat_metadata.world_info` on the first line of the chat
  file holds the book's name. See `tavern-chats`.
- **For one persona:** its `lorebook` field. See `tavern-personas`.

How deep the scan reads, the budget and recursion are also in the settings
file, under `world_info_settings` (`world_info_depth`, `world_info_budget`,
`world_info_recursive`, ...).
