# 📺 Philippine Free TV

A lightweight, web-based live TV player for publicly available Philippine channels. Built with vanilla HTML, CSS, and JavaScript.

## ✨ Features

- **Live Streaming:** Plays public `.m3u8` streams using HLS.js.
- **Modern UI:** Dark theme with glassmorphism effects, animated background, and responsive layout.
- **Auto-fetch Playlist:** Dynamically loads channels from a public M3U source (iptv-org).
- **No Dependencies:** Pure Vanilla JS, HTML, CSS (HLS.js loaded via CDN).

## 🚀 Live Demo

You can view the live deployment here:  
👉 **[https://seven25-ui.github.io/My-livetv/](https://seven25-ui.github.io/My-livetv/)**

## 🛠️ How to Run Locally

1. Clone this repository or download the files.
2. Make sure you have `index.html`, `style.css`, and `script.js` in the same folder.
3. Open `index.html` in your browser. 
   *(Note: For best results and to avoid CORS issues, run it using a local server like VS Code Live Server or `python -m http.server`)*.

## ⚠️ Disclaimer

- This project **does not host** any video streams. All streams are fetched from publicly available sources (specifically the [iptv-org](https://github.com/iptv-org/iptv) repository).
- Channel availability is **not guaranteed 24/7**. Some streams may be geo-restricted, offline, or removed by the provider.
- This project is for **educational and personal use only**. 

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
