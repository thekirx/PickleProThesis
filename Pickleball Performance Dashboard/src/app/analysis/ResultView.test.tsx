import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText(/Coaching is unavailable for sample results/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play audio coaching" })).toBeNull();
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

  it("plays and stops the same evidence-based advice shown on screen", () => {
    const result = structuredClone(testFixture);
    result.data_origin = "measured";
    result.provenance.detector = { name: "ultralytics-yolov8-person", confidence_is_model_score: true };
    const speak = vi.fn();
    const cancel = vi.fn();
    class Utterance {
      text: string;
      lang = "";
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    const originalSpeech = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
    const originalUtterance = Object.getOwnPropertyDescriptor(window, "SpeechSynthesisUtterance");
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak, cancel } });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Utterance });
    try {
      render(<ResultView result={parseAnalysisResult(result)} videoUrl={null} />);
      expect(screen.getByText(/Position-based practice ideas from this video/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Play audio coaching" }));
      expect(speak).toHaveBeenCalledOnce();
      const utterance = speak.mock.calls[0][0] as Utterance;
      expect(utterance.text).toContain("The selected player spent about");
      expect(utterance.text).toContain("Position estimates have not been validated");
      fireEvent.click(screen.getByRole("button", { name: "Stop audio coaching" }));
      expect(cancel).toHaveBeenCalled();
    } finally {
      cleanup();
      if (originalSpeech) Object.defineProperty(window, "speechSynthesis", originalSpeech);
      else Reflect.deleteProperty(window, "speechSynthesis");
      if (originalUtterance) Object.defineProperty(window, "SpeechSynthesisUtterance", originalUtterance);
      else Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
    }
  });
});
