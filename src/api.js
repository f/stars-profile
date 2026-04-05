const API_URL = 'https://api-stars.github.com/';

export const CONTRIBUTION_TYPES = [
  'SPEAKING',
  'BLOGPOST',
  'ARTICLE_PUBLICATION',
  'EVENT_ORGANIZATION',
  'HACKATHON',
  'OPEN_SOURCE_PROJECT',
  'VIDEO_PODCAST',
  'FORUM',
  'OTHER',
];

async function gql(token, query) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();

  if (json.errors) {
    const msg = json.errors.map(e => e.message).join('; ');
    throw new Error(`GraphQL error: ${msg}`);
  }

  return json.data;
}

export async function fetchExistingContributions(token) {
  const data = await gql(token, '{ contributions { id title url description type date } }');
  return data.contributions;
}

export async function createContributions(token, items) {
  const entries = items.map(item => {
    const type = item.type ? `type:${item.type}` : '';
    const escapedTitle = item.title.replace(/"/g, '\\"');
    const escapedDesc = item.description.replace(/"/g, '\\"');
    const parts = [
      `title:"${escapedTitle}"`,
      `description:"${escapedDesc}"`,
      `date:"${item.date}"`,
    ];
    if (item.url) parts.push(`url:"${item.url}"`);
    if (type) parts.push(type);
    return `{ ${parts.join(' ')} }`;
  });

  const mutation = `mutation {
    createContributions(data: [${entries.join(', ')}]) {
      id
    }
  }`;

  const data = await gql(token, mutation);
  return data.createContributions;
}

export function buildDryCurlCommand(token, items) {
  const entries = items.map(item => {
    const url = item.url ? `url:"${item.url}"` : '';
    const type = item.type ? `type:${item.type}` : '';
    const escapedTitle = item.title.replace(/"/g, '\\"');
    const escapedDesc = item.description.replace(/"/g, '\\"');
    return `              {
                title:"${escapedTitle}"
                ${url}
                description:"${escapedDesc}"
                ${type}
                date: "${item.date}"
              }`;
  });

  return `curl --location --request POST '${API_URL}' \\
    --header 'Authorization: Bearer ${token}' \\
    --header 'Content-Type: application/json' \\
    --data-raw '{"query":"
          mutation {
            createContributions(data:
              [${entries.join('\n')}])
              {
                id
              }
          }"
        ,"variables":{}}'`;
}
