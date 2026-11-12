import {initSiteFlow} from './lib/site-flow.js?v=cinematic-1';
initSiteFlow();
import {external, workMarkup, trackMarkup, episodeDuration, hallSelection} from './lib/catalog.mjs';
import {createListeningPlayer} from './lib/listening.js';
import {initSoundExperience, setSoundTrack} from './lib/sound-experience.js?v=cinematic-1';
initSoundExperience();
import {initSceneMotion} from './lib/scene-motion.js?v=cinematic-1';
import {initFilmGallery} from './lib/film-gallery.js?v=cinematic-1';
import {initGalleryMotion} from './lib/gallery-motion.js?v=cinematic-1';
import {initWorld} from './lib/world.js?v=world-5';
initSceneMotion();
initGalleryMotion();
(() => {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#player-dialog');
  const stage = $('#player-stage');
  let works = [], tracks = [], active = null, episode = 0, returnFocus = null, returnHash = '#works', player = null, timer = null, generation = 0;
  let musicFilter = 'song', youtubePromise;
  const listening = createListeningPlayer({
    beforePlay() {
      closePlayer(false);
      if (location.hash.startsWith('#watch=') && !tracks.some(t => location.hash === `#watch=${t.id}`)) history.replaceState(null, '', '#music');
    },
    onChange(item) {
      setSoundTrack(item);
      document.querySelectorAll('.track').forEach(link => {
        if (link.dataset.play === item?.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      if (location.hash.startsWith('#watch=track-')) history.replaceState(null, '', item ? `#watch=${item.id}` : '#music');
    }
  });
  function renderWorks(filter = 'all') {
    $('#work-grid').innerHTML = workMarkup(works, filter);
    $('#work-count').textContent = `${works.filter(w => filter === 'all' || w.category === filter).length} 組作品`;
  }
  function visibleTracks() {
    const q = $('#music-search').value.trim().toLocaleLowerCase();
    return tracks.filter(t => (musicFilter === 'all' || t.group === musicFilter) && `${t.title} ${t.version || ''}`.toLocaleLowerCase().includes(q));
  }
  function renderTracks() {
    const shown = visibleTracks();
    $('#track-list').innerHTML = trackMarkup(shown, listening.current()?.id);
    $('#music-count').textContent = `${shown.length} 首可聆聽`;
    $('#play-queue').disabled = !shown.length;
  }
  function stopMedia() {
    generation++;
    clearTimeout(timer);
    if (player) { try { player.destroy(); } catch {} player = null; }
    stage.querySelectorAll('video,audio').forEach(m => { m.pause(); m.removeAttribute('src'); m.load(); });
    stage.replaceChildren(); // Removing an iframe also stops its audio.
  }
  function loadYouTubeAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!youtubePromise) youtubePromise = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = reject; document.head.append(script);
    });
    return youtubePromise;
  }
  function setLocation(push = false) {
    const query = new URLSearchParams({watch: active.id});
    if (active.episodes) query.set('episode', String(episode + 1));
    history[push ? 'pushState' : 'replaceState'](push ? {cornerPlayer:true} : history.state, '', `#${query}`);
  }
  function playCurrent(autoplay) {
    stopMedia();
    const mine = generation;
    const item = active;
    const part = item.episodes?.[episode];
    const videoId = part?.youtubeId || (!item.src && item.youtubeId);
    $('#player-title').textContent = part ? part.title : item.title;
    $('#player-label').textContent = `${item.label} · ${part ? episodeDuration(part.duration) : item.duration || ''}`;
    $('#player-description').textContent = item.description;
    $('.work-share').hidden = true;
    $('#player-disclosure').hidden = !item.disclosure;
    $('#player-disclosure').textContent = item.disclosure || '';
    $('#player-status').textContent = '';

    const fallback = $('#player-fallback');
    fallback.href = videoId ? external(videoId) : item.src;
    fallback.textContent = videoId ? '在 YouTube 開啟 ↗' : '另開影片 ↗';
    fallback.setAttribute('aria-label', `${fallback.textContent.replace(' ↗','')}（另開新分頁）`);
    const picker = $('#episode-picker'); picker.hidden = !item.episodes;
    picker.innerHTML = item.episodes ? item.episodes.map((p,i) => `<button type="button" data-episode="${i}" aria-pressed="${episode === i}">${item.id === 'changye' ? (i ? '第 1 集・下' : '第 1 集・上') : `第 ${i + 1} 集`}<span>${episodeDuration(p.duration)}</span></button>`).join('') : '';
    $('#next-episode').hidden = !item.episodes || episode === item.episodes.length - 1;
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.title = `${part?.title || item.title} — YouTube 播放器`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      const params = new URLSearchParams({autoplay: autoplay ? '1':'0',playsinline:'1',rel:'0',enablejsapi:'1',origin:location.origin});
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
      stage.append(iframe);
      $('#player-status').textContent = '正在載入 YouTube 播放器…';
      timer = setTimeout(() => { if (mine === generation) $('#player-status').textContent = '如果播放器未能顯示，可點「在 YouTube 開啟」觀看這一集。'; }, 12000);
      loadYouTubeAPI().then(YT => {
        if (mine !== generation || !dialog.open) return;
        player = new YT.Player(iframe, { events: {
          onReady: () => { if(mine !== generation) return; clearTimeout(timer); $('#player-status').textContent = ''; },
          onError: () => { if(mine !== generation) return; clearTimeout(timer); $('#player-status').textContent = 'YouTube 暫時無法在此播放這一集。請點「在 YouTube 開啟」觀看原影片。'; }
        }});
      }).catch(() => { if (mine === generation) $('#player-status').textContent = '影片由 YouTube 播放；如果無法載入，可另開原影片。'; });
    } else {
      const media = document.createElement('video');
      media.controls = true; media.preload = 'metadata'; media.src = item.src;
      if (item.poster) media.poster = item.poster;
      media.playsInline = true;
      media.setAttribute('aria-label', item.title);
      media.addEventListener('error', () => { if(mine === generation) $('#player-status').textContent = '媒體載入失敗，請確認網路後重新開啟，或使用上方另開連結。'; });
      media.addEventListener('waiting', () => { if(mine === generation) $('#player-status').textContent = '正在緩衝…'; });
      media.addEventListener('playing', () => { if(mine === generation) $('#player-status').textContent = ''; });
      stage.append(media);
      if (autoplay) media.play().catch(() => { if(mine === generation && !media.error) $('#player-status').textContent = '按播放器的播放鍵開始。'; });
    }
  }
  function openPlayer(id, requestedEpisode = 0, autoplay = true, updateURL = true) {
    const track = tracks.find(t => t.id === id);
    if (track) { listening.start(track, autoplay ? visibleTracks() : tracks, autoplay); return true; }
    const item = works.find(w => w.id === id);
    if (!item || !dialog.showModal) return false;
    const opening = !dialog.open;
    listening.stop();
    if (opening) {
      returnFocus = document.activeElement;
      returnHash = location.hash.startsWith('#watch=') ? '#works' : (location.hash || '#works');
      dialog.showModal(); document.body.classList.add('modal-open');
      $('.close-player').focus();
    }
    active = item; episode = Math.max(0,Math.min(Number.isFinite(requestedEpisode) ? requestedEpisode : 0, (item.episodes?.length || 1) - 1));
    playCurrent(autoplay);
    if (updateURL) setLocation(opening);
    return true;
  }
  function closePlayer(updateURL = true) {
    if (!dialog.open) return;
    stopMedia(); dialog.close(); active = null; document.body.classList.remove('modal-open');
    if (updateURL && location.hash.startsWith('#watch=')) {
      if (history.state?.cornerPlayer) history.back();
      else history.replaceState(null, '', returnHash);
    }
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function route() {
    if (location.hash.startsWith('#watch=')) {
      const p = new URLSearchParams(location.hash.slice(1));
      const id = p.get('watch'), index = parseInt(p.get('episode') || '1',10) - 1;
      if (listening.current()?.id === id) return;
      if (!active || active.id !== id || episode !== index) openPlayer(id,index,false,false);
    } else closePlayer(false);
  }
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-play]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button > 0) return;
    if (openPlayer(link.dataset.play)) e.preventDefault();
  });
  $('#work-filters').addEventListener('click', (e) => {
    const button = e.target.closest('[data-filter]'); if (!button) return;
    $('#work-filters').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    renderWorks(button.dataset.filter);
  });
  $('#music-filters').addEventListener('click', (e) => {
    const button = e.target.closest('[data-music-filter]'); if (!button) return;
    musicFilter = button.dataset.musicFilter;
    $('#music-filters').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    renderTracks();
  });
  $('#music-search').addEventListener('input', renderTracks);
  $('.close-player').addEventListener('click', () => closePlayer());
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const nodes = [...dialog.querySelectorAll('button, input, a[href], video, audio, iframe, [tabindex="0"]')].filter(n => !n.disabled && !n.closest('[hidden]') && n.getClientRects().length);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closePlayer(); });
  dialog.addEventListener('click', (e) => {
    if(e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closePlayer();
  });
  $('#episode-picker').addEventListener('click', (e) => {
    const button = e.target.closest('[data-episode]'); if (!button || !active) return;
    episode = Number(button.dataset.episode); playCurrent(true); setLocation();
    $(`[data-episode="${episode}"]`).focus();
  });
  $('#next-episode').addEventListener('click', () => {
    if (!active?.episodes || episode >= active.episodes.length - 1) return;
    episode++; playCurrent(true); setLocation(); $('.close-player').focus();
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  $('#play-queue').addEventListener('click', () => { const shown = visibleTracks(); if (shown.length) listening.start(shown[0], shown, true, true); });

  async function copyAddress(input, status) {
    try { await navigator.clipboard.writeText(input.value); status.textContent = '已複製連結。'; }
    catch { input.focus(); input.select(); status.textContent = '網址已選取，可以手動複製。'; }
  }
  $('[data-copy-site]').hidden = false;
  $('[data-copy-site]').addEventListener('click', () => copyAddress($('#site-address'), $('#site-copy-status')));
  $('#share-work').addEventListener('click', () => {
    const query = new URLSearchParams({watch:active.id});
    if (active.episodes) query.set('episode', String(episode + 1));
    $('#work-address').value = `${location.origin}${location.pathname}#${query}`;
    $('.work-share').hidden = false;
    copyAddress($('#work-address'), $('#work-copy-status'));
  });
  async function getJSON(url) { const r = await fetch(url); if(!r.ok) throw new Error('Could not load content'); const data = await r.json(); if (!Array.isArray(data)) throw new Error('Invalid content list'); return data; }
  Promise.allSettled([getJSON('data/works.json'),getJSON('data/music.json')]).then(([films,music]) => {
    if (films.status === 'fulfilled') { works = films.value; renderWorks(); const screening = hallSelection(works, document.querySelector('#world')?.dataset.capacity).shown; initWorld(screening).catch(()=>false).then(on=>{ if(!on) initFilmGallery(screening); }); document.addEventListener('corner:world-lost',()=>initFilmGallery(hallSelection(works, document.querySelector('#world')?.dataset.capacity).shown),{once:true}); $('#work-filters').hidden = false; }
    else $('#works-status').textContent = '互動清單未載入，仍可點作品直接觀看。';
    if (music.status === 'fulfilled') { tracks = music.value; renderTracks(); $('#music-filters').hidden = false; $('.search-label').hidden = false; $('#play-queue').hidden = false; }
    else $('#music-status').textContent = '互動清單未載入，仍可直接開啟音樂。';
    route();
  });
})();
