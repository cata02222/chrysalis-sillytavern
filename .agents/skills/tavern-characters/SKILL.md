---
name: tavern-characters
description: Make, read, edit, copy, rename, import and delete characters in this SillyTavern, change a character's picture, link a lorebook to one and list its chats, through the program's own API with app_request. Load it before any work on a character card here.
---

# Characters

## Every call

All of this is done with the `app_request` tool, with `id` set to this app's
id. The program must be running: if the tool says it is not, ask the user to
open the app's tab.

- Get the token once: `app_request { route: "/csrf-token" }` answers
  `{"token":"..."}`. Send it on every POST, the ones that only read as well,
  as `headers: { "X-CSRF-Token": "<token>" }`. A `403` means the header was
  left out or the token went stale: fetch a new one and repeat the call.
- Routes are POST with a `json` body unless said otherwise.
- The open page reads its lists once. Set `reload: true` on the last call of a
  job that added, renamed or removed a character.
- The user's files are in `data/root/default-user/` in this app's folder ("the
  data folder" below). They are not in git: there is nothing to commit.

## What a character is

One `Name.png` in `characters/` of the data folder. The card is stored inside
the picture, and the file name is the character's id in every route
(`avatar_url` or `avatar`). Never open the picture to read the card, with
`read_file` or in the shell: it is not text, and decoding it in the shell is
slow and can hang. Ask the API.

- **Which exist:** list `characters/` in the data folder with `read_file`. Do
  not call `/api/characters/all`: it returns every card in full and is cut off.
- **Read one:** `/api/characters/export` with
  `{ "avatar_url": "Mira.png", "format": "json" }`. The card comes back once,
  with its text under `data` (`data.description`, `data.first_mes`, ...).
  `/api/characters/get` answers with the same card twice over, so prefer export.

## Create

`/api/characters/create` with

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
The character starts with the stock picture; see "Picture" for its own.

`{{char}}` and `{{user}}` in any text stand for the two names. `mes_example`
is example dialogue, each exchange started by a line holding only `<START>`.

## Change

`/api/characters/merge-attributes` with `"avatar": "Mira.png"` and only the
fields that change. The answer is `OK`. A card keeps most text twice, at the
top and under `data`: send both, for example

```json
{ "avatar": "Mira.png", "description": "new", "data": { "description": "new" } }
```

Fields that live only under `data`: `alternate_greetings`, `system_prompt`,
`post_history_instructions`, `creator`, `character_version`, `tags`,
`creator_notes` (shown at the top as `creatorcomment`). A list is replaced
whole, so send every greeting, not only the new one.

- **Link a lorebook** (it then switches on whenever this character talks):
  `{ "avatar": "Mira.png", "data": { "extensions": { "world": "Book" } } }`.
  An empty string unlinks it.
- **Choose which chat opens:** `{ "avatar": "Mira.png", "chat": "<chat file name without .jsonl>" }`.

## Picture

`/api/characters/edit-avatar` as a form: `form: { "avatar_url": "Mira.png" }`
and `files: { "avatar": "<path to a png or jpg>" }`. The path starts at
the user's folder, so a file in this app is `apps/<this app's id>/...`. The
answer is `OK`. The card inside the old picture is kept.

## Copy, rename, delete

- **Copy:** `/api/characters/duplicate` with `{ "avatar_url": "Mira.png" }`
  answers `{"path":"Mira_1.png"}`.
- **Rename:** `/api/characters/rename` with
  `{ "avatar_url": "Mira.png", "new_name": "Mirabel" }` answers
  `{"avatar":"Mirabel.png"}`. The chats move with it. Use the new file name
  from then on.
- **Delete:** `/api/characters/delete` with
  `{ "avatar_url": "Mira.png", "delete_chats": false }`. Ask the user first,
  and ask separately before deleting the chats.

## Import a card file

A card the user put in the workspace (png, json, yaml, charx):
`route: "/api/characters/import"`, `form: { "file_type": "png" }`,
`files: { "avatar": "<path to the file>" }`. The answer is
`{"file_name":"Name"}` (add `.png` for the id).

## Its chats

`/api/characters/chats` with `{ "avatar_url": "Mira.png" }` answers a list of
`{ file_id, file_name, chat_items, mes, last_mes }`, one per chat (`mes` is the
last message). Reading and writing a chat is in the `tavern-chats` skill.

## Tags

The `tags` on a card travel with the file but are not the tag chips the page
shows and filters by. Those live in the settings file: load `tavern-settings`
and follow "Tags" there.
