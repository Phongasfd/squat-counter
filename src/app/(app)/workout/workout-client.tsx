"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPoseLandmarker } from "@/lib/squat/pose";
import { SquatCounter, type Hint } from "@/lib/squat/counter";
import { formatDuration } from "@/lib/time";
import { saveWorkoutAction } from "../actions";

type Phase = "idle" | "loading" | "running" | "finished" | "error";
type Source = "camera" | "demo";
type SaveState = { status: "idle" | "saving" | "saved" } | { status: "error"; message: string };

const GOOD_HINT_MS = 1200;

function hintText(hints: Hint[] | null, lastGoodAt: number): { text: string; tone: "good" | "warn" | "info" } {
  if (hints === null) return { text: "Hãy bước vào khung hình", tone: "warn" };
  const legs = (kind: Hint["kind"]) =>
    hints.filter((h) => h.kind === kind).map((h) => ("leg" in h ? h.leg : null));
  const name = (l: (string | null)[]) => (l.length === 2 ? "cả hai chân" : l[0] === "left" ? "chân trái" : "chân phải");

  const missing = legs("not-detected");
  if (missing.length) return { text: `Không thấy ${name(missing)} — lùi xa để camera thấy toàn thân`, tone: "warn" };
  if (hints.some((h) => h.kind === "good") || Date.now() - lastGoodAt < GOOD_HINT_MS) return { text: "Tốt lắm! 💪", tone: "good" };
  const lower = legs("lower");
  if (lower.length) return { text: `Hạ thấp ${name(lower)} hơn nữa`, tone: "info" };
  const extend = legs("extend");
  if (extend.length) return { text: `Đứng thẳng ${name(extend)} hoàn toàn`, tone: "info" };
  return { text: "Squat xuống sâu, gối dưới 105°", tone: "info" };
}

export function WorkoutClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const counterRef = useRef(new SquatCounter());
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const lastGoodAtRef = useRef(0);
  const dingRef = useRef<HTMLAudioElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [source, setSource] = useState<Source>("camera");
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState(() => hintText([], 0));
  const [angles, setAngles] = useState<{ left: number; right: number } | null>(null);
  const [sound, setSound] = useState(true);
  const [bump, setBump] = useState(0);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const stopMedia = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  useEffect(() => {
    dingRef.current = new Audio("/sounds/ding.wav");
    return () => {
      stopMedia();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [stopMedia]);

  // Session timer.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const loop = useCallback(async () => {
    const { DrawingUtils, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const drawing = new DrawingUtils(ctx);
    let lastTime = -1;

    const tick = () => {
      const landmarker = landmarkerRef.current;
      if (landmarker && video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const result = landmarker.detectForVideo(video, performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pose = result.landmarks[0];

        if (!pose) {
          setHint(hintText(null, lastGoodAtRef.current));
          setAngles(null);
        } else {
          drawing.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, { color: "#fb923c", lineWidth: 3 });
          drawing.drawLandmarks(pose, { color: "#ffffff", fillColor: "#c2410c", radius: 3, lineWidth: 1 });

          // Angles come from the metric 3D world landmarks; the normalized ones are only for drawing.
          const frame = counterRef.current.update(result.worldLandmarks[0] ?? pose);
          if (frame.repCounted) {
            lastGoodAtRef.current = Date.now();
            setReps(frame.reps);
            setBump((b) => b + 1);
            if (soundRef.current && dingRef.current) {
              dingRef.current.currentTime = 0;
              void dingRef.current.play().catch(() => {});
            }
          }
          setHint(hintText(frame.hints, lastGoodAtRef.current));
          setAngles({ left: Math.round(frame.leftAngle), right: Math.round(frame.rightAngle) });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  async function start(src: Source) {
    setSource(src);
    setError(null);
    setPhase("loading");
    setSave({ status: "idle" });
    counterRef.current.reset();
    lastGoodAtRef.current = 0;
    setReps(0);
    setElapsed(0);
    setAngles(null);
    setHint(hintText([], 0));

    try {
      const video = videoRef.current!;
      if (src === "camera") {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ camera, hoặc trang không chạy qua HTTPS.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        video.srcObject = stream;
        video.loop = false;
      } else {
        video.src = "/demo/squat-demo.mp4";
        video.loop = true;
      }
      video.muted = true;
      const [landmarker] = await Promise.all([
        landmarkerRef.current ?? createPoseLandmarker(),
        video.play(),
      ]);
      landmarkerRef.current = landmarker;
      startedAtRef.current = new Date();
      setPhase("running");
      void loop();
    } catch (err) {
      stopMedia();
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Bạn chưa cho phép truy cập camera. Hãy bật quyền camera cho trang này rồi thử lại."
          : name === "NotFoundError"
            ? "Không tìm thấy camera trên thiết bị."
            : err instanceof Error
              ? err.message
              : "Không khởi động được. Hãy thử lại.",
      );
      setPhase("error");
    }
  }

  const canSave = source === "camera" && reps > 0;

  function finish() {
    const durationSec = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current.getTime()) / 1000))
      : elapsed;
    setElapsed(durationSec);
    stopMedia();
    setPhase("finished");
    if (canSave) void saveResult(durationSec); // auto-save; the button is only for retries
  }

  async function saveResult(durationSec = elapsed) {
    if (!startedAtRef.current) return;
    setSave({ status: "saving" });
    try {
      const res = await saveWorkoutAction({
        reps,
        durationSec,
        startedAt: startedAtRef.current.toISOString(),
      });
      setSave(res.ok ? { status: "saved" } : { status: "error", message: res.error });
    } catch {
      setSave({ status: "error", message: "Lỗi kết nối, hãy thử lại." });
    }
  }

  const running = phase === "running";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-hidden">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 size-full object-contain ${source === "camera" ? "-scale-x-100" : ""}`}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 size-full object-contain ${source === "camera" ? "-scale-x-100" : ""}`}
          />

          {running && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              <span className="size-2 animate-pulse rounded-full bg-red-500" />
              {source === "demo" ? "Video mẫu" : "Đang ghi nhận"}
            </div>
          )}

          {phase !== "running" && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center text-white">
              {phase === "loading" ? (
                <div>
                  <div className="mx-auto mb-3 size-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                  <p className="font-medium">Đang khởi động camera và mô hình AI…</p>
                </div>
              ) : phase === "finished" ? (
                <FinishedPanel
                  reps={reps}
                  elapsed={elapsed}
                  canSave={canSave}
                  isDemo={source === "demo"}
                  save={save}
                  onSave={() => saveResult()}
                  onRestart={() => start("camera")}
                />
              ) : (
                <div className="max-w-md">
                  <p className="mb-1 text-xl font-bold">Sẵn sàng squat?</p>
                  <p className="mb-5 text-sm text-white/80">
                    Đặt máy cách 2–3 m, đứng nghiêng ~45° để camera thấy rõ hông, gối và cổ chân. Mỗi lần gối gập dưới
                    105° rồi đứng thẳng lại được tính 1 rep.
                  </p>
                  {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>}
                  <div className="flex flex-wrap justify-center gap-2">
                    <button className="btn-primary h-12 px-6 text-base" onClick={() => start("camera")}>
                      Bật camera &amp; bắt đầu
                    </button>
                    <button className="btn h-12 border border-white/30 px-4 text-white hover:bg-white/10" onClick={() => start("demo")}>
                      Thử với video mẫu
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5 text-center">
          <p className="text-sm font-medium text-muted">Số rep</p>
          <p key={bump} className={`text-8xl font-extrabold tabular-nums tracking-tight ${bump ? "animate-[pop_300ms_ease-out]" : ""}`}>
            {reps}
          </p>
          <p className="text-sm text-muted">Thời gian {formatDuration(elapsed)}</p>
        </div>

        <div
          aria-live="polite"
          className={`card p-4 text-center font-semibold ${
            !running ? "text-muted" : hint.tone === "good" ? "bg-good-soft text-good" : hint.tone === "warn" ? "bg-danger-soft text-danger" : "text-ink"
          }`}
        >
          {running ? hint.text : "Chưa bắt đầu"}
        </div>

        <div className="card grid grid-cols-2 divide-x divide-line text-center">
          <AngleCell label="Gối trái" value={running ? angles?.left : undefined} />
          <AngleCell label="Gối phải" value={running ? angles?.right : undefined} />
        </div>

        <div className="flex gap-2">
          {running ? (
            <button className="btn-primary h-12 flex-1 text-base" onClick={finish}>
              Kết thúc buổi tập
            </button>
          ) : null}
          <button
            className="btn-secondary h-12"
            onClick={() => setSound((s) => !s)}
            aria-pressed={sound}
            title={sound ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            {sound ? "🔔 Âm thanh" : "🔕 Tắt tiếng"}
          </button>
        </div>
        {running && source === "demo" && <p className="text-center text-xs text-muted">Kết quả từ video mẫu sẽ không được lưu.</p>}
      </aside>
    </div>
  );
}

function AngleCell({ label, value }: { label: string; value?: number }) {
  return (
    <div className="p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value === undefined || value < 0 ? "—" : `${value}°`}</p>
    </div>
  );
}

function FinishedPanel(props: {
  reps: number;
  elapsed: number;
  canSave: boolean;
  isDemo: boolean;
  save: SaveState;
  onSave: () => void;
  onRestart: () => void;
}) {
  const { reps, elapsed, canSave, isDemo, save, onSave, onRestart } = props;
  return (
    <div className="max-w-sm">
      <p className="text-sm uppercase tracking-widest text-white/70">Kết thúc</p>
      <p className="my-1 text-6xl font-extrabold tabular-nums">{reps}</p>
      <p className="mb-5 text-white/80">rep trong {formatDuration(elapsed)}</p>

      {save.status === "saved" ? (
        <p className="mb-4 rounded-xl bg-green-500/20 px-3 py-2 text-sm text-green-100">Đã lưu kết quả! 🎉</p>
      ) : save.status === "error" ? (
        <p role="alert" className="mb-4 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-100">Không lưu được: {save.message}</p>
      ) : isDemo ? (
        <p className="mb-4 text-sm text-white/70">Đây là video mẫu nên kết quả không được lưu.</p>
      ) : reps === 0 ? (
        <p className="mb-4 text-sm text-white/70">Chưa có rep nào để lưu.</p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {canSave && save.status !== "saved" && save.status !== "idle" && (
          <button className="btn-primary h-11" onClick={onSave} disabled={save.status === "saving"}>
            {save.status === "saving" ? "Đang lưu…" : "Thử lưu lại"}
          </button>
        )}
        <button className="btn h-11 border border-white/30 text-white hover:bg-white/10" onClick={onRestart}>
          Tập tiếp
        </button>
        {save.status === "saved" && (
          <Link href="/leaderboard" className="btn h-11 border border-white/30 text-white hover:bg-white/10">
            Xem bảng xếp hạng
          </Link>
        )}
      </div>
    </div>
  );
}
