import { test } from "node:test";
import assert from "node:assert/strict";
import { findAngle, legState, LegState, SquatCounter, type Landmark } from "./counter.ts";

/** Builds a 33-point pose where both knees bend to `kneeAngle` degrees. */
function pose(kneeAngle: number, visibility = 1): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility }));
  const rad = (kneeAngle * Math.PI) / 180;
  for (const [hip, knee, ankle, x] of [[23, 25, 27, 0.4], [24, 26, 28, 0.6]] as const) {
    lm[knee] = { x, y: 0.6, z: 0, visibility };
    lm[hip] = { x, y: 0.4, z: 0, visibility }; // straight above the knee
    lm[ankle] = { x: x + 0.2 * Math.sin(rad), y: 0.6 - 0.2 * Math.cos(rad), z: 0, visibility };
  }
  return lm;
}

test("findAngle measures the knee angle", () => {
  const lm = pose(90);
  assert.ok(Math.abs(findAngle(lm[23], lm[25], lm[27]) - 90) < 1e-6);
  const straight = pose(180);
  assert.ok(Math.abs(findAngle(straight[23], straight[25], straight[27]) - 180) < 1e-6);
});

test("findAngle returns -1 for low visibility", () => {
  const lm = pose(90, 0.5);
  assert.equal(findAngle(lm[23], lm[25], lm[27]), -1);
});

test("legState thresholds", () => {
  assert.equal(legState(-1), LegState.NotDetected);
  assert.equal(legState(104.9), LegState.Squat);
  assert.equal(legState(105), LegState.Transition);
  assert.equal(legState(144.9), LegState.Transition);
  assert.equal(legState(145), LegState.Upright);
});

test("counts every rep of the demo video (world-landmark knee angles)", () => {
  // Left/right knee angles sampled every 0.2s from public/demo/squat-demo.mp4,
  // which contains 4 squats. Standing peaks are only ~150–158°.
  const samples = [
    [154, 153], [157, 151], [154, 150], [154, 148], [154, 150], [149, 143], [133, 132], [99, 91], [65, 62], [43, 46],
    [48, 46], [70, 60], [95, 86], [115, 109], [152, 149], [158, 156], [158, 157], [156, 156], [151, 147], [129, 122],
    [80, 77], [55, 48], [43, 39], [43, 40], [67, 64], [99, 90], [131, 122], [146, 141], [151, 149], [158, 157],
    [155, 156], [136, 132], [115, 117], [63, 65], [42, 44], [36, 39], [55, 45], [73, 70], [106, 105], [144, 136],
    [154, 154], [152, 154], [153, 157], [157, 156], [151, 150], [158, 155], [161, 159], [158, 157], [157, 152],
    [149, 140], [159, 151], [152, 155], [152, 155], [147, 149], [148, 155], [153, 151], [150, 150], [150, 146],
    [158, 150], [156, 155], [152, 153], [144, 143], [148, 153], [150, 156], [152, 154], [133, 132], [70, 67],
    [49, 52], [34, 31], [39, 36], [64, 59], [98, 90], [125, 120],
  ];
  const c = new SquatCounter();
  for (const [l, r] of samples) {
    const lm = pose(180);
    const left = pose(l);
    const right = pose(r);
    for (const i of [23, 25, 27]) lm[i] = left[i];
    for (const i of [24, 26, 28]) lm[i] = right[i];
    c.update(lm);
  }
  assert.equal(c.reps, 4);
});

test("counts one rep per down-up cycle", () => {
  const c = new SquatCounter();
  const cycle = [175, 130, 90, 80, 90, 130, 175];
  for (let i = 0; i < 3; i++) for (const a of cycle) c.update(pose(a));
  assert.equal(c.reps, 3);
});

test("does not count when staying down or half squatting", () => {
  const c = new SquatCounter();
  for (const a of [175, 90, 85, 90, 85]) c.update(pose(a)); // one rep, then bouncing at the bottom
  assert.equal(c.reps, 1);
  for (const a of [175, 130, 120, 130, 175]) c.update(pose(a)); // never below 105°
  assert.equal(c.reps, 1);
});

test("hints guide the user", () => {
  const c = new SquatCounter();
  assert.deepEqual(c.update(pose(130)).hints, [{ kind: "lower", leg: "left" }, { kind: "lower", leg: "right" }]);
  const down = c.update(pose(90));
  assert.equal(down.repCounted, true);
  assert.deepEqual(down.hints, [{ kind: "good" }]);
  assert.deepEqual(c.update(pose(130)).hints, [{ kind: "extend", leg: "left" }, { kind: "extend", leg: "right" }]);
  assert.equal(c.update(pose(90, 0)).hints.length, 2); // both legs not detected
});
