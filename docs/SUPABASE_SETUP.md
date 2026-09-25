# Supabase test-project setup and verification

The hosted workflow was verified on September 24, 2026, with synthetic test material in the dedicated Free project `PickleProThesis-test` (`vyhpxmakeciwvknynshc`) in the new `Pickleball` organization, Singapore region (`ap-southeast-1`). The project is available in the [Supabase dashboard](https://supabase.com/dashboard/project/vyhpxmakeciwvknynshc). Use this project for further PicklePro tests; do not apply these migrations to an unrelated project.

## Hosted verification record

- Both migrations in `supabase/migrations/` were applied to the new project, and the local and remote migration histories matched. Linked database lint reported no schema errors.
- Two synthetic test accounts were used. In the browser, account A created a session, uploaded a synthetic H.264 clip through the resumable upload client to private Storage, saw the fixture worker complete a job, and recovered the result after a reload. The UI identified the fixture as **TEST DATA — NOT FROM YOUR VIDEO**.
- Account A could read its session, video, job, result, and private video object. Account B could read none of A's records or video and could not finalize A's upload. Twenty simultaneous finalize calls for A's video returned the same single job.
- The same uploaded clip was requeued and processed with the measured worker. It downloaded the private video, stored a measured heatmap and coverage, and the browser displayed **MEASURED FROM THIS VIDEO**. Private video playback loaded successfully.

These checks used synthetic footage and programmatically created confirmed test accounts. Real footage accuracy, the normal email confirmation flow, an interrupted and resumed upload, and invalid-file/error cases remain unverified. Security and performance advisors were not run because the installed Supabase CLI did not expose that command and the connected Supabase account cannot access this project. Review those advisors in the project's dashboard before broader use.

## Prepare the test project

1. Use the dedicated test project above, or create another disposable Supabase project and record its reference. Enable email/password sign-in. Set its site URL to the frontend origin you will use, such as `http://localhost:5173`, and allow any other development origin you actually use in Auth redirect URLs. The hosted email confirmation redirect has not yet been tested on this project.
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

The fixture worker stores a canned result without analyzing the uploaded file. For actual processing, stop it and start `.venv/bin/python -m picklepro.worker --mode measured`. The worker selects the near player by default. To map the court automatically, install `server/requirements-yolo.txt` and set `PICKLEPRO_COURT_WEIGHTS` in `server/.env` to a compatible local 14-keypoint model. See [CV_PIPELINE.md](CV_PIPELINE.md) for the model format and manual fallback. Results may legitimately say `insufficient_data`.

[Supabase migration deployment](https://supabase.com/docs/guides/deployment/database-migrations) · [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
