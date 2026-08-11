const HVAC_TERMS = /מיזוג|מזגן|מזגנים|hvac|קירור|צ[׳']?ילר|מפוח|תעלות/i;

const CHECKS = [
  { key: 'exclusions', label: 'החרגות ותכולת עבודה', terms: /החרג|לא כלול|חשמל|מנוף|קידוח|ניקוז|תשתית/i },
  { key: 'indexation', label: 'הצמדה ועדכון מחיר', terms: /הצמד|מדד|תשומות|עדכון מחיר/i },
  { key: 'warranty', label: 'אחריות ושירות', terms: /אחריות|שירות|sla|תחזוקה/i },
  { key: 'payment', label: 'תנאי תשלום ומקדמה', terms: /תשלום|מקדמה|שוטף|אבן דרך/i },
  { key: 'delay', label: 'לוחות זמנים וקנסות', terms: /איחור|קנס|פיצוי|לוח זמנים|מסירה/i },
  { key: 'commissioning', label: 'הרצה, מסירה ובדיקות קבלה', terms: /הרצה|מסירה|בדיקת קבלה|commission/i }
];

function payloadText(payload = {}) {
  const options = Array.isArray(payload.options) ? payload.options : [];
  return [payload.caseName, payload.goal, ...(payload.documentNames || []), ...options.flatMap(o => [o.name, o.note])]
    .filter(Boolean).join(' ');
}

function detectProcurementProfile(payload = {}) {
  const text = payloadText(payload);
  const isProcurement = payload.caseType === 'supplier' || /ספק|קבלן|הצעת מחיר|רכש|מכרז/i.test(text);
  const isHvac = isProcurement && HVAC_TERMS.test(text);
  return {
    id: isHvac ? 'il-hvac-v1' : isProcurement ? 'procurement-general-v1' : 'general-v1',
    name: isHvac ? 'רכש מיזוג/HVAC בישראל' : isProcurement ? 'השוואת הצעות ורכש' : 'השוואה כללית',
    isProcurement,
    isHvac,
    checks: isHvac ? CHECKS.map(check => ({ ...check, found: check.terms.test(text) })) : []
  };
}

function buildProfessionalRisks(payload, profile = detectProcurementProfile(payload)) {
  if (!profile.isHvac) return [];
  return profile.checks.filter(check => !check.found).map(check =>
    `HVAC — ${check.label}: לא אותר פירוט ברור בנתונים שהוזנו; יש לאמת מול מסמכי המקור לפני החלטה.`
  );
}

function buildProfessionalActions(payload, profile = detectProcurementProfile(payload)) {
  if (!profile.isHvac) return [];
  const missing = profile.checks.filter(check => !check.found).slice(0, 2).map(check => check.label);
  return missing.length
    ? [`לבקש מכל ספק השלמה אחידה בנושאים: ${missing.join(' ו־')}.`]
    : ['לתעד בכתב שכל סעיפי ה־HVAC שנבדקו נכללים במחיר ובתכולת העבודה הסופית.'];
}

function buildNegotiationLetter(payload, profile = detectProcurementProfile(payload)) {
  const options = [...(payload.options || [])].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const supplier = payload.selectedOption || options[1]?.name || options[0]?.name || 'הספק';
  const missing = profile.checks?.filter(check => !check.found).map(check => check.label) || [];
  const requests = missing.length ? missing : ['המחיר הסופי', 'תכולת העבודה', 'לוח הזמנים', 'האחריות ותנאי התשלום'];
  return `לכבוד ${supplier},\n\nהנדון: בקשה להבהרות ולעדכון הצעה — ${payload.caseName || 'תיק ההשוואה'}\n\nלאחר בחינת ההצעה, נבקש לקבל התייחסות כתובה ואחידה לנושאים הבאים:\n${requests.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\nבנוסף, אנא אשרו שהמחיר המעודכן כולל את מלוא התכולה המוסכמת וציינו במפורש כל החרגה.\n\nלאחר קבלת ההבהרות נוכל להשלים את ההשוואה.\n\nבברכה`;
}

function buildRevisedRfp(payload, profile = detectProcurementProfile(payload)) {
  const checks = profile.isHvac ? CHECKS.map(x => x.label) : ['תכולת עבודה והחרגות', 'מחיר ותנאי תשלום', 'לוחות זמנים', 'אחריות ושירות'];
  return `טיוטת דרישות מתוקנת — ${payload.caseName || 'הליך קבלת הצעות'}\n\n1. מטרת ההתקשרות\n${payload.goal || 'יש לפרט את מטרת העבודה והתוצאה הנדרשת.'}\n\n2. מבנה חובה להצעה\nכל מציע ימלא מחיר סופי, לוח זמנים, תנאי תשלום ורשימת החרגות מפורשת.\n\n3. סעיפים להשוואה אחידה\n${checks.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n4. שינויי מחיר\nכל הצמדה או מנגנון עדכון מחיר יפורטו מראש ובאופן שניתן לחישוב.\n\n5. מסירה ואישור\nהשלמת העבודה תהיה כפופה לבדיקות קבלה, מסירת מסמכים ואישור המזמין.\n\nהערה: זו טיוטה תפעולית לדיון ואינה תחליף לבדיקה משפטית או מקצועית.`;
}

module.exports = { detectProcurementProfile, buildProfessionalRisks, buildProfessionalActions, buildNegotiationLetter, buildRevisedRfp };
