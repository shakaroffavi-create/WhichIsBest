'use strict';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DEFAULT_FOLDER_ID = '1RiQgc1jiYik8yJ3wACX5xl2ECmftK6TM';
const CACHE_MS = 15 * 60 * 1000;
const MAX_FILES = 100;
const MAX_DEPTH = 4;
let cache = { expires: 0, documents: [] };

function tokenize(value) {
  return [...new Set(String(value || '').toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2))];
}

function chunks(text, size = 1500, overlap = 200) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];
  const output = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    output.push(clean.slice(start, start + size));
    if (start + size >= clean.length) break;
  }
  return output;
}

async function driveJson(path, apiKey, params = {}) {
  const url = new URL(DRIVE_API + path);
  url.searchParams.set('key', apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Google Drive API ' + response.status);
  return response.json();
}

async function listFolder(folderId, apiKey, depth = 0, prefix = '') {
  if (depth > MAX_DEPTH) return [];
  const result = await driveJson('/files', apiKey, {
    q: "'" + folderId + "' in parents and trashed = false",
    fields: 'files(id,name,mimeType,modifiedTime)',
    pageSize: '100',
    orderBy: 'modifiedTime desc'
  });
  const output = [];
  for (const file of result.files || []) {
    if (output.length >= MAX_FILES) break;
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      output.push(...await listFolder(file.id, apiKey, depth + 1, prefix + file.name + '/'));
    } else {
      output.push({ ...file, path: prefix + file.name });
    }
  }
  return output.slice(0, MAX_FILES);
}

function isReadable(file) {
  return /\.md$/i.test(file.name) ||
    file.mimeType === 'text/markdown' ||
    file.mimeType === 'text/plain' ||
    file.mimeType === 'application/vnd.google-apps.document';
}

async function downloadText(file, apiKey) {
  const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
  const url = new URL(DRIVE_API + '/files/' + encodeURIComponent(file.id) + (isGoogleDoc ? '/export' : ''));
  url.searchParams.set('key', apiKey);
  if (isGoogleDoc) url.searchParams.set('mimeType', 'text/plain');
  else url.searchParams.set('alt', 'media');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Drive download ' + response.status);
  return response.text();
}

async function loadDocuments(apiKey, folderId) {
  if (cache.expires > Date.now() && cache.documents.length) return cache.documents;
  const files = (await listFolder(folderId, apiKey)).filter(isReadable);
  const documents = [];
  for (const file of files) {
    try {
      const text = await downloadText(file, apiKey);
      if (text.trim()) documents.push({ ...file, text });
    } catch (error) {
      console.warn('MD knowledge file skipped:', file.path, error.message);
    }
  }
  cache = { expires: Date.now() + CACHE_MS, documents };
  return documents;
}

function rankDocuments(documents, body) {
  const categoryTokens = tokenize(body.category);
  const queryTokens = tokenize([
    body.category,
    body.question,
    ...(Array.isArray(body.options) ? body.options : []),
    body.background,
    ...(Array.isArray(body.considerations) ? body.considerations : [])
  ].join(' '));
  const candidates = [];
  for (const document of documents) {
    for (const chunk of chunks(document.text)) {
      const haystack = (document.path + '\n' + chunk).toLowerCase();
      let score = 0;
      for (const token of queryTokens) if (haystack.includes(token)) score += 2;
      for (const token of categoryTokens) if (haystack.includes(token)) score += 4;
      if (score > 0) candidates.push({ score, chunk, document });
    }
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 6);
}

async function enrichWithKnowledge(body) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;
  if (!apiKey) return { body, sources: [] };

  try {
    const documents = await loadDocuments(apiKey, folderId);
    const matches = rankDocuments(documents, body);
    let context = '';
    const sources = [];
    const seen = new Set();
    for (const match of matches) {
      const block = '\n--- מקור: ' + match.document.path + ' ---\n' + match.chunk;
      if ((context + block).length > 7000) break;
      context += block;
      if (!seen.has(match.document.id)) {
        seen.add(match.document.id);
        sources.push({
          file: match.document.name,
          path: match.document.path,
          modifiedTime: match.document.modifiedTime
        });
      }
    }
    return {
      body: { ...body, knowledgeContext: context.trim() },
      sources
    };
  } catch (error) {
    console.error('Private MD knowledge lookup failed:', error.message);
    return { body, sources: [] };
  }
}

module.exports = { enrichWithKnowledge };
