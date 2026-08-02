const { response, promptFrom, parseJson } = require('./_shared.cjs');
const { enrichWithKnowledge } = require('./_knowledge.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});

  try {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return response(500, { error: 'XAI_API_KEY לא מוגדר' });

    const input = JSON.parse(event.body || '{}');
    const { body, sources } = await enrichWithKnowledge(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);

    let upstream;
    try {
      upstream = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.XAI_MODEL || 'grok-4.20-non-reasoning',
          temperature: 0.2,
          max_tokens: 1800,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Return only one valid JSON object, without markdown fences or extra text.'
            },
            {
              role: 'user',
              content: promptFrom(body)
            }
          ]
        })
      });
    } finally {
      clearTimeout(timer);
    }

    const raw = await upstream.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return response(502, {
        error: `Grok החזיר תשובת שרת לא תקינה (${upstream.status})`
      });
    }

    if (!upstream.ok) {
      return response(upstream.status, {
        error: data?.error?.message || data?.message || `Grok HTTP ${upstream.status}`
      });
    }

    const text = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!text) return response(502, { error: 'Grok החזיר תשובה ריקה' });

    return response(200, { ...parseJson(text), knowledgeSources: sources });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Grok לא השיב בתוך 55 שניות'
      : (error?.message || 'שגיאת Grok לא ידועה');
    return response(500, { error: message });
  }
};

