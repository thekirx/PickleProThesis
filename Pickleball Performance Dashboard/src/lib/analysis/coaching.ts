import type { AnalysisResultV1, HeatmapValue } from "./contract";

export type CoachingItem = { observation: string; practice: string; evidence: string };
export type CoachingReport = {
  available: boolean;
  introduction: string;
  items: CoachingItem[];
  limitation: string;
};

const COURT_WIDTH_M = 6.096;
const COURT_LENGTH_M = 13.4112;
const NET_Y_M = COURT_LENGTH_M / 2;

function summarizePositions(value: HeatmapValue, selectedHalf: "near" | "far" | null) {
  let near = 0;
  let far = 0;
  for (let row = 0; row < value.dwell_seconds.length; row++) {
    const y = (value.y_edges_m[row] + value.y_edges_m[row + 1]) / 2;
    for (let col = 0; col < value.dwell_seconds[row].length; col++) {
      const x = (value.x_edges_m[col] + value.x_edges_m[col + 1]) / 2;
      const seconds = value.dwell_seconds[row][col];
      if (x < 0 || x > COURT_WIDTH_M || y < 0 || y > COURT_LENGTH_M) continue;
      if (y < NET_Y_M) near += seconds;
      else far += seconds;
    }
  }
  const half = selectedHalf ?? (near >= far ? "near" : "far");
  const zones = { backcourt: 0, transition: 0, kitchenSide: 0, left: 0, right: 0 };
  for (let row = 0; row < value.dwell_seconds.length; row++) {
    const y = (value.y_edges_m[row] + value.y_edges_m[row + 1]) / 2;
    for (let col = 0; col < value.dwell_seconds[row].length; col++) {
      const x = (value.x_edges_m[col] + value.x_edges_m[col + 1]) / 2;
      const seconds = value.dwell_seconds[row][col];
      if (x < 0 || x > COURT_WIDTH_M || y < 0 || y > COURT_LENGTH_M ||
          (half === "near" ? y >= NET_Y_M : y < NET_Y_M)) continue;
      const fromBaseline = half === "near" ? y : COURT_LENGTH_M - y;
      if (fromBaseline < 2.4) zones.backcourt += seconds;
      else if (fromBaseline < 4.57) zones.transition += seconds;
      else zones.kitchenSide += seconds;
      if (x < COURT_WIDTH_M / 2) zones.left += seconds;
      else zones.right += seconds;
    }
  }
  return { zones, total: zones.backcourt + zones.transition + zones.kitchenSide };
}

export function buildCoachingReport(result: AnalysisResultV1): CoachingReport {
  const limitation = "Position estimates have not been validated on real matches. The clip includes time between rallies, and the system cannot judge shot quality, technique, or point outcomes yet.";
  const unavailable = (introduction: string): CoachingReport => ({
    available: false, introduction, items: [], limitation,
  });
  if (result.data_origin !== "measured") return unavailable("Coaching is unavailable for sample results. Analyze a real video first.");
  if (result.metrics.court_heatmap.status !== "measured" || !result.metrics.court_heatmap.value) {
    return unavailable("Coaching needs a measured court heatmap and enough tracked player time. Check the analysis warnings and camera view.");
  }
  if (!result.provenance.detector.confidence_is_model_score || !result.provenance.detector.name.includes("person")) {
    return unavailable("Coaching needs a player detection model. Motion detection alone cannot reliably identify a person.");
  }
  if (result.calibration?.quality !== "good") {
    return unavailable("Coaching needs a reliable court calibration. Review the court lines or use a clearer fixed-camera recording.");
  }
  const selection = result.player_selection;
  if (!selection || selection.tracked_fraction < 0.5 ||
      selection.ambiguous_frames > result.coverage.frames_analyzed * 0.2) {
    return unavailable("Coaching needs one player tracked clearly through most of the analyzed clip. In doubles, choose a specific player track and re-run analysis.");
  }
  const value = result.metrics.court_heatmap.value;
  const selectedHalf = selection.method === "court_half" ? selection.court_half ?? null : null;
  const { zones, total } = summarizePositions(value, selectedHalf);
  if (total < 10 || total < value.tracked_time_s * 0.5) {
    return unavailable("Coaching needs at least ten seconds of the selected player clearly mapped inside the court.");
  }

  const items: CoachingItem[] = [];
  const area = (["backcourt", "transition", "kitchenSide"] as const).reduce((best, zone) => zones[zone] > zones[best] ? zone : best);
  const share = Math.round(100 * zones[area] / total);
  const label = area === "kitchenSide" ? "near the kitchen" : area === "transition" ? "in the transition area" : "in the backcourt";
  const practice = area === "backcourt"
    ? "Review whether you had safe opportunities to move forward after a return. Practice a controlled approach and split step when appropriate."
    : area === "transition"
      ? "Review how you stopped and recovered while moving forward. Practice split steps and soft resets in the transition area."
      : "Review your ready position and recovery near the kitchen. Practice balanced volleys and resets from that area.";
  items.push({
    observation: `The selected player spent about ${share}% of mapped court time ${label}.`,
    practice,
    evidence: `${total.toFixed(1)} seconds of selected-player positions were mapped inside the court. This includes breaks between points.`,
  });

  const sideShare = Math.max(zones.left, zones.right) / total;
  if (sideShare >= 0.7) {
    const side = zones.left > zones.right ? "left" : "right";
    items.push({
      observation: `About ${Math.round(sideShare * 100)}% of mapped court time was on the ${side} side.`,
      practice: "Check whether this matches your assigned side or a deliberate tactic. If not, practice recovering toward your intended court position after each exchange.",
      evidence: "This compares the selected player's left and right court positions across the whole clip.",
    });
  }
  return {
    available: true,
    introduction: "Position-based practice ideas from this video",
    items,
    limitation,
  };
}

export function coachingSpeechText(report: CoachingReport): string {
  if (!report.available) return "";
  return [report.introduction, ...report.items.flatMap((item) => [item.observation, `Try: ${item.practice}`, `Evidence: ${item.evidence}`]), report.limitation].join(" ");
}
