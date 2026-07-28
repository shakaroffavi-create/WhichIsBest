const { response, promptFrom, parseJson } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  try {
    if (!process.env.ANTHROPIC_API_KEY) return response(500,{error:'ANTHROPIC_API_KEY לא מוגדר'});
    const body = JSON.parse(event.body || '{}');
    const r = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',max_tokens:1800,temperature:.2,messages:[{role:'user',content:promptFrom(body)}]})});
    const j = await r.json(); if(!r.ok) throw new Error(j.error?.message || 'Claude error');
    return response(200,parseJson(j.content?.find(x=>x.type==='text')?.text));
  } catch(e){ return response(500,{error:e.message}); }
};
