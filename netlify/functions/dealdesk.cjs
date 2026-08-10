const headers={'content-type':'application/json; charset=utf-8'};
const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
const label={financing:'הצעת המימון',supplier:'הצעת הספק',property:'עסקה',insurance:'פוליסה',other:'חלופה'};

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{});
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  try{
    const p=JSON.parse(event.body||'{}'),options=Array.isArray(p.options)?p.options:[];
    if(options.length<2)return reply(400,{error:'נדרשות לפחות שתי חלופות'});
    const sorted=[...options].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)),winner=sorted[0],runner=sorted[1];
    const confidence=p.goal&&options.every(o=>Number(o.total)>=0&&Number(o.months)>=0)?'בינונית':'נמוכה';
    const costGap=Math.max(0,(Number(winner.total)||0)-(Number(runner.total)||0));
    const risks=[];
    for(const o of options){
      if(!Number(o.months))risks.push(`${o.name}: התקופה לא הוזנה ולכן העלות הכוללת עשויה להיות חלקית.`);
      if(Number(o.risk)>=4)risks.push(`${o.name}: רמת הסיכון שסומנה גבוהה ודורשת תנאי צמצום כתובים.`);
      if(o.note)risks.push(`${o.name}: יש לאמת במסמך המקור את התנאי “${o.note}”.`);
    }
    if(!Array.isArray(p.documentNames)||!p.documentNames.length)risks.push('לא צורפו מסמכי מקור לתיק; הנתונים מבוססים על הזנה ידנית.');
    const actions=[
      `לבקש מ־${winner.name} אישור כתוב לעלות הכוללת, לתקופה ולתנאי היציאה.`,
      `להציג ל־${runner.name} את פער הציון ולבקש שיפור בתנאי ${p.priority==='cashflow'?'התזרים החודשי':p.priority==='flexibility'?'הגמישות':'העלות'}.`,
      'לעדכן את התיק עם כל גרסה חדשה ולתעד מה השתנה לפני חתימה.'
    ];
    const gap=Math.abs((Number(winner.score)||0)-(Number(runner.score)||0));
    const bottomLine=`${label[p.caseType]||'החלופה'} ${winner.name} מובילה כרגע במדד ההתאמה בפער של ${gap} נקודות. ${costGap>0?'היא אינה הזולה ביותר, ולכן היתרון תלוי בגמישות ובסיכון שהוזנו.':'היא גם אינה יקרה יותר מהחלופה המדורגת אחריה לפי הנתונים שאושרו.'}`;
    return reply(200,{bottomLine,confidence,risks:risks.slice(0,5),actions});
  }catch(e){return reply(400,{error:'לא ניתן לעבד את נתוני התיק'})}
};
