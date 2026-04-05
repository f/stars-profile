# stars-profile

<p align="center">
  <img src="https://stars.github.com/card.jpg" alt="GitHub Stars" width="600">
</p>

<p align="center">
  Manage your <a href="https://stars.github.com/">GitHub Stars</a> profile contributions using GitHub Copilot CLI for deep research.
</p>

<p align="center">
  <em>Built entirely in VS Code with GitHub Copilot. Uses Copilot CLI programmatic mode for autonomous web research.</em>
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

## License

MIT
