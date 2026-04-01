// WebAudio: static hum + jumpscare blips + footsteps
export class AudioSystem {
  constructor(){
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    // static hum: noise + low oscillator
    this.master = this.ctx.createGain(); this.master.gain.value = 0.6; this.master.connect(this.ctx.destination);
    // noise
    const bufferSize = 2*this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1)*0.2;
    this.noise = this.ctx.createBufferSource(); this.noise.buffer = noiseBuffer; this.noise.loop = true;
    const noiseGain = this.ctx.createGain(); noiseGain.gain.value = 0.02;
    this.noise.connect(noiseGain); noiseGain.connect(this.master);
    // low oscillator
    this.osc = this.ctx.createOscillator(); this.osc.type='sine'; this.osc.frequency.value = 60;
    const oscGain = this.ctx.createGain(); oscGain.gain.value = 0.02;
    this.osc.connect(oscGain); oscGain.connect(this.master);
    this.noise.start(); this.osc.start();
  }
  playJumpscare(){
    const o = this.ctx.createOscillator(); o.type='square'; o.frequency.value = 120;
    const g = this.ctx.createGain(); g.gain.value = 0.0; o.connect(g); g.connect(this.master);
    const now = this.ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.6, now+0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now+0.6);
    o.start(now); o.stop(now+0.7);
  }
  playFootstep(){
    const o = this.ctx.createOscillator(); o.type='triangle'; o.frequency.value = 120;
    const g = this.ctx.createGain(); g.gain.value = 0.08; o.connect(g); g.connect(this.master);
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.18);
    o.start(now); o.stop(now+0.2);
  }
}
