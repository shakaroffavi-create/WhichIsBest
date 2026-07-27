VERSION 4.0.3 REQUEST PIPELINE FIX

WICHISBEST 4.0.0 — DYNAMIC FOUNDATION

WHAT IS ALREADY WORKING
1. The existing 3.0.2 visual design is preserved.
2. The form sends a real server request to /api/analyze.
3. Netlify Functions can call ChatGPT/OpenAI, Gemini and Claude in parallel.
4. If no API keys are configured, a visible local fallback is shown instead of failing silently.
5. User login, cloud decision history, private file upload and outcome tracking are prepared for Supabase.
6. Local browser history still works when Supabase is not configured.

IMPORTANT SECURITY RULE
Never paste OpenAI, Gemini, Anthropic or Supabase service-role keys into index.html, app.js or config.js.
AI keys belong only in Netlify: Site configuration > Environment variables.

NETLIFY ENVIRONMENT VARIABLES
OPENAI_API_KEY
OPENAI_MODEL (optional, default gpt-4.1-mini)
GEMINI_API_KEY
GEMINI_MODEL (optional, default gemini-2.5-flash)
ANTHROPIC_API_KEY
ANTHROPIC_MODEL (optional)

SUPABASE SETUP
1. Create a Supabase project.
2. Open SQL Editor and run supabase/schema.sql.
3. In Authentication, enable Email OTP/Magic Link and set the site URL to https://wichisbest.com.
4. Copy Project URL and publishable/anon key into config.js.
5. Redeploy the site.

DEPLOY
Upload the CONTENTS of this folder to the existing Netlify project wichisbest.
Do not create a second Netlify site.

CURRENT FILE LIMIT
The UI accepts files up to 20 MB each. With Supabase configured they upload to a private bucket.
The AI server request currently sends file metadata, not the file contents. The next production step is provider-specific document ingestion and text extraction.

FINANCIAL OUTCOME TRACKING
Every saved decision can later store:
- the system recommendation
- the user's actual choice
- the actual winner/result
- measurement date and period
- return/risk metrics and notes
This prevents hindsight bias and allows later calibration by category and time horizon.


Version 4.0.1 fix:
The expandable section now displays a detailed analysis for each option, not only provider summaries. Existing API keys remain unchanged in Netlify. Deploy this folder over the existing site.


## v4.0.2 fix
The model request can no longer leave the submit button stuck indefinitely. Provider calls time out independently and partial results are preserved. Frontend always releases the button in finally.
