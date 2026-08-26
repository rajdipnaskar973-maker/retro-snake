// Tiny synth built on the Web Audio API. No .mp3/.wav files to download,
// which keeps the app light and fast — every "sound file" here is a
// couple of milliseconds of oscillator code instead.

let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Browsers suspend audio until a user gesture; resume on first use.
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function beep({ freq = 440, duration = 0.08, type = "square", volume = 0.15, glideTo = null }) {
  const audio = getCtx();
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, audio.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start(audio.currentTime);
  osc.stop(audio.currentTime + duration);
}

export const sfx = {
  move: () => beep({ freq: 220, duration: 0.03, type: "square", volume: 0.05 }),
  eat: () => beep({ freq: 440, duration: 0.09, type: "square", volume: 0.18, glideTo: 880 }),
  turn: () => beep({ freq: 300, duration: 0.02, type: "square", volume: 0.04 }),
  gameOver: () => {
    beep({ freq: 200, duration: 0.3, type: "sawtooth", volume: 0.18, glideTo: 60 });
  },
  start: () => beep({ freq: 660, duration: 0.12, type: "square", volume: 0.15, glideTo: 990 }),
};
