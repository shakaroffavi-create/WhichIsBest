(() => {
  const languageKey = 'wichisbest-language';
  const translations = {
    'השוואה חדשה':'New comparison','הזיכרון שלי':'My memory','היסטוריה':'History',
    'התחל עכשיו':'Start now','התחלה חדשה ונקייה':'Clean new start','קבל כאפליקציה':'Get the app',
    'קבל החלטה מושכלת.':'Make a well-informed decision.','תמחר את רעשי הרקע.':'Cut through the noise.',
    'כתוב את השאלה, העלה מסמך או תמונה והגדר מה חשוב לך. WICHISBEST מרכזת את המידע, משווה בין החלופות ומציגה ניתוח ברור ושקוף.':'Describe your question, upload a document or image, and define what matters to you. WICHISBEST organizes the information, compares the alternatives, and presents a clear, transparent analysis.',
    'עזור לי להחליט':'Help me decide','איך הזיכרון עובד?':'How does memory work?',
    '✓ שלוש חלופות':'✓ Three alternatives','✓ מידע שמור בשליטתך':'✓ Your saved data stays under your control','✓ התחלה חדשה נקייה':'✓ Clean new start',
    'תיק החלטה':'Decision file','בחירת השקעה':'Investment choice','מוכן לניתוח':'Ready to analyze',
    'תיאור רקע':'Background','ניסיון, יעד ורמת סיכון':'Experience, goal, and risk level',
    'דוח מצורף':'Attached report','הכתבה קולית':'Voice dictation','נוספה לתיאור הרקע':'Added to the background',
    'המחשה של תהליך קבלת החלטה המבוסס על מספר מודלי AI.':'Illustration of a decision process powered by multiple AI models.',
    'כך מתקבלת ההמלצה':'How the recommendation is created','שלושה צעדים פשוטים בדרך להחלטה ברורה ומנומקת.':'Three simple steps toward a clear, reasoned decision.',
    'מגדירים את ההתלבטות':'Define the decision','מוסיפים את הרקע, החלופות והשיקולים החשובים לכם.':'Add the background, alternatives, and considerations that matter to you.',
    'משקללים את העדיפויות':'Weigh the priorities','המערכת מזהה מה חשוב לכם באמת וכיצד כל שיקול משפיע על ההחלטה.':'The system identifies what truly matters to you and how each consideration affects the decision.',
    'מקבלים המלצה מנומקת':'Get a reasoned recommendation','דוח מסכם מציג את החלופה המתאימה ביותר, הציון שלה והסיבות לבחירתה.':'A summary report presents the best-fitting alternative, its score, and the reasons behind it.',
    'שלב 1 מתוך 3':'Step 1 of 3','פרטי ההחלטה':'Decision details','נשמר מקומית בלבד':'Saved on this device only',
    'קטגוריה':'Category','בחר קטגוריה':'Choose a category','שוק ההון':'Capital markets','נדל״ן והשקעות':'Real estate and investments','אחר':'Other',
    '🎤 הכתבה':'🎤 Dictate','ספר על המצב הנוכחי, המטרה והפרטים שחשוב להביא בחשבון. ההסבר הזה יישאר כאן גם בזמן ההקלדה.':'Describe the current situation, your goal, and the details that should be considered.',
    'אפשר לכתוב או להכתיב בקול':'Type or dictate','📎 צרף מסמך או תמונה':'📎 Attach a document or image',
    'PDF, Word, Excel, PowerPoint או תמונה':'PDF, Word, Excel, PowerPoint, or image',
    'ספר פעם אחת — ואנחנו נסדר את ההחלטה':'Tell us once — we will structure the decision',
    'אחרי כתיבת הרקע, המערכת תחלץ את השאלה, החלופות והשיקולים. הכול ניתן לעריכה לפני שליחה.':'After you provide the background, the system extracts the question, alternatives, and considerations. You can edit everything before submitting.',
    '✨ סדר לי את ההחלטה':'✨ Structure my decision','כך הבנתי אותך:':'Here is what I understood:',
    'נכון, המשך':'Correct, continue','רוצה לתקן':'Edit',
    'מה ההחלטה ומה חשוב לך בבחירה?':'What is the decision, and what matters in your choice?',
    'המערכת תמלא כאן תמצית שניתן לתקן':'The system will create an editable summary here',
    'השיקולים שהבנתי':'Considerations I identified','אפשרות א׳':'Option A','אפשרות ב׳':'Option B','אפשרות ג׳':'Option C','אפשרות ד׳':'Option D','אפשרות ה׳':'Option E',
    'אפשר לכתוב או להכתיב':'Type or dictate','הסר':'Remove','＋ הוסף אפשרות':'＋ Add an option',
    'יש להזין לפחות שתי אפשרויות. ניתן להשוות עד חמש אפשרויות.':'Enter at least two options. You can compare up to five.',
    'מה חשוב לך בהחלטה?':'What matters in this decision?','הוסף קריטריונים וקבע את מידת החשיבות שלהם. המשקלים אינם חייבים להסתכם ב־100.':'Add criteria and set their importance. The weights do not need to add up to 100.',
    '＋ הוסף קריטריון':'＋ Add criterion','המודלים יתבקשו לנמק כיצד כל חלופה מתאימה לקריטריונים שהגדרת.':'The models will explain how each alternative fits the criteria you defined.',
    'הוספת מידע נוסף':'Add more information','רקע, מסמכים, תמונה, קישור או הכתבה':'Background, documents, image, link, or dictation','אופציונלי':'Optional',
    'צרף מסמך או תמונה':'Attach a document or image','לשמור את הרקע והשיקולים לפעם הבאה':'Save the background and considerations for next time',
    'נשמרים בדפדפן זה בלבד. ניתן לצפות, לערוך ולמחוק בכל עת.':'Saved in this browser only. You can view, edit, or delete them at any time.',
    'טעינת מידע שמור':'Load saved data','מחיקת מידע שמור':'Delete saved data','הצגת הדירוג':'Show ranking',
    'הדירוג שלך מוכן':'Your ranking is ready','מכין ניתוח':'Preparing analysis','מה חשוב לדעת?':'Important to know',
    'עריכת הנתונים':'Edit data','הזיכרון שלך נשאר בשליטתך':'Your memory stays under your control',
    'האתר יכול לזכור רקע ושיקולים שבחרת לשמור, ולהציע אותם בהחלטה הבאה. התחלה חדשה מנקה את הטופס — אך אינה מוחקת את הפרופיל השמור.':'The site can remember background and considerations you chose to save and suggest them for your next decision. A clean start clears the form but does not delete your saved profile.',
    'לא נשמר עדיין מידע אישי':'No personal data has been saved yet','החלטות אחרונות':'Recent decisions','ניקוי היסטוריה':'Clear history','עדיין אין החלטות שמורות.':'No saved decisions yet.',
    'רוצה לשמור את ההחלטות שלך?':'Want to save your decisions?',
    'בהרשמה קצרה נוכל לחבר בהמשך את ההיסטוריה וההעדפות שלך גם למכשירים נוספים.':'A quick signup will let us connect your history and preferences across devices in the future.',
    'שמירת ההחלטות שלי':'Save my decisions','לא עכשיו — אפשר להמשיך בלי הרשמה':'Not now — continue without signing up',
    'כתובת אימייל':'Email address','סגירה':'Close','תודה! ההרשמה נקלטה בהצלחה.':'Thank you! Your signup was received.',
    'יש להזין כתובת אימייל תקינה.':'Please enter a valid email address.','לא הצלחנו לשמור כרגע. אפשר לנסות שוב מאוחר יותר.':'We could not save it right now. Please try again later.',
    'שומר…':'Saving…','פונה למודלים…':'Contacting the models…'
  };
  const placeholders = {
    'כתוב או הכתב כאן את תיאור הרקע...':'Type or dictate the background here...',
    'אפשר לתת ל־AI למלא מהתיאור למעלה, או לכתוב כאן ידנית':'Let AI fill this from the background above, or type it manually',
    'השיקולים יחולצו אוטומטית מהרקע, וניתן לערוך אותם':'Considerations will be extracted from the background and can be edited',
    'לדוגמה: לפעול עכשיו':'For example: act now','לדוגמה: להמתין':'For example: wait',
    'אפשרות נוספת':'Another option','כתובת האימייל שלך':'Your email address'
  };
  const reverse = Object.fromEntries(Object.entries(translations).map(([he,en]) => [en,he]));
  const reversePlaceholders = Object.fromEntries(Object.entries(placeholders).map(([he,en]) => [en,he]));
  let currentLanguage = 'he';
  let translating = false;

  function translateTextNode(node, language) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    const leading = raw.match(/^\s*/)[0];
    const trailing = raw.match(/\s*$/)[0];
    const value = raw.trim();
    const translated = language === 'en' ? translations[value] : reverse[value];
    if (translated) node.nodeValue = leading + translated + trailing;
  }

  function translateElement(element, language) {
    if (!(element instanceof Element) || element.closest('[data-no-translate]')) return;
    Array.from(element.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
    });
    ['placeholder','aria-label','title'].forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;
      const value = element.getAttribute(attribute);
      const dictionary = attribute === 'placeholder' ? placeholders : translations;
      const backwards = attribute === 'placeholder' ? reversePlaceholders : reverse;
      const translated = language === 'en' ? dictionary[value] : backwards[value];
      if (translated) element.setAttribute(attribute, translated);
    });
  }

  function translateTree(root, language) {
    if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root, language);
    if (!(root instanceof Element) && root !== document) return;
    if (root instanceof Element) translateElement(root, language);
    root.querySelectorAll?.('*').forEach(element => translateElement(element, language));
  }

  function updateLanguageButtons(language) {
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setLanguage(language) {
    if (!['he','en'].includes(language)) language = 'he';
    translating = true;
    currentLanguage = language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.body.classList.toggle('language-en', language === 'en');
    translateTree(document, language);
    updateLanguageButtons(language);
    localStorage.setItem(languageKey, language);
    translating = false;
    document.dispatchEvent(new CustomEvent('wichisbest:languagechange', { detail:{ language } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language]').forEach(button => {
      button.addEventListener('click', () => setLanguage(button.dataset.language));
    });
    const saved = localStorage.getItem(languageKey);
    setLanguage(saved === 'en' ? 'en' : 'he');
    const observer = new MutationObserver(records => {
      if (translating || currentLanguage !== 'en') return;
      translating = true;
      records.forEach(record => record.addedNodes.forEach(node => translateTree(node, 'en')));
      translating = false;
    });
    observer.observe(document.body, { childList:true, subtree:true });
  });
})();