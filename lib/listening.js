import {duration} from './catalog.mjs';

// A queue is a snapshot of the visible results when listening starts.
// Filtering afterwards never silently changes what plays next.
export function createListeningPlayer({beforePlay, onChange}) {
  const $ = selector => document.querySelector(selector);
  const bar = $('#listening-bar'), audio = $('#listening-audio');
  const seek = $('#listening-seek');
  let scrubbing = false;
  let queue = [], index = -1, generation = 0, trigger;
  const current = () => queue[index];
  new ResizeObserver(() => document.documentElement.style.setProperty('--listening-height', `${bar.hidden ? 0 : bar.getBoundingClientRect().height}px`)).observe(bar);
  function update() {
    const item = current();
    if (!item) return;
    $('#listening-title').textContent = item.title;
    $('#listening-detail').textContent = `${item.group === 'song' ? '歌曲' : '影像配樂'}${item.version ? ' · ' + item.version : ''}`;
    $('#listening-position').textContent = `清單 ${index + 1} / ${queue.length}`;
    $('#listening-source').href = item.src;
    $('#previous-track').disabled = index <= 0;
    $('#next-track').disabled = index >= queue.length - 1;
    audio.setAttribute('aria-label', `${item.title}${item.version ? '，' + item.version : ''}`);
    onChange(item);
  }
  function select(nextIndex, autoplay = true) {
    if (nextIndex < 0 || nextIndex >= queue.length) return;
    generation++;
    const mine = generation;
    beforePlay();
    audio.pause();
    index = nextIndex;
    seek.disabled = true; seek.value = 0;
    $('#listening-time').textContent = '0:00 / 0:00';
    audio.src = current().src;
    bar.hidden = false;
    document.body.classList.add('is-listening');
    $('#listening-status').textContent = autoplay ? '' : '按播放鍵開始聆聽。';
    update();
    if (autoplay) audio.play().catch(() => {
      if (mine === generation && !audio.error) $('#listening-status').textContent = '按播放鍵開始聆聽。';
    });
  }
  function start(item, items, autoplay = true, continuous = false) {
    trigger = document.activeElement;
    queue = items.some(t => t.id === item.id) ? [...items] : [item];
    $('#continuous-play').checked = continuous;
    select(queue.findIndex(t => t.id === item.id), autoplay);
  }
  function stop(restoreFocus = false) {
    generation++;
    audio.pause(); audio.removeAttribute('src'); audio.load();
    bar.hidden = true;
    document.body.classList.remove('is-listening');
    queue = []; index = -1;
    onChange(null);
    if (restoreFocus && trigger?.isConnected) trigger.focus({preventScroll:true});
  }
  $('#previous-track').addEventListener('click', () => select(index - 1));
  $('#next-track').addEventListener('click', () => select(index + 1));
  $('#close-listening').addEventListener('click', () => stop(true));
  bar.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); stop(true); } });
  seek.addEventListener('pointerdown', () => { scrubbing = true; });
  window.addEventListener('pointerup', () => { scrubbing = false; });
  seek.addEventListener('pointercancel', () => { scrubbing = false; });
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value); });
  function updateProgress() {
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.disabled = !total;
    seek.max = total;
    if (!scrubbing) seek.value = audio.currentTime;
    const text = `${duration(audio.currentTime)} / ${duration(total)}`;
    seek.setAttribute('aria-valuetext', text);
    $('#listening-time').textContent = text;
  }
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('ended', () => {
    if ($('#continuous-play').checked && index < queue.length - 1) select(index + 1);
    else $('#listening-status').textContent = '播放完畢，可以選另一首繼續聽。';
  });
  audio.addEventListener('error', () => { if (current()) $('#listening-status').textContent = '音樂未能載入，可點「另開音樂」重試。'; });
  audio.addEventListener('waiting', () => { if (current()) $('#listening-status').textContent = '正在緩衝…'; });
  audio.addEventListener('playing', () => { $('#listening-status').textContent = ''; });
  return {start, stop, current};
}
