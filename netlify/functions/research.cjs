'use strict';

const headers = { 'content-type': 'application/json; charset=utf-8' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

const cleanJson = (value) => String(value || '')
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '');

const isPlanningQuery = (text) => /(?:נדל[״"']?ן|נכס|דירה|מגרש|קרקע|תב[״"']?ע|תכנית|תוכנית|תכנוני|גוש|חלקה|היתר\s*בנייה|זכויות\s*בנייה)/i.test(String(text || ''));

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
  return sources.slice(0, 10);
}

function mergeSources(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    for (const source of list || []) {
      if (!source?.url || seen.has(source.url)) continue;
      seen.add(source.url);
      out.push(source);
    }
  }
  return out.slice(0, 10);
}

async function callResponses(body) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'מחקר העומק לא הושלם');
  return data;
}

const discoveryInstructions = `אתה שלב איתור המקורות של WhichIsBest. אל תנתח את ההחלטה עדיין.
חובה להשתמש בחיפוש אינטרנטי לפני תשובה.
המטרה היא לאתר את המקור הראשוני והעדכני ביותר שהמשתמש מתייחס אליו.
כאשר המשתמש מזכיר "היום", "פורסם", "דוח", "תוצאות", "filing", "הודעה", "earnings", רבעון או אירוע חדש — חפש את הפרסום עצמו ולא רק כתבות עליו.
העדף לפי הסדר: אתר רשמי/Investor Relations, SEC או רגולטור, בורסה, מאגר דיווח רשמי, PDF רשמי, הודעה רשמית. חדשות הן fallback בלבד.
בצע כמה שאילתות ממוקדות אם צריך: שם הישות + סוג הפרסום + תאריך/רבעון/שנה + PDF/filing/press release/earnings.
ודא התאמה של שם הישות, תאריך וסוג המסמך. אל תשתמש במידע ישן כאילו הוא הפרסום החדש.
אם המקור הראשוני לא נמצא, אמור זאת במפורש.
החזר JSON תקין בלבד:
{
  "entity":"",
  "publication":"",
  "publicationDate":"",
  "primarySourceFound":false,
  "primarySourceUrl":"",
  "primarySourceTitle":"",
  "evidence":["עד 6 עובדות מהמקור או ממקורות מאמתים"],
  "missing":"מה לא אומת"
}`;

const generalInstructions = `אתה חוקר מקורות רשמיים עבור מנוע קבלת ההחלטות WhichIsBest.
קיבלת תוצאת שלב איתור מקורות שכבר בוצע לפני הניתוח. התייחס אליה כבסיס, אך אמת שוב בחיפוש אם יש ספק או אם חסר פרט מהותי.
אל תציג מידע שלא אומת. אם שלב האיתור לא מצא את הפרסום הראשוני, ציין זאת במפורש ואל תשלים פרטים מהשערה.
העדף מקורות ראשוניים ורשמיים: אתרי רגולטורים, בורסות, רשויות, מאגרי דיווח ואתרי קשרי משקיעים. מקור חדשותי משני מותר רק כהשלמה או fallback.
אל תחזור על סיפור המשתמש. אל תיתן הוראות קנייה או מכירה ואל תציג ודאות שאינה קיימת.
אם שם הישות אינו חד-משמעי, אל תנחש: החזר needsConfirmation=true ושאלת הבהרה אחת.
החזר JSON תקין בלבד, בעברית, ללא Markdown:
{
  "needsConfirmation": false,
  "confirmationQuestion": "",
  "entity": "שם הישות שנבדקה",
  "checkedAt": "תאריך ושעה",
  "summary": "עד שני משפטים: מה נמצא והאם הוא משנה את ההחלטה",
  "findings": [{"title":"ממצא קצר","whatChanged":"מה פורסם או השתנה","decisionImpact":"כיצד זה משפיע על ההחלטה","materiality":"גבוהה|בינונית|נמוכה","sourceUrl":"קישור ישיר למקור"}],
  "updatedBottomLine": "משפט אחד בלבד; אם המסקנה לא השתנתה כתוב זאת במפורש",
  "followUp": "שאלה אחת שמקדמת את הדיאלוג"
}
הצג עד 4 ממצאים בלבד.`;

const planningInstructions = `אתה חוקר מידע תכנוני בישראל עבור מנוע קבלת ההחלטות WhichIsBest.
מטרתך אינה לתאר מחדש את העסקה אלא לבדוק אם מידע תכנוני ציבורי עשוי לשנות את ההחלטה.
חלץ מהפנייה עיר או יישוב, מספר גוש ומספר חלקה. אם אחד משלושת הפרטים חסר או אינו חד-משמעי, אל תנחש: החזר needsConfirmation=true ושאל רק על הפרט החסר.
חפש תחילה במקורות רשמיים וציבוריים: מידע תכנוני של מינהל התכנון (mavat.iplan.gov.il), XPLAN/קווים כחולים (ags.iplan.gov.il), מאגר התב״עות של רמ״י (apps.land.gov.il), gov.il, ואתר ההנדסה או GIS של הרשות המקומית המתאימה.
בדוק ככל שניתן: תוכניות מאושרות, מופקדות ובהכנה; ייעוד קרקע; הוראות וזכויות בנייה; הפקעה או דרך מתוכננת; שימור; התחדשות עירונית; הנחיות מרחביות; בקשות והיתרים היסטוריים.
בנוסף, חפש אינדיקציה ראשונית לעסקאות בסביבה רק ממידע ציבורי וחופשי שניתן לאתר באופן גלוי, כגון nadlan.gov.il, GovMap ודפים ציבוריים נגישים. הצג תאריך, מחיר, שטח או מחיר למ״ר רק כאשר הם מופיעים במקור. אל תנחש ואל תציג מידע כזה כהיסטוריית העסקאות המלאה של החלקה.
אין לטעון שהעסקאות נשלפו ישירות מרשות המסים. סמן כל מידע השוואתי כמידע חלקי ולא מאומת, שעשוי לא לכלול תיקונים, עסקאות חסרות, תת־חלקות או את חלק הזכות שנמכר.
אל תטען שמידע לא קיים רק משום שמערכת עירונית חסמה חיפוש או דורשת פעולה ידנית. במקרה כזה ציין במדויק מה לא אומת ובקש קישור, דף מידע, תשריט או צילום מסך.
הבחן בין עובדה סטטוטורית, תוכנית מוצעת ומסקנה שלך. אין להציג את הבדיקה כתחליף למידע תכנוני רשמי, שמאי, אדריכל או עורך דין.
אל תחזור על סיפור המשתמש. החזר רק מידע שמשפיע על ההחלטה, בעברית וללא Markdown.
החזר JSON תקין בלבד:
{
  "researchType": "planning",
  "needsConfirmation": false,
  "confirmationQuestion": "",
  "entity": "עיר, גוש וחלקה",
  "parcel": {"city":"עיר","block":"גוש","parcel":"חלקה"},
  "checkedAt": "תאריך ושעה",
  "summary": "עד שני משפטים: מה נמצא ומה לא ניתן היה לאמת",
  "findings": [{"title":"ממצא קצר","whatChanged":"העובדה התכנונית והסטטוס שלה","decisionImpact":"כיצד היא משפיעה על ההחלטה","materiality":"גבוהה|בינונית|נמוכה","sourceUrl":"קישור ישיר למקור הרשמי"}],
  "nearbyTransactions": [{"date":"תאריך אם נמצא","price":"מחיר אם נמצא","area":"שטח אם נמצא","pricePerSqm":"מחיר למ״ר אם נמצא","location":"כתובת או חלקה","sourceUrl":"קישור למקור הציבורי"}],
  "transactionDataNotice": "מידע עסקאות חלקי ממקורות ציבוריים זמינים; לא נשלף ישירות מרשות המסים ואינו היסטוריה מלאה או מאומתת.",
  "updatedBottomLine": "משפט החלטה אחד בלבד",
  "unverified": ["פרט שלא ניתן היה לאמת"],
  "statutoryCaveat": "המידע המקוון הוא כלי סינון ראשוני ואינו מידע סטטוטורי מחייב.",
  "followUp": "בקשה אחת למסמך או בדיקה שמקדמים את ההחלטה"
}
הצג עד 4 ממצאים בלבד. אל תמלא חללים בהשערות.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return reply(500, { error: 'שירות מחקר העומק עדיין אינו מוגדר.' });

  try {
    const input = JSON.parse(event.body || '{}');
    const story = String(input.story || '').trim();
    if (!story) return reply(400, { error: 'לא נמצאה פנייה לבדיקה.' });

    const decision = input.decision && typeof input.decision === 'object' ? input.decision : null;
    const planning = isPlanningQuery(story);
    const model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-5.6';
    const now = new Date().toISOString();

    if (planning) {
      const prompt = `בצע בדיקת עומק תכנונית לנכס.\nזמן בדיקה בפועל: ${now}\n\nהפנייה:\n${story.slice(0, 12000)}\n\nתמונת ההחלטה הקיימת:\n${JSON.stringify(decision || {}).slice(0, 14000)}`;
      const data = await callResponses({
        model,
        instructions: planningInstructions,
        input: prompt,
        tools: [{ type: 'web_search', search_context_size: 'high' }],
        tool_choice: 'required',
        reasoning: { effort: 'medium' },
        max_output_tokens: 2200
      });
      let research;
      try { research = JSON.parse(cleanJson(outputText(data))); }
      catch { throw new Error('המחקר התקבל במבנה לא תקין. נסה שוב בעוד רגע.'); }
      const sources = citedSources(data);
      const findings = Array.isArray(research.findings) ? research.findings.slice(0, 4) : [];
      for (const finding of findings) if (!finding.sourceUrl && sources[0]?.url) finding.sourceUrl = sources[0].url;
      return reply(200, { research: { ...research, findings, sources } });
    }

    const discovery = await callResponses({
      model,
      instructions: discoveryInstructions,
      input: `זמן בדיקה בפועל: ${now}\n\nפניית המשתמש:\n${story.slice(0, 12000)}`,
      tools: [{ type: 'web_search', search_context_size: 'high' }],
      tool_choice: 'required',
      reasoning: { effort: 'medium' },
      max_output_tokens: 1800
    });

    const discoveryText = outputText(discovery);
    const discoverySources = citedSources(discovery);

    const prompt = `נתח את ההחלטה רק לאחר שלב איתור המקורות.\nזמן בדיקה בפועל: ${now}\n\nהפנייה:\n${story.slice(0, 12000)}\n\nתמונת ההחלטה הקיימת:\n${JSON.stringify(decision || {}).slice(0, 14000)}\n\nתוצאת שלב איתור המקורות:\n${discoveryText.slice(0, 10000)}\n\nמקורות שאותרו בשלב הראשון:\n${JSON.stringify(discoverySources).slice(0, 6000)}`;

    const data = await callResponses({
      model,
      instructions: generalInstructions,
      input: prompt,
      tools: [{ type: 'web_search', search_context_size: 'high' }],
      tool_choice: 'auto',
      reasoning: { effort: 'medium' },
      max_output_tokens: 2200
    });

    let research;
    try { research = JSON.parse(cleanJson(outputText(data))); }
    catch { throw new Error('המחקר התקבל במבנה לא תקין. נסה שוב בעוד רגע.'); }

    const sources = mergeSources(discoverySources, citedSources(data));
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
