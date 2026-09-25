import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import testFixture from "../../../contracts/fixtures/analysis_result.test_fixture.v1.json";
import insufficient from "../../../contracts/fixtures/analysis_result.insufficient.v1.json";
import { parseAnalysisResult } from "../../lib/analysis/contract";
import { ResultView } from "./ResultView";

afterEach(cleanup);

describe("ResultView", () => {
  it("labels test-fixture results so they cannot be mistaken for the player's data", () => {
    render(<ResultView result={parseAnalysisResult(testFixture)} videoUrl={null} />);
    expect(screen.getByText(/TEST DATA — NOT FROM YOUR VIDEO/)).toBeTruthy();
    expect(screen.getByText(/None\s+of the numbers below describe your video/)).toBeTruthy();
  });

  it("shows provenance, coverage and per-metric status", () => {
    const measured = { ...structuredClone(testFixture), data_origin: "measured" };
    render(<ResultView result={parseAnalysisResult(measured)} videoUrl={null} />);
    expect(screen.getByText("MEASURED FROM THIS VIDEO")).toBeTruthy();
    expect(screen.getByText(testFixture.provenance.pipeline_version)).toBeTruthy();
    expect(screen.getByText("Share of video analyzed")).toBeTruthy();
    expect(screen.getByText("not available")).toBeTruthy(); // motion detector: no confidence
    expect(screen.getAllByText("Accuracy not yet evaluated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NOT COMPUTED").length).toBe(2); // rallies and shots
    expect(screen.getByText("WHOLE-CLIP METRICS")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Court heatmap/ })).toBeTruthy();
  });

  it("explains insufficient data instead of showing a heatmap", () => {
    render(<ResultView result={parseAnalysisResult(insufficient)} videoUrl={null} />);
    expect(screen.getAllByText("INSUFFICIENT DATA").length).toBe(2); // overall status + heatmap metric
    expect(screen.getAllByText(/Court not calibrated/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("img", { name: /Court heatmap/ })).toBeNull();
  });
});
