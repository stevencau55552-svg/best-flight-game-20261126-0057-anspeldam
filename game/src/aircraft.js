// aircraft.js — drawing the little mail plane, "Kestrel", in chase view,
// and the nose + glareshield seen from the cockpit. All vector shapes with
// gradients and shading so the aircraft looks built, not pasted on.

export function drawChaseAircraft(ctx, view, plane) {
  const cx = view.width / 2;
  const cy = view.height * 0.62 + plane.pitch * 60;
  const s = view.height / 720;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll * 0.85);
  ctx.scale(s, s);

  // Soft shadow blob far below sells the height.
  ctx.fillStyle = 'rgba(10,40,60,0.18)';
  ctx.beginPath();
  ctx.ellipse(6, 150, 90, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings first (behind the fuselage), coral-red with cream tips.
  const wingGrad = ctx.createLinearGradient(-150, 0, 150, 0);
  wingGrad.addColorStop(0, '#c94f38');
  wingGrad.addColorStop(0.5, '#e8704f');
  wingGrad.addColorStop(1, '#c94f38');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-152, 14);
  ctx.lineTo(-30, -8);
  ctx.lineTo(30, -8);
  ctx.lineTo(152, 14);
  ctx.lineTo(146, 30);
  ctx.lineTo(-146, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(-152, 12, 22, 17);
  ctx.fillRect(130, 12, 22, 17);

  // Tailplane and fin.
  ctx.fillStyle = '#d95f41';
  ctx.beginPath();
  ctx.moveTo(-52, 58); ctx.lineTo(52, 58); ctx.lineTo(44, 70); ctx.lineTo(-44, 70);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 34); ctx.lineTo(10, 66); ctx.lineTo(-8, 66);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(-3, 40, 7, 18);

  // Fuselage: cream body, teal cheatline, shaded belly.
  const bodyGrad = ctx.createLinearGradient(0, -46, 0, 66);
  bodyGrad.addColorStop(0, '#fdf6e3');
  bodyGrad.addColorStop(0.55, '#f3e3bd');
  bodyGrad.addColorStop(1, '#d9bd8a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.bezierCurveTo(20, -30, 24, 6, 17, 40);
  ctx.bezierCurveTo(13, 58, 6, 68, 0, 68);
  ctx.bezierCurveTo(-6, 68, -13, 58, -17, 40);
  ctx.bezierCurveTo(-24, 6, -20, -30, 0, -52);
  ctx.fill();
  ctx.fillStyle = '#2a7f8c';
  ctx.fillRect(-19, 2, 38, 8);

  // Canopy glass with a sky reflection.
  const glass = ctx.createLinearGradient(-12, -38, 12, -8);
  glass.addColorStop(0, '#bfe9f7');
  glass.addColorStop(0.5, '#5fa8c9');
  glass.addColorStop(1, '#2c5f7d');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -22, 12, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-4, -28, 4, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Mail sacks strapped behind the seat.
  ctx.fillStyle = '#a4713f';
  ctx.beginPath();
  ctx.ellipse(-9, 30, 8, 7, 0.3, 0, Math.PI * 2);
  ctx.ellipse(9, 30, 8, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Propeller blur disc at the nose.
  const blur = 0.25 + Math.abs(Math.sin(plane.propPhase)) * 0.2;
  ctx.fillStyle = `rgba(60,60,70,${blur})`;
  ctx.beginPath();
  ctx.ellipse(0, -54, 46, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a42';
  ctx.beginPath();
  ctx.ellipse(0, -54, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawCockpitNose(ctx, view, plane) {
  const w = view.width, h = view.height;
  const s = h / 720;
  ctx.save();
  // Nose cowling sweeping in from the bottom centre, kept low so the
  // runway and rings stay in view over it.
  const noseGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
  noseGrad.addColorStop(0, '#f3e3bd');
  noseGrad.addColorStop(1, '#c9a96f');
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h);
  ctx.bezierCurveTo(w * 0.45, h * 0.8, w * 0.47, h * 0.75, w * 0.5, h * 0.75);
  ctx.bezierCurveTo(w * 0.53, h * 0.75, w * 0.55, h * 0.8, w * 0.6, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a7f8c';
  ctx.fillRect(w * 0.462, h * 0.85, w * 0.076, 6 * s);

  // Propeller arc shimmering over the nose.
  ctx.strokeStyle = `rgba(50,50,60,${0.18 + Math.abs(Math.sin(plane.propPhase)) * 0.12})`;
  ctx.lineWidth = 10 * s;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.76, 110 * s, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Windshield frame posts.
  ctx.fillStyle = '#22303a';
  ctx.fillRect(w * 0.06, 0, 14 * s, h * 0.62);
  ctx.fillRect(w * 0.94 - 14 * s, 0, 14 * s, h * 0.62);
  ctx.fillRect(0, 0, w, 10 * s);
  ctx.restore();
}

export function drawParcel(ctx, sx, sy, scale, spinning) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(spinning);
  const s = Math.max(0.25, scale);
  ctx.scale(s, s);
  ctx.fillStyle = '#b98a4e';
  ctx.fillRect(-9, -7, 18, 14);
  ctx.strokeStyle = '#7c5a2e';
  ctx.lineWidth = 2;
  ctx.strokeRect(-9, -7, 18, 14);
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
  ctx.moveTo(0, -7); ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(-5, -4, 10, 5);
  ctx.restore();
}
