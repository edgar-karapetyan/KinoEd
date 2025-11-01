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
        this.type = '';
        this.contentTypes = [];
        this.genresList = [];
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000;
        this.sortBy = 'year'; // Изменено на сортировку по году
        this.yearFilter = '';
        this.isLoading = false;

        this.init();
    }

    async init() {
        await this.loadContentTypes();
        await this.loadGenres();
        this.getParamsFromURL();
        this.setupEventListeners();
        await this.loadContent(this.currentPage);
        this.setupKeyboardNavigation();

        genloader_hide();
    }

    getParamsFromURL() {
        const urlParams = new URLSearchParams(window.location.search);

        // Поддерживаем оба формата: genre и type
        this.genre = urlParams.get('genre') || '';
        this.type = urlParams.get('type') || '';
        this.currentPage = parseInt(urlParams.get('page')) || 1;

        console.log('🎯 ПАРАМЕТРЫ ИЗ URL:');
        console.log('Genre:', this.genre);
        console.log('Type:', this.type);
        console.log('Страница:', this.currentPage);
        console.log('================');

        this.updatePageTitle();
    }

    updatePageTitle() {
        const titleElement = document.getElementById('genre-title');
        const descriptionElement = document.getElementById('genre-description');

        if (!titleElement || !descriptionElement) return;

        let title = '';
        let description = '';

        // Если есть параметр type (специальные категории)
        if (this.type) {
            const specialCategories = {
                'action': {
                    title: 'Фильмы',
                    description: 'Лучшие фильмы всех жанров'
                },
                'series': {
                    title: 'Сериалы',
                    description: 'Популярные сериалы'
                },
                'new': {
                    title: `Новинки ${currentYear - 1}-${currentYear}`,
                    description: `Самые свежие фильмы и сериалы ${currentYear - 1}-${currentYear} годов`
                },
                'top': {
                    title: 'Топ за 5 лет',
                    description: 'Лучшие фильмы и сериалы с высоким рейтингом за последние 5 лет'
                },
                'movie': {
                    title: 'Фильмы',
                    description: 'Фильмы всех жанров'
                }
            };

            const specialCategory = specialCategories[this.type];
            if (specialCategory) {
                title = specialCategory.title;
                description = specialCategory.description;
            } else {
                title = this.type;
                description = `Подборка контента: ${this.type}`;
            }
        }
        // Если есть параметр genre (обычные жанры)
        else if (this.genre) {
            // Пробуем найти жанр по ID
            const foundGenreById = this.genresList.find(g => g.id.toString() === this.genre);

            // Если не нашли по ID, ищем по slug
            const foundGenre = foundGenreById || this.genresList.find(g => g.slug === this.genre);

            if (foundGenre) {
                title = foundGenre.name;
                description = `Фильмы и сериалы в жанре "${foundGenre.name}"`;
            } else {
                title = this.genre;
                description = `Подборка контента: ${this.genre}`;
            }
        }
        // Если нет параметров
        else {
            title = 'Все фильмы и сериалы';
            description = 'Полная коллекция фильмов и сериалов';
        }

        titleElement.textContent = title;
        descriptionElement.textContent = description;
        document.title = `${title} - VeoVeo`;
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
                const response = await this.fetchWithRetry(`${API.BASE}/v1/filters/content-types`);
                if (response.ok) {
                    const contentTypes = await response.json();

                    console.log('🎬 ВСЕ ТИПЫ КОНТЕНТА:');
                    console.table(contentTypes.map(type => ({
                        'ID': type.id,
                        'Название': type.name,
                        'Slug': type.slug,
                        'Для URL': `searchBy.html?type=${type.slug}`
                    })));
                    console.log('================');

                    return contentTypes;
                }
                return [];
            });
        } catch (error) {
            console.error('Ошибка загрузки типов контента:', error);
            this.contentTypes = [];
        }
    }

    async loadGenres() {
        try {
            this.genresList = await this.getCachedData('genres', async () => {
                const response = await this.fetchWithRetry(`${API.BASE}/v1/filters/genres`);
                if (response.ok) {
                    const genres = await response.json();

                    // Выводим все жанры в удобном формате
                    console.log('🎭 ВСЕ ДОСТУПНЫЕ ЖАНРЫ ИЗ API:');
                    console.table(genres.map(genre => ({
                        'ID': genre.id,
                        'Название': genre.name,
                        'Slug': genre.slug,
                        'Для URL по ID': `searchBy.html?genre=${genre.id}`,
                        'Для URL по Slug': `searchBy.html?genre=${genre.slug}`
                    })));

                    // Также выводим списки для копирования
                    console.log('📋 СПИСОК ЖАНРОВ ДЛЯ HTML (по ID):');
                    genres.forEach(genre => {
                        console.log(`<a href="searchBy.html?genre=${genre.id}" class="genre-link">${genre.name}</a>`);
                    });

                    console.log('📋 СПИСОК ЖАНРОВ ДЛЯ HTML (по Slug):');
                    genres.forEach(genre => {
                        console.log(`<a href="searchBy.html?genre=${genre.slug}" class="genre-link">${genre.name}</a>`);
                    });
                    console.log('================');

                    return genres;
                }
                return [];
            });
        } catch (error) {
            console.error('Ошибка загрузки жанров:', error);
            this.genresList = [];
        }
    }

    async fetchWithRetry(url, options = {}, retries = 3) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API.KEY}`
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, finalOptions);
                if (response.ok) return response;

                if (response.status >= 500) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
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

    getGenreId(genreParam) {
        // Пробуем найти по ID (если genreParam - число)
        if (!isNaN(genreParam)) {
            const genreById = this.genresList.find(g => g.id.toString() === genreParam);
            if (genreById) {
                console.log(`🔍 Поиск жанра по ID "${genreParam}": ✅ Найден (${genreById.name})`);
                return genreById.id;
            }
        }

        // Ищем по slug
        const genreBySlug = this.genresList.find(g => g.slug === genreParam);
        if (genreBySlug) {
            console.log(`🔍 Поиск жанра по Slug "${genreParam}": ✅ Найден (ID: ${genreBySlug.id})`);
            return genreBySlug.id;
        }

        console.log(`❌ Жанр не найден: "${genreParam}"`);
        return null;
    }

    buildRequestBody() {
        // Всегда сортируем по году (новые сначала)
        const requestBody = {
            pagination: {
                page: this.currentPage,
                pageSize: this.pageSize,
                type: "page",
                order: "DESC",  // DESC = от новых к старым
                sortBy: "year"  // Сортировка по году выпуска
            }
        };

        console.log('🎯 ПОИСК ПО ПАРАМЕТРАМ:');
        console.log('Type:', this.type);
        console.log('Genre:', this.genre);
        console.log('📅 СОРТИРОВКА: по году (новые сначала)');

        // Если есть параметр type (специальные категории)
        if (this.type) {
            const specialCategories = {
                'action': () => {
                    const movieTypeId = this.getContentTypeId('movie');
                    if (movieTypeId) {
                        requestBody.contentTypeId = [movieTypeId];
                        console.log('📁 Категория: Фильмы');
                    }
                },
                'series': () => {
                    const seriesTypeId = this.getContentTypeId('series');
                    if (seriesTypeId) {
                        requestBody.contentTypeId = [seriesTypeId];
                        console.log('📁 Категория: Сериалы');
                    }
                },
                'new': () => {
                    requestBody.year = [currentYear - 1, currentYear];
                    console.log('📁 Категория: Новинки');
                },
                'top': () => {
                    const startYear = currentYear - 5;
                    const years = [];
                    for (let year = startYear; year <= currentYear; year++) {
                        years.push(year);
                    }
                    requestBody.year = years;
                    requestBody.kinopoiskRating = { from: 7.0 };
                    console.log('📁 Категория: Топ');

                    // Для топа дополнительно сортируем по рейтингу на клиенте
                    // Основная сортировка по году останется от API
                },
                'movie': () => {
                    const movieTypeId = this.getContentTypeId('movie');
                    if (movieTypeId) {
                        requestBody.contentTypeId = [movieTypeId];
                        console.log('📁 Категория: Фильмы');
                    }
                }
            };

            if (specialCategories[this.type]) {
                specialCategories[this.type]();
            } else {
                console.log('❌ Неизвестная категория:', this.type);
            }
        }
        // Если есть параметр genre (обычные жанры)
        else if (this.genre) {
            const genreId = this.getGenreId(this.genre);
            if (genreId) {
                requestBody.genreId = [genreId];
                console.log('✅ Используем genreId:', genreId);
            } else {
                console.log('❌ Жанр не найден в API!');
            }
        }
        // Если нет параметров - показываем всё
        else {
            console.log('📁 Показываем все фильмы и сериалы');
        }

        // Дополнительный фильтр по году
        if (this.yearFilter) {
            requestBody.year = [parseInt(this.yearFilter)];
        }

        // Очищаем пустые поля
        Object.keys(requestBody).forEach(key => {
            if (requestBody[key] === undefined ||
                (Array.isArray(requestBody[key]) && requestBody[key].length === 0)) {
                delete requestBody[key];
            }
        });

        console.log('📦 Итоговый запрос к API:', requestBody);
        console.log('================');
        return requestBody;
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const grid = document.getElementById('movies-grid');
        const pagination = document.getElementById('pagination');

        if (loading) {
            if (grid) grid.innerHTML = this.createSkeletonLoader();
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
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Выводим информацию о найденных фильмах
            console.log('🎬 НАЙДЕННЫЕ ФИЛЬМЫ:');
            console.log(`Всего найдено: ${data.meta?.total || 0}`);
            console.log(`Страница: ${data.meta?.page || 1} из ${data.meta?.pages || 1}`);

            if (data.data && data.data.length > 0) {
                console.table(data.data.map(movie => ({
                    'ID': movie.id,
                    'Название': movie.title,
                    'Оригинал': movie.originalTitle,
                    'Год': movie.year,
                    'Рейтинг': movie.ratings?.kinopoisk?.rating || '-',
                    'Тип': movie.episodesCount > 1 ? 'Сериал' : 'Фильм',
                    'Жанры': movie.genres?.map(g => g.name).join(', ') || '-'
                })));
            }
            console.log('================');

            // Для топа дополнительно сортируем по рейтингу
            let sortedData = data.data || [];
            if (this.type === 'top') {
                sortedData = sortedData.sort((a, b) => {
                    const ratingA = a.ratings?.kinopoisk?.rating || 0;
                    const ratingB = b.ratings?.kinopoisk?.rating || 0;
                    return ratingB - ratingA;
                });
            }

            this.displayContent(sortedData);
            this.updatePagination(data.meta || {});
            this.updateResultsInfo(data.meta || {});

        } catch (error) {
            console.error('❌ Ошибка загрузки контента:', error);
            if (grid) grid.innerHTML = this.getErrorHTML(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    displayContent(content) {
        const grid = document.getElementById('movies-grid');
        if (!grid) return;

        if (!content || content.length === 0) {
            grid.innerHTML = this.getNoResultsHTML();
            return;
        }

        grid.innerHTML = content.map((item, index) => this.createMovieCard(item, index)).join('');
        this.setupLazyLoading();
    }

    createMovieCard(item, index) {
        const rating = item.ratings?.kinopoisk?.rating;
        const contentType = (item.episodesCount > 1 || item.seasonsCount > 1) ? 'Сериал' : 'Фильм';
        const posterUrl = item.posterUrl

        return `
        <a href="movie.html?id=v${item.id}&${this.slugify(item.originalTitle || item.title)}" 
           class="movie-card"
           aria-label="${this.escapeHtml(item.title || 'Без названия')}">
            <div class='image-wrapper'>
                <img src="${posterUrl}" 
                    alt="${this.escapeHtml(item.title || 'Без названия')}" 
                    style=" ${posterUrl}"
                    class="movie-poster lazy"
                    loading="lazy"
                    onerror="assets/img/default.jpg">
            </div>

            <div class="movie-info">
                <h3 class="movie-title">${this.escapeHtml(item.title || 'Без названия')}</h3>
                <div class="movie-meta">
                    <span class="movie-year">${item.year || ''}</span>
                    ${rating && rating >= 1 ? `
                        <span class="movie-rating ${(rating < 7) ? 'yellow' : 'green'}">
                            ★ ${rating.toFixed(1)}
                        </span>
                    ` : ''}
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

    updatePagination(meta) {
        this.currentPage = meta.page || 1;
        this.totalPages = meta.pages || 1;
        this.totalItems = meta.total || 0;

        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Кнопка "Назад"
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${this.currentPage - 1})">«</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn disabled" disabled>«</button>`;
        }

        // Номера страниц
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="pagination-btn active">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${i})">${i}</button>`;
            }
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }

        // Кнопка "Вперед"
        if (this.currentPage < this.totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="searchByGenrePage.goToPage(${this.currentPage + 1})">»</button>`;
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

        if (descriptionElement && total > 0) {
            descriptionElement.textContent += `. Найдено: ${total}`;
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage || this.isLoading) return;

        this.currentPage = page;
        this.loadContent(page);

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Обновляем URL с сохранением текущих параметров
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url);
    }

    setupEventListeners() {
        window.addEventListener('popstate', () => {
            this.getParamsFromURL();
            this.loadContent(this.currentPage);
        });

        // Фильтры
        const sortSelect = document.getElementById('sort-select');
        const yearFilter = document.getElementById('year-filter');

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.currentPage = 1;
                this.loadContent(1);
            });
        }

        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.yearFilter = e.target.value;
                this.currentPage = 1;
                this.loadContent(1);
            });
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
                <a href="index.html" style="color: #f36607;">Вернуться на главную</a>
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

// Создаем глобальный экземпляр
const searchByGenrePage = new SearchByGenrePage();