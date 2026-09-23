# Supabase test-project setup and verification

The hosted workflow has **not yet been verified**. Use a dedicated disposable test project. The existing connected `HelloFinance` project is unrelated to PicklePro and must not receive these migrations.

## Prepare the test project

1. Create a separate Supabase test project and record its project reference. Enable email/password sign-in. Set its site URL to the frontend origin you will use, such as `http://localhost:5173`.
2. From the repository root, inspect your installed CLI (`supabase --version`, `supabase link --help`, `supabase db push --help`), then sign in and link **the test project** with `supabase login` and `supabase link --project-ref <test-project-ref>`. Verify the selected reference before applying migrations.
3. Preview pending migrations with `supabase db push --dry-run`, then apply them with `supabase db push`. The two files in `supabase/migrations/` create sessions, private video storage, jobs, results, policies, and worker functions. Do not use a remote database reset: it drops data.
4. Check that the Data API is enabled for the project and that the migrated tables and functions are reachable with the intended roles. New Supabase projects no longer grant Data API access to new `public` tables automatically; these migrations include explicit grants for the required roles. RLS then limits which rows each signed-in user can access. See [the Supabase Data API change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
5. Confirm that the private `session-videos` bucket exists and review the project's global upload size limit. The bucket allows 500 MiB, while the example frontend limit is 50 MB; the project-wide setting may be lower than the bucket setting.

Only public project URL and public/anon key belong in `Pickleball Performance Dashboard/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://<test-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-key>
VITE_MAX_UPLOAD_MB=50
```

Put the project URL and **service-role key** in `Pickleball Performance Dashboard/server/.env`, which is ignored by Git and used only by the worker:

```dotenv
SUPABASE_URL=https://<test-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-secret>
WORKER_RESULT_MODE=test_fixture
```

Never place the service-role key in a `VITE_` setting or browser code. The worker bypasses row-level security and must run on a trusted machine.

## Verify the full flow

From `Pickleball Performance Dashboard/`, run `npm ci && npm run dev`. In another terminal, from `Pickleball Performance Dashboard/server/`, install the Python requirements and start one fixture worker:

```sh
.venv/bin/python -m picklepro.worker --mode test_fixture
```

1. Sign up or sign in as test account A. Create a session and select a small video. Confirm progress, upload completion, a queued/processing job, and a completed result. The result must visibly say **TEST DATA — NOT FROM YOUR VIDEO**.
2. Reload the page. Confirm the session, job, and result persist. Check video playback through its private signed URL.
3. Create test account B. Confirm B cannot list or open A's session, video, job, result, or storage object. Repeat with B's own session. Test a second upload attempt or simultaneous finalize calls and confirm only one job is created for one video.
4. Interrupt a TUS upload, reselect the same file, and confirm it resumes. Test an invalid file and a missing upload before finalize. Check the job's error message and retry behavior for an unreadable video in measured mode.
5. Review Supabase security and performance advisors after migration, and record any findings. The local PostgreSQL policy harness can be rerun with `bash supabase/tests/run_local_rls_tests.sh`; it does not replace these hosted checks.

The fixture worker stores a canned result without analyzing the uploaded file. For actual processing, stop it and start `.venv/bin/python -m picklepro.worker --mode measured`; provide calibration and player selection in the UI before upload or when requesting reanalysis. Results may legitimately say `insufficient_data`.

[Supabase migration deployment](https://supabase.com/docs/guides/deployment/database-migrations) · [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
