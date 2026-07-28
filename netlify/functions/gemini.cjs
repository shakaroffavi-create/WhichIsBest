const { response, promptFrom, parseJson } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  try {
    if (!process.env.GEMINI_API_KEY) return response(500,{error:'GEMINI_API_KEY לא מוגדר'});
    const body = JSON.parse(event.body || '{}');
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:promptFrom(body)}]}],generationConfig:{temperature:.2,responseMimeType:'application/json'}})});
    const j = await r.json(); if(!r.ok) throw new Error(j.error?.message || 'Gemini error');
    return response(200,parseJson(j.candidates?.[0]?.content?.parts?.[0]?.text));
   } catch (e) {
  console.error('Gemini function error:', e.message);
  return response(500, { error: e.message} );
}
};
