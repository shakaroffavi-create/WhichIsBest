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
  const content=[{type:'input_text',text:`חלץ מכל מסמך הצעה אחת. סוג התיק: ${String(p.caseType||'other')}. כל מסמך הוא מקור נפרד. אל תמציא מספרים. מחיר כולל או מחיר הקמה נכנס ל-upfront. דמי תחזוקה חודשיים נכנסים ל-monthly. תקופת תחזוקה או התקשרות בחודשים נכנסת ל-months. הערך risk הוא 1-5 לפי סיכונים מפורשים במסמך בלבד; flexibility הוא 1-5 לפי תנאי יציאה, תשלום וגמישות מפורשים. בשדה note כתוב בקצרה אחריות, קנס, החרגה או תנאי יציאה שמשנים את ההחלטה. confidence הוא high רק כאשר השם והמספרים מופיעים בבירור; אחרת medium. החזר JSON בלבד: {"options":[{"name":"שם ספק או הצעה","upfront":null,"monthly":null,"months":null,"risk":null,"flexibility":null,"note":"","confidence":"high|medium","sourceFile":"שם קובץ"}]}.` }];
  for(const a of attachments){
   if(String(a.type||'').startsWith('image/')&&a.data)content.push({type:'input_image',image_url:a.data,detail:'high'});
   else if((a.type==='application/pdf'||/\.pdf$/i.test(a.name||''))&&a.data)content.push({type:'input_file',filename:a.name||'proposal.pdf',file_data:a.data});
   else {const t=textFromData(a);if(t)content.push({type:'input_text',text:`מסמך ${a.name||''}:\n${t}`})}
  }
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1',instructions:'אתה מנוע חילוץ מסמכים קפדני. אין לנחש מידע חסר. החזר JSON תקין בלבד.',input:[{role:'user',content}],max_output_tokens:1600})});
  const j=await r.json();if(!r.ok)throw Error(j.error?.message||'שירות החילוץ נכשל');const parsed=cleanJson(outputText(j));
  if(!parsed||!Array.isArray(parsed.options))throw Error('לא התקבל מבנה נתונים תקין');
  const options=parsed.options.slice(0,5).map((o,i)=>({name:String(o.name||`חלופה ${i+1}`).slice(0,120),upfront:validNumber(o.upfront),monthly:validNumber(o.monthly),months:validNumber(o.months),risk:validNumber(o.risk),flexibility:validNumber(o.flexibility),note:String(o.note||'').slice(0,260),confidence:o.confidence==='high'?'high':'medium',sourceFile:String(o.sourceFile||attachments[i]?.name||'').slice(0,160)}));
  return reply(200,{options});
 }catch(e){console.error('dealdesk-extract',e);return reply(500,{error:e.message||'לא ניתן לחלץ נתונים מהמסמכים'})}
};
