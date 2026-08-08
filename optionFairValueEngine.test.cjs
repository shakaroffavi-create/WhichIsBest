'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { blackScholes, valueOption, valueStrategy } = require('../netlify/functions/_optionEngine.cjs');

test('Black-Scholes matches the canonical call example', () => {
  const result = blackScholes({ type: 'call', style: 'european', spot: 100, strike: 100, volatility: 0.2, riskFreeRate: 0.05, dividendYield: 0, timeToExpiry: 1 });
  assert.ok(Math.abs(result.price - 10.4506) < 0.001);
  assert.ok(Math.abs(result.greeks.delta - 0.6368) < 0.001);
});

test('American put is never worth less than its European comparison', () => {
  const result = valueOption({ type: 'put', style: 'american', spot: 70, strike: 100, volatility: 0.25, riskFreeRate: 0.05, dividendYield: 0, timeToExpiry: 0.5 }, { binomialSteps: 300 });
  assert.ok(result.primary.price >= result.comparison.price);
  assert.ok(result.earlyExercisePremium >= 0);
});

test('strategy aggregates long and short legs with contract multiplier', () => {
  const result = valueStrategy({
    spot: 100, volatility: 0.2, riskFreeRate: 0.04, dividendYield: 0, timeToExpiry: 0.25,
    legs: [
      { type: 'call', style: 'european', strike: 95, side: 'long', quantity: 1, multiplier: 100 },
      { type: 'call', style: 'european', strike: 105, side: 'short', quantity: 1, multiplier: 100 }
    ]
  });
  assert.equal(result.legs.length, 2);
  assert.ok(result.net.price > 0);
  assert.ok(Number.isFinite(result.net.delta));
});

test('missing IV is rejected instead of guessed', () => {
  assert.throws(() => blackScholes({ type: 'call', spot: 100, strike: 100, riskFreeRate: 0.04, timeToExpiry: 1 }), /volatility/);
});
