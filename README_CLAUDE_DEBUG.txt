WICHISBEST v5.1.3 Claude Debug

After deployment, open:
https://wichisbest.com/api/claude-debug?check=1

The page reports:
- whether ANTHROPIC_API_KEY is visible to Netlify Functions
- whether the key format looks correct
- the HTTP status from Anthropic /v1/models
- the exact Anthropic error type and message
- models available to this API key
- the selected model
- the result of a minimal test request

The API key itself is never returned.
