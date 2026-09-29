# School finance workspace

The **Finances** dashboard tab records school income and expenses in NGN. Administrators (including Mrs Itai and Itai Oyaregba) and Mr Segun can use it. Existing dashboard roles are preserved; the workspace supports both administrator and teacher dashboards.

## Features

- Numbered transactions, dates, categories, payer/payee, payment method, references and notes.
- Optional item calculations and private PDF/image supporting documents (up to 10 MB).
- Monday–Sunday weeks, calendar months, January–December years and custom dates.
- School-event filters, monthly/category/event summaries, CSV exports and printable statements.
- Cash-basis profit/loss: receipts minus spending. This does not include unpaid invoices, unpaid fees, depreciation or accrual adjustments.
- Posted entries cannot be overwritten or deleted through the app. Corrections use a void reason and a replacement record. The original and audit history remain.
- Existing positive student fee payments are copied into the ledger once. Database triggers synchronize future payment inserts/updates/deletions. Removing a student payment voids its ledger record while retaining history. Deleting a pupil preserves their historical income in the ledger even when the old payment table cascades its deletion.
- Events linked to ledger entries cannot be deleted; their financial context is retained.

## Database activation

Apply `supabase/migrations/20260929000000_school_finance_ledger.sql` to the existing school database **before deploying the updated frontend**. The migration is transactional and expects the current `payments`, `fee_structures`, `students`, `profiles`, `user_roles`, `events`, `classes` and `terms` tables.

Confirm the target project matches `VITE_SUPABASE_URL` in the deployed frontend environment. This repository contains older Supabase project configuration and historical migrations, so do not blindly replay the entire migration directory.

The new migration adds:

- `finance_entries` and its append-only audit table.
- Private `finance_access` grants; the existing Mr Segun user ID receives access if present. Other teachers cannot grant themselves finance access by changing their profile flag. Existing administrators retain finance access.
- Finance permissions for existing student fee management.
- Report/void RPC functions and payment synchronization triggers.
- A private `finance-documents` storage bucket. Filed documents are retained.

Use the verified project's SQL editor to run this single migration, or an authenticated Supabase CLI connection to that same project. Never paste access tokens into source files. After activation, verify the three intended accounts can access finance and an ordinary teacher/parent cannot, then deploy the frontend through the existing GitHub Pages workflow.

Activated on 29 September 2026 in the verified production project `mcpajyzmdyvolpkwfmpq` (`itain-bell-school-website`). The single finance migration was applied successfully and recorded as applied in Supabase migration history. Do not run it again on that project.

Read-only live verification passed using `scripts/verify-finance-live.sql`: Mr Segun Adedunye, Mrs Itai Joy Onize and Itai Oyaregba John can access reports, other accounts without finance permission are denied, student payments reconcile, and the document bucket is private. All three named accounts currently have the administrator role; those existing roles were not changed.

The existing GitHub Pages workflow publishes the frontend when these changes are pushed to `main`. Confirm that workflow succeeds before treating the public dashboard as updated.

## Verification

```sh
npm test
npm run test:finance-db
npm run test:finance-ui
npm run build
```

Database checks use an isolated PostgreSQL engine with synthetic users. Browser checks use intercepted responses and synthetic records; they never submit school data. The UI check uses an installed Playwright Chromium browser or Microsoft Edge and writes previews under `.playwright-mcp/`. Its development fixture is excluded from the production build.
