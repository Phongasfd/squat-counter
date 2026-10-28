// Loads the MediaPipe pose landmarker in the browser. Files are self-hosted under
// /mediapipe (see scripts/setup-mediapipe.mjs) with a CDN fallback.
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const LOCAL_WASM = "/mediapipe/wasm";
const CDN_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const LOCAL_MODEL = "/mediapipe/models/pose_landmarker_lite.task";
const CDN_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

async function reachable(url: string) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");

  const localOk = await reachable(LOCAL_MODEL);
  const fileset = await FilesetResolver.forVisionTasks(localOk ? LOCAL_WASM : CDN_WASM);
  const modelAssetPath = localOk ? LOCAL_MODEL : CDN_MODEL;

  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      // Same confidences as the original Python script.
      minPoseDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  try {
    return await create("GPU");
  } catch {
    return await create("CPU");
  }
}
