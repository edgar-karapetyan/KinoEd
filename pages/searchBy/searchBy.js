const API = {
    BASE: "https://catalog-sync-api.rstprgapipt.com",
    KEY: "eyJhbGciOiJIUzI1NiJ9.eyJ3ZWJTaXRlIjoiMzYzIiwiaXNzIjoiYXBpLXdlYm1hc3RlciIsInN1YiI6IjQwMiIsImlhdCI6MTc1OTQzMzY4NywianRpIjoiZWQ1NTBjYmQtYTY2Mi00M2QyLWIyMzEtNGI0YmZiMmU0OGJmIiwic2NvcGUiOiJETEUifQ._wDSGrMovlDKeMXfpZT9lwDm0TrS3rMXf2T-chNzgy0"
};

const currentYear = new Date().getFullYear();

class SearchByGenrePage {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.pageSize = 30;
        this.genre = '';
        this.contentTypes = [];
        this.genresList = [];
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000;
        this.sortBy = 'id';
        this.yearFilter = '';
        this.isLoading = false;

        this.init();
    }

    async init() {
        await this.loadContentTypes();
        await this.loadGenres();
        this.getGenreFromURL();
        this.setupEventListeners();
        await this.loadContent(this.currentPage);
        this.setupKeyboardNavigation();

        setTimeout(() => {
            genloader_hide()
        }, 200);
    }

    getGenreFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.genre = urlParams.get('genre') || '';
        this.currentPage = parseInt(urlParams.get('page')) || 1;

        this.updatePageTitle();
    }

    updatePageTitle() {
        const titleElement = document.getElementById('genre-title');
        const descriptionElement = document.getElementById('genre-description');

        const genreTitles = {
            'action': 'Фильмы',
            'series': 'Сериалы',
            'new': 'Новинки ' + (currentYear - 1) + ' - ' + currentYear,
            'top': 'Топ за 5 лет',
            'movie': 'Фильмы'
        };

        let genreTitle = genreTitles[this.genre];
        let genreDescription = '';

        if (!genreTitle) {
            const foundGenre = this.genresList.find(g => g.slug === this.genre);
            if (foundGenre) {
                genreTitle = foundGenre.name;
                genreDescription = `Фильмы и сериалы в жанре "${foundGenre.name}"`;
            } else {
                genreTitle = this.genre;
                genreDescription = `Подборка контента: ${this.genre}`;
            }
        } else {
            const descriptions = {
                'action': 'Лучшие фильмы всех жанров',
                'series': 'Популярные сериалы',
                'new': 'Самые свежие фильмы и сериалы ' + (currentYear - 1) + '-' + currentYear + ' годов',
                'top': 'Лучшие фильмы и сериалы с высоким рейтингом за последние 5 лет',
                'movie': 'Фильмы всех жанров'
            };
            genreDescription = descriptions[this.genre] || `Подборка контента: ${genreTitle}`;
        }

        if (titleElement) {
            titleElement.textContent = genreTitle;
        }

        if (descriptionElement) {
            descriptionElement.textContent = genreDescription;
        }

        document.title = `${genreTitle} - VeoVeo`;
    }

    async getCachedData(key, fetchFunction) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const data = await fetchFunction();
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        return data;
    }

    async loadContentTypes() {
        try {
            this.contentTypes = await this.getCachedData('contentTypes', async () => {
                const response = await this.fetchWithRetry(`${API.BASE}/v1/filters/content-types`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API.KEY}`
                    }
                });

                if (response.ok) {
                    return await response.json();
                } else {
                    console.error('Ошибка загрузки типов контента:', response.status);
                    return [];
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки типов контента:', error);
            this.contentTypes = [];
        }
    }

    async loadGenres() {
        try {
            this.genresList = await this.getCachedData('genres', async () => {
                const response = await this.fetchWithRetry(`${API.BASE}/v1/filters/genres`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API.KEY}`
                    }
                });

                if (response.ok) {
                    return await response.json();
                } else {
                    console.error('Ошибка загрузки жанров:', response.status);
                    return [];
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки жанров:', error);
            this.genresList = [];
        }
    }

    async fetchWithRetry(url, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;

                if (response.status >= 500) {
                    await new Promise(resolve =>
                        setTimeout(resolve, 1000 * Math.pow(2, i))
                    );
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve =>
                    setTimeout(resolve, 1000 * Math.pow(2, i))
                );
            }
        }
    }

    getContentTypeId(typeSlug) {
        const typeMap = {
            'movie': 'movie',
            'series': 'serial',
            'tvshow': 'tvshow',
            'concert': 'concert',
            'anime': 'anime',
            'multfilm': 'multfilm',
            'multserial': 'multserial'
        };

        const actualSlug = typeMap[typeSlug] || typeSlug;
        const type = this.contentTypes.find(t => t.slug === actualSlug);
        return type ? type.id : null;
    }

    getGenreId(genreSlug) {
        const genre = this.genresList.find(g => g.slug === genreSlug);
        return genre ? genre.id : null;
    }

    buildRequestBody() {
        const requestBody = {
            pagination: {
                page: this.currentPage,
                pageSize: this.pageSize,
                type: "page",
                order: "DESC",
                sortBy: this.sortBy
            }
        };

        const predefinedGenres = ['action', 'series', 'new', 'top', 'movie'];

        if (predefinedGenres.includes(this.genre)) {
            switch (this.genre) {
                case 'action':
                    const movieTypeId = this.getContentTypeId('movie');
                    if (movieTypeId) {
                        requestBody.contentTypeId = [movieTypeId];
                    }
                    break;

                case 'series':
                    const seriesTypeId = this.getContentTypeId('series');
                    if (seriesTypeId) {
                        requestBody.contentTypeId = [seriesTypeId];
                    }
                    break;

                case 'new':
                    requestBody.year = [currentYear - 1, currentYear];
                    break;

                case 'top':
                    const startYear = currentYear - 5;
                    const years = [];
                    for (let year = startYear; year <= currentYear; year++) {
                        years.push(year);
                    }
                    requestBody.year = years;
                    requestBody.kinopoiskRating = {
                        from: 7.0
                    };
                    break;

                case 'movie':
                    const movieTypeId2 = this.getContentTypeId('movie');
                    if (movieTypeId2) {
                        requestBody.contentTypeId = [movieTypeId2];
                    }
                    break;
            }
        } else {
            const genreId = this.getGenreId(this.genre);
            if (genreId) {
                requestBody.genreId = [genreId];
            }
        }

        if (this.yearFilter) {
            requestBody.year = [parseInt(this.yearFilter)];
        }

        Object.keys(requestBody).forEach(key => {
            if (requestBody[key] === undefined ||
                (Array.isArray(requestBody[key]) && requestBody[key].length === 0)) {
                delete requestBody[key];
            }
        });
        return requestBody;
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const grid = document.getElementById('movies-grid');
        const pagination = document.getElementById('pagination');

        if (loading) {
            grid.innerHTML = this.createSkeletonLoader();
            if (pagination) {
                pagination.style.opacity = '0.5';
                pagination.style.pointerEvents = 'none';
            }
        } else {
            if (pagination) {
                pagination.style.opacity = '1';
                pagination.style.pointerEvents = 'auto';
            }
        }
    }

    createSkeletonLoader() {
        return `
            <div class="loading-skeleton">
                ${Array.from({ length: 20 }, () => `
                    <div class="movie-card-skeleton">
                        <div class="poster-skeleton"></div>
                        <div class="info-skeleton">
                            <div class="title-skeleton"></div>
                            <div class="meta-skeleton"></div>
                            <div class="description-skeleton"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadContent(page = 1) {
        if (this.isLoading) return;

        this.setLoadingState(true);
        const grid = document.getElementById('movies-grid');

        try {
            const requestBody = this.buildRequestBody();
            const response = await this.fetchWithRetry(`${API.BASE}/v1/contents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API.KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();

            if (this.genre === 'top' && data.data) {
                data.data.sort((a, b) => {
                    const ratingA = a.ratings?.kinopoisk?.rating || 0;
                    const ratingB = b.ratings?.kinopoisk?.rating || 0;
                    return ratingB - ratingA;
                });
            }

            this.displayContent(data.data || []);
            this.updatePagination(data.meta || {});
            this.updateResultsInfo(data.meta || {});
            this.trackPageView();

        } catch (error) {
            console.error('Полная ошибка загрузки контента:', error);
            grid.innerHTML = this.getErrorHTML(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    displayContent(content) {
        const grid = document.getElementById('movies-grid');

        if (!content || content.length === 0) {
            grid.innerHTML = this.getNoResultsHTML();
            return;
        }

        const isTop100 = this.genre === 'top';
        grid.innerHTML = content.map((item, index) => this.createMovieCard(item, index, isTop100)).join('');

        this.setupLazyLoading();
    }

    createMovieCard(item, index, isTop100 = false) {
        const rating = item.ratings?.kinopoisk?.rating;
        const votes = item.ratings?.kinopoisk?.votes;
        const contentType = (item.episodesCount > 1) ? 'Сериал' : 'Фильм';
        const globalIndex = index + ((this.currentPage - 1) * this.pageSize);

        return `
        <a href="movie.html?id=v${item.id}&${this.slugify(item.originalTitle || item.title)}" 
           class="movie-card"
           aria-label="${this.escapeHtml(item.title || 'Без названия')} - ${item.year || 'Не указан'}"
           onclick="searchByGenrePage.trackContentInteraction('click', '${this.escapeHtml(item.title)}')">
            ${item.posterUrl ?
                `<div class='image-wrapper'>
                    <img src="${item.posterUrl}" 
                         alt="${this.escapeHtml(item.title || 'Без названия')}" 
                         class="movie-poster lazy"
                         loading="lazy"
                         onerror="this.src='./assets/img/kinoed.png'">
                </div>` : ''
            }
            <div class="movie-poster-placeholder" style="${item.posterUrl ? 'display: none;' : ''}">
                ${this.escapeHtml(item.title || 'Без названия')}
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${this.escapeHtml(item.title || 'Без названия')}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${item.year || ''}</span>

                    ${rating && rating >= 1 ? `<span class="movie-rating ${(rating < 7) ? 'yellow' : 'green'}">
                        ★ ${rating.toFixed(1)}
                    </span>` : ''
            }
                </div>
                <span class="movie-type">${this.escapeHtml(contentType)}</span>
            </div>
        </a>
        `;
    }

    setupLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    formatVotes(votes) {
        if (votes >= 1000000) {
            return (votes / 1000000).toFixed(1) + 'M';
        } else if (votes >= 1000) {
            return (votes / 1000).toFixed(1) + 'K';
        }
        return votes;
    }

    updatePagination(meta) {
        this.currentPage = meta.page || 1;
        this.totalPages = meta.pages || 1;
        this.totalItems = meta.total || 0;

        const pagination = document.getElementById('pagination');

        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${this.currentPage - 1})" aria-label="Предыдущая страница">«</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn disabled" disabled>«</button>`;
        }

        if (this.currentPage > 3) {
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(1)">1</button>`;
            if (this.currentPage > 4) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(this.totalPages, this.currentPage + 2); i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="pagination-btn active" aria-current="page">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${i})">${i}</button>`;
            }
        }

        if (this.currentPage < this.totalPages - 2) {
            if (this.currentPage < this.totalPages - 3) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }

        if (this.currentPage < this.totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${this.currentPage + 1})" aria-label="Следующая страница">»</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn disabled" disabled>»</button>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    updateResultsInfo(meta) {
        const resultsCount = document.getElementById('results-count');
        const descriptionElement = document.getElementById('genre-description');

        const total = meta.total || 0;
        const pageSize = meta.pageSize || this.pageSize;
        const currentPage = meta.page || this.currentPage;

        if (resultsCount) {
            const start = ((currentPage - 1) * pageSize) + 1;
            const end = Math.min(currentPage * pageSize, total);
            resultsCount.textContent = total > 0 ? `Показано ${start}-${end} из ${total} позиций` : 'Ничего не найдено';
        }

        if (descriptionElement) {
            const predefinedGenres = ['action', 'series', 'new', 'top', 'movie'];

            if (predefinedGenres.includes(this.genre)) {
                const descriptions = {
                    'action': `Лучшие фильмы всех жанров. Найдено: ${total}`,
                    'series': `Популярные сериалы. Найдено: ${total}`,
                    'new': `Самые свежие фильмы и сериалы ${currentYear - 1}-${currentYear} годов. Найдено: ${total}`,
                    'top': `Лучшие фильмы и сериалы с высоким рейтингом за последние 5 лет. Найдено: ${total}`,
                    'movie': `Фильмы всех жанров. Найдено: ${total}`
                };
                descriptionElement.textContent = descriptions[this.genre];
            } else {
                const foundGenre = this.genresList.find(g => g.slug === this.genre);
                if (foundGenre) {
                    descriptionElement.textContent = `Фильмы и сериалы в жанре "${foundGenre.name}". Найдено: ${total}`;
                } else {
                    descriptionElement.textContent = `Подборка контента. Найдено: ${total}`;
                }
            }
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage || this.isLoading) return;

        this.currentPage = page;
        this.loadContent(page);

        window.scrollTo({ top: 0, behavior: 'smooth' });

        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url);

        this.trackPageView();
    }

    setupEventListeners() {
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const page = parseInt(urlParams.get('page')) || 1;
            const genre = urlParams.get('genre') || '';

            if (genre !== this.genre) {
                this.genre = genre;
                this.currentPage = 1;
                this.updatePageTitle();
                this.loadContent(1);
            } else if (page !== this.currentPage) {
                this.currentPage = page;
                this.loadContent(page);
            }
        });

        this.setupFilters();
    }

    setupFilters() {
        const sortSelect = document.getElementById('sort-select');
        const yearFilter = document.getElementById('year-filter');

        if (sortSelect) {
            sortSelect.addEventListener('change', this.debounce((e) => {
                this.sortBy = e.target.value;
                this.currentPage = 1;
                this.loadContent(1);
            }, 300));
        }

        if (yearFilter) {
            yearFilter.addEventListener('change', this.debounce((e) => {
                this.yearFilter = e.target.value;
                this.currentPage = 1;
                this.loadContent(1);
            }, 300));
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.key === 'ArrowRight' && this.currentPage < this.totalPages) {
                this.goToPage(this.currentPage + 1);
            } else if (e.key === 'ArrowLeft' && this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    trackPageView() {
        if (typeof gtag !== 'undefined') {
            gtag('config', 'GA_MEASUREMENT_ID', {
                page_title: document.title,
                page_location: window.location.href
            });
        }
    }

    trackContentInteraction(action, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: 'content',
                event_label: label
            });
        }
    }

    getNoResultsHTML() {
        return `
            <div class="no-results">
                Контент в категории не найден.
                <br><br>
                <a href="index.html" style="color: #f36607;">Вернуться на главную</a>
            </div>
        `;
    }

    getErrorHTML(error) {
        return `
            <div class="no-results">
                Ошибка загрузки контента: ${error.message}
                <br><br>
                <p style="font-size: 14px; margin-top: 10px;">
                    Проверьте консоль для подробной информации
                </p>
                <a href="index.html" style="color: #f36607; margin-top: 15px; display: inline-block;">Вернуться на главную</a>
            </div>
        `;
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w\-]+/g, '')
            .replace(/\_\_+/g, '_')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
}

const searchByGenrePage = new SearchByGenrePage();