// CONFIGURATION
const MOVIES_PER_PAGE = 20;
const JSON_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/movies.json'; 

// STATE MANAGEMENT
let allMovies = [];
let filteredMovies = [];
let currentPage = 1;

// DOM ELEMENTS
const movieGrid = document.getElementById('movie-grid');
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('loading-status');
const errorMsg = document.getElementById('error-message');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');

// INITIALIZATION
async function init() {
    try {
        statusText.innerText = "Connecting to database...";
        progressBar.style.width = "30%";

        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error("Fetch failed");
        
        progressBar.style.width = "60%";
        statusText.innerText = "Parsing 12,000+ movies...";
        
        allMovies = await response.json();
        
        progressBar.style.width = "100%";
        statusText.innerText = "System Ready";

        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
            
            setupFilters();
            applyFilters(); // Initial render
        }, 800);

    } catch (error) {
        console.error(error);
        statusText.style.display = 'none';
        progressBar.parentElement.style.display = 'none';
        errorMsg.style.display = 'block';
    }
}

// FILTER LOGIC
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const genre = document.getElementById('genreFilter').value;
    const year = document.getElementById('yearFilter').value;
    const sort = document.getElementById('sortFilter').value;

    // Memory-efficient filtering
    filteredMovies = allMovies.filter(movie => {
        const matchesSearch = movie.title.toLowerCase().includes(searchTerm);
        const matchesGenre = genre === 'all' || (movie.genres && movie.genres.includes(genre));
        const matchesYear = year === 'all' || movie.year.toString() === year;
        return matchesSearch && matchesGenre && matchesYear;
    });

    // Sorting
    if (sort === 'newest') filteredMovies.sort((a, b) => b.year - a.year);
    if (sort === 'oldest') filteredMovies.sort((a, b) => a.year - b.year);
    if (sort === 'rating') filteredMovies.sort((a, b) => b.rating - a.rating);
    if (sort === 'az') filteredMovies.sort((a, b) => a.title.localeCompare(b.title));

    currentPage = 1;
    renderPage();
}

// RENDERING (The core performance part)
function renderPage() {
    movieGrid.innerHTML = ''; // Clear current view
    
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const endIndex = startIndex + MOVIES_PER_PAGE;
    const pageItems = filteredMovies.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        movieGrid.innerHTML = `<div class="no-results">No movies found matching your criteria.</div>`;
    }

    pageItems.forEach((movie, index) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.animationDelay = `${index * 0.05}s`; // Staggered fade-in
        
        // Using native lazy loading for images
        card.innerHTML = `
            <img src="${movie.poster}" alt="${movie.title}" loading="lazy">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.year} • ★ ${movie.rating || 'N/A'}</p>
            </div>
        `;
        
        card.onclick = () => showMovieDetails(movie);
        movieGrid.appendChild(card);
    });

    updatePaginationUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE) || 1;
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// SETUP FILTERS (Dynamically populate from data)
function setupFilters() {
    const genres = new Set();
    const years = new Set();
    
    allMovies.forEach(m => {
        if (m.genres) m.genres.forEach(g => genres.add(g));
        if (m.year) years.add(m.year);
    });

    const genreSelect = document.getElementById('genreFilter');
    [...genres].sort().forEach(g => {
        genreSelect.innerHTML += `<option value="${g}">${g}</option>`;
    });

    const yearSelect = document.getElementById('yearFilter');
    [...years].sort((a,b) => b-a).forEach(y => {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });

    // Listeners
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 400));
    document.getElementById('genreFilter').addEventListener('change', applyFilters);
    document.getElementById('yearFilter').addEventListener('change', applyFilters);
    document.getElementById('sortFilter').addEventListener('change', applyFilters);
}

// PAGINATION CONTROLS
prevBtn.onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
};

nextBtn.onclick = () => {
    const totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderPage();
    }
};

// UTILS
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// MODAL LOGIC
const modal = document.getElementById('movieModal');
const closeBtn = document.querySelector('.close-modal');

function showMovieDetails(movie) {
    const details = document.getElementById('modalDetails');
    details.innerHTML = `
        <div class="modal-flex" style="display: flex; gap: 20px; flex-wrap: wrap;">
            <img src="${movie.poster}" style="width: 250px; border-radius: 10px;">
            <div style="flex: 1; min-width: 300px;">
                <h2 style="font-size: 2rem; margin-bottom: 10px;">${movie.title}</h2>
                <p style="color: var(--accent); font-weight: bold; margin-bottom: 15px;">
                    ${movie.year} | ${movie.genres ? movie.genres.join(', ') : 'N/A'} | ★ ${movie.rating}
                </p>
                <p style="line-height: 1.6; color: var(--text-dim); margin-bottom: 20px;">
                    ${movie.description || 'No description available for this title.'}
                </p>
                <button class="pag-btn" onclick="window.open('${movie.downloadUrl}', '_blank')">
                    <i class="fas fa-download"></i> Download Movie
                </button>
            </div>
        </div>
    `;
    modal.style.display = "block";
    
    // Add to history
    saveToHistory(movie.title);
}

closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

function saveToHistory(title) {
    let history = JSON.parse(localStorage.getItem('movieHistory') || '[]');
    if (!history.includes(title)) {
        history.unshift(title);
        localStorage.setItem('movieHistory', JSON.stringify(history.slice(0, 50)));
    }
}

// Start the app
init();
