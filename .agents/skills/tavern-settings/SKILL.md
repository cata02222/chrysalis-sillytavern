---
name: tavern-settings
description: Change anything this SillyTavern keeps in its settings file without the page overwriting it - the colours of the page and its theme, tags on characters, regex scripts, which lorebooks are on everywhere, any option of the page - and take a backup first. Also points to themes, quick replies, backgrounds and groups. Load it before editing settings.json here or when a settings change did not stick.
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
  `{"token":"..."}`. Send it on every POST, the ones that only read as well,
  as `headers: { "X-CSRF-Token": "<token>" }`. A `403` means the header was
  left out or the token went stale: fetch a new one and repeat the call.
- Routes are POST with a `json` body unless said otherwise.

## The rule for changing the file

The open page keeps every setting in memory and writes the whole file back
whenever it saves. An edit made to `settings.json` on disk is lost when the
page saves before it has read the file again, and the seconds between an edit
and a reload are enough for that. So never write to `settings.json` yourself.
Hand an edited copy to the program and load the page again in the same call:

1. Back up: `/api/settings/make-snapshot` with `{}` (answers 204, the copy
   lands in `backups/` of the data folder).
2. In the shell, from the data folder, write the edited copy beside the data,
   not over the file:

   ```sh
   jq '.power_user.auto_swipe = true' settings.json > ../../settings.next.json \
     && jq -e 'has("power_user") and has("oai_settings")' ../../settings.next.json > /dev/null && echo ready
   ```

   Go on only when it printed `ready`: a copy cut short would replace every
   setting with what little is in it.
3. In the very next call:

   ```
   app_request {
     route: "/api/settings/save",
     body_file: "apps/<this app's id>/data/settings.next.json",
     headers: { "X-CSRF-Token": "<token>" },
     reload: true
   }
   ```

   It answers `{"result":"ok"}`. The program writes the file and the page loads
   again at that moment, before its old copy can be written back. What the
   user had typed is put back. A setting the user changed between steps 2 and
   3 is not in the copy, so do not put other calls between them.
4. In a new shell command, read the value back
   (`jq .power_user.auto_swipe settings.json`) and remove the copy
   (`rm ../../settings.next.json`).

Do the whole job in one edit, not one edit per value. The examples below show
only the `jq` program: run each as step 2, then do step 3.

A few seconds after it loads, the page saves the file once by itself, with
what it just read: a newer time on the file is not a sign that something went
wrong. Do not watch the file with a loop inside one shell command: a command
sees a file as it was when it first read it.

Do not fetch `/api/settings/get`: it answers with this file plus every preset
and is cut off. Never print `secrets.json`.

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
' settings.json > ../../settings.next.json
```

## Lorebooks that are always on

`world_info_settings.world_info.globalSelect` is the list of book names
switched on for every chat:

```sh
jq '.world_info_settings.world_info.globalSelect |= ((. // []) + ["Book"] | unique)' settings.json > ../../settings.next.json
```

The other numbers there: `world_info_depth` (how many messages are scanned for
keys), `world_info_budget` (percent of the context the entries may take),
`world_info_recursive`, `world_info_case_sensitive`,
`world_info_match_whole_words`.

## Colours of the page

The colours in use are fields of `power_user`, each an `rgba(r, g, b, a)`
text:

| Field | What it colours | Its name in the page |
| --- | --- | --- |
| `blur_tint_color` | panels, drawers, the top bar and the menus | UI Background |
| `chat_tint_color` | the area the chat is in | Chat Background |
| `user_mes_blur_tint_color` | the user's messages | User Message Blur Tint |
| `bot_mes_blur_tint_color` | the character's messages | AI Message Blur Tint |
| `main_text_color` | text | Main Text |
| `italics_text_color` | text in italics | Italics Text |
| `underline_text_color` | underlined text | Underlined Text |
| `quote_text_color` | text in quotes | Quote Text |
| `shadow_color` | the shadow behind text | Shadow Color |
| `border_color` | lines around panels | UI Border |

"The background" of the page as a whole is `blur_tint_color` and
`chat_tint_color` together. Behind both is a picture, not a colour: see
"Backgrounds" below.

```sh
jq '.power_user.blur_tint_color = "rgba(15, 34, 66, 1)" | .power_user.chat_tint_color = "rgba(15, 34, 66, 1)"' settings.json > ../../settings.next.json
```

A theme (`themes/<Name>.json` in the data folder, the one in use named by
`power_user.theme`) holds the same fields under the same names, at its top
level. The page copies them into `power_user` only when the user picks the
theme in the list, so a change to `power_user` alone is undone the next time
they pick it. To make it last, change the theme too. Its file is sent whole,
like the settings:

```sh
jq '.blur_tint_color = "rgba(15, 34, 66, 1)" | .chat_tint_color = "rgba(15, 34, 66, 1)"' "themes/Dark Lite.json" > ../../theme.next.json
```

then `app_request { route: "/api/themes/save", body_file: "apps/<this app's id>/data/theme.next.json", headers: { "X-CSRF-Token": "<token>" } }`
(answers 200). Send the theme first and the settings last, so the one reload
shows both.

To undo a colour change, put the earlier values back the same way. They are
in the newest file under `backups/` made before the change.

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

- **Themes:** see "Colours of the page" above. A new theme is an existing
  file with another `name`, sent to `/api/themes/save`. Area `themes`.
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
