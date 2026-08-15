(()=>{
  'use strict';
  const MAX_OFFERS=7, USER_KEY='wib_local_account_v1', FEEDBACK_KEY='wib_feedback_v1';
  const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function modalShell(id,content){
    const host=document.createElement('div');host.id=id;host.className='wb-modal';host.hidden=true;host.innerHTML=`<section class="wb-dialog" role="dialog" aria-modal="true">${content}</section>`;document.body.append(host);return host;
  }
  const accountModal=modalShell('accountModal',`<h2>שמירת התיק והמשך להעלאת הצעות</h2><p>יצרתם בסיס לתיק. הרשמה קצרה תשמור אותו ותאפשר לחזור למסמכים ולהשוואה.</p><div class="wb-note">בגרסת הבדיקה החשבון נשמר במכשיר זה בלבד. חיבור חשבון מאובטח וכניסה באמצעות Google יופעלו לפני ההשקה המסחרית.</div><form id="accountForm"><label>שם מלא או שם החברה<input id="accountName" autocomplete="name" required></label><label>דוא״ל<input id="accountEmail" type="email" autocomplete="email" required></label><label class="wb-consent"><span><input id="legalConsent" type="checkbox" required>קראתי ואני מסכים/ה ל<a href="/terms.html" target="_blank">תנאי השימוש</a> ומאשר/ת שקראתי את <a href="/privacy.html" target="_blank">מדיניות הפרטיות</a>.</span></label><label class="wb-consent"><span><input id="marketingConsent" type="checkbox">אשמח לקבל עדכוני מוצר. אפשר לבטל בכל עת.</span></label><div class="wb-error" id="accountError"></div><div class="wb-dialog-actions"><button type="button" class="wb-close">אולי אחר כך</button><button class="wb-submit">שמירת התיק והמשך</button></div></form>`);
  function closeModal(modal){modal.hidden=true;document.body.style.overflow=''}
  function openModal(modal){modal.hidden=false;document.body.style.overflow='hidden';setTimeout(()=>modal.querySelector('input,button')?.focus(),30)}
  accountModal.querySelector('.wb-close').onclick=()=>closeModal(accountModal);
  accountModal.onclick=e=>{if(e.target===accountModal)closeModal(accountModal)};
  $('accountForm').onsubmit=e=>{e.preventDefault();const name=$('accountName').value.trim(),email=$('accountEmail').value.trim();if(!name||!email||!$('legalConsent').checked){$('accountError').textContent='יש למלא שם ודוא״ל ולאשר את תנאי השימוש.';return}localStorage.setItem(USER_KEY,JSON.stringify({name,email,marketing:$('marketingConsent').checked,createdAt:new Date().toISOString()}));closeModal(accountModal);refreshAccount();window.showPanel?.(2)};
  function refreshAccount(){const user=JSON.parse(localStorage.getItem(USER_KEY)||'null'),btn=$('accountButton');if(btn)btn.textContent=user?`שלום, ${user.name.split(/\s+/)[0]}`:'כניסה'}
  function installAccountGate(){
    const header=document.querySelector('.header-meta');if(!header||$('accountButton'))return;
    const button=document.createElement('button');button.id='accountButton';button.className='account-btn';button.type='button';button.onclick=()=>{const user=JSON.parse(localStorage.getItem(USER_KEY)||'null');if(user){$('accountName').value=user.name||'';$('accountEmail').value=user.email||'';$('legalConsent').checked=true;$('marketingConsent').checked=!!user.marketing}openModal(accountModal)};header.insertBefore(button,header.firstChild);refreshAccount();
    const next=document.querySelector('[data-next="2"]');next?.addEventListener('click',e=>{if(localStorage.getItem(USER_KEY))return;e.preventDefault();e.stopImmediatePropagation();openModal(accountModal)},true);
  }
  function updateOfferLimit(){const entries=document.querySelectorAll('#options .option-entry'),button=$('addOption');if(!button)return;button.disabled=entries.length>=MAX_OFFERS;button.textContent=entries.length>=MAX_OFFERS?'הגעתם למגבלה של 7 הצעות':'+ הוספת הצעה ידנית';let note=$('offerLimitNote');if(!note){note=document.createElement('span');note.id='offerLimitNote';note.className='offer-limit-note';button.after(note)}note.textContent=`${entries.length} מתוך ${MAX_OFFERS} הצעות`}
  function installOfferLimit(){const button=$('addOption'),options=$('options');if(!button||!options)return;button.addEventListener('click',e=>{if(options.querySelectorAll('.option-entry').length>=MAX_OFFERS){e.preventDefault();e.stopImmediatePropagation();alert('ניתן להשוות עד 7 הצעות בכל תיק.');updateOfferLimit()}},true);new MutationObserver(updateOfferLimit).observe(options,{childList:true});updateOfferLimit();const hint=document.querySelector('#drop p');if(hint)hint.textContent='עד 7 קבצים, 4MB יחד. PDF, תמונות וקובצי טקסט נתמכים.'}
  function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`}
  function exportExcel(){
    const table=document.querySelector('#selectedMatrix table')||document.querySelector('.comparison table');if(!table){alert('יש להציג תחילה את מטריצת ההשוואה.');return}
    const rows=[...table.rows].map(row=>[...row.cells].map(cell=>cell.innerText.trim()));
    const csv=`sep=,\r\n${rows.map(row=>row.map(csvCell).join(',')).join('\r\n')}`;
    const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`WICHISBEST-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);localStorage.setItem('wib_meaningful_use','1');localStorage.setItem('wib_export_count',String(Number(localStorage.getItem('wib_export_count')||0)+1));setTimeout(maybeFeedback,700);
  }
  function installExport(){const actions=document.querySelector('.result-actions');if(!actions||$('exportExcel'))return;const button=document.createElement('button');button.id='exportExcel';button.type='button';button.className='secondary-action export-excel';button.textContent='ייצוא מטריצת ההשוואה ל־Excel';button.onclick=exportExcel;actions.insertBefore(button,actions.lastElementChild)}
  const feedbackModal=modalShell('feedbackModal',`<h2>איך הייתה ההשוואה?</h2><p>לאחר שימוש מלא במערכת, נשמח למשוב קצר שיעזור לנו להשתפר.</p><form id="feedbackForm"><label>עד כמה המערכת עזרה לך?</label><div class="feedback-stars" id="feedbackStars">${[1,2,3,4,5].map(n=>`<button type="button" data-rating="${n}" aria-label="דירוג ${n}">★</button>`).join('')}</div><input id="feedbackRating" type="hidden" required><label>מה דרש יותר מדי זמן?<select id="feedbackArea"><option value="">לא הייתה בעיה מיוחדת</option><option>העלאת מסמכים</option><option>אישור הנתונים</option><option>המטריצה</option><option>התרחישים</option><option>הדוח</option></select></label><label>מה הדבר האחד שהיית משפר?<textarea id="feedbackText" maxlength="600"></textarea></label><div class="wb-error" id="feedbackError"></div><div class="wb-dialog-actions"><button type="button" class="wb-close">אולי בפעם אחרת</button><button class="wb-submit">שליחת משוב</button></div></form>`);
  feedbackModal.querySelector('.wb-close').onclick=()=>{localStorage.setItem('wib_feedback_deferred',new Date().toISOString());closeModal(feedbackModal)};
  $('feedbackStars').onclick=e=>{const n=Number(e.target.dataset.rating);if(!n)return;$('feedbackRating').value=n;[...$('feedbackStars').children].forEach((b,i)=>b.classList.toggle('active',i<n))};
  $('feedbackForm').onsubmit=e=>{e.preventDefault();if(!$('feedbackRating').value){$('feedbackError').textContent='יש לבחור דירוג בין 1 ל־5.';return}const all=JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'[]');all.push({rating:Number($('feedbackRating').value),area:$('feedbackArea').value,text:$('feedbackText').value.trim(),caseName:$('caseName')?.value.trim()||'',offers:document.querySelectorAll('#options .option-entry').length,createdAt:new Date().toISOString()});localStorage.setItem(FEEDBACK_KEY,JSON.stringify(all));localStorage.setItem('wib_feedback_completed','1');closeModal(feedbackModal)};
  function maybeFeedback(){
    if(!localStorage.getItem('wib_meaningful_use')||localStorage.getItem('wib_feedback_completed'))return;
    const exports=Number(localStorage.getItem('wib_export_count')||0),nextExport=Number(localStorage.getItem('wib_feedback_next_export')||3),lastPrompt=Date.parse(localStorage.getItem('wib_feedback_last_prompt')||'')||0,month=30*24*60*60*1000;
    if(exports<nextExport||Date.now()-lastPrompt<month)return;
    localStorage.setItem('wib_feedback_last_prompt',new Date().toISOString());
    localStorage.setItem('wib_feedback_next_export',String(exports+7));
    openModal(feedbackModal);
  }
  installAccountGate();installOfferLimit();installExport();
  const resultPanel=document.querySelector('[data-panel="4"]');if(resultPanel)new MutationObserver(installExport).observe(resultPanel,{childList:true,subtree:true});
})();
