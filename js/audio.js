(function (global) {
  'use strict';
  let context, enabled = true;
  function play(kind) {
    if (!enabled) return;
    try {
      const Audio = global.AudioContext || global.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
      const notes = { tap: [440], delete: [294], submit: [330, 440], error: [220, 196], start: [294, 392, 440], won: [294, 392, 440, 587], lost: [330, 294, 220] }[kind] || [440];
      notes.forEach((frequency, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const now = context.currentTime + i * .095;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(kind === 'tap' ? .035 : .055, now + .008);
        gain.gain.exponentialRampToValueAtTime(.001, now + .22);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(now); oscillator.stop(now + .24);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch (_) { /* Audio is optional; unsupported devices can still play. */ }
  }
  global.JathrAudio = { play, setEnabled(value) { enabled = !!value; } };
})(globalThis);
