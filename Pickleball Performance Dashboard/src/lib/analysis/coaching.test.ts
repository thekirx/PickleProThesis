import { describe, expect, it } from "vitest";
import fixture from "../../../contracts/fixtures/analysis_result.test_fixture.v1.json";
import { parseAnalysisResult } from "./contract";
import { buildCoachingReport, coachingSpeechText } from "./coaching";

function measured() {
  const result = structuredClone(fixture);
  result.data_origin = "measured";
  result.provenance.detector = { name: "ultralytics-yolov8-person", confidence_is_model_score: true };
  return parseAnalysisResult(result);
}

describe("gameplay feedback", () => {
  it("does not turn sample or motion detections into personalized coaching", () => {
    const sample = buildCoachingReport(parseAnalysisResult(fixture));
    expect(sample.available).toBe(false);
    expect(coachingSpeechText(sample)).toBe("");
    const motion = structuredClone(fixture);
    motion.data_origin = "measured";
    expect(buildCoachingReport(parseAnalysisResult(motion)).available).toBe(false);
  });

  it("grounds each practice idea in measured player positions", () => {
    const report = buildCoachingReport(measured());
    expect(report.available).toBe(true);
    expect(report.items.length).toBeGreaterThan(0);
    expect(report.items[0].observation).toMatch(/mapped court time/);
    expect(report.items[0].evidence).toMatch(/seconds/);
    expect(coachingSpeechText(report)).toContain(report.items[0].practice);
    expect(coachingSpeechText(report)).toContain(report.items[0].evidence);
    expect(report.limitation).toMatch(/cannot judge shot quality/);
  });

  it("withholds coaching when court calibration is poor", () => {
    const result = measured();
    if (result.calibration) result.calibration.quality = "poor";
    expect(buildCoachingReport(result).available).toBe(false);
  });
});
