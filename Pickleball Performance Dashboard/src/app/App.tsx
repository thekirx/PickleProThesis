import { lazy, Suspense } from "react";
import { HashRouter, Route, Routes } from "react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { config as defaultConfig, type AppConfig } from "../lib/config";
import { supabase as defaultSupabase } from "../lib/supabase";
import { AuthScreen } from "./auth/AuthScreen";
import { useAuth } from "./auth/useAuth";
import { AppShell } from "./shell/AppShell";
import { Card, Notice, WidgetHeader } from "./shell/primitives";
import { BLUE_SKY, BORDER, ORANGE, WHITE_DIM, WHITE_SUB } from "./theme";

// Loaded only when their routes are visited, so sample data and dev tools are
// not part of the main application bundle.
const DesignPreview = lazy(() => import("./design-preview/DesignPreview"));
const LocalPrototype = lazy(() => import("./local/LocalPrototype"));
const SessionsPage = lazy(() => import("./sessions/SessionsPage"));
const SessionDetail = lazy(() => import("./sessions/SessionDetail"));

const Loading = () => <p className="p-8 text-sm" style={{ color: WHITE_SUB }}>Loading…</p>;

function DevLinks({ cfg }: { cfg: AppConfig }) {
  if (!cfg.designPreviewEnabled && !cfg.localPrototypeEnabled) return null;
  return (
    <>
      {cfg.localPrototypeEnabled && <a href="#/local-prototype" style={{ color: ORANGE }}>Local prototype</a>}
      {cfg.designPreviewEnabled && <a href="#/design-preview" style={{ color: ORANGE }}>Design preview (sample data)</a>}
    </>
  );
}

function SetupRequired({ cfg }: { cfg: AppConfig }) {
  return (
    <AppShell nav={<DevLinks cfg={cfg} />}>
      <Card accent={ORANGE}>
        <WidgetHeader title="Supabase is not configured" subtitle="Accounts, sessions and uploads need a Supabase project." accent={ORANGE} />
        <ol className="text-sm space-y-2 list-decimal pl-5" style={{ color: WHITE_DIM }}>
          <li>Copy <code>.env.example</code> to <code>.env.local</code> in the dashboard folder.</li>
          <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (public anon key only).</li>
          <li>Apply the migrations in <code>supabase/migrations</code> and restart <code>npm run dev</code>.</li>
        </ol>
        <p className="text-xs mt-4" style={{ color: WHITE_SUB }}>See docs/SUPABASE_SETUP.md. No sample results are shown in place of real ones.</p>
      </Card>
    </AppShell>
  );
}

function NotAvailable() {
  return (
    <AppShell>
      <Notice tone="warn">This page is not available in this build.</Notice>
    </AppShell>
  );
}

function SignedInApp({ sb, cfg }: { sb: SupabaseClient; cfg: AppConfig }) {
  const auth = useAuth(sb);
  if (auth.status === "loading") return <Loading />;
  if (auth.status === "signed_out") return <AuthScreen sb={sb} />;
  const user = auth.session.user;
  return (
    <AppShell
      nav={<><a href="#/" style={{ color: BLUE_SKY }}>Sessions</a><DevLinks cfg={cfg} /></>}
      right={
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: WHITE_DIM }}>{user.email}</span>
          <button type="button" onClick={() => void sb.auth.signOut()} className="px-3 py-1.5 rounded-lg"
            style={{ color: WHITE_DIM, border: `1px solid ${BORDER}` }}>Sign out</button>
        </div>
      }
    >
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<SessionsPage sb={sb} />} />
          <Route path="/sessions/:sessionId" element={<SessionDetail sb={sb} userId={user.id} />} />
          <Route path="*" element={<Notice tone="warn">Page not found.</Notice>} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App({ cfg = defaultConfig, sb = defaultSupabase }: { cfg?: AppConfig; sb?: SupabaseClient | null }) {
  return (
    <HashRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/design-preview" element={cfg.designPreviewEnabled ? <DesignPreview /> : <NotAvailable />} />
          <Route
            path="/local-prototype"
            element={cfg.localPrototypeEnabled
              ? <AppShell nav={<><a href="#/" style={{ color: BLUE_SKY }}>Home</a><DevLinks cfg={cfg} /></>}><LocalPrototype /></AppShell>
              : <NotAvailable />}
          />
          <Route path="/*" element={sb ? <SignedInApp sb={sb} cfg={cfg} /> : <SetupRequired cfg={cfg} />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
