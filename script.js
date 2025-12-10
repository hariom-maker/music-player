// ====== DATA / ELEMENTS ======
const audio = document.getElementById('audio');
const cover = document.getElementById('cover');
const miniCover = document.getElementById('miniCover');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const rewBtn = document.getElementById('rew');
const ffBtn = document.getElementById('ff');
const progressBar = document.getElementById('progress');
const progressWrap = document.getElementById('progressWrap');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volSlider = document.getElementById('vol');
const muteBtn = document.getElementById('mute');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const playlistEl = document.getElementById('playlist');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const dropzone = document.getElementById('dropzone');
const searchInput = document.getElementById('search');
const themeSwitch = document.getElementById('themeSwitch');
const vizCanvas = document.getElementById('viz');
const blurBg = document.getElementById('blurBg');

let songs = [
  { title:"Song One", artist:"Artist A", src:"tracks/song1.mp3", cover:"covers/cover1.jpg" },
  { title:"Song Two", artist:"Artist B", src:"tracks/song2.mp3", cover:"covers/cover2.jpg" },
  { title:"Song Three", artist:"Artist C", src:"tracks/song3.mp3", cover:"covers/cover3.jpg" }
];

let current = 0, isPlaying=false, isShuffle=false, isRepeat=false;
let audioCtx, analyser, sourceNode, dataArray, bufferLength;

// ====== UI / PLAYLIST BUILD ======
function buildPlaylist(filter=''){
  playlistEl.innerHTML = '';
  songs.forEach((s,i)=>{
    if(filter && !(`${s.title} ${s.artist}`.toLowerCase().includes(filter.toLowerCase()))) return;
    const li = document.createElement('li');
    li.dataset.index = i;
    li.innerHTML = `
      <img src="${s.cover||''}" onerror="this.style.display='none'">
      <div class="track-meta">
        <div class="track-title">${s.title}</div>
        <div class="track-artist">${s.artist||''}</div>
      </div>
    `;
    li.addEventListener('click', ()=> { loadTrack(i); playAudio(); });
    playlistEl.appendChild(li);
  });
  highlightActive();
}
buildPlaylist();

// ====== LOAD / PLAY ======
function loadTrack(i){
  if(i < 0) i = songs.length-1;
  if(i >= songs.length) i = 0;
  current = i;
  const s = songs[i];
  audio.src = s.src;
  titleEl.textContent = s.title || 'Unknown';
  artistEl.textContent = s.artist || '';
  cover.src = s.cover || '';
  miniCover.src = s.cover || '';
  highlightActive();
  connectVisualizer(); // ensure analyser connects to current audio src
}

function playAudio(){
  audio.play().then(()=> {
    isPlaying = true;
    playBtn.textContent = '⏸';
  }).catch(e => console.warn(e));
}
function pauseAudio(){
  audio.pause();
  isPlaying = false;
  playBtn.textContent = '▶';
}

// ====== BUTTONS ======
playBtn.addEventListener('click', ()=> { if(!audio.src) loadTrack(current); isPlaying ? pauseAudio() : playAudio(); });
nextBtn.addEventListener('click', ()=> nextSong());
prevBtn.addEventListener('click', ()=> { if(audio.currentTime>3) audio.currentTime=0; else prevSong(); });
rewBtn.addEventListener('click', ()=> audio.currentTime = Math.max(0, audio.currentTime - 10));
ffBtn.addEventListener('click', ()=> audio.currentTime = Math.min(audio.duration||0, audio.currentTime + 10));
shuffleBtn.addEventListener('click', ()=> { isShuffle = !isShuffle; shuffleBtn.style.opacity = isShuffle?1:0.7; });
repeatBtn.addEventListener('click', ()=> { isRepeat = !isRepeat; repeatBtn.style.opacity = isRepeat?1:0.7; });

// next/prev actions
function nextSong(){
  if(isShuffle) current = Math.floor(Math.random()*songs.length);
  else current = (current+1) % songs.length;
  loadTrack(current); playAudio();
}
function prevSong(){
  current = (current-1 + songs.length) % songs.length;
  loadTrack(current); playAudio();
}

// ====== PROGRESS / TIME ======
audio.addEventListener('timeupdate', ()=>{
  if(audio.duration) {
    const p = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = p + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
  }
});
audio.addEventListener('loadedmetadata', ()=> {
  durationEl.textContent = formatTime(audio.duration);
});
progressWrap.addEventListener('click', (e)=>{
  const rect = progressWrap.getBoundingClientRect();
  const p = (e.clientX - rect.left) / rect.width;
  audio.currentTime = p * audio.duration;
});

// ====== VOLUME / MUTE ======
volSlider.addEventListener('input', ()=> { audio.volume = volSlider.value; muteBtn.textContent = audio.volume==0?'🔇':'🔊'; });
muteBtn.addEventListener('click', ()=> {
  if(audio.muted || audio.volume===0){ audio.muted=false; if(audio.volume===0){ audio.volume=0.6; volSlider.value=0.6 } muteBtn.textContent='🔊' }
  else { audio.muted=true; muteBtn.textContent='🔇' }
});

// ====== SEARCH ======
searchInput.addEventListener('input', ()=> buildPlaylist(searchInput.value));

// ====== END / REPEAT ======
audio.addEventListener('ended', ()=> {
  if(isRepeat) { audio.currentTime=0; playAudio(); }
  else nextSong();
});

// ====== FORMAT TIME ======
function formatTime(sec){
  if(!sec || isNaN(sec)) return '0:00';
  const s = Math.floor(sec % 60).toString().padStart(2,'0');
  const m = Math.floor(sec/60);
  return `${m}:${s}`;
}

// ====== HIGHLIGHT ACTIVE ======
function highlightActive(){
  document.querySelectorAll('#playlist li').forEach(li => li.classList.remove('active'));
  const li = playlistEl.querySelector(`li[data-index="${current}"]`);
  if(li) li.classList.add('active');
}

// ====== FILE UPLOAD / DRAG & DROP ======
uploadBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', (e)=> handleFiles(e.target.files));

dropzone.addEventListener('dragover', (e)=> { e.preventDefault(); dropzone.classList.add('dragover') });
dropzone.addEventListener('dragleave', ()=> dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e)=> { e.preventDefault(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files) });

function handleFiles(fileList){
  const files = Array.from(fileList).filter(f => f.type.startsWith('audio'));
  files.forEach(f => {
    const url = URL.createObjectURL(f);
    const name = f.name.replace(/\.[^/.]+$/, "");
    songs.push({ title:name, artist:'Local File', src:url, cover:'' });
  });
  buildPlaylist(searchInput.value);
  if(!audio.src) loadTrack(songs.length-1);
}

// ====== THEME TOGGLE ======
themeSwitch.addEventListener('change', ()=>{
  document.body.classList.toggle('light', themeSwitch.checked);
  document.body.classList.toggle('dark', !themeSwitch.checked);
});

// ====== VISUALIZER ======
function connectVisualizer(){
  try{
    if(!audio.src) return;
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      sourceNode = audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
  } catch(e){ console.warn('Visualizer init error', e) }
}
connectVisualizer();

// canvas draw
const canvas = vizCanvas;
const ctx = canvas.getContext('2d');
function resizeCanvas(){ canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); }
window.addEventListener('resize', ()=> { resizeCanvas(); });
resizeCanvas();

function draw(){
  requestAnimationFrame(draw);
  if(!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // background gradient blur tint
  blurBg.style.background = `linear-gradient(90deg, rgba(29,185,84,0.15), rgba(45,200,120,0.08))`;
  // draw bars
  const barWidth = w / bufferLength * 1.2;
  let x = 0;
  for(let i=0;i<bufferLength;i++){
    const v = dataArray[i] / 255;
    const barH = v * h * 0.9;
    const hue = 140 - v*100;
    ctx.fillStyle = `hsl(${hue},80%,50%)`;
    const y = h - barH;
    ctx.fillRect(x, y, barWidth*0.9, barH);
    x += barWidth;
  }
}
draw();

// ensure audio context resumes on user gesture (autoplay policies)
document.addEventListener('click', ()=> {
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
});

// ====== INIT ======
loadTrack(0);

// ====== Keyboard shortcuts ======
document.addEventListener('keydown', (e)=> {
  if(e.code==='Space'){ e.preventDefault(); isPlaying?pauseAudio():playAudio(); }
  else if(e.key==='ArrowRight') audio.currentTime = Math.min(audio.duration||0, audio.currentTime + 5);
  else if(e.key==='ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  else if(e.key==='ArrowUp') { audio.volume = Math.min(1, audio.volume + 0.05); volSlider.value=audio.volume; }
  else if(e.key==='ArrowDown') { audio.volume = Math.max(0, audio.volume - 0.05); volSlider.value=audio.volume; }
});
