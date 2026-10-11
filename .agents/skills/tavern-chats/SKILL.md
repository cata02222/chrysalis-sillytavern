---
name: tavern-chats
description: Read, search, write, start, rename and delete chats in this SillyTavern, edit or add messages in one, and set what belongs to a single chat (its lorebook, author's note). Load it before reading a conversation the user had here or changing one.
---

# Chats

## Every call

Calls are made with the `app_request` tool, with `id` set to this app's id. The
program must be running: if the tool says it is not, ask the user to open the
app's tab.

- Get the token once: `app_request { route: "/csrf-token" }` answers
  `{"token":"..."}`. Send it on every POST, the ones that only read as well,
  as `headers: { "X-CSRF-Token": "<token>" }`. A `403` means the header was
  left out or the token went stale: fetch a new one and repeat the call.
- Routes are POST with a `json` body.
- The user's files are in `data/root/default-user/` in this app's folder ("the
  data folder" below). They are not in git: there is nothing to commit.

## Where they are

`chats/<character file name without .png>/<chat name>.jsonl` in the data
folder. A character's chats are in the folder named after its picture file,
which is not always its display name. Group chats are in `group chats/`.

- **Which chats a character has:** list its folder with `read_file`, or
  `/api/characters/chats` with `{ "avatar_url": "Mira.png" }`, which adds the
  message count and the last message of each.
- **Which one is open for it:** the `chat` field of the character's card.

## Reading

Read the file. It is one JSON object per line:

- Line 1 is the header:
  `{"chat_metadata":{...},"user_name":"unused","character_name":"unused"}`.
- Every other line is a message:

  ```json
  { "name": "Mira", "is_user": false, "is_system": false, "send_date": "2026-01-05T18:30:00.000Z", "mes": "The text.", "extra": {} }
  ```

  `is_user` true is the user's own message, under their persona's name.
  `is_system` true is a message hidden from the model. A reply with
  alternatives also has `swipes` (every version) and `swipe_id` (which one
  `mes` is).

For a long chat use the shell instead of reading all of it:

```sh
tail -n 20 "chats/Mira/<chat>.jsonl" | jq -r '"\(.name): \(.mes)"'
grep -n -i "harbor" "chats/Mira/<chat>.jsonl" | cut -c1-300
```

`/api/chats/get` with `{ "avatar_url": "Mira.png", "file_name": "<chat name without .jsonl>" }`
answers the same lines as a list, but a long chat is cut off there.

## Writing

`/api/chats/save` with

```json
{
  "avatar_url": "Mira.png",
  "file_name": "<chat name without .jsonl>",
  "force": true,
  "chat": [ { "chat_metadata": {}, "user_name": "unused", "character_name": "unused" }, { "name": "Mira", "is_user": false, "is_system": false, "send_date": "2026-01-05T18:30:00.000Z", "mes": "Hello.", "extra": {} } ]
}
```

The answer is `{"ok":true}`. It writes the whole chat: the header first, then
every message. To change part of a chat, read it, change it and send all of
it. A long chat does not fit in a call. Edit its file in the shell instead,
one line per message, keeping line 1.

- Never rewrite a chat the user did not ask you to touch, and keep every
  message you were not asked to change exactly as it was, `extra` and `swipes`
  included.
- When you change `mes` of a message that has `swipes`, change
  `swipes[swipe_id]` to match.
- If the chat is the one open in the page, set `reload: true` on the save (or
  refresh with `/csrf-token` and `reload: true` after a shell edit). The page
  holds the open chat in memory and writes it back whole after the next
  message, which would undo your change.

## Start a new chat

Save a chat under a new `file_name` whose only message is the character's
greeting (`first_mes` of its card, from the character). Then make it the one
that opens: `/api/characters/merge-attributes` with
`{ "avatar": "Mira.png", "chat": "<the new chat name>" }` and `reload: true`.

## Rename, delete

- **Rename:** `/api/chats/rename` with
  `{ "avatar_url": "Mira.png", "original_file": "Old.jsonl", "renamed_file": "New.jsonl" }`.
  Here the names carry `.jsonl`. If it was the open chat, also set the
  character's `chat` to the new name (without `.jsonl`).
- **Delete:** `/api/chats/delete` with
  `{ "avatar_url": "Mira.png", "chatfile": "Old.jsonl" }`, after asking. A
  deleted chat does not come back.

## What belongs to one chat

Kept in `chat_metadata` on line 1:

- `world_info`: the name of a lorebook switched on for this chat only.
- `note_prompt`: the author's note text, with `note_interval` (every how many
  messages, 1 is always, 0 is never), `note_position` (0 after the main
  prompt, 1 inside the chat, 2 before the main prompt), `note_depth` (for
  position 1, how many messages from the end) and `note_role` (0 system,
  1 user, 2 assistant).

Change them by saving the chat with a changed header.
