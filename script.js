// === Configuration: Multiple Sources ===
const PLAYLISTS = {
    ph: {
        name: "Philippines",
        url: "https://iptv-org.github.io/iptv/countries/ph.m3u"
    },
    global: {
        name: "Global (All)",
        url: "https://iptv-org.github.io/iptv/index.m3u"
    },
    global_news: {
        name: "Global News",
        url: "https://iptv-org.github.io/iptv/categories/news.m3u"
    },
    global_sports: {
        name: "Global Sports",
        url: "https://iptv-org.github.io/iptv/categories/sports.m3u"
    },
    global_movies: {
        name: "Global Movies",
        url: "https://iptv-org.github.io/iptv/categories/movies.m3u"
    }
};

const channelSelect = document.getElementById('channel-select');
const sourceSelect = document.getElementById('source-select');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const video = document.getElementById('video');
const statusEl = document.getElementById('status');

let channels = [];
let hls = null;

// Helper: Public CORS Proxy para ma-bypass ang HTTP restriction
// Kini nga proxy kay libre apan usahay hinay.
const CORS_PROXY = 'https://corsproxy.io/?'; 

function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#ef4444' : '#8b949e';
}

// === Load Playlist Base sa Gi-pili nga Source ===
async function loadPlaylist(sourceKey) {
    channelSelect.innerHTML = '<option value="">-- Loading channels... --</option>';
    channels = [];
    
    const playlistInfo = PLAYLISTS[sourceKey];
    if (!playlistInfo) return;

    setStatus(`Loading ${playlistInfo.name}...`);

    try {
        const response = await fetch(playlistInfo.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const lines = text.split('\n');
        let currentName = null;

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                const parts = line.split(',');
                if (parts.length > 1) {
                    currentName = parts[parts.length - 1].trim();
                }
            } else if (line.startsWith('http') && currentName) {
                channels.push({ name: currentName, url: line });
                currentName = null;
            }
        });

        populateDropdown();
        setStatus(`Loaded ${channels.length} channels from ${playlistInfo.name}.`);
    } catch (error) {
        setStatus('❌ Error loading playlist: ' + error.message, true);
        console.error(error);
    }
}

function populateDropdown() {
    channelSelect.innerHTML = '<option value="">-- Select a Channel --</option>';
    channels.sort((a, b) => a.name.localeCompare(b.name));

    channels.forEach((ch, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = ch.name;
        channelSelect.appendChild(option);
    });
}

function playStream(originalUrl, name) {
    if (hls) { hls.destroy(); hls = null; }
    video.removeAttribute('src');
    video.load();
    setStatus(`⏳ Loading ${name}...`);

    let finalUrl = originalUrl;

    // 🔥 MIXED CONTENT FIX: Kung HTTP ang stream ug HTTPS ang site, gamit og proxy
    if (window.location.protocol === 'https:' && originalUrl.startsWith('http:')) {
        finalUrl = CORS_PROXY + encodeURIComponent(originalUrl);
        setStatus(`⏳ Bypassing HTTP restriction for ${name}...`);
    }

    if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30, enableWorker: true });
        hls.loadSource(finalUrl); // Gamita ang finalUrl (proxied kung HTTP)
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().then(() => {
                setStatus(`▶ Now Playing: ${name}`);
            }).catch(() => {
                setStatus(`▶ Ready: ${name}. Click play on the video.`);
            });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        setStatus(`⚠️ Network error for ${name}. Stream might be offline.`, true);
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        setStatus(`⚠️ Media error for ${name}. Trying to recover...`, true);
                        hls.recoverMediaError();
                        break;
                    default:
                        setStatus(`❌ Failed to play ${name}. Dead link or blocked by proxy.`, true);
                        hls.destroy(); hls = null;
                        break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl; // Safari native support
        video.addEventListener('loadedmetadata', () => {
            video.play();
            setStatus(`▶ Now Playing: ${name}`);
        }, { once: true });
    } else {
        setStatus('❌ HLS not supported.', true);
    }
}

function stopStream() {
    if (hls) { hls.destroy(); hls = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
    setStatus('⏹ Stopped.');
}

// === Event Listeners ===
playBtn.addEventListener('click', () => {
    const index = channelSelect.value;
    if (index === '') { setStatus('Please select a channel first.', true); return; }
    const ch = channels[index];
    playStream(ch.url, ch.name);
});

stopBtn.addEventListener('click', stopStream);

channelSelect.addEventListener('change', () => {
    if (channelSelect.value !== '') {
        const ch = channels[channelSelect.value];
        playStream(ch.url, ch.name);
    }
});

if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
        stopStream();
        loadPlaylist(e.target.value);
    });
}

// === Init ===
loadPlaylist('ph');
