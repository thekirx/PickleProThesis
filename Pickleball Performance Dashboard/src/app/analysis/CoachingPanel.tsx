import { useEffect, useMemo, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";
import type { AnalysisResultV1 } from "../../lib/analysis/contract";
import { buildCoachingReport, coachingSpeechText } from "../../lib/analysis/coaching";
import { BORDER, NEON, WHITE_DIM } from "../theme";
import { Card, WidgetHeader } from "../shell/primitives";

export function CoachingPanel({ result }: { result: AnalysisResultV1 }) {
  const report = useMemo(() => buildCoachingReport(result), [result]);
  const speechText = coachingSpeechText(report);
  const [playing, setPlaying] = useState(false);
  const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  useEffect(() => {
    setPlaying(false);
    return () => { if (speechAvailable) window.speechSynthesis.cancel(); };
  }, [speechText, speechAvailable]);

  function toggleAudio() {
    if (!speechAvailable || !speechText) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  return (
    <Card accent={report.available ? NEON : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <WidgetHeader title="Gameplay feedback" subtitle="Practice ideas based on measured player positions." />
        {report.available && (
          <button type="button" onClick={toggleAudio} disabled={!speechAvailable}
            aria-label={playing ? "Stop audio coaching" : "Play audio coaching"}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ color: "#071a3e", background: NEON }}>
            {playing ? <Square size={14} /> : <Play size={14} />}
            {playing ? "Stop audio" : "Play audio coaching"}
            <Volume2 size={14} />
          </button>
        )}
      </div>
      <p className="text-sm text-white">{report.introduction}</p>
      {report.available && (
        <ol className="mt-3 space-y-3">
          {report.items.map((item, index) => (
            <li key={`${index}-${item.observation}`} className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold text-white">{item.observation}</p>
              <p className="mt-1 text-sm text-white">Try: {item.practice}</p>
              <p className="mt-1 text-xs" style={{ color: WHITE_DIM }}>Evidence: {item.evidence}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs" style={{ color: WHITE_DIM }}>{report.limitation}</p>
      {report.available && !speechAvailable && <p className="mt-2 text-xs" style={{ color: WHITE_DIM }}>Audio coaching is unavailable in this browser.</p>}
    </Card>
  );
}
