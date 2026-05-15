// ==================== CONFIGURATION ====================
const API_KEY = "a44d005848365ef66c0f555328109508";
const API_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w300";
const PLACEHOLDER = "https://placehold.co/300x450/151515/888?text=No+Image";

let currentUser = null;
let favorites = [];
let genreList = [];
let adminSettings = {
  showTrending: true,
  showTopRated: true,
  showUpcoming: true
};

const fallbackGenres = [
  { id: 28, name: "Action" }, { id: 35, name: "Comedy" }, { id: 27, name: "Horror" },
  { id: 18, name: "Drama" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" }
];

// ==================== HELPER FUNCTIONS ====================
async function fetchData(endpoint, params = {}) {
  try {
    const query = new URLSearchParams({ api_key: API_KEY, ...params }).toString();
    const response = await fetch(`${API_URL}${endpoint}?${query}`);
    return await response.json();
  } catch (err) {
    console.error("API error:", err);
    return null;
  }
}

function getElement(id) { return document.getElementById(id); }
function showLoader() { return '<div class="loader"></div>'; }
function getPoster(path) { return path ? IMG_URL + path : PLACEHOLDER; }
function getYear(date) { return date ? date.slice(0,4) : "—"; }
function getRating(vote) { return vote ? vote.toFixed(1) : "N/A"; }

// ==================== MODAL CONTROLS (Vanilla) ====================
function openModal(modalId) {
  document.getElementById(modalId).style.display = 'flex';
}
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}
// Close modals when clicking outside
window.onclick = function(event) {
  const movieModal = document.getElementById('movieModal');
  const adminModal = document.getElementById('adminModal');
  if (event.target === movieModal) closeModal('movieModal');
  if (event.target === adminModal) closeModal('adminModal');
}

// ==================== AUTHENTICATION ====================
function getUsers() {
  if (!localStorage.users) {
    localStorage.users = JSON.stringify({ 
      admin: { password: "admin123", role: "admin" },
      user: { password: "user123", role: "user" }
    });
  }
  return JSON.parse(localStorage.users);
}

function switchTab(tab) {
  const isLogin = tab === "login";
  getElement("divLogin").style.display = isLogin ? "block" : "none";
  getElement("divSignup").style.display = isLogin ? "none" : "block";
  getElement("tabL").className = "tab-btn" + (isLogin ? " active" : "");
  getElement("tabS").className = "tab-btn" + (!isLogin ? " active" : "");
}

function doLogin() {
  const username = getElement("lUser").value;
  const password = getElement("lPass").value;
  const users = getUsers();

  if (!users[username] || users[username].password !== password) {
    alert("Invalid username or password");
    return;
  }

  currentUser = { name: username, role: users[username].role };
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  favorites = JSON.parse(localStorage.getItem(`favs_${username}`) || "[]");
  
  if (currentUser.role === "admin") {
    const saved = localStorage.getItem("adminSettings");
    if (saved) adminSettings = JSON.parse(saved);
  }

  window.location.href = "home.html";
}

function doSignup() {
  const newUser = getElement("sUser").value.trim();
  const newPass = getElement("sPass").value;
  const users = getUsers();

  if (!newUser || newPass.length < 4) {
    alert("Username and password (min 4 chars) required");
    return;
  }
  if (users[newUser]) {
    alert("Username already taken!");
    return;
  }

  users[newUser] = { password: newPass, role: "user" };
  localStorage.setItem("users", JSON.stringify(users));
  alert("Account created! Please login.");
  switchTab("login");
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "login.html";
}

// ==================== ADMIN (Vanilla Modal) ====================
function showAdminPanel() {
  if (!currentUser) {
    const saved = localStorage.getItem("currentUser");
    if (saved) currentUser = JSON.parse(saved);
  }
  if (currentUser?.role !== "admin") return;
  
  // Set checkbox states
  getElement("toggleTrending").checked = adminSettings.showTrending;
  getElement("toggleTopRated").checked = adminSettings.showTopRated;
  getElement("toggleUpcoming").checked = adminSettings.showUpcoming;
  
  openModal('adminModal');
}

function applyAdminSettings() {
  adminSettings.showTrending = getElement("toggleTrending").checked;
  adminSettings.showTopRated = getElement("toggleTopRated").checked;
  adminSettings.showUpcoming = getElement("toggleUpcoming").checked;
  localStorage.setItem("adminSettings", JSON.stringify(adminSettings));
  closeModal('adminModal');
  window.location.href = "home.html";
}

// ==================== MOVIE GRID ====================
function createMovieGrid(movies) {
  if (!movies || movies.length === 0) return '<div class="empty-state">No movies found 🎬</div>';
  let html = '<div class="movie-grid">';
  for (const movie of movies) {
    html += `
      <div class="movie-card-wrap">
        <div class="movie-card" onclick="showMovieDetail(${movie.id})">
          <img src="${getPoster(movie.poster_path)}" onerror="this.src='${PLACEHOLDER}'">
          <div class="movie-badge">⭐ ${getRating(movie.vote_average)}</div>
          <div class="movie-info">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-year">${getYear(movie.release_date)}</div>
          </div>
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

// ==================== HOME PAGE ====================
async function showHome() {
  if (!currentUser) {
    const saved = localStorage.getItem("currentUser");
    if (saved) currentUser = JSON.parse(saved);
  }
  if (currentUser?.role === "admin") {
    const saved = localStorage.getItem("adminSettings");
    if (saved) adminSettings = JSON.parse(saved);
  }

  const main = getElement("mainContent");
  main.innerHTML = `<div class="hero"><h1>DISCOVER <span>INDIAN</span> CINEMA</h1><p>Bollywood · Tollywood · Kollywood · Mollywood</p></div><div class="container">${showLoader()}</div>`;

  const today = new Date().toISOString().slice(0,10);
  const indiaParams = { with_origin_country: "IN", region: "IN" };
  let html = `<div class="hero"><h1>DISCOVER <span>INDIAN</span> CINEMA</h1><p>Bollywood · Tollywood · Kollywood · Mollywood</p></div><div class="container">`;

  if (adminSettings.showTrending) {
    const trend = await fetchData("/discover/movie", { sort_by: "popularity.desc", ...indiaParams });
    html += `<div class="section-title"><span>🔥 Trending in India</span></div>${createMovieGrid(trend?.results || [])}`;
  }
  if (adminSettings.showTopRated) {
    const top = await fetchData("/discover/movie", { sort_by: "vote_average.desc", vote_count_gte: 50, ...indiaParams });
    html += `<div class="section-title"><span>⭐ Top Rated Indian Movies</span></div>${createMovieGrid(top?.results || [])}`;
  }
  if (adminSettings.showUpcoming) {
    const up = await fetchData("/discover/movie", { sort_by: "release_date.asc", "primary_release_date.gte": today, ...indiaParams });
    html += `<div class="section-title"><span>📅 Upcoming Indian Releases</span></div>${createMovieGrid(up?.results || [])}`;
  }
  if (!adminSettings.showTrending && !adminSettings.showTopRated && !adminSettings.showUpcoming) {
    html += `<div class="empty-state">Admin has hidden all sections. Go to Admin panel to enable.</div>`;
  }
  main.innerHTML = html + `</div>`;
}

// ==================== GENRES ====================
async function showGenres() {
  if (!currentUser) {
    const saved = localStorage.getItem("currentUser");
    if (saved) currentUser = JSON.parse(saved);
  }
  const genreData = await fetchData("/genre/movie/list", { language: "en-US" });
  genreList = (genreData?.genres?.length) ? genreData.genres : fallbackGenres;
  let buttons = '';
  for (const genre of genreList) {
    buttons += `<div class="genre-card" onclick="loadGenreMovies(${genre.id}, '${genre.name}')">${genre.name}</div>`;
  }
  getElement("mainContent").innerHTML = `
    <div class="container" style="text-align:center; padding:45px 0 20px;">
      <h1 style="font-family:'Bebas Neue'; font-size:48px;">Browse <span style="color:var(--red);">Genres</span></h1>
    </div>
    <div class="container">
      <div class="genre-grid">${buttons}</div>
      <div id="genreResult"></div>
    </div>
  `;
}

async function loadGenreMovies(genreId, genreName) {
  const resultDiv = getElement("genreResult");
  resultDiv.innerHTML = showLoader();
  const data = await fetchData("/discover/movie", { with_genres: genreId, sort_by: "popularity.desc", with_origin_country: "IN", region: "IN" });
  resultDiv.innerHTML = `<div class="section-title"><span>🎬 ${genreName} (Indian)</span></div>${createMovieGrid(data?.results || [])}`;
}

// ==================== SEARCH ====================
async function searchMovie() {
  const query = getElement("searchInput").value.trim();
  if (!query) { alert("Please type something to search"); return; }
  const main = getElement("mainContent");
  main.innerHTML = `<div class="container">${showLoader()}</div>`;
  const results = await fetchData("/search/movie", { query, region: "IN" });
  main.innerHTML = `<div class="container"><div class="section-title"><span>🔍 "${query}" (Indian results)</span></div>${createMovieGrid(results?.results || [])}</div>`;
}

// ==================== FAVORITES ====================
async function showFav() {
  if (!currentUser) {
    const saved = localStorage.getItem("currentUser");
    if (saved) currentUser = JSON.parse(saved);
  }
  favorites = JSON.parse(localStorage.getItem(`favs_${currentUser?.name}`) || "[]");
  if (favorites.length === 0) {
    getElement("mainContent").innerHTML = `
      <div class="container" style="text-align:center; padding:80px 20px;">
        <i class="bi bi-heart-broken" style="font-size:60px; color:#3a3a3a;"></i>
        <h3 style="margin:18px 0;">No favorites yet</h3>
        <button class="btn-red" style="width:auto; padding:10px 30px;" onclick="location.href='home.html'">Browse Movies</button>
      </div>
    `;
    return;
  }
  getElement("mainContent").innerHTML = `<div class="container">${showLoader()}</div>`;
  const favMovies = [];
  for (const id of favorites) {
    const movie = await fetchData(`/movie/${id}`);
    if (movie) favMovies.push(movie);
  }
  getElement("mainContent").innerHTML = `
    <div class="container">
      <div class="section-title"><span>❤️ My Favorites (${favMovies.length})</span></div>
      ${createMovieGrid(favMovies)}
    </div>
  `;
}

function toggleFavorite(movieId) {
  const index = favorites.indexOf(movieId);
  if (index === -1) favorites.push(movieId);
  else favorites.splice(index, 1);
  localStorage.setItem(`favs_${currentUser.name}`, JSON.stringify(favorites));
  alert(index === -1 ? "Added to favorites! ❤️" : "Removed from favorites");
  showMovieDetail(movieId);
}

// ==================== MOVIE DETAIL (Vanilla Modal) ====================
async function showMovieDetail(movieId) {
  openModal('movieModal');
  const modalBody = getElement("modalBody");
  modalBody.innerHTML = showLoader();
  const movie = await fetchData(`/movie/${movieId}`);
  if (!movie) return;
  const isFavorite = favorites.includes(movieId);
  const poster = getPoster(movie.poster_path);
  modalBody.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:20px;">
      <img src="${poster}" style="width:150px; border-radius:14px;" onerror="this.src='${PLACEHOLDER}'">
      <div style="flex:1;">
        <h3 style="font-family:'Bebas Neue'; font-size:28px;">${movie.title}</h3>
        <p style="color:#aaa; margin:10px 0;">⭐ ${getRating(movie.vote_average)}/10 | 📅 ${movie.release_date || "?"} | ⏱️ ${movie.runtime || "?"} min</p>
        <p>${movie.overview || "No description available."}</p>
        <button class="${isFavorite ? 'btn-secondary' : 'btn-red'}" style="margin-top:15px; padding:8px 24px; border-radius:30px; border:none;" onclick="toggleFavorite(${movieId}); showMovieDetail(${movieId})">
          ${isFavorite ? "❤️ Remove from Fav" : "♡ Add to Fav"}
        </button>
      </div>
    </div>
  `;
}

// ==================== CONTACT PAGE ====================
function showContact() {
  getElement("mainContent").innerHTML = `
    <div class="container" style="padding:45px 0;">
      <div class="info-card">
        <h2 style="font-family:'Bebas Neue'; font-size:34px; text-align:center; margin-bottom:10px;">Meet Our Team</h2>
        <p style="text-align:center; color:var(--gray); margin-bottom:30px;">The creators behind MovieVault</p>
        <div class="team-grid">
          <div class="team-card"><div class="team-name">Pranav</div><a href="https://pranavvng-bot.github.io/Pranav-portfolio/" target="_blank" class="team-link">View Portfolio →</a></div>
          <div class="team-card"><div class="team-name">Adithyadev</div><a href="https://iamadithyadev.github.io/portfolio/index.html" target="_blank" class="team-link">View Portfolio →</a></div>
          <div class="team-card"><div class="team-name">Dhanesh S</div><a href="https://dhan925.github.io/portfolio-website/" target="_blank" class="team-link">View Portfolio →</a></div>
          <div class="team-card"><div class="team-name">Charan Raj</div><a href="https://cherry-91791.github.io/My-Portfolio/" target="_blank" class="team-link">View Portfolio →</a></div>
        </div>
      </div>
    </div>
  `;
}

// ==================== ABOUT PAGE ====================
function showAbout() {
  getElement("mainContent").innerHTML = `
    <div class="container" style="max-width:750px; padding:45px 0;">
      <div class="info-card">
        <h2 style="font-family:'Bebas Neue'; font-size:38px; text-align:center;">About <span style="color:var(--red);">MovieVault</span></h2>
        <div class="stat-strip">
          <div class="stat-box"><span class="stat-num">10K+</span><div>Films</div></div>
          <div class="stat-box"><span class="stat-num">5+</span><div>Industries</div></div>
          <div class="stat-box"><span class="stat-num">12+</span><div>Genres</div></div>
        </div>
        <div class="about-grid">
          <div class="about-card">🔥 Trending Indian Movies</div>
          <div class="about-card">🎭 Genre Browsing</div>
          <div class="about-card">🔍 Smart Search</div>
          <div class="about-card">❤️ Save Favorites</div>
          <div class="about-card">📅 Upcoming Indian Releases</div>
        </div>
        <div class="tech-item"><strong>Bootstrap 5</strong> - CSS Framework</div>
        <div class="tech-item"><strong>Vanilla JavaScript</strong> - No JS Framework</div>
        <div class="tech-item"><strong>TMDb API</strong> - Movie Data</div>
        <div class="tech-item"><strong>Admin Toggle</strong> - Show/hide homepage sections</div>
      </div>
    </div>
  `;
}
