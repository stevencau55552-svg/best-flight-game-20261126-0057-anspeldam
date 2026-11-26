// hud-instruments.js — the flown instruments: attitude ball, altimeter,
// airspeed tape, heading compass, fuel gauge, damage lamp, mission banner
// and minimap. Drawn on the same canvas so screenshots show them lit.

import { headingDegrees } from './flight-model.js';

const PANEL = 'rgba(18,32,42,0.88)';
const LIT = '#ffd873';
const PAPER = '#eaf6ff';

export function drawFlightHud(ctx, view, plane, mission, viewMode) {
  const w = view.width, h = view.height;
  const s = h / 720;
  drawTopStrip(ctx, w, s, plane, mission);
  drawMissionBanner(ctx, w, s, mission);
  if (viewMode === 'cockpit') {
    drawCockpitPanel(ctx, view, plane, s);
  } else {
    drawChaseGauges(ctx, view, plane, s);
  }
  drawMinimap(ctx, view, plane, mission, s);
  if (plane.stalled) drawWarning(ctx, w, h, s, 'STALL — nose down, add power');
  else if (plane.fuel < 18) drawWarning(ctx, w, h, s, 'LOW FUEL — head home');
  else if (plane.damage > 55) drawWarning(ctx, w, h, s, 'AIRFRAME DAMAGED — land gently');
}

function drawTopStrip(ctx, w, s, plane, mission) {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, w, 44 * s);
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${19 * s}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  const alt = Math.max(0, Math.round(plane.alt * 3.28));
  const spd = Math.round(plane.speed * 1.94);
  const hdg = String(headingDegrees(plane.heading)).padStart(3, '0');
  ctx.fillText(`ALT ${alt} ft`, 16 * s, 29 * s);
  ctx.fillText(`SPD ${spd} kt`, 170 * s, 29 * s);
  ctx.fillText(`HDG ${hdg}°`, 320 * s, 29 * s);
  ctx.fillText(`VS ${Math.round(plane.verticalSpeed * 196)} fpm`, 460 * s, 29 * s);
  ctx.textAlign = 'right';
  ctx.fillStyle = LIT;
  ctx.fillText(`SCORE ${mission.score}`, w - 16 * s, 29 * s);
  ctx.fillStyle = PAPER;
  ctx.fillText(`TIME ${formatTime(mission.elapsed)}`, w - 210 * s, 29 * s);
  ctx.textAlign = 'left';
}

function drawMissionBanner(ctx, w, s, mission) {
  ctx.fillStyle = 'rgba(18,32,42,0.72)';
  const text = mission.banner;
  ctx.font = `600 ${17 * s}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  ctx.fillRect(w / 2 - tw / 2 - 14 * s, 52 * s, tw + 28 * s, 30 * s);
  ctx.fillStyle = LIT;
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, 73 * s);
  ctx.textAlign = 'left';
}

function drawChaseGauges(ctx, view, plane, s) {
  const h = view.height;
  drawFuelGauge(ctx, 18 * s, h - 148 * s, 150 * s, 20 * s, plane.fuel);
  drawDamageBar(ctx, 18 * s, h - 116 * s, 150 * s, 14 * s, plane.damage);
  drawThrottleLever(ctx, 18 * s, h - 92 * s, 150 * s, 12 * s, plane.throttle);
}

function drawCockpitPanel(ctx, view, plane, s) {
  const w = view.width, h = view.height;
  const panelY = h - 168 * s;
  ctx.fillStyle = '#1b2a36';
  ctx.fillRect(0, panelY, w, 168 * s);
  ctx.fillStyle = '#24384a';
  ctx.fillRect(0, panelY, w, 8 * s);
  const cy = panelY + 84 * s;
  drawAttitudeIndicator(ctx, w * 0.5, cy, 62 * s, plane);
  drawAltimeterDial(ctx, w * 0.5 - 180 * s, cy, 52 * s, plane);
  drawAirspeedDial(ctx, w * 0.5 + 180 * s, cy, 52 * s, plane);
  drawHeadingCompass(ctx, w * 0.5 - 330 * s, cy, 46 * s, plane);
  drawFuelGauge(ctx, w * 0.5 + 268 * s, cy - 26 * s, 150 * s, 18 * s, plane.fuel);
  drawDamageBar(ctx, w * 0.5 + 268 * s, cy + 2 * s, 150 * s, 12 * s, plane.damage);
  drawThrottleLever(ctx, w * 0.5 + 268 * s, cy + 24 * s, 150 * s, 10 * s, plane.throttle);
  // Annunciator lamps that look flown: lit, labelled, worn.
  drawLamp(ctx, w * 0.5 - 330 * s, cy + 56 * s, 'STALL', plane.stalled, '#ff5a4e', s);
  drawLamp(ctx, w * 0.5 - 262 * s, cy + 56 * s, 'FUEL', plane.fuel < 18, '#ffb84e', s);
  drawLamp(ctx, w * 0.5 - 194 * s, cy + 56 * s, 'DMG', plane.damage > 55, '#ff5a4e', s);
  drawLamp(ctx, w * 0.5 - 126 * s, cy + 56 * s, 'GEAR', plane.landed, '#7de08a', s);
}

export function drawAttitudeIndicator(ctx, cx, cy, r, plane) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll);
  const pitchPx = plane.pitch * r * 1.4;
  ctx.fillStyle = '#4d9fd6';
  ctx.fillRect(-r * 1.4, -r * 1.4 + pitchPx, r * 2.8, r * 1.4);
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(-r * 1.4, pitchPx, r * 2.8, r * 1.4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r * 1.4, pitchPx - 1.5, r * 2.8, 3);
  ctx.restore();
  ctx.strokeStyle = '#0e1a24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed aircraft symbol in the middle.
  ctx.strokeStyle = LIT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx - r * 0.18, cy);
  ctx.moveTo(cx + r * 0.18, cy); ctx.lineTo(cx + r * 0.55, cy);
  ctx.stroke();
  ctx.fillStyle = LIT;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawAltimeterDial(ctx, cx, cy, r, plane) {
  drawDialFace(ctx, cx, cy, r, 'ALT');
  const feet = Math.max(0, plane.alt * 3.28);
  const angle = -Math.PI * 0.75 + ((feet % 1000) / 1000) * Math.PI * 1.5;
  drawNeedle(ctx, cx, cy, r * 0.8, angle, LIT);
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${r * 0.34}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(feet)), cx, cy + r * 0.55);
  ctx.textAlign = 'left';
}

export function drawAirspeedDial(ctx, cx, cy, r, plane) {
  drawDialFace(ctx, cx, cy, r, 'SPD');
  const knots = plane.speed * 1.94;
  const angle = -Math.PI * 0.75 + Math.min(1, knots / 180) * Math.PI * 1.5;
  drawNeedle(ctx, cx, cy, r * 0.8, angle, LIT);
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${r * 0.34}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(knots)), cx, cy + r * 0.55);
  ctx.textAlign = 'left';
}

export function drawHeadingCompass(ctx, cx, cy, r, plane) {
  drawDialFace(ctx, cx, cy, r, 'HDG');
  const deg = headingDegrees(plane.heading);
  const angle = (deg * Math.PI) / 180 - Math.PI / 2;
  drawNeedle(ctx, cx, cy, r * 0.78, angle, '#7de08a');
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${r * 0.3}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(deg).padStart(3, '0') + '°', cx, cy + r * 0.55);
  ctx.textAlign = 'left';
}

function drawDialFace(ctx, cx, cy, r, label) {
  ctx.fillStyle = '#101c26';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a748c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#9db8cc';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
    ctx.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94);
    ctx.stroke();
  }
  ctx.fillStyle = '#9db8cc';
  ctx.font = `600 ${r * 0.26}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - r * 0.42);
  ctx.textAlign = 'left';
}

function drawNeedle(ctx, cx, cy, len, angle, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFuelGauge(ctx, x, y, w, h, fuel) {
  ctx.fillStyle = PANEL;
  ctx.fillRect(x - 4, y - 18, w + 8, h + 24);
  ctx.fillStyle = PAPER;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('FUEL', x, y - 5);
  ctx.fillStyle = '#33485c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fuel < 18 ? '#ff5a4e' : fuel < 40 ? '#ffb84e' : '#7de08a';
  ctx.fillRect(x, y, (w * fuel) / 100, h);
}

export function drawDamageBar(ctx, x, y, w, h, damage) {
  ctx.fillStyle = PANEL;
  ctx.fillRect(x - 4, y - 16, w + 8, h + 20);
  ctx.fillStyle = PAPER;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('AIRFRAME', x, y - 4);
  ctx.fillStyle = '#33485c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = damage > 55 ? '#ff5a4e' : '#e8b04e';
  ctx.fillRect(x, y, (w * damage) / 100, h);
}

export function drawThrottleLever(ctx, x, y, w, h, throttle) {
  ctx.fillStyle = PAPER;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('THROTTLE', x, y - 3);
  ctx.fillStyle = '#33485c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = LIT;
  ctx.fillRect(x, y, w * throttle, h);
}

function drawLamp(ctx, x, y, label, lit, colour, s) {
  ctx.fillStyle = lit ? colour : '#2c3f52';
  ctx.fillRect(x, y, 58 * s, 18 * s);
  ctx.fillStyle = lit ? '#101c26' : '#7d97ad';
  ctx.font = `700 ${11 * s}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 29 * s, y + 13 * s);
  ctx.textAlign = 'left';
}

function drawWarning(ctx, w, h, s, text) {
  ctx.fillStyle = 'rgba(160,30,20,0.85)';
  ctx.font = `700 ${20 * s}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  ctx.fillRect(w / 2 - tw / 2 - 16 * s, h * 0.2, tw + 32 * s, 34 * s);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h * 0.2 + 24 * s);
  ctx.textAlign = 'left';
}

export function drawMinimap(ctx, view, plane, mission, s) {
  const size = 150 * s;
  const x0 = view.width - size - 14 * s;
  const y0 = 56 * s;
  const scale = size / 7000;
  const mx = (wx) => x0 + size / 2 + wx * scale;
  const my = (wy) => y0 + size / 2 - wy * scale;
  ctx.fillStyle = 'rgba(16,40,58,0.85)';
  ctx.fillRect(x0, y0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = '#7de08a';
  for (const isle of mission.mapIslands) {
    ctx.beginPath();
    ctx.arc(mx(isle.x), my(isle.y), Math.max(3, isle.r * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(mx(-350), my(-1400) - 1, 700 * scale, 2);
  ctx.fillStyle = LIT;
  for (const ring of mission.rings) {
    if (!ring.done) { ctx.beginPath(); ctx.arc(mx(ring.x), my(ring.y), 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = '#ff8a5a';
  ctx.beginPath();
  ctx.arc(mx(mission.dropTarget.x), my(mission.dropTarget.y), 4, 0, Math.PI * 2);
  ctx.fill();
  // Player arrow.
  ctx.save();
  ctx.translate(mx(plane.x), my(plane.y));
  ctx.rotate(-plane.heading + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = '#5a748c';
  ctx.strokeRect(x0, y0, size, size);
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${11 * s}px system-ui, sans-serif`;
  ctx.fillText('CORAL RUN', x0 + 6 * s, y0 + 14 * s);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
