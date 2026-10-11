---
name: tavern-presets
description: Make, edit and apply presets in this SillyTavern - chat completion presets with their prompt list (main prompt, custom prompts, order, on/off), samplers like temperature, and the instruct, context and system prompt templates of text completion. Load it before writing a preset, changing a prompt or a sampler, or answering why a preset did not take effect.
---

# Presets and prompts

## Every call

Calls are made with the `app_request` tool, with `id` set to this app's id. The
program must be running: if the tool says it is not, ask the user to open the
app's tab.

- Get the token once: `app_request { route: "/csrf-token" }` answers
  `{"token":"..."}`. Send it on every POST, the ones that only read as well,
  as `headers: { "X-CSRF-Token": "<token>" }`. A `403` means the header was
  left out or the token went stale: fetch a new one and repeat the call.
- Routes are POST with a `json` body.
- To refresh the open page after changing files: call `/csrf-token` again with
  `reload: true`.
- The user's files are in `data/root/default-user/` in this app's folder ("the
  data folder" below). They are not in git: there is nothing to commit.

## Which kind of preset

Read `main_api` in `settings.json` of the data folder
(`jq .main_api settings.json`):

- `openai` means chat completion, which is how this app talks to the engine's
  models unless the user changed it. Its presets are the big ones with the
  prompt list. Most of this page is about them.
- `textgenerationwebui`, `kobold`, `novel` mean text completion. See the last
  section.

Each kind has a folder of `<Name>.json` files and an `apiId` for the routes:

| apiId | Folder |
| --- | --- |
| `openai` | `OpenAI Settings/` |
| `textgenerationwebui` | `TextGen Settings/` |
| `kobold`, `koboldhorde` | `KoboldAI Settings/` |
| `novel` | `NovelAI Settings/` |
| `instruct` | `instruct/` |
| `context` | `context/` |
| `sysprompt` | `sysprompt/` |
| `reasoning` | `reasoning/` |

- **Save:** `/api/presets/save` with `{ "apiId": "...", "name": "Name", "preset": { ... } }`
  writes `<folder>/Name.json` with exactly that object and answers
  `{"name":"Name"}`.
- **Delete:** `/api/presets/delete` with `{ "apiId": "...", "name": "Name" }`,
  after asking.

A chat completion preset is several thousand characters. Do not type one into
a call: build the file in the shell from an existing one (below). The route is
for the small kinds.

## Two copies: the file and the live values

This is what goes wrong most. A preset file is only a saved set. What the page
actually sends comes from the live copy in `settings.json`, under
`oai_settings`, and the name shown in the preset list is
`oai_settings.preset_settings_openai`.

- Writing a preset file changes nothing until the user picks it in the list
  (top of the AI Response Configuration panel), or you copy it into the live
  values ("Apply a preset" below).
- Changing only the live values works at once, but the preset file still holds
  the old ones, and they come back when the preset is picked again. For a
  change meant to last, change both.
- The page reads the list of presets when it loads.

Some names differ between the two:

| In a preset file | In `oai_settings` |
| --- | --- |
| `temperature` | `temp_openai` |
| `frequency_penalty` | `freq_pen_openai` |
| `presence_penalty` | `pres_pen_openai` |
| `top_p` | `top_p_openai` |
| `top_k` | `top_k_openai` |
| `top_a` | `top_a_openai` |
| `min_p` | `min_p_openai` |
| `repetition_penalty` | `repetition_penalty_openai` |

Everything else has the same name in both: `prompts`, `prompt_order`,
`openai_max_context`, `openai_max_tokens`, `stream_openai`, `seed`,
`assistant_prefill`, `squash_system_messages`, `names_behavior`,
`wi_format`, `scenario_format`, `personality_format`, `impersonation_prompt`,
`new_chat_prompt`, `continue_nudge_prompt`, ...

## The connection rides in the preset

A preset file also carries where the models are: `chat_completion_source`,
`custom_url`, `custom_model`, `reverse_proxy`, every `*_model`. While
`oai_settings.bind_preset_to_connection` is true (it is unless the user
switched it off), picking a preset applies those too. A preset copied from
`Default.json` as it is would point the app away from the engine's models and
the user would be cut off. So every preset you write takes its connection
values from the live settings. The recipe below does that.

## Make a preset

In the shell, from the data folder. Start from the preset the user means, or
from `OpenAI Settings/Default.json`:

```sh
jq --slurpfile s settings.json '
  $s[0].oai_settings as $live
  | reduce (keys[] | select(test("^chat_completion_source$|_model$|^custom_|^reverse_proxy$|^proxy_password$"))) as $k
      (.; if ($live | has($k)) then .[$k] = $live[$k] else . end)
  | .temperature = 0.9
  | .openai_max_tokens = 800
' "OpenAI Settings/Default.json" > "OpenAI Settings/My Preset.json"
```

Then refresh the page (`/csrf-token` with `reload: true`) so the list shows it,
and either apply it or tell the user to pick it.

## The prompt list

`prompts` is every prompt the preset knows. `prompt_order` says which are in
use, in which order.

A prompt:

```json
{ "identifier": "main", "name": "Main Prompt", "system_prompt": true, "role": "system", "content": "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}." }
```

- The built-in ones with text to edit: `main`, `nsfw` (shown as Auxiliary
  Prompt), `jailbreak` (shown as Post-History Instructions),
  `enhanceDefinitions`. Change their `content`.
- Markers have `"marker": true` and no content. They stand for text the
  program fills in: `worldInfoBefore`, `personaDescription`,
  `charDescription`, `charPersonality`, `scenario`, `worldInfoAfter`,
  `dialogueExamples`, `chatHistory`. Never delete one. Move it or switch it
  off instead.
- A prompt of your own:

  ```json
  { "identifier": "b7f1c2de-5a34-4c1b-9e0f-3d2a6c8e4f10", "name": "Style", "role": "system", "content": "Write in short paragraphs.", "system_prompt": false, "injection_position": 0, "injection_depth": 4, "injection_order": 100, "forbid_overrides": false }
  ```

  `identifier` is a new uuid. `role` is `system`, `user` or `assistant`.
  `injection_position` 0 puts it where it stands in the order. 1 puts it
  inside the chat instead, `injection_depth` messages from the end (0 is after
  the last message).

`prompt_order` is a list of two, each `{ "character_id": N, "order": [ { "identifier": "...", "enabled": true }, ... ] }`.
The page uses the one with `character_id` 100001. Change that one. The first
identifier is sent first. A prompt missing from the order is not sent, and so
is one with `"enabled": false`.

Add a prompt and place it just before the chat history:

```sh
jq '
  .prompts += [{ identifier: "b7f1c2de-5a34-4c1b-9e0f-3d2a6c8e4f10", name: "Style", role: "system", content: "Write in short paragraphs.", system_prompt: false, injection_position: 0, injection_depth: 4, injection_order: 100, forbid_overrides: false }]
  | (.prompt_order[] | select(.character_id == 100001) | .order) |= (
      (map(.identifier) | index("chatHistory")) as $i
      | .[:$i] + [{ identifier: "b7f1c2de-5a34-4c1b-9e0f-3d2a6c8e4f10", enabled: true }] + .[$i:])
' "OpenAI Settings/My Preset.json" > /tmp/p.json && cp /tmp/p.json "OpenAI Settings/My Preset.json"
```

Change the main prompt, switch one off:

```sh
jq '
  (.prompts[] | select(.identifier == "main") | .content) = "New main prompt."
  | (.prompt_order[] | select(.character_id == 100001) | .order[] | select(.identifier == "nsfw") | .enabled) = false
' "OpenAI Settings/My Preset.json" > /tmp/p.json && cp /tmp/p.json "OpenAI Settings/My Preset.json"
```

Text after the chat history is what the model reads last and follows most.
Long prompt text is easier written to a file first and read in with
`--rawfile text /tmp/text.md`, then used as `$text`.

## Apply a preset

Copies a preset file into the live values and names it as the chosen one, as
picking it in the list would:

1. Back up: `/api/settings/make-snapshot` with `{}` (answers 204).
2. In the shell, from the data folder:

   ```sh
   jq --slurpfile p "OpenAI Settings/My Preset.json" '
     { temperature: "temp_openai", frequency_penalty: "freq_pen_openai", presence_penalty: "pres_pen_openai", top_p: "top_p_openai", top_k: "top_k_openai", top_a: "top_a_openai", min_p: "min_p_openai", repetition_penalty: "repetition_penalty_openai" } as $names
     | .oai_settings |= (reduce ($p[0] | to_entries[]) as $e (.; .[$names[$e.key] // $e.key] = $e.value))
     | .oai_settings.preset_settings_openai = "My Preset"
   ' settings.json > ../../settings.next.json \
     && jq -e 'has("power_user") and has("oai_settings")' ../../settings.next.json > /dev/null && echo ready
   ```

   This writes an edited copy beside the data, not over the file. Go on only
   when it printed `ready`.
3. In the very next call, hand the copy to the program and load the page
   again:
   `app_request { route: "/api/settings/save", body_file: "apps/<this app's id>/data/settings.next.json", headers: { "X-CSRF-Token": "<token>" }, reload: true }`
   answers `{"result":"ok"}`. Never write to `settings.json` yourself: the
   open page keeps the settings in memory and would write its old copy back
   over the edit.
4. In a new shell command, read the value back from `settings.json` and
   remove the copy (`rm ../../settings.next.json`).

To change one live value and nothing else, do the same four steps with a
smaller edit, for example `.oai_settings.temp_openai = 0.8`, and make the same
change in the preset file named by `oai_settings.preset_settings_openai`.

## Text completion

Used only when `main_api` is not `openai`.

- Sampler presets are in `TextGen Settings/` and the live values in
  `settings.json` under `textgenerationwebui_settings` (the chosen name is its
  `preset`). The names are the same in both.
- Instruct template: files in `instruct/`, live copy `power_user.instruct`
  (with `enabled` and the chosen `preset`).
- Context template: files in `context/` (`story_string`, `chat_start`,
  `example_separator`), live copy `power_user.context`.
- System prompt: files in `sysprompt/` as `{ "name": "...", "content": "..." }`,
  live copy `power_user.sysprompt` (`enabled`, `name`, `content`).

These are small: read one in its folder for the shape, save with
`/api/presets/save`, and change the live copy with the four steps above.
