import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";
import { getConfig } from "../lib/config";

// Values that only exist in the sample-data design preview.
const SAMPLE_MARKERS = ["ALEX GARCIA", "76.4%", "18W", "Pearson", "+12 wks", "DOMINANT STYLE", "coach@picklepro.app"];

const prodConfig = getConfig({ DEV: false });
const devConfig = getConfig({ DEV: true });

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

function expectNoSampleData() {
  const text = document.body.textContent ?? "";
  for (const marker of SAMPLE_MARKERS) expect(text).not.toContain(marker);
}

describe("application entry point", () => {
  it("without Supabase, production shows setup instructions and no fabricated numbers", async () => {
    render(<App cfg={prodConfig} sb={null} />);
    expect(await screen.findByText("Supabase is not configured")).toBeTruthy();
    expect(screen.queryByText(/Design preview/)).toBeNull();
    expectNoSampleData();
  });

  it("the old demo login no longer exists", async () => {
    render(<App cfg={prodConfig} sb={null} />);
    await screen.findByText("Supabase is not configured");
    expect(document.body.textContent).not.toContain("demo123");
    expect(screen.queryByText(/Demo account/i)).toBeNull();
  });

  it("production builds refuse the design-preview route", async () => {
    window.location.hash = "#/design-preview";
    render(<App cfg={prodConfig} sb={null} />);
    expect(await screen.findByText(/not available in this build/)).toBeTruthy();
    expectNoSampleData();
  });

  it("the design preview, when enabled, is visibly labelled as sample data", async () => {
    window.location.hash = "#/design-preview";
    render(<App cfg={devConfig} sb={null} />);
    expect(await screen.findByText(/DESIGN PREVIEW — sample data/, {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getAllByText("SAMPLE DATA").length).toBeGreaterThanOrEqual(4);
  });
});
