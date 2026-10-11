---
name: tavern-personas
description: Make, edit, switch and delete the user's personas in this SillyTavern (the name, picture and description the user plays as), and set the default one. Load it before any work on a persona or on who the user is in the chat.
---

# Personas

A persona is a picture plus a few entries in the settings file. Both halves
are needed: a picture with no entry shows up unnamed, an entry with no picture
shows up broken.

## Every call

Calls are made with the `app_request` tool, with `id` set to this app's id. The
program must be running: if the tool says it is not, ask the user to open the
app's tab.

- Get the token once: `app_request { route: "/csrf-token" }` answers
  `{"token":"..."}`. Send it on every POST as
  `headers: { "X-CSRF-Token": "<token>" }`. A `403` means it went stale: fetch
  a new one and repeat the call.
- Routes are POST with a `json` body unless said otherwise.
- The user's files are in `data/root/default-user/` in this app's folder ("the
  data folder" below). They are not in git: there is nothing to commit.

## The picture

Pictures are in `User Avatars/` of the data folder, and the file name is the
persona's id.

- **Which exist:** `/api/avatars/get` with `{}` answers a list of file names.
- **Add one:** `/api/avatars/upload` as a form:
  `files: { "avatar": "<path to a png or jpg>" }` and
  `form: { "overwrite_name": "Captain.png" }`. The path starts at the user's
  folder, so a file in this app is `apps/<this app's id>/...`. The answer is
  `{"path":"Captain.png"}`. Without `overwrite_name` the file is named by the
  time (`1760000000000.png`): read the answer. With the name of an existing
  picture it replaces that picture.
- **No picture given:** copy the stock one in the shell, from the data folder:
  `cp "User Avatars/user-default.png" "User Avatars/Captain.png"`.
- **Delete:** `/api/avatars/delete` with `{ "avatar": "Captain.png" }`, after
  asking.

## The entries

In `settings.json` of the data folder:

```json
{
  "username": "Captain",
  "user_avatar": "Captain.png",
  "power_user": {
    "personas": { "Captain.png": "Captain" },
    "persona_descriptions": {
      "Captain.png": {
        "description": "A retired sea captain, blunt and superstitious.",
        "position": 0,
        "depth": 2,
        "role": 0,
        "lorebook": "",
        "title": "",
        "connections": []
      }
    },
    "default_persona": null
  }
}
```

- `power_user.personas`: picture to name. The name is what `{{user}}` becomes.
- `power_user.persona_descriptions`: picture to what the model is told about
  the user. `position` 0 puts it in the prompt where the persona description
  stands, 2 at the top of the author's note, 3 at its bottom, 4 inside the
  chat at `depth` messages from the end (as `role`: 0 system, 1 user,
  2 assistant). `lorebook` is the name of a book that switches on with this
  persona. `title` is a short note shown under the name.
- `power_user.default_persona`: the picture used for new chats, or `null`.
- `user_avatar` and `username` at the top: the persona in use right now.
- The persona in use also has a working copy of its description, which is
  what the page shows and sends: `power_user.persona_description`,
  `persona_description_position`, `persona_description_depth`,
  `persona_description_role`, `persona_description_lorebook`. Switching
  persona, or editing the one in use, means setting these too. "Switch" below
  does all of it.

## Changing the entries

The open page keeps the settings in memory and writes the whole file back the
next time the user changes anything. So:

1. Back up: `/api/settings/make-snapshot` with `{}` (answers 204).
2. Edit `settings.json` in the shell, from the data folder. A new persona:

   ```sh
   jq '
     .power_user.personas["Captain.png"] = "Captain"
     | .power_user.persona_descriptions["Captain.png"] = { description: "A retired sea captain, blunt and superstitious.", position: 0, depth: 2, role: 0, lorebook: "", title: "", connections: [] }
   ' settings.json > /tmp/s.json && cp /tmp/s.json settings.json
   ```

   **Switch** to a persona, or bring the working copy in line after editing
   the one in use (run it after the edit above, or in the same `jq` call):

   ```sh
   jq --arg f "Captain.png" '
     .user_avatar = $f
     | .username = .power_user.personas[$f]
     | .power_user.persona_descriptions[$f] as $d
     | .power_user.persona_description = ($d.description // "")
     | .power_user.persona_description_position = ($d.position // 0)
     | .power_user.persona_description_depth = ($d.depth // 2)
     | .power_user.persona_description_role = ($d.role // 0)
     | .power_user.persona_description_lorebook = ($d.lorebook // "")
   ' settings.json > /tmp/s.json && cp /tmp/s.json settings.json
   ```
3. At once, `app_request { route: "/csrf-token", reload: true }`, so the page
   reads the file instead of overwriting it.
4. Read the value back from `settings.json`. If it is gone, the page saved in
   between: do steps 2 and 3 again.

Removing a persona is the reverse: delete the picture, then
`del(.power_user.personas["Captain.png"], .power_user.persona_descriptions["Captain.png"])`,
and if it was the one in use, point `user_avatar` and `username` at another.

Making a persona does not switch to it. Say so, or switch when that is what
was asked. A chat the user locked to a persona goes back to that one when it
is opened, whatever is set here.
