// render-scene.js — painting the world: sky gradient and sun, the island
// terrain as projected quads with distance haze, sea, runway, rings,
// village rooftops, the lighthouse and drifting clouds.

import { projectWorldPoint, horizonScreenY } from './chase-camera.js';
import { terrainHeight, terrainColour, WORLD } from './terrain.js';
import { drawParcel } from './aircraft.js';

const SKY_TOP = '#3f8fd2';
const SKY_HORIZON = '#cfeaf7';
const HAZE = '207,234,247';

export function drawSkyAndSea(ctx, view, camera, clouds, timeSeconds) {
  const horizon = horizonScreenY(camera, view);
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, Math.max(0, horizon));

  // Sun disc with a warm halo, fixed in the world to the north-east.
  const sun = projectWorldPoint(camera, view, camera.x + 5200, camera.y + 5200, camera.alt + 1500);
  if (sun) {
    const halo = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 130);
    halo.addColorStop(0, 'rgba(255,244,190,0.95)');
    halo.addColorStop(0.25, 'rgba(255,230,150,0.45)');
    halo.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sun.x - 140, sun.y - 140, 280, 280);
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sea fills everything below the horizon first; terrain paints over it.
  const sea = ctx.createLinearGradient(0, horizon, 0, view.height);
  sea.addColorStop(0, '#5ea8c4');
  sea.addColorStop(1, '#2c6d8f');
  ctx.fillStyle = sea;
  ctx.fillRect(0, Math.max(0, horizon), view.width, view.height);

  drawClouds(ctx, view, camera, clouds, timeSeconds);
}

function drawClouds(ctx, view, camera, clouds, timeSeconds) {
  const sorted = clouds
    .map((c) => ({ c, p: projectWorldPoint(camera, view, c.x + timeSeconds * c.drift, c.y, c.alt) }))
    .filter((e) => e.p && e.p.depth < 7000)
    .sort((a, b) => b.p.depth - a.p.depth);
  for (const { c, p } of sorted) {
    const r = c.size * p.scale;
    if (r < 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    for (const [ox, oy, orr] of [[0, 0, 1], [-0.6, 0.12, 0.7], [0.6, 0.1, 0.75], [0.1, -0.18, 0.6]]) {
      ctx.beginPath();
      ctx.ellipse(p.x + ox * r, p.y + oy * r, r * orr, r * orr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawTerrain(ctx, view, camera) {
  const step = 150;
  const range = 2400;
  const cx = Math.round(camera.x / step) * step;
  const cy = Math.round(camera.y / step) * step;
  const quads = [];
  for (let gx = cx - range; gx < cx + range; gx += step) {
    for (let gy = cy - range; gy < cy + range; gy += step) {
      const corners = [
        [gx, gy], [gx + step, gy], [gx + step, gy + step], [gx, gy + step],
      ];
      const heights = corners.map(([x, y]) => terrainHeight(x, y));
      const midH = (heights[0] + heights[1] + heights[2] + heights[3]) / 4;
      if (midH < 0.5) continue; // sea already painted
      const pts = corners.map(([x, y], i) => projectWorldPoint(camera, view, x, y, Math.max(0, heights[i])));
      if (pts.some((p) => !p)) continue;
      const depth = pts.reduce((sum, p) => sum + p.depth, 0) / 4;
      if (depth > 5200) continue;
      const slope = (Math.max(...heights) - Math.min(...heights)) / step;
      quads.push({ pts, depth, colour: terrainColour(midH, slope) });
    }
  }
  quads.sort((a, b) => b.depth - a.depth);
  for (const q of quads) {
    ctx.fillStyle = q.colour;
    ctx.beginPath();
    ctx.moveTo(q.pts[0].x, q.pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(q.pts[i].x, q.pts[i].y);
    ctx.closePath();
    ctx.fill();
    const haze = Math.min(0.75, Math.max(0, (q.depth - 900) / 4200));
    if (haze > 0.03) {
      ctx.fillStyle = `rgba(${HAZE},${haze})`;
      ctx.fill();
    }
  }
}

export function drawRunway(ctx, view, camera) {
  const rw = WORLD.runway;
  const corners = [
    [rw.cx - rw.length / 2, rw.cy - rw.width / 2],
    [rw.cx + rw.length / 2, rw.cy - rw.width / 2],
    [rw.cx + rw.length / 2, rw.cy + rw.width / 2],
    [rw.cx - rw.length / 2, rw.cy + rw.width / 2],
  ];
  const pts = corners.map(([x, y]) => projectWorldPoint(camera, view, x, y, 6.4));
  if (pts.some((p) => !p)) return;
  ctx.fillStyle = '#3c4650';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes and threshold bars.
  ctx.strokeStyle = '#f6f2df';
  ctx.lineWidth = Math.max(1, pts[0].scale * 1.4);
  for (let t = 0.08; t < 0.95; t += 0.09) {
    const a = projectWorldPoint(camera, view, rw.cx - rw.length / 2 + rw.length * t, rw.cy, 6.6);
    const b = projectWorldPoint(camera, view, rw.cx - rw.length / 2 + rw.length * (t + 0.045), rw.cy, 6.6);
    if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
  for (const end of [-1, 1]) {
    for (let i = -2; i <= 2; i++) {
      const a = projectWorldPoint(camera, view, rw.cx + end * (rw.length / 2 - 18), rw.cy + i * 8, 6.6);
      const b = projectWorldPoint(camera, view, rw.cx + end * (rw.length / 2 - 4), rw.cy + i * 8, 6.6);
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
  }
}

export function drawRings(ctx, view, camera, mission, timeSeconds) {
  mission.rings.forEach((ring, index) => {
    if (ring.done) return;
    const isNext = index === mission.nextRing && mission.stage === 'rings';
    const pulse = isNext ? 1 + Math.sin(timeSeconds * 4) * 0.06 : 1;
    // The ring stands in the plane facing the incoming pilot: its circle
    // spans the sideways and vertical axes of the ring's own heading.
    const perpX = -Math.sin(ring.heading), perpY = Math.cos(ring.heading);
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const side = Math.cos(a) * ring.radius * pulse;
      const p = projectWorldPoint(camera, view,
        ring.x + perpX * side,
        ring.y + perpY * side,
        ring.alt + Math.sin(a) * ring.radius * pulse);
      if (!p) return;
      pts.push(p);
    }
    ctx.strokeStyle = isNext ? '#ffd23e' : 'rgba(64,200,190,0.75)';
    ctx.lineWidth = Math.max(2, pts[0].scale * (isNext ? 5 : 3));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (isNext) {
      const c = projectWorldPoint(camera, view, ring.x, ring.y, ring.alt);
      if (c) {
        ctx.fillStyle = '#ffd23e';
        ctx.font = `700 ${Math.max(12, c.scale * 14)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('NEXT', c.x, c.y);
        ctx.textAlign = 'left';
      }
    }
  });
}

export function drawVillageAndLighthouse(ctx, view, camera) {
  // Village: a cluster of rooftops near the drop bullseye.
  const v = WORLD.village;
  const houses = [[-90, -40], [30, -90], [110, 20], [-30, 70], [70, 110], [-120, 60], [0, -10], [140, -70]];
  const drawn = houses
    .map(([ox, oy]) => {
      const x = v.x + ox, y = v.y + oy;
      const base = terrainHeight(x, y);
      return { x, y, base, p: projectWorldPoint(camera, view, x, y, base + 16) };
    })
    .filter((h) => h.p)
    .sort((a, b) => b.p.depth - a.p.depth);
  for (const h of drawn) {
    const foot = projectWorldPoint(camera, view, h.x, h.y, h.base);
    if (!foot) continue;
    const wdt = Math.max(2, h.p.scale * 26);
    ctx.fillStyle = '#f0e2c4';
    ctx.fillRect(h.p.x - wdt / 2, h.p.y, wdt, foot.y - h.p.y);
    ctx.fillStyle = '#c94f38';
    ctx.beginPath();
    ctx.moveTo(h.p.x - wdt * 0.62, h.p.y);
    ctx.lineTo(h.p.x, h.p.y - wdt * 0.45);
    ctx.lineTo(h.p.x + wdt * 0.62, h.p.y);
    ctx.closePath();
    ctx.fill();
  }
  // Drop bullseye painted on the village green.
  const target = projectWorldPoint(camera, view, v.x, v.y, terrainHeight(v.x, v.y) + 1);
  if (target) {
    const r = Math.max(3, target.scale * 130);
    ctx.strokeStyle = '#ff5a4e';
    ctx.lineWidth = Math.max(2, target.scale * 5);
    ctx.beginPath(); ctx.ellipse(target.x, target.y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(target.x, target.y, r * 0.55, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath(); ctx.ellipse(target.x, target.y, r * 0.16, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Lighthouse on its rocky islet, stripes and a lit lamp.
  const lh = WORLD.lighthouse;
  const baseH = terrainHeight(lh.x, lh.y);
  const top = projectWorldPoint(camera, view, lh.x, lh.y, baseH + 85);
  const foot = projectWorldPoint(camera, view, lh.x, lh.y, baseH);
  if (top && foot) {
    const wdt = Math.max(2, top.scale * 16);
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const yA = foot.y - ((foot.y - top.y) * i) / bands;
      const yB = foot.y - ((foot.y - top.y) * (i + 1)) / bands;
      ctx.fillStyle = i % 2 ? '#f6f2df' : '#d94f38';
      ctx.fillRect(top.x - wdt / 2, yB, wdt, yA - yB);
    }
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(top.x, top.y - 3, Math.max(2, top.scale * 5), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFallingParcel(ctx, view, camera, mission) {
  const parcel = mission.parcel;
  if (!parcel.falling && !parcel.landed) return;
  const p = projectWorldPoint(camera, view, parcel.x, parcel.y, parcel.alt);
  if (p) drawParcel(ctx, p.x, p.y, p.scale * 1.6, parcel.spin);
}
