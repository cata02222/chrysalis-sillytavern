---
name: tavern-settings
description: Change anything this SillyTavern keeps in its settings file without the page overwriting it - tags on characters, regex scripts, which lorebooks are on everywhere, any option of the page - and take a backup first. Also points to themes, quick replies, backgrounds and groups. Load it before editing settings.json here or when a settings change did not stick.
---

# Settings

Most of what is not a character, a lorebook, a chat or a preset is one file:
`settings.json` in `data/root/default-user/` of this app's folder ("the data
folder" below). It is not in git: there is nothing to commit.

## Every call

Calls are made with the `app_request` tool, with `id` set to this app's id. The
program must be running: if the tool says it is not, ask the user to open the
app's tab.

- Get the token once: `app_request { route: "/csrf-token" }` answers
  `{"token":"..."}`. Send it on every POST as
  `headers: { "X-CSRF-Token": "<token>" }`. A `403` means it went stale: fetch
  a new one and repeat the call.
- Routes are POST with a `json` body unless said otherwise.

## The rule for editing the file

The open page keeps every setting in memory and writes the whole file back the
next time the user changes anything. An edit made on disk is lost unless the
page reads the file before that. So, always in this order:

1. Back up: `/api/settings/make-snapshot` with `{}` (answers 204, the copy
   lands in `backups/` of the data folder).
2. Edit in the shell, from the data folder, writing a copy first so a failed
   `jq` cannot empty the file:

   ```sh
   jq '.power_user.auto_swipe = true' settings.json > /tmp/s.json && cp /tmp/s.json settings.json
   ```

3. At once, `app_request { route: "/csrf-token", reload: true }`. The page
   reloads and reads the file. What the user had typed is put back.
4. Read the value back (`jq .power_user.auto_swipe settings.json`). If it is
   gone, the page saved in between: do steps 2 and 3 again.

Do the whole job in one edit, not one edit per value. Do not fetch
`/api/settings/get`: it answers with this file plus every preset and is cut
off. Do not send `/api/settings/save` either: it wants the whole file as its
body. Never print `secrets.json`.

## Reading it

The file is tens of thousands of characters. Look at a part, not the whole:

```sh
jq 'keys' settings.json
jq '.power_user | keys' settings.json
jq '.power_user | with_entries(select(.key | test("swipe")))' settings.json
```

Where things are:

- `main_api`: which kind of model connection is in use (`openai` is chat
  completion).
- `oai_settings`: the chat completion panel, live values. See `tavern-presets`.
- `textgenerationwebui_settings`, `kai_settings`, `nai_settings`: the same for
  text completion.
- `power_user`: nearly every option of the page (how messages look, behaviour,
  instruct and context templates, personas).
- `username`, `user_avatar`: the persona in use. See `tavern-personas`.
- `world_info_settings`: lorebook scanning and the books on everywhere.
- `tags`, `tag_map`: tags.
- `extension_settings`: one key per extension. `regex` is the regex scripts.
- `background`: the picture behind the chat.

To find the key behind an option the user names, search the keys for a word of
it, or find the control's id in
`node_modules/sillytavern/public/index.html` with `read_file` (that folder is
not visible to the shell or to `grep`).

## Tags

The chips the page shows on characters and filters by. They are separate from
the `tags` written inside a card.

- `tags`: `[{ "id": "1345561466591", "name": "Fantasy", "color": "rgba(108, 32, 32, 1)" }]`.
  `id` is any string no other tag has. `color` may be `""`.
- `tag_map`: `{ "Mira.png": ["1345561466591"] }`, character file name to the
  ids it wears.

Tag a character, making the tag when it does not exist yet:

```sh
jq --arg name "Fantasy" --arg who "Mira.png" '
  (if any(.tags[]; .name == $name) then . else .tags += [{ id: (now * 1000 | floor | tostring), name: $name, color: "" }] end)
  | (.tags[] | select(.name == $name) | .id) as $id
  | .tag_map[$who] = ((.tag_map[$who] // []) + [$id] | unique)
' settings.json > /tmp/s.json && cp /tmp/s.json settings.json
```

## Lorebooks that are always on

`world_info_settings.world_info.globalSelect` is the list of book names
switched on for every chat:

```sh
jq '.world_info_settings.world_info.globalSelect |= ((. // []) + ["Book"] | unique)' settings.json > /tmp/s.json && cp /tmp/s.json settings.json
```

The other numbers there: `world_info_depth` (how many messages are scanned for
keys), `world_info_budget` (percent of the context the entries may take),
`world_info_recursive`, `world_info_case_sensitive`,
`world_info_match_whole_words`.

## Regex scripts

Find and replace run over messages. `extension_settings.regex` is a list of

```json
{
  "id": "0b6c7f0e-3c5e-4d0b-9a57-2f6f6d1b8a11",
  "scriptName": "Hide stage directions",
  "findRegex": "/\\*[^*]+\\*/g",
  "replaceString": "",
  "trimStrings": [],
  "placement": [2],
  "disabled": false,
  "markdownOnly": true,
  "promptOnly": false,
  "runOnEdit": true,
  "substituteRegex": 0,
  "minDepth": null,
  "maxDepth": null
}
```

- `id`: a new uuid. `findRegex`: written as `/pattern/flags`.
  `replaceString`: `$1` for a captured group, `{{match}}` for all of it.
- `placement`: where it runs. 1 the user's messages, 2 the model's replies,
  3 slash commands, 5 lorebook entries, 6 reasoning.
- `markdownOnly` true changes only what is shown. `promptOnly` true changes
  only what is sent to the model. Both false rewrites the message itself, for
  good.
- `minDepth`, `maxDepth`: limit it to messages that many from the end, `null`
  for no limit.
- `substituteRegex`: whether `{{macros}}` inside `findRegex` are filled in.
  0 no, 1 as they are, 2 escaped.

Add one with `.extension_settings.regex += [ { ... } ]` under the rule above.
A script meant for a single character is kept in its card instead, under
`data.extensions.regex_scripts`, in the same shape.

## Kept elsewhere

Each has its own files and routes. Read the endpoint file with `read_file`
before calling one: `node_modules/sillytavern/src/endpoints/<area>.js`.

- **Themes:** `themes/<Name>.json` in the data folder, saved with
  `/api/themes/save` (`{ "name": "...", ... }`, copy an existing file for the
  rest). The one in use is `power_user.theme`. Area `themes`.
- **Quick replies:** `QuickReplies/<Name>.json`, saved with
  `/api/quick-replies/save`. Area `quick-replies`.
- **Backgrounds:** pictures in `backgrounds/`, added with
  `/api/backgrounds/upload` as a form with the picture in `files` under
  `avatar`. Area `backgrounds`.
- **Groups:** `groups/<id>.json`, made with `/api/groups/create`
  (`{ "name": "...", "members": ["Mira.png", "Odo.png"] }`), their chats in
  `group chats/`. Area `groups`.
- **Look and behaviour of the page itself:** not a setting. Write an extension
  as this app's `AGENTS.md` describes.
