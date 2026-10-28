// Self-hosts the MediaPipe runtime so the app works on networks that block CDNs:
//   - copies the WASM files from node_modules into public/mediapipe/wasm
//   - downloads the pose landmarker model into public/mediapipe/models (once)
// Runs automatically on `npm install` (postinstall).
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const wasmSrc = path.join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const wasmDest = path.join(root, "public/mediapipe/wasm");
const modelDir = path.join(root, "public/mediapipe/models");
const modelFile = path.join(modelDir, "pose_landmarker_lite.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

async function exists(p) {
  try {
    return (await stat(p)).size > 0;
  } catch {
    return false;
  }
}

await mkdir(wasmDest, { recursive: true });
await cp(wasmSrc, wasmDest, { recursive: true });
console.log("[mediapipe] WASM copied to public/mediapipe/wasm");

if (await exists(modelFile)) {
  console.log("[mediapipe] Model already present");
} else {
  await mkdir(modelDir, { recursive: true });
  try {
    const res = await fetch(modelUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelFile, Buffer.from(await res.arrayBuffer()));
    console.log("[mediapipe] Model downloaded to public/mediapipe/models");
  } catch (err) {
    // Don't fail the install; the app falls back to loading the model from the CDN.
    console.warn(`[mediapipe] Could not download model (${err.message}). The app will load it from the CDN.`);
  }
}
