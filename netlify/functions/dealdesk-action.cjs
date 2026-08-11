const { detectProcurementProfile, buildNegotiationLetter, buildRevisedRfp } = require('./_procurement-knowledge.cjs');
const headers = {'content-type':'application/json; charset=utf-8'};
const reply = (statusCode, body) => ({statusCode, headers, body: JSON.stringify(body)});

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST') return reply(405, {error:'Method not allowed'});
  try {
    const payload = JSON.parse(event.body || '{}');
    const profile = detectProcurementProfile(payload);
    if (payload.actionType === 'negotiation_letter') return reply(200, {title:'מכתב משא ומתן לספק', content:buildNegotiationLetter(payload, profile), professionalProfile:profile.name, generatedAt:new Date().toISOString()});
    if (payload.actionType === 'revised_rfp') return reply(200, {title:'טיוטת מכרז מתוקנת', content:buildRevisedRfp(payload, profile), professionalProfile:profile.name, generatedAt:new Date().toISOString()});
    return reply(400, {error:'פעולת המשך לא מוכרת'});
  } catch {
    return reply(400, {error:'לא ניתן ליצור את מסמך ההמשך'});
  }
};
