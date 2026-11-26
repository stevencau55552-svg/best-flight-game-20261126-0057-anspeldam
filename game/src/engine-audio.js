// engine-audio.js — every sound is synthesized with WebAudio: the engine
// hum follows the throttle, rings chime, parcels thump, crashes crunch.
// No audio files, no network.

export function createEngineAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let muted = false;

  function ensureContext() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return false;
    }
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    noise.loop = true;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    noise.connect(windFilter).connect(windGain).connect(ctx.destination);
    noise.start();
    return true;
  }

  function blip(freq, seconds, type, level) {
    if (!ensureContext() || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  return {
    update(plane, flying) {
      if (!ensureContext()) return;
      const on = flying && !muted;
      engineOsc.frequency.value = 55 + plane.throttle * 95 + plane.speed * 0.35;
      engineGain.gain.value = on ? 0.035 + plane.throttle * 0.05 : 0;
      windGain.gain.value = on ? Math.min(0.06, plane.speed * 0.0006) : 0;
    },
    ringChime() { blip(880, 0.22, 'sine', 0.12); blip(1320, 0.3, 'sine', 0.08); },
    parcelThump() { blip(120, 0.18, 'triangle', 0.16); },
    warningBeep() { blip(520, 0.12, 'square', 0.05); },
    crashCrunch() { blip(70, 0.5, 'sawtooth', 0.18); blip(45, 0.7, 'square', 0.12); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
  };
}
