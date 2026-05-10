/* === SECTION: CUSTOM DROPDOWN ENGINE === */
function createDropdown(
  options,
  { id, selected, onChange, searchable, placeholder }
) {
  const selectedOpt = options.find((o) => o.value === selected) || options[0];
  const showSearch = searchable && options.length > 6;
  let html = `<div class="custom-dropdown" data-dropdown-id="${id}">`;
  html += `<div class="custom-dropdown-trigger" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">${
    selectedOpt ? selectedOpt.label : placeholder || "Select..."
  }</div>`;
  html += `<div class="custom-dropdown-menu" role="listbox">`;
  if (showSearch) {
    html += `<input type="text" class="custom-dropdown-search" placeholder="Search..." autocomplete="off">`;
  }
  html += `<div class="custom-dropdown-options">`;
  for (const opt of options) {
    html += `<div class="custom-dropdown-option${
      opt.value === selected ? " selected" : ""
    }" data-value="${opt.value}" role="option">${opt.label}</div>`;
  }
  html += `</div></div></div>`;
  return html;
}

function initDropdowns(container) {
  const dropdowns = (container || document).querySelectorAll(
    ".custom-dropdown:not([data-initialized])"
  );
  dropdowns.forEach((dd) => {
    dd.setAttribute("data-initialized", "1");
    const trigger = dd.querySelector(".custom-dropdown-trigger");
    const menu = dd.querySelector(".custom-dropdown-menu");
    const optionsContainer = dd.querySelector(".custom-dropdown-options");
    const searchInput = dd.querySelector(".custom-dropdown-search");
    const ddId = dd.getAttribute("data-dropdown-id");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close all others
      document.querySelectorAll(".custom-dropdown.open").forEach((d) => {
        if (d !== dd) d.classList.remove("open");
      });
      dd.classList.toggle("open");
      if (dd.classList.contains("open") && searchInput) {
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger.click();
      } else if (e.key === "Escape") {
        dd.classList.remove("open");
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();
        const opts = optionsContainer.querySelectorAll(
          ".custom-dropdown-option"
        );
        let visible = 0;
        opts.forEach((o) => {
          const match = o.textContent.toLowerCase().includes(q);
          o.style.display = match ? "" : "none";
          if (match) visible++;
        });
        let empty = optionsContainer.querySelector(".custom-dropdown-empty");
        if (visible === 0 && !empty) {
          empty = document.createElement("div");
          empty.className = "custom-dropdown-empty";
          empty.textContent = "No results";
          optionsContainer.appendChild(empty);
        } else if (visible > 0 && empty) {
          empty.remove();
        }
      });
      searchInput.addEventListener("click", (e) => e.stopPropagation());
    }

    optionsContainer.addEventListener("click", (e) => {
      const opt = e.target.closest(".custom-dropdown-option");
      if (!opt) return;
      e.stopPropagation();
      const value = opt.getAttribute("data-value");
      const label = opt.textContent;
      // Update selection
      optionsContainer
        .querySelectorAll(".custom-dropdown-option")
        .forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      trigger.textContent = label;
      dd.classList.remove("open");
      // Sync hidden select if present
      const hiddenSelect = dd.parentElement.querySelector("select#" + ddId);
      if (hiddenSelect) {
        hiddenSelect.value = value;
        hiddenSelect.dispatchEvent(new Event("change"));
      }
      // Fire onchange on the select element
      if (ddId && window["_dropdown_change_" + ddId]) {
        window["_dropdown_change_" + ddId](value);
      }
    });
  });
}

// Close dropdowns when clicking outside
document.addEventListener("click", () => {
  document
    .querySelectorAll(".custom-dropdown.open")
    .forEach((d) => d.classList.remove("open"));
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document
      .querySelectorAll(".custom-dropdown.open")
      .forEach((d) => d.classList.remove("open"));
  }
});

/* === SECTION: JS CONFIG AND STATE === */
const API_KEY = "b4cfa4ecfc855af75ebec1745dc3f155";
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/";
const VIDKING = "https://www.vidking.net/embed";
const AUTOEMBED_SERVERS = 21;
// Extraction runs on the same server (same origin)
const EXTRACT_BASE = '';
// Track whether we're using custom player or iframe fallback
let usingCustomPlayer = false;
// Map server IDs to extraction server IDs
const EXTRACTABLE_SERVERS = { vidnest: 'vidnest', vidzee: 'vidzee', vidlink: 'vidlink', vidfast: 'vidfast', videasy: 'videasy', vidking: 'vidking' };
const ICONS = {
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  movie: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
  tv: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  pip: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.3"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  subtitle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="18" y2="14"/><line x1="6" y1="18" x2="14" y2="18"/></svg>`,
  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  bolt: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  playCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  film: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  paw: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18c-1.5 2-4 3-6 2s-2-3.5-1-5c1.5-2 4-3 6-2s2 3.5 1 5zm6-2c1 1.5 1 4-1 5s-4.5 0-6-2c-1-1.5-1-4 1-5s4.5 0 6 2zM8 11c0 1.5-1 3-2.5 3S3 12.5 3 11s1-3 2.5-3S8 9.5 8 11zm8 0c0 1.5 1 3 2.5 3S21 12.5 21 11s-1-3-2.5-3S16 9.5 16 11zm-4-4c0 1.5-1 3-2.5 3S7 8.5 7 7s1-3 2.5-3S12 5.5 12 7z"/></svg>',
};
const SERVERS = [
  {
    id: "vidnest",
    name: "VidNest",
    icon: "bolt",
    desc: "Primary HD Server",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://vidnest.fun/movie/${id}`
        : `https://vidnest.fun/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidzee",
    name: "VidZee",
    icon: "bolt",
    desc: "HD Server",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://player.vidzee.wtf/embed/movie/${id}`
        : `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidlink",
    name: "VidLink",
    icon: "bolt",
    desc: "HD Server",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidfast",
    name: "VidFast",
    icon: "bolt",
    desc: "HD Server",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://vidfast.pro/movie/${id}?autoPlay=true&theme=e50914`
        : `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true&theme=e50914&nextButton=true&autoNext=true`,
  },
  {
    id: "videasy",
    name: "Videasy",
    icon: "bolt",
    desc: "HD Server",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://player.videasy.net/movie/${id}?color=e50914&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true`
        : `https://player.videasy.net/tv/${id}/${s}/${e}?color=e50914&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true`,
  },
  {
    id: "vidking",
    name: "Vidking",
    icon: "film",
    desc: "HD with autoplay",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://www.vidking.net/embed/movie/${id}?color=e50914&autoPlay=true`
        : `https://www.vidking.net/embed/tv/${id}/${s}/${e}?color=e50914&autoPlay=true&nextEpisode=true&episodeSelector=true`,
  },
  {
    id: "autoembed",
    name: "AutoEmbed",
    icon: "playCircle",
    desc: "Multi-server (21 servers)",
    isDropdown: true,
    buildUrl: (id, type, s, e, server = 1) =>
      type === "movie"
        ? `https://player.autoembed.app/embed/movie/${id}?server=${server}`
        : `https://player.autoembed.app/embed/tv/${id}/${s}/${e}?server=${server}`,
  },
  {
    id: "vidsrcnl",
    name: "VidSrc NL",
    icon: "film",
    desc: "EU backup server",
    buildUrl: (id, type, s, e) =>
      type === "movie"
        ? `https://player.vidsrc.nl/embed/movie/${id}`
        : `https://player.vidsrc.nl/embed/tv/${id}/${s}/${e}`,
  },
];
let currentServer = SERVERS[0];
let currentAutoEmbedServer = 1;
const cache = {};
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "KR", name: "South Korea" },
  { code: "JP", name: "Japan" },
  { code: "IN", name: "India" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
];
let state = {
  page: "home",
  moviePage: 1,
  tvPage: 1,
  searchPage: 1,
  searchQuery: "",
  movieFilters: {},
  tvFilters: {},
  movieGenres: [],
  tvGenres: [],
};

/* === SECTION: JS PERFORMANCE UTILITIES === */
// Connection-aware image quality
function getOptimalImgSize() {
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (conn) {
    if (conn.saveData) return "w154";
    if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")
      return "w154";
    if (conn.effectiveType === "3g") return "w342";
  }
  return "w500";
}

// IntersectionObserver for progressive image loading
const _imgObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
        _imgObserver.unobserve(img);
      }
    });
  },
  { rootMargin: "200px" }
);

// Call after DOM updates to observe new lazy images
function observeLazyImages(container) {
  const imgs = (container || document).querySelectorAll("img[data-src]");
  imgs.forEach((img) => _imgObserver.observe(img));
}

// Debounce utility
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Throttle utility
function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// Batch DOM updates to avoid thrashing
function batchDOMUpdate(el, html) {
  requestAnimationFrame(() => {
    el.innerHTML = html;
  });
}

/* === SECTION: JS API FUNCTIONS === */
const CACHE_MAX = 200;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const cacheTimestamps = {};

// In-flight request deduplication
const _inflight = {};

async function api(endpoint) {
  if (
    cache[endpoint] &&
    Date.now() - (cacheTimestamps[endpoint] || 0) < CACHE_TTL
  )
    return cache[endpoint];
  // Deduplicate concurrent requests to same endpoint
  if (_inflight[endpoint]) return _inflight[endpoint];
  _inflight[endpoint] = (async () => {
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${BASE}${endpoint}${sep}api_key=${API_KEY}`);
      const data = await res.json();
      // Evict oldest entries if cache is full
      const keys = Object.keys(cache);
      if (keys.length >= CACHE_MAX) {
        const oldest = keys
          .sort((a, b) => (cacheTimestamps[a] || 0) - (cacheTimestamps[b] || 0))
          .slice(0, 50);
        oldest.forEach((k) => {
          delete cache[k];
          delete cacheTimestamps[k];
        });
      }
      cache[endpoint] = data;
      cacheTimestamps[endpoint] = Date.now();
      return data;
    } catch (e) {
      console.error(e);
      return { results: [] };
    } finally {
      delete _inflight[endpoint];
    }
  })();
  return _inflight[endpoint];
}

const getTrending = () => api("/trending/all/week");
const getPopularMovies = (p = 1) => api(`/movie/popular?page=${p}`);
const getTopMovies = () => api("/movie/top_rated");
const getNowPlaying = () => api("/movie/now_playing");
const getPopularTV = (p = 1) => api(`/tv/popular?page=${p}`);
const getTopTV = () => api("/tv/top_rated");
const searchMulti = (q, p = 1) =>
  api(`/search/multi?query=${encodeURIComponent(q)}&page=${p}`);
const getMovieDetails = (id) => api(`/movie/${id}`);
const getTVDetails = (id) => api(`/tv/${id}`);
const getTVSeason = (id, s) => api(`/tv/${id}/season/${s}`);
const getSimilarMovies = (id) => api(`/movie/${id}/similar`);
const getSimilarTV = (id) => api(`/tv/${id}/similar`);
const getMovieGenres = () => api("/genre/movie/list");
const getTVGenres = () => api("/genre/tv/list");
const getRecommendationsMovie = (id) => api(`/movie/${id}/recommendations`);
const getRecommendationsTV = (id) => api(`/tv/${id}/recommendations`);
const discoverByGenre = (genreId, type = "movie") =>
  api(`/discover/${type}?sort_by=popularity.desc&with_genres=${genreId}`);

// Get trailer video key from TMDB
const getVideos = (id, type) => api(`/${type}/${id}/videos`);

function discoverMovies(page = 1, filters = {}) {
  let ep = `/discover/movie?page=${page}&sort_by=popularity.desc&vote_count.gte=100`;
  if (filters.genre) ep += `&with_genres=${filters.genre}`;
  if (filters.year) ep += `&primary_release_year=${filters.year}`;
  if (filters.country) ep += `&with_origin_country=${filters.country}`;
  if (filters.rating && filters.rating !== "all")
    ep += `&vote_average.gte=${filters.rating}`;
  return api(ep);
}

function discoverTV(page = 1, filters = {}) {
  let ep = `/discover/tv?page=${page}&sort_by=popularity.desc&vote_count.gte=100`;
  if (filters.genre) ep += `&with_genres=${filters.genre}`;
  if (filters.year) ep += `&first_air_date_year=${filters.year}`;
  if (filters.country) ep += `&with_origin_country=${filters.country}`;
  if (filters.rating && filters.rating !== "all")
    ep += `&vote_average.gte=${filters.rating}`;
  return api(ep);
}

// WATCH PROGRESS
function getProgress() {
  return JSON.parse(localStorage.getItem("nekoflix_progress") || "{}");
}
function saveProgress(id, type, data) {
  const p = getProgress();
  p[`${type}_${id}`] = { ...data, timestamp: Date.now() };
  localStorage.setItem("nekoflix_progress", JSON.stringify(p));
}
function getContinueWatching() {
  const p = getProgress();
  return Object.entries(p)
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .slice(0, 20)
    .map(([k, v]) => ({ key: k, ...v }));
}

/* === SECTION: JS WATCHLIST FUNCTIONS === */
function getWatchlist() {
  return JSON.parse(localStorage.getItem("nekoflix_watchlist") || "[]");
}
function saveWatchlist(list) {
  localStorage.setItem("nekoflix_watchlist", JSON.stringify(list));
}
function isInWatchlist(id) {
  return getWatchlist().some((item) => item.id == id);
}
function toggleWatchlist(item) {
  let list = getWatchlist();
  const exists = list.findIndex((w) => w.id == item.id);
  if (exists > -1) {
    list.splice(exists, 1);
  } else {
    list.push({
      id: item.id,
      type: item.media_type || mediaType(item),
      title: item.title || item.name,
      poster_path: item.poster_path,
      vote_average: item.vote_average,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      added_at: Date.now(),
    });
  }
  saveWatchlist(list);
  document
    .querySelectorAll(`.card-add-btn[data-id="${item.id}"]`)
    .forEach((btn) => {
      btn.classList.toggle("in-list", isInWatchlist(item.id));
      btn.innerHTML = isInWatchlist(item.id) ? ICONS.check : ICONS.plus;
    });
}

/* === SECTION: JS CUSTOM COLLECTIONS === */
function getCollections() {
  return JSON.parse(localStorage.getItem("nekoflix_collections") || "[]");
}
function saveCollections(collections) {
  localStorage.setItem("nekoflix_collections", JSON.stringify(collections));
}
function createCollection(name) {
  const collections = getCollections();
  const id =
    "col_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  collections.push({ id, name, items: [], created_at: Date.now() });
  saveCollections(collections);
  return id;
}
function renameCollection(colId, newName) {
  const collections = getCollections();
  const col = collections.find((c) => c.id === colId);
  if (col) {
    col.name = newName;
    saveCollections(collections);
  }
}
function deleteCollection(colId) {
  const collections = getCollections().filter((c) => c.id !== colId);
  saveCollections(collections);
}
function addToCollection(colId, item) {
  const collections = getCollections();
  const col = collections.find((c) => c.id === colId);
  if (!col) return;
  if (col.items.some((i) => i.id == item.id)) return; // no duplicates
  col.items.push({
    id: item.id,
    type: item.media_type || mediaType(item),
    title: item.title || item.name,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    added_at: Date.now(),
  });
  saveCollections(collections);
}
function removeFromCollection(colId, itemId) {
  const collections = getCollections();
  const col = collections.find((c) => c.id === colId);
  if (!col) return;
  col.items = col.items.filter((i) => i.id != itemId);
  saveCollections(collections);
}

function showCollectionModal(mode, colId) {
  let overlay = document.getElementById("collectionModalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "collectionModalOverlay";
    overlay.className = "collection-modal-overlay";
    overlay.innerHTML = `<div class="collection-modal">
      <h3 id="colModalTitle">New Collection</h3>
      <input type="text" id="colModalInput" placeholder="Collection name..." maxlength="50">
      <div class="collection-modal-actions">
        <button class="btn-cancel" onclick="hideCollectionModal()">Cancel</button>
        <button class="btn-confirm" id="colModalConfirm">Create</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hideCollectionModal();
    });
  }
  const title = document.getElementById("colModalTitle");
  const input = document.getElementById("colModalInput");
  const confirm = document.getElementById("colModalConfirm");
  if (mode === "rename") {
    const col = getCollections().find((c) => c.id === colId);
    title.textContent = "Rename Collection";
    input.value = col ? col.name : "";
    confirm.textContent = "Save";
    confirm.onclick = () => {
      const name = input.value.trim();
      if (name) {
        renameCollection(colId, name);
        hideCollectionModal();
        renderCollections();
      }
    };
  } else {
    title.textContent = "New Collection";
    input.value = "";
    confirm.textContent = "Create";
    confirm.onclick = () => {
      const name = input.value.trim();
      if (name) {
        createCollection(name);
        hideCollectionModal();
        renderCollections();
      }
    };
  }
  overlay.classList.add("visible");
  setTimeout(() => input.focus(), 100);
}
function hideCollectionModal() {
  const overlay = document.getElementById("collectionModalOverlay");
  if (overlay) overlay.classList.remove("visible");
}

function renderCollections() {
  const main = document.getElementById("mainContent");
  const collections = getCollections();
  let html = `<h1 class="page-title">My Collections</h1>`;
  html += `<div class="collections-section">`;
  html += `<div class="collections-header"><h2>Your Playlists</h2><button class="btn-new-collection" onclick="showCollectionModal('create')">${ICONS.plus} New Collection</button></div>`;

  if (collections.length === 0) {
    html += `<div class="watchlist-empty"><div class="empty-icon">${ICONS.film}</div><h3>No collections yet</h3><p>Create playlists to organize your favorite movies and shows.</p></div>`;
  } else {
    html += `<div class="collections-grid">`;
    collections.forEach((col) => {
      const previews = col.items.slice(0, 4);
      html += `<div class="collection-card" onclick="openUserCollection('${col.id}')">`;
      html += `<div class="collection-card-actions">`;
      html += `<button class="collection-action-btn" onclick="event.stopPropagation();showCollectionModal('rename','${col.id}')" title="Rename">${ICONS.settings}</button>`;
      html += `<button class="collection-action-btn" onclick="event.stopPropagation();confirmDeleteCollection('${col.id}')" title="Delete">${ICONS.trash}</button>`;
      html += `</div>`;
      html += `<div class="collection-card-header"><span class="collection-card-name">${
        col.name
      }</span><span class="collection-card-count">${col.items.length} item${
        col.items.length !== 1 ? "s" : ""
      }</span></div>`;
      html += `<div class="collection-card-previews">`;
      for (let i = 0; i < 4; i++) {
        if (previews[i] && previews[i].poster_path) {
          html += `<img src="${imgUrl(
            previews[i].poster_path,
            "w154"
          )}" alt="">`;
        } else {
          html += `<div class="empty-slot">+</div>`;
        }
      }
      html += `</div></div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  main.innerHTML = html;
}

function confirmDeleteCollection(colId) {
  const col = getCollections().find((c) => c.id === colId);
  if (col && confirm(`Delete "${col.name}"? This cannot be undone.`)) {
    deleteCollection(colId);
    renderCollections();
  }
}

function openUserCollection(colId) {
  const collections = getCollections();
  const col = collections.find((c) => c.id === colId);
  if (!col) return;
  const main = document.getElementById("mainContent");
  let html = `<div class="collection-detail-header">
    <button class="btn btn-icon" onclick="renderCollections()" style="background:var(--surface2);padding:8px 12px;border-radius:8px">${
      ICONS.arrowLeft
    }</button>
    <h1>${col.name}</h1>
    <span class="collection-meta">${col.items.length} item${
    col.items.length !== 1 ? "s" : ""
  }</span>
  </div>`;
  if (col.items.length === 0) {
    html += `<div class="watchlist-empty"><div class="empty-icon">${ICONS.plus}</div><h3>This collection is empty</h3><p>Add movies and shows from their detail page or long-press menu.</p></div>`;
  } else {
    html += `<div class="collection-detail-grid">`;
    col.items.forEach((item) => {
      html += `<div class="card" onclick="showModal(${item.id},'${
        item.type
      }')" style="width:100%">
        <div class="card-img" style="padding-top:150%;position:relative">
          <img src="${imgUrl(item.poster_path, "w342")}" alt="${
        item.title
      }" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:var(--radius)">
          <button class="collection-action-btn" onclick="event.stopPropagation();removeFromCollection('${colId}',${
        item.id
      });openUserCollection('${colId}')" style="position:absolute;top:6px;right:6px;opacity:1" title="Remove">${
        ICONS.close
      }</button>
        </div>
        <div class="card-info"><span class="card-title">${
          item.title
        }</span></div>
      </div>`;
    });
    html += `</div>`;
  }
  main.innerHTML = html;
}

// Add to collection from context menu
function showAddToCollectionMenu(item) {
  const collections = getCollections();
  const ctxMenu = document.getElementById("contextMenu");
  // Remove old submenu if present
  let sub = ctxMenu.querySelector(".ctx-collections-sub");
  if (sub) sub.remove();
  if (collections.length === 0) {
    showCollectionModal("create");
    return;
  }
  sub = document.createElement("div");
  sub.className = "ctx-collections-sub";
  collections.forEach((col) => {
    const btn = document.createElement("button");
    btn.className = "ctx-collection-item";
    btn.textContent = col.name;
    btn.onclick = () => {
      addToCollection(col.id, item);
      hideContextMenu();
    };
    sub.appendChild(btn);
  });
  // Add "new collection" option
  const newBtn = document.createElement("button");
  newBtn.className = "ctx-collection-item";
  newBtn.innerHTML = `${ICONS.plus} New Collection`;
  newBtn.style.color = "var(--red)";
  newBtn.onclick = () => {
    hideContextMenu();
    showCollectionModal("create");
  };
  sub.appendChild(newBtn);
  ctxMenu.appendChild(sub);
}

/* === SECTION: JS PERSONALIZATION ENGINE === */
// Analyze user's watch history and watchlist to determine preferred genres
function getUserPreferences() {
  const progress = getProgress();
  const watchlist = getWatchlist();
  const genreCounts = {};
  const watchedIds = [];

  // Collect all watched/listed item IDs
  Object.keys(progress).forEach((key) => {
    const [type, id] = key.split("_");
    watchedIds.push({ id, type });
  });
  watchlist.forEach((item) => {
    if (!watchedIds.find((w) => w.id == item.id)) {
      watchedIds.push({ id: item.id, type: item.type });
    }
  });

  return { watchedIds, genreCounts };
}

// Get personalized recommendations based on watch history
async function getPersonalizedRecommendations() {
  const { watchedIds } = getUserPreferences();
  if (watchedIds.length === 0) return [];

  // Pick up to 4 recent items and get recommendations for each
  const recent = watchedIds.slice(0, 4);
  const recPromises = recent.map((item) => {
    return item.type === "movie"
      ? getRecommendationsMovie(item.id)
      : getRecommendationsTV(item.id);
  });

  const results = await Promise.all(recPromises);
  const allRecs = [];
  const seenIds = new Set(watchedIds.map((w) => w.id));

  results.forEach((data, idx) => {
    if (data.results) {
      data.results.forEach((item) => {
        if (!seenIds.has(String(item.id)) && item.poster_path) {
          seenIds.add(String(item.id));
          allRecs.push({
            ...item,
            media_type: item.media_type || recent[idx].type,
          });
        }
      });
    }
  });

  // Shuffle and return top 20
  return allRecs.sort(() => Math.random() - 0.5).slice(0, 20);
}

// Get genre-based personalized row (e.g. "Because you watched Action movies")
async function getGenreBasedRow() {
  const progress = getProgress();
  const watchedIds = Object.keys(progress).map((key) => {
    const [type, id] = key.split("_");
    return { id, type };
  });

  if (watchedIds.length === 0) return null;

  // Fetch details of most recent watched items to get their genres
  const recentItems = watchedIds.slice(0, 3);
  const details = await Promise.all(
    recentItems.map((item) =>
      item.type === "movie" ? getMovieDetails(item.id) : getTVDetails(item.id)
    )
  );

  // Count genres
  const genreMap = {};
  details.forEach((d) => {
    if (d && d.genres) {
      d.genres.forEach((g) => {
        genreMap[g.id] = genreMap[g.id] || { ...g, count: 0 };
        genreMap[g.id].count++;
      });
    }
  });

  // Get the top genre
  const topGenres = Object.values(genreMap).sort((a, b) => b.count - a.count);
  if (topGenres.length === 0) return null;

  const topGenre = topGenres[0];
  const genreContent = await discoverByGenre(topGenre.id, "movie");
  if (!genreContent.results || !genreContent.results.length) return null;

  return {
    title: `Because you're feline ${topGenre.name}`,
    items: genreContent.results
      .filter((i) => i.poster_path)
      .map((i) => ({ ...i, media_type: "movie" })),
  };
}

/* === SECTION: JS RENDER HELPERS === */
function imgUrl(path, size) {
  if (!path)
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect fill="%23222" width="200" height="300"/><text x="50%" y="50%" fill="%23555" text-anchor="middle" font-size="14">No Image</text></svg>';
  return `${IMG}${size || getOptimalImgSize()}${path}`;
}
function year(date) {
  return date ? date.substring(0, 4) : "";
}
function rating(v) {
  return v ? v.toFixed(1) : "N/A";
}
function mediaType(item) {
  return item.media_type || (item.first_air_date ? "tv" : "movie");
}
function truncate(str, n) {
  return str && str.length > n ? str.substring(0, n) + "..." : str || "";
}

function skeletonCards(n = 8) {
  return Array(n)
    .fill("")
    .map(
      () =>
        '<div class="skeleton-card"><div class="sk-img skeleton"></div><div class="sk-text skeleton"></div></div>'
    )
    .join("");
}

function cardHTML(item, index = 0) {
  if (item.vote_count !== undefined && item.vote_count < 100) return "";
  const type = mediaType(item);
  const title = item.title || item.name || "";
  const progress = getProgress()[`${type}_${item.id}`];
  const inList = isInWatchlist(item.id);
  const delay = Math.min(index * 0.05, 0.5);
  return `<div class="card card-animated" data-id="${
    item.id
  }" data-type="${type}" style="animation-delay:${delay}s">
    <img class="card-img" src="${imgUrl(
      item.poster_path
    )}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22><rect fill=%22%23222%22 width=%22200%22 height=%22300%22/></svg>'">
    <div class="card-overlay">
<span class="card-overlay-play">${ICONS.play}</span>
<span class="card-overlay-title">${title}</span>
    </div>
    <button class="card-add-btn ${inList ? "in-list" : ""}" data-id="${
    item.id
  }" data-type="${type}" data-title="${title.replace(
    /"/g,
    "&quot;"
  )}" data-poster="${item.poster_path || ""}" data-vote="${
    item.vote_average || 0
  }" data-release="${item.release_date || ""}" data-airdate="${
    item.first_air_date || ""
  }" onclick="event.stopPropagation();toggleWatchlistFromCard(this)">${
    inList ? ICONS.check : ICONS.plus
  }</button>
    <div class="card-info">
<div class="card-title">${title}</div>
<div class="card-meta">
  <span class="card-rating">${ICONS.star} ${rating(item.vote_average)}</span>
  <span class="card-year">${year(
    item.release_date || item.first_air_date
  )}</span>
  ${type === "tv" ? '<span class="card-type">TV</span>' : ""}
</div>
    </div>
    ${
      progress && progress.percent
        ? `<div class="progress-bar"><div class="progress-bar-fill" style="width:${progress.percent}%"></div></div>`
        : ""
    }
  </div>`;
}

function continueWatchingCardHTML(item, progressData, index = 0) {
  const type = mediaType(item);
  const title = item.title || item.name || "";
  const percent = progressData.percent || 0;
  const season = progressData.season || 1;
  const episode = progressData.episode || 1;
  const inList = isInWatchlist(item.id);
  const delay = Math.min(index * 0.05, 0.5);
  const resumeLabel = type === "tv" ? `S${season} E${episode}` : `${percent}%`;
  return `<div class="card card-animated" data-id="${
    item.id
  }" data-type="${type}" data-cw="true" data-season="${season}" data-episode="${episode}" style="animation-delay:${delay}s">
    <img class="card-img" src="${imgUrl(
      item.poster_path
    )}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22><rect fill=%22%23222%22 width=%22200%22 height=%22300%22/></svg>'">
    <div class="card-overlay">
<span class="card-overlay-play">${ICONS.play}</span>
<span class="card-overlay-title">${title}<br><small style="opacity:.7;font-weight:400">${resumeLabel}</small></span>
    </div>
    <button class="card-add-btn ${inList ? "in-list" : ""}" data-id="${
    item.id
  }" data-type="${type}" data-title="${title.replace(
    /"/g,
    "&quot;"
  )}" data-poster="${item.poster_path || ""}" data-vote="${
    item.vote_average || 0
  }" data-release="${item.release_date || ""}" data-airdate="${
    item.first_air_date || ""
  }" onclick="event.stopPropagation();toggleWatchlistFromCard(this)">${
    inList ? ICONS.check : ICONS.plus
  }</button>
    <div class="card-info">
<div class="card-title">${title}</div>
<div class="card-meta">
  <span class="card-rating">${ICONS.star} ${rating(item.vote_average)}</span>
  <span class="card-year">${resumeLabel}</span>
  ${type === "tv" ? '<span class="card-type">TV</span>' : ""}
</div>
    </div>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
  </div>`;
}

function continueWatchingRowHTML(title, items, id) {
  return `<div class="row row-animated" id="${id || ""}">
    <h2 class="row-title">${title}</h2>
    <div class="row-container">
<button class="row-arrow left" onclick="scrollRow(this,-1)">${
    ICONS.chevronLeft
  }</button>
<div class="row-scroll">${items.join("")}</div>
<button class="row-arrow right" onclick="scrollRow(this,1)">${
    ICONS.chevronRight
  }</button>
    </div>
  </div><div class="row-separator"></div>`;
}

function toggleWatchlistFromCard(btn) {
  const item = {
    id: btn.dataset.id,
    media_type: btn.dataset.type,
    title: btn.dataset.title,
    name: btn.dataset.title,
    poster_path: btn.dataset.poster || null,
    vote_average: parseFloat(btn.dataset.vote),
    release_date: btn.dataset.release || null,
    first_air_date: btn.dataset.airdate || null,
  };
  toggleWatchlist(item);
}

function removeFromWatchlist(btn, e) {
  e.stopPropagation();
  const id = btn.dataset.id;
  let list = getWatchlist();
  list = list.filter((w) => w.id != id);
  saveWatchlist(list);
  const card = btn.closest(".card");
  if (card) {
    card.style.transform = "scale(0.8)";
    card.style.opacity = "0";
    setTimeout(() => {
      card.remove();
      const grid = document.getElementById("watchlistGrid");
      if (grid && !grid.children.length) {
        renderWatchlist();
      }
    }, 300);
  }
}

function watchlistCardHTML(item, index = 0) {
  const type = mediaType(item);
  const title = item.title || item.name || "";
  const progress = getProgress()[`${type}_${item.id}`];
  const delay = Math.min(index * 0.05, 0.5);
  return `<div class="card card-animated" data-id="${
    item.id
  }" data-type="${type}" style="animation-delay:${delay}s">
    <img class="card-img" src="${imgUrl(
      item.poster_path
    )}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22><rect fill=%22%23222%22 width=%22200%22 height=%22300%22/></svg>'">
    <div class="card-overlay">
<span class="card-overlay-play">${ICONS.play}</span>
<span class="card-overlay-title">${title}</span>
    </div>
    <button class="card-add-btn in-list" data-id="${
      item.id
    }" style="background:rgba(0,0,0,.7);border-color:rgba(255,255,255,.3);opacity:1" onclick="removeFromWatchlist(this, event)">${
    ICONS.trash
  }</button>
    <div class="card-info">
<div class="card-title">${title}</div>
<div class="card-meta">
  <span class="card-rating">${ICONS.star} ${rating(item.vote_average)}</span>
  <span class="card-year">${year(
    item.release_date || item.first_air_date
  )}</span>
  ${type === "tv" ? '<span class="card-type">TV</span>' : ""}
</div>
    </div>
    ${
      progress && progress.percent
        ? `<div class="progress-bar"><div class="progress-bar-fill" style="width:${progress.percent}%"></div></div>`
        : ""
    }
  </div>`;
}

function rowHTML(title, items, id) {
  return `<div class="row row-animated" id="${id || ""}">
    <h2 class="row-title">${title}</h2>
    <div class="row-container">
<button class="row-arrow left" onclick="scrollRow(this,-1)">${
    ICONS.chevronLeft
  }</button>
<div class="row-scroll">${items
    .map((i, idx) => cardHTML(i, idx))
    .join("")}</div>
<button class="row-arrow right" onclick="scrollRow(this,1)">${
    ICONS.chevronRight
  }</button>
    </div>
  </div><div class="row-separator"></div>`;
}

function rowHTMLWithCard(label, subtitle, posterPath, items, id) {
  return `<div class="row row-animated" id="${id || ""}">
    <div class="row-title-with-card">
<img class="rtc-poster" src="${imgUrl(
    posterPath,
    "w200"
  )}" alt="${subtitle}" onerror="this.style.display='none'">
<div class="rtc-text">
  <span class="rtc-label">${label}</span>
  <span class="rtc-subtext">${subtitle}</span>
</div>
    </div>
    <div class="row-container">
<button class="row-arrow left" onclick="scrollRow(this,-1)">${
    ICONS.chevronLeft
  }</button>
<div class="row-scroll">${items
    .map((i, idx) => cardHTML(i, idx))
    .join("")}</div>
<button class="row-arrow right" onclick="scrollRow(this,1)">${
    ICONS.chevronRight
  }</button>
    </div>
  </div><div class="row-separator"></div>`;
}

function scrollRow(btn, dir) {
  const scroll = btn.parentElement.querySelector(
    ".row-scroll, .top10-scroll, .collections-grid"
  );
  if (!scroll) return;
  scroll.scrollBy({
    left: dir * scroll.clientWidth * 0.75,
    behavior: "smooth",
  });
}

function filterBarHTML(type) {
  const genres = type === "movie" ? state.movieGenres : state.tvGenres;
  const years = [];
  for (let y = 2026; y >= 2000; y--) years.push(y);

  const genreOpts = [
    { value: "", label: "All Genres" },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ];
  const yearOpts = [
    { value: "", label: "All Years" },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];
  const countryOpts = [
    { value: "", label: "All Countries" },
    ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
  ];
  const ratingOpts = [
    { value: "", label: "All Ratings" },
    { value: "9", label: "9+" },
    { value: "8", label: "8+" },
    { value: "7", label: "7+" },
    { value: "6", label: "6+" },
    { value: "5", label: "5+" },
  ];

  return `<div class="filter-bar" id="filterBar">
    <span class="filter-label">Filters:</span>
    <select id="filterGenre" onchange="applyFilters()" style="display:none">
<option value="">All Genres</option>
${genres.map((g) => `<option value="${g.id}">${g.name}</option>`).join("")}
    </select>
    ${createDropdown(genreOpts, {
      id: "filterGenre",
      selected: "",
      searchable: true,
      placeholder: "All Genres",
    })}
    <select id="filterYear" onchange="applyFilters()" style="display:none">
<option value="">All Years</option>
${years.map((y) => `<option value="${y}">${y}</option>`).join("")}
    </select>
    ${createDropdown(yearOpts, {
      id: "filterYear",
      selected: "",
      searchable: false,
      placeholder: "All Years",
    })}
    <select id="filterCountry" onchange="applyFilters()" style="display:none">
<option value="">All Countries</option>
${COUNTRIES.map((c) => `<option value="${c.code}">${c.name}</option>`).join("")}
    </select>
    ${createDropdown(countryOpts, {
      id: "filterCountry",
      selected: "",
      searchable: true,
      placeholder: "All Countries",
    })}
    <select id="filterRating" onchange="applyFilters()" style="display:none">
<option value="">All Ratings</option>
<option value="9">9+</option>
<option value="8">8+</option>
<option value="7">7+</option>
<option value="6">6+</option>
<option value="5">5+</option>
    </select>
    ${createDropdown(ratingOpts, {
      id: "filterRating",
      selected: "",
      searchable: false,
      placeholder: "All Ratings",
    })}
  </div>`;
}

/* === SECTION: JS PAGES (HOME, MOVIES, TV, WATCHLIST) === */
let heroInterval = null;
let currentHeroSlide = 0;

async function renderHome() {
  const main = document.getElementById("mainContent");
  main.innerHTML =
    '<div class="skeleton-hero skeleton" style="height:85vh;min-height:500px"></div><div class="content-section">' +
    Array(6)
      .fill(
        `<div class="row"><h2 class="row-title skeleton" style="width:200px;height:20px"></h2><div class="row-scroll">${skeletonCards()}</div></div>`
      )
      .join("") +
    "</div>";

  const [trending, popular, topMovies, nowPlaying, popularTV, topTV] =
    await Promise.all([
      getTrending(),
      getPopularMovies(),
      getTopMovies(),
      getNowPlaying(),
      getPopularTV(),
      getTopTV(),
    ]);

  const trendingHeroItems = trending.results
    .filter((i) => i.backdrop_path)
    .slice(0, 6);
  const continueWatching = getContinueWatching();

  // Try to get personalized recommendations for the hero carousel
  let heroItems = [...trendingHeroItems];
  try {
    const recs = await getPersonalizedRecommendations();
    const recHeroItems = recs.filter((i) => i.backdrop_path).slice(0, 3);
    if (recHeroItems.length > 0) {
      // Mix: 3 trending + up to 3 recommended, interleaved
      const trendingSlice = trendingHeroItems.slice(0, 3);
      heroItems = [];
      const maxLen = Math.max(trendingSlice.length, recHeroItems.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < trendingSlice.length) heroItems.push(trendingSlice[i]);
        if (i < recHeroItems.length) heroItems.push(recHeroItems[i]);
      }
      heroItems = heroItems.slice(0, 6);
    }
  } catch (e) {
    /* fallback to trending only */
  }

  // Build hero carousel
  let html = `<div class="hero-carousel" id="heroCarousel">
    <button class="hero-nav-arrow prev" onclick="changeHeroSlide(-1)">${ICONS.chevronLeft}</button>
    <button class="hero-nav-arrow next" onclick="changeHeroSlide(1)">${ICONS.chevronRight}</button>`;

  heroItems.forEach((item, idx) => {
    const type = mediaType(item);
    const title = (item.title || item.name || "").replace(/'/g, "\\'");
    html += `<div class="hero-slide ${
      idx === 0 ? "active" : ""
    }" data-index="${idx}">
<div class="hero-backdrop" style="background-image:url('${imgUrl(
      item.backdrop_path,
      "original"
    )}')"></div>
<div class="hero-content">
  <h1>${item.title || item.name}</h1>
  <p>${truncate(item.overview, 200)}</p>
  <div class="hero-buttons">
    <button class="btn btn-play" onclick="playMedia(${item.id},'${type}')">${
      ICONS.play
    } Play</button>
    <button class="btn btn-info" data-id="${item.id}" data-type="${type}">${
      ICONS.info
    } More Info</button>
    <button class="btn btn-watchlist ${
      isInWatchlist(item.id) ? "in-list" : ""
    }" onclick="toggleWatchlist({id:${
      item.id
    },media_type:'${type}',title:'${title}',name:'${title}',poster_path:'${
      item.poster_path
    }',vote_average:${item.vote_average},release_date:'${
      item.release_date || ""
    }',first_air_date:'${
      item.first_air_date || ""
    }'}); this.classList.toggle('in-list'); this.innerHTML=this.classList.contains('in-list')?ICONS.check+' In My List':ICONS.plus+' My List'">${
      isInWatchlist(item.id)
        ? ICONS.check + " In My List"
        : ICONS.plus + " My List"
    }</button>
  </div>
</div>
    </div>`;
  });

  html += `<div class="hero-indicators">${heroItems
    .map(
      (_, idx) =>
        `<button class="hero-dot ${
          idx === 0 ? "active" : ""
        }" onclick="goToHeroSlide(${idx})"></button>`
    )
    .join("")}</div></div><div class="content-section">`;

  if (continueWatching.length > 0) {
    const cwCards = await Promise.all(
      continueWatching.slice(0, 10).map(async (cw, idx) => {
        const [type, id] = cw.key.split("_");
        try {
          const d =
            type === "movie"
              ? await getMovieDetails(id)
              : await getTVDetails(id);
          return continueWatchingCardHTML({ ...d, media_type: type }, cw, idx);
        } catch (e) {
          return null;
        }
      })
    );
    const validCards = cwCards.filter(Boolean);
    if (validCards.length)
      html += continueWatchingRowHTML(
        "Continue Pawsing",
        validCards,
        "continueRow"
      );
  }

  html += rowHTML(
    "Trending Meow",
    trending.results.slice(0, 20),
    "trendingRow"
  );
  html += top10RowHTML(
    "Top 10 This Week",
    trending.results.filter((i) => i.poster_path).slice(0, 10),
    "top10Row"
  );
  html += collectionsRowHTML();
  html += rowHTML("Popular Movies", popular.results, "popularRow");
  html += rowHTML("Top Rated Movies", topMovies.results, "topMoviesRow");
  html += rowHTML("Now Playing", nowPlaying.results, "nowPlayingRow");
  html += rowHTML("Popular TV Shows", popularTV.results, "popularTVRow");
  html += rowHTML("Top Rated TV Shows", topTV.results, "topTVRow");
  html += "</div>";
  main.innerHTML = html;

  // Start auto-rotation
  currentHeroSlide = 0;
  clearInterval(heroInterval);
  heroInterval = setInterval(() => changeHeroSlide(1), 8000);

  // Load personalized sections asynchronously (after main content renders)
  loadPersonalizedSections();
  // Load collection card backdrops
  loadCollectionBackdrops();
}

async function loadPersonalizedSections() {
  const contentSection = document.querySelector(".content-section");
  if (!contentSection) return;

  const { watchedIds } = getUserPreferences();
  if (watchedIds.length === 0) return; // No history, skip personalization

  try {
    // Fetch personalized recommendations and genre-based row in parallel
    const [recommendations, genreRow] = await Promise.all([
      getPersonalizedRecommendations(),
      getGenreBasedRow(),
    ]);

    let personalizedHTML = "";

    if (recommendations.length > 0) {
      personalizedHTML += rowHTML(
        "Purrsonalized For You",
        recommendations,
        "recommendedRow"
      );
    }

    if (genreRow && genreRow.items.length > 0) {
      personalizedHTML += rowHTML(genreRow.title, genreRow.items, "genreRow");
    }

    // Also fetch "Similar to what you watched" using the most recent item
    if (watchedIds.length > 0) {
      const mostRecent = watchedIds[0];
      const similar =
        mostRecent.type === "movie"
          ? await getSimilarMovies(mostRecent.id)
          : await getSimilarTV(mostRecent.id);

      if (similar.results && similar.results.length > 0) {
        // Get the title of the most recent item
        const recentDetail =
          mostRecent.type === "movie"
            ? await getMovieDetails(mostRecent.id)
            : await getTVDetails(mostRecent.id);
        const recentTitle =
          recentDetail.title || recentDetail.name || "your recent watch";
        const recentPoster = recentDetail.poster_path || "";
        personalizedHTML += rowHTMLWithCard(
          "Because you paw-sed on",
          recentTitle,
          recentPoster,
          similar.results
            .filter((i) => i.poster_path)
            .map((i) => ({ ...i, media_type: mostRecent.type })),
          "similarRow"
        );
      }
    }

    if (personalizedHTML) {
      // Insert personalized rows after the first row (Trending)
      const firstSeparator = contentSection.querySelector(".row-separator");
      if (firstSeparator) {
        firstSeparator.insertAdjacentHTML("afterend", personalizedHTML);
      } else {
        contentSection.insertAdjacentHTML("afterbegin", personalizedHTML);
      }
    }
  } catch (e) {
    console.error("Personalization error:", e);
  }
}

function goToHeroSlide(index) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (!slides.length) return;
  slides.forEach((s) => s.classList.remove("active"));
  dots.forEach((d) => d.classList.remove("active"));
  currentHeroSlide = index;
  slides[currentHeroSlide].classList.add("active");
  dots[currentHeroSlide].classList.add("active");
  // Reset timer
  clearInterval(heroInterval);
  heroInterval = setInterval(() => changeHeroSlide(1), 8000);
}

function changeHeroSlide(dir) {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  const total = slides.length;
  let next = (currentHeroSlide + dir + total) % total;
  goToHeroSlide(next);
}

// Hero carousel swipe gestures
(function initHeroSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  document.addEventListener(
    "touchstart",
    function (e) {
      const carousel = document.getElementById("heroCarousel");
      if (!carousel || !carousel.contains(e.target)) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = true;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    function (e) {
      if (!isSwiping) return;
      isSwiping = false;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX - touchEndX;
      const diffY = Math.abs(touchStartY - touchEndY);

      // Only trigger if horizontal swipe is dominant and > 50px
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > diffY) {
        if (diffX > 0) {
          changeHeroSlide(1); // swipe left = next
        } else {
          changeHeroSlide(-1); // swipe right = prev
        }
      }
    },
    { passive: true }
  );
})();

async function renderMovies() {
  const main = document.getElementById("mainContent");
  const genreData = await getMovieGenres();
  state.movieGenres = genreData.genres || [];
  state.moviePage = 1;
  state.movieFilters = {};
  main.innerHTML = `<h1 class="page-title">Movies</h1>${filterBarHTML(
    "movie"
  )}<div class="page-grid" id="pageGrid"></div><button class="load-more" id="loadMore">Load More</button>`;
  initDropdowns(main);
  await loadMovies();
  document.getElementById("loadMore").onclick = loadMovies;
}

async function loadMovies() {
  const grid = document.getElementById("pageGrid");
  const data = await discoverMovies(state.moviePage, state.movieFilters);
  grid.insertAdjacentHTML(
    "beforeend",
    data.results
      .filter((i) => (i.vote_count || 0) >= 100)
      .map((i, idx) => cardHTML({ ...i, media_type: "movie" }, idx))
      .join("")
  );
  state.moviePage++;
}

async function renderTV() {
  const main = document.getElementById("mainContent");
  const genreData = await getTVGenres();
  state.tvGenres = genreData.genres || [];
  state.tvPage = 1;
  state.tvFilters = {};
  main.innerHTML = `<h1 class="page-title">TV Shows</h1>${filterBarHTML(
    "tv"
  )}<div class="page-grid" id="pageGrid"></div><button class="load-more" id="loadMore">Load More</button>`;
  initDropdowns(main);
  await loadTV();
  document.getElementById("loadMore").onclick = loadTV;
}

async function loadTV() {
  const grid = document.getElementById("pageGrid");
  const data = await discoverTV(state.tvPage, state.tvFilters);
  grid.insertAdjacentHTML(
    "beforeend",
    data.results
      .filter((i) => (i.vote_count || 0) >= 100)
      .map((i, idx) => cardHTML({ ...i, media_type: "tv" }, idx))
      .join("")
  );
  state.tvPage++;
}

function applyFilters() {
  const genre = document.getElementById("filterGenre").value;
  const yr = document.getElementById("filterYear").value;
  const country = document.getElementById("filterCountry").value;
  const rat = document.getElementById("filterRating").value;
  const filters = {};
  if (genre) filters.genre = genre;
  if (yr) filters.year = yr;
  if (country) filters.country = country;
  if (rat) filters.rating = rat;

  const grid = document.getElementById("pageGrid");
  grid.innerHTML = "";

  if (state.page === "movies") {
    state.movieFilters = filters;
    state.moviePage = 1;
    loadMovies();
  } else if (state.page === "tv") {
    state.tvFilters = filters;
    state.tvPage = 1;
    loadTV();
  }
}

function renderWatchlist() {
  const main = document.getElementById("mainContent");
  const list = getWatchlist();
  let html = `<h1 class="page-title">My List</h1>
    <div class="filter-pills" id="watchlistFilters">
<button class="filter-pill active" data-filter="all" onclick="filterWatchlist('all','type',this)">All</button>
<button class="filter-pill" data-filter="movie" onclick="filterWatchlist('movie','type',this)">Movies</button>
<button class="filter-pill" data-filter="tv" onclick="filterWatchlist('tv','type',this)">TV Shows</button>
<span style="width:1px;height:20px;background:rgba(255,255,255,.1);margin:0 6px"></span>
<button class="filter-pill active" data-filter="all-progress" onclick="filterWatchlist('all','progress',this)">All</button>
<button class="filter-pill" data-filter="started" onclick="filterWatchlist('started','progress',this)">Started</button>
<button class="filter-pill" data-filter="not-started" onclick="filterWatchlist('not-started','progress',this)">Not Started</button>
    </div>`;

  if (list.length === 0) {
    html += `<div class="watchlist-empty">
<div class="empty-icon">${ICONS.bookmark}</div>
<h3>Your watchlist is empty... even cats need entertainment!</h3>
<p>Add movies and TV shows to keep your cat-alogue full.</p>
    </div>`;
  } else {
    html += `<div class="page-grid" id="watchlistGrid">${list
      .map((item, idx) =>
        watchlistCardHTML({ ...item, media_type: item.type }, idx)
      )
      .join("")}</div>`;
    html += `<p style="text-align:center;color:var(--dark-gray);font-size:0.75rem;margin-top:1rem;padding:0 4%">Swipe left on mobile to remove items</p>`;
  }
  main.innerHTML = html;
  // Init swipe-to-remove on mobile
  initSwipeToRemove();
}

function filterWatchlist(value, filterType, btn) {
  // Update active pills for the correct group
  const pills = btn.parentElement.querySelectorAll(".filter-pill");
  const isTypeFilter = filterType === "type";
  let group = isTypeFilter
    ? ["all", "movie", "tv"]
    : ["all-progress", "started", "not-started"];
  pills.forEach((p) => {
    const f = p.dataset.filter;
    if (group.includes(f)) p.classList.remove("active");
  });
  btn.classList.add("active");

  // Get active filters
  const activePills = btn.parentElement.querySelectorAll(".filter-pill.active");
  let typeFilter = "all",
    progressFilter = "all";
  activePills.forEach((p) => {
    const f = p.dataset.filter;
    if (["all", "movie", "tv"].includes(f)) typeFilter = f;
    if (["all-progress", "started", "not-started"].includes(f))
      progressFilter = f === "all-progress" ? "all" : f;
  });

  const list = getWatchlist();
  const progress = getProgress();
  const filtered = list.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    const hasProgress =
      progress[`${item.type}_${item.id}`] &&
      progress[`${item.type}_${item.id}`].percent > 0;
    if (progressFilter === "started" && !hasProgress) return false;
    if (progressFilter === "not-started" && hasProgress) return false;
    return true;
  });

  const grid = document.getElementById("watchlistGrid");
  if (grid) {
    if (filtered.length === 0) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gray)">No items match this filter.</div>';
    } else {
      grid.innerHTML = filtered
        .map((item, idx) =>
          watchlistCardHTML({ ...item, media_type: item.type }, idx)
        )
        .join("");
    }
  }
}

async function renderSearch(query) {
  const main = document.getElementById("mainContent");
  main.innerHTML = `<h1 class="page-title">Results for "${query}"</h1><div class="page-grid" id="pageGrid"></div><button class="load-more" id="loadMore">Load More</button>`;
  state.searchPage = 1;
  state.searchQuery = query;
  await loadSearch();
  document.getElementById("loadMore").onclick = loadSearch;
}

async function loadSearch() {
  const grid = document.getElementById("pageGrid");
  const data = await searchMulti(state.searchQuery, state.searchPage);
  const valid = data.results.filter(
    (i) => i.media_type !== "person" && i.poster_path
  );
  grid.insertAdjacentHTML(
    "beforeend",
    valid.map((i, idx) => cardHTML(i, idx)).join("")
  );
  state.searchPage++;
}

/* === SECTION: JS MODAL AND PLAYER === */
async function showModal(id, type) {
  const overlay = document.getElementById("modalOverlay");
  const content = document.getElementById("modalContent");
  content.innerHTML =
    '<div style="padding:3rem;text-align:center;color:var(--gray)">Loading...</div>';
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";

  // Push modal URL to history
  const modalUrl = `/${type}/${id}`;
  history.pushState({ modal: true, type, id }, "", modalUrl);
  modalPushedState = true;

  const [data, similar, videos] = await Promise.all([
    type === "movie" ? getMovieDetails(id) : getTVDetails(id),
    type === "movie" ? getSimilarMovies(id) : getSimilarTV(id),
    getVideos(id, type),
  ]);
  const inList = isInWatchlist(id);

  // Find trailer or teaser
  const videoResults = (videos && videos.results) || [];
  const trailer =
    videoResults.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    videoResults.find((v) => v.type === "Teaser" && v.site === "YouTube");

  let backdropHTML = "";
  if (trailer) {
    backdropHTML = `<div class="modal-backdrop-container" data-trailer-key="${trailer.key}">
<iframe id="modalTrailer" src="https://www.youtube.com/embed/${trailer.key}?autoplay=0&mute=0&controls=1&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${trailer.key}&iv_load_policy=3&fs=1&cc_load_policy=0&playsinline=1" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe>
<div class="trailer-fade"></div>
    </div>`;
  } else {
    backdropHTML = `<div class="modal-backdrop-container">
<img class="modal-backdrop" src="${imgUrl(
      data.backdrop_path || data.poster_path,
      "original"
    )}" onerror="this.style.background='#333'">
<div class="trailer-fade"></div>
    </div>`;
  }

  let html = `<button class="modal-close" onclick="closeModal()">${
    ICONS.close
  }</button>
    ${backdropHTML}
    <div class="modal-body">
<h2 class="modal-title">${data.title || data.name}</h2>
<div class="modal-meta">
  <span class="rating">${ICONS.star} ${rating(data.vote_average)}</span>
  <span class="year">${year(data.release_date || data.first_air_date)}</span>
  <span class="runtime">${
    type === "movie"
      ? data.runtime
        ? data.runtime + " min"
        : ""
      : data.number_of_seasons
      ? data.number_of_seasons +
        " Season" +
        (data.number_of_seasons > 1 ? "s" : "")
      : ""
  }</span>
</div>
<div class="modal-genres">${(data.genres || [])
    .map((g) => `<span>${g.name}</span>`)
    .join("")}</div>
<p class="modal-overview">${data.overview || "No overview available."}</p>
<div class="modal-actions">
  <button class="btn btn-red" onclick="playMedia(${id},'${type}')">${
    ICONS.play
  } Play</button>
  <button class="btn btn-watchlist ${
    inList ? "in-list" : ""
  }" id="modalWatchlistBtn" onclick="toggleWatchlistModal(${id},'${type}','${(
    data.title || data.name
  ).replace(/'/g, "\\'")}','${data.poster_path || ""}',${
    data.vote_average || 0
  },'${data.release_date || ""}','${data.first_air_date || ""}')">${
    inList ? ICONS.check + " In My List" : ICONS.plus + " My List"
  }</button>
</div>`;

  if (type === "tv" && data.seasons && data.seasons.length) {
    const seasons = data.seasons.filter((s) => s.season_number > 0);
    const seasonOpts = seasons.map((s) => ({
      value: String(s.season_number),
      label: "Season " + s.season_number,
    }));
    window["_dropdown_change_seasonSelect"] = (val) => loadSeason(id, val);
    html += `<div class="season-selector">
<select id="seasonSelect" onchange="loadSeason(${id}, this.value)" style="display:none">
  ${seasons
    .map(
      (s) =>
        `<option value="${s.season_number}">Season ${s.season_number}</option>`
    )
    .join("")}
</select>
${createDropdown(seasonOpts, {
  id: "seasonSelect",
  selected: String(seasons[0].season_number),
  searchable: false,
  placeholder: "Season",
})}
    </div>
    <div class="episode-list" id="episodeList"><div style="color:var(--gray);padding:1rem">Loading episodes...</div></div>`;
  }

  if (similar.results && similar.results.length) {
    html += `<div class="similar-row">
<h3 class="row-title">More Like This</h3>
<div class="row-scroll">${similar.results
      .slice(0, 12)
      .map((i, idx) => cardHTML({ ...i, media_type: type }, idx))
      .join("")}</div>
    </div>`;
  }

  html += "</div>";
  content.innerHTML = html;
  initDropdowns(content);
  if (trailer) modalTrailerStartTime = Date.now();

  if (
    type === "tv" &&
    data.seasons &&
    data.seasons.filter((s) => s.season_number > 0).length
  ) {
    loadSeason(
      id,
      data.seasons.filter((s) => s.season_number > 0)[0].season_number
    );
  }
}

function toggleWatchlistModal(id, type, title, poster, vote, release, airdate) {
  const item = {
    id,
    media_type: type,
    title,
    name: title,
    poster_path: poster || null,
    vote_average: vote,
    release_date: release || null,
    first_air_date: airdate || null,
  };
  toggleWatchlist(item);
  const btn = document.getElementById("modalWatchlistBtn");
  if (btn) {
    const inList = isInWatchlist(id);
    btn.classList.toggle("in-list", inList);
    btn.innerHTML = inList
      ? ICONS.check + " In My List"
      : ICONS.plus + " My List";
  }
}

async function loadSeason(tvId, seasonNum) {
  const el = document.getElementById("episodeList");
  if (!el) return;
  el.innerHTML = '<div style="color:var(--gray);padding:1rem">Loading...</div>';
  const data = await getTVSeason(tvId, seasonNum);
  if (!data.episodes || !data.episodes.length) {
    el.innerHTML =
      '<div style="color:var(--gray);padding:1rem">No episodes found.</div>';
    return;
  }
  el.innerHTML = data.episodes
    .map(
      (
        ep
      ) => `<div class="episode-card" onclick="playMedia(${tvId},'tv',${seasonNum},${
        ep.episode_number
      })">
    <span class="episode-badge">E${ep.episode_number}</span>
    <img src="${imgUrl(ep.still_path)}" alt="Ep ${
        ep.episode_number
      }" loading="lazy" onerror="this.style.background='#333'">
    <div class="episode-info">
<h4>${ep.name || "Episode " + ep.episode_number}</h4>
<p>${ep.overview || ""}</p>
    </div>
  </div>`
    )
    .join("");
}

function closeModal(skipHistory) {
  const iframe = document.getElementById("modalTrailer");
  if (iframe) iframe.src = "";
  document.getElementById("modalOverlay").classList.remove("visible");
  document.body.style.overflow = "";
  modalMuted = true;
  modalTrailerStartTime = Date.now();
  if (!skipHistory && modalPushedState) {
    modalPushedState = false;
    history.back();
  } else {
    modalPushedState = false;
    // Always clean up the URL if it shows a modal route
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/movie/') || (currentPath.startsWith('/tv/') && currentPath !== '/tv')) {
      const cleanUrl = getUrlForPage(state.page, state.searchQuery || null);
      history.replaceState(
        { page: state.page, query: state.searchQuery || null },
        "",
        cleanUrl
      );
    }
  }
}

let modalMuted = true;
let modalTrailerStartTime = 0;
let modalPushedState = false;
let playerPushedState = false;

// PLAYER
let currentPlayerMedia = null;

async function playMedia(id, type, season = 1, episode = 1) {
  const overlay = document.getElementById("playerOverlay");
  const iframe = document.getElementById("playerIframe");
  const nowPlaying = document.getElementById("nowPlaying");

  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
  document.getElementById("bottomTabBar").style.display = "none";
  saveProgress(id, type, { id, type, season, episode, percent: 5 });
  currentPlayerMedia = { id, type, season, episode };

  // Push player URL to history
  const playerUrl =
    type === "movie"
      ? `/watch/movie/${id}`
      : `/watch/tv/${id}/${season}/${episode}`;
  history.pushState({ player: true, type, id, season, episode }, "", playerUrl);
  playerPushedState = true;

  loadPlayerDetails(id, type, season, episode);
  renderServerList();

  // Attempt extraction from currently selected server
  await attemptExtractOrFallback(id, type, season, episode);
}

// Core function: try extracting from current server, show error or play
async function attemptExtractOrFallback(id, type, season, episode) {
  const iframe = document.getElementById("playerIframe");
  const wrapper = document.getElementById("customPlayerWrapper");
  const nowPlaying = document.getElementById("nowPlaying");
  const extractServerId = EXTRACTABLE_SERVERS[currentServer.id];

  // If current server supports extraction, try it
  if (extractServerId) {
    nowPlaying.textContent = `Extracting from ${currentServer.name}...`;
    // Hide iframe, show custom player area with loading
    iframe.style.display = 'none';
    iframe.src = '';
    wrapper.style.display = 'block';
    showPlayerLoading();

    try {
      const extractResult = await extractStream(id, type, season, episode, extractServerId);
      if (extractResult && extractResult.success) {
        usingCustomPlayer = true;
        const titleText = type === "movie" ? "Playing movie" : `S${season} E${episode}`;
        nowPlaying.textContent = titleText;
        const streamUrl = EXTRACT_BASE + extractResult.stream;
        const subs = (extractResult.subtitles || []).map(s => ({
          lang: s.lang,
          url: EXTRACT_BASE + s.url
        }));
        initCustomPlayer(streamUrl, titleText, subs);
        return;
      }
    } catch (e) {
      console.warn(`Extraction failed for ${currentServer.name}:`, e);
    }

    // Extraction failed - show error
    usingCustomPlayer = false;
    nowPlaying.textContent = `${currentServer.name} - Stream not found`;
    showPlayerError(currentServer.name);
  } else {
    // Server doesn't support extraction (AutoEmbed, VidSrc NL) - use iframe directly
    destroyCustomPlayer();
    usingCustomPlayer = false;
    wrapper.style.display = 'none';
    iframe.style.display = '';
    const url = currentServer.isDropdown
      ? currentServer.buildUrl(id, type, season, episode, currentAutoEmbedServer)
      : currentServer.buildUrl(id, type, season, episode);
    nowPlaying.textContent = type === "movie" ? "Playing movie..." : `S${season} E${episode}`;
    iframe.src = url;
  }
}

// Show loading state
function showPlayerLoading() {
  const wrapper = document.getElementById("customPlayerWrapper");
  const video = document.getElementById("customVideo");
  video.style.display = 'none';
  // Remove any existing status
  const existing = wrapper.querySelector('.cp-status');
  if (existing) existing.remove();
  // Show loading
  document.getElementById("cpLoading").style.display = 'flex';
  document.getElementById("cpOverlayTop").style.display = 'none';
  document.getElementById("cpOverlayBottom").style.display = 'none';
  document.getElementById("cpSettingsPanel").classList.remove('open');
}

// Show extraction error
function showPlayerError(serverName) {
  const wrapper = document.getElementById("customPlayerWrapper");
  const video = document.getElementById("customVideo");
  video.style.display = 'none';
  document.getElementById("cpLoading").style.display = 'none';
  document.getElementById("cpOverlayTop").style.display = 'none';
  document.getElementById("cpOverlayBottom").style.display = 'none';
  // Remove existing status
  const existing = wrapper.querySelector('.cp-status');
  if (existing) existing.remove();
  // Insert error status
  const status = document.createElement('div');
  status.className = 'cp-status';
  status.innerHTML = `
    <div class="cp-status-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
    <div class="cp-status-title">Stream not found</div>
    <div class="cp-status-msg">Could not extract stream from <strong>${serverName}</strong>. Try a different server.</div>
    <div class="cp-status-hint">Use the Server button to switch</div>`;
  wrapper.appendChild(status);
}

// Extract stream from backend (single server)
async function extractStream(id, type, season, episode, serverId) {
  try {
    const params = new URLSearchParams({
      id: String(id),
      type: type,
      season: String(season),
      episode: String(episode),
      servers: serverId
    });
    const res = await fetch(`${EXTRACT_BASE}/extract?${params}`, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Extract fetch error:', e);
    return null;
  }
}

/* === SECTION: CUSTOM HLS PLAYER ENGINE === */
let _hlsInstance = null;
let _cpLocked = false;

function initCustomPlayer(streamUrl, title, subtitles) {
  const wrapper = document.getElementById("customPlayerWrapper");
  const video = document.getElementById("customVideo");
  const loading = document.getElementById("cpLoading");

  // Clear any status messages
  const existing = wrapper.querySelector('.cp-status');
  if (existing) existing.remove();

  // Show video and controls
  video.style.display = '';
  document.getElementById("cpOverlayTop").style.display = '';
  document.getElementById("cpOverlayBottom").style.display = '';
  document.getElementById("cpTitle").textContent = title;

  // Destroy previous HLS instance
  destroyCustomPlayer();

  // Init HLS.js
  if (Hls.isSupported()) {
    _hlsInstance = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      enableWorker: true,
    });
    _hlsInstance.loadSource(streamUrl);
    _hlsInstance.attachMedia(video);
    _hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      loading.style.display = 'none';
      video.play().catch(() => {});
      buildQualityMenu();
    });
    _hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        loading.style.display = 'none';
        console.error('HLS fatal error:', data);
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS (Safari)
    video.src = streamUrl;
    video.addEventListener('loadedmetadata', () => {
      loading.style.display = 'none';
      video.play().catch(() => {});
    }, { once: true });
  }

  // Add subtitles
  video.querySelectorAll('track').forEach(t => t.remove());
  if (subtitles && subtitles.length) {
    subtitles.forEach((sub, i) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = sub.lang;
      track.srclang = sub.lang.substring(0, 2).toLowerCase();
      track.src = sub.url;
      if (i === 0) track.default = true;
      video.appendChild(track);
    });
  }

  // Setup event listeners
  video.onplay = () => updatePlayBtn(true);
  video.onpause = () => updatePlayBtn(false);
  video.ontimeupdate = updateCpProgress;
  video.onprogress = updateCpBuffer;
  video.onwaiting = () => { loading.style.display = 'flex'; };
  video.onplaying = () => { loading.style.display = 'none'; };

  // Seek input
  const seekInput = document.getElementById("cpSeekInput");
  seekInput.oninput = () => {
    if (video.duration) {
      video.currentTime = (seekInput.value / 100) * video.duration;
    }
  };

  // Controls auto-hide
  setupControlsAutoHide(wrapper);
  buildSpeedMenu();
}

function destroyCustomPlayer() {
  if (_hlsInstance) {
    _hlsInstance.destroy();
    _hlsInstance = null;
  }
  const video = document.getElementById("customVideo");
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}

function updatePlayBtn(playing) {
  const btn = document.getElementById("cpPlayBtn");
  if (playing) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  } else {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
}

function toggleCustomPlay() {
  const video = document.getElementById("customVideo");
  if (video.paused) video.play(); else video.pause();
}

function updateCpProgress() {
  const video = document.getElementById("customVideo");
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  document.getElementById("cpProgress").style.width = pct + '%';
  document.getElementById("cpSeekInput").value = pct;
  document.getElementById("cpTime").textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
  // Save progress
  if (currentPlayerMedia) {
    const { id, type, season, episode } = currentPlayerMedia;
    saveProgress(id, type, { id, type, season, episode, percent: Math.round(pct) });
  }
}

function updateCpBuffer() {
  const video = document.getElementById("customVideo");
  if (!video.duration || !video.buffered.length) return;
  const bufferedEnd = video.buffered.end(video.buffered.length - 1);
  document.getElementById("cpBuffer").style.width = ((bufferedEnd / video.duration) * 100) + '%';
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function setupControlsAutoHide(wrapper) {
  let hideTimer;
  const show = () => {
    wrapper.classList.remove('controls-hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const video = document.getElementById("customVideo");
      if (video && !video.paused && !_cpLocked) {
        wrapper.classList.add('controls-hidden');
      }
    }, 3000);
  };
  wrapper.onmousemove = show;
  wrapper.ontouchstart = show;
  show();
}

function togglePlayerLock() {
  _cpLocked = !_cpLocked;
  const lockOverlay = document.getElementById("cpLockOverlay");
  const wrapper = document.getElementById("customPlayerWrapper");
  if (_cpLocked) {
    lockOverlay.style.display = 'flex';
    wrapper.classList.add('controls-hidden');
  } else {
    lockOverlay.style.display = 'none';
    wrapper.classList.remove('controls-hidden');
  }
}

function toggleCpPip() {
  const video = document.getElementById("customVideo");
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
  } else if (video.requestPictureInPicture) {
    video.requestPictureInPicture();
  }
}

function toggleCpFullscreen() {
  const wrapper = document.getElementById("customPlayerWrapper");
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    wrapper.requestFullscreen().catch(() => {});
  }
}

function toggleCpSettings() {
  document.getElementById("cpSettingsPanel").classList.toggle('open');
}

function toggleCpSubs() {
  const video = document.getElementById("customVideo");
  const tracks = video.textTracks;
  if (!tracks.length) return;
  for (let i = 0; i < tracks.length; i++) {
    tracks[i].mode = tracks[i].mode === 'showing' ? 'hidden' : 'showing';
  }
}

function buildQualityMenu() {
  const section = document.getElementById("cpQualitySection");
  if (!_hlsInstance) { section.innerHTML = ''; return; }
  const levels = _hlsInstance.levels;
  let html = '<h4>Quality</h4>';
  html += `<div class="cp-settings-item ${_hlsInstance.currentLevel === -1 ? 'active' : ''}" onclick="setCpQuality(-1)">Auto</div>`;
  levels.forEach((level, i) => {
    const label = level.height ? `${level.height}p` : `${Math.round(level.bitrate/1000)}kbps`;
    html += `<div class="cp-settings-item ${_hlsInstance.currentLevel === i ? 'active' : ''}" onclick="setCpQuality(${i})">${label}</div>`;
  });
  section.innerHTML = html;
}

function setCpQuality(level) {
  if (!_hlsInstance) return;
  _hlsInstance.currentLevel = level;
  buildQualityMenu();
}

function buildSpeedMenu() {
  const section = document.getElementById("cpSpeedSection");
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const video = document.getElementById("customVideo");
  const current = video ? video.playbackRate : 1;
  let html = '<h4>Speed</h4>';
  speeds.forEach(s => {
    html += `<div class="cp-settings-item ${current === s ? 'active' : ''}" onclick="setCpSpeed(${s})">${s === 1 ? 'Normal' : s + 'x'}</div>`;
  });
  section.innerHTML = html;
}

function setCpSpeed(speed) {
  const video = document.getElementById("customVideo");
  if (video) video.playbackRate = speed;
  buildSpeedMenu();
}

// Keyboard shortcuts for custom player
document.addEventListener('keydown', (e) => {
  if (!usingCustomPlayer) return;
  const video = document.getElementById("customVideo");
  if (!video) return;
  switch (e.key) {
    case ' ': e.preventDefault(); toggleCustomPlay(); break;
    case 'ArrowLeft': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break;
    case 'ArrowRight': e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); break;
    case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
    case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
    case 'f': case 'F': toggleCpFullscreen(); break;
    case 'm': case 'M': video.muted = !video.muted; break;
    case 'l': case 'L': togglePlayerLock(); break;
  }
});

async function loadPlayerDetails(id, type, season, episode) {
  const detailsEl = document.getElementById("playerDetails");
  if (!detailsEl) return;

  const data =
    type === "movie" ? await getMovieDetails(id) : await getTVDetails(id);
  if (!data || data.success === false) {
    detailsEl.innerHTML = "";
    return;
  }

  let html = `<div class="player-details-inner">
    <h2 class="player-details-title">${data.title || data.name}</h2>
    <div class="player-details-meta">
<span class="pd-rating">${ICONS.star} ${rating(data.vote_average)}</span>
<span class="pd-year">${year(data.release_date || data.first_air_date)}</span>
<span class="pd-runtime">${
    type === "movie"
      ? data.runtime
        ? data.runtime + " min"
        : ""
      : data.number_of_seasons
      ? data.number_of_seasons +
        " Season" +
        (data.number_of_seasons > 1 ? "s" : "")
      : ""
  }</span>
    </div>
    <div class="player-details-genres">${(data.genres || [])
      .map((g) => `<span>${g.name}</span>`)
      .join("")}</div>
    <p class="player-details-overview collapsed" id="playerOverview">${
      data.overview || ""
    }</p>
    ${
      data.overview && data.overview.length > 120
        ? '<button class="player-details-more" onclick="togglePlayerOverview()">Show more</button>'
        : ""
    }`;

  if (type === "tv" && data.seasons && data.seasons.length) {
    const seasons = data.seasons.filter((s) => s.season_number > 0);
    const playerSeasonOpts = seasons.map((s) => ({
      value: String(s.season_number),
      label:
        "Season " +
        s.season_number +
        (s.episode_count ? " (" + s.episode_count + " episodes)" : ""),
    }));
    window["_dropdown_change_playerSeasonSelect"] = (val) =>
      loadPlayerEpisodes(id, val, episode);
    html += `<h3 class="player-section-title">Episodes</h3>
<div class="player-season-selector">
  <select id="playerSeasonSelect" onchange="loadPlayerEpisodes(${id}, this.value, ${episode})" style="display:none">
    ${seasons
      .map(
        (s) =>
          `<option value="${s.season_number}" ${
            s.season_number == season ? "selected" : ""
          }>Season ${s.season_number} ${
            s.episode_count ? "(" + s.episode_count + " episodes)" : ""
          }</option>`
      )
      .join("")}
  </select>
  ${createDropdown(playerSeasonOpts, {
    id: "playerSeasonSelect",
    selected: String(season),
    searchable: false,
    placeholder: "Season",
  })}
</div>
<div class="player-episode-list" id="playerEpisodeList"><div style="color:var(--gray);padding:1rem;font-size:.85rem">Loading episodes...</div></div>`;
  }

  html += `<div class="player-suggestions" id="playerSuggestions"><h3 class="player-section-title">More Like This</h3><div style="color:var(--gray);padding:1rem;font-size:.85rem">Loading...</div></div>`;
  html += "</div>";
  detailsEl.innerHTML = html;
  initDropdowns(detailsEl);

  if (type === "tv") {
    loadPlayerEpisodes(id, season, episode);
  }

  // Load suggestions asynchronously
  loadPlayerSuggestions(id, type);
}

async function loadPlayerSuggestions(id, type) {
  const el = document.getElementById("playerSuggestions");
  if (!el) return;
  try {
    const similar =
      type === "movie" ? await getSimilarMovies(id) : await getSimilarTV(id);
    if (similar.results && similar.results.length > 0) {
      const items = similar.results.filter((i) => i.poster_path).slice(0, 12);
      el.innerHTML = `<h3 class="player-section-title">More Like This</h3>
  <div class="player-suggestions-grid">${items
    .map((item, idx) => {
      const t = item.title || item.name || "";
      const mType = type;
      return `<div class="player-suggestion-card" onclick="switchToMedia(${
        item.id
      },'${mType}')">
      <img src="${imgUrl(
        item.poster_path,
        "w300"
      )}" alt="${t}" loading="lazy" onerror="this.style.background='#333'">
      <div class="player-suggestion-info">
        <span class="player-suggestion-title">${t}</span>
        <span class="player-suggestion-meta">${ICONS.star} ${rating(
        item.vote_average
      )}</span>
      </div>
    </div>`;
    })
    .join("")}</div>`;
    } else {
      el.innerHTML = "";
    }
  } catch (e) {
    el.innerHTML = "";
  }
}

function switchToMedia(id, type) {
  playMedia(id, type, 1, 1);
}

async function loadPlayerEpisodes(tvId, seasonNum, currentEp) {
  const el = document.getElementById("playerEpisodeList");
  if (!el) return;
  el.innerHTML =
    '<div style="color:var(--gray);padding:1rem;font-size:.85rem">Loading...</div>';
  const data = await getTVSeason(tvId, seasonNum);
  if (!data.episodes || !data.episodes.length) {
    el.innerHTML =
      '<div style="color:var(--gray);padding:1rem;font-size:.85rem">No episodes found.</div>';
    return;
  }
  el.innerHTML = data.episodes
    .map(
      (ep) => `<div class="player-episode-item ${
        ep.episode_number == currentEp ? "active" : ""
      }" onclick="switchEpisode(${tvId},${seasonNum},${ep.episode_number})">
    <span class="ep-num">${ep.episode_number}</span>
    <img class="ep-thumb" src="${imgUrl(
      ep.still_path,
      "w300"
    )}" alt="" loading="lazy" onerror="this.style.background='#333'">
    <div class="ep-info">
<h4>${ep.name || "Episode " + ep.episode_number}</h4>
<p>${ep.overview || ""}</p>
    </div>
  </div>`
    )
    .join("");
}

async function switchEpisode(tvId, season, episode) {
  currentPlayerMedia = { id: tvId, type: "tv", season, episode };
  saveProgress(tvId, "tv", { id: tvId, type: "tv", season, episode, percent: 5 });

  // Update active state in episode list
  document.querySelectorAll(".player-episode-item").forEach((item) => item.classList.remove("active"));
  if (event && event.currentTarget) event.currentTarget.classList.add("active");

  // Use the same extraction logic as playMedia
  await attemptExtractOrFallback(tvId, "tv", season, episode);

  // Update active state
  document
    .querySelectorAll(".player-episode-item")
    .forEach((item) => item.classList.remove("active"));
  event.currentTarget.classList.add("active");
}

function togglePlayerOverview() {
  const el = document.getElementById("playerOverview");
  const btn = el.nextElementSibling;
  if (el.classList.contains("collapsed")) {
    el.classList.remove("collapsed");
    btn.textContent = "Show less";
  } else {
    el.classList.add("collapsed");
    btn.textContent = "Show more";
  }
}

function closePlayer(skipHistory) {
  const overlay = document.getElementById("playerOverlay");
  const iframe = document.getElementById("playerIframe");
  const wrapper = document.getElementById("customPlayerWrapper");
  const details = document.getElementById("playerDetails");
  // Clean up custom player
  destroyCustomPlayer();
  wrapper.style.display = 'none';
  iframe.style.display = '';
  iframe.src = "";
  if (details) details.innerHTML = "";
  overlay.classList.remove("visible");
  document.body.style.overflow = "";
  document.getElementById("bottomTabBar").style.display = "";
  // Reset state
  usingCustomPlayer = false;
  _cpLocked = false;
  document.getElementById("cpLockOverlay").style.display = 'none';
  // Lock back to portrait when leaving player
  try {
    // if (screen.orientation && screen.orientation.lock)
    //   screen.orientation.lock("portrait").catch(() => {});
  } catch (e) {}
  currentPlayerMedia = null;
  // Clean up panels
  document.getElementById("serverPanel").classList.remove("open");
  document.getElementById("serverToggle").classList.remove("active");
  if (!skipHistory && playerPushedState) {
    playerPushedState = false;
    history.back();
  } else {
    playerPushedState = false;
    // Always clean up the URL if it shows a player route
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/watch/')) {
      const cleanUrl = getUrlForPage(state.page, state.searchQuery || null);
      history.replaceState(
        { page: state.page, query: state.searchQuery || null },
        "",
        cleanUrl
      );
    }
  }
}

// === SERVER PANEL LOGIC ===
function togglePanel(panel) {
  if (panel === "server") {
    const serverPanel = document.getElementById("serverPanel");
    const serverToggle = document.getElementById("serverToggle");
    const isOpen = serverPanel.classList.contains("open");
    serverPanel.classList.toggle("open");
    serverToggle.classList.toggle("active", !isOpen);
  }
}

function renderServerList() {
  const el = document.getElementById("serverList");
  let html = "";
  SERVERS.forEach((s) => {
    if (s.isDropdown) {
      // AutoEmbed with expandable dropdown of sub-servers
      const isActive = currentServer.id === s.id;
      html += `<div class="server-item ${
        isActive ? "active" : ""
      }" onclick="toggleAutoEmbedDropdown()">
  <div class="server-icon">${ICONS[s.icon]}</div>
  <div class="server-info"><h4>${s.name}</h4><p>${s.desc}${
        isActive ? " &middot; Server #" + currentAutoEmbedServer : ""
      }</p></div>
  <span class="server-badge">${isActive ? "Active" : "Expand"}</span>
</div>
<div class="autoembed-dropdown" id="autoembedDropdown" style="display:none;padding:0 8px 8px;"></div>`;
    } else {
      html += `<div class="server-item ${
        s.id === currentServer.id ? "active" : ""
      }" onclick="switchServer('${s.id}')">
  <div class="server-icon">${ICONS[s.icon]}</div>
  <div class="server-info"><h4>${s.name}</h4><p>${s.desc}</p></div>
  <span class="server-badge">${
    s.id === currentServer.id ? "Active" : "Switch"
  }</span>
</div>`;
    }
  });
  el.innerHTML = html;
}

function toggleAutoEmbedDropdown() {
  const dropdown = document.getElementById("autoembedDropdown");
  if (!dropdown) return;
  if (dropdown.style.display === "none") {
    let btns = "";
    for (let i = 1; i <= AUTOEMBED_SERVERS; i++) {
      const isActive =
        currentServer.id === "autoembed" && currentAutoEmbedServer === i;
      btns += `<button class="autoembed-btn ${
        isActive ? "active" : ""
      }" onclick="switchAutoEmbed(${i})">Server #${i}</button>`;
    }
    dropdown.innerHTML = btns;
    dropdown.style.display = "flex";
  } else {
    dropdown.style.display = "none";
  }
}

function switchAutoEmbed(serverNum) {
  const server = SERVERS.find((s) => s.id === "autoembed");
  if (!server || !currentPlayerMedia) return;
  currentServer = server;
  currentAutoEmbedServer = serverNum;
  const { id, type, season, episode } = currentPlayerMedia;
  const url = server.buildUrl(id, type, season, episode, serverNum);
  document.getElementById("playerIframe").src = url;
  renderServerList();
  // Show dropdown still open with updated active state
  setTimeout(() => toggleAutoEmbedDropdown(), 50);
}

async function switchServer(serverId) {
  const server = SERVERS.find((s) => s.id === serverId);
  if (!server || !currentPlayerMedia) return;
  currentServer = server;
  const { id, type, season, episode } = currentPlayerMedia;
  renderServerList();
  // Close panel after selection
  setTimeout(() => togglePanel("server"), 300);
  // Try extraction with the new server
  await attemptExtractOrFallback(id, type, season, episode);
}

// POSTMESSAGE LISTENER FOR PLAYER PROGRESS (Videasy, Vidking, etc.)
window.addEventListener("message", (e) => {
  try {
    const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    if (!data) return;
    // Handle Videasy progress format: { id, type, progress, timestamp, duration, season, episode }
    if (
      data.progress !== undefined &&
      data.duration !== undefined &&
      currentPlayerMedia
    ) {
      const key = `${currentPlayerMedia.type}_${currentPlayerMedia.id}`;
      const progressStore = getProgress();
      if (!progressStore[key])
        progressStore[key] = {
          id: currentPlayerMedia.id,
          type: currentPlayerMedia.type,
          season: currentPlayerMedia.season,
          episode: currentPlayerMedia.episode,
          timestamp: Date.now(),
        };
      progressStore[key].currentTime = data.timestamp || 0;
      progressStore[key].duration = data.duration;
      progressStore[key].percent =
        typeof data.progress === "number" ? Math.round(data.progress) : 0;
      progressStore[key].timestamp = Date.now();
      if (data.season) progressStore[key].season = data.season;
      if (data.episode) progressStore[key].episode = data.episode;
      localStorage.setItem("nekoflix_progress", JSON.stringify(progressStore));
      return;
    }
    // Handle PLAYER_EVENT format
    if (data.type === "PLAYER_EVENT" && data.data) {
      const evt = data.data;
      if (currentPlayerMedia && evt.currentTime !== undefined) {
        const key = `${currentPlayerMedia.type}_${currentPlayerMedia.id}`;
        const progress = getProgress();
        if (!progress[key])
          progress[key] = {
            id: currentPlayerMedia.id,
            type: currentPlayerMedia.type,
            season: currentPlayerMedia.season,
            episode: currentPlayerMedia.episode,
            timestamp: Date.now(),
          };
        progress[key].currentTime = evt.currentTime;
        progress[key].duration = evt.duration;
        progress[key].percent = evt.duration
          ? Math.round((evt.currentTime / evt.duration) * 100)
          : 0;
        progress[key].timestamp = Date.now();
        localStorage.setItem("nekoflix_progress", JSON.stringify(progress));
      }
      return;
    }
    // Handle legacy timeupdate format
    if (data.type === "timeupdate" && data.id) {
      const percent = data.duration
        ? Math.round((data.currentTime / data.duration) * 100)
        : 0;
      const progress = getProgress();
      const key = Object.keys(progress).find((k) => k.includes(data.id));
      if (key) {
        progress[key].percent = percent;
        progress[key].currentTime = data.currentTime;
        progress[key].duration = data.duration;
        progress[key].timestamp = Date.now();
        localStorage.setItem("nekoflix_progress", JSON.stringify(progress));
      }
    }
  } catch (err) {}
});

/* === SECTION: JS SEARCH AND EVENTS === */
let searchTimeout;
const searchInput = document.getElementById("searchInput");
const searchDropdown = document.getElementById("searchDropdown");
const searchBox = document.getElementById("searchBox");
const searchBtn = document.getElementById("searchBtn");

searchBtn.addEventListener("click", () => {
  searchBox.classList.toggle("open");
  if (searchBox.classList.contains("open")) searchInput.focus();
});

searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim();
  if (!q) {
    searchDropdown.classList.remove("visible");
    return;
  }
  searchTimeout = setTimeout(async () => {
    const data = await searchMulti(q);
    const items = data.results
      .filter((i) => i.media_type !== "person")
      .slice(0, 8);
    if (!items.length) {
      searchDropdown.innerHTML =
        '<div style="padding:1rem;color:var(--gray)">No results</div>';
      searchDropdown.classList.add("visible");
      return;
    }
    searchDropdown.innerHTML = items
      .map(
        (i) => `<div class="search-item" data-id="${
          i.id
        }" data-type="${mediaType(i)}">
<img src="${imgUrl(i.poster_path)}" alt="">
<div class="search-item-info">
  <h4>${i.title || i.name}</h4>
  <p>${year(i.release_date || i.first_air_date)} &middot; ${mediaType(
          i
        ).toUpperCase()}</p>
</div>
    </div>`
      )
      .join("");
    searchDropdown.classList.add("visible");
  }, 400);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && searchInput.value.trim()) {
    searchDropdown.classList.remove("visible");
    navigateTo("search", searchInput.value.trim());
  }
});

searchDropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".search-item");
  if (item) {
    searchDropdown.classList.remove("visible");
    showModal(item.dataset.id, item.dataset.type);
  }
});

document.addEventListener("click", (e) => {
  if (!searchBox.contains(e.target)) {
    searchDropdown.classList.remove("visible");
  }
});

// EVENT DELEGATION
document.getElementById("mainContent").addEventListener("click", (e) => {
  if (e.target.closest(".card-add-btn")) return;
  const card = e.target.closest(".card");
  if (card) {
    // If it's a continue watching card, play directly at saved position
    if (card.dataset.cw === "true") {
      const id = card.dataset.id;
      const type = card.dataset.type;
      const season = parseInt(card.dataset.season) || 1;
      const episode = parseInt(card.dataset.episode) || 1;
      playMedia(id, type, season, episode);
      return;
    }
    showModal(card.dataset.id, card.dataset.type);
    return;
  }
  const infoBtn = e.target.closest(".btn-info");
  if (infoBtn) {
    showModal(infoBtn.dataset.id, infoBtn.dataset.type);
  }
});

document.getElementById("modalContent").addEventListener("click", (e) => {
  if (e.target.closest(".card-add-btn")) return;
  const card = e.target.closest(".card");
  if (card) {
    showModal(card.dataset.id, card.dataset.type);
  }
});

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
});

document.getElementById("playerBack").addEventListener("click", () => {
  closePlayer();
});

// NAVBAR (throttled scroll handler for performance)
const navbar = document.getElementById("navbar");
let _scrollTick = false;
window.addEventListener(
  "scroll",
  () => {
    if (!_scrollTick) {
      _scrollTick = true;
      requestAnimationFrame(() => {
        navbar.classList.toggle("scrolled", window.scrollY > 50);
        _scrollTick = false;
      });
    }
  },
  { passive: true }
);

document.querySelectorAll("[data-page]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

// ROUTER with History API
function getUrlForPage(page, query) {
  switch (page) {
    case "home":
      return "/";
    case "movies":
      return "/movies";
    case "tv":
      return "/tv";
    case "watchlist":
      return "/watchlist";
    case "collections":
      return "/collections";
    case "history":
      return "/history";
    case "search":
      return query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    case "ott":
      return `/platform/${query}`;
    case "browse":
      return `/browse/${query}`;
    case "platforms":
      return "/platforms";
    case "browse-hub":
      return "/browse";
    default:
      return "/";
  }
}

function getPageFromUrl() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  if (path === "/movies") return { page: "movies" };
  if (path === "/tv") return { page: "tv" };
  if (path === "/watchlist") return { page: "watchlist" };
  if (path === "/collections") return { page: "collections" };
  if (path === "/history") return { page: "history" };
  if (path === "/search")
    return { page: "search", query: params.get("q") || "" };
  if (path === "/platforms") return { page: "platforms" };
  if (path.startsWith("/platform/"))
    return { page: "ott", query: path.split("/platform/")[1] };
  if (path === "/browse") return { page: "browse-hub" };
  if (path.startsWith("/browse/"))
    return { page: "browse", query: path.split("/browse/")[1] };
  // Modal routes
  if (path.startsWith("/movie/"))
    return { page: "modal", type: "movie", id: path.split("/movie/")[1] };
  if (path.startsWith("/tv/") && path !== "/tv")
    return { page: "modal", type: "tv", id: path.split("/tv/")[1] };
  // Player routes
  if (path.startsWith("/watch/movie/"))
    return {
      page: "player",
      type: "movie",
      id: path.split("/watch/movie/")[1],
    };
  if (path.startsWith("/watch/tv/")) {
    const parts = path.split("/watch/tv/")[1].split("/");
    return {
      page: "player",
      type: "tv",
      id: parts[0],
      season: parts[1] || "1",
      episode: parts[2] || "1",
    };
  }
  return { page: "home" };
}

function navigateTo(page, query, pushState = true) {
  state.page = page;
  // Clear hero carousel interval when leaving page
  if (heroInterval) {
    clearInterval(heroInterval);
    heroInterval = null;
  }
  document
    .querySelectorAll(".nav-links a")
    .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
  // Update bottom tab bar active state
  document
    .querySelectorAll(".bottom-tab-bar a")
    .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
  window.scrollTo(0, 0);
  // Close modal without affecting history (navigation handles its own history)
  closeModal(true);
  closePlayer(true);

  // Push state to browser history
  if (pushState) {
    const url = getUrlForPage(page, query);
    history.pushState({ page, query: query || null }, "", url);
  }

  switch (page) {
    case "home":
      renderHome();
      break;
    case "movies":
      renderMovies();
      break;
    case "tv":
      renderTV();
      break;
    case "watchlist":
      renderWatchlist();
      break;
    case "collections":
      renderCollections();
      break;
    case "history":
      renderHistory();
      break;
    case "search":
      if (query) {
        renderSearch(query);
      } else {
        // Open mobile search overlay when tapping search tab
        const mobileSearchOverlay = document.getElementById(
          "mobileSearchOverlay"
        );
        mobileSearchOverlay.classList.add("visible");
        document.body.style.overflow = "hidden";
        setTimeout(
          () => document.getElementById("mobileSearchInput").focus(),
          100
        );
      }
      break;
    case "platforms":
      renderPlatformsHub();
      break;
    case "ott":
      if (query) renderOTTPage(query);
      break;
    case "browse-hub":
      renderBrowseHub();
      break;
    case "browse":
      if (query) renderBrowsePage(query);
      break;
  }
}

// Handle browser back/forward buttons
window.addEventListener("popstate", (e) => {
  // If player is open and we navigated back from it, close it without another history.back()
  const playerOverlay = document.getElementById("playerOverlay");
  if (
    playerOverlay.classList.contains("visible") &&
    !(e.state && e.state.player)
  ) {
    playerPushedState = false;
    closePlayer(true);
    // If we also came from a modal state, check if we need to show it
    if (e.state && e.state.modal) {
      showModal(e.state.id, e.state.type);
      modalPushedState = false; // Don't re-push, it's already in history
      return;
    }
  }

  // If a modal is currently open and we navigated back from it, close it without another history.back()
  const modalOverlay = document.getElementById("modalOverlay");
  if (
    modalOverlay.classList.contains("visible") &&
    !(e.state && e.state.modal)
  ) {
    modalPushedState = false;
    closeModal(true);
  }

  // Handle forward navigation to modal/player URLs
  if (e.state && e.state.modal) {
    showModal(e.state.id, e.state.type);
    modalPushedState = false; // Already in history
    return;
  }
  if (e.state && e.state.player) {
    playMedia(
      e.state.id,
      e.state.type,
      e.state.season || 1,
      e.state.episode || 1
    );
    playerPushedState = false; // Already in history
    return;
  }

  // Regular page navigation
  if (e.state && e.state.page) {
    navigateTo(e.state.page, e.state.query || null, false);
  } else {
    const { page, query, type, id, season, episode } = getPageFromUrl();
    if (page === "modal") {
      showModal(id, type);
      modalPushedState = false;
    } else if (page === "player") {
      playMedia(id, type, season || 1, episode || 1);
      playerPushedState = false;
    } else {
      navigateTo(page, query, false);
    }
  }
});

/* === SECTION: JS MOBILE NAV, SEARCH, AND PWA === */
// Side nav
const sideNav = document.getElementById("sideNav");
const sideNavOverlay = document.getElementById("sideNavOverlay");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sideNavClose = document.getElementById("sideNavClose");

function openSideNav() {
  sideNav.classList.add("open");
  sideNavOverlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}
function closeSideNav() {
  sideNav.classList.remove("open");
  sideNavOverlay.classList.remove("visible");
  document.body.style.overflow = "";
}

mobileMenuBtn.addEventListener("click", openSideNav);
sideNavClose.addEventListener("click", closeSideNav);
sideNavOverlay.addEventListener("click", closeSideNav);

document.querySelectorAll(".side-nav-links a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document
      .querySelectorAll(".side-nav-links a")
      .forEach((a) => a.classList.remove("active"));
    link.classList.add("active");
    closeSideNav();
    navigateTo(link.dataset.page);
  });
});

// Mobile fullscreen search
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const mobileSearchOverlay = document.getElementById("mobileSearchOverlay");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileSearchCancel = document.getElementById("mobileSearchCancel");
const mobileSearchResults = document.getElementById("mobileSearchResults");
let mobileSearchTimeout;

mobileSearchBtn.addEventListener("click", () => {
  mobileSearchOverlay.classList.add("visible");
  document.body.style.overflow = "hidden";
  setTimeout(() => mobileSearchInput.focus(), 100);
});

mobileSearchCancel.addEventListener("click", () => {
  mobileSearchOverlay.classList.remove("visible");
  document.body.style.overflow = "";
  mobileSearchInput.value = "";
  mobileSearchResults.innerHTML = "";
});

mobileSearchInput.addEventListener("input", (e) => {
  clearTimeout(mobileSearchTimeout);
  const q = e.target.value.trim();
  if (!q) {
    mobileSearchResults.innerHTML = "";
    return;
  }
  mobileSearchTimeout = setTimeout(async () => {
    const data = await searchMulti(q);
    const items = data.results
      .filter((i) => i.media_type !== "person")
      .slice(0, 15);
    if (!items.length) {
      mobileSearchResults.innerHTML =
        '<div style="padding:2rem;text-align:center;color:var(--gray)">No results found</div>';
      return;
    }
    mobileSearchResults.innerHTML = items
      .map(
        (i) => `<div class="search-item" data-id="${
          i.id
        }" data-type="${mediaType(i)}">
<img src="${imgUrl(i.poster_path)}" alt="">
<div class="search-item-info">
  <h4>${i.title || i.name}</h4>
  <p>${year(i.release_date || i.first_air_date)} &middot; ${mediaType(
          i
        ).toUpperCase()} &middot; ${ICONS.star} ${rating(i.vote_average)}</p>
</div>
    </div>`
      )
      .join("");
  }, 400);
});

mobileSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && mobileSearchInput.value.trim()) {
    mobileSearchOverlay.classList.remove("visible");
    document.body.style.overflow = "";
    navigateTo("search", mobileSearchInput.value.trim());
  }
});

mobileSearchResults.addEventListener("click", (e) => {
  const item = e.target.closest(".search-item");
  if (item) {
    mobileSearchOverlay.classList.remove("visible");
    document.body.style.overflow = "";
    showModal(item.dataset.id, item.dataset.type);
  }
});

// PWA Install
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
const installNavBtn = document.getElementById("installNavBtn");
const mobileInstallBanner = document.getElementById("mobileInstallBanner");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.add("show");
  installNavBtn.classList.add("show");
  // Show mobile banner if not previously dismissed
  if (!localStorage.getItem("nekoflix_install_dismissed")) {
    mobileInstallBanner.classList.add("show");
  }
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((result) => {
      if (result.outcome === "accepted") {
        installBtn.classList.remove("show");
        installNavBtn.classList.remove("show");
        mobileInstallBanner.classList.remove("show");
      }
      deferredPrompt = null;
    });
  }
}

function dismissInstallBanner() {
  mobileInstallBanner.classList.remove("show");
  localStorage.setItem("nekoflix_install_dismissed", "1");
}

// Register service worker for PWA + ad blocking
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((reg) => {
      reg.update();
    })
    .catch(() => {});
}

/* === SECTION: AD BLOCKER ENGINE === */

/* === SECTION: TOP 10 ROW === */
function top10RowHTML(title, items, id) {
  return `<div class="row row-animated" id="${id || ""}">
    <h2 class="row-title">${title}</h2>
    <div class="row-container">
<button class="row-arrow left" onclick="scrollRow(this,-1)">${
    ICONS.chevronLeft
  }</button>
<div class="top10-scroll">${items
    .slice(0, 10)
    .map((item, idx) => {
      const type = mediaType(item);
      const title = item.title || item.name || "";
      return `<div class="top10-card" data-id="${
        item.id
      }" data-type="${type}" onclick="showModal(${item.id},'${type}')">
    <span class="top10-rank">${idx + 1}</span>
    <img src="${imgUrl(item.poster_path)}" alt="${title}" loading="lazy">
  </div>`;
    })
    .join("")}</div>
<button class="row-arrow right" onclick="scrollRow(this,1)">${
    ICONS.chevronRight
  }</button>
    </div>
  </div><div class="row-separator"></div>`;
}

/* === SECTION: COLLECTIONS === */
const COLLECTIONS = [
  {
    id: "award_winners",
    title: "Award Winners",
    desc: "Academy & Golden Globe favorites",
    keywords: "27205,597,424,550,13,680,122,637,857",
    color: "#d4af37",
    fetchBackdrop: "movie/27205",
  },
  {
    id: "true_stories",
    title: "Based on True Stories",
    desc: "Real events, real drama",
    genre: "18",
    keyword: "based-on-true-story",
    color: "#4a90d9",
    fetchBackdrop: "movie/597",
  },
  {
    id: "binge_worthy",
    title: "Binge-worthy Series",
    desc: "Can't stop, won't stop",
    type: "tv",
    color: "#e91e63",
    fetchBackdrop: "tv/1396",
  },
  {
    id: "mind_bending",
    title: "Mind-Bending",
    desc: "Sci-fi thrillers that twist your brain",
    genres: "878,53",
    color: "#7c4dff",
    fetchBackdrop: "movie/157336",
  },
  {
    id: "feel_good",
    title: "Feel Good",
    desc: "Light-hearted comfort watches",
    genres: "35,10749",
    color: "#ffb300",
    fetchBackdrop: "movie/508442",
  },
  {
    id: "epic_adventures",
    title: "Epic Adventures",
    desc: "Grand-scale action & fantasy",
    genres: "12,14",
    color: "#00bfa5",
    fetchBackdrop: "movie/122",
  },
];

async function loadCollection(collection, page = 1) {
  if (collection.keywords) {
    const ids = collection.keywords.split(",");
    const results = await Promise.all(ids.map((id) => getMovieDetails(id)));
    return {
      items: results
        .filter((r) => r && r.id)
        .map((r) => ({ ...r, media_type: "movie" })),
      hasMore: false,
    };
  } else if (collection.type === "tv") {
    const data = await api(
      `/discover/tv?sort_by=vote_count.desc&vote_average.gte=8&vote_count.gte=500&page=${page}`
    );
    return {
      items: (data.results || []).map((i) => ({ ...i, media_type: "tv" })),
      hasMore: page < (data.total_pages || 1),
    };
  } else if (collection.genres) {
    const data = await api(
      `/discover/movie?sort_by=vote_count.desc&vote_average.gte=7&with_genres=${collection.genres}&vote_count.gte=300&page=${page}`
    );
    return {
      items: (data.results || []).map((i) => ({ ...i, media_type: "movie" })),
      hasMore: page < (data.total_pages || 1),
    };
  } else if (collection.genre) {
    const data = await api(
      `/discover/movie?sort_by=vote_count.desc&vote_average.gte=7.5&with_genres=${collection.genre}&vote_count.gte=500&page=${page}`
    );
    return {
      items: (data.results || []).map((i) => ({ ...i, media_type: "movie" })),
      hasMore: page < (data.total_pages || 1),
    };
  }
  return { items: [], hasMore: false };
}

function collectionsRowHTML() {
  return `<div class="row row-animated" id="collectionsRow">
    <h2 class="row-title">Collections</h2>
    <div class="row-container">
<button class="row-arrow left" onclick="scrollRow(this,-1)">${
    ICONS.chevronLeft
  }</button>
<div class="collections-grid">${COLLECTIONS.map(
    (
      c
    ) => `<div class="collection-card" onclick="openCollection('${c.id}')" data-collection-id="${c.id}">
  <div class="collection-card-bg" style="background:${c.color}33"></div>
  <div class="collection-card-gradient" style="background:linear-gradient(135deg, ${c.color}99 0%, transparent 50%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)"></div>
  <div class="collection-card-content">
    <h3>${c.title}</h3>
    <p>${c.desc}</p>
  </div>
</div>`
  ).join("")}</div>
<button class="row-arrow right" onclick="scrollRow(this,1)">${
    ICONS.chevronRight
  }</button>
    </div>
  </div><div class="row-separator"></div>`;
}

// Lazy-load collection card backdrops from TMDB
async function loadCollectionBackdrops() {
  for (const c of COLLECTIONS) {
    if (!c.fetchBackdrop) continue;
    try {
      const data = await api(`/${c.fetchBackdrop}`);
      if (data && data.backdrop_path) {
        const card = document.querySelector(
          `[data-collection-id="${c.id}"] .collection-card-bg`
        );
        if (card) {
          card.style.backgroundImage = `url('${IMG}w780${data.backdrop_path}')`;
        }
      }
    } catch (e) {}
  }
}

async function openCollection(collectionId) {
  const collection = COLLECTIONS.find((c) => c.id === collectionId);
  if (!collection) return;
  const main = document.getElementById("mainContent");
  main.innerHTML = `<h1 class="page-title">${collection.title}</h1><p style="padding:0 4%;color:var(--gray);margin-top:8px">${collection.desc}</p><div class="page-grid" id="pageGrid"><div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--gray)">Loading...</div></div><button class="load-more" id="loadMoreCollection" style="display:none">Load More</button>`;
  state.page = "collection";
  state.collectionPage = 1;
  state.currentCollection = collection;
  window.scrollTo(0, 0);
  await loadCollectionPage();
}

async function loadCollectionPage() {
  const collection = state.currentCollection;
  const grid = document.getElementById("pageGrid");
  const btn = document.getElementById("loadMoreCollection");
  if (!collection || !grid) return;
  // Clear loading placeholder on first load
  if (state.collectionPage === 1) grid.innerHTML = "";
  const { items, hasMore } = await loadCollection(
    collection,
    state.collectionPage
  );
  if (items.length) {
    const existingCount = grid.querySelectorAll(".card").length;
    grid.insertAdjacentHTML(
      "beforeend",
      items.map((i, idx) => cardHTML(i, existingCount + idx)).join("")
    );
  } else if (state.collectionPage === 1) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--gray)">No items found.</div>';
  }
  if (btn) {
    btn.style.display = hasMore ? "block" : "none";
    btn.onclick = () => {
      state.collectionPage++;
      loadCollectionPage();
    };
  }
}

/* === SECTION: OTT PLATFORM PAGES === */
const OTT_PROVIDERS = [
  { id: "netflix", name: "Netflix", providerId: 8, color: "#e50914" },
  { id: "prime", name: "Amazon Prime", providerId: 9, color: "#00a8e1" },
  { id: "disney", name: "Disney+", providerId: 337, color: "#113ccf" },
  { id: "hulu", name: "Hulu", providerId: 15, color: "#1ce783" },
  { id: "hbo", name: "HBO Max", providerId: 384, color: "#b535f6" },
  { id: "apple", name: "Apple TV+", providerId: 350, color: "#555555" },
  { id: "paramount", name: "Paramount+", providerId: 531, color: "#0064ff" },
  { id: "peacock", name: "Peacock", providerId: 386, color: "#000000" },
];

function discoverByProvider(
  providerId,
  type = "movie",
  page = 1,
  region = "US",
  extraParams = ""
) {
  return api(
    `/discover/${type}?sort_by=popularity.desc&with_watch_providers=${providerId}&watch_region=${region}&vote_count.gte=50&page=${page}${extraParams}`
  );
}

async function renderOTTPage(providerId) {
  const provider = OTT_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return;
  const main = document.getElementById("mainContent");
  state.page = "ott";
  state.ottProvider = provider;
  state.ottPage = 1;
  state.ottType = "all";
  state.ottGenre = "";
  state.ottYear = "";
  state.ottRating = "";

  // Ensure genres are loaded
  if (!state.movieGenres || !state.movieGenres.length) {
    try {
      const genreData = await api("/genre/movie/list");
      state.movieGenres = genreData.genres || [];
    } catch (e) {}
  }

  const genreOptions = [
    { value: "", label: "All Genres" },
    ...state.movieGenres.map((g) => ({ value: String(g.id), label: g.name })),
  ];
  const currentYear = new Date().getFullYear();
  const yearOptions = [{ value: "", label: "All Years" }];
  for (let y = currentYear; y >= 1990; y--)
    yearOptions.push({ value: String(y), label: String(y) });
  const ratingOptions = [
    { value: "", label: "Any Rating" },
    { value: "7", label: "7+ Rating" },
    { value: "8", label: "8+ Rating" },
    { value: "9", label: "9+ Rating" },
  ];

  main.innerHTML = `<h1 class="page-title" style="border-left-color:${
    provider.color
  }">${provider.name}</h1>
    <div class="filter-pills" style="padding:0 4%;margin-top:12px">
      <button class="filter-pill active" onclick="switchOTTType('all',this)">All</button>
      <button class="filter-pill" onclick="switchOTTType('movie',this)">Movies</button>
      <button class="filter-pill" onclick="switchOTTType('tv',this)">TV Shows</button>
    </div>
    <div class="filter-bar" style="padding:0 4%;margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
      ${createDropdown(genreOptions, {
        id: "ottGenreFilter",
        selected: "",
        searchable: true,
        placeholder: "All Genres",
      })}
      ${createDropdown(yearOptions, {
        id: "ottYearFilter",
        selected: "",
        searchable: false,
        placeholder: "All Years",
      })}
      ${createDropdown(ratingOptions, {
        id: "ottRatingFilter",
        selected: "",
        searchable: false,
        placeholder: "Any Rating",
      })}
    </div>
    <div class="page-grid" id="pageGrid"><div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--gray)">Loading...</div></div>
    <button class="load-more" id="loadMore">Load More</button>`;

  // Init filter dropdowns
  initDropdowns(main);
  // Register dropdown change handlers
  window["_dropdown_change_ottGenreFilter"] = (val) => {
    state.ottGenre = val;
    applyOTTFilters();
  };
  window["_dropdown_change_ottYearFilter"] = (val) => {
    state.ottYear = val;
    applyOTTFilters();
  };
  window["_dropdown_change_ottRatingFilter"] = (val) => {
    state.ottRating = val;
    applyOTTFilters();
  };

  await loadOTTContent();
  document.getElementById("loadMore").onclick = loadOTTContent;
}

function getOTTFilterParams() {
  let params = "";
  if (state.ottGenre) params += `&with_genres=${state.ottGenre}`;
  if (state.ottYear)
    params += `&primary_release_year=${state.ottYear}&first_air_date_year=${state.ottYear}`;
  if (state.ottRating) params += `&vote_average.gte=${state.ottRating}`;
  return params;
}

function applyOTTFilters() {
  state.ottPage = 1;
  const grid = document.getElementById("pageGrid");
  if (grid) grid.innerHTML = "";
  loadOTTContent();
}

async function loadOTTContent() {
  const grid = document.getElementById("pageGrid");
  const provider = state.ottProvider;
  if (!provider) return;

  // Clear loading placeholder on first load
  if (state.ottPage === 1) grid.innerHTML = "";

  const extraParams = getOTTFilterParams();

  if (state.ottType === "all" || state.ottType === "movie") {
    const movieData = await discoverByProvider(
      provider.providerId,
      "movie",
      state.ottPage,
      "US",
      extraParams
    );
    const movies = (movieData.results || [])
      .filter((i) => i.poster_path)
      .map((i) => ({ ...i, media_type: "movie" }));
    if (state.ottType === "all") {
      const tvData = await discoverByProvider(
        provider.providerId,
        "tv",
        state.ottPage,
        "US",
        extraParams
      );
      const tvShows = (tvData.results || [])
        .filter((i) => i.poster_path)
        .map((i) => ({ ...i, media_type: "tv" }));
      const mixed = [];
      const maxLen = Math.max(movies.length, tvShows.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < movies.length) mixed.push(movies[i]);
        if (i < tvShows.length) mixed.push(tvShows[i]);
      }
      const existingCount = grid.querySelectorAll(".card").length;
      grid.insertAdjacentHTML(
        "beforeend",
        mixed.map((i, idx) => cardHTML(i, existingCount + idx)).join("")
      );
    } else {
      const existingCount = grid.querySelectorAll(".card").length;
      grid.insertAdjacentHTML(
        "beforeend",
        movies.map((i, idx) => cardHTML(i, existingCount + idx)).join("")
      );
    }
  } else if (state.ottType === "tv") {
    const tvData = await discoverByProvider(
      provider.providerId,
      "tv",
      state.ottPage,
      "US",
      extraParams
    );
    const tvShows = (tvData.results || [])
      .filter((i) => i.poster_path)
      .map((i) => ({ ...i, media_type: "tv" }));
    const existingCount = grid.querySelectorAll(".card").length;
    grid.insertAdjacentHTML(
      "beforeend",
      tvShows.map((i, idx) => cardHTML(i, existingCount + idx)).join("")
    );
  }
  state.ottPage++;
}

function switchOTTType(type, btn) {
  state.ottType = type;
  state.ottPage = 1;
  btn.parentElement
    .querySelectorAll(".filter-pill")
    .forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  const grid = document.getElementById("pageGrid");
  grid.innerHTML = "";
  loadOTTContent();
}

async function renderPlatformsHub() {
  const main = document.getElementById("mainContent");
  state.page = "platforms";
  main.innerHTML = `<h1 class="page-title">Platforms</h1>
    <p style="padding:0 4%;color:var(--gray);margin-top:8px;margin-bottom:1.5rem">Browse content by streaming platform</p>
    <div class="page-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px" id="platformsGrid">${OTT_PROVIDERS.map(
      (
        p
      ) => `<div class="collection-card ott-card" style="width:auto;height:140px" onclick="navigateTo('ott','${p.id}')" data-provider-id="${p.providerId}">
      <div class="collection-card-bg" style="background:${p.color}33"></div>
      <div class="collection-card-gradient" style="background:linear-gradient(135deg, ${p.color}cc 0%, ${p.color}44 40%, rgba(20,20,20,0.95) 100%)"></div>
      <div class="collection-card-content" style="z-index:3">
        <h3>${p.name}</h3>
        <p>Movies & TV Shows</p>
      </div>
    </div>`
    ).join("")}</div>`;
  // Fetch provider logos and backdrops
  loadPlatformBackdrops();
}

async function loadPlatformBackdrops() {
  // Fetch watch provider list to get official logos
  try {
    const providerData = await api("/watch/providers/movie?watch_region=US");
    const providerList = providerData.results || [];
    for (const p of OTT_PROVIDERS) {
      const providerInfo = providerList.find(
        (pr) => pr.provider_id === p.providerId
      );
      const card = document.querySelector(
        `[data-provider-id="${p.providerId}"]`
      );
      if (!card) continue;
      // Add logo if found
      if (providerInfo && providerInfo.logo_path) {
        const logo = document.createElement("img");
        logo.className = "ott-logo";
        logo.src = `${IMG}w200${providerInfo.logo_path}`;
        logo.alt = p.name;
        logo.onerror = function () {
          this.style.display = "none";
        };
        card.appendChild(logo);
      }
      // Fetch a popular movie from this provider for backdrop
      try {
        const movieData = await discoverByProvider(p.providerId, "movie", 1);
        const firstWithBackdrop = (movieData.results || []).find(
          (m) => m.backdrop_path
        );
        if (firstWithBackdrop) {
          const bg = card.querySelector(".collection-card-bg");
          if (bg)
            bg.style.backgroundImage = `url('${IMG}w780${firstWithBackdrop.backdrop_path}')`;
        }
      } catch (e) {}
    }
  } catch (e) {}
}

/* === SECTION: GENRE/COUNTRY PRESET PAGES === */
const BROWSE_PRESETS = [
  {
    id: "korean",
    name: "Korean Series & Movies",
    country: "KR",
    genres: null,
    color: "#ff5252",
  },
  {
    id: "japanese",
    name: "Japanese Series & Movies",
    country: "JP",
    genres: null,
    color: "#ff1744",
  },
  {
    id: "romcom",
    name: "Romantic Comedy",
    country: null,
    genres: "35,10749",
    color: "#ff4081",
  },
  {
    id: "fantasy",
    name: "Fantasy Series & Movies",
    country: null,
    genres: "14",
    color: "#651fff",
  },
  {
    id: "anime-style",
    name: "Animation",
    country: null,
    genres: "16",
    color: "#00e5ff",
  },
  {
    id: "thriller",
    name: "Thriller",
    country: null,
    genres: "53",
    color: "#263238",
  },
  {
    id: "horror",
    name: "Horror",
    country: null,
    genres: "27",
    color: "#b71c1c",
  },
  {
    id: "documentary",
    name: "Documentaries",
    country: null,
    genres: "99",
    color: "#1b5e20",
  },
  {
    id: "indian",
    name: "Indian Series & Movies",
    country: "IN",
    genres: null,
    color: "#ff6f00",
  },
  {
    id: "french",
    name: "French Series & Movies",
    country: "FR",
    genres: null,
    color: "#1565c0",
  },
  {
    id: "spanish",
    name: "Spanish Series & Movies",
    country: "ES",
    genres: null,
    color: "#f44336",
  },
];

async function renderBrowsePage(presetId) {
  const preset = BROWSE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  const main = document.getElementById("mainContent");
  state.page = "browse";
  state.browsePreset = preset;
  state.browsePage = 1;
  state.browseType = "all";

  main.innerHTML = `<h1 class="page-title">${preset.name}</h1>
    <div class="filter-pills" style="padding:0 4%;margin-top:12px">
      <button class="filter-pill active" onclick="switchBrowseType('all',this)">All</button>
      <button class="filter-pill" onclick="switchBrowseType('movie',this)">Movies</button>
      <button class="filter-pill" onclick="switchBrowseType('tv',this)">TV Shows</button>
    </div>
    <div class="page-grid" id="pageGrid"><div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--gray)">Loading...</div></div>
    <button class="load-more" id="loadMore">Load More</button>`;
  await loadBrowseContent();
  document.getElementById("loadMore").onclick = loadBrowseContent;
}

function buildBrowseEndpoint(preset, type, page) {
  let ep = `/discover/${type}?sort_by=popularity.desc&vote_count.gte=50&page=${page}`;
  if (preset.country) ep += `&with_origin_country=${preset.country}`;
  if (preset.genres) ep += `&with_genres=${preset.genres}`;
  return ep;
}

async function loadBrowseContent() {
  const grid = document.getElementById("pageGrid");
  const preset = state.browsePreset;
  if (!preset) return;

  // Clear loading placeholder on first load
  if (state.browsePage === 1) grid.innerHTML = "";

  if (state.browseType === "all") {
    const [movieData, tvData] = await Promise.all([
      api(buildBrowseEndpoint(preset, "movie", state.browsePage)),
      api(buildBrowseEndpoint(preset, "tv", state.browsePage)),
    ]);
    const movies = (movieData.results || [])
      .filter((i) => i.poster_path)
      .map((i) => ({ ...i, media_type: "movie" }));
    const tvShows = (tvData.results || [])
      .filter((i) => i.poster_path)
      .map((i) => ({ ...i, media_type: "tv" }));
    const mixed = [];
    const maxLen = Math.max(movies.length, tvShows.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < movies.length) mixed.push(movies[i]);
      if (i < tvShows.length) mixed.push(tvShows[i]);
    }
    const existingCount = grid.querySelectorAll(".card").length;
    grid.insertAdjacentHTML(
      "beforeend",
      mixed.map((i, idx) => cardHTML(i, existingCount + idx)).join("")
    );
  } else {
    const data = await api(
      buildBrowseEndpoint(preset, state.browseType, state.browsePage)
    );
    const items = (data.results || [])
      .filter((i) => i.poster_path)
      .map((i) => ({ ...i, media_type: state.browseType }));
    const existingCount = grid.querySelectorAll(".card").length;
    grid.insertAdjacentHTML(
      "beforeend",
      items.map((i, idx) => cardHTML(i, existingCount + idx)).join("")
    );
  }
  state.browsePage++;
}

function switchBrowseType(type, btn) {
  state.browseType = type;
  state.browsePage = 1;
  btn.parentElement
    .querySelectorAll(".filter-pill")
    .forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  const grid = document.getElementById("pageGrid");
  grid.innerHTML = "";
  loadBrowseContent();
}

async function renderBrowseHub() {
  const main = document.getElementById("mainContent");
  state.page = "browse-hub";
  main.innerHTML = `<h1 class="page-title">Browse</h1>
    <p style="padding:0 4%;color:var(--gray);margin-top:8px;margin-bottom:1.5rem">Explore by genre and country</p>
    <div class="page-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:16px" id="browseGrid">${BROWSE_PRESETS.map(
      (
        p
      ) => `<div class="collection-card" style="width:auto;height:140px" onclick="navigateTo('browse','${p.id}')" data-browse-id="${p.id}">
      <div class="collection-card-bg" style="background:${p.color}33"></div>
      <div class="collection-card-gradient" style="background:linear-gradient(135deg, ${p.color}aa 0%, transparent 50%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)"></div>
      <div class="collection-card-content">
        <h3>${p.name}</h3>
      </div>
    </div>`
    ).join("")}</div>`;
  // Fetch backdrops for each browse category
  loadBrowseBackdrops();
}

async function loadBrowseBackdrops() {
  for (const p of BROWSE_PRESETS) {
    try {
      const ep = buildBrowseEndpoint(p, "movie", 1);
      const data = await api(ep);
      const firstWithBackdrop = (data.results || []).find(
        (m) => m.backdrop_path
      );
      if (firstWithBackdrop) {
        const card = document.querySelector(
          `[data-browse-id="${p.id}"] .collection-card-bg`
        );
        if (card)
          card.style.backgroundImage = `url('${IMG}w780${firstWithBackdrop.backdrop_path}')`;
      }
    } catch (e) {}
  }
}

/* === SECTION: SURPRISE ME === */
async function surpriseMe() {
  const btn = document.getElementById("surpriseBtn");
  btn.style.transform = "scale(0.9) rotate(360deg)";
  setTimeout(() => (btn.style.transform = ""), 400);

  try {
    // Random page 1-5
    const page = Math.floor(Math.random() * 5) + 1;
    // Random type: movie or tv
    const type = Math.random() > 0.4 ? "movie" : "tv";
    const data =
      type === "movie"
        ? await api(
            `/discover/movie?sort_by=popularity.desc&vote_average.gte=6&vote_count.gte=200&page=${page}`
          )
        : await api(
            `/discover/tv?sort_by=popularity.desc&vote_average.gte=6&vote_count.gte=200&page=${page}`
          );

    if (data.results && data.results.length) {
      const randomIdx = Math.floor(Math.random() * data.results.length);
      const item = data.results[randomIdx];
      showModal(item.id, type);
    }
  } catch (e) {
    console.error("Surprise failed:", e);
  }
}

/* === SECTION: WATCH HISTORY PAGE === */
async function renderHistory() {
  const main = document.getElementById("mainContent");
  const progress = getProgress();
  const entries = Object.entries(progress).sort(
    (a, b) => b[1].timestamp - a[1].timestamp
  );

  let html = `<h1 class="page-title">Watch History</h1>`;

  if (entries.length === 0) {
    html += `<div class="watchlist-empty">
<div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
<h3>No watch history</h3>
<p>Movies and shows you watch will appear here.</p>
    </div>`;
    main.innerHTML = html;
    return;
  }

  html += `<button class="history-clear-all" onclick="clearAllHistory()">Clear All History</button>`;
  html += `<div id="historyList" style="margin-top:12px">`;

  // Fetch details for all history items
  const details = await Promise.all(
    entries.slice(0, 50).map(async ([key, val]) => {
      const [type, id] = key.split("_");
      try {
        const d =
          type === "movie" ? await getMovieDetails(id) : await getTVDetails(id);
        return { key, data: d, progress: val, type };
      } catch (e) {
        return null;
      }
    })
  );

  const validDetails = details.filter(Boolean);
  validDetails.forEach(({ key, data, progress: prog, type }) => {
    const title = data.title || data.name || "";
    const percent = prog.percent || 0;
    const seasonEp =
      type === "tv" && prog.season ? `S${prog.season} E${prog.episode}` : "";
    const watchedAgo = getTimeAgo(prog.timestamp);

    html += `<div class="history-item" data-key="${key}" onclick="showModal(${
      data.id
    },'${type}')">
<img src="${imgUrl(data.poster_path)}" alt="${title}" loading="lazy">
<div class="history-item-info">
  <h4>${title}</h4>
  <p>${
    seasonEp ? seasonEp + " &middot; " : ""
  }${percent}% watched &middot; ${watchedAgo}</p>
  <div class="history-item-progress"><div class="history-item-progress-fill" style="width:${percent}%"></div></div>
</div>
<div class="history-item-actions">
  <button onclick="event.stopPropagation();playFromHistory('${key}','${type}',${
      data.id
    },${prog.season || 1},${prog.episode || 1})">${ICONS.play}</button>
  <button onclick="event.stopPropagation();removeHistory('${key}',this)">${
      ICONS.trash
    }</button>
</div>
    </div>`;
  });

  html += `</div>`;
  main.innerHTML = html;
}

function getTimeAgo(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return Math.floor(days / 7) + "w ago";
}

function playFromHistory(key, type, id, season, episode) {
  playMedia(id, type, season, episode);
}

function removeHistory(key, btn) {
  const progress = getProgress();
  delete progress[key];
  localStorage.setItem("nekoflix_progress", JSON.stringify(progress));
  const item = btn.closest(".history-item");
  if (item) {
    item.style.transform = "translateX(-100%)";
    item.style.opacity = "0";
    setTimeout(() => item.remove(), 300);
  }
}

function clearAllHistory() {
  if (confirm("Clear all watch history? This cannot be undone.")) {
    localStorage.removeItem("nekoflix_progress");
    renderHistory();
  }
}

/* === SECTION: SWIPE TO REMOVE (WATCHLIST) === */
function initSwipeToRemove() {
  const grid = document.getElementById("watchlistGrid");
  if (!grid) return;

  let startX = 0,
    currentX = 0,
    swiping = false,
    activeCard = null;

  grid.addEventListener(
    "touchstart",
    (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      startX = e.touches[0].clientX;
      currentX = startX;
      swiping = true;
      activeCard = card;
    },
    { passive: true }
  );

  grid.addEventListener(
    "touchmove",
    (e) => {
      if (!swiping || !activeCard) return;
      currentX = e.touches[0].clientX;
      const diff = startX - currentX;
      if (diff > 10) {
        const translateX = Math.min(diff, 120);
        activeCard.style.transform = `translateX(-${translateX}px)`;
        activeCard.style.transition = "none";
      }
    },
    { passive: true }
  );

  grid.addEventListener(
    "touchend",
    (e) => {
      if (!swiping || !activeCard) return;
      swiping = false;
      const diff = startX - currentX;
      if (diff > 80) {
        // Swiped enough — remove
        const id = activeCard.dataset.id;
        activeCard.style.transform = "translateX(-100%)";
        activeCard.style.opacity = "0";
        activeCard.style.transition = "all 0.3s ease";
        setTimeout(() => {
          let list = getWatchlist();
          list = list.filter((w) => w.id != id);
          saveWatchlist(list);
          activeCard.remove();
          const grid = document.getElementById("watchlistGrid");
          if (grid && !grid.children.length) renderWatchlist();
        }, 300);
      } else {
        // Snap back
        activeCard.style.transform = "";
        activeCard.style.transition = "transform 0.2s ease";
      }
      activeCard = null;
    },
    { passive: true }
  );
}

/* === SECTION: JS INIT === */
// Initialize based on current URL (supports reload and direct navigation)
(function initFromUrl() {
  const { page, query, type, id, season, episode } = getPageFromUrl();

  // Handle modal/player URLs on direct load
  if (page === "modal") {
    // For modal URLs, render home in background then show modal
    history.replaceState(
      { modal: true, type, id },
      "",
      window.location.pathname
    );
    state.page = "home";
    renderHome();
    showModal(id, type);
    modalPushedState = false; // Don't double-push since we replaced state
    return;
  }
  if (page === "player") {
    // For player URLs, render home in background then play
    history.replaceState(
      { player: true, type, id, season, episode },
      "",
      window.location.pathname
    );
    state.page = "home";
    renderHome();
    playMedia(id, type, parseInt(season) || 1, parseInt(episode) || 1);
    playerPushedState = false; // Don't double-push since we replaced state
    return;
  }

  // Replace current history entry so popstate works correctly
  history.replaceState(
    { page, query: query || null },
    "",
    getUrlForPage(page, query)
  );
  // Update nav active states
  document
    .querySelectorAll(".nav-links a")
    .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
  document
    .querySelectorAll(".bottom-tab-bar a")
    .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
  document
    .querySelectorAll(".side-nav-links a")
    .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
  // Render the correct page
  state.page = page;
  switch (page) {
    case "home":
      renderHome();
      break;
    case "movies":
      renderMovies();
      break;
    case "tv":
      renderTV();
      break;
    case "watchlist":
      renderWatchlist();
      break;
    case "collections":
      renderCollections();
      break;
    case "history":
      renderHistory();
      break;
    case "search":
      if (query) renderSearch(query);
      break;
    case "platforms":
      renderPlatformsHub();
      break;
    case "ott":
      if (query) renderOTTPage(query);
      break;
    case "browse-hub":
      renderBrowseHub();
      break;
    case "browse":
      if (query) renderBrowsePage(query);
      break;
  }
})();

/* === SECTION: MINI PLAYER (SWIPE DOWN TO MINIMIZE) === */
(function initMiniPlayer() {
  const overlay = document.getElementById("playerOverlay");
  const videoSection = document.querySelector(".player-video-section");
  const dragHandle = document.getElementById("playerDragHandle");
  if (!overlay || !videoSection || !dragHandle) return;

  let startY = 0;
  let currentY = 0;
  let dragging = false;
  let isMinimized = false;

  function isMobilePortrait() {
    return (
      window.innerWidth <= 768 &&
      window.matchMedia("(orientation: portrait)").matches
    );
  }

  // Attach touch events to both drag handle and entire video section for reliability
  function handleTouchStart(e) {
    if (!isMobilePortrait() || isMinimized) return;
    if (!overlay.classList.contains("visible")) return;
    startY = e.touches[0].clientY;
    currentY = startY;
    dragging = true;
    videoSection.style.transition = "none";
  }

  function handleTouchMove(e) {
    if (!dragging) return;
    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;

    // Only allow dragging down
    if (diffY > 0) {
      // Prevent scrolling while dragging down
      if (e.cancelable) e.preventDefault();
      const progress = Math.min(diffY / 200, 1);
      const scale = 1 - progress * 0.5;
      const translateY = diffY * 0.5;
      const opacity = 1 - progress * 0.4;
      videoSection.style.transform = `translateY(${translateY}px) scale(${scale})`;
      videoSection.style.opacity = opacity;
    }
  }

  function handleTouchEnd(e) {
    if (!dragging) return;
    dragging = false;
    const diffY = currentY - startY;

    videoSection.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    videoSection.style.transform = "";
    videoSection.style.opacity = "";
    setTimeout(() => {
      videoSection.style.transition = "";
    }, 350);

    // If dragged down more than 80px, minimize
    if (diffY > 80) {
      minimizePlayer();
    }
  }

  // Attach to drag handle (passive: false to allow preventDefault)
  dragHandle.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
  dragHandle.addEventListener("touchmove", handleTouchMove, { passive: false });
  dragHandle.addEventListener("touchend", handleTouchEnd, { passive: true });

  // Also attach to the entire video section for more reliable detection
  videoSection.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
  videoSection.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });
  videoSection.addEventListener("touchend", handleTouchEnd, { passive: true });

  // Also allow tapping the mini player to expand
  videoSection.addEventListener("click", function (e) {
    if (!isMinimized) return;
    // Don't expand if clicking control buttons
    if (e.target.closest(".mini-player-controls")) return;
    maximizePlayer();
  });

  // Expose minimize/maximize functions globally
  window.minimizePlayer = function () {
    if (isMinimized) return;
    isMinimized = true;
    overlay.classList.add("minimizing");
    // Small delay to allow transition class to take effect
    requestAnimationFrame(() => {
      overlay.classList.add("minimized");
      document.body.style.overflow = "";
      document.getElementById("bottomTabBar").style.display = "";
      // Remove transition helper after animation
      setTimeout(() => overlay.classList.remove("minimizing"), 350);
    });
  };

  window.maximizePlayer = function () {
    if (!isMinimized) return;
    overlay.classList.add("maximizing");
    overlay.classList.remove("minimized");
    document.body.style.overflow = "hidden";
    document.getElementById("bottomTabBar").style.display = "none";
    isMinimized = false;
    setTimeout(() => overlay.classList.remove("maximizing"), 350);
  };

  window.closeMiniPlayer = function () {
    isMinimized = false;
    overlay.classList.remove("minimized", "minimizing", "maximizing");
    closePlayer();
  };

  // Override closePlayer to also reset mini state
  const originalClosePlayer = window.closePlayer;
  window.closePlayer = function (skipHistory) {
    isMinimized = false;
    overlay.classList.remove("minimized", "minimizing", "maximizing");
    if (typeof originalClosePlayer === "function") {
      originalClosePlayer(skipHistory);
    } else {
      const iframe = document.getElementById("playerIframe");
      const details = document.getElementById("playerDetails");
      iframe.src = "";
      if (details) details.innerHTML = "";
      overlay.classList.remove("visible");
      document.body.style.overflow = "";
      document.getElementById("bottomTabBar").style.display = "";
      currentPlayerMedia = null;
      document.getElementById("serverPanel").classList.remove("open");
      document.getElementById("serverToggle").classList.remove("active");
    }
  };

  // Back button always fully closes the player
  const playerBack = document.getElementById("playerBack");
  if (playerBack) {
    const newBack = playerBack.cloneNode(true);
    playerBack.parentNode.replaceChild(newBack, playerBack);
    newBack.id = "playerBack";
    newBack.addEventListener("click", function () {
      closePlayer();
    });
  }
})();

/* === SECTION: GUIDED PICKER (TINDER-STYLE) === */
(function initGuidedPicker() {
  const PICKER_TOTAL = 6;
  let pickerItems = [];
  let pickerIndex = 0;
  let pickerLiked = [];
  let pickerSkipped = [];
  let pickerTouchStartX = 0;
  let pickerTouchCurrentX = 0;
  let pickerDragging = false;
  let pickerCardEl = null;

  const overlay = document.getElementById("pickerOverlay");
  const closeBtn = document.getElementById("pickerClose");
  const cardStack = document.getElementById("pickerCardStack");
  const progressEl = document.getElementById("pickerProgress");
  const actionsEl = document.getElementById("pickerActions");
  const resultsEl = document.getElementById("pickerResults");

  closeBtn.addEventListener("click", closePicker);

  function closePicker() {
    overlay.classList.remove("visible");
    document.body.style.overflow = "";
    pickerItems = [];
    pickerIndex = 0;
    pickerLiked = [];
    pickerSkipped = [];
  }

  window.openPicker = async function () {
    overlay.classList.add("visible");
    document.body.style.overflow = "hidden";
    pickerItems = [];
    pickerIndex = 0;
    pickerLiked = [];
    pickerSkipped = [];
    actionsEl.style.display = "flex";
    resultsEl.style.display = "none";
    cardStack.style.display = "";
    cardStack.innerHTML =
      '<div class="picker-loading"><div class="picker-loading-spinner"></div><span>Finding great picks...</span></div>';
    renderProgress();

    // Fetch cards — prioritize personalized content if available
    try {
      const seen = new Set();
      let personalizedPool = [];

      // Try to get personalized recommendations from watch history
      const { watchedIds } = getUserPreferences();
      if (watchedIds.length > 0) {
        // Fetch recommendations and similar in parallel
        const recent = watchedIds.slice(0, 3);
        const recPromises = recent.map((item) =>
          item.type === "movie"
            ? getRecommendationsMovie(item.id)
            : getRecommendationsTV(item.id)
        );
        const simPromises = recent
          .slice(0, 2)
          .map((item) =>
            item.type === "movie"
              ? getSimilarMovies(item.id)
              : getSimilarTV(item.id)
          );

        try {
          const [recResults, simResults] = await Promise.all([
            Promise.all(recPromises),
            Promise.all(simPromises),
          ]);

          recResults.forEach((data, idx) => {
            if (data.results) {
              data.results
                .filter(
                  (i) =>
                    i.poster_path && i.overview && (i.vote_count || 0) >= 100
                )
                .forEach((i) => {
                  if (!seen.has(i.id)) {
                    seen.add(i.id);
                    personalizedPool.push({
                      ...i,
                      media_type: i.media_type || recent[idx].type,
                    });
                  }
                });
            }
          });
          simResults.forEach((data, idx) => {
            if (data.results) {
              data.results
                .filter(
                  (i) =>
                    i.poster_path && i.overview && (i.vote_count || 0) >= 100
                )
                .forEach((i) => {
                  if (!seen.has(i.id)) {
                    seen.add(i.id);
                    personalizedPool.push({
                      ...i,
                      media_type: i.media_type || recent[idx].type,
                    });
                  }
                });
            }
          });
        } catch (e) {}
      }

      // Shuffle personalized pool
      personalizedPool.sort(() => Math.random() - 0.5);

      // If we have enough personalized items, use them (mix)
      if (personalizedPool.length >= PICKER_TOTAL) {
        pickerItems = personalizedPool.slice(0, PICKER_TOTAL);
      } else {
        // Fill remaining slots with trending/popular
        const pages = [
          Math.floor(Math.random() * 3) + 1,
          Math.floor(Math.random() * 3) + 1,
        ];
        const [trending, popularMovies] = await Promise.all([
          api(`/trending/all/week?page=${pages[0]}`),
          api(`/movie/popular?page=${pages[1]}`),
        ]);

        let fallbackPool = [];
        if (trending.results)
          fallbackPool.push(
            ...trending.results.filter(
              (i) => i.poster_path && i.overview && (i.vote_count || 0) >= 100
            )
          );
        if (popularMovies.results)
          fallbackPool.push(
            ...popularMovies.results
              .filter(
                (i) => i.poster_path && i.overview && (i.vote_count || 0) >= 100
              )
              .map((i) => ({ ...i, media_type: "movie" }))
          );
        fallbackPool = fallbackPool.filter((i) => {
          if (seen.has(i.id)) return false;
          seen.add(i.id);
          return true;
        });
        fallbackPool.sort(() => Math.random() - 0.5);

        // Interleave: personalized first, then fill with fallback
        pickerItems = [...personalizedPool, ...fallbackPool].slice(
          0,
          PICKER_TOTAL
        );
      }

      // Final fallback if still not enough
      if (pickerItems.length < PICKER_TOTAL) {
        const extra = await api("/movie/top_rated");
        if (extra.results) {
          extra.results
            .filter((i) => i.poster_path && i.overview && !seen.has(i.id))
            .forEach((i) => {
              pickerItems.push({ ...i, media_type: "movie" });
              seen.add(i.id);
            });
        }
        pickerItems = pickerItems.slice(0, PICKER_TOTAL);
      }

      renderCards();
      renderProgress();
    } catch (e) {
      cardStack.innerHTML =
        '<div class="picker-loading"><span>Something went wrong. Try again.</span></div>';
    }
  };

  function generatePitch(item) {
    const genres = item.genre_ids || [];
    const title = item.title || item.name || "";
    const overview = item.overview || "";
    // Create a punchy one-liner from the overview
    if (overview.length > 0) {
      // Take first sentence or first ~80 chars
      const firstSentence = overview.split(/[.!?]/)[0];
      if (firstSentence && firstSentence.length <= 100) {
        return firstSentence + ".";
      }
      return overview.substring(0, 90).trim() + "...";
    }
    return title;
  }

  function renderProgress() {
    let html = "";
    for (let i = 0; i < PICKER_TOTAL; i++) {
      let cls = "picker-progress-dot";
      if (i < pickerIndex) {
        // Check if this was liked or skipped
        if (pickerLiked.find((item) => item === pickerItems[i]))
          cls += " liked";
        else cls += " done";
      } else if (i === pickerIndex) {
        cls += " current";
      }
      html += `<div class="${cls}"></div>`;
    }
    progressEl.innerHTML = html;
  }

  function renderCards() {
    if (pickerIndex >= pickerItems.length || pickerIndex >= PICKER_TOTAL) {
      showResults();
      return;
    }

    let html = "";
    // Show up to 3 cards in stack
    for (
      let i = Math.min(pickerIndex + 2, pickerItems.length - 1);
      i >= pickerIndex;
      i--
    ) {
      const item = pickerItems[i];
      const type = mediaType(item);
      const title = item.title || item.name || "";
      const pitch = generatePitch(item);
      const stackClass =
        i === pickerIndex
          ? ""
          : i === pickerIndex + 1
          ? "behind"
          : "far-behind";

      html += `<div class="picker-card ${stackClass}" data-picker-idx="${i}">
        <img class="picker-card-img" src="${imgUrl(
          item.poster_path,
          "w780"
        )}" alt="${title}" draggable="false">
        <div class="picker-card-info">
          <div class="picker-card-title">${title}</div>
          <div class="picker-card-pitch">${pitch}</div>
          <div class="picker-card-meta">
            <span class="pcm-rating">${ICONS.star} ${rating(
        item.vote_average
      )}</span>
            <span>${year(item.release_date || item.first_air_date)}</span>
            ${
              type === "tv"
                ? '<span class="pcm-type">TV</span>'
                : '<span class="pcm-type">MOVIE</span>'
            }
          </div>
        </div>
        <div class="picker-card-stamp stamp-like">LIKE</div>
        <div class="picker-card-stamp stamp-skip">SKIP</div>
      </div>`;
    }
    cardStack.innerHTML = html;
    initCardSwipe();
  }

  function initCardSwipe() {
    const card = cardStack.querySelector(
      ".picker-card:not(.behind):not(.far-behind)"
    );
    if (!card) return;
    pickerCardEl = card;

    card.addEventListener("touchstart", onTouchStart, { passive: true });
    card.addEventListener("touchmove", onTouchMove, { passive: false });
    card.addEventListener("touchend", onTouchEnd, { passive: true });
    card.addEventListener("mousedown", onMouseDown);
  }

  function onTouchStart(e) {
    pickerTouchStartX = e.touches[0].clientX;
    pickerTouchCurrentX = pickerTouchStartX;
    pickerDragging = true;
    if (pickerCardEl) pickerCardEl.style.transition = "none";
  }

  function onTouchMove(e) {
    if (!pickerDragging || !pickerCardEl) return;
    pickerTouchCurrentX = e.touches[0].clientX;
    const diff = pickerTouchCurrentX - pickerTouchStartX;
    applyDragTransform(diff);
    if (Math.abs(diff) > 10 && e.cancelable) e.preventDefault();
  }

  function onTouchEnd() {
    if (!pickerDragging || !pickerCardEl) return;
    pickerDragging = false;
    const diff = pickerTouchCurrentX - pickerTouchStartX;
    finalizeDrag(diff);
  }

  // Mouse support for desktop
  let mouseDown = false;
  let mouseStartX = 0;

  function onMouseDown(e) {
    mouseDown = true;
    mouseStartX = e.clientX;
    pickerTouchStartX = e.clientX;
    if (pickerCardEl) pickerCardEl.style.transition = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!mouseDown || !pickerCardEl) return;
    const diff = e.clientX - mouseStartX;
    applyDragTransform(diff);
  }

  function onMouseUp(e) {
    if (!mouseDown || !pickerCardEl) return;
    mouseDown = false;
    const diff = e.clientX - mouseStartX;
    finalizeDrag(diff);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  function applyDragTransform(diff) {
    if (!pickerCardEl) return;
    const rotate = diff * 0.08;
    const maxDiff = 150;
    const clampedDiff = Math.max(-maxDiff, Math.min(maxDiff, diff));
    pickerCardEl.style.transform = `translateX(${clampedDiff}px) rotate(${rotate}deg)`;

    // Show stamps based on direction
    if (diff > 40) {
      pickerCardEl.classList.add("swiping-right");
      pickerCardEl.classList.remove("swiping-left");
    } else if (diff < -40) {
      pickerCardEl.classList.add("swiping-left");
      pickerCardEl.classList.remove("swiping-right");
    } else {
      pickerCardEl.classList.remove("swiping-left", "swiping-right");
    }
  }

  function finalizeDrag(diff) {
    if (!pickerCardEl) return;
    pickerCardEl.style.transition = "";
    if (diff > 80) {
      performSwipe("right");
    } else if (diff < -80) {
      performSwipe("left");
    } else {
      // Snap back
      pickerCardEl.style.transform = "";
      pickerCardEl.classList.remove("swiping-left", "swiping-right");
    }
  }

  window.pickerSwipe = function (direction) {
    performSwipe(direction);
  };

  function performSwipe(direction) {
    if (!pickerCardEl || pickerIndex >= PICKER_TOTAL) return;

    const item = pickerItems[pickerIndex];
    if (direction === "right") {
      pickerLiked.push(item);
      pickerCardEl.classList.add("exit-right");
    } else {
      pickerSkipped.push(item);
      pickerCardEl.classList.add("exit-left");
    }

    pickerIndex++;
    renderProgress();

    // After animation, render next cards
    setTimeout(() => {
      renderCards();
    }, 350);
  }

  async function showResults() {
    actionsEl.style.display = "none";
    cardStack.innerHTML =
      '<div class="picker-loading"><div class="picker-loading-spinner"></div><span>Finding your perfect matches...</span></div>';

    // Build recommendations from liked items
    let recommendations = [];
    const seenIds = new Set(pickerItems.map((i) => i.id));

    if (pickerLiked.length > 0) {
      // Get recommendations based on liked items
      const recPromises = pickerLiked.slice(0, 4).map((item) => {
        const type = mediaType(item);
        return type === "movie"
          ? getRecommendationsMovie(item.id)
          : getRecommendationsTV(item.id);
      });

      try {
        const results = await Promise.all(recPromises);
        results.forEach((data, idx) => {
          if (data.results) {
            data.results.forEach((item) => {
              if (!seenIds.has(item.id) && item.poster_path) {
                seenIds.add(item.id);
                recommendations.push({
                  ...item,
                  media_type: item.media_type || mediaType(pickerLiked[idx]),
                });
              }
            });
          }
        });
      } catch (e) {}

      // Also get similar titles
      try {
        const simPromises = pickerLiked.slice(0, 2).map((item) => {
          const type = mediaType(item);
          return type === "movie"
            ? getSimilarMovies(item.id)
            : getSimilarTV(item.id);
        });
        const simResults = await Promise.all(simPromises);
        simResults.forEach((data, idx) => {
          if (data.results) {
            data.results.forEach((item) => {
              if (!seenIds.has(item.id) && item.poster_path) {
                seenIds.add(item.id);
                recommendations.push({
                  ...item,
                  media_type: item.media_type || mediaType(pickerLiked[idx]),
                });
              }
            });
          }
        });
      } catch (e) {}
    }

    // Shuffle and limit
    recommendations.sort(() => Math.random() - 0.5);
    recommendations = recommendations.slice(0, 12);

    // If user liked nothing, show trending as fallback
    if (recommendations.length === 0) {
      try {
        const fallback = await api("/trending/all/week");
        if (fallback.results) {
          recommendations = fallback.results
            .filter((i) => i.poster_path && !seenIds.has(i.id))
            .slice(0, 12);
        }
      } catch (e) {}
    }

    // Render results
    cardStack.style.display = "none";
    resultsEl.style.display = "block";

    const likedCount = pickerLiked.length;
    const headerText =
      likedCount > 0
        ? `Based on your ${likedCount} like${
            likedCount > 1 ? "s" : ""
          }, watch these`
        : "Here are some popular picks for you";

    let html = `<div class="picker-results-header">
      <h2>${headerText}</h2>
      <p>${recommendations.length} perfect matches found</p>
    </div>
    <div class="picker-results-grid">`;

    recommendations.forEach((item, idx) => {
      const type = mediaType(item);
      const title = item.title || item.name || "";
      html += `<div class="picker-result-card" data-id="${
        item.id
      }" data-type="${type}" style="animation-delay:${
        idx * 0.06
      }s" onclick="pickerOpenItem(${item.id},'${type}')">
        <img src="${imgUrl(
          item.poster_path,
          "w300"
        )}" alt="${title}" loading="lazy">
        <div class="picker-result-card-info">
          <h4>${title}</h4>
          <span>${ICONS.star} ${rating(item.vote_average)}</span>
        </div>
      </div>`;
    });

    html += `</div>
    <div class="picker-results-actions">
      <button class="picker-restart" onclick="openPicker()">Try Again</button>
      <button class="picker-done" onclick="document.getElementById('pickerOverlay').classList.remove('visible');document.body.style.overflow=''">Done</button>
    </div>`;

    resultsEl.innerHTML = html;
  }

  window.pickerOpenItem = function (id, type) {
    closePicker();
    setTimeout(() => showModal(id, type), 100);
  };

  // Keyboard support
  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("visible")) return;
    if (resultsEl.style.display !== "none") return;
    if (e.key === "ArrowLeft") {
      pickerSwipe("left");
    } else if (e.key === "ArrowRight") {
      pickerSwipe("right");
    } else if (e.key === "Escape") {
      closePicker();
    }
  });
})();

/* === SECTION: TRAILER FEED (TIKTOK-STYLE) === */
(function initTrailerFeed() {
  const overlay = document.getElementById("trailerFeedOverlay");
  const container = document.getElementById("trailerFeedContainer");
  const closeBtn = document.getElementById("trailerFeedClose");
  const muteBtn = document.getElementById("trailerFeedMute");
  const prevBtn = document.getElementById("trailerFeedPrev");
  const nextBtn = document.getElementById("trailerFeedNext");

  let feedItems = [];
  let feedIndex = 0;
  let feedMuted = false;
  let feedTouchStartY = 0;
  let feedTouchCurrentY = 0;
  let feedDragging = false;
  let feedTransitioning = false;
  let feedLoadedMore = false;

  closeBtn.addEventListener("click", closeTrailerFeed);
  muteBtn.addEventListener("click", toggleFeedMute);

  function closeTrailerFeed() {
    overlay.classList.remove("visible");
    document.body.style.overflow = "";
    // Stop all iframes
    container.querySelectorAll("iframe").forEach((f) => (f.src = ""));
    container.innerHTML = "";
    feedItems = [];
    feedIndex = 0;
  }

  function toggleFeedMute() {
    feedMuted = !feedMuted;
    muteBtn.classList.toggle("muted", feedMuted);
    if (feedMuted) {
      muteBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    } else {
      muteBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }
    // Reload current slide iframe with updated mute state
    reloadCurrentSlide();
  }

  function reloadCurrentSlide() {
    const activeSlide = container.querySelector(
      ".trailer-feed-slide.active iframe"
    );
    if (activeSlide && feedItems[feedIndex]) {
      const item = feedItems[feedIndex];
      activeSlide.src = buildTrailerEmbedUrl(item.trailerKey);
    }
  }

  function buildTrailerEmbedUrl(key) {
    const mute = feedMuted ? 1 : 0;
    return `https://www.youtube.com/embed/${key}?autoplay=1&mute=${mute}&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${key}&iv_load_policy=3&fs=0&cc_load_policy=0&playsinline=1&enablejsapi=1`;
  }

  window.openTrailerFeed = async function () {
    overlay.classList.add("visible");
    document.body.style.overflow = "hidden";
    feedItems = [];
    feedIndex = 0;
    feedLoadedMore = false;
    container.innerHTML =
      '<div class="trailer-feed-loading"><div class="picker-loading-spinner"></div><span>Loading trailers...</span></div>';

    // Fetch trending + popular items and get their trailers
    try {
      const page1 = Math.floor(Math.random() * 3) + 1;
      const [trending, popular, topRated] = await Promise.all([
        api(`/trending/all/week?page=${page1}`),
        api("/movie/popular"),
        api("/tv/popular"),
      ]);

      let candidates = [];
      if (trending.results)
        candidates.push(...trending.results.filter((i) => i.backdrop_path));
      if (popular.results)
        candidates.push(
          ...popular.results
            .filter((i) => i.backdrop_path)
            .map((i) => ({ ...i, media_type: "movie" }))
        );
      if (topRated.results)
        candidates.push(
          ...topRated.results
            .filter((i) => i.backdrop_path)
            .map((i) => ({ ...i, media_type: "tv" }))
        );

      // Deduplicate
      const seen = new Set();
      candidates = candidates.filter((i) => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });

      // Shuffle
      candidates.sort(() => Math.random() - 0.5);

      // Fetch trailers for first batch (check ~15 to find enough with trailers)
      const batch = candidates.slice(0, 18);
      const trailerResults = await Promise.all(
        batch.map((item) => {
          const type = mediaType(item);
          return getVideos(item.id, type).then((data) => ({
            item,
            videos: data,
          }));
        })
      );

      trailerResults.forEach(({ item, videos }) => {
        const videoList = (videos && videos.results) || [];
        const trailer =
          videoList.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
          videoList.find((v) => v.type === "Teaser" && v.site === "YouTube");
        if (trailer) {
          feedItems.push({
            ...item,
            trailerKey: trailer.key,
            media_type: item.media_type || mediaType(item),
          });
        }
      });

      if (feedItems.length === 0) {
        container.innerHTML =
          '<div class="trailer-feed-loading"><span>No trailers available right now. Try again later.</span></div>';
        return;
      }

      renderFeed();
    } catch (e) {
      container.innerHTML =
        '<div class="trailer-feed-loading"><span>Something went wrong. Try again.</span></div>';
    }
  };

  function renderFeed() {
    container.innerHTML = "";

    // Render current and adjacent slides
    for (let i = 0; i < feedItems.length; i++) {
      const item = feedItems[i];
      const type = item.media_type || mediaType(item);
      const title = item.title || item.name || "";
      const inList = isInWatchlist(item.id);

      let posClass = "";
      if (i === feedIndex) posClass = "active";
      else if (i < feedIndex) posClass = "above";
      else posClass = "below";

      const slide = document.createElement("div");
      slide.className = `trailer-feed-slide ${posClass}`;
      slide.dataset.idx = i;

      // Only load iframe for active and adjacent slides
      const shouldLoadIframe = Math.abs(i - feedIndex) <= 1;
      const iframeSrc =
        i === feedIndex ? buildTrailerEmbedUrl(item.trailerKey) : "";
      const preloadSrc =
        shouldLoadIframe && i !== feedIndex
          ? buildTrailerEmbedUrl(item.trailerKey).replace(
              "autoplay=1",
              "autoplay=0"
            )
          : "";

      slide.innerHTML = `
        <img class="tfs-poster" src="${imgUrl(
          item.backdrop_path,
          "w780"
        )}" alt="">
        <iframe src="${
          iframeSrc || preloadSrc
        }" allow="autoplay;encrypted-media" allowfullscreen></iframe>
        <div class="tfs-info">
          <div class="tfs-title">${title}</div>
          <div class="tfs-meta">
            <span class="tfs-rating">${ICONS.star} ${rating(
        item.vote_average
      )}</span>
            <span>${year(item.release_date || item.first_air_date)}</span>
            <span class="tfs-type">${type === "tv" ? "TV" : "MOVIE"}</span>
          </div>
          <div class="tfs-actions">
            <button class="tfs-play-btn" onclick="trailerFeedPlay(${
              item.id
            },'${type}')">${ICONS.play} Watch Now</button>
            <button class="tfs-info-btn" onclick="trailerFeedInfo(${
              item.id
            },'${type}')">Details</button>
            <button class="tfs-add-btn ${inList ? "in-list" : ""}" data-id="${
        item.id
      }" onclick="trailerFeedToggleList(this,${
        item.id
      },'${type}','${title.replace(/'/g, "\\'")}','${item.poster_path || ""}',${
        item.vote_average || 0
      },'${item.release_date || ""}','${item.first_air_date || ""}')">${
        inList ? ICONS.check : ICONS.plus
      }</button>
          </div>
        </div>
      `;
      container.appendChild(slide);
    }

    // Add counter
    updateCounter();
    // Add swipe hint on first open
    if (feedIndex === 0) {
      const hint = document.createElement("div");
      hint.className = "trailer-feed-hint";
      hint.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> Swipe up for next';
      hint.id = "trailerFeedHint";
      overlay.appendChild(hint);
      setTimeout(() => {
        const h = document.getElementById("trailerFeedHint");
        if (h) h.remove();
      }, 4000);
    }

    updateNavButtons();
    initFeedSwipe();
  }

  function updateCounter() {
    let counter = overlay.querySelector(".trailer-feed-counter");
    if (!counter) {
      counter = document.createElement("div");
      counter.className = "trailer-feed-counter";
      overlay.appendChild(counter);
    }
    counter.textContent = `${feedIndex + 1} / ${feedItems.length}`;
  }

  function updateNavButtons() {
    prevBtn.disabled = feedIndex <= 0;
    nextBtn.disabled = feedIndex >= feedItems.length - 1;
  }

  function goToSlide(newIndex) {
    if (
      newIndex < 0 ||
      newIndex >= feedItems.length ||
      newIndex === feedIndex ||
      feedTransitioning
    )
      return;
    feedTransitioning = true;

    const slides = container.querySelectorAll(".trailer-feed-slide");

    // Stop current iframe
    const currentSlide = slides[feedIndex];
    if (currentSlide) {
      const iframe = currentSlide.querySelector("iframe");
      if (iframe) iframe.src = "";
    }

    feedIndex = newIndex;

    // Update positions
    slides.forEach((slide, i) => {
      slide.classList.remove("active", "above", "below");
      if (i === feedIndex) {
        slide.classList.add("active");
        // Start playing
        const iframe = slide.querySelector("iframe");
        if (iframe) iframe.src = buildTrailerEmbedUrl(feedItems[i].trailerKey);
      } else if (i < feedIndex) {
        slide.classList.add("above");
      } else {
        slide.classList.add("below");
      }
    });

    // Preload adjacent
    [feedIndex - 1, feedIndex + 1].forEach((adjIdx) => {
      if (adjIdx >= 0 && adjIdx < feedItems.length && slides[adjIdx]) {
        const iframe = slides[adjIdx].querySelector("iframe");
        if (iframe && !iframe.src) {
          iframe.src = buildTrailerEmbedUrl(
            feedItems[adjIdx].trailerKey
          ).replace("autoplay=1", "autoplay=0");
        }
      }
    });

    updateCounter();
    updateNavButtons();

    setTimeout(() => {
      feedTransitioning = false;
    }, 450);

    // Load more trailers if near end
    if (feedIndex >= feedItems.length - 3 && !feedLoadedMore) {
      loadMoreTrailers();
    }
  }

  window.trailerFeedNav = function (dir) {
    goToSlide(feedIndex + dir);
  };

  async function loadMoreTrailers() {
    feedLoadedMore = true;
    try {
      const page = Math.floor(Math.random() * 5) + 2;
      const data = await api(`/trending/all/week?page=${page}`);
      if (!data.results) return;
      const existing = new Set(feedItems.map((i) => i.id));
      const candidates = data.results
        .filter((i) => i.backdrop_path && !existing.has(i.id))
        .slice(0, 10);

      const trailerResults = await Promise.all(
        candidates.map((item) => {
          const type = mediaType(item);
          return getVideos(item.id, type).then((d) => ({ item, videos: d }));
        })
      );

      let added = 0;
      trailerResults.forEach(({ item, videos }) => {
        const videoList = (videos && videos.results) || [];
        const trailer =
          videoList.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
          videoList.find((v) => v.type === "Teaser" && v.site === "YouTube");
        if (trailer) {
          const feedItem = {
            ...item,
            trailerKey: trailer.key,
            media_type: item.media_type || mediaType(item),
          };
          feedItems.push(feedItem);
          // Append slide to DOM
          const type = feedItem.media_type;
          const title = feedItem.title || feedItem.name || "";
          const inList = isInWatchlist(feedItem.id);
          const slide = document.createElement("div");
          slide.className = "trailer-feed-slide below";
          slide.dataset.idx = feedItems.length - 1;
          slide.innerHTML = `
            <img class="tfs-poster" src="${imgUrl(
              feedItem.backdrop_path,
              "w780"
            )}" alt="">
            <iframe src="" allow="autoplay;encrypted-media" allowfullscreen></iframe>
            <div class="tfs-info">
              <div class="tfs-title">${title}</div>
              <div class="tfs-meta">
                <span class="tfs-rating">${ICONS.star} ${rating(
            feedItem.vote_average
          )}</span>
                <span>${year(
                  feedItem.release_date || feedItem.first_air_date
                )}</span>
                <span class="tfs-type">${type === "tv" ? "TV" : "MOVIE"}</span>
              </div>
              <div class="tfs-actions">
                <button class="tfs-play-btn" onclick="trailerFeedPlay(${
                  feedItem.id
                },'${type}')">${ICONS.play} Watch Now</button>
                <button class="tfs-info-btn" onclick="trailerFeedInfo(${
                  feedItem.id
                },'${type}')">Details</button>
                <button class="tfs-add-btn ${
                  inList ? "in-list" : ""
                }" data-id="${
            feedItem.id
          }" onclick="trailerFeedToggleList(this,${
            feedItem.id
          },'${type}','${title.replace(/'/g, "\\'")}','${
            feedItem.poster_path || ""
          }',${feedItem.vote_average || 0},'${feedItem.release_date || ""}','${
            feedItem.first_air_date || ""
          }')">${inList ? ICONS.check : ICONS.plus}</button>
              </div>
            </div>
          `;
          container.appendChild(slide);
          added++;
        }
      });

      if (added > 0) {
        updateCounter();
        updateNavButtons();
      }
    } catch (e) {}
  }

  // Touch swipe handling
  function initFeedSwipe() {
    container.addEventListener("touchstart", onFeedTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", onFeedTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", onFeedTouchEnd, { passive: true });
  }

  function onFeedTouchStart(e) {
    if (feedTransitioning) return;
    feedTouchStartY = e.touches[0].clientY;
    feedTouchCurrentY = feedTouchStartY;
    feedDragging = true;
  }

  function onFeedTouchMove(e) {
    if (!feedDragging) return;
    feedTouchCurrentY = e.touches[0].clientY;
    const diff = feedTouchStartY - feedTouchCurrentY;
    if (Math.abs(diff) > 10 && e.cancelable) e.preventDefault();
  }

  function onFeedTouchEnd() {
    if (!feedDragging) return;
    feedDragging = false;
    const diff = feedTouchStartY - feedTouchCurrentY;
    if (diff > 60) {
      goToSlide(feedIndex + 1); // swipe up = next
    } else if (diff < -60) {
      goToSlide(feedIndex - 1); // swipe down = prev
    }
  }

  // Keyboard + mouse wheel
  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("visible")) return;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      goToSlide(feedIndex - 1);
    } else if (
      e.key === "ArrowDown" ||
      e.key === "ArrowRight" ||
      e.key === " "
    ) {
      e.preventDefault();
      goToSlide(feedIndex + 1);
    } else if (e.key === "Escape") {
      closeTrailerFeed();
    } else if (e.key === "m") {
      toggleFeedMute();
    }
  });

  container.addEventListener(
    "wheel",
    function (e) {
      if (!overlay.classList.contains("visible") || feedTransitioning) return;
      e.preventDefault();
      if (e.deltaY > 30) {
        goToSlide(feedIndex + 1);
      } else if (e.deltaY < -30) {
        goToSlide(feedIndex - 1);
      }
    },
    { passive: false }
  );

  // Global actions
  window.trailerFeedPlay = function (id, type) {
    closeTrailerFeed();
    setTimeout(() => playMedia(id, type, 1, 1), 150);
  };

  window.trailerFeedInfo = function (id, type) {
    closeTrailerFeed();
    setTimeout(() => showModal(id, type), 150);
  };

  window.trailerFeedToggleList = function (
    btn,
    id,
    type,
    title,
    poster,
    vote,
    release,
    airdate
  ) {
    const item = {
      id,
      media_type: type,
      title,
      name: title,
      poster_path: poster || null,
      vote_average: vote,
      release_date: release || null,
      first_air_date: airdate || null,
    };
    toggleWatchlist(item);
    const inList = isInWatchlist(id);
    btn.classList.toggle("in-list", inList);
    btn.innerHTML = inList ? ICONS.check : ICONS.plus;
  };
})();

/* === SECTION: MINI PLAYER PAUSE/RESUME === */
let miniPlayerPaused = false;

function toggleMiniPlayerPause() {
  const iframe = document.getElementById("playerIframe");
  const btn = document.getElementById("miniPlayerPause");
  if (!iframe || !btn) return;

  miniPlayerPaused = !miniPlayerPaused;

  if (miniPlayerPaused) {
    // Hide iframe content by overlaying and set visual indicator
    iframe.style.opacity = "0.4";
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    // Attempt to pause via removing src temporarily (cross-origin safe)
    iframe.dataset.pausedSrc = iframe.src;
    iframe.src = "about:blank";
  } else {
    iframe.style.opacity = "1";
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    // Restore src
    if (iframe.dataset.pausedSrc) {
      iframe.src = iframe.dataset.pausedSrc;
      delete iframe.dataset.pausedSrc;
    }
  }
}

// Reset pause state when maximizing
const _origMaximize =
  typeof maximizePlayer === "function" ? maximizePlayer : null;
if (_origMaximize) {
  const _origMaxFn = maximizePlayer;
  maximizePlayer = function () {
    miniPlayerPaused = false;
    const iframe = document.getElementById("playerIframe");
    const btn = document.getElementById("miniPlayerPause");
    if (iframe) iframe.style.opacity = "1";
    if (btn)
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    if (iframe.dataset.pausedSrc) {
      iframe.src = iframe.dataset.pausedSrc;
      delete iframe.dataset.pausedSrc;
    }
    _origMaxFn();
  };
}

/* === SECTION: LONG-PRESS CONTEXT MENU === */
(function initLongPressMenu() {
  let longPressTimer = null;
  let contextTarget = null;
  let contextData = null;
  let longPressTriggered = false;
  const menu = document.getElementById("contextMenu");
  const LONG_PRESS_DURATION = 500;

  function showContextMenu(x, y, data) {
    contextData = data;
    const ctxList = document.getElementById("ctxList");

    // Update list button text
    const inList = isInWatchlist(data.id);
    if (inList) {
      ctxList.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> In My List';
    } else {
      ctxList.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to My List';
    }

    // Position menu within viewport
    menu.style.left = Math.min(x, window.innerWidth - 200) + "px";
    menu.style.top = Math.min(y, window.innerHeight - 120) + "px";
    menu.classList.add("visible");
  }

  function hideContextMenu() {
    menu.classList.remove("visible");
    // Remove any collection submenu
    const sub = menu.querySelector(".ctx-collections-sub");
    if (sub) sub.remove();
    contextData = null;
    if (contextTarget) {
      contextTarget.classList.remove("long-pressing");
      contextTarget = null;
    }
  }

  // Expose hideContextMenu globally
  window.hideContextMenu = hideContextMenu;

  window.ctxAction = function (action) {
    if (!contextData) return;
    if (action === "play") {
      playMedia(
        contextData.id,
        contextData.type,
        contextData.season || 1,
        contextData.episode || 1
      );
    } else if (action === "list") {
      toggleWatchlist({
        id: contextData.id,
        media_type: contextData.type,
        title: contextData.title,
        name: contextData.title,
        poster_path: contextData.poster || null,
        vote_average: contextData.vote || 0,
        release_date: contextData.release || null,
        first_air_date: contextData.airdate || null,
      });
    } else if (action === "collection") {
      showAddToCollectionMenu({
        id: contextData.id,
        media_type: contextData.type,
        title: contextData.title,
        name: contextData.title,
        poster_path: contextData.poster || null,
        vote_average: contextData.vote || 0,
        release_date: contextData.release || null,
        first_air_date: contextData.airdate || null,
      });
      return; // Don't hide menu yet, sub-menu will show
    }
    hideContextMenu();
  };

  // Prevent native browser context menu on cards (prevents conflict with long-press)
  document.addEventListener("contextmenu", function (e) {
    const card = e.target.closest(".card");
    if (card) {
      e.preventDefault();
    }
    // Also prevent on the custom context menu itself
    if (menu.contains(e.target)) {
      e.preventDefault();
    }
  });

  // Touch events for long-press
  document.addEventListener(
    "touchstart",
    function (e) {
      const card = e.target.closest(".card");
      if (!card) return;

      contextTarget = card;
      longPressTriggered = false;
      card.classList.add("long-pressing");

      longPressTimer = setTimeout(function () {
        longPressTriggered = true;
        // Vibrate if available
        if (navigator.vibrate) navigator.vibrate(30);

        const touch = e.touches[0];
        const id = card.dataset.id;
        const type = card.dataset.type || "movie";
        const addBtn = card.querySelector(".card-add-btn");
        const title = addBtn ? addBtn.dataset.title : "";
        const poster = addBtn ? addBtn.dataset.poster : "";
        const vote = addBtn ? parseFloat(addBtn.dataset.vote) : 0;
        const release = addBtn ? addBtn.dataset.release : "";
        const airdate = addBtn ? addBtn.dataset.airdate : "";

        showContextMenu(touch.clientX, touch.clientY, {
          id,
          type,
          title,
          poster,
          vote,
          release,
          airdate,
        });

        card.classList.remove("long-pressing");
      }, LONG_PRESS_DURATION);
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    function () {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (contextTarget) {
          contextTarget.classList.remove("long-pressing");
        }
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    function () {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (contextTarget) {
          contextTarget.classList.remove("long-pressing");
        }
      }
    },
    { passive: true }
  );

  // Dismiss on any tap outside
  document.addEventListener(
    "touchstart",
    function (e) {
      if (menu.classList.contains("visible") && !menu.contains(e.target)) {
        hideContextMenu();
      }
    },
    { passive: true }
  );

  // Dismiss on click outside (for desktop too)
  document.addEventListener("click", function (e) {
    if (menu.classList.contains("visible") && !menu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // Also dismiss on scroll
  document.addEventListener("scroll", hideContextMenu, { passive: true });
})();
