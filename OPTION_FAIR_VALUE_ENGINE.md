# WhichIsBest Option Fair Value Engine

Implemented in v5.3.0-rc1. The engine prices European options with Black-Scholes and American options with a binomial early-exercise model, returns per-leg and net strategy Greeks, and rejects missing model inputs. Market quotes such as Bid, Ask and Last are deliberately excluded from fair-value calculation.

Files:

- `netlify/functions/_optionEngine.cjs` — pricing library.
- `netlify/functions/option-fair-value.cjs` — Netlify API handler.
- `public/options.html` — Hebrew RTL calculator UI.
- `test/optionFairValueEngine.test.cjs` — numerical and validation tests.

The current UI accepts user-verified market inputs and records their source/time. A licensed market-data adapter is still required before claiming automatic live-market inputs.
