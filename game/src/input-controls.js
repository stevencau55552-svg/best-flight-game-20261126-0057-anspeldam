// input-controls.js — keyboard and mouse steering. The pilot can fly with
// arrows, WASD, or by moving the mouse; both feed the same input object.

export function createPilotInput() {
  return {
    pitch: 0, roll: 0, yaw: 0, throttleDelta: 0,
    dropPressed: false, cameraPressed: false,
    restartPressed: false, pausePressed: false, mutePressed: false,
  };
}

export function attachPilotControls(canvas, input) {
  const keys = new Set();
  let mouseSteer = { x: 0, y: 0, active: false };

  window.addEventListener('keydown', (event) => {
    const k = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) event.preventDefault();
    if (!event.repeat) {
      if (k === ' ') input.dropPressed = true;
      if (k === 'c') input.cameraPressed = true;
      if (k === 'r') input.restartPressed = true;
      if (k === 'p') input.pausePressed = true;
      if (k === 'm') input.mutePressed = true;
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseSteer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseSteer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mouseSteer.active = true;
  });
  canvas.addEventListener('pointerleave', () => { mouseSteer.active = false; });
  canvas.addEventListener('pointerdown', () => { input.dropPressed = true; });

  return function readPilotInput() {
    let pitch = 0, roll = 0, yaw = 0, throttleDelta = 0;
    if (keys.has('arrowup') || keys.has('w')) pitch += 1;
    if (keys.has('arrowdown') || keys.has('s')) pitch -= 1;
    if (keys.has('arrowleft')) roll -= 1;
    if (keys.has('arrowright')) roll += 1;
    if (keys.has('a')) yaw -= 1;
    if (keys.has('d')) yaw += 1;
    if (keys.has('shift')) throttleDelta += 1;
    if (keys.has('control')) throttleDelta -= 1;
    if (mouseSteer.active) {
      // Mouse steer blends in only when the keys are quiet, so the two
      // never fight each other mid-turn.
      if (pitch === 0) pitch = -mouseSteer.y;
      if (roll === 0) roll = mouseSteer.x;
    }
    input.pitch = pitch;
    input.roll = roll;
    input.yaw = yaw;
    input.throttleDelta = throttleDelta;
    return input;
  };
}

export function clearOneShotKeys(input) {
  input.dropPressed = false;
  input.cameraPressed = false;
  input.restartPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
}
