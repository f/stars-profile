import chalk from 'chalk';
import { checkbox, confirm } from '@inquirer/prompts';

const TYPE_COLORS = {
  SPEAKING: 'cyan',
  BLOGPOST: 'green',
  ARTICLE_PUBLICATION: 'greenBright',
  EVENT_ORGANIZATION: 'yellow',
  HACKATHON: 'magenta',
  OPEN_SOURCE_PROJECT: 'blue',
  VIDEO_PODCAST: 'red',
  FORUM: 'gray',
  OTHER: 'white',
};

function colorType(type) {
  const color = TYPE_COLORS[type] || 'white';
  return chalk[color](type.padEnd(22));
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

export function showExistingSummary(contributions) {
  console.log();
  console.log(chalk.bold.underline(`Existing contributions: ${contributions.length}`));
  console.log();

  if (contributions.length === 0) {
    console.log(chalk.dim('  No existing contributions found. New entries will use a generic format.'));
    console.log();
    return;
  }

  // Count by type
  const counts = {};
  for (const c of contributions) {
    const t = c.type || 'OTHER';
    counts[t] = (counts[t] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sorted) {
    console.log(`  ${colorType(type)} ${chalk.bold(count)}`);
  }
  console.log();
}

export function displayNewActivities(activities) {
  console.log(chalk.bold.underline(`Found ${activities.length} new activities:`));
  console.log();

  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    const idx = chalk.dim(`${(i + 1).toString().padStart(2)}.`);
    console.log(`  ${idx} ${colorType(a.type)} ${chalk.bold(truncate(a.title, 60))}`);
    console.log(`      ${chalk.dim(a.date?.slice(0, 10) || 'no date')}  ${chalk.dim(truncate(a.url || 'no url', 70))}`);
    console.log(`      ${chalk.dim(truncate(a.description, 80))}`);
    console.log();
  }
}

export async function selectActivities(activities) {
  const choices = activities.map((a, i) => ({
    name: `[${a.type}] ${truncate(a.title, 50)} (${a.date?.slice(0, 10) || '?'})`,
    value: i,
    checked: true,
  }));

  const selected = await checkbox({
    message: 'Select activities to create as contributions:',
    choices,
    pageSize: 20,
  });

  return selected.map(i => activities[i]);
}

export async function confirmSubmission(items) {
  console.log();
  console.log(chalk.bold(`About to create ${items.length} contribution(s):`));
  for (const item of items) {
    console.log(`  ${colorType(item.type)} ${item.title}`);
  }
  console.log();

  return confirm({
    message: 'Proceed with creating these contributions?',
    default: true,
  });
}
