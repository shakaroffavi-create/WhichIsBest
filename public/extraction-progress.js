(() => {
  const stages = [
    { at: 5, label: 'מעלה ומכין את המסמכים', note: 'בודק את הקבצים ומכין אותם לקריאה.' },
    { at: 24, label: 'קורא את ההצעות', note: 'מזהה טקסט, טבלאות וכתב כמויות.' },
    { at: 48, label: 'מחלץ מחירים וסעיפים', note: 'מאתר עלויות, תקופות, אחריות ותנאי תשלום.' },
    { at: 70, label: 'משווה בין ההצעות', note: 'בודק פערים, החרגות ומידע חסר.' },
    { at: 86, label: 'מכין את התוצאות', note: 'מסדר את הנתונים להצגה ולאישור.' }
  ];

  const status = document.getElementById('extractStatus');
  const extractButton = document.getElementById('extractBtn');
  if (!status || !extractButton) return;

  status.setAttribute('aria-live', 'polite');
  status.insertAdjacentHTML('afterend', `
    <div class="extract-progress" id="extractProgress" role="progressbar"
      aria-label="התקדמות חילוץ הנתונים" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="extract-progress-head">
        <strong id="extractStage">מכין את המסמכים</strong>
        <span id="extractPercent">0%</span>
      </div>
      <div class="extract-progress-track"><div class="extract-progress-fill" id="extractProgressFill"></div></div>
      <small class="extract-progress-note" id="extractProgressNote">אפשר להמשיך לעבוד כשהמערכת קוראת את ההצעות.</small>
    </div>
  `);

  const progressBox = document.getElementById('extractProgress');
  const fill = document.getElementById('extractProgressFill');
  const percent = document.getElementById('extractPercent');
  const stageLabel = document.getElementById('extractStage');
  const note = document.getElementById('extractProgressNote');
  let timer = null;
  let progress = 0;
  let running = false;

  function paint(value) {
    progress = Math.max(0, Math.min(100, Math.round(value)));
    const stage = [...stages].reverse().find((item) => progress >= item.at) || stages[0];
    progressBox.classList.add('active');
    progressBox.setAttribute('aria-valuenow', String(progress));
    fill.style.width = `${progress}%`;
    percent.textContent = `${progress}%`;
    stageLabel.textContent = progress === 100 ? 'החילוץ הושלם' : stage.label;
    note.textContent = progress === 100 ? 'ההצעות מוכנות לבדיקה ולאישור.' : stage.note;
  }

  function start() {
    if (running) return;
    running = true;
    clearInterval(timer);
    paint(5);
    timer = setInterval(() => {
      const step = progress < 24 ? 4 : progress < 48 ? 3 : progress < 70 ? 2 : 1;
      paint(Math.min(92, progress + step));
    }, 900);
  }

  function finish() {
    clearInterval(timer);
    timer = null;
    running = false;
    paint(100);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    running = false;
    progressBox.classList.remove('active');
  }

  extractButton.addEventListener('click', () => {
    const files = [...(document.getElementById('files')?.files || [])];
    const consent = document.getElementById('documentConsent')?.checked;
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (files.length && consent && total <= 4000000) start();
  });

  document.getElementById('manualBtn')?.addEventListener('click', stop);
  document.getElementById('newCase')?.addEventListener('click', stop);

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const url = String(args[0] || '');
    const isExtraction = url.includes('dealdesk-extract');
    if (isExtraction) {
      start();
      paint(Math.max(progress, 24));
    }
    try {
      const response = await nativeFetch(...args);
      if (isExtraction) response.ok ? finish() : stop();
      return response;
    } catch (error) {
      if (isExtraction) stop();
      throw error;
    }
  };
})();
