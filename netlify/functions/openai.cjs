const { response, promptFrom, parseJson } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  try {
    if (!process.env.OPENAI_API_KEY) return response(500,{error:'OPENAI_API_KEY לא מוגדר'});
    const body = JSON.parse(event.body || '{}');
    const r = await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-4.1-mini',temperature:.2,response_format:{type:'json_object'},messages:[{role:'user',content:promptFrom(body)}]})});
    const j = await r.json(); if(!r.ok) throw new Error(j.error?.message || 'OpenAI error');
    return response(200,parseJson(j.choices?.[0]?.message?.content));
  } catch(e){ return response(500,{error:e.message}); }
};
