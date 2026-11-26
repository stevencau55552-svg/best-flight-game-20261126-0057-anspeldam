// missions.js — the mail run itself: three different goals in one sortie.
// 1) Ring Run: thread the gold rings in order.
// 2) Parcel Drop: release the mail sack over the village bullseye.
// 3) Landing: put Kestrel down gently on the home runway.
// Fuel and damage make every leg a decision, not a formality.

import { WORLD, terrainHeight, isOnRunway } from './terrain.js';

export const MISSION_STAGES = { RINGS: 'rings', DROP: 'drop', LAND: 'land', DONE: 'done' };

export function createMissionState() {
  return {
    stage: MISSION_STAGES.RINGS,
    score: 0,
    elapsed: 0,
    banner: 'RING RUN — fly through the gold ring',
    // Each ring faces the pilot arriving from the previous point of the
    // course, so it reads as a circle to fly through, never edge-on.
    rings: [
      { x: -1500, y: -1400, alt: 150, radius: 55, heading: 0, done: false },
      { x: -400, y: -500, alt: 190, radius: 55, heading: Math.atan2(900, 1100), done: false },
      { x: 700, y: 100, alt: 150, radius: 55, heading: Math.atan2(600, 1100), done: false },
      { x: 1500, y: 700, alt: 210, radius: 55, heading: Math.atan2(600, 800), done: false },
      { x: 2100, y: 1400, alt: 170, radius: 55, heading: Math.atan2(700, 600), done: false },
    ],
    nextRing: 0,
    dropTarget: { x: WORLD.village.x, y: WORLD.village.y, radius: 130 },
    parcel: { carried: true, falling: false, x: 0, y: 0, alt: 0, vx: 0, vy: 0, vz: 0, spin: 0, landed: false, hit: false },
    landedClean: false,
    finished: false,
    mapIslands: [
      { x: 0, y: -1400, r: 1500 }, { x: 1500, y: 900, r: 1100 },
      { x: -2100, y: 1600, r: 900 }, { x: 2600, y: -600, r: 800 },
      { x: -800, y: 3200, r: 1200 }, { x: 900, y: -3400, r: 1000 },
    ],
  };
}

export function updateMissions(mission, plane, input, dt, audio) {
  if (mission.finished) return;
  mission.elapsed += dt;

  if (mission.stage === MISSION_STAGES.RINGS) {
    const ring = mission.rings[mission.nextRing];
    if (ring) {
      const dx = plane.x - ring.x, dy = plane.y - ring.y, dz = plane.alt - ring.alt;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      mission.banner = `RING RUN ${mission.nextRing + 1}/${mission.rings.length} — gold ring ${Math.round(dist)} m`;
      if (dist < ring.radius) {
        ring.done = true;
        mission.nextRing += 1;
        mission.score += 100;
        audio.ringChime();
        if (mission.nextRing >= mission.rings.length) {
          mission.stage = MISSION_STAGES.DROP;
          mission.banner = 'PARCEL DROP — press Space over the village bullseye';
        }
      }
    }
  } else if (mission.stage === MISSION_STAGES.DROP) {
    const dx = plane.x - mission.dropTarget.x, dy = plane.y - mission.dropTarget.y;
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
    mission.banner = mission.parcel.carried
      ? `PARCEL DROP — village ${dist} m · Space to release`
      : 'PARCEL AWAY — watch it fall';
  } else if (mission.stage === MISSION_STAGES.LAND) {
    mission.banner = 'LANDING — gentle touchdown on the home runway';
    if (plane.landed && isOnRunway(plane.x, plane.y) && plane.speed < 6) {
      mission.landedClean = true;
      mission.score += 250 + Math.round(plane.fuel) - Math.round(plane.damage);
      mission.stage = MISSION_STAGES.DONE;
      mission.finished = true;
      mission.banner = 'MAIL DELIVERED — sortie complete';
    }
  }

  // Parcel release and fall: it keeps the aircraft's speed, then gravity wins.
  const parcel = mission.parcel;
  if (input.dropPressed && parcel.carried && mission.stage === MISSION_STAGES.DROP) {
    parcel.carried = false;
    parcel.falling = true;
    parcel.x = plane.x; parcel.y = plane.y; parcel.alt = plane.alt - 2;
    parcel.vx = Math.cos(plane.heading) * plane.speed;
    parcel.vy = Math.sin(plane.heading) * plane.speed;
    parcel.vz = plane.verticalSpeed;
    parcel.spin = 0;
  }
  if (parcel.falling) {
    parcel.vz -= 22 * dt;
    parcel.x += parcel.vx * dt;
    parcel.y += parcel.vy * dt;
    parcel.alt += parcel.vz * dt;
    parcel.spin += dt * 3;
    const ground = terrainHeight(parcel.x, parcel.y);
    if (parcel.alt <= ground + 1) {
      parcel.alt = ground + 1;
      parcel.falling = false;
      parcel.landed = true;
      const dx = parcel.x - mission.dropTarget.x, dy = parcel.y - mission.dropTarget.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      parcel.hit = dist <= mission.dropTarget.radius;
      mission.score += parcel.hit ? 300 : Math.max(0, 120 - Math.round(dist / 4));
      audio.parcelThump();
      mission.stage = MISSION_STAGES.LAND;
      mission.banner = parcel.hit
        ? 'BULLSEYE — now land on the home runway'
        : 'Parcel down — now land on the home runway';
    }
  }

  if (plane.crashed && !mission.finished) {
    mission.finished = true;
    mission.banner = 'CRASHED — press R to fly again';
  }
}

export function missionSummary(mission, plane) {
  const rings = mission.rings.filter((r) => r.done).length;
  return {
    score: mission.score,
    ringsFlown: rings,
    parcelHit: mission.parcel.hit,
    landedClean: mission.landedClean,
    fuelLeft: Math.round(plane.fuel),
    damage: Math.round(plane.damage),
    time: mission.elapsed,
  };
}
