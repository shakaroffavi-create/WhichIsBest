const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const prompt = (story) => `אתה יועץ החלטות ביקורתי, מאוזן ומעשי. השב באותה השפה שבה המשתמש כתב.

המטרה היא לזקק סיפור מורכב להכרעה ברורה. אין לחזור על כל הסיפור ואין לשקף למשתמש מחדש את כל מה שכתב.

מבנה התשובה המחייב:

תקציר דילמת ההכרעה שלך
נסח לכל היותר 2–3 משפטים קצרים שמציגים רק את ההחלטה, המטרה והמתח המרכזי בין האפשרויות.

שאלות המפתח שעולות מהמידע
הצג 3–4 שאלות בלבד. אלו שאלות ההכרעה המרכזיות שחילצת מהסיפור, ולא שאלון שהמשתמש נדרש להשיב עליו.

הניתוח
נתח ישירות את שאלות המפתח. הפרד בין עובדות שנמסרו, הנחות שדורשות אימות ומידע חסר. הצג חלופות, יתרונות וחסרונות, סיכונים ותרחישים רלוונטיים. אל תמציא עובדות.

הצעדים הבאים
סיים ב-3–5 בדיקות או פעולות מעשיות לפי סדר עדיפות. אל תחליט במקום המשתמש.

כתוב טקסט נקי בלבד. אין להשתמש כלל בסימוני Markdown: בלי סולמיות, בלי כוכביות ובלי קווים תחתונים להדגשה. לכותרות השתמש בשורה רגילה, ולרשימות השתמש במקף בלבד.

הסיפור:
${story}`;

const clean = (text) => String(text || '')
  .replace(/^\s*#{1,6}\s*/gm, '')
  .replace(/\*\*(.*?)\*\*/gs, '$1')
  .replace(/__(.*?)__/gs, '$1')
  .replace(/^\s*\*\s+/gm, '- ')
  .replace(/\*(.*?)\*/gs, '$1')
  .replace(/^\s*#+\s*/gm, '')
  .trim();

const attachmentText = (a) => {
  const match = String(a.data || '').match(/^data:[^;]+;base64,(.+)$/s);
  if (!match) return '';
  try { return Buffer.from(match[1], 'base64').toString('utf8').slice(0, 30000); } catch { return ''; }
};

const suggestionFor = (story) => {
  const s = story.toLowerCase();
  if (/נדל|נכס|דירה|בניין|מגרש|תב.?ע|בנייה|real estate|property/.test(s)) return 'אם תצרף תוכניות, תב״ע, נסח, שומה או מסמכי הנכס הרלוונטיים, אוכל לחדד את הניתוח ולזהות נקודות שדורשות אימות.';
  if (/מניה|אופציה|בורסה|שוק ההון|גרף|stock|share|option|market/.test(s)) return 'אם תצרף גרף עדכני, נתוני החברה או פרטי הפוזיציה והטווח, אוכל לחדד את התרחישים והסיכונים.';
  if (/חוזה|הסכם|סעיף|contract|agreement/.test(s)) return 'אם תצרף את החוזה או את הסעיפים הרלוונטיים, אוכל למקד את השאלות, ההתחייבויות והנקודות שדורשות בדיקה מקצועית.';
  if (/עסק|חברה|שותף|רכישה|מיזוג|business|company/.test(s)) return 'אם תצרף נתונים כספיים, הצעה, הסכם או מסמכי בדיקת נאותות, אוכל לחדד את כדאיות העסקה ואת הסיכונים המרכזיים.';
  return 'אם תצרף מסמך, תמונה, צילום מסך או נתונים שקשורים להחלטה, אוכל לחדד את הניתוח ולהפריד טוב יותר בין עובדות, הנחות ומידע חסר.';
};

async function openai(story, attachments = []) {
  const content = [{ type: 'input_text', text: prompt(story) }];
  for (const a of attachments.slice(0, 4)) {
    if (String(a.type || '').startsWith('image/') && a.data) content.push({ type: 'input_image', image_url: a.data, detail: 'auto' });
    else if (/^(text\/|application\/(json|csv))/.test(a.type || '') || /\.(txt|md|csv)$/i.test(a.name || '')) {
      const text = attachmentText(a); if (text) content.push({ type: 'input_text', text: `\nתוכן הקובץ ${a.name || ''}:\n${text}` });
    } else if (a.data) content.push({ type: 'input_file', filename: a.name || 'document', file_data: a.data });
  }
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1', input: [{ role: 'user', content }], max_output_tokens: 1800 })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'OpenAI request failed');
  return j.output_text || j.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
}

async function anthropic(story, attachments = []) {
  const content = [];
  for (const a of attachments.slice(0, 4)) {
    const match = String(a.data || '').match(/^data:([^;]+);base64,(.+)$/s);
    if (String(a.type || '').startsWith('image/') && match) {
      content.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
    } else if (/^(text\/|application\/(json|csv))/.test(a.type || '') || /\.(txt|md|csv)$/i.test(a.name || '')) {
      const text = attachmentText(a);
      if (text) content.push({ type: 'text', text: `\nתוכן הקובץ ${a.name || ''}:\n${text}` });
    } else if ((a.type === 'application/pdf' || /\.pdf$/i.test(a.name || '')) && match) {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: match[2] } });
    }
  }
  content.push({ type: 'text', text: prompt(story) });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 1800,
      messages: [{ role: 'user', content }]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Claude request failed');
  return j.content?.filter(x => x.type === 'text').map(x => x.text).join('\n');
}

async function gemini(story) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt(story) }] }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Gemini request failed');
  return j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { story = '', attachments = [], provider = 'auto' } = JSON.parse(event.body || '{}');
    if (!story.trim()) return reply(400, { error: 'לא הוזן סיפור לניתוח' });
    let result;
    if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) result = await anthropic(story.trim(), attachments);
    else if (provider === 'gpt' && process.env.OPENAI_API_KEY) result = await openai(story.trim(), attachments);
    else if (provider === 'gemini' && process.env.GEMINI_API_KEY) result = await gemini(story.trim());
    else if (provider !== 'auto') return reply(500, { error: `המנוע ${provider} אינו מוגדר בשרת.` });
    else if (process.env.OPENAI_API_KEY) result = await openai(story.trim(), attachments);
    else if (process.env.ANTHROPIC_API_KEY) result = await anthropic(story.trim(), attachments);
    else if (process.env.GEMINI_API_KEY) result = await gemini(story.trim());
    else return reply(500, { error: 'לא הוגדר מפתח GPT, Claude או Gemini בשרת.' });
    if (!result) throw new Error('לא התקבלה תשובה מהמודל');
    return reply(200, { result: clean(result), suggestion: suggestionFor(story) });
  } catch (e) {
    console.error('analyze error', e);
    return reply(500, { error: e.message || 'הניתוח נכשל' });
  }
};
