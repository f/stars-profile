import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import boxen from 'boxen';
import logUpdate from 'log-update';
import { CONTRIBUTION_TYPES } from './api.js';

function sampleExamples(contributions) {
  const byType = {};
  for (const c of contributions) {
    const t = c.type || 'OTHER';
    if (!byType[t]) byType[t] = [];
    byType[t].push(c);
  }

  const samples = [];
  for (const [type, items] of Object.entries(byType)) {
    samples.push(...items.slice(0, 2));
  }
  return samples.slice(0, 15);
}

function detectLanguage(contributions) {
  if (contributions.length === 0) return null;

  const text = contributions
    .map(c => `${c.title} ${c.description}`)
    .join(' ')
    .toLowerCase();

  const langSignals = {
    Turkish: ['hakkında', 'konuştum', 'etkinlik', 'üniversitesi', 'topluluk'],
    Portuguese: ['sobre', 'como', 'para', 'uma', 'comunidade', 'desenvolvimento'],
    Spanish: ['sobre', 'cómo', 'para', 'una', 'comunidad', 'desarrollo', 'habló'],
    Japanese: ['について', 'です', 'した', 'ます'],
    Korean: ['에서', '대해', '입니다', '했습니다'],
  };

  const scores = {};
  for (const [lang, words] of Object.entries(langSignals)) {
    scores[lang] = words.filter(w => text.includes(w)).length;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 3) {
    return `primarily English with some ${best[0]} titles/phrases`;
  }

  return 'English';
}

// Phase 1: Research prompt — gather data freely, no JSON constraint
function buildResearchPrompt(query) {
  return `Do deep research on "${query}" and find their public activities from the LAST 6 MONTHS ONLY (October 2025 – April 2026). Do NOT include older activities.

Specifically search these platforms using web search:
- X (Twitter): Search x.com/search for recent posts and mentions about this person's talks, projects, and activities
- Bluesky: Search bsky.app for recent posts — especially announcements about speaking engagements, conferences, and meetups
- LinkedIn: Search linkedin.com for their recent posts, articles, and event announcements
- YouTube: Search for their recent talks, interviews, and podcast appearances
- GitHub: Search for their recently active repositories and open source contributions
  IMPORTANT for GitHub repos: For each repository found, visit the GitHub repo page and check the ACTUAL repository creation date (the "created" date shown on the repo). Use that date, NOT today's date. Do NOT assume a repo is new just because it has recent commits.
- Google: General web search for recent conference appearances, blog posts, and news mentions
- Dev.to, Medium, personal blogs: Search for articles they've recently written
- Conference/event websites: Search for speaker listings, schedules, and talk recordings

IMPORTANT: Only include activities from the last 6 months. Skip anything older.
IMPORTANT: For open source projects, the date must be the actual GitHub repository creation date. Visit the repo page to verify.
IMPORTANT: For speaking engagements, search thoroughly — check Bluesky, X, LinkedIn, conference websites, and YouTube for any talks, workshops, or appearances.

For each activity found, note:
- What it is (talk, blog post, open source project, video, podcast, event, hackathon, etc.)
- The title
- The full URL/link (must be a complete URL starting with https://)
- A brief description
- The approximate date (for repos: the actual creation date from GitHub)

List everything you find. Be thorough — check multiple pages and sources, but only recent items.`;
}

// Phase 2: Convert prompt — take raw research and convert to structured JSON
function buildConvertPrompt(researchDataPath, outputPath, existingContributions) {
  const samples = sampleExamples(existingContributions);
  const existingUrls = existingContributions
    .map(c => c.url)
    .filter(Boolean);

  const language = detectLanguage(existingContributions);

  let styleSection;
  if (samples.length > 0) {
    const examplesJson = JSON.stringify(
      samples.map(({ title, url, description, type, date }) => ({ title, url, description, type, date })),
      null,
      2
    );

    styleSection = `Here are examples of how this person's existing contributions are formatted — match the SAME language, tone, and description style exactly:

${examplesJson}

The detected writing style is ${language}. Write all new entries in the same language and voice as these examples.`;
  } else {
    styleSection = `This person has no existing contributions yet. Use a professional, first-person style for descriptions (e.g. "I spoke about X at Y", "A workshop about X for Y").`;
  }

  const excludeSection = existingUrls.length > 0
    ? `\nExclude any of these URLs (already recorded):\n${existingUrls.join('\n')}\n`
    : '';

  return `Read the research data from the file at ${researchDataPath}.

Convert ALL the activities found into a valid JSON array and write it to ${outputPath}.

${styleSection}
${excludeSection}
Each object in the JSON array must have exactly these fields:
- "title": string
- "url": string or null
- "description": string (matching the style above)
- "type": one of: ${CONTRIBUTION_TYPES.join(', ')}
- "date": ISO 8601 string (e.g. "2025-03-22T00:00:00.000Z")

Write ONLY valid JSON to the output file. No explanations, no markdown — just the raw JSON array.
Make sure the file is written successfully.`;
}

function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function validateContribution(item) {
  if (!item || typeof item !== 'object') return null;
  if (!item.title || !item.description || !item.date) return null;
  if (item.type && !CONTRIBUTION_TYPES.includes(item.type)) {
    item.type = 'OTHER';
  }

  let url = item.url ? String(item.url).trim() : null;
  // Fix URLs missing protocol
  if (url && !url.startsWith('http')) {
    url = 'https://' + url;
  }
  // Drop invalid URLs entirely — the API crashes on bad URLs
  if (url && !isValidUrl(url)) {
    url = null;
  }

  return {
    title: String(item.title),
    url,
    description: String(item.description),
    type: item.type || 'OTHER',
    date: String(item.date),
  };
}

const BOX_HEIGHT = 8;
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function createScrollBox(label) {
  const lines = [];
  let frame = 0;
  let timer = null;

  function render() {
    const spinner = chalk.hex('#e3b341')(SPINNER_FRAMES[frame % SPINNER_FRAMES.length]);
    const title = `${spinner} ${label}`;
    const boxWidth = Math.max(40, (process.stdout.columns || 80) - 4);

    const visible = lines.slice(-BOX_HEIGHT);
    while (visible.length < BOX_HEIGHT) visible.push('');

    const content = visible
      .map(l => chalk.dim(l))
      .join('\n');

    const box = boxen(content, {
      title,
      titleAlignment: 'left',
      width: boxWidth,
      padding: { left: 1, right: 1 },
      margin: { left: 1 },
      borderStyle: 'round',
      borderColor: 'gray',
      dimBorder: true,
    });

    logUpdate(box);
  }

  function startSpinner() {
    timer = setInterval(() => {
      frame++;
      render();
    }, 80);
  }

  function push(text) {
    const parts = text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trimEnd();
      if (i === 0 && lines.length > 0) {
        lines[lines.length - 1] += part;
      } else {
        lines.push(part);
      }
    }
  }

  function finish() {
    if (timer) clearInterval(timer);
    frame = 0;
    const title = `${chalk.green('✔')} ${label}`;
    const boxWidth = Math.max(40, (process.stdout.columns || 80) - 4);
    const visible = lines.slice(-BOX_HEIGHT);
    while (visible.length < BOX_HEIGHT) visible.push('');
    const content = visible.map(l => chalk.dim(l)).join('\n');
    const box = boxen(content, {
      title,
      titleAlignment: 'left',
      width: boxWidth,
      padding: { left: 1, right: 1 },
      margin: { left: 1 },
      borderStyle: 'round',
      borderColor: 'gray',
      dimBorder: true,
    });
    logUpdate(box);
    logUpdate.done();
  }

  render();
  startSpinner();
  return { push, finish };
}

function spawnCopilotStreaming(prompt, label, timeout = 180_000) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const box = createScrollBox(label);

    const proc = spawn('copilot', ['-p', prompt, '--allow-all-tools'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    });

    proc.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      box.push(text);
    });

    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      box.finish();
      if (err.code === 'ENOENT') {
        reject(new Error(
          'GitHub Copilot CLI not found. Install it:\n  npm install -g @github/copilot\nThen authenticate:\n  copilot /login'
        ));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      box.finish();
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Copilot CLI exited with code ${code}: ${stderr.trim()}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function researchActivities(query, existingContributions) {
  const timestamp = Date.now();
  const researchDataPath = join(tmpdir(), `stars-profile-research-${timestamp}.txt`);
  const outputPath = join(tmpdir(), `stars-profile-results-${timestamp}.json`);

  // Phase 1: Deep research — streams in scroll box
  const researchOutput = await spawnCopilotStreaming(
    buildResearchPrompt(query),
    '★ Copilot Deep Research'
  );

  // Save research data to temp file for phase 2
  writeFileSync(researchDataPath, researchOutput);

  // Phase 2: Convert to structured JSON
  await spawnCopilotStreaming(
    buildConvertPrompt(researchDataPath, outputPath, existingContributions),
    '★ Converting to structured data'
  );

  // Read the JSON output file
  let jsonContent;
  try {
    jsonContent = readFileSync(outputPath, 'utf-8');
  } catch {
    throw new Error(
      `Copilot did not write the JSON output file at ${outputPath}.\nResearch data saved at: ${researchDataPath}`
    );
  }

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonContent.trim());
  } catch {
    const match = jsonContent.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error(
          `Could not parse JSON from output file.\nFile: ${outputPath}\nResearch data: ${researchDataPath}`
        );
      }
    } else {
      throw new Error(
        `Invalid JSON in output file.\nFile: ${outputPath}\nResearch data: ${researchDataPath}`
      );
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Output JSON is not an array.');
  }

  // Validate and dedup
  const existingUrls = new Set(
    existingContributions.map(c => c.url).filter(Boolean)
  );

  return parsed
    .map(validateContribution)
    .filter(Boolean)
    .filter(item => !item.url || !existingUrls.has(item.url));
}
