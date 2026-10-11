---
name: tavern-api
description: Read and change what this SillyTavern holds (characters, lorebooks) through its own API with app_request. Load it before creating, editing, importing or deleting a character or a lorebook here.
---

# Working inside SillyTavern through its API

Everything below is done with the `app_request` tool, with `id` set to this
app's id. The program must be running: if the tool says it is not, ask the user
to open the app's tab.

## Before the first change: the token

Every POST needs a token, and the token belongs to the session cookie the tool
keeps for you.

1. `app_request { route: "/csrf-token" }` answers `{"token":"..."}`.
2. Send it on every POST as `headers: { "X-CSRF-Token": "<token>" }`.
3. A `403` on a POST means the token is stale: fetch a new one and repeat.

All routes below are POST with a `json` body unless said otherwise.

## Showing the change

The open page reads its lists once. After a call that adds, renames or removes
a character or a lorebook, set `reload: true` on that call (on the last one,
when you make several). What the user had typed is put back after the reload.

## Characters

A character is one `Name.png` file. That file name is its id in every route
(`avatar_url` or `avatar`).

- **Which exist:** list the folder `data/root/default-user/characters/` in this
  app with `read_file`. Do not call `/api/characters/all` for this: it returns
  every character in full and is cut off.
- **Read one:** `/api/characters/get` with `{ "avatar_url": "Name.png" }`.
- **Create:** `/api/characters/create` with

  ```json
  {
    "ch_name": "Mira",
    "description": "Who they are, as the model reads it.",
    "personality": "",
    "scenario": "",
    "first_mes": "Their opening message.",
    "mes_example": "",
    "creator_notes": "",
    "system_prompt": "",
    "post_history_instructions": "",
    "tags": ["tag"],
    "creator": "",
    "character_version": "",
    "alternate_greetings": [],
    "talkativeness": "0.5",
    "fav": "false"
  }
  ```

  The answer is the new file name as plain text (`Mira.png`). A name already
  taken gets a number added, so read the answer rather than assuming the name.
- **Change:** `/api/characters/merge-attributes` with `"avatar": "Name.png"` and
  only the fields that change. A card keeps most text twice, at the top and
  under `data`: send both, for example
  `{ "avatar": "Mira.png", "description": "new", "data": { "description": "new" } }`.
  Fields that live only under `data`: `alternate_greetings`, `system_prompt`,
  `post_history_instructions`, `creator`, `character_version`, `tags`,
  `creator_notes` (shown at the top as `creatorcomment`).
- **Delete:** `/api/characters/delete` with
  `{ "avatar_url": "Name.png", "delete_chats": false }`. Ask the user first, and
  ask separately before deleting chats.
- **Import a card file** from the workspace (png, json, yaml, charx):
  `app_request` with `route: "/api/characters/import"`,
  `form: { "file_type": "png" }` and `files: { "avatar": "<path to the file>" }`.
  The answer is `{"file_name":"Name"}`.

## Lorebooks

- **Which exist:** `/api/worldinfo/list` with `{}`.
- **Read one:** `/api/worldinfo/get` with `{ "name": "Book" }`.
- **Create or replace:** `/api/worldinfo/edit` with
  `{ "name": "Book", "data": { "entries": { "0": { ... }, "1": { ... } } } }`.
  This writes the whole book. To change one entry, read the book, change it,
  and send all of it back. Each entry is keyed by its `uid` and looks like

  ```json
  {
    "uid": 0,
    "key": ["harbor", "docks"],
    "keysecondary": [],
    "comment": "Harbor",
    "content": "The harbor freezes in winter.",
    "constant": false,
    "selective": true,
    "selectiveLogic": 0,
    "order": 100,
    "position": 0,
    "disable": false,
    "probability": 100,
    "useProbability": true,
    "depth": 4,
    "group": "",
    "excludeRecursion": false,
    "preventRecursion": false
  }
  ```

  `comment` is the entry's title, `constant: true` means always on, `position`
  0 is before the character's text and 1 after it. When the book already has
  entries, copy the shape of one of them, so fields this list leaves out keep
  their meaning.
- **Delete:** `/api/worldinfo/delete` with `{ "name": "Book" }`, after asking.

## Anything else

Routes are grouped by area under `/api/<area>/` and defined in
`node_modules/sillytavern/src/endpoints/<area>.js` in this app. Read the route
there before calling one this page does not list, and never guess a body.
