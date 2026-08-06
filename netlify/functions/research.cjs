'use strict';

const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const cleanJson = (value) => String(value || '')
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '');

function outputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text')
    .map(item => item.text || '')
    .join('\n');
}

function citedSources(response) {
  const sources = [];
  const seen = new Set();
  for (const part of (response.output || []).flatMap(item => item.content || [])) {
    for (const annotation of part.annotations || []) {
      const url = annotation.url || annotation.url_citation?.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({
        title: annotation.title || annotation.url_citation?.title || new URL(url).hostname,
        url
      });
    }
  }
  return sources.slice(0, 8);
}

const instructions = `אתה חוקר מקורות רשמיים עבור מנוע קבלת ההחלטות WhichIsBest.
בצע מחקר רק כדי לבדוק אם מידע ציבורי עדכני משנה את תמונת ההחלטה הקיימת.
העדף מקורות ראשוניים ורשמיים: אתרי רגולטורים, בורסות, רשויות, מאגרי דיווח ואתרי קשרי משקיעים. מקור חדשותי משני מותר רק אם אין מקור ראשוני זמין.
אל תחזור על סיפור המשתמש. אל תיתן הוראות קנייה או מכירה ואל תציג ודאות שאינה קיימת.
אם שם הישות אינו חד-משמעי, אל תנחש: החזר needsConfirmation=true ושאלת הבהרה אחת.
החזר JSON תקין בלבד, בעברית, ללא Markdown:
{
  "needsConfirmation": false,
  "confirmationQuestion": "",
  "entity": "שם הישות שנבדקה",
  "checkedAt": "תאריך ושעה",
  "summary": "עד שני משפטים: האם נמצא דבר מהותי שמשנה את ההחלטה",
  "findings": [{"title":"ממצא קצר","whatChanged":"מה השתנה","decisionImpact":"כיצד זה משפיע על ההחלטה","materiality":"גבוהה|בינונית|נמוכה","sourceUrl":"קישור ישיר"}],
  "updatedBottomLine": "משפט אחד בלבד; אם המסקנה לא השתנתה כתוב זאת במפורש",
  "followUp": "שאלה אחת שמקדמת את הדיאלוג"
}
הצג עד 4 ממצאים בלבד. אם לא נמצא דיווח מהותי, החזר findings ריק וכתוב זאת בבירור.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return reply(500, { error: 'שירות מחקר העומק עדיין אינו מוגדר.' });

  try {
    const input = JSON.parse(event.body || '{}');
    const story = String(input.story || '').trim();
    if (!story) return reply(400, { error: 'לא נמצאה פנייה לבדיקה.' });

    const decision = input.decision && typeof input.decision === 'object' ? input.decision : null;
    const prompt = `בדוק את ההחלטה הבאה מול מידע ציבורי עדכני ורשמי.\n\nהפנייה:\n${story.slice(0, 12000)}\n\nתמונת ההחלטה הקיימת:\n${JSON.stringify(decision || {}).slice(0, 14000)}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RESEARCH_MODEL || 'gpt-5.5',
        instructions,
        input: prompt,
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        max_output_tokens: 1600
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'מחקר העומק לא הושלם');
    const text = outputText(data);
    let research;
    try { research = JSON.parse(cleanJson(text)); }
    catch { throw new Error('המחקר התקבל במבנה לא תקין. נסה שוב בעוד רגע.'); }

    const sources = citedSources(data);
    const findings = Array.isArray(research.findings) ? research.findings.slice(0, 4) : [];
    for (const finding of findings) {
      if (!finding.sourceUrl && sources[0]?.url) finding.sourceUrl = sources[0].url;
    }
    return reply(200, { research: { ...research, findings, sources } });
  } catch (error) {
    console.error('research error', error);
    return reply(500, { error: error.message || 'מחקר העומק נכשל' });
  }
};
