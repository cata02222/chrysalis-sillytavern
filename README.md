# SillyTavern for Chrysalis

Runs [SillyTavern](https://github.com/SillyTavern/SillyTavern) inside
[Chrysalis](https://github.com/ProjectChrysalis/Chrysalis-Engine) as a service
app: its own program beside the engine, shown in a tab.

This is an unofficial wrapper. It contains none of SillyTavern's code: the
setup step downloads the `sillytavern` package from npm, at the version pinned
in `package.json`.

## What you get

- SillyTavern in a Chrysalis tab, on desktop and phone.
- The models you connected in Chrysalis, already selected. No key to paste.
- The Chrysalis agent can work inside it: ask it to write a character or a
  lorebook and it appears in the app.
- Your own extensions in `extensions/`, edited live and kept across versions.

## Install

In Chrysalis: **Import app**, **Git repository**, paste this repository's
address. Chrysalis shows the program it will run. An admin then allows it in
the app's tab; the first start downloads SillyTavern, which takes a minute.

A service app is not sandboxed. It runs with the rights of the account
Chrysalis runs under. Install it only if you trust this repository and
SillyTavern.

## Updating

When this repository moves to a newer SillyTavern, Chrysalis offers the update
in the app's details. Your characters, chats and settings live in the app's
`data/` folder and are not touched.

To pick a version yourself, change it in `package.json` and press Restart in
the app's tab.

## Files

| File | What it is |
| --- | --- |
| `manifest.json` | How Chrysalis runs the program |
| `package.json` | The SillyTavern version |
| `start.js` | Links the Chrysalis models and `extensions/`, then starts the server |
| `extensions/` | Your own SillyTavern extensions |
| `AGENTS.md`, `.agents/skills/` | What the Chrysalis agent reads to work in this app |
