// main.js — Sky Courier: Coral Run. Wires the flight model, terrain,
// missions, camera, instruments and audio into one playable sortie:
// thread the rings, drop the mail, land home before the fuel runs dry.
// A ?shot= mode renders one deterministic frame for screenshots.

import { createAircraftState, stepFlightModel } from './flight-model.js';
import { terrainHeight, buildCloudField } from './terrain.js';
import { createPilotInput, attachPilotControls, clearOneShotKeys } from './input-controls.js';
import { createChaseCamera, updateChaseCamera, toggleCameraView, VIEW_MODES } from './chase-camera.js';
import { drawSkyAndSea, drawTerrain, drawRunway, drawRings, drawVillageAndLighthouse, drawFallingParcel } from './render-scene.js';
import { drawChaseAircraft, drawCockpitNose } from './aircraft.js';
import { drawFlightHud, formatTime } from './hud-instruments.js';
import { createMissionState, updateMissions, missionSummary, MISSION_STAGES } from './missions.js';
import { createEngineAudio } from './engine-audio.js';

const canvas = document.getElementById('sky-courier-canvas');
const ctx = canvas.getContext('2d');
const view = { width: canvas.width, height: canvas.height };

const START = { x: -2600, y: -1400, alt: 150, heading: 0, speed: 46, throttle: 0.7 };

let plane = createAircraftState(START);
let mission = createMissionState();
let camera = createChaseCamera();
let clouds = buildCloudField(20261126, 42);
let audio = createEngineAudio();
let gameState = 'title'; // title | flying | paused | done
let simTime = 0;

const input = createPilotInput();
const readInput = attachPilotControls(canvas, input);

function resetSortie() {
  plane = createAircraftState(START);
  mission = createMissionState();
  camera = createChaseCamera();
  camera.x = plane.x - 40; camera.y = plane.y; camera.alt = plane.alt + 9;
  camera.heading = plane.heading;
  simTime = 0;
  gameState = 'flying';
}

function stepGame(dt) {
  readInput();
  if (input.cameraPressed) toggleCameraView(camera);
  if (input.mutePressed) audio.toggleMute();
  if (input.pausePressed && gameState === 'flying') gameState = 'paused';
  else if (input.pausePressed && gameState === 'paused') gameState = 'flying';
  if (input.restartPressed) resetSortie();
  if (gameState === 'title' && (input.dropPressed || input.throttleDelta !== 0)) gameState = 'flying';

  if (gameState === 'flying') {
    simTime += dt;
    stepFlightModel(plane, input, dt, terrainHeight);
    updateMissions(mission, plane, input, dt, audio);
    updateChaseCamera(camera, plane, dt);
    for (const cloud of clouds) {
      cloud.x += cloud.drift * dt;
      if (cloud.x > 4800) cloud.x = -4800;
    }
    if (mission.finished) gameState = 'done';
  }
  audio.update(plane, gameState === 'flying');
  clearOneShotKeys(input);
}

function renderGame() {
  drawSkyAndSea(ctx, view, camera, clouds, simTime);
  drawTerrain(ctx, view, camera);
  drawRunway(ctx, view, camera);
  drawVillageAndLighthouse(ctx, view, camera);
  drawRings(ctx, view, camera, mission, simTime);
  drawFallingParcel(ctx, view, camera, mission);
  if (camera.mode === VIEW_MODES.COCKPIT) drawCockpitNose(ctx, view, plane);
  else drawChaseAircraft(ctx, view, plane);
  drawFlightHud(ctx, view, plane, mission, camera.mode);
  if (gameState === 'title') drawTitleScreen();
  if (gameState === 'paused') drawCentreNote('PAUSED — P to resume');
  if (gameState === 'done') drawResultsScreen();
}

function drawTitleScreen() {
  ctx.fillStyle = 'rgba(11,34,51,0.55)';
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd873';
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.fillText('SKY COURIER', view.width / 2, 240);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('C O R A L   R U N', view.width / 2, 292);
  ctx.font = '400 20px system-ui, sans-serif';
  ctx.fillText('Thread the gold rings, drop the mail on the village, land home.', view.width / 2, 348);
  ctx.fillText('Arrows or mouse steer · Shift/Ctrl throttle · C camera · Space drop', view.width / 2, 384);
  ctx.fillStyle = '#ffd873';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('Press Shift to take off', view.width / 2, 448);
  ctx.textAlign = 'left';
}

function drawCentreNote(text) {
  ctx.fillStyle = 'rgba(11,34,51,0.6)';
  ctx.fillRect(0, view.height / 2 - 34, view.width, 68);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, view.width / 2, view.height / 2 + 10);
  ctx.textAlign = 'left';
}

function drawResultsScreen() {
  const sum = missionSummary(mission, plane);
  ctx.fillStyle = 'rgba(11,34,51,0.72)';
  ctx.fillRect(view.width / 2 - 300, 150, 600, 330);
  ctx.strokeStyle = '#ffd873';
  ctx.lineWidth = 3;
  ctx.strokeRect(view.width / 2 - 300, 150, 600, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd873';
  ctx.font = '800 36px system-ui, sans-serif';
  ctx.fillText(plane.crashed ? 'SORTIE LOST' : 'MAIL DELIVERED', view.width / 2, 212);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '400 21px system-ui, sans-serif';
  const lines = [
    `Score ${sum.score}`,
    `Rings flown ${sum.ringsFlown}/5 · Parcel ${sum.parcelHit ? 'bullseye' : 'dropped'}`,
    `Landing ${sum.landedClean ? 'clean' : '—'} · Fuel left ${sum.fuelLeft}% · Damage ${sum.damage}%`,
    `Time ${formatTime(sum.time)}`,
    'Press R to fly again',
  ];
  lines.forEach((line, i) => ctx.fillText(line, view.width / 2, 272 + i * 40));
  ctx.textAlign = 'left';
}

// --- Deterministic screenshot mode ---------------------------------------
// ?shot=cover|cockpit|landing|drop renders one composed frame with a fixed
// seed and fixed simulation steps, so the maker's screenshots are real
// renders of this code and never change between captures.
function setupShotScene(name) {
  clouds = buildCloudField(777, 42);
  simTime = 12.5;
  gameState = 'flying';
  if (name === 'cover') {
    plane = createAircraftState({ x: -1900, y: -1400, alt: 150, heading: 0, speed: 46, throttle: 0.7 });
    mission = createMissionState();
    camera = createChaseCamera();
    camera.mode = VIEW_MODES.CHASE;
  } else if (name === 'cockpit') {
    plane = createAircraftState({ x: 150, y: 150, alt: 215, heading: Math.atan2(750, 1350), speed: 52, throttle: 0.75 });
    plane.pitch = 0.05; plane.roll = 0.18;
    mission = createMissionState();
    mission.rings[0].done = true; mission.rings[1].done = true; mission.nextRing = 2;
    mission.score = 200;
    mission.banner = 'RING RUN 3/5 — gold ring ahead';
    camera = createChaseCamera();
    camera.mode = VIEW_MODES.COCKPIT;
  } else if (name === 'landing') {
    plane = createAircraftState({ x: -640, y: -1400, alt: 46, heading: 0, speed: 31, throttle: 0.28 });
    plane.pitch = -0.07;
    mission = createMissionState();
    mission.rings.forEach((r) => { r.done = true; });
    mission.nextRing = 5;
    mission.stage = MISSION_STAGES.LAND;
    mission.parcel.carried = false; mission.parcel.landed = true; mission.parcel.hit = true;
    mission.score = 800;
    mission.banner = 'LANDING — gentle touchdown on the home runway';
    camera = createChaseCamera();
    camera.mode = VIEW_MODES.CHASE;
  } else if (name === 'drop') {
    plane = createAircraftState({ x: 1180, y: 560, alt: 235, heading: Math.atan2(340, 320), speed: 48, throttle: 0.65 });
    plane.roll = -0.22;
    mission = createMissionState();
    mission.rings.forEach((r) => { r.done = true; });
    mission.nextRing = 5;
    mission.stage = MISSION_STAGES.DROP;
    mission.parcel.carried = false;
    mission.parcel.falling = true;
    mission.parcel.x = 1330; mission.parcel.y = 730; mission.parcel.alt = 140;
    mission.parcel.spin = 0.7;
    mission.score = 500;
    mission.banner = 'PARCEL AWAY — watch it fall';
    camera = createChaseCamera();
    camera.mode = VIEW_MODES.CHASE;
  }
  // Settle the camera behind the aircraft, then step the sim a fixed count.
  camera.x = plane.x - Math.cos(plane.heading) * 40;
  camera.y = plane.y - Math.sin(plane.heading) * 40;
  camera.alt = plane.alt + 9;
  camera.heading = plane.heading;
  const still = { pitch: 0, roll: 0, yaw: 0, throttleDelta: 0, dropPressed: false };
  for (let i = 0; i < 45; i++) {
    stepFlightModel(plane, still, 1 / 60, terrainHeight);
    updateChaseCamera(camera, plane, 1 / 60);
  }
  if (name === 'drop') { mission.parcel.x = 1360; mission.parcel.y = 760; mission.parcel.alt = 120; }
}

const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  setupShotScene(shotName);
  renderGame();
  window.__skyCourierShotReady = true;
} else {
  resetSortie();
  gameState = 'title';
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    stepGame(dt);
    renderGame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
