const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectProcurementProfile,
  buildProfessionalRisks,
  buildNegotiationLetter,
  buildRevisedRfp
} = require('../netlify/functions/_procurement-knowledge.cjs');

const payload = {
  caseName: 'השוואת קבלני מיזוג',
  caseType: 'supplier',
  goal: 'בחירת ספק HVAC למבנה משרדים',
  options: [
    {name: 'ספק א', score: 82, note: 'אחריות לשלוש שנים'},
    {name: 'ספק ב', score: 76, note: 'מחיר כולל התקנה'}
  ]
};

test('detects the Israeli HVAC procurement profile', () => {
  const profile = detectProcurementProfile(payload);
  assert.equal(profile.id, 'il-hvac-v1');
  assert.equal(profile.isHvac, true);
});

test('flags missing HVAC checks without flagging warranty that was supplied', () => {
  const profile = detectProcurementProfile(payload);
  const risks = buildProfessionalRisks(payload, profile).join('\n');
  assert.match(risks, /החרגות ותכולת עבודה/);
  assert.doesNotMatch(risks, /אחריות ושירות/);
});

test('creates actionable follow-up documents', () => {
  const actionPayload = {...payload, selectedOption: 'ספק א'};
  const profile = detectProcurementProfile(actionPayload);
  const letter = buildNegotiationLetter(actionPayload, profile);
  assert.match(letter, /לכבוד ספק א/);
  assert.match(letter, /בקשה להבהרות/);
  assert.match(buildRevisedRfp(payload, profile), /בדיקות קבלה/);
});
