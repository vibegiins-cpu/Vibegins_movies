/**
 * CINEMA PRO - Core Engine
 * Handles: Data normalization, Infinite Scroll, Real-time Search, LocalStorage
 */

class CinemaEngine {
    constructor() {
        this.allData = [];
        this.filteredData = [];
        this.displayCount = 20;
        this.increment = 20;
        this.favorites = JSON.parse(localStorage.getItem('cinema_favs')) || [];
        this.history = JSON.parse(localStorage.getItem('cinema_history')) || [];
        
        this.init();
    }

    async init() {
        this.initIcons();
        this.initBackground();
        await this.loadData();
        this.setupEventListeners();
        this.initInfiniteScroll();
    }

    initIcons() {
        lucide.createIcons();
    }

    initBackground() {
        const bg = document.getElementById('ambient-background');
        const emojis = ['☕', '🚏', '🎑', '🪔', '🎃', '📸', '🪄', '🎥', '🎬', '🎭'];
        
        for (let i = 0; i < 15; i++) {
            const el = document.createElement('div');
            el.className = 'floating-element';
            el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            el.style.left = Math.random() * 100 + 'vw';
            el.style.top = Math.random() * 100 + 'vh';
            el.style.animationDuration = (15 + Math.random() * 20) + 's';
            el.style.animationDelay = (Math.random() * 5) + 's';
            bg.appendChild(el);
        }
    }

    async loadData() {
        try {
            const response = await fetch('./movies.json');
            if (!response.ok) throw new Error('Data file not found');
            const rawData = await response.json();
            
            // Handle different JSON structures (Array vs Object wrap)
            const dataArray = Array.isArray(rawData) ? rawData : (rawData.movies || rawData.data || []);
            
            this.allData = dataArray.map(item => this.normalizeItem(item));
            this.filteredData = [...this.allData];
            
            this.populateFilters();
            this.renderGrid();
            this.updateStats();
        } catch (err) {
            console.error(err);
            document.getElementById('movie-grid').innerHTML = `
                <div class="error-msg">
                    <h2>Database Offline</h2>
                    <p>Please ensure movies.json is in the root folder.</p>
                </div>`;
        }
    }

    normalizeItem(item) {
        // Dynamic Field Mapping
        const poster = item.poster || item.image || item.cover || item.thumbnail || 'https://via.placeholder.com/400x600?text=No+Poster';
        const title = item.title || item.name || item.original_title || 'Unknown Title';
        const year = item.year || item.release_date?.split('-')[0] || 'N/A';
        const rating = item.rating || item.vote_average || 'NR';
        const type = item.type || (item.seasons ? 'series' : 'movie');
        
        return { ...item, poster, title, year, rating, type };
    }

    renderGrid(append = false) {
        const grid = document.getElementById('movie-grid');
        if (!append) grid.innerHTML = '';

        const start = append ? this.displayCount - this.increment : 0;
        const slice = this.filteredData.slice(start, this.displayCount);

        slice.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `
                <div class="poster-wrapper">
                    <img src="${movie.poster}" loading="lazy" alt="${movie.title}">
                    <div class="card-overlay">
                        <h3>${movie.title}</h3>
                        <div class="card-meta">
                            <span>${movie.year}</span>
                            <span>⭐ ${movie.rating}</span>
                        </div>
                    </div>
                </div>
            `;
            card.onclick = () => this.openModal(movie);
            grid.appendChild(card);
        });
    }

    setupEventListeners() {
        // Search Logic
        const searchInput = document.getElementById('main-search');
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            this.filteredData = this.allData.filter(m => 
                m.title.toLowerCase().includes(term) || 
                (m.description && m.description.toLowerCase().includes(term))
            );
            this.resetAndRender();
        });

        // Filter Logic
        document.getElementById('genre-filter').addEventListener('change', (e) => {
            const genre = e.target.value;
            this.filteredData = genre ? this.allData.filter(m => m.genre?.includes(genre)) : [...this.allData];
            this.resetAndRender();
        });

        // Modal Close
        document.querySelector('.close-modal').onclick = () => {
            document.getElementById('movie-modal').classList.remove('active');
        };

        // Tab Navigation
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.onclick = (e) => {
                document.querySelector('.nav-links a.active').classList.remove('active');
                e.target.classList.add('active');
                const filter = e.target.dataset.filter;
                this.applyTabFilter(filter);
            };
        });
    }

    applyTabFilter(filter) {
        if (filter === 'all') this.filteredData = [...this.allData];
        else if (filter === 'favorites') this.filteredData = this.allData.filter(m => this.favorites.includes(m.id || m.title));
        else this.filteredData = this.allData.filter(m => m.type === filter);
        this.resetAndRender();
    }

    resetAndRender() {
        this.displayCount = this.increment;
        this.renderGrid();
        this.updateStats();
    }

    initInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && this.displayCount < this.filteredData.length) {
                this.displayCount += this.increment;
                this.renderGrid(true);
            }
        }, { threshold: 1.0 });

        observer.observe(document.getElementById('sentinel'));
    }

    openModal(movie) {
        const modal = document.getElementById('movie-modal');
        document.getElementById('modal-img').src = movie.poster;
        document.getElementById('modal-title').innerText = movie.title;
        document.getElementById('modal-year').innerText = movie.year;
        document.getElementById('modal-rating').innerText = `⭐ ${movie.rating}`;
        document.getElementById('modal-desc').innerText = movie.description || movie.overview || 'No description available.';
        
        // Render ALL dynamic metadata found in database
        const dynamicFields = document.getElementById('dynamic-fields');
        dynamicFields.innerHTML = '';
        Object.entries(movie).forEach(([key, value]) => {
            if (['title', 'poster', 'description', 'id'].includes(key)) return;
            if (typeof value === 'string' || typeof value === 'number') {
                const span = document.createElement('div');
                span.innerHTML = `<strong>${key.replace('_', ' ')}:</strong> ${value}`;
                dynamicFields.appendChild(span);
            }
        });

        const favBtn = document.getElementById('fav-btn');
        const isFav = this.favorites.includes(movie.id || movie.title);
        favBtn.innerText = isFav ? 'Remove from Favorites' : 'Add to Favorites';
        favBtn.onclick = () => this.toggleFavorite(movie);

        modal.classList.add('active');
        
        // Add to history
        if (!this.history.includes(movie.id || movie.title)) {
            this.history.push(movie.id || movie.title);
            localStorage.setItem('cinema_history', JSON.stringify(this.history));
        }
    }

    toggleFavorite(movie) {
        const id = movie.id || movie.title;
        if (this.favorites.includes(id)) {
            this.favorites = this.favorites.filter(f => f !== id);
        } else {
            this.favorites.push(id);
        }
        localStorage.setItem('cinema_favs', JSON.stringify(this.favorites));
        document.getElementById('movie-modal').classList.remove('active');
    }

    populateFilters() {
        const genres = new Set();
        const years = new Set();
        this.allData.forEach(m => {
            if (m.genre) (Array.isArray(m.genre) ? m.genre : m.genre.split(',')).forEach(g => genres.add(g.trim()));
            if (m.year) years.add(m.year);
        });

        const gSelect = document.getElementById('genre-filter');
        [...genres].sort().forEach(g => gSelect.innerHTML += `<option value="${g}">${g}</option>`);

        const ySelect = document.getElementById('year-filter');
        [...years].sort((a,b) => b-a).forEach(y => ySelect.innerHTML += `<option value="${y}">${y}</option>`);
    }

    updateStats() {
        document.getElementById('total-count').innerText = `Displaying ${this.filteredData.length} titles`;
    }
}

// Start the engine
window.onload = () => new CinemaEngine();
