import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'public', 'content');
const articlesDir = path.join(contentDir, 'articles');
const jaDir = path.join(contentDir, 'locales', 'ja');

const categories = [
  'items.json',
  'exceptions.json',
  'compiler-errors.json',
  'compiler-warnings.json',
  'concepts.json',
  'code-recipes.json',
  'logic-errors.json'
];

const baseFields = [
  'id', 'type', 'bad', 'good', 'code', 'related',
  'badHighlight', 'goodHighlight', 'codeHighlight'
];
const localeFields = [
  'title', 'short', 'summary', 'why', 'tips', 'tags',
  'badNotes', 'goodNotes', 'codeNotes'
];
const annotationHighlightFields = ['badHighlight', 'goodHighlight', 'codeHighlight'];
const annotationNoteFields = ['badNotes', 'goodNotes', 'codeNotes'];

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function pick(source, fields) {
  return Object.fromEntries(fields
    .filter(field => Object.hasOwn(source, field))
    .map(field => [field, source[field]]));
}

function pretty(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

await mkdir(articlesDir, { recursive: true });
await mkdir(jaDir, { recursive: true });

const annotations = await readJson(path.join(contentDir, 'code-annotations.json'));
let count = 0;

for (const category of categories) {
  const legacy = await readJson(path.join(contentDir, category));
  const baseArticles = [];
  const jaEntries = {};

  for (const article of legacy) {
    const annotation = annotations[article.id] ?? {};
    baseArticles.push({
      ...pick(article, baseFields),
      ...pick(annotation, annotationHighlightFields)
    });
    jaEntries[article.id] = {
      ...pick(article, localeFields),
      ...pick(annotation, annotationNoteFields)
    };
    count += 1;
  }

  await writeFile(path.join(articlesDir, category), pretty(baseArticles), 'utf8');
  await writeFile(path.join(jaDir, category), pretty(jaEntries), 'utf8');
}

if (count !== 100) {
  throw new Error(`Expected 100 legacy articles, found ${count}`);
}

console.log(`Migrated ${count} articles into split base/Japanese locale data.`);
