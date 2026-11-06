'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog = $('#player-dialog');
  const stage = $('#player-stage');
  let works = [], tracks = [], active = null, episode = 0, returnFocus = null, returnHash = '#works', player = null, timer = null, generation = 0;
  let musicFilter = 'song', youtubePromise;
  const duration = (seconds) => `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
  const external = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const playbackURL = (item) => item.src || external(item.episodes?.[0]?.youtubeId || item.youtubeId);

  function renderWorks(filter = 'all') {
    const shown = works.filter(w => filter === 'all' || w.category === filter);
    $('#work-grid').innerHTML = shown.map((w) => `<article class="work-card ${escape(w.category)}"><a class="poster-link" href="${escape(playbackURL(w))}" data-play="${escape(w.id)}" aria-label="播放${escape(w.title)}，${escape(w.subtitle)}"><img src="${escape(w.poster)}" alt="${escape(w.title)}作品畫面" loading="lazy" width="1280" height="720"><span class="play-circle" aria-hidden="true">▶</span><span class="poster-meta">${w.episodes ? `${w.episodes.length} 集 · 選集播放` : escape(w.duration)}</span></a><div class="work-topline"><span>${escape(w.label)}</span><span>${String(works.indexOf(w) + 1).padStart(2, '0')} / CORNER CINEMA</span></div><h3><a class="work-title-link" href="${escape(playbackURL(w))}" data-play="${escape(w.id)}"><span>${escape(w.title)}</span><span aria-hidden="true">↗</span></a></h3><p class="subline">${escape(w.subtitle)}</p>${w.disclosure ? `<p class="disclosure">${escape(w.disclosure)}</p>` : ''}</article>`).join('');
    $('#work-count').textContent = `${shown.length} 組作品`;
  }
  function renderTracks() {
    const q = $('#music-search').value.trim().toLocaleLowerCase();
    const shown = tracks.filter(t => (musicFilter === 'all' || t.group === musicFilter) && `${t.title} ${t.version || ''}`.toLocaleLowerCase().includes(q));
    $('#track-list').innerHTML = shown.length ? shown.map((t,i) => `<a class="track" href="${escape(t.src)}" data-play="${escape(t.id)}" aria-label="播放${escape(t.title)}${t.version ? '，' + escape(t.version) : ''}"><span class="track-number">${String(i + 1).padStart(2,'0')}</span><span class="track-info"><span class="track-title">${escape(t.title)}</span><span class="track-type">${t.group === 'song' ? '歌曲' : '影像配樂'}${t.version ? ' · ' + escape(t.version) : ''}</span></span><span class="track-duration">${duration(t.duration)}</span><span class="track-play" aria-hidden="true">▶</span></a>`).join('') : '<p class="empty">找不到這個曲名，換個關鍵字試試。</p>';
    $('#music-count').textContent = `${shown.length} 首可聆聽`;
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
  function setLocation() {
    const query = new URLSearchParams({watch: active.id});
    if (active.episodes) query.set('episode', String(episode + 1));
    history.replaceState(null, '', `#${query}`);
  }
  function playCurrent(autoplay) {
    stopMedia();
    const mine = generation;
    const item = active;
    const part = item.episodes?.[episode];
    const videoId = part?.youtubeId || (!item.src && item.youtubeId);
    $('#player-title').textContent = part ? part.title : item.title;
    $('#player-label').textContent = item.kind === 'audio' ? 'NOW LISTENING — 現在聆聽' : 'NOW SHOWING — 現在放映';
    $('#player-description').textContent = item.description || `${item.group === 'song' ? '歌曲' : '影像配樂'}${item.version ? '・' + item.version : ''}・AI 輔助音樂創作`;
    $('#player-disclosure').hidden = !item.disclosure;
    $('#player-disclosure').textContent = item.disclosure || '';
    $('#player-status').textContent = '';
    stage.classList.toggle('audio-stage', item.kind === 'audio');
    const fallback = $('#player-fallback');
    fallback.href = videoId ? external(videoId) : item.src;
    fallback.textContent = videoId ? '在 YouTube 開啟 ↗' : (item.kind === 'audio' ? '另開音樂 ↗' : '另開影片 ↗');
    fallback.setAttribute('aria-label', `${fallback.textContent.replace(' ↗','')}（另開新分頁）`);
    const picker = $('#episode-picker'); picker.hidden = !item.episodes;
    picker.innerHTML = item.episodes ? item.episodes.map((p,i) => `<button type="button" data-episode="${i}" aria-pressed="${episode === i}">${item.id === 'changye' ? (i ? '第 1 集・下' : '第 1 集・上') : `第 ${i + 1} 集`}</button>`).join('') : '';
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
      const media = document.createElement(item.kind === 'audio' ? 'audio' : 'video');
      media.controls = true; media.preload = 'metadata'; media.src = item.src;
      if (item.poster) media.poster = item.poster;
      if (item.kind !== 'audio') media.playsInline = true;
      media.setAttribute('aria-label', item.title);
      media.addEventListener('error', () => { if(mine === generation) $('#player-status').textContent = '媒體載入失敗，請確認網路後重新開啟，或使用上方另開連結。'; });
      media.addEventListener('waiting', () => { if(mine === generation) $('#player-status').textContent = '正在緩衝…'; });
      media.addEventListener('playing', () => { if(mine === generation) $('#player-status').textContent = ''; });
      stage.append(media);
      if (autoplay) media.play().catch(() => { if(mine === generation && !media.error) $('#player-status').textContent = '按播放器的播放鍵開始。'; });
    }
  }
  function openPlayer(id, requestedEpisode = 0, autoplay = true, updateURL = true) {
    const item = [...works, ...tracks].find(w => w.id === id);
    if (!item || !dialog.showModal) return false;
    if (!dialog.open) {
      returnFocus = document.activeElement;
      returnHash = location.hash.startsWith('#watch=') ? (item.kind === 'audio' ? '#music' : '#works') : (location.hash || '#works');
      dialog.showModal(); document.body.classList.add('modal-open');
      $('.close-player').focus();
    }
    active = item; episode = Math.max(0,Math.min(Number.isFinite(requestedEpisode) ? requestedEpisode : 0, (item.episodes?.length || 1) - 1));
    playCurrent(autoplay);
    if (updateURL) setLocation();
    return true;
  }
  function closePlayer(updateURL = true) {
    if (!dialog.open) return;
    stopMedia(); dialog.close(); active = null; document.body.classList.remove('modal-open');
    if (updateURL && location.hash.startsWith('#watch=')) history.replaceState(null, '', returnHash);
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function route() {
    if (location.hash.startsWith('#watch=')) {
      const p = new URLSearchParams(location.hash.slice(1));
      const id = p.get('watch'), index = parseInt(p.get('episode') || '1',10) - 1;
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
    const nodes = [...dialog.querySelectorAll('button, a[href], video, audio, iframe, [tabindex="0"]')].filter(n => !n.disabled && !n.closest('[hidden]') && n.getClientRects().length);
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
  async function getJSON(url) { const r = await fetch(url); if(!r.ok) throw new Error('Could not load content'); return r.json(); }
  Promise.allSettled([getJSON('data/works.json'),getJSON('data/music.json')]).then(([films,music]) => {
    if (films.status === 'fulfilled') { works = films.value; renderWorks(); $('#work-filters').hidden = false; }
    else $('#work-grid').innerHTML = '<p>作品清單暫時無法載入。<a class="text-link" href="catalog.html">開啟完整作品目錄</a></p>';
    if (music.status === 'fulfilled') { tracks = music.value; renderTracks(); $('#music-filters').hidden = false; }
    else $('#track-list').innerHTML = '<p>音樂清單暫時無法載入。<a class="text-link" href="catalog.html#songs">開啟音樂目錄</a></p>';
    route();
  });
})();
