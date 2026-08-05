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

async function openai(story) {
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1', input: prompt(story), max_output_tokens: 1800 })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'OpenAI request failed');
  return j.output_text || j.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
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
    const { story = '' } = JSON.parse(event.body || '{}');
    if (!story.trim()) return reply(400, { error: 'לא הוזן סיפור לניתוח' });
    let result;
    if (process.env.OPENAI_API_KEY) result = await openai(story.trim());
    else if (process.env.GEMINI_API_KEY) result = await gemini(story.trim());
    else return reply(500, { error: 'לא הוגדר מפתח OpenAI או Gemini בשרת.' });
    if (!result) throw new Error('לא התקבלה תשובה מהמודל');
    return reply(200, { result: clean(result) });
  } catch (e) {
    console.error('analyze error', e);
    return reply(500, { error: e.message || 'הניתוח נכשל' });
  }
};
