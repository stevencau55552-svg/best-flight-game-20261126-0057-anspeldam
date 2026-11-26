// chase-camera.js — two views that never fight the pilot: a smooth chase
// camera trailing behind the tail, and a cockpit view from the seat.
// Both ease toward the aircraft instead of snapping to it.

import { clamp, wrapAngle } from './flight-model.js';

export const VIEW_MODES = { CHASE: 'chase', COCKPIT: 'cockpit' };

export function createChaseCamera() {
  return {
    mode: VIEW_MODES.CHASE,
    x: 0, y: 0, alt: 0,
    heading: 0, pitch: 0, roll: 0,
    fov: 1.05,
  };
}

export function toggleCameraView(camera) {
  camera.mode = camera.mode === VIEW_MODES.CHASE ? VIEW_MODES.COCKPIT : VIEW_MODES.CHASE;
  return camera.mode;
}

export function updateChaseCamera(camera, plane, dt) {
  if (camera.mode === VIEW_MODES.COCKPIT) {
    camera.x = plane.x;
    camera.y = plane.y;
    camera.alt = plane.alt + 1.6;
    camera.heading = plane.heading;
    camera.pitch = plane.pitch;
    camera.roll = plane.roll;
    return;
  }
  // Chase: sit behind and above the tail, lagging turns a touch so the
  // world swings gently instead of whipping around.
  const back = 34 + plane.speed * 0.12;
  const targetX = plane.x - Math.cos(plane.heading) * back;
  const targetY = plane.y - Math.sin(plane.heading) * back;
  const targetAlt = plane.alt + 9 - plane.pitch * 12;
  const ease = 1 - Math.pow(0.0015, dt);
  camera.x += (targetX - camera.x) * ease;
  camera.y += (targetY - camera.y) * ease;
  camera.alt += (targetAlt - camera.alt) * ease;

  const headingError = wrapAngle(plane.heading - camera.heading);
  camera.heading += headingError * (1 - Math.pow(0.002, dt));
  camera.pitch += ((plane.pitch * 0.55 - 0.06) - camera.pitch) * ease;
  camera.roll += (plane.roll * 0.45 - camera.roll) * ease;
}

// Project a world point into screen space for the given camera.
// Returns null when the point is behind the camera.
export function projectWorldPoint(camera, view, wx, wy, walt) {
  const dx = wx - camera.x;
  const dy = wy - camera.y;
  const dz = walt - camera.alt;
  const cosH = Math.cos(camera.heading), sinH = Math.sin(camera.heading);
  const cosP = Math.cos(camera.pitch), sinP = Math.sin(camera.pitch);
  // Camera basis: forward, right and up as unit vectors in world space.
  const depth = dx * cosH * cosP + dy * sinH * cosP + dz * sinP;
  if (depth < 2) return null;
  let lateral = -dx * sinH + dy * cosH;
  let up = -dx * cosH * sinP - dy * sinH * sinP + dz * cosP;
  // Bank the view with the aircraft by rotating in the lateral/up plane.
  const cosR = Math.cos(camera.roll), sinR = Math.sin(camera.roll);
  const bankedLateral = lateral * cosR - up * sinR;
  const bankedUp = lateral * sinR + up * cosR;
  lateral = bankedLateral;
  up = bankedUp;
  const focal = (view.height * 0.5) / Math.tan(camera.fov / 2);
  const scale = focal / depth;
  return {
    x: view.width / 2 + lateral * scale,
    y: view.height / 2 - up * scale,
    depth,
    scale,
  };
}

export function horizonScreenY(camera, view) {
  const p = projectWorldPoint(camera, view,
    camera.x + Math.cos(camera.heading) * 4000,
    camera.y + Math.sin(camera.heading) * 4000,
    camera.alt);
  return p ? clamp(p.y, -view.height, view.height * 2) : view.height / 2;
}
