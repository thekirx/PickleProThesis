import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoOverlayPlayer } from "./VideoOverlayPlayer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("VideoOverlayPlayer", () => {
  it("draws a saved detection at the matching playback timestamp", () => {
    let drawFrame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      drawFrame = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const strokeRect = vi.fn();
    const ctx = {
      clearRect: vi.fn(), strokeRect, fillRect: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 35 })),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    const { container } = render(
      <VideoOverlayPlayer src="/demo.mp4" selectedTrackId={7}
        positions={[{ time_seconds: 6, players: [{ track_id: 7, bbox: [100, 80, 200, 300], confidence: null }] }]} />,
    );
    const video = container.querySelector("video")!;
    Object.defineProperties(video, {
      clientWidth: { value: 480 }, clientHeight: { value: 270 },
      videoWidth: { value: 960 }, videoHeight: { value: 540 },
      currentTime: { value: 6 },
    });

    act(() => drawFrame?.(0));
    expect(strokeRect).toHaveBeenCalledWith(50, 40, 50, 110);
  });
});
