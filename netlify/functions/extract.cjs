const { response, parseJson } = require('./_shared.cjs');

function cleanArray(value, max) {
  return (Array.isArray(value) ? value : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  try {
    if (!process.env.OPENAI_API_KEY) return response(500, { error: 'OPENAI_API_KEY לא מוגדר' });
    const input = JSON.parse(event.body || '{}');
    const background = String(input.background || '').trim().slice(0, 5000);
    const category = String(input.category || '').trim().slice(0, 120);
    if (background.length < 20) return response(400, { error: 'נדרש תיאור רקע מפורט יותר' });

    const instruction = `אתה מסייע למשתמש לבנות החלטה מובנית מתוך סיפור חופשי בעברית.
חלץ אך ורק מידע שקיים בטקסט, בלי להמציא עובדות.
החזר JSON תקין בלבד עם המבנה:
{
  "question": "שאלה מרכזית קצרה וברורה, כולל מה חשוב בבחירה",
  "options": ["לפחות שתי חלופות ועד חמש"],
  "considerations": ["עד שישה דברים שחשובים למשתמש בבחירה"],
  "criteria": ["עד שישה מדדי השוואה קצרים ומעשיים המתאימים להחלטה"],
  "summary": "הבנתי שאתה מנסה להחליט בין... לפי השיקולים..."
}
אם חסרות חלופות מפורשות, נסח חלופות סבירות רק כאשר הן משתמעות בבירור; אחרת השתמש ב["אפשרות א׳","אפשרות ב׳"] כדי שהמשתמש ישלים.
קטגוריה: ${category || 'לא נבחרה'}
תיאור המשתמש:
${background}`;

    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: instruction }]
      })
    });

    const json = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(json.error?.message || 'OpenAI extraction error');
    const parsed = parseJson(json.choices?.[0]?.message?.content);
    const options = cleanArray(parsed.options, 5);
    const considerations = cleanArray(parsed.considerations, 6);
    const criteria = cleanArray(parsed.criteria, 6);

    return response(200, {
      question: String(parsed.question || '').trim().slice(0, 1000),
      options: options.length >= 2 ? options : ['אפשרות א׳', 'אפשרות ב׳'],
      considerations,
      criteria: criteria.length ? criteria : considerations,
      summary: String(parsed.summary || '').trim().slice(0, 1200)
    });
  } catch (error) {
    return response(500, { error: error.message || 'שגיאה בחילוץ ההחלטה' });
  }
};
