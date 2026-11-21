// === Configuration ===
const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/countries/ph.m3u';

// === DOM Elements ===
const channelSelect = document.getElementById('channel-select');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const video = document.getElementById('video');
const statusEl = document.getElementById('status');

// === State ===
let channels = [];
let hls = null;

// === Helper: update status text ===
function setStatus(msg) {
    statusEl.textContent = msg;
}

// === Load ug parse sa M3U playlist ===
async function loadPlaylist() {
    try {
        const response = await fetch(PLAYLIST_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const lines = text.split('\n');
        let currentName = null;

        lines.forEach(line => {
            line = line.trim();

            if (line.startsWith('#EXTINF:')) {
                // Ang channel name naa after sa last comma
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
        setStatus(`Naka-load ${channels.length} channels. Pili og channel ug pindota ang Play.`);
    } catch (error) {
        setStatus('❌ Error loading playlist: ' + error.message);
        console.error(error);
    }
}

// === Populate ang dropdown ===
function populateDropdown() {
    channelSelect.innerHTML = '<option value="">-- Pili og Channel --</option>';

    // Sort alphabetically para mas organized
    channels.sort((a, b) => a.name.localeCompare(b.name));

    channels.forEach((ch, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = ch.name;
        channelSelect.appendChild(option);
    });
}

// === Play ang selected stream ===
function playStream(url, name) {
    // Clear previous instance
    if (hls) {
        hls.destroy();
        hls = null;
    }
    video.removeAttribute('src');
    video.load();

    setStatus('⏳ Nag-load sa stream...');

    if (Hls.isSupported()) {
        hls = new Hls({
            maxBufferLength: 30,
            enableWorker: true
        });
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {
                setStatus('▶ Pindota ang play button sa video.');
            });
            setStatus(`▶ Nag-play: ${name}`);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        setStatus('⚠️ Network error. Sulayi lain nga channel.');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        setStatus('⚠️ Media error. Sulayi lain nga channel.');
                        hls.recoverMediaError();
                        break;
                    default:
                        setStatus('❌ Dili ma-play ang stream. Sulayi lain.');
                        hls.destroy();
                        hls = null;
                        break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
            video.play();
            setStatus(`▶ Nag-play: ${name}`);
        }, { once: true });
    } else {
        setStatus('❌ Dili supported ang HLS sa imong browser.');
    }
}

// === Stop ang playback ===
function stopStream() {
    if (hls) {
        hls.destroy();
        hls = null;
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    setStatus('⏹ Naka-stop.');
}

// === Event listeners ===
playBtn.addEventListener('click', () => {
    const index = channelSelect.value;
    if (index === '') {
        setStatus('Palihog pili og channel una.');
        return;
    }
    const ch = channels[index];
    playStream(ch.url, ch.name);
});

stopBtn.addEventListener('click', stopStream);

// Auto-play kung mag-change og channel samtang nag-play
channelSelect.addEventListener('change', () => {
    if (hls && channelSelect.value !== '') {
        const ch = channels[channelSelect.value];
        playStream(ch.url, ch.name);
    }
});

// === Init ===
loadPlaylist();
