# DnD Adventuring Table

Vite + React + TypeScript + Tailwind scaffold for a DnD 5e web app. The first screen includes a character sheet, dice roller, and local story log so Phase 1 can be developed against a working UI.

## Start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add Supabase values when the project is ready:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor to create the tables, RLS policies, realtime chat publication, and `join_session_by_code` RPC used by the lobby.

If you already ran the previous Phase 2 schema and see a 500 from `/rest/v1/sessions`, run `supabase/phase2_rls_fix.sql` once in the SQL editor. It removes the recursive `sessions`/`characters` RLS path.

For Phase 3 rules support, run `supabase/phase3_rules_setup.sql` once if your database was created before the rules engine work. It adds session rules config columns and updates the join-code RPC.

Enable Email Auth in Supabase, then sign up or sign in from the app. Signed-in users can create a table, copy the generated join code, or join an existing table by code. The lobby creates a starter character row for each joined user so existing session RLS can see the table.

The story log now reads and writes `chat_messages`, subscribes to new session messages over Supabase Realtime, and includes an optional AI DM toggle.

The AI DM Edge Function lives at `supabase/functions/ai-dm/index.ts` and uses the Google Gemini API. It expects `GOOGLE_API_KEY`; you can set `GOOGLE_MODEL`, and it defaults to `gemini-2.5-flash`. Deploy it before turning on AI DM in the app.

```bash
supabase secrets set GOOGLE_API_KEY=your_google_api_key
supabase secrets set GOOGLE_MODEL=gemini-2.5-flash
supabase functions deploy ai-dm
```

## Rules Reference

The rules engine targets DnD 5e 2014 behavior using SRD 5.1 style formulas for core checks, saves, initiative, combat turns, HP, conditions, and death saves. This app uses rules references and formulas rather than copying long rule text.

This project may use material from the System Reference Document 5.1 under the Creative Commons Attribution 4.0 International License.
