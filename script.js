// === Configuration: Multiple Sources ===
const PLAYLISTS = {
    ph: { name: "Philippines", url: "https://iptv-org.github.io/iptv/countries/ph.m3u" },
    us: { name: "United States", url: "https://iptv-org.github.io/iptv/countries/us.m3u" },
    uk: { name: "United Kingdom", url: "https://iptv-org.github.io/iptv/countries/uk.m3u" },
    ca: { name: "Canada", url: "https://iptv-org.github.io/iptv/countries/ca.m3u" },
    au: { name: "Australia", url: "https://iptv-org.github.io/iptv/countries/au.m3u" },
    global_news: { name: "Global News", url: "https://iptv-org.github.io/iptv/categories/news.m3u" },
    global_sports: { name: "Global Sports", url: "https://iptv-org.github.io/iptv/categories/sports.m3u" },
    global_movies: { name: "Global Movies", url: "https://iptv-org.github.io/iptv/categories/movies.m3u" }
};

const channelSelect = document.getElementById('channel-select');
const sourceSelect = document.getElementById('source-select');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('search-input');
const favToggleBtn = document.getElementById('fav-toggle-btn');
const addFavBtn = document.getElementById('add-fav-btn');

let channels = [];
let filteredChannels = [];
let hls = null;
let showFavoritesOnly = false;
let favorites = JSON.parse(localStorage.getItem('tvFavorites')) || [];

const CORS_PROXY = 'https://corsproxy.io/?'; 

function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#ef4444' : '#8b949e';
}

// === Stop Stream Function ===
function stopStream() {
    if (hls) { hls.destroy(); hls = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
}

// === Load Playlist ===
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

        applyFilters();
        setStatus(`Loaded ${channels.length} channels from ${playlistInfo.name}.`);
    } catch (error) {
        setStatus('❌ Error loading playlist: ' + error.message, true);
        console.error(error);
    }
}

// === Filter & Populate ===
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    filteredChannels = channels.filter(ch => {
        const matchesSearch = ch.name.toLowerCase().includes(searchTerm);
        const matchesFav = showFavoritesOnly ? favorites.includes(ch.name) : true;
        return matchesSearch && matchesFav;
    });
    populateDropdown();
}

function populateDropdown() {
    channelSelect.innerHTML = '<option value="">-- Select a Channel --</option>';
    const sortedFiltered = [...filteredChannels].sort((a, b) => a.name.localeCompare(b.name));
    filteredChannels = sortedFiltered;

    filteredChannels.forEach((ch, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = ch.name;
        channelSelect.appendChild(option);
    });
}

// === Play Stream ===
function playStream(originalUrl, name) {
    stopStream(); // Tawgon ang stopStream function
    setStatus(`⏳ Loading ${name}...`);

    let finalUrl = originalUrl;
    if (window.location.protocol === 'https:' && originalUrl.startsWith('http:')) {
        finalUrl = CORS_PROXY + encodeURIComponent(originalUrl);
    }

    if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30, enableWorker: true });
        hls.loadSource(finalUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().then(() => {
                setStatus(`▶ Now Playing: ${name}`);
                updateFavIcon(name);
            }).catch(() => {
                setStatus(`▶ Ready: ${name}. Click play on the video.`);
            });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    setStatus(`⚠️ Network error. Try another channel.`, true);
                    hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    setStatus(`⚠️ Media error. Recovering...`, true);
                    hls.recoverMediaError();
                } else {
                    setStatus(`❌ Failed to play. Dead link.`, true);
                    hls.destroy(); hls = null;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl;
        video.addEventListener('loadedmetadata', () => {
            video.play();
            setStatus(`▶ Now Playing: ${name}`);
            updateFavIcon(name);
        }, { once: true });
    }
}

// === Favorites ===
function updateFavIcon(channelName) {
    if (favorites.includes(channelName)) {
        addFavBtn.textContent = '★';
        addFavBtn.classList.add('active');
    } else {
        addFavBtn.textContent = '☆';
        addFavBtn.classList.remove('active');
    }
}

addFavBtn.addEventListener('click', () => {
    const index = channelSelect.value;
    if (index === '') return;
    const chName = filteredChannels[index].name;
    if (favorites.includes(chName)) {
        favorites = favorites.filter(f => f !== chName);
    } else {
        favorites.push(chName);
    }
    localStorage.setItem('tvFavorites', JSON.stringify(favorites));
    updateFavIcon(chName);
});

// === EVENTS ===
searchInput.addEventListener('input', applyFilters);

favToggleBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    favToggleBtn.classList.toggle('active');
    applyFilters();
});

playBtn.addEventListener('click', () => {
    const index = channelSelect.value;
    if (index === '') { setStatus('Please select a channel first.', true); return; }
    playStream(filteredChannels[index].url, filteredChannels[index].name);
});

stopBtn.addEventListener('click', () => {
    stopStream();
    setStatus('⏹ Stopped.');
});

channelSelect.addEventListener('change', () => {
    if (channelSelect.value !== '') {
        const ch = filteredChannels[channelSelect.value];
        updateFavIcon(ch.name);
        playStream(ch.url, ch.name);
    }
});

// Pina-importante: Ang Event Listener sa Source Selector
sourceSelect.addEventListener('change', (e) => {
    console.log("Source changed to:", e.target.value); // Log para makita nimo sa Console
    stopStream();
    loadPlaylist(e.target.value);
});

// === Init ===
loadPlaylist('ph');
