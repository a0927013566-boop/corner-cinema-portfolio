import {duration} from './catalog.mjs';
import {initMotion,motionAllowed} from './motion.js';
let current, peaks = [], stageApi;
export function setSoundTrack(item) {
  current = item;
  const title = document.querySelector('#sound-title');
  if (!title) return;
  if (item) {
    title.textContent = item.title;
    document.querySelector('#sound-detail').textContent = `${item.group==='song'?'原創歌曲':'影像配樂'}${item.version?' · '+item.version:''} · ${duration(item.duration)}`;
    const link = document.querySelector('#sound-play');
    link.href = item.src; link.dataset.play = item.id; link.setAttribute('aria-label',`播放${item.title}`);
    peaks = item.waveform || peaks;
    stageApi?.setPeaks(peaks);
  }
  document.querySelector('#sound-state').textContent = item ? '正在聆聽' : '從這首開始';
}
export function initSoundExperience() {
  initMotion();
  const host = document.querySelector('#sound-space');
  const audio = document.querySelector('#listening-audio');
  if (!host || !audio) return;
  peaks = [...document.querySelectorAll('.track[data-play="track-07"] .track-wave rect')].map(r=>Number(r.getAttribute('height'))/44);
  let audioContext, analyser, source, connecting;
  const frequencies = new Uint8Array(128);
  async function connectAudio() {
    if (!motionAllowed() || connecting) return;
    connecting = true;
    try {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      if (!Constructor) return;
      audioContext ||= new Constructor();
      await audioContext.resume();
      // Keep the output path direct. The analyser is an optional parallel branch.
      if (!source && audioContext.state==='running') {
        analyser = audioContext.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .84;
        source = audioContext.createMediaElementSource(audio);
        source.connect(audioContext.destination); source.connect(analyser);
      }
    } catch { /* Native playback still works if no audio graph was attached. */ }
    finally { connecting = false; }
  }
  function playbackState() {
    const state = document.querySelector('#sound-state');
    if (!current) { state.textContent = '從這首開始'; return; }
    state.textContent = audio.paused ? '暫停聆聽' : '正在聆聽';
  }
  audio.addEventListener('play',()=>{ connectAudio(); playbackState(); });
  audio.addEventListener('pause',playbackState);
  audio.addEventListener('timeupdate',()=>{
    const active = document.querySelector('.track[aria-current=true]');
    document.querySelectorAll('.track:not([aria-current=true])').forEach(t=>t.style.removeProperty('--track-progress'));
    active?.style.setProperty('--track-progress',`${audio.duration?100*audio.currentTime/audio.duration:0}%`);
  });
  let loaded = false;
  const observer = new IntersectionObserver(async entries=>{
    const visible=entries[0].isIntersecting;
    stageApi?.setVisible(visible);
    if (!visible || loaded) return;
    loaded=true;
    try {
      const {createArtworkStage} = await import('./artwork-stage.js?v=cinematic-1');
      stageApi = await createArtworkStage(host, {peaks, audio, current:()=>current, sample(){
        if (analyser && !audio.paused && audioContext.state==='running') {analyser.getByteFrequencyData(frequencies);return frequencies;}
        return null;
      }});
      if (!audio.paused) connectAudio();
    } catch { host.dataset.ready='false'; }
  },{rootMargin:'150px'});
  observer.observe(host);
  document.addEventListener('corner:motion',()=>{if(!audio.paused)connectAudio();});
}
