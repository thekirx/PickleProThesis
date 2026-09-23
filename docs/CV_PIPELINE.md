# CV pipeline and result interpretation

## What runs today

`server/picklepro/` reads a video sequentially, samples frames at a requested rate, detects moving objects, tracks detections, and records bounding boxes for replay. Motion detection is the default and does **not** establish that an object is a person. It has no model confidence score. YOLO is optional, requires `server/requirements-yolo.txt` and local weights, and is never downloaded silently.

Manual calibration maps image pixels on the **court ground plane** to metres. A detection's bottom-center box point approximates its foot location. The pipeline selects one player by track ID or by a single detected player on the near/far half. Frames with ambiguous half selection are excluded. A court heatmap sums the time represented by each usable sampled frame; it is a whole-clip dwell-time map, not rally analysis.

The heatmap needs calibration, player selection, at least 10 tracked seconds, and at least 25% of analyzed time tracked. Without enough evidence the metric and overall result say `insufficient_data`. Zone occupancy is experimental and off by default. Rally segmentation and shot classification are always `not_computed` in this version.

## Calibrate a permitted fixed-camera video

Run from `Pickleball Performance Dashboard/server/`:

```sh
.venv/bin/python -m picklepro.cli landmarks
.venv/bin/python -m picklepro.cli extract-frame /path/to/match.mp4 --at 5 --out /path/to/frame.png
```

Identify at least four named **ground-plane** court landmarks visible in the extracted frame. Prefer more well-spread landmarks. Save a JSON file in this shape, using the frame's actual width and height and your measured pixel locations:

```json
{
  "image_width": 1920,
  "image_height": 1080,
  "points": [
    {"landmark": "near_left_baseline", "pixel": [320, 1000]},
    {"landmark": "near_right_baseline", "pixel": [1600, 1000]},
    {"landmark": "near_left_kitchen", "pixel": [560, 550]},
    {"landmark": "near_right_kitchen", "pixel": [1360, 550]}
  ]
}
```

These pixel values only illustrate the file format. Do not use them for footage whose landmarks differ. Net posts are above the ground and are not calibration landmarks. Camera movement, zoom, or a changed crop requires a new calibration. A calibration made at another resolution is rescaled only under the assumption of identical framing.

Then analyze:

```sh
.venv/bin/python -m picklepro.cli analyze /path/to/match.mp4 --calibration /path/to/calibration.json --court-half near --out /path/to/result.json
```

Use `--track-id N` instead of `--court-half near` when a player can be followed by a stable track ID. The CLI prints available IDs after analysis. `--max-seconds` deliberately limits coverage and is recorded in the result. Exit code 0 means `ok`, 3 means a valid `insufficient_data` result, 2 means invalid input, and 1 means an error.

## Read a result honestly

- `data_origin` is `measured` for pipeline output and `test_fixture` for the worker's canned flow test. A fixture result says nothing about the uploaded video.
- `coverage` records analyzed start/end, sample stride, decoded/analyzed frames, detection count, and the fraction of the reported video duration covered. Container duration and frame rate can themselves be approximate.
- Each `metrics` entry has a status and a validation level. `measured` means computed from observed frames; it does not mean scientifically validated. `synthetic_only` and `not_evaluated` must be presented as such.
- `player_positions` contain timestamped pixel boxes for replay. Box visibility depends on detections at that playback time; empty stretches have no boxes.
- `calibration.reprojection_rmse_m` measures fit to clicked landmarks, not real-world tracking accuracy. A poor fit is warned about but does not automatically suppress a heatmap.

The synthetic fixture previously produced roughly 3.2 cm median and 9.7 cm 90th-percentile foot-position error under ideal, known geometry. This is a development check, **not** an estimate of accuracy on real matches. Real-footage evaluation still needs permitted, labeled clips with varying lighting, occlusion, court views, players, and camera stability.

The homography cannot infer height above the court, airborne ball arcs, ball speed, shot type, skill, or play style. No coaching recommendation should be presented as evidence-based from the current metrics alone.
