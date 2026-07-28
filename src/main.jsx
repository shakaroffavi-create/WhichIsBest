import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const PROVIDERS = [
  { id: 'openai', label: 'ChatGPT', icon: '◉' },
  { id: 'gemini', label: 'Gemini', icon: '✦' },
  { id: 'anthropic', label: 'Claude', icon: '◆' },
  { id: 'perplexity', label: 'Perplexity', icon: '🌐' }
];

function useSpeech(onText) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  const toggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('הכתבה קולית אינה נתמכת בדפדפן הזה. נסה Chrome במחשב או בטלפון.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => onText(e.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return { listening, toggle };
}

function VoiceButton({ onText }) {
  const { listening, toggle } = useSpeech(onText);
  return <button type="button" className={`voice ${listening ? 'active' : ''}`} onClick={toggle}>{listening ? 'מקשיב…' : '🎤 הכתבה'}</button>;
}

function InputBlock({ label, hint, value, setValue, rows = 3 }) {
  return <div className="field-card">
    <div className="field-head"><div><strong>{label}</strong><span>{hint}</span></div><VoiceButton onText={(t) => setValue(value ? `${value} ${t}` : t)} /></div>
    <textarea rows={rows} value={value} onChange={(e) => setValue(e.target.value)} />
  </div>;
}

function FilePicker({ files, setFiles }) {
  const ref = useRef(null);
  const add = (list) => setFiles([...files, ...Array.from(list)]);
  return <div className="attachments">
    <input ref={ref} hidden multiple type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*" onChange={(e) => add(e.target.files)} />
    <button type="button" className="attach-button" onClick={() => ref.current?.click()}>📎 צרף מסמך או תמונה</button>
    {files.length > 0 && <div className="file-list">{files.map((f, i) => <div className="file-pill" key={`${f.name}-${i}`}><span>{f.name}</span><button type="button" onClick={() => setFiles(files.filter((_, n) => n !== i))}>×</button></div>)}</div>}
  </div>;
}

function ProviderStatus({ provider, state }) {
  const labels = { idle: 'ממתין', loading: 'מנתח…', done: 'הושלם', error: 'לא זמין' };
  return <div className={`provider-status ${state}`}><span className="provider-icon">{provider.icon}</span><strong>{provider.label}</strong><span>{labels[state]}</span></div>;
}

function App() {
  const [question, setQuestion] = useState('');
  const [background, setBackground] = useState('');
  const [link, setLink] = useState('');
  const [files, setFiles] = useState([]);
  const [criteria, setCriteria] = useState([{ name: 'מחיר', weight: 5 }, { name: 'סיכון', weight: 5 }]);
  const [options, setOptions] = useState(['', '', '']);
  const [statuses, setStatuses] = useState(Object.fromEntries(PROVIDERS.map(p => [p.id, 'idle'])));
  const [responses, setResponses] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const validOptions = options.map(x => x.trim()).filter(Boolean);
  const ranking = useMemo(() => {
    const entries = Object.values(responses).filter(r => r?.ranking);
    if (!entries.length || !validOptions.length) return [];
    return validOptions.map((name, idx) => {
      const scores = entries.map(r => r.ranking.find(x => x.option === name || x.index === idx)?.score).filter(Number.isFinite);
      const score = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
      return { name, score };
    }).sort((a,b)=>b.score-a.score);
  }, [responses, validOptions.join('|')]);

  const updateCriterion = (i, patch) => setCriteria(criteria.map((c,n)=>n===i?{...c,...patch}:c));
  const reset = () => {
    setQuestion(''); setBackground(''); setLink(''); setFiles([]); setOptions(['','','']);
    setCriteria([{ name:'מחיר', weight:5 }, { name:'סיכון', weight:5 }]);
    setStatuses(Object.fromEntries(PROVIDERS.map(p => [p.id, 'idle']))); setResponses({}); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function analyze() {
    setError('');
    if (!question.trim() || validOptions.length < 2) {
      setError('יש להזין שאלה מרכזית ולפחות שתי חלופות.');
      return;
    }
    setBusy(true); setResponses({});
    setStatuses(Object.fromEntries(PROVIDERS.map(p => [p.id, 'loading'])));
    const fileSummary = await Promise.all(files.slice(0,5).map(async f => {
      let text = '';
      if (/^(text\/|application\/(json|csv))/.test(f.type) && f.size < 120000) text = await f.text();
      return { name: f.name, type: f.type, size: f.size, text: text.slice(0,20000) };
    }));
    const payload = { question, background, link, files: fileSummary, criteria, options: validOptions };
    await Promise.all(PROVIDERS.map(async p => {
      try {
        const res = await fetch(`/api/${p.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'שגיאה');
        setResponses(prev => ({ ...prev, [p.id]: data }));
        setStatuses(prev => ({ ...prev, [p.id]: 'done' }));
      } catch (e) {
        setResponses(prev => ({ ...prev, [p.id]: { error: e.message } }));
        setStatuses(prev => ({ ...prev, [p.id]: 'error' }));
      }
    }));
    setBusy(false);
    setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior:'smooth' }), 100);
  }

  return <>
    <header className="topbar"><div className="brand"><span>W</span>WICHISBEST</div><nav><a href="#form">השוואה חדשה</a><a href="#results">דוח ההחלטה</a></nav><button className="dark-button" onClick={() => document.getElementById('form')?.scrollIntoView({behavior:'smooth'})}>התחל עכשיו</button></header>

    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow">מהיר, מדויק וידידותי — Powered by AI</div><h1>נטרל רעשי רקע.<br/><span>קבל החלטה מושכלת.</span></h1><p>ספר לנו על ההתלבטות, צרף מידע והגדר את החלופות. WICHISBEST מרכזת מספר מנועי AI ומציגה תמונה מסודרת ושקופה.</p><div className="hero-actions"><button className="primary" onClick={() => document.getElementById('form')?.scrollIntoView({behavior:'smooth'})}>עזור לי להחליט ←</button><button className="secondary" onClick={() => alert('ממלאים שאלה, רקע, קריטריונים וחלופות — ואז מפעילים את הניתוח.')}>איך זה עובד?</button></div><button className="clean-start" onClick={reset}>↻ התחלה חדשה ונקייה</button></div>
        <div className="hero-card"><div className="mini-label">קבצים מאובטחים</div><div className="mini-row"><b>תיאור רקע</b><span>טקסט</span></div><div className="mini-row"><b>דוח מצורף</b><span>PDF</span></div><div className="mini-row"><b>הכתבה קולית</b><span>קול</span></div><div className="green-result"><strong>נטרל רעשי רקע.<br/>עזור לי להחליט!</strong><small>התחלה חדשה ונקייה</small></div></div>
      </section>

      <section id="form" className="form-section"><div className="section-heading"><span>תהליך פשוט</span><h2>ספר לנו בין מה אתה מתלבט</h2><p>אין צורך להכיר את שמות המודלים. המערכת מנהלת את העבודה מאחורי הקלעים.</p></div>
        <div className="form-shell">
          <InputBlock label="1. השאלה המרכזית" hint="מה בדיוק אתה מנסה להחליט?" value={question} setValue={setQuestion} rows={2}/>
          <InputBlock label="2. תיאור הרקע" hint="ניסיון, יעד, מגבלות וכל פרט שעשוי להשפיע" value={background} setValue={setBackground} rows={5}/>
          <div className="field-card"><div className="field-head"><div><strong>3. מידע נוסף</strong><span>מסמך, תמונה או קישור</span></div></div><FilePicker files={files} setFiles={setFiles}/><input className="link-input" value={link} onChange={(e)=>setLink(e.target.value)} placeholder="🔗 הוסף קישור רלוונטי" /></div>
          <div className="field-card"><div className="field-head"><div><strong>4. מה חשוב לך בהחלטה?</strong><span>הגדר קריטריונים ומשקל בין 1 ל־10</span></div><button className="small-button" onClick={()=>setCriteria([...criteria,{name:'',weight:5}])}>+ הוסף קריטריון</button></div><div className="criteria-list">{criteria.map((c,i)=><div className="criterion" key={i}><input value={c.name} onChange={(e)=>updateCriterion(i,{name:e.target.value})} placeholder="שם הקריטריון"/><input type="range" min="1" max="10" value={c.weight} onChange={(e)=>updateCriterion(i,{weight:Number(e.target.value)})}/><b>{c.weight}</b><button onClick={()=>setCriteria(criteria.filter((_,n)=>n!==i))}>×</button></div>)}</div></div>
          <div className="field-card"><div className="field-head"><div><strong>5. מהן החלופות שלך?</strong><span>לפחות שתי אפשרויות</span></div></div><div className="options-list">{options.map((o,i)=><div className="option-input" key={i}><span>{i+1}</span><input value={o} onChange={(e)=>setOptions(options.map((x,n)=>n===i?e.target.value:x))} placeholder={`אפשרות ${i+1}`}/></div>)}</div><button className="small-button" onClick={()=>setOptions([...options,''])}>+ הוסף חלופה</button></div>
          {error && <div className="error-box">{error}</div>}
          <button className="analyze-button" disabled={busy} onClick={analyze}>{busy ? 'מערכת התזמור עובדת…' : 'עזור לי להחליט'}</button>
          <div className="privacy">🔒 המידע משמש לצורך הניתוח בלבד. מפתחות ה־API נשמרים בצד השרת ב־Netlify.</div>
        </div>
      </section>

      <section className="status-section"><h2>מערכת התזמור</h2><div className="provider-grid">{PROVIDERS.map(p=><ProviderStatus key={p.id} provider={p} state={statuses[p.id]}/>)}</div></section>

      <section id="results" className="results-section"><div className="section-heading"><span>דוח ההחלטה</span><h2>{ranking.length ? 'הדירוג שלך מוכן' : 'הדוח יופיע כאן'}</h2></div>
        {ranking.length > 0 && <div className="ranking-list">{ranking.map((r,i)=><article className={`rank-card ${i===0?'winner':''}`} key={r.name}><div className="rank-letter">{String.fromCharCode(65+i)}</div><div className="rank-main"><h3>{r.name}</h3><p>{i===0?'החלופה שקיבלה את הציון המשוקלל הגבוה ביותר בין המודלים הזמינים.':'חלופה נוספת בדירוג המשוקלל.'}</p></div><div className="score"><b>{r.score}</b><span>מתוך 100</span></div></article>)}</div>}
        {Object.keys(responses).length > 0 && <div className="model-answers">{PROVIDERS.map(p=>{const r=responses[p.id]; return <details key={p.id} open={p.id==='openai'}><summary>{p.icon} ניתוח {p.label}</summary>{r?.error?<p className="error-text">{r.error}</p>:<><p className="answer-text">{r?.summary || 'לא התקבל סיכום.'}</p>{r?.advantages?.length>0&&<div><b>יתרונות מרכזיים</b><ul>{r.advantages.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}{r?.risks?.length>0&&<div><b>סיכונים מרכזיים</b><ul>{r.risks.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}</>}</details>})}</div>}
        {ranking.length>0 && <div className="consensus"><h3>מסקנת מערכת התזמור</h3><p>הדירוג נוצר באמצעות שילוב הציונים שהתקבלו מהמודלים שהשיבו בהצלחה. המערכת אינה מחליטה במקומך — היא מסדרת, מדרגת ומסבירה את החלופות.</p></div>}
      </section>
    </main>
    <footer>WICHISBEST v5.3 RC1 · נטרל רעשי רקע. קבל החלטה מושכלת.</footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
