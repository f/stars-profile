import chalk from 'chalk';
import ora from 'ora';
import { input } from '@inquirer/prompts';
import { fetchExistingContributions, createContributions, buildDryCurlCommand } from './api.js';
import { researchActivities } from './research.js';
import { showExistingSummary, displayNewActivities, selectActivities, confirmSubmission } from './display.js';
import { getSavedQuery, saveQuery, getSavedToken, saveToken } from './config.js';

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { query: null, token: null, dryRun: false, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if ((arg === '--query' || arg === '-q') && args[i + 1]) {
      opts.query = args[++i];
    } else if ((arg === '--token' || arg === '-t') && args[i + 1]) {
      opts.token = args[++i];
    } else if (!arg.startsWith('-') && !opts.query) {
      opts.query = arg;
    }
  }

  return opts;
}

const HEADER = `
${chalk.hex('#FFD700')('  ★')} ${chalk.bold.hex('#FFD700')('stars-profile')}  ${chalk.dim('— AI-powered GitHub Stars contribution manager')}
${chalk.dim('  You must be a GitHub Star to use this tool.')}
${chalk.dim('  https://stars.github.com')}
`;

function showHeader() {
  console.log(HEADER);
}

function showHelp() {
  showHeader();
  console.log(`${chalk.bold('USAGE')}
  ${chalk.hex('#FFD700')('$')} npx stars-profile ${chalk.dim('[options] [query]')}

${chalk.bold('OPTIONS')}
  ${chalk.cyan('-q, --query')} <text>   Search query (e.g. "fatih kadir akın speeches")
  ${chalk.cyan('-t, --token')} <token>  Stars API token (default: $GITHUB_STARS_TOKEN)
  ${chalk.cyan('    --dry-run')}        Print the curl command instead of submitting
  ${chalk.cyan('-h, --help')}           Show this help message

${chalk.bold('EXAMPLES')}
  ${chalk.dim('$')} npx stars-profile -q "john doe conference talks"
  ${chalk.dim('$')} npx stars-profile --dry-run -q "jane smith open source"
  ${chalk.dim('$')} GITHUB_STARS_TOKEN=abc npx stars-profile
`);
}

export async function run() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  showHeader();

  let token = opts.token || process.env.GITHUB_STARS_TOKEN || getSavedToken();
  if (!token) {
    token = await input({ message: 'Stars API token (Bearer token):' });
    if (!token.trim()) {
      console.error(chalk.red('Error: No Stars API token provided.'));
      process.exit(1);
    }
    saveToken(token.trim());
    console.log(chalk.dim('Token saved to ~/.config/stars-profile/config.json'));
  }
  token = token.trim();

  // Step 1: Fetch existing contributions
  const fetchSpinner = ora('Fetching existing contributions...').start();
  let existing;
  try {
    existing = await fetchExistingContributions(token);
    fetchSpinner.succeed(`Fetched ${existing.length} existing contributions`);
  } catch (err) {
    fetchSpinner.fail('Failed to fetch contributions');
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  showExistingSummary(existing);

  // Step 2: Get search query
  let query = opts.query || getSavedQuery();
  if (query) {
    console.log(chalk.dim(`Using search query: "${query}"`));
  } else {
    query = await input({
      message: 'Search query (e.g. "your name" + activities):',
    });
    if (!query.trim()) {
      console.error(chalk.red('No search query provided.'));
      process.exit(1);
    }
  }
  query = query.trim();
  saveQuery(query);

  // Step 3: Research with Copilot CLI (streams output to terminal)
  console.log(chalk.hex('#FFD700')('\n  ★ Phase 1: Deep Research'));
  console.log(chalk.dim('  Copilot CLI is searching the web...\n'));
  let newActivities;
  try {
    newActivities = await researchActivities(query, existing);
    console.log(chalk.hex('#FFD700')(`\n  ★ Found ${newActivities.length} new activities\n`));
  } catch (err) {
    console.error(chalk.red('\n  ✖ Research failed'));
    console.error(chalk.red(`  ${err.message}`));
    process.exit(1);
  }

  if (newActivities.length === 0) {
    console.log(chalk.yellow('\nNo new activities found. Try a different search query.'));
    process.exit(0);
  }

  // Step 4: Display and select
  displayNewActivities(newActivities);
  const selected = await selectActivities(newActivities);

  if (selected.length === 0) {
    console.log(chalk.yellow('No activities selected.'));
    process.exit(0);
  }

  // Step 5: Confirm and submit
  const proceed = await confirmSubmission(selected);
  if (!proceed) {
    console.log(chalk.yellow('Cancelled.'));
    process.exit(0);
  }

  // Step 6: Create or dry-run
  if (opts.dryRun) {
    console.log(chalk.bold('\n--- Dry run: curl command ---\n'));
    console.log(buildDryCurlCommand(token, selected));
    console.log();
  } else {
    const createSpinner = ora('Creating contributions...').start();
    try {
      const created = await createContributions(token, selected);
      createSpinner.succeed(`Created ${created.length} contribution(s)`);
      console.log();
      for (const c of created) {
        console.log(`  ${chalk.green('✓')} ${c.id}`);
      }
      console.log();
    } catch (err) {
      createSpinner.fail('Failed to create contributions');
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  }
}
