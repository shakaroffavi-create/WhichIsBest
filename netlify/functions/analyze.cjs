const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const prompt = (story) => `אתה יועץ החלטות ביקורתי, מאוזן ומעשי. נתח את ההתלבטות הבאה בעברית בהירה.
הצג: תמונת מצב, הנחות שחשוב לבדוק, חלופות אפשריות, יתרונות וחסרונות, סיכונים, שאלות המשך, וצעד מעשי ראשון.
אל תחליט במקום המשתמש ואל תמציא עובדות.

הסיפור:
${story}`;

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
    return reply(200, { result });
  } catch (e) {
    console.error('analyze error', e);
    return reply(500, { error: e.message || 'הניתוח נכשל' });
  }
};
