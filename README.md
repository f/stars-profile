<h1 align="center">
  <br>
  <img src="logo.svg" alt="GitHub Stars" width="300">
  <br>
  <code>npx stars-profile</code>
  <br>
</h1>

<p align="center">
  <strong>AI-powered CLI to manage your <a href="https://stars.github.com/">GitHub Stars</a> profile contributions.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/stars-profile"><img src="https://img.shields.io/npm/v/stars-profile.svg?style=flat-square&color=FFD700" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/stars-profile"><img src="https://img.shields.io/npm/dm/stars-profile.svg?style=flat-square" alt="npm downloads"></a>
  <a href="https://github.com/f/stars-profile/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  <a href="https://stars.github.com"><img src="https://img.shields.io/badge/GitHub-Stars-FFD700?style=flat-square&logo=github" alt="GitHub Stars"></a>
</p>

<p align="center">
  Uses GitHub Copilot CLI in programmatic mode to deep-research your recent activities<br>across X, LinkedIn, YouTube, GitHub, Google, and more — then batch-creates contributions via the Stars API.
</p>

<p align="center">
  <code>⚠ You must be a GitHub Star to use this tool.</code>
</p>

<p align="center">
  <em>Built entirely in VS Code with GitHub Copilot.</em>
</p>

## How it works

1. Fetches your existing contributions from the Stars API
2. Analyzes the language, tone, and style of your entries
3. Uses GitHub Copilot CLI (programmatic mode) to deep-research your recent activities (last 6 months)
4. Searches across X, LinkedIn, YouTube, GitHub, Google, blogs, and more
5. Presents results for review and selection
6. Batch-creates selected contributions via the Stars API

## Built with

- **VS Code** + **GitHub Copilot** — the entire codebase was built using Copilot in VS Code
- **Copilot CLI** (`copilot -p`) — programmatic mode for autonomous deep web research with tool use
- **GitHub Stars GraphQL API** — for reading and writing contributions

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [GitHub Copilot CLI](https://github.com/github/copilot-cli) installed and authenticated
- A GitHub Stars API token

## Usage

```bash
npx stars-profile
```

### Options

```
-q, --query <text>   Search query (e.g. "fatih kadir akın speeches")
-t, --token <token>  Stars API token (default: $GITHUB_STARS_TOKEN)
    --dry-run        Print the curl command instead of submitting
-h, --help           Show this help message
```

### Examples

```bash
# Interactive mode — prompts for query and token
npx stars-profile

# With query
npx stars-profile -q "john doe conference talks"

# Dry run — prints curl command without submitting
npx stars-profile --dry-run -q "jane smith open source"

# Token via environment variable
GITHUB_STARS_TOKEN=abc npx stars-profile
```

Your query and token are saved to `~/.config/stars-profile/config.json` so you only need to enter them once.

## Demo

```
$ npx stars-profile -q "fatih kadir akın"

  ★ stars-profile  — AI-powered GitHub Stars contribution manager
  You must be a GitHub Star to use this tool.
  https://stars.github.com

  ★ 116 existing contributions

    SPEAKING               ██████████████ 14
    BLOGPOST               ████████████ 12
    OPEN_SOURCE_PROJECT    ████████████████████████████ 28
    VIDEO_PODCAST          ██████████ 10

  ╭─ ★ Copilot Deep Research ──────────────────────────────╮
  │ Searching x.com for recent posts and mentions...        │
  │ Found 2 posts about conference talks                    │
  │ Searching youtube.com for talks and interviews...       │
  │ Found 1 new conference recording                        │
  │ Searching github.com for recently active repositories...│
  │ Found 3 repositories with recent activity               │
  ╰─────────────────────────────────────────────────────────╯

  ╭─ ★ Converting to structured data ──────────────────────╮
  │ Reading research data...                                │
  │ Matching style of existing contributions...             │
  │ Writing 3 activities to JSON...                         │
  ╰─────────────────────────────────────────────────────────╯

  ★ Found 3 new activities

   1. SPEAKING               JSConf Berlin - Copilot Workshop
      2026-02-15  https://jsconf.eu/speakers/fatih

   2. VIDEO_PODCAST          devtools.fm Episode 42
      2026-03-01  https://devtools.fm/episode/42

   3. BLOGPOST               Building AI-Native CLIs
      2026-03-20  https://dev.to/fka/ai-native-clis

? Select activities to create (all selected by default)
✔ Proceed with creating these contributions? Yes
✔ Created 3 contributions
```

## License

MIT
