const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const decisionInstructions = `אתה מנוע הכרעה בכיר של WhichIsBest, לא צ'אט כללי. תפקידך להפוך מידע חלקי ומבולגן לתמונת החלטה ביקורתית, עמוקה ומעשית.

עקרונות מחייבים:
- השב בשפת המשתמש ובטון בהיר, ישיר ומכבד.
- אל תחזור על הסיפור ואל תמלא מקום בהסברים כלליים. כל פסקה חייבת לקדם את ההכרעה.
- אל תמציא עובדות, מחירים, מסמכים, מקורות או ודאות. הפרד במפורש בין עובדה שנמסרה, מסקנה סבירה, הנחה ומידע חסר.
- אם מצורף לפנייה Research Context ממקורות עדכניים, השתמש בו כבסיס עובדתי מרכזי. אל תטען שהנתונים חסרים אם הם מופיעים בו.
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

החזר JSON תקין בלבד, ללא Markdown וללא טקסט לפניו או אחריו. היה חד ותמציתי: עד 900 מילים בכל ה-JSON, בלי חזרה על אותה עובדה בשדות שונים. אל תחזור על שאלת המשתמש ואל תנסח שאלות חוזרות. השתמש בדיוק במבנה הבא:
{
  "language": "he",
  "decisionSummary": "משפט אחד בלבד שמגדיר את ההכרעה, בלי לשקף את הסיפור",
  "bottomLine": { "leadingOption": "שם החלופה או לא הוכרעה", "score": null, "confidence": "נמוכה|בינונית|גבוהה", "reason": "הסיבה המרכזית במשפט אחד" },
  "missingInformation": ["עד 2 פערים שמשנים את ההכרעה"],
  "criteria": [{ "name": "עד 4 קריטריונים", "weight": 0 }],
  "options": [{ "name": "חלופה", "score": null, "assessment": "עד שני משפטים קצרים", "pros": ["עד 2 יתרונות קצרים"], "cons": ["עד 2 חסרונות קצרים"] }],
  "devilsAdvocate": { "challenge": "הטיעון החזק ביותר נגד המובילה במשפט אחד", "weakAssumption": "ההנחה החלשה במשפט אחד" },
  "risks": [{ "risk": "עד 3 סיכונים", "severity": "נמוכה|בינונית|גבוהה", "likelihood": "נמוכה|בינונית|גבוהה|לא ידועה", "mitigation": "בדיקה או צמצום במשפט קצר" }],
  "decisionTriggers": ["עד 2 תנאים קצרים שישנו את ההחלטה"],
  "nextActions": ["עד 3 פעולות ממוקדות לפי סדר עדיפות"]
}

כללי ניקוד מחייבים:
- הצג score בין 0 ל-100 רק אם יש בסיס ממשי בפנייה. אחרת החזר null.
- משקלי הקריטריונים צריכים להסתכם ב-100 רק כאשר יש די מידע; אחרת אפשר להחזיר מערך קריטריונים ללא משקל מהותי באמצעות 0.
- אין להמציא דיוק מספרי. confidence מתארת את איכות בסיס המידע, לא את מידת השכנוע שלך.
- כתוב את כל הערכים בעברית כאשר הפנייה בעברית. מונח מקצועי באנגלית מותר רק אם אין לו חלופה עברית ברורה.
- שמור כל פריט קצר וממוקד. עומק נוצר מהבחנה חדה ומהטיעון הנגדי, לא מאורך.`;

const casePrompt = (story) => `נתח את תיק ההכרעה הבא לפי חוקת WhichIsBest.\n\nהפנייה המקורית:\n${story}`;

const synthesisPrompt = (story, analyses) => `אתה עורך ראשי של מערכת לקבלת החלטות. קיבלת ניתוחים עצמאיים ממספר מנועי AI לאותה פנייה.\n\nהמטרה שלך היא ליצור תשובה אחת מזוקקת, ביקורתית ומעשית. אין להעתיק את הניתוחים בזה אחר זה ואין לציין שמות של מודלים. מצא נקודות הסכמה, שמור תובנות ייחודיות חשובות, הצג מחלוקות או אי-ודאות מהותיות, והסר כפילויות. אל תמציא עובדות ואל תכריע במקום המשתמש.\n\nהשתמש במבנה התשובה המלא ובכל מבחני העומק של חוקת WhichIsBest. בפרט, שמור על ההפרדה בין עובדות, הנחות ומידע חסר; השווה חלופות באותם קריטריונים; הפעל פרקליט שטן על החלופה המובילה; והצג מסקנה מותנית עם רמת ביטחון ומה עשוי לשנותה.\n\nהפנייה המקורית:\n${story}\n\nהניתוחים העצמאיים:\n${analyses.map((x, i) => `\nניתוח ${i + 1}:\n${x.text}`).join('\n')}`;

const clean = (text) => String(text || '')
  .replace(/^\s*#{1,6}\s*/gm, '')
  .replace(/\*\*(.*?)\*\*/gs, '$1')
  .replace(/__(.*?)__/gs, '$1')
  .replace(/^\s*\*\s+/gm, '- ')
  .replace(/\*(.*?)\*/gs, '$1')
  .replace(/^\s*#+\s*/gm, '')
  .trim();

const parseDecision = (text) => {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !value.bottomLine || !Array.isArray(value.options)) return null;
    return value;
  } catch { return null; }
};

const decisionToText = (d) => {
  if (!d) return '';
  const lines = ['דילמת ההכרעה', d.decisionSummary || '', '', 'נקודת ההכרעה'];
  const bottom = d.bottomLine || {};
  lines.push(`החלופה המובילה: ${bottom.leadingOption || 'לא הוכרעה'}`);
  if (Number.isFinite(bottom.score)) lines.push(`ציון: ${bottom.score}/100`);
  if (bottom.confidence) lines.push(`רמת ביטחון: ${bottom.confidence}`);
  if (bottom.reason) lines.push(bottom.reason);
  if (Array.isArray(d.options) && d.options.length) {
    lines.push('', 'ניתוח החלופות');
    for (const option of d.options) lines.push(`${option.name || 'חלופה'}${Number.isFinite(option.score) ? ` — ${option.score}/100` : ''}`, option.assessment || '');
  }
  if (d.devilsAdvocate?.challenge) lines.push('', 'פרקליט השטן', d.devilsAdvocate.challenge);
  if (Array.isArray(d.risks) && d.risks.length) lines.push('', 'סיכונים שחשוב לראות', ...d.risks.map(x => `- ${x.risk}${x.mitigation ? ` — ${x.mitigation}` : ''}`));
  if (Array.isArray(d.nextActions) && d.nextActions.length) lines.push('', 'הצעדים הבאים', ...d.nextActions.map(x => `- ${x}`));
  return lines.filter((x, i) => x || lines[i - 1]).join('\n').trim();
};

const attachmentText = (a) => {
  const match = String(a.data || '').match(/^data:[^;]+;base64,(.+)$/s);
  if (!match) return '';
  try { return Buffer.from(match[1], 'base64').toString('utf8').slice(0, 30000); } catch { return ''; }
};

const needsFreshResearch = (story) => /(?:היום|אתמול|פורסם|פורסמו|דוח\s*(?:רבעוני|שנתי)?|דו[״"']?ח|תוצאות\s*(?:רבעון|רבעוניות|כספיות)|רבעון|10[- ]?[QK]|8[- ]?K|filing|earnings|quarterly|annual report|cash flow|תזרים|מזומנים|התחייבויות|מאזן|SEC|EDGAR|Investor Relations)/i.test(String(story || ''));

function responseOutputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text || '').join('\n');
}

function responseSources(response) {
  const sources = [];
  const seen = new Set();
  for (const part of (response.output || []).flatMap(item => item.content || [])) {
    for (const annotation of part.annotations || []) {
      const url = annotation.url || annotation.url_citation?.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title: annotation.title || annotation.url_citation?.title || url, url });
    }
  }
  return sources.slice(0, 8);
}

async function preResearch(story) {
  if (!process.env.OPENAI_API_KEY || !needsFreshResearch(story)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1',
        instructions: `אתה שלב המחקר המקדים של WhichIsBest. חובה לבצע חיפוש אינטרנטי. אתר קודם את המקור הראשוני והעדכני שאליו הפנייה מתייחסת. בדוחות של חברות ציבוריות חפש תחילה SEC/EDGAR, Investor Relations, 10-Q/10-K/8-K, earnings release או PDF רשמי. אל תסתפק בכתבות. חלץ רק את הנתונים שהמשתמש ביקש, עם תקופה ויחידות. אם Free Cash Flow אינו שורה מדווחת, חשב אותו רק מבסיס ברור וציין שזה חישוב. אם לא מצאת מקור ראשוני, אל תנחש. החזר טקסט עובדתי קצר בעברית.`,
        input: `זמן הבדיקה: ${new Date().toISOString()}\n\nהשאלה:\n${story.slice(0, 9000)}`,
        tools: [{ type: 'web_search' }],
        tool_choice: 'required',
        max_output_tokens: 1000
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'מחקר מקדים נכשל');
    const text = responseOutputText(j);
    if (!text) return null;
    return { text, sources: responseSources(j) };
  } finally {
    clearTimeout(timeout);
  }
}

const suggestionFor = (story) => {
  const s = story.toLowerCase();
  if (/נדל|נכס|דירה|בניין|מגרש|תב.?ע|בנייה|real estate|property/.test(s)) return 'אם תצרף תוכניות, תב״ע, נסח, שומה או מסמכי הנכס הרלוונטיים, אוכל לחדד את הניתוח ולזהות נקודות שדורשות אימות.';
  if (/מניה|אופציה|בורסה|שוק ההון|גרף|stock|share|option|market/.test(s)) return 'אם תצרף גרף עדכני, נתוני החברה או פרטי הפוזיציה והטווח, אוכל לחדד את התרחישים והסיכונים.';
  if (/חוזה|הסכם|סעיף|contract|agreement/.test(s)) return 'אם תצרף את החוזה או את הסעיפים הרלוונטיים, אוכל למקד את השאלות, ההתחייבויות והנקודות שדורשות בדיקה מקצועית.';
  if (/עסק|חברה|שותף|רכישה|מיזוג|business|company/.test(s)) return 'אם תצרף נתונים כספיים, הצעה, הסכם או מסמכי בדיקת נאותות, אוכל לחדד את כדאיות העסקה ואת הסיכונים המרכזיים.';
  return 'אם תצרף מסמך, תמונה, צילום מסך או נתונים שקשורים להחלטה, אוכל לחדד את הניתוח ולהפריד טוב יותר בין עובדות, הנחות ומידע חסר.';
};

async function openai(story, attachments = [], hasReferenceLinks = false) {
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
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1', instructions: decisionInstructions, input: [{ role: 'user', content }], ...(hasReferenceLinks ? { tools: [{ type: 'web_search' }], tool_choice: 'auto' } : {}), max_output_tokens: 1800 })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'OpenAI request failed');
  return responseOutputText(j);
}

async function anthropic(story, attachments = []) {
  const content = [];
  for (const a of attachments.slice(0, 4)) {
    const match = String(a.data || '').match(/^data:([^;]+);base64,(.+)$/s);
    if (String(a.type || '').startsWith('image/') && match) content.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
    else if (/^(text\/|application\/(json|csv))/.test(a.type || '') || /\.(txt|md|csv)$/i.test(a.name || '')) {
      const text = attachmentText(a); if (text) content.push({ type: 'text', text: `\nתוכן הקובץ ${a.name || ''}:\n${text}` });
    } else if ((a.type === 'application/pdf' || /\.pdf$/i.test(a.name || '')) && match) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: match[2] } });
  }
  content.push({ type: 'text', text: casePrompt(story) });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5', system: decisionInstructions, max_tokens: 1800, messages: [{ role: 'user', content }] })
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
    if ((String(a.type || '').startsWith('image/') || a.type === 'application/pdf') && match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    else if (/^(text\/|application\/(json|csv))/.test(a.type || '') || /\.(txt|md|csv)$/i.test(a.name || '')) {
      const text = attachmentText(a); if (text) parts.push({ text: `\nתוכן הקובץ ${a.name || ''}:\n${text}` });
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
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1', instructions: decisionInstructions, input: synthesisPrompt(story, analyses), max_output_tokens: 1800 })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Synthesis request failed');
  return responseOutputText(j);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const { story = '', attachments = [], referenceLinks = [], provider = 'auto', analyses = [] } = JSON.parse(event.body || '{}');
    if (!story.trim()) return reply(400, { error: 'לא הוזן סיפור לניתוח' });

    const links = (Array.isArray(referenceLinks) ? referenceLinks : []).slice(0, 4).map(value => {
      try { const url = new URL(String(value)); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; }
    }).filter(Boolean);

    const storyWithLinks = links.length ? `${story.trim()}\n\nקישורים שהמשתמש צירף לבדיקה:\n${links.join('\n')}\nבדוק את תוכן הקישורים ככל שהוא נגיש. אם קישור חסום או לא אומת, ציין זאת ואל תנחש את תוכנו.` : story.trim();

    let result;
    let providers = [];
    let research = null;
    let researchFailed = false;

    if (provider === 'synthesize') {
      const valid = analyses.filter(x => x && x.name && x.text).slice(0, 3);
      if (valid.length < 2) return reply(400, { error: 'נדרשים לפחות שני ניתוחים לצורך שקלול.' });
      if (!process.env.OPENAI_API_KEY) return reply(500, { error: 'מנוע השקלול אינו מוגדר בשרת.' });
      result = await synthesize(story.trim(), valid);
      providers = valid.map(x => x.name);
    } else {
      try {
        research = await preResearch(storyWithLinks);
      } catch (researchError) {
        researchFailed = true;
        console.error('preResearch fallback', researchError?.message || researchError);
        research = null;
      }

      const researchContext = research?.text ? `\n\n=== Research Context — מידע שאותר אוטומטית לפני הניתוח ===\n${research.text}\n\nמקורות שאותרו:\n${(research.sources || []).map(s => `- ${s.title}: ${s.url}`).join('\n')}\n=== סוף Research Context ===\nהשתמש בנתונים האלה בתשובה הראשונה. אם הם נותנים את המספרים שהמשתמש ביקש, אל תכתוב שהמידע חסר.` : '';
      const enrichedStory = `${storyWithLinks}${researchContext}`;
      const allowMainWebFallback = links.length > 0 || (needsFreshResearch(storyWithLinks) && !research);

      if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) result = await anthropic(enrichedStory, attachments);
      else if (provider === 'gpt' && process.env.OPENAI_API_KEY) result = await openai(enrichedStory, attachments, allowMainWebFallback);
      else if (provider === 'gemini' && process.env.GEMINI_API_KEY) result = await gemini(enrichedStory, attachments);
      else if (provider !== 'auto') return reply(500, { error: `המנוע ${provider} אינו מוגדר בשרת.` });
      else if (process.env.OPENAI_API_KEY) result = await openai(enrichedStory, attachments, allowMainWebFallback);
      else if (process.env.ANTHROPIC_API_KEY) result = await anthropic(enrichedStory, attachments);
      else if (process.env.GEMINI_API_KEY) result = await gemini(enrichedStory, attachments);
      else return reply(500, { error: 'לא הוגדר מפתח GPT, Claude או Gemini בשרת.' });
    }

    if (!result) throw new Error('לא התקבלה תשובה מהמודל');
    const decision = parseDecision(result);
    if (!decision && /^\s*[{[]/.test(String(result))) throw new Error('מבנה הניתוח לא הושלם. נסה שוב בעוד רגע.');
    return reply(200, {
      decision,
      result: decision ? decisionToText(decision) : clean(result),
      suggestion: suggestionFor(story),
      providers,
      researchUsed: Boolean(research),
      researchFailed,
      researchSources: research?.sources || []
    });
  } catch (e) {
    console.error('analyze error', e);
    return reply(500, { error: e.message || 'הניתוח נכשל' });
  }
};
