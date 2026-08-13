const headers={'content-type':'application/json; charset=utf-8'};
const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
const outputText=r=>r.output_text||(r.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('\n');
const cleanJson=t=>{try{return JSON.parse(String(t||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))}catch{return null}};
const textFromData=a=>{const m=String(a.data||'').match(/^data:[^;]+;base64,(.+)$/s);if(!m)return'';try{return Buffer.from(m[1],'base64').toString('utf8').slice(0,24000)}catch{return''}};
const validNumber=v=>(v===null||v===undefined||v==='')?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);

exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 try{
  const p=JSON.parse(event.body||'{}');
  if(p.consent!==true)return reply(400,{error:'נדרשת הסכמה מפורשת לעיבוד המסמכים'});
  if(!process.env.OPENAI_API_KEY)return reply(500,{error:'שירות החילוץ אינו מוגדר'});
  const attachments=Array.isArray(p.attachments)?p.attachments.slice(0,5):[];
  if(!attachments.length)return reply(400,{error:'לא צורפו מסמכים'});
  const content=[{type:'input_text',text:`נתח חבילת מסמכי מכרז והצעות. סוג התיק: ${String(p.caseType||'other')}. זהה קודם איזה מסמך הוא דרישת המכרז/כתב הכמויות ואילו מסמכים הם הצעות. השווה כל הצעה לדרישה ולא רק להצעות האחרות. אל תמציא מידע, מחיר ייחוס או סעיף שלא מופיעים במסמכים. שדה חסר נשאר null ומסומן כחסר.

לכל דרישה חלץ שם, כמות, יחידה, מפרט וטווח ייחוס רק אם נכתב במפורש. לכל הצעה חלץ מחיר כולל, אחריות, משך, תנאי תשלום, הסתייגויות וקישור בין סעיפי ההצעה לדרישות. סמן omitted כאשר סעיף נדרש אינו מופיע או לא תומחר; deviation כאשר הוצע מוצר/מפרט אחר; unclear כאשר לא ניתן לוודא. נסח שאלות קצרות ומדויקות שהבוחן צריך לשלוח למציע. eligibility הוא complete רק אם כל תנאי הסף והסעיפים המהותיים ברורים; conditional כאשר דרושה השלמה; blocked כאשר חסר תנאי סף או סעיף מהותי. אין לבחור זוכה אם אי אפשר להשוות על בסיס אחיד.

מחיר כולל נכנס ל-upfront. risk ו-flexibility הם 1-5 רק לפי מידע מפורש. confidence הוא high רק כאשר המקור ברור.
החזר JSON בלבד במבנה:
{"tender":{"sourceFile":"","title":"","requirements":[{"id":"r1","name":"","quantity":null,"unit":"","spec":"","referenceMin":null,"referenceMax":null,"required":true}]},"options":[{"name":"","upfront":null,"monthly":null,"months":null,"risk":null,"flexibility":null,"note":"","confidence":"high|medium","sourceFile":"","eligibility":"complete|conditional|blocked","coveragePercent":null,"lines":[{"requirementId":"r1","included":false,"unitPrice":null,"offeredSpec":"","status":"matched|omitted|deviation|unclear","note":""}],"missingItems":[""],"deviations":[""],"clarificationQuestions":[""]}],"decision":{"status":"ready|conditional|blocked","summary":"","requiredBeforeDecision":[""]}}.` }];
  for(const a of attachments){
   if(String(a.type||'').startsWith('image/')&&a.data)content.push({type:'input_image',image_url:a.data,detail:'high'});
   else if((a.type==='application/pdf'||/\.pdf$/i.test(a.name||''))&&a.data)content.push({type:'input_file',filename:a.name||'proposal.pdf',file_data:a.data});
   else {const t=textFromData(a);if(t)content.push({type:'input_text',text:`מסמך ${a.name||''}:\n${t}`})}
  }
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1',instructions:'אתה מנוע חילוץ והשוואת מכרזים קפדני. אין לנחש מידע חסר או מחירי שוק. כל ממצא חייב לנבוע מהמסמכים. החזר JSON תקין בלבד.',input:[{role:'user',content}],max_output_tokens:5000})});
  const j=await r.json();if(!r.ok)throw Error(j.error?.message||'שירות החילוץ נכשל');const parsed=cleanJson(outputText(j));
  if(!parsed||!Array.isArray(parsed.options))throw Error('לא התקבל מבנה נתונים תקין');
  const cleanList=(x,limit=12)=>Array.isArray(x)?x.filter(Boolean).slice(0,limit).map(v=>String(v).slice(0,300)):[];
  const requirements=Array.isArray(parsed.tender?.requirements)?parsed.tender.requirements.slice(0,80).map((x,i)=>({id:String(x.id||`r${i+1}`).slice(0,40),name:String(x.name||`סעיף ${i+1}`).slice(0,180),quantity:validNumber(x.quantity),unit:String(x.unit||'יחידה').slice(0,40),spec:String(x.spec||'').slice(0,260),referenceMin:validNumber(x.referenceMin),referenceMax:validNumber(x.referenceMax),required:x.required!==false})):[];
  const requirementIds=new Set(requirements.map(x=>x.id));
  const options=parsed.options.slice(0,5).map((o,i)=>({name:String(o.name||`חלופה ${i+1}`).slice(0,120),upfront:validNumber(o.upfront),monthly:validNumber(o.monthly),months:validNumber(o.months),risk:validNumber(o.risk),flexibility:validNumber(o.flexibility),note:String(o.note||'').slice(0,500),confidence:o.confidence==='high'?'high':'medium',sourceFile:String(o.sourceFile||attachments[i]?.name||'').slice(0,160),eligibility:['complete','conditional','blocked'].includes(o.eligibility)?o.eligibility:'conditional',coveragePercent:validNumber(o.coveragePercent),lines:Array.isArray(o.lines)?o.lines.slice(0,100).filter(x=>requirementIds.has(String(x.requirementId))).map(x=>({requirementId:String(x.requirementId),included:x.included===true,unitPrice:validNumber(x.unitPrice),offeredSpec:String(x.offeredSpec||'').slice(0,220),status:['matched','omitted','deviation','unclear'].includes(x.status)?x.status:'unclear',note:String(x.note||'').slice(0,260)})):[],missingItems:cleanList(o.missingItems),deviations:cleanList(o.deviations),clarificationQuestions:cleanList(o.clarificationQuestions)}));
  const tender={sourceFile:String(parsed.tender?.sourceFile||'').slice(0,160),title:String(parsed.tender?.title||'דרישת המכרז').slice(0,180),requirements};
  const decision={status:['ready','conditional','blocked'].includes(parsed.decision?.status)?parsed.decision.status:'conditional',summary:String(parsed.decision?.summary||'').slice(0,700),requiredBeforeDecision:cleanList(parsed.decision?.requiredBeforeDecision)};
  return reply(200,{tender,options,decision});
 }catch(e){console.error('dealdesk-extract',e);return reply(500,{error:e.message||'לא ניתן לחלץ נתונים מהמסמכים'})}
};
