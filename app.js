const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const cfg = window.WIB_CONFIG || {};
const form = $('#decision-form');
const contextToggle = $('#context-toggle');
const contextBody = $('#context-body');
const contextPanel = $('#context-panel');
const question = $('#question');
const background = $('#background');
const attachments = $('#attachments');
const fileList = $('#file-list');
const voiceButton = $('#voice-button');
const voiceStatus = $('#voice-status');
const profileKey = 'wichisbest-v4-profile';
const historyKey = 'wichisbest-v4-history';
const sessionKey = 'wichisbest-v4-session';
let selectedFiles = [];
let recognition = null;
let currentSession = null;
let latestDecision = null;

function safeParse(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }
function localGet(key, fallback) { return safeParse(localStorage.getItem(key), fallback); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatDate(value) { try { return new Intl.DateTimeFormat('he-IL', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); } catch { return ''; } }
function configuredSupabase() { return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey); }
function authHeaders(extra={}) { return { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${currentSession?.access_token || cfg.supabaseAnonKey}`, ...extra }; }


async function fetchWithTimeout(url, options={}, timeoutMs=30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('הבקשה ארכה זמן רב מדי');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function supabase(path, options={}) {
  if (!configuredSupabase()) throw new Error('Supabase לא הוגדר');
  const response = await fetchWithTimeout(`${cfg.supabaseUrl}${path}`, { ...options, headers: authHeaders(options.headers || {}) }, 15000);
  const text = await response.text();
  const data = text ? safeParse(text, text) : null;
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || `Supabase ${response.status}`);
  return data;
}

function setSystemStatus(text, tone='') {
  const el = $('#hero-system-status');
  if (!el) return;
  el.textContent = text;
  el.dataset.tone = tone;
}

async function checkHealth() {
  try {
    const response = await fetchWithTimeout('/api/health', { cache:'no-store' }, 8000);
    if (!response.ok) throw new Error();
    const data = await response.json();
    const count = Object.values(data.providers || {}).filter(Boolean).length;
    setSystemStatus(count ? `${count} מודלי AI מחוברים` : 'מוכן להגדרת מודלי AI', count ? 'ok' : 'warn');
  } catch {
    setSystemStatus('מצב מקומי זמין', 'warn');
  }
}

function updateCounters() {
  $('#question-count').textContent = `${question.value.length}/1000`;
  $('#background-count').textContent = `${background.value.length}/2500`;
}
if (question) question.addEventListener('input', updateCounters);
if (background) background.addEventListener('input', updateCounters);

if (contextToggle) contextToggle.addEventListener('click', () => {
  const open = contextBody.hidden;
  contextBody.hidden = !open;
  contextPanel.classList.toggle('open', open);
  contextToggle.setAttribute('aria-expanded', String(open));
});

const uploadButton = $('#upload-button'); if (uploadButton && attachments) uploadButton.addEventListener('click', () => attachments.click());
if (attachments) attachments.addEventListener('change', () => {
  const incoming = [...attachments.files];
  for (const file of incoming) {
    if (file.size > 20 * 1024 * 1024) { showMessage(`הקובץ ${file.name} גדול מ־20MB.`, 'error'); continue; }
    if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) selectedFiles.push(file);
  }
  attachments.value = '';
  renderFiles();
});

function renderFiles() {
  fileList.innerHTML = selectedFiles.map((file, index) => `<span class="file-chip"><span>📎</span>${escapeHtml(file.name)} <small>${Math.ceil(file.size/1024)}KB</small><button type="button" data-remove-file="${index}" aria-label="הסרת קובץ">×</button></span>`).join('');
  $$('[data-remove-file]').forEach(btn => btn.addEventListener('click', () => { selectedFiles.splice(Number(btn.dataset.removeFile), 1); renderFiles(); }));
}

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { voiceButton.disabled = true; voiceButton.title = 'הדפדפן אינו תומך בהכתבה'; return; }
  recognition = new SpeechRecognition();
  recognition.lang = 'he-IL';
  recognition.interimResults = true;
  let base = '';
  recognition.onstart = () => { base = background.value.trim(); voiceButton.classList.add('recording'); voiceButton.textContent = '⏹ עצירה'; voiceStatus.textContent = 'מקשיב…'; };
  recognition.onresult = (event) => {
    const transcript = [...event.results].map(r => r[0].transcript).join(' ');
    background.value = `${base}${base ? ' ' : ''}${transcript}`.slice(0, 2500);
    updateCounters();
  };
  recognition.onend = () => { voiceButton.classList.remove('recording'); voiceButton.textContent = '🎤 הכתבה'; voiceStatus.textContent = 'ההכתבה נוספה לתיאור הרקע'; };
  recognition.onerror = () => { voiceStatus.textContent = 'לא ניתן היה להשתמש במיקרופון'; };
  if (voiceButton) voiceButton.addEventListener('click', () => voiceButton.classList.contains('recording') ? recognition.stop() : recognition.start());
}
setupVoice();

function profileData() { return { background: background.value.trim(), considerations: $('#considerations').value.trim(),
    criteria: collectCriteria(), updatedAt:new Date().toISOString() }; }
function refreshProfileUI() {
  const saved = localGet(profileKey, null);
  $('#load-profile').hidden = !saved;
  $('#delete-profile').hidden = !saved;
  $('#memory-status').classList.toggle('saved', Boolean(saved));
  $('#memory-status strong').textContent = saved ? `קיים מידע שמור, עודכן ${formatDate(saved.updatedAt)}` : 'לא נשמר עדיין מידע אישי';
  $('#local-indicator').textContent = currentSession ? `מחובר: ${currentSession.user?.email || 'חשבון אישי'}` : 'מצב מקומי';
  $('#auth-button').textContent = currentSession ? 'החשבון שלי' : 'כניסה / הרשמה';
}
const loadProfileButton = $('#load-profile'); if (loadProfileButton) loadProfileButton.addEventListener('click', () => { const saved=localGet(profileKey,null); if (!saved) return; background.value=saved.background||''; $('#considerations').value=saved.considerations||''; if (contextBody.hidden) contextToggle.click(); updateCounters(); showMessage('המידע השמור נטען.', 'success'); });
const deleteProfileButton = $('#delete-profile'); if (deleteProfileButton) deleteProfileButton.addEventListener('click', () => { localStorage.removeItem(profileKey); refreshProfileUI(); showMessage('המידע השמור נמחק מהמכשיר.', 'success'); });

function showMessage(text='', type='') { const el=$('#form-message'); el.textContent=text; el.className=`form-message ${type}`; }

function criterionRow(name = '', weight = 5) {
  const row = document.createElement('div');
  row.className = 'criterion-row';
  row.innerHTML = `
    <input class="criterion-name" type="text" maxlength="80" placeholder="שם הקריטריון" value="${escapeHtml(name)}">
    <label class="criterion-weight">
      <span>חשיבות</span>
      <input type="range" min="1" max="10" value="${Math.max(1, Math.min(10, Number(weight) || 5))}">
      <output>${Math.max(1, Math.min(10, Number(weight) || 5))}</output>
    </label>
    <button type="button" class="criterion-remove" aria-label="מחיקת קריטריון">×</button>`;
  return row;
}

function bindCriterionRow(row) {
  const range = row.querySelector('input[type="range"]');
  const output = row.querySelector('output');
  const remove = row.querySelector('.criterion-remove');
  if (range && output) {
    const sync = () => { output.value = range.value; output.textContent = range.value; };
    range.addEventListener('input', sync);
    sync();
  }
  if (remove) {
    remove.addEventListener('click', () => {
      const list = document.querySelector('#criteria-list');
      if (!list) return;
      if (list.querySelectorAll('.criterion-row').length <= 1) {
        const input = row.querySelector('.criterion-name');
        if (input) input.value = '';
        return;
      }
      row.remove();
    });
  }
}

function collectCriteria() {
  return [...document.querySelectorAll('#criteria-list .criterion-row')]
    .map(row => ({
      name: String(row.querySelector('.criterion-name')?.value || '').trim(),
      weight: Number(row.querySelector('input[type="range"]')?.value || 5)
    }))
    .filter(item => item.name)
    .slice(0, 8);
}

function initializeCriteriaEditor() {
  document.querySelectorAll('#criteria-list .criterion-row').forEach(bindCriterionRow);
  const add = document.querySelector('#add-criterion');
  if (add) {
    add.addEventListener('click', () => {
      const list = document.querySelector('#criteria-list');
      if (!list) return;
      if (list.querySelectorAll('.criterion-row').length >= 8) {
        showMessage('אפשר להוסיף עד שמונה קריטריונים.', 'error');
        return;
      }
      const row = criterionRow('', 5);
      list.appendChild(row);
      bindCriterionRow(row);
      row.querySelector('.criterion-name')?.focus();
    });
  }
}



function initializeInlineUpload() {
  const inlineButton = document.querySelector('#upload-inline-button');
  const attachments = document.querySelector('#attachments');
  const contextToggle = document.querySelector('#context-toggle');
  const contextBody = document.querySelector('#context-body');

  if (!inlineButton || !attachments) return;

  inlineButton.addEventListener('click', () => {
    if (contextBody?.hidden && contextToggle) {
      contextToggle.click();
    }
    attachments.click();
  });
}

function collectForm() {
  return {
    category: $('#category').value,
    question: question.value.trim(),
    options: [$('#option-a').value.trim(), $('#option-b').value.trim(), $('#option-c').value.trim()].filter(Boolean),
    considerations: $('#considerations').value.trim(),
    criteria: collectCriteria(),
    background: background.value.trim(),
    sourceLink: $('#source-link').value.trim(),
    files: selectedFiles.map(f => ({ name:f.name, type:f.type, size:f.size })),
    memory: $('#save-profile').checked ? [$('#considerations').value.trim(), background.value.trim(), collectCriteria().map(c => `${c.name} (${c.weight}/10)`).join(', ')].filter(Boolean) : []
  };
}

async function uploadFiles(decisionId) {
  if (!currentSession || !configuredSupabase() || !selectedFiles.length) return [];
  const uploaded=[];
  for (const file of selectedFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${currentSession.user.id}/${decisionId}/${Date.now()}-${safeName}`;
    await supabase(`/storage/v1/object/decision-files/${encodeURI(path)}`, { method:'POST', headers:{ 'content-type':file.type || 'application/octet-stream', 'x-upsert':'false' }, body:file });
    uploaded.push({ storage_path:path, file_name:file.name, mime_type:file.type, size_bytes:file.size, user_id:currentSession.user.id, decision_id:decisionId });
  }
  if (uploaded.length) await supabase('/rest/v1/decision_files', { method:'POST', headers:{'content-type':'application/json','Prefer':'return=minimal'}, body:JSON.stringify(uploaded) });
  return uploaded;
}

async function saveDecisionCloud(payload, analysis) {
  if (!currentSession || !configuredSupabase()) return null;
  const row = {
    user_id: currentSession.user.id,
    category: payload.category,
    question: payload.question,
    options: payload.options,
    considerations: payload.considerations,
    background: payload.background,
    source_link: payload.sourceLink,
    consensus: analysis.consensus,
    provider_responses: analysis.providers
  };
  const result = await supabase('/rest/v1/decisions', { method:'POST', headers:{'content-type':'application/json','Prefer':'return=representation'}, body:JSON.stringify(row) });
  const decision = result?.[0];
  if (decision) await uploadFiles(decision.id);
  return decision;
}

function fallbackAnalysis(payload) {
  const ranking = payload.options.map((option, i) => ({
    option,
    score:Math.max(58,88-i*9),
    why:'דירוג גיבוי זמני עד להגדרת מפתחות API ב־Netlify.',
    analysis:'במצב הגיבוי המערכת יכולה להציג את מבנה ההשוואה, אך ניתוח מפורט המבוסס על הרקע והשיקולים יופיע לאחר חיבור לפחות מודל AI אחד.',
    advantages:['החלופה נכללה בהשוואה ונשמרה בתיק ההחלטה'],
    risks:['נדרש מידע נוסף לאימות ההחלטה'],
    conditions:['חיבור מודלי AI עשוי לשנות את הדירוג']
  }));
  return { ok:true, providers:[{provider:'ChatGPT',status:'not_configured'},{provider:'Gemini',status:'not_configured'},{provider:'Claude',status:'not_configured'}], consensus:{ranking,providerCount:0,summary:'האתר עובד, אך מפתחות המודלים עדיין אינם מוגדרים ב־Netlify.'} };
}



function cleanModelDisplayText(value, fallback = '') {
  let text = String(value ?? '').trim();
  if (!text) return fallback;

  // Recover a quoted summary/analysis value from a JSON fragment.
  const fieldMatch = text.match(/["'](?:summary|analysis|why)["']\s*:\s*["']((?:\\.|[^"'\\])*)/i);
  if (fieldMatch) {
    text = fieldMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  if (/^\s*[{\[]/.test(text) || /^["']?(?:summary|ranking|analysis)["']?\s*[}:]/i.test(text)) {
    return fallback;
  }

  return text;
}

function normalizeAnalysis(raw, payload) {
  const fallback = fallbackAnalysis(payload);
  const safe = raw && typeof raw === 'object' ? raw : {};
  const providers = Array.isArray(safe.providers) ? safe.providers.map((p, index) => ({
    provider: p?.provider || ['ChatGPT','Gemini','Claude'][index] || `Model ${index + 1}`,
    status: ['ok','error','not_configured','pending'].includes(p?.status) ? p.status : (p?.parsed ? 'ok' : 'error'),
    text: typeof p?.text === 'string' ? p.text : '',
    parsed: p?.parsed && typeof p.parsed === 'object' ? p.parsed : null,
    error: typeof p?.error === 'string' ? p.error : ''
  })) : fallback.providers;

  const incomingRanking = Array.isArray(safe?.consensus?.ranking) ? safe.consensus.ranking : [];
  const ranking = payload.options.map((option, index) => {
    const found = incomingRanking.find((item) => {
      const name = String(item?.option || '');
      return name === option || (name && option.includes(name)) || (name && name.includes(option));
    });
    const fb = fallback.consensus.ranking[index] || {};
    return {
      option,
      score: Number.isFinite(Number(found?.score)) ? Number(found.score) : Number(fb.score || 0),
      why: cleanModelDisplayText(found?.why, fb.why || 'לא התקבל נימוק מפורט.'),
      analysis: cleanModelDisplayText(found?.analysis || found?.explanation || found?.rationale || found?.why, fb.analysis || 'לא התקבל ניתוח מפורט.'),
      advantages: Array.isArray(found?.advantages) ? found.advantages : (fb.advantages || []),
      risks: Array.isArray(found?.risks) ? found.risks : (fb.risks || []),
      conditions: Array.isArray(found?.conditions) ? found.conditions : (fb.conditions || [])
    };
  }).sort((a,b) => b.score - a.score);

  return {
    ok: safe.ok !== false,
    generatedAt: safe.generatedAt || new Date().toISOString(),
    providers,
    consensus: {
      ranking,
      providerCount: Number.isFinite(Number(safe?.consensus?.providerCount))
        ? Number(safe.consensus.providerCount)
        : providers.filter(p => p.status === 'ok').length,
      summary: String(safe?.consensus?.summary || fallback.consensus.summary)
    }
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`השרת החזיר תשובה לא תקינה (${response.status}).`);
  }
}

function safeDecisionId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return `local-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}


async function requestSingleProvider(provider, payload) {
  const endpoints = {
    openai: '/api/openai',
    gemini: '/api/gemini',
    claude: '/api/claude'
  };
  const timeoutByProvider = {
    openai: 24000,
    gemini: 17000,
    claude: 32000
  };
  const maxAttempts = provider === 'openai' ? 2 : provider === 'claude' ? 2 : 1;
  const endpoint = endpoints[provider];

  if (!endpoint) throw new Error('מודל לא מוכר');

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload)
      }, timeoutByProvider[provider] || 20000);

      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `שגיאת שרת ${response.status}`);
      }

      const providerResult = data?.providers?.[0];
      const retryableMessage = String(providerResult?.error || '').toLowerCase();
      const retryable =
        providerResult?.status === 'error' &&
        /timeout|504|502|503|429|temporar|network|fetch failed/.test(retryableMessage);

      if (retryable && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      if (providerResult) providerResult.browserAttempts = attempt;
      return data;
    } catch (error) {
      lastError = error;
      const retryable = /timeout|504|502|503|429|temporar|network|fetch failed/i.test(String(error?.message || error));
      if (attempt >= maxAttempts || !retryable) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw lastError || new Error('לא התקבלה תשובה מהמודל');
}

function providerDisplayName(key) {
  return key === 'openai' ? 'ChatGPT' : key === 'gemini' ? 'Gemini' : key === 'claude' ? 'Claude' : key;
}

function providerFailure(key, error) {
  return {
    ok: false,
    providers: [{
      provider: providerDisplayName(key),
      status: 'error',
      error: error?.message || String(error || 'לא התקבלה תשובה'),
      parsed: null
    }],
    consensus: { ranking: [], providerCount: 0, summary: '' }
  };
}

function combineProgressiveAnalyses(payload, rawByProvider, pendingKeys = []) {
  const providerKeys = ['openai', 'gemini', 'claude'];
  const providers = [];

  for (const key of providerKeys) {
    if (pendingKeys.includes(key)) {
      providers.push({ provider: providerDisplayName(key), status: 'pending', parsed: null, error: '' });
      continue;
    }
    const raw = rawByProvider[key];
    const p = raw?.providers?.[0];
    if (p) {
      providers.push({
        ...p,
        diagnostics: raw?.diagnostics || null
      });
    }
  }

  const successful = providers.filter(p => p.status === 'ok' && p.parsed);
  const ranking = payload.options.map((option, index) => {
    const entries = successful.map(provider => {
      const rows = provider.parsed?.ranking || [];
      return rows.find(row => {
        const name = String(row?.option || '');
        return name === option || (name && option.includes(name)) || (name && name.includes(option));
      });
    }).filter(Boolean);

    if (!entries.length) {
      const fallback = fallbackAnalysis(payload).consensus.ranking[index];
      return { ...fallback, option };
    }

    const scores = entries.map(e => Number(e.score)).filter(Number.isFinite);
    const score = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
    const best = entries[0] || {};

    return {
      option,
      score,
      why: entries.map(e => e.why).filter(Boolean).join(' | ') || best.analysis || 'התקבלה המלצה מהמודל.',
      analysis: entries.map(e => e.analysis || e.explanation || e.rationale).filter(Boolean).join('\n\n') || best.why || '',
      advantages: [...new Set(entries.flatMap(e => Array.isArray(e.advantages) ? e.advantages : []))].slice(0, 6),
      risks: [...new Set(entries.flatMap(e => Array.isArray(e.risks) ? e.risks : []))].slice(0, 6),
      conditions: [...new Set(entries.flatMap(e => Array.isArray(e.conditions) ? e.conditions : []))].slice(0, 6)
    };
  }).sort((a,b) => b.score - a.score);

  const pendingNames = pendingKeys.map(providerDisplayName);
  const summary = successful.length
    ? `${successful.length} מודלים כבר השיבו${pendingNames.length ? `; ${pendingNames.join(' ו־')} עדיין מנתחים` : ''}.`
    : pendingNames.length
      ? `${pendingNames.join(' ו־')} מנתחים כעת את השאלה.`
      : 'לא התקבלה תשובת AI תקינה.';

  return normalizeAnalysis({
    ok: successful.length > 0,
    generatedAt: new Date().toISOString(),
    providers,
    consensus: {
      ranking,
      providerCount: successful.length,
      summary
    }
  }, payload);
}

function renderProgressiveDecision(payload, analysis, existingId = null) {
  latestDecision = {
    id: existingId || latestDecision?.id || safeDecisionId(),
    ...payload,
    analysis,
    createdAt: latestDecision?.createdAt || new Date().toISOString()
  };
  renderResults(latestDecision);
  return latestDecision;
}

if (form) form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = collectForm();
  if (!payload.category || !payload.question || payload.options.length < 2) {
    showMessage('יש לבחור קטגוריה, לכתוב שאלה ולהוסיף לפחות שתי חלופות.', 'error');
    return;
  }

  const submit = form.querySelector('[type="submit"]');
  const originalButton = submit?.innerHTML || 'הצגת הדירוג <span>←</span>';
  if (submit) {
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.innerHTML = 'פונה למודלים…';
  }

  if ($('#save-profile')?.checked) {
    try {
      localStorage.setItem(profileKey, JSON.stringify(profileData()));
      refreshProfileUI();
    } catch (error) {
      console.warn('Profile save skipped', error);
    }
  }

  const providerKeys = ['openai', 'gemini', 'claude'];
  const rawByProvider = {};
  const pending = new Set(providerKeys);
  const decisionId = safeDecisionId();
  let firstAnswerShown = false;

  showMessage('ChatGPT ו־Gemini מנתחים במקביל. במקרה של timeout יתבצע ניסיון נוסף אוטומטי.', 'working');

  const updateScreen = () => {
    const analysis = combineProgressiveAnalyses(payload, rawByProvider, [...pending]);
    renderProgressiveDecision(payload, analysis, decisionId);

    const ok = analysis.providers.filter(p => p.status === 'ok').length;
    const errors = analysis.providers.filter(p => p.status === 'error').length;
    const waiting = analysis.providers.filter(p => p.status === 'pending').map(p => p.provider);

    if (ok > 0 && waiting.length) {
      firstAnswerShown = true;
      showMessage(`התקבלה תשובה ראשונה. ${waiting.join(' ו־')} עדיין מנתחים ויתווספו אוטומטית.`, 'success');
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.innerHTML = originalButton;
      }
    } else if (ok > 0 && !waiting.length) {
      showMessage(`הניתוח הושלם עם ${ok} מודלים${errors ? `; ${errors} מודלים החזירו שגיאה` : ''}.`, 'success');
    } else if (!waiting.length && errors) {
      const detail = analysis.providers.filter(p => p.status === 'error').map(p => `${p.provider}: ${p.error || 'שגיאה'}`).join(' | ');
      showMessage(`המודלים לא החזירו תשובה תקינה: ${detail}`, 'error');
    }
  };

  // Show live pending state immediately.
  updateScreen();

  const jobs = providerKeys.map(key =>
    requestSingleProvider(key, payload)
      .then(data => {
        rawByProvider[key] = data;
      })
      .catch(error => {
        console.warn(`${providerDisplayName(key)} failed`, error);
        rawByProvider[key] = providerFailure(key, error);
      })
      .finally(() => {
        pending.delete(key);
        updateScreen();
      })
  );

  await Promise.allSettled(jobs);

  const finalAnalysis = combineProgressiveAnalyses(payload, rawByProvider, []);
  latestDecision = renderProgressiveDecision(payload, finalAnalysis, decisionId);

  try {
    saveLocalHistory(latestDecision);
  } catch (error) {
    console.warn('Local history save skipped', error);
  }

  try {
    const cloudDecision = await saveDecisionCloud(payload, finalAnalysis);
    if (cloudDecision?.id) latestDecision.id = cloudDecision.id;
  } catch (error) {
    console.warn('Cloud save skipped', error);
  }

  if (submit) {
    submit.disabled = false;
    submit.removeAttribute('aria-busy');
    submit.innerHTML = originalButton;
  }
});

function renderProviders(providers) {
  const strip = $('#provider-strip'); if (!strip) return;
  strip.innerHTML = providers.map(p => {
    const label = p.status==='ok' ? 'השיב' : p.status==='pending' ? 'מנתח…' : p.status==='not_configured' ? 'טרם חובר' : 'שגיאה';
    const detail = p.status==='error' && p.error ? ` title="${escapeHtml(p.error)}"` : '';
    const recoveryLabel = p.recovery === 'partial_json' ? ' · שוחזר מתשובה חלקית' : p.recovery === 'text_fallback' ? ' · שוחזר מטקסט' : '';
    return `<span class="provider-chip ${p.status}"${detail}><b>${escapeHtml(p.provider)}</b><small>${label}${recoveryLabel}</small></span>`;
  }).join('');
}

function renderResults(decision) {
  const { analysis } = decision;
  const resultQuestion = $('#result-question'); if (resultQuestion) resultQuestion.textContent = decision.question;
  const normalized = normalizeAnalysis(analysis, decision);
  decision.analysis = normalized;
  const safeAnalysis = normalized;
  const consensusSummary = $('#consensus-summary'); if (consensusSummary) consensusSummary.textContent = safeAnalysis.consensus.summary || '';
  const criteriaSummary = $('#criteria-summary');
  if (criteriaSummary) {
    const criteria = Array.isArray(decision.criteria) ? decision.criteria : [];
    criteriaSummary.hidden = !criteria.length;
    criteriaSummary.innerHTML = criteria.length
      ? `<strong>הקריטריונים שלך:</strong> ${criteria.map(item => `<span>${escapeHtml(item.name)} · ${Number(item.weight)}/10</span>`).join('')}`
      : '';
  }
  const analysisBadge = $('#analysis-badge'); if (analysisBadge) analysisBadge.textContent = safeAnalysis.consensus.providerCount ? `${safeAnalysis.consensus.providerCount} מודלים שולבו` : 'מצב גיבוי';
  renderProviders(safeAnalysis.providers || []);
  const rankingList = $('#ranking-list'); if (!rankingList) throw new Error('אזור התוצאות לא נטען');
  rankingList.innerHTML = (safeAnalysis.consensus.ranking || []).map((item,index) => {
    const letter=String.fromCharCode(65+index);
    const optionMatch = (provider) => (provider.parsed?.ranking || []).find((entry) => {
      const name = String(entry.option || '');
      return name === item.option || item.option.includes(name) || name.includes(item.option);
    });
    const providerDetails=(safeAnalysis.providers||[]).map(p=>{
      if (p.status === 'error') {
        const diagnosticText = [
          p.error || '',
          p.diagnostics?.error || '',
          p.diagnostics?.provider ? `provider: ${p.diagnostics.provider}` : '',
          p.diagnostics?.attempts ? `attempts: ${p.diagnostics.attempts}` : ''
        ].filter(Boolean).join(' | ');
        return `<div class="perspective provider-perspective provider-error"><strong>${escapeHtml(p.provider)} — שגיאת חיבור</strong><p>${escapeHtml(diagnosticText || 'לא התקבלה תשובה מהמודל.')}</p><p><small>בדיקה מלאה: /api/claude-debug</small></p></div>`;
      }
      if (p.status === 'not_configured') {
        return `<div class="perspective provider-perspective"><strong>${escapeHtml(p.provider)}</strong><p>המפתח עדיין לא הוגדר ב־Netlify.</p></div>`;
      }
      const view=optionMatch(p);
      const text=view?.analysis || view?.explanation || view?.rationale || view?.why || p.parsed?.summary || 'התגובה התקבלה ונכללה בשקלול.';
      return `<div class="perspective provider-perspective"><strong>${escapeHtml(p.provider)} — ניתוח החלופה</strong><p>${escapeHtml(text)}</p></div>`;
    }).join('');
    const advantages=(item.advantages||[]).length ? item.advantages : ['לא צוינו יתרונות מפורטים'];
    const risks=(item.risks||[]).length ? item.risks : ['לא סופקו סיכונים מפורטים'];
    const conditions=(item.conditions||[]).length ? item.conditions : ['לא צוינו תנאים לשינוי הדירוג'];
    return `<article class="rank-card"><div class="rank-main"><div class="rank-letter">${letter}</div><div class="rank-copy"><h3>${escapeHtml(item.option)}</h3><p>${escapeHtml(item.why)}</p></div><div class="rank-score"><b>${Number(item.score)||0}</b><small>מתוך 100</small></div></div><button class="explain" type="button" aria-expanded="false">הסבר וניתוח מלא</button><div class="rank-details"><div class="perspective full-analysis"><strong>ניתוח WICHISBEST</strong><p>${escapeHtml(item.analysis || item.why || 'לא התקבל ניתוח מפורט.')}</p></div><div class="perspective"><strong>יתרונות מרכזיים</strong><p>${advantages.map(escapeHtml).join(' · ')}</p></div><div class="perspective"><strong>סיכונים מרכזיים</strong><p>${risks.map(escapeHtml).join(' · ')}</p></div><div class="perspective"><strong>מתי הדירוג עשוי להשתנות?</strong><p>${conditions.map(escapeHtml).join(' · ')}</p></div>${providerDetails}</div></article>`;
  }).join('');
  $$('.explain').forEach(btn => btn.addEventListener('click', () => {
    const details = btn.nextElementSibling;
    const open = details.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'סגירת ההסבר' : 'הסבר וניתוח מלא';
  }));
  const resultsSection = $('#results'); if (resultsSection) { resultsSection.hidden=false; resultsSection.scrollIntoView({behavior:'smooth'}); }
  renderHistory();
}

function saveLocalHistory(decision) {
  const history=localGet(historyKey,[]);
  history.unshift({ id:decision.id, question:decision.question, category:decision.category, options:decision.options, ranking:decision.analysis.consensus.ranking, createdAt:decision.createdAt });
  localStorage.setItem(historyKey,JSON.stringify(history.slice(0,30)));
}
function renderHistory() {
  const history = localGet(historyKey, []);

  const historyList = $('#history-list');
  if (historyList) {
    historyList.innerHTML = history.length
      ? history.map(item => `<button class="history-item" type="button" data-history-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.question || '')}</strong><small>${escapeHtml(item.category || '')} · ${formatDate(item.createdAt)}</small></button>`).join('')
      : '<p class="empty-state">עדיין אין החלטות שמורות.</p>';
  }

  const select = $('#outcome-decision');
  if (select) {
    select.innerHTML = '<option value="">בחר פנייה שמורה</option>' +
      history.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(String(item.question || '').slice(0,70))}</option>`).join('');
  }

  const outcomePanel = $('#outcome-panel');
  if (outcomePanel) outcomePanel.hidden = !history.length;
}

const clearHistoryButton = $('#clear-history');
if (clearHistoryButton) {
  clearHistoryButton.addEventListener('click', () => {
    localStorage.removeItem(historyKey);
    renderHistory();
  });
}

const outcomeDecisionSelect = $('#outcome-decision');
if (outcomeDecisionSelect) {
  outcomeDecisionSelect.addEventListener('change', event => {
    const item = localGet(historyKey, []).find(v => v.id === event.target.value);
    for (const id of ['chosen-option','actual-winner']) {
      const el = $('#' + id);
      if (!el) continue;
      el.innerHTML = `<option value="">${id === 'chosen-option' ? 'מה בחר המשתמש?' : 'מה הצליח בפועל?'}</option>` +
        (item?.options || []).map(v => `<option>${escapeHtml(v)}</option>`).join('');
    }
  });
}

const outcomeForm = $('#outcome-form');
if (outcomeForm) {
  outcomeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const decisionSelect = $('#outcome-decision');
    const decisionId = decisionSelect?.value || '';
    if (!decisionId) return;

    const chosenOption = $('#chosen-option');
    const actualWinner = $('#actual-winner');
    const measurementDate = $('#measurement-date');
    const outcomeNotes = $('#outcome-notes');

    const outcome = {
      decision_id: decisionId,
      chosen_option: chosenOption?.value || '',
      actual_winner: actualWinner?.value || '',
      measurement_date: measurementDate?.value || null,
      notes: outcomeNotes?.value?.trim() || '',
      updatedAt: new Date().toISOString()
    };

    const outcomes = localGet('wichisbest-v4-outcomes', {});
    outcomes[decisionId] = outcome;
    localStorage.setItem('wichisbest-v4-outcomes', JSON.stringify(outcomes));

    if (currentSession && configuredSupabase() && !decisionId.includes('-local-')) {
      try {
        await supabase('/rest/v1/outcomes?on_conflict=decision_id', {
          method:'POST',
          headers:{'content-type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify({...outcome,user_id:currentSession.user.id})
        });
      } catch(e) {
        console.warn(e);
      }
    }

    alert('התוצאה בפועל נשמרה לאותה פנייה.');
  });
}

function resetCurrentComparison() {
  form.reset(); selectedFiles=[]; renderFiles(); showMessage(); contextBody.hidden=true; contextPanel.classList.remove('open'); contextToggle.setAttribute('aria-expanded','false'); $('#results').hidden=true; updateCounters(); $('#category').focus(); window.scrollTo({top:$('#compare').offsetTop-70,behavior:'smooth'});
}
const newComparisonButton = $('#new-comparison'); if (newComparisonButton) newComparisonButton.addEventListener('click', resetCurrentComparison);
const backToFormButton = $('#back-to-form'); if (backToFormButton) backToFormButton.addEventListener('click',()=>{ const compare = $('#compare'); if (compare) compare.scrollIntoView({behavior:'smooth'}); });

const authDialog=$('#auth-dialog');
const authButton = $('#auth-button'); if (authButton) authButton.addEventListener('click',()=>{
  if (currentSession) { if(confirm('להתנתק מהחשבון?')) { currentSession=null; localStorage.removeItem(sessionKey); refreshProfileUI(); } return; }
  if (authDialog?.showModal) authDialog.showModal();
});
const sendMagicLinkButton = $('#send-magic-link'); if (sendMagicLinkButton) sendMagicLinkButton.addEventListener('click',async()=>{
  const email=$('#auth-email').value.trim(); const msg=$('#auth-message');
  if (!configuredSupabase()) { msg.textContent='Supabase עדיין לא הוגדר. הוראות ההפעלה נמצאות בקובץ README_FIRST.'; return; }
  if (!email) { msg.textContent='יש להזין כתובת דוא״ל.'; return; }
  try { await supabase('/auth/v1/otp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,options:{emailRedirectTo:location.origin}})}); msg.textContent='קישור כניסה נשלח. בדוק את תיבת הדוא״ל.'; } catch(e){ msg.textContent=e.message; }
});

function parseSessionFromUrl() {
  const params=new URLSearchParams(location.hash.slice(1));
  if (params.get('access_token')) {
    currentSession={access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_at:Date.now()+Number(params.get('expires_in')||3600)*1000,user:{email:params.get('email')||''}};
    localStorage.setItem(sessionKey,JSON.stringify(currentSession)); history.replaceState(null,'',location.pathname+location.search); return;
  }
  currentSession=localGet(sessionKey,null);
}

parseSessionFromUrl();
refreshProfileUI();
renderHistory();
updateCounters();
checkHealth();


try { initializeCriteriaEditor(); } catch (error) { console.warn('Criteria editor:', error); }

try { initializeInlineUpload(); } catch (error) { console.warn('Inline upload:', error); }
