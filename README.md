# Context Pack

Bundle selected notes from your vault into one LLM-ready block of text, with a token estimate and a check against the context limits of the models you care about.

## Commands

Open the command palette and run:

- **Build context pack** opens a dialog. Pick a source, set the options, then **Build** to see the note count, the token estimate and a pass or fail line for each model limit. **Copy** puts the result on your clipboard. **Save pack** stores the source and options under a name.
  - **Folder**: every markdown file in the folder, including subfolders.
  - **Tag**: every note carrying the tag, in frontmatter or inline. Matching ignores case and the leading `#`.
  - **Note and its links**: the chosen note, plus every note it links to when **Include linked notes** is on. Broken links and non-markdown files are skipped.
- **Pack current note and its links** builds a pack from the active note (depth 1) with your default options and copies it right away.
- **Rebuild saved pack** lets you pick a saved pack, then rebuilds it from the vault as it is now and copies it.

## File menu

Right-click a folder or a note in the file explorer and choose **Copy as context pack**. A folder packs everything under it; a note packs just that note. Both use your default options.

## Output

Notes are sorted by path.

- **Markdown**: each note becomes a `## Title` section, optionally followed by `Path: ...` and a fenced `yaml` block of its frontmatter, then the body. Notes are separated by `---`.
- **XML**: everything is wrapped in `<context>`, with one `<note path="..." title="...">` per note containing an optional `<frontmatter>` and a `<body>`. Bodies and frontmatter are wrapped in CDATA, so the content is not escaped.

Options (set per pack, with defaults in settings):

| Option | Effect |
| --- | --- |
| Format | Markdown or XML |
| Include frontmatter | Add each note's frontmatter as YAML |
| Include file paths | Add each note's vault path |
| Strip embeds | Remove `![[...]]` embeds |
| Strip images | Remove `![alt](url)` images and image embeds such as `![[photo.png]]` |

Runs of three or more blank lines are collapsed to two.

## Settings

In **Settings → Context Pack**:

- **Defaults for new packs**: the format and the four toggles above.
- **Model limits**: a list of names and token limits that each pack is checked against. The two entries that ship with the plugin are placeholders, so edit them to match the models you use. Add or remove entries as needed.
- **Saved packs**: rename or delete the packs you saved.

## Token counts are estimates

Token counts are a fast approximation (about four characters per token, with runs of whitespace collapsed). They are not produced by any model's real tokenizer, and the real count varies by model and by content. Leave some headroom when a pack is close to a limit.

## Installation

### Community plugins

Once Context Pack is listed, open **Settings → Community plugins → Browse**, search for "Context Pack", then select **Install** and **Enable**.

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](../../releases).
2. Copy them into `<your vault>/.obsidian/plugins/context-pack/`.
3. Reload Obsidian and enable **Context Pack** under **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev     # watch build
npm test        # unit tests (Vitest)
npm run build   # type-check and production build
```

`tests/fixtures/vault` is a small sample vault for manual testing. Open it as a vault in Obsidian and link or copy the built plugin files into its `.obsidian/plugins/context-pack/` folder.

## How to release

1. Make sure `main` builds and the tests pass.
2. Bump the version. This updates `package.json`, `manifest.json` and `versions.json` together and stages the changes:

   ```bash
   npm version patch   # or minor, major, or an exact version such as 0.2.0
   ```

   `npm version` also creates a git commit and a tag named exactly like the version, with no `v` prefix, which is what Obsidian requires.
3. Push the commit and the tag:

   ```bash
   git push origin main --follow-tags
   ```

4. The **Release Obsidian plugin** workflow builds the plugin and creates a **draft** GitHub release with `main.js`, `manifest.json` and `styles.css` attached. Review the draft, add notes, then publish it.

## License

[MIT](LICENSE)
