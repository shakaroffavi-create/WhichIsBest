function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };
}
function response(statusCode, body) { return { statusCode, headers: cors(), body: JSON.stringify(body) }; }
function promptFrom(body) {
  const criteria = (body.criteria || []).filter(x => x.name).map(x => `${x.name} (משקל ${x.weight}/10)`).join(', ');
  const files = (body.files || []).map(f => `${f.name}${f.text ? `: ${f.text}` : ''}`).join('\n');
  const knowledge = String(body.knowledgeContext || '').trim().slice(0, 8000);
  return `אתה מנוע ניתוח בתוך WICHISBEST. נתח את ההתלבטות בעברית, באופן זהיר ושקוף. אל תציג את עצמך כיועץ מקצועי ואל תמציא עובדות.\n\nשאלה: ${body.question}\nרקע: ${body.background || 'לא נמסר'}\nקישור: ${body.link || 'לא נמסר'}\nקריטריונים: ${criteria || 'לא הוגדרו'}\nחלופות: ${(body.options || []).map((x,i)=>`${i+1}. ${x}`).join('\n')}\nקבצים/תוכן: ${files || 'לא צורף'}\nמאגר ידע אישי רלוונטי (MD): ${knowledge || 'לא נמצא מידע רלוונטי'}\n\nהשתמש במאגר הידע כחומר עזר בלבד. העדף מידע עדכני ומבוסס, ציין סתירות או חוסר ודאות, ואל תציג טענה שאינה נתמכת כעובדה.\n\nהחזר JSON בלבד, בלי markdown, במבנה:\n{"summary":"סיכום ברור עד 120 מילים","ranking":[{"option":"שם חלופה מדויק","index":0,"score":0,"reason":"הסבר קצר"}],"advantages":["..."],"risks":["..."],"confidence":0}\nהציון 0-100. כל החלופות חייבות להופיע פעם אחת. confidence הוא מידת הביטחון בניתוח, לא הבטחה לתוצאה.`;
}
function parseJson(text) {
  if (!text) throw new Error('לא התקבלה תשובה');
  const cleaned = text.replace(/```json|```/g,'').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('המודל החזיר פורמט לא תקין');
  return JSON.parse(cleaned.slice(start,end+1));
}
module.exports = { cors, response, promptFrom, parseJson };
