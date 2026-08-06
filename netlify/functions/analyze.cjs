const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const decisionInstructions = `אתה מנוע הכרעה בכיר של WhichIsBest, לא צ'אט כללי. תפקידך להפוך מידע חלקי ומבולגן לתמונת החלטה ביקורתית, עמוקה ומעשית.

עקרונות מחייבים:
- השב בשפת המשתמש ובטון בהיר, ישיר ומכבד.
- אל תחזור על הסיפור ואל תמלא מקום בהסברים כלליים. כל פסקה חייבת לקדם את ההכרעה.
- אל תמציא עובדות, מחירים, מסמכים, מקורות או ודאות. הפרד במפורש בין עובדה שנמסרה, מסקנה סבירה, הנחה ומידע חסר.
- אל תסתפק ברשימת יתרונות וחסרונות. בחן קשרים, תלות בין משתנים, עלות טעות, הפיכות ההחלטה, תמריצים, הטיות ותרחישי קצה סבירים.
- כאשר קיימות כמה חלופות, השווה אותן לפי אותם מבחנים. כאשר לא הוגדרו חלופות, חלץ את החלופות הסבירות מהפנייה.
- המלצה חייבת להיות מותנית בנתונים: מה מוביל כרגע, מדוע, מה רמת הביטחון ומה עשוי להפוך את המסקנה.
- בנושאים מקצועיים או עתירי סיכון, ציין מה דורש אימות אצל בעל מקצוע. אל תציג את הניתוח כתחליף לייעוץ מקצועי.

בצע תחילה, באופן פנימי וללא הצגת תהליך החשיבה, את רצף העבודה הבא:
1. חלץ את ההחלטה, המטרה, החלופות והאילוצים.
2. מיין את המידע לעובדות, הנחות, פערים וסתירות.
3. בחר 3–5 קריטריונים שבאמת מבדילים בין החלופות.
4. בחן כל חלופה בתרחיש חיובי, סביר ושלילי.
5. תקוף את החלופה המובילה כפרקליט השטן.
6. נסח מסקנה מותנית ובדיקות שיכולות לשנות אותה.

מבנה התשובה המחייב, לפי הסדר ובכותרות המדויקות:

דילמת ההכרעה
2–3 משפטים בלבד: מה ההחלטה, מה המטרה ומהו המתח המרכזי. אין לשקף את כל הסיפור.

שאלות המפתח
3–4 שאלות הכרעה בלבד. אלה שאלות שהניתוח עונה עליהן, לא שאלון למשתמש.

מה ידוע ומה עדיין לא
- עובדות שנמסרו או נתמכות בחומר המצורף.
- הנחות שדורשות אימות.
- מידע חסר שמשפיע מהותית על ההכרעה.
אם אין הבדל משמעותי בין הקבוצות, כתוב בקצרה ואל תייצר סעיפים מלאכותיים.

ניתוח החלופות
השווה את החלופות לפי אותם קריטריונים. לכל חלופה הסבר מה מרוויחים, מה מסכנים, באילו תנאים היא עדיפה, ומה מחיר הטעות או החזרה ממנה. השתמש בנתונים מהפנייה ולא באמירות גנריות.

תרחישים שמשנים את התמונה
הצג תרחיש חיובי, סביר ושלילי רק כאשר הם רלוונטיים. הסבר איזו חלופה מתחזקת בכל תרחיש ומדוע.

פרקליט השטן
תקוף את החלופה שנראית מובילה: מהי ההנחה החלשה ביותר, מה המשתמש אולי מפספס, מה יטען מתנגד חכם ואיזו הטיה עלולה להשפיע. אם אין עדיין חלופה מובילה, תקוף את עצם המסגור של הדילמה.

סיכונים שחשוב לראות
2–4 סיכונים מהותיים בלבד. לכל סיכון ציין מה עלול להשתבש, מה הסבירות או אי-הוודאות הידועה, וכיצד ניתן לבדוק או לצמצם אותו. אל תשתמש באזהרות כלליות.

נקודת ההכרעה
כתוב מסקנה ברורה ומותנית: אם תנאי א' מתקיים — הכיוון המוביל הוא X; אם תנאי ב' מתקיים — Y. ציין את החלופה המובילה כרגע, רמת הביטחון בה, והנתון היחיד שהכי עשוי לשנות אותה. אם אין בסיס מספיק, אמור זאת במפורש ואל תעמיד פנים שהוכרעה החלטה.

הצעדים הבאים
3–5 פעולות או בדיקות קונקרטיות לפי סדר עדיפות. הצעד הראשון צריך להיות זה שמצמצם הכי הרבה אי-ודאות ביחס לעלות ולזמן שלו.

כללי הצגה:
- כתוב טקסט נקי בלבד, בלי Markdown: אין סולמיות, כוכביות, קווים תחתונים או טבלאות Markdown.
- לכותרות השתמש בשורה רגילה ולרשימות במקף בלבד.
- העדף עומק ממוקד על פני אורך. אין לחזור על אותה טענה בכמה כותרות.`;

const casePrompt = (story) => `נתח את תיק ההכרעה הבא לפי חוקת WhichIsBest.

הפנייה המקורית:
${story}`;

const synthesisPrompt = (story, analyses) => `אתה עורך ראשי של מערכת לקבלת החלטות. קיבלת ניתוחים עצמאיים ממספר מנועי AI לאותה פנייה.

המטרה שלך היא ליצור תשובה אחת מזוקקת, ביקורתית ומעשית. אין להעתיק את הניתוחים בזה אחר זה ואין לציין שמות של מודלים. מצא נקודות הסכמה, שמור תובנות ייחודיות חשובות, הצג מחלוקות או אי-ודאות מהותיות, והסר כפילויות. אל תמציא עובדות ואל תכריע במקום המשתמש.

השתמש במבנה התשובה המלא ובכל מבחני העומק של חוקת WhichIsBest. בפרט, שמור על ההפרדה בין עובדות, הנחות ומידע חסר; השווה חלופות באותם קריטריונים; הפעל פרקליט שטן על החלופה המובילה; והצג מסקנה מותנית עם רמת ביטחון ומה עשוי לשנותה.

הפנייה המקורית:
${story}

הניתוחים העצמאיים:
${analyses.map((x, i) => `\nניתוח ${i + 1}:\n${x.text}`).join('\n')}`;

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
  const content = [{ type: 'input_text', text: casePrompt(story) }];
  for (const a of attachments.slice(0, 4)) {
    if (String(a.type || '').startsWith('image/') && a.data) content.push({ type: 'input_image', image_url: a.data, detail: 'auto' });
    else if (/^(text\/|application\/(json|csv))/.test(a.type || '') || /\.(txt|md|csv)$/i.test(a.name || '')) {
      const text = attachmentText(a); if (text) content.push({ type: 'input_text', text: `\nתוכן הקובץ ${a.name || ''}:\n${text}` });
    } else if (a.data) content.push({ type: 'input_file', filename: a.name || 'document', file_data: a.data });
  }
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1', instructions: decisionInstructions, input: [{ role: 'user', content }], max_output_tokens: 1800 })
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
  content.push({ type: 'text', text: casePrompt(story) });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      system: decisionInstructions,
      max_tokens: 1800,
      messages: [{ role: 'user', content }]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Claude request failed');
  return j.content?.filter(x => x.type === 'text').map(x => x.text).join('\n');
}

async function gemini(story, attachments = []) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const parts = [{ text: casePrompt(story) }];
  for (const a of attachments.slice(0, 4)) {
    const match = String(a.data || '').match(/^data:([^;]+);base64,(.+)$/s);
    if ((String(a.type || '').startsWith('image/') || a.type === 'application/pdf') && match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    } else if (/^(text\/|application\/(json|csv))/.test(a.type || '') || /\.(txt|md|csv)$/i.test(a.name || '')) {
      const text = attachmentText(a);
      if (text) parts.push({ text: `\nתוכן הקובץ ${a.name || ''}:\n${text}` });
    }
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: decisionInstructions }] }, contents: [{ parts }], generationConfig: { maxOutputTokens: 1800 } })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Gemini request failed');
  return j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
}

async function synthesize(story, analyses) {
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1',
      instructions: decisionInstructions,
      input: synthesisPrompt(story, analyses),
      max_output_tokens: 1800
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Synthesis request failed');
  return j.output_text || j.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { story = '', attachments = [], provider = 'auto', analyses = [] } = JSON.parse(event.body || '{}');
    if (!story.trim()) return reply(400, { error: 'לא הוזן סיפור לניתוח' });
    let result;
    let providers = [];
    if (provider === 'synthesize') {
      const valid = analyses.filter(x => x && x.name && x.text).slice(0, 3);
      if (valid.length < 2) return reply(400, { error: 'נדרשים לפחות שני ניתוחים לצורך שקלול.' });
      if (!process.env.OPENAI_API_KEY) return reply(500, { error: 'מנוע השקלול אינו מוגדר בשרת.' });
      result = await synthesize(story.trim(), valid);
      providers = valid.map(x => x.name);
    }
    else if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) result = await anthropic(story.trim(), attachments);
    else if (provider === 'gpt' && process.env.OPENAI_API_KEY) result = await openai(story.trim(), attachments);
    else if (provider === 'gemini' && process.env.GEMINI_API_KEY) result = await gemini(story.trim());
    else if (provider !== 'auto') return reply(500, { error: `המנוע ${provider} אינו מוגדר בשרת.` });
    else if (process.env.OPENAI_API_KEY) result = await openai(story.trim(), attachments);
    else if (process.env.ANTHROPIC_API_KEY) result = await anthropic(story.trim(), attachments);
    else if (process.env.GEMINI_API_KEY) result = await gemini(story.trim());
    else return reply(500, { error: 'לא הוגדר מפתח GPT, Claude או Gemini בשרת.' });
    if (!result) throw new Error('לא התקבלה תשובה מהמודל');
    return reply(200, { result: clean(result), suggestion: suggestionFor(story), providers });
  } catch (e) {
    console.error('analyze error', e);
    return reply(500, { error: e.message || 'הניתוח נכשל' });
  }
};
