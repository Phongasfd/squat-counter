// Squat rep counting logic, ported from the original Python script (legacy/MAIN.py).
// Pure TypeScript with no dependencies so it runs in the browser and in unit tests.

export type Landmark = { x: number; y: number; z: number; visibility?: number };

/** Minimum landmark visibility for a joint to count as detected (same as MAIN.py). */
export const MIN_VISIBILITY = 0.8;

/** MediaPipe pose landmark indices: hip, knee, ankle. */
export const LEFT_LEG = [23, 25, 27] as const;
export const RIGHT_LEG = [24, 26, 28] as const;

/** Knee angle below this counts as squatting (same as MAIN.py). */
export const SQUAT_MAX_ANGLE = 105;
/**
 * Knee angle at or above this counts as standing. MAIN.py used 150°, but measured on
 * MediaPipe world landmarks a standing person reads ~148–160°, so 145° leaves margin
 * while the 105–145° band still rejects half squats.
 */
export const UPRIGHT_MIN_ANGLE = 145;

export const LegState = {
  NotDetected: 0,
  Squat: 1, // knee angle < SQUAT_MAX_ANGLE
  Transition: 2, // in between
  Upright: 3, // >= UPRIGHT_MIN_ANGLE
} as const;
export type LegState = (typeof LegState)[keyof typeof LegState];

/** Body state is the product of both leg states: 1 = squatting, 9 = upright. */
const BODY_SQUAT = LegState.Squat * LegState.Squat;
const BODY_UPRIGHT = LegState.Upright * LegState.Upright;

/**
 * Angle in degrees at `b` formed by `a` and `c`.
 * Returns -1 when any of the three points is below the visibility threshold.
 */
export function findAngle(a: Landmark, b: Landmark, c: Landmark, minVis = MIN_VISIBILITY): number {
  const visible = (p: Landmark) => (p.visibility ?? 1) > minVis;
  if (!visible(a) || !visible(b) || !visible(c)) return -1;

  const ba = [a.x - b.x, a.y - b.y, a.z - b.z];
  const bc = [c.x - b.x, c.y - b.y, c.z - b.z];
  const dot = ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2];
  const norm = Math.hypot(...ba) * Math.hypot(...bc);
  if (norm === 0) return -1;

  // Clamp to guard against floating point drift outside [-1, 1].
  const cos = Math.min(1, Math.max(-1, dot / norm));
  const angle = (Math.acos(cos) * 180) / Math.PI;
  return angle > 180 ? 360 - angle : angle;
}

export function legState(angle: number): LegState {
  if (angle < 0) return LegState.NotDetected;
  if (angle < SQUAT_MAX_ANGLE) return LegState.Squat;
  if (angle < UPRIGHT_MIN_ANGLE) return LegState.Transition;
  return LegState.Upright;
}

export type Leg = "left" | "right";
export type Hint =
  | { kind: "not-detected"; leg: Leg }
  | { kind: "extend"; leg: Leg } // stand up fully
  | { kind: "lower"; leg: Leg } // squat deeper
  | { kind: "good" }; // a rep was just counted

export type FrameResult = {
  reps: number;
  repCounted: boolean;
  leftAngle: number;
  rightAngle: number;
  hints: Hint[];
};

export class SquatCounter {
  reps = 0;
  /** Last stable body state (1 or 9). Starts upright, like MAIN.py. */
  private lastState: number = BODY_UPRIGHT;

  reset() {
    this.reps = 0;
    this.lastState = BODY_UPRIGHT;
  }

  /**
   * Feed one frame of pose landmarks (33 points, MediaPipe order). Pass the
   * *world* landmarks (metric 3D): normalized image coordinates scale x and y
   * differently, which distorts the knee angle on non-square video.
   */
  update(landmarks: Landmark[]): FrameResult {
    const rightAngle = findAngle(landmarks[RIGHT_LEG[0]], landmarks[RIGHT_LEG[1]], landmarks[RIGHT_LEG[2]]);
    const leftAngle = findAngle(landmarks[LEFT_LEG[0]], landmarks[LEFT_LEG[1]], landmarks[LEFT_LEG[2]]);
    const rState = legState(rightAngle);
    const lState = legState(leftAngle);
    const state = rState * lState;

    const hints: Hint[] = [];
    let repCounted = false;

    if (state === 0) {
      // One or both legs not detected.
      if (rState === LegState.NotDetected) hints.push({ kind: "not-detected", leg: "right" });
      if (lState === LegState.NotDetected) hints.push({ kind: "not-detected", leg: "left" });
    } else if (state % 2 === 0 || rState !== lState) {
      // One or both legs still transitioning.
      const wasSquatting = this.lastState === BODY_SQUAT;
      for (const [leg, s] of [["left", lState], ["right", rState]] as const) {
        if (wasSquatting && (s === LegState.Transition || s === LegState.Squat)) {
          hints.push({ kind: "extend", leg });
        } else if (!wasSquatting && (s === LegState.Transition || s === LegState.Upright)) {
          hints.push({ kind: "lower", leg });
        }
      }
    } else if ((state === BODY_SQUAT || state === BODY_UPRIGHT) && this.lastState !== state) {
      // Both legs agree on a stable state; a rep counts on reaching the bottom.
      this.lastState = state;
      if (state === BODY_SQUAT) {
        this.reps += 1;
        repCounted = true;
        hints.push({ kind: "good" });
      }
    }

    return { reps: this.reps, repCounted, leftAngle, rightAngle, hints };
  }
}
