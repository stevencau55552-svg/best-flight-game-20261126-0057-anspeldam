// flight-model.js — the aeroplane's motion: throttle, pitch, roll, lift,
// fuel burn and damage. One clear job: turn pilot input into flight.

export const PLANE_LIMITS = {
  minSpeed: 14,        // below this the wing stalls and the nose drops
  maxSpeed: 92,
  cruiseSpeed: 46,
  maxPitch: 0.62,      // radians, climb or dive
  maxRoll: 1.15,       // radians of bank
  turnRate: 0.85,      // heading change per second at full bank
  fuelCapacity: 100,
  fuelBurnPerSecond: 0.55, // at full throttle; less at cruise
  damageLimit: 100,
};

export function createAircraftState(start) {
  return {
    x: start.x, y: start.y, alt: start.alt,
    heading: start.heading, pitch: 0, roll: 0,
    speed: start.speed, throttle: start.throttle,
    verticalSpeed: 0,
    fuel: PLANE_LIMITS.fuelCapacity,
    damage: 0,
    stalled: false,
    crashed: false,
    landed: false,
    propPhase: 0,
  };
}

export function stepFlightModel(plane, input, dt, groundHeightAt) {
  if (plane.crashed) { plane.propPhase += dt * 2; return; }

  // Throttle: the lever moves toward the pilot's setting, never jumps.
  plane.throttle += input.throttleDelta * dt * 0.9;
  plane.throttle = clamp(plane.throttle, 0, 1);

  // Controls answer at every speed, but a slow wing answers softly.
  const authority = clamp(plane.speed / PLANE_LIMITS.cruiseSpeed, 0.35, 1.25);
  plane.pitch += input.pitch * dt * 1.15 * authority;
  plane.pitch = clamp(plane.pitch, -PLANE_LIMITS.maxPitch, PLANE_LIMITS.maxPitch);
  if (input.pitch === 0) plane.pitch *= Math.pow(0.35, dt); // settle toward level

  plane.roll += input.roll * dt * 1.9 * authority;
  plane.roll = clamp(plane.roll, -PLANE_LIMITS.maxRoll, PLANE_LIMITS.maxRoll);
  if (input.roll === 0) plane.roll *= Math.pow(0.25, dt); // wings level themselves

  // A banked wing turns the nose; the rudder (yaw) helps a little.
  plane.heading += (Math.sin(plane.roll) * PLANE_LIMITS.turnRate + input.yaw * 0.35) * dt;
  plane.heading = wrapAngle(plane.heading);

  // Speed: engine thrust fights drag; diving gains, climbing spends.
  const thrust = plane.throttle * 26;
  const drag = 0.006 * plane.speed * plane.speed + 1.6;
  const gravityAlongPath = -Math.sin(plane.pitch) * 9.8;
  plane.speed += (thrust - drag + gravityAlongPath) * dt;
  plane.speed = clamp(plane.speed, 0, PLANE_LIMITS.maxSpeed);

  // Stall: too slow and the nose drops until speed returns.
  plane.stalled = plane.speed < PLANE_LIMITS.minSpeed && !plane.landed;
  if (plane.stalled) plane.pitch = Math.max(plane.pitch - dt * 0.8, -0.5);

  // Move through the world.
  const groundSpeed = Math.cos(plane.pitch) * plane.speed;
  plane.x += Math.cos(plane.heading) * groundSpeed * dt;
  plane.y += Math.sin(plane.heading) * groundSpeed * dt;
  plane.verticalSpeed = Math.sin(plane.pitch) * plane.speed;
  plane.alt += plane.verticalSpeed * dt;

  // Fuel: full throttle drinks, idle sips. Empty tank = glide home.
  if (!plane.landed) {
    plane.fuel -= PLANE_LIMITS.fuelBurnPerSecond * (0.25 + plane.throttle) * dt;
    if (plane.fuel <= 0) { plane.fuel = 0; plane.throttle = 0; }
  }

  plane.propPhase += dt * (4 + plane.throttle * 40);

  // Ground contact: gentle on a runway is a landing, anything else hurts.
  const ground = groundHeightAt(plane.x, plane.y);
  if (plane.alt <= ground + 1.2) {
    plane.alt = ground + 1.2;
    const gentle = plane.verticalSpeed > -6 && Math.abs(plane.roll) < 0.35 && Math.abs(plane.pitch) < 0.3;
    if (gentle && plane.speed < 40) {
      plane.landed = true;
      plane.speed = Math.max(0, plane.speed - dt * 18);
      plane.verticalSpeed = 0;
    } else if (!plane.landed) {
      const hit = Math.abs(plane.verticalSpeed) * 4 + Math.max(0, plane.speed - 30);
      plane.damage += hit;
      plane.speed *= 0.45;
      plane.verticalSpeed = Math.abs(plane.verticalSpeed) * 0.25;
      if (plane.damage >= PLANE_LIMITS.damageLimit) plane.crashed = true;
    }
  } else {
    plane.landed = false;
  }
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function headingDegrees(heading) {
  let deg = Math.round((heading * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  return deg;
}
