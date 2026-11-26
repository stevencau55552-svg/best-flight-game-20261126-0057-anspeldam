// terrain.js — the Coral Run archipelago: seeded islands, sea, beaches,
// a mountain spine and the home runway. Height is a pure function of x,y,
// so every flight (and every screenshot) sees the same world.

export const WORLD = {
  seaLevel: 0,
  runway: { cx: 0, cy: -1400, length: 700, width: 46, heading: 0 },
  village: { x: 1500, y: 900 },
  lighthouse: { x: -2100, y: 1600 },
};

// Small deterministic hash noise so the islands never change between runs.
function hashNoise(ix, iy) {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x, y, scale) {
  const gx = x / scale, gy = y / scale;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = gx - ix, fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hashNoise(ix, iy), b = hashNoise(ix + 1, iy);
  const c = hashNoise(ix, iy + 1), d = hashNoise(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// Island bumps: centre, radius, peak height. The home island holds the runway.
const ISLANDS = [
  { x: 0, y: -1400, r: 1500, peak: 120 },
  { x: 1500, y: 900, r: 1100, peak: 150 },
  { x: -2100, y: 1600, r: 900, peak: 190 },
  { x: 2600, y: -600, r: 800, peak: 90 },
  { x: -800, y: 3200, r: 1200, peak: 170 },
  { x: 900, y: -3400, r: 1000, peak: 110 },
];

export function terrainHeight(x, y) {
  let h = -14; // open sea floor
  for (const isle of ISLANDS) {
    const dx = x - isle.x, dy = y - isle.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < isle.r) {
      const t = 1 - d / isle.r;
      const dome = t * t * (3 - 2 * t);
      h = Math.max(h, -6 + dome * isle.peak);
    }
  }
  if (h > -6) {
    h += (smoothNoise(x, y, 420) - 0.5) * 26 + (smoothNoise(x, y, 130) - 0.5) * 9;
  }
  // Flatten the runway strip so a landing there is fair.
  const rw = WORLD.runway;
  const along = (x - rw.cx) * Math.cos(rw.heading) + (y - rw.cy) * Math.sin(rw.heading);
  const across = -(x - rw.cx) * Math.sin(rw.heading) + (y - rw.cy) * Math.cos(rw.heading);
  if (Math.abs(along) < rw.length / 2 + 60 && Math.abs(across) < rw.width) {
    const edge = Math.max(Math.abs(along) - rw.length / 2, Math.abs(across) - rw.width / 2, 0);
    const flat = 6;
    h = edge <= 0 ? flat : h + (flat - h) * Math.max(0, 1 - edge / 60);
  }
  return h;
}

export function terrainColour(height, slope) {
  // One painterly style for land and sea: deep teal water, pale sand,
  // meadow green, warm rock, snow on the high spine.
  if (height < 1.5) return shade([38, 118, 150], slope);       // sea shallows
  if (height < 5) return shade([232, 214, 160], slope);        // beach sand
  if (height < 45) return shade([96, 168, 92], slope);         // meadow
  if (height < 95) return shade([74, 138, 78], slope);         // forest green
  if (height < 145) return shade([150, 128, 104], slope);      // warm rock
  return shade([238, 240, 244], slope);                        // snow cap
}

function shade(rgb, slope) {
  const f = 1 - Math.min(0.45, Math.abs(slope) * 0.9);
  return `rgb(${Math.round(rgb[0] * f)},${Math.round(rgb[1] * f)},${Math.round(rgb[2] * f)})`;
}

export function isOnRunway(x, y) {
  const rw = WORLD.runway;
  const along = (x - rw.cx) * Math.cos(rw.heading) + (y - rw.cy) * Math.sin(rw.heading);
  const across = -(x - rw.cx) * Math.sin(rw.heading) + (y - rw.cy) * Math.cos(rw.heading);
  return Math.abs(along) <= rw.length / 2 && Math.abs(across) <= rw.width / 2;
}

export function seededRandom(seed) {
  let s = seed >>> 0;
  return function nextRandom() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCloudField(seed, count) {
  const rand = seededRandom(seed);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: (rand() - 0.5) * 9000,
      y: (rand() - 0.5) * 9000,
      alt: 260 + rand() * 180,
      size: 120 + rand() * 260,
      drift: 2 + rand() * 4,
    });
  }
  return clouds;
}
