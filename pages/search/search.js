// ------------------------------------------------- filters - loader js 
let loader = null;

function showFilters_loader() {
    hideFilters_loader();
    document.querySelector('.filters_loader').innerHTML = ''

    loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = `
        <div class="loader">
            <div class="loader-film">
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>`;

    document.querySelector('.filters_loader').appendChild(loader);

    let t = performance.now();
    (function loop(now) {
        if (now - t >= 10) {
            if (loader) {
                loader.classList.add('active');
            }
        }
        else requestAnimationFrame(loop);
    })(t);
}

function hideFilters_loader() {
    if (loader) {
        loader.classList.remove('active');

        let t = performance.now();
        (function loop(now) {
            if (now - t >= 400) {
                if (loader && loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
                loader = null;
            }
            else requestAnimationFrame(loop);
        })(t);
    }
}

// ------------------------------------------------------------------------

// Конфигурация API
const API = {
    BASE: "https://catalog-sync-api.rstprgapipt.com",
    KEY: "eyJhbGciOiJIUzI1NiJ9.eyJ3ZWJTaXRlIjoiMzYzIiwiaXNzIjoiYXBpLXdlYm1hc3RlciIsInN1YiI6IjQwMiIsImlhdCI6MTc1OTQzMzY4NywianRpIjoiZWQ1NTBjYmQtYTY2Mi00M2QyLWIyMzEtNGI0YmZiMmU0OGJmIiwic2NvcGUiOiJETEUifQ._wDSGrMovlDKeMXfpZT9lwDm0TrS3rMXf2T-chNzgy0"
};

// Ключи для localStorage
const STORAGE_KEYS = {
    FILTERS: 'movie_filters'
};

// Кэш для данных фильтров
let filterData = {
    years: [],
    genres: [],
    countries: [],
    languages: [],
    contentTypes: []
};

// Текущие фильмы и пагинация
let currentMovies = [];
let currentPagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 30
};

// Текущие значения фильтров
let currentFilters = {
    ratingFrom: 0,
    ratingTo: 10,
    search: '',
    category: '',
    year: '',
    genre: '',
    country: '',
    language: ''
};

// Таймер для debounce
let filterTimeout = null;

// Флаг для отслеживания первой загрузки
let isFirstLoad = true;

// Ждем полной загрузки DOM
document.addEventListener('DOMContentLoaded', function () {
    try {
        // Загружаем сохраненные фильтры
        loadSavedFilters();

        // Загружаем данные фильтров и инициализируем приложение
        loadFilterData().then(() => {
            initCustomSelects();
            initRatingFilter();

            // Применяем сохраненные фильтры к UI
            applySavedFiltersToUI();

            // Загружаем фильмы с сохраненными фильтрами
            if (hasActiveFilters() && !isFirstLoad) {
                filterMovies();
                genloader_hide()

            } else {
                loadInitialMovies();
                isFirstLoad = false;
            }

            // Обработчики событий
            const searchInput = document.getElementById('searchInput');
            const resetButton = document.getElementById('resetFilters');

            if (searchInput) {
                searchInput.addEventListener('input', function () {
                    currentFilters.search = this.value;
                    // Сбрасываем пагинацию при поиске
                    currentPagination.currentPage = 1;
                    // Используем debounce для поиска
                    debounceFilterMovies(500);
                    // Сохраняем фильтры
                    saveFilters();
                });
            }

            if (resetButton) {
                resetButton.addEventListener('click', resetAllFilters);
            }

        }).catch(error => {
            console.error('Error loading filter data:', error);
            // Загружаем фильмы даже если фильтры не загрузились
            loadInitialMovies();
        });

    } catch (error) {
        console.error('Error during initialization:', error);
        loadInitialMovies();
    }
});

// Проверка есть ли активные фильтры
function hasActiveFilters() {
    return currentFilters.search ||
        currentFilters.category ||
        currentFilters.year ||
        currentFilters.genre ||
        currentFilters.country ||
        currentFilters.language ||
        currentFilters.ratingFrom > 0 ||
        currentFilters.ratingTo < 10;
}

// Сохранение фильтров в localStorage
function saveFilters() {
    try {
        const dataToSave = {
            filters: currentFilters,
            pagination: {
                currentPage: currentPagination.currentPage
            }
        };
        localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error saving filters to localStorage:', error);
    }
}

// Загрузка сохраненных фильтров из localStorage
function loadSavedFilters() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
        if (saved) {
            const parsed = JSON.parse(saved);

            // Восстанавливаем фильтры
            if (parsed.filters) {
                currentFilters = { ...currentFilters, ...parsed.filters };
            }

            // Восстанавливаем страницу пагинации
            if (parsed.pagination && parsed.pagination.currentPage) {
                currentPagination.currentPage = parsed.pagination.currentPage;
            }

            isFirstLoad = false;
        }
    } catch (error) {
        console.error('Error loading filters from localStorage:', error);
        // В случае ошибки используем значения по умолчанию
        currentFilters = {
            ratingFrom: 0,
            ratingTo: 10,
            search: '',
            category: '',
            year: '',
            genre: '',
            country: '',
            language: ''
        };
    }
}

// Применение сохраненных фильтров к UI
function applySavedFiltersToUI() {
    // Применяем поисковый запрос
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = currentFilters.search || '';
    }

    // Применяем рейтинг
    const ratingFrom = document.getElementById('ratingFrom');
    const ratingTo = document.getElementById('ratingTo');
    if (ratingFrom && ratingTo) {
        ratingFrom.value = currentFilters.ratingFrom;
        ratingTo.value = currentFilters.ratingTo;
        updateRatingDisplay();
    }

    // Применяем значения селектов
    applySelectValue('category', currentFilters.category);
    applySelectValue('yearSelect', currentFilters.year);
    applySelectValue('genreSelect', currentFilters.genre);
    applySelectValue('countrySelect', currentFilters.country);
    applySelectValue('languageSelect', currentFilters.language);
}

// Применение значения к кастомному селекту
function applySelectValue(selectId, value) {
    const customSelect = document.getElementById(selectId);
    if (!customSelect) return;

    const itemsContainer = customSelect.querySelector('.select-items');
    const selectedElement = customSelect.querySelector('.select-selected');

    if (!itemsContainer || !selectedElement) return;

    // Ищем опцию с нужным значением
    const options = itemsContainer.querySelectorAll('div');
    let targetOption = null;

    if (value) {
        targetOption = Array.from(options).find(option =>
            option.dataset.value === value,
        );
    }

    if (targetOption) {
        // Устанавливаем выбранное значение
        selectedElement.textContent = targetOption.textContent;
        selectedElement.dataset.value = targetOption.dataset.value;

        // Обновляем выделение
        options.forEach(opt => {
            opt.classList.remove('same-as-selected');
        });
        targetOption.classList.add('same-as-selected');
    } else {
        // Если значение не найдено, устанавливаем первое значение ("Все")
        const firstOption = options[0];
        if (firstOption) {
            selectedElement.textContent = firstOption.textContent;
            selectedElement.dataset.value = firstOption.dataset.value || '';

            options.forEach(opt => {
                opt.classList.remove('same-as-selected');
            });
            firstOption.classList.add('same-as-selected');
        }
    }
}

// Debounce функция для задержки запросов
function debounceFilterMovies(delay = 500) {
    // Очищаем предыдущий таймер
    if (filterTimeout) {
        clearTimeout(filterTimeout);
    }

    // Устанавливаем новый таймер
    filterTimeout = setTimeout(() => {
        filterMovies();
    }, delay);
}

// Инициализация фильтра рейтинга
function initRatingFilter() {
    const ratingFrom = document.getElementById('ratingFrom');
    const ratingTo = document.getElementById('ratingTo');
    const ratingValue = document.getElementById('ratingValue');

    if (!ratingFrom || !ratingTo || !ratingValue) return;

    // Применяем сохраненные значения
    ratingFrom.value = currentFilters.ratingFrom;
    ratingTo.value = currentFilters.ratingTo;
    updateRatingDisplay();

    // Обработчики изменения ползунков с debounce
    ratingFrom.addEventListener('input', function () {
        const fromValue = parseFloat(this.value);
        const toValue = parseFloat(ratingTo.value);

        if (fromValue > toValue) {
            ratingTo.value = fromValue;
            currentFilters.ratingTo = fromValue;
        }

        currentFilters.ratingFrom = fromValue;
        updateRatingDisplay();

        // Сбрасываем пагинацию при изменении рейтинга
        currentPagination.currentPage = 1;

        // Сохраняем фильтры
        saveFilters();

        // Запускаем фильтрацию с задержкой
        debounceFilterMovies(800);
    });

    ratingTo.addEventListener('input', function () {
        const toValue = parseFloat(this.value);
        const fromValue = parseFloat(ratingFrom.value);

        if (toValue < fromValue) {
            ratingFrom.value = toValue;
            currentFilters.ratingFrom = toValue;
        }

        currentFilters.ratingTo = toValue;
        updateRatingDisplay();

        // Сбрасываем пагинацию при изменении рейтинга
        currentPagination.currentPage = 1;

        // Сохраняем фильтры
        saveFilters();

        // Запускаем фильтрацию с задержкой
        debounceFilterMovies(800);
    });

    // Обработчики для моментального обновления при отпускании ползунка
    ratingFrom.addEventListener('change', function () {
        // Сбрасываем пагинацию при изменении рейтинга
        currentPagination.currentPage = 1;

        // Сохраняем фильтры
        saveFilters();
        // Мгновенная фильтрация при окончании перетаскивания
        clearTimeout(filterTimeout);
        filterMovies();
    });

    ratingTo.addEventListener('change', function () {
        // Сбрасываем пагинацию при изменении рейтинга
        currentPagination.currentPage = 1;

        // Сохраняем фильтры
        saveFilters();
        // Мгновенная фильтрация при окончании перетаскивания
        clearTimeout(filterTimeout);
        filterMovies();
    });
}

// Обновление отображения диапазона рейтинга
function updateRatingDisplay() {
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) {
        ratingValue.textContent = `${currentFilters.ratingFrom.toFixed(1)} - ${currentFilters.ratingTo.toFixed(1)}`;
    }
}

// Загрузка данных для фильтров
async function loadFilterData() {
    showFilters_loader();
    try {
        const [years, genres, countries, languages, contentTypes] = await Promise.all([
            fetchData('/v1/filters/years'),
            fetchData('/v1/filters/genres'),
            fetchData('/v1/filters/countries'),
            fetchData('/v1/filters/languages'),
            fetchData('/v1/filters/content-types')
        ]);

        filterData.years = years || [];
        filterData.genres = genres || [];
        filterData.countries = countries || [];
        filterData.languages = languages || [];
        filterData.contentTypes = contentTypes || [];

        // Обновляем селекты с загруженными данными
        updateFilterSelects();
        hideFilters_loader();

    } catch (error) {
        console.error('Error loading filter data:', error);
        hideFilters_loader();
        throw error;
    }
}

// Обновление селектов фильтров
function updateFilterSelects() {
    updateSelectOptions('yearSelect', filterData.years, 'year');
    updateSelectOptions('genreSelect', filterData.genres, 'name');
    updateSelectOptions('countrySelect', filterData.countries, 'name');
    updateSelectOptions('languageSelect', filterData.languages, 'name');
    updateSelectOptions('category', filterData.contentTypes, 'name');
}

// Обновление опций селекта
function updateSelectOptions(selectId, data, nameField) {
    const customSelect = document.getElementById(selectId);
    if (!customSelect) return;

    const itemsContainer = customSelect.querySelector('.select-items');
    if (!itemsContainer) return;

    // Очищаем текущие опции (кроме первой "Все")
    const firstOption = itemsContainer.querySelector('div');
    itemsContainer.innerHTML = '';
    if (firstOption) {
        itemsContainer.appendChild(firstOption);
    }

    // Добавляем новые опции
    if (data && data.length > 0) {
        data.forEach(item => {
            const value = typeof item === 'object' ? item.id : item;
            const name = typeof item === 'object' ? item[nameField] : item;

            const option = document.createElement('div');
            option.textContent = name;
            option.dataset.value = value;
            itemsContainer.appendChild(option);
        });
    }
}

// Функция для выполнения API запросов
async function fetchData(endpoint, options = {}) {
    const url = `${API.BASE}${endpoint}`;

    const defaultOptions = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API.KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Загрузка начальных фильмов
async function loadInitialMovies() {
    showFilters_loader();

    try {
        const moviesData = await fetchMovies({});
        currentMovies = transformApiMovies(moviesData);

        // Обновляем информацию о пагинации
        updatePaginationInfo(moviesData);

        displayMovies(currentMovies);
        updatePaginationDisplay();

    } catch (error) {
        console.error('Error loading initial movies:', error);

        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="no-results">Ошибка загрузки данных</div>';
        }
        hideFilters_loader(); // Скрываем лоадер при ошибке
    }
}

// Преобразование данных API в формат приложения
function transformApiMovies(apiResponse) {
    if (!apiResponse || !apiResponse.data) return [];

    return apiResponse.data.map(item => {
        // Получаем первый жанр
        const firstGenre = item.genres && item.genres.length > 0 ? item.genres[0].name : 'Неизвестно';

        // Получаем первую страну
        const firstCountry = item.countries && item.countries.length > 0 ? item.countries[0].name : 'Неизвестно';

        // Получаем рейтинг
        const rating = item.ratings && item.ratings.kinopoisk ? item.ratings.kinopoisk.rating : 0;

        // Определяем тип контента
        let contentType = 'movie';
        if (item.contentType) {
            contentType = item.contentType.slug === 'series' ? 'series' : 'movie';
        } else {
            // Определяем по количеству эпизодов/сезонов
            contentType = (item.seasonsCount > 1 || item.episodesCount > 1) ? 'series' : 'movie';
        }

        return {
            id: item.id,
            title: item.title || 'Без названия',
            originalTitle: item.originalTitle || '',
            year: item.year || 0,
            type: contentType,
            genre: firstGenre,
            country: firstCountry,
            language: getLanguageFromAudioTracks(item.audioTracks),
            rating: rating,
            description: item.description || 'Описание отсутствует',
            poster: item.posterUrl || '',
            duration: item.duration || 0,
            ageRestriction: item.ageRestriction || '',
            videoQuality: item.videoQuality || '',
            seasonsCount: item.seasonsCount || 0,
            episodesCount: item.episodesCount || 0
        };
    });
}

// Функция для извлечения языка из audioTracks
function getLanguageFromAudioTracks(audioTracks) {
    if (!audioTracks) return 'Неизвестно';

    // Пытаемся извлечь язык из строки audioTracks
    if (audioTracks.includes('Русский')) return 'Русский';
    if (audioTracks.includes('Английский')) return 'Английский';
    if (audioTracks.includes('English')) return 'Английский';
    if (audioTracks.includes('Russian')) return 'Русский';

    return 'Неизвестно';
}

// Функция инициализации кастомных селектов
function initCustomSelects() {
    initCustomSelect('category');
    initCustomSelect('yearSelect');
    initCustomSelect('genreSelect');
    initCustomSelect('countrySelect');
    initCustomSelect('languageSelect');
}

// Функция инициализации кастомного селекта
function initCustomSelect(selectId) {
    const customSelect = document.getElementById(selectId);

    if (!customSelect) {
        console.error(`Custom select with id '${selectId}' not found`);
        return;
    }

    const selected = customSelect.querySelector('.select-selected');
    const items = customSelect.querySelector('.select-items');

    if (!selected || !items) {
        console.error(`Select elements not found in '${selectId}'`);
        return;
    }

    // Обработчик клика по выбранному элементу
    selected.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllSelect(this);
        items.classList.toggle('select-hide');
        this.classList.toggle('select-arrow-active');
    });

    // Обработчики для элементов списка
    const options = items.querySelectorAll('div');
    options.forEach(option => {
        option.addEventListener('click', function () {
            // Установка выбранного значения
            selected.textContent = this.textContent;
            selected.dataset.value = this.dataset.value || '';

            // Обновляем currentFilters
            currentFilters[selectId] = this.dataset.value || '';

            // Закрытие списка
            items.classList.add('select-hide');
            selected.classList.remove('select-arrow-active');

            // Обновление выделения
            options.forEach(opt => {
                opt.classList.remove('same-as-selected');
            });
            this.classList.add('same-as-selected');

            // Сбрасываем пагинацию при изменении фильтра
            currentPagination.currentPage = 1;

            // Сохраняем фильтры
            saveFilters();

            // Фильтрация результатов с небольшой задержкой
            debounceFilterMovies(300);
        });
    });
}

// Функция закрытия всех открытых селектов
function closeAllSelect(elmnt) {
    const selectItems = document.getElementsByClassName("select-items");
    const selectSelected = document.getElementsByClassName("select-selected");

    for (let i = 0; i < selectSelected.length; i++) {
        if (elmnt !== selectSelected[i]) {
            selectSelected[i].classList.remove("select-arrow-active");
        }
    }

    for (let i = 0; i < selectItems.length; i++) {
        if (elmnt !== selectItems[i].previousElementSibling) {
            selectItems[i].classList.add("select-hide");
        }
    }
}

// Закрытие селектов при клике вне их
document.addEventListener('click', function () {
    closeAllSelect();
});

// Обновление информации о пагинации из ответа API
function updatePaginationInfo(apiResponse) {
    if (apiResponse && apiResponse.meta) {
        currentPagination.currentPage = apiResponse.meta.page || 1;
        currentPagination.pageSize = apiResponse.meta.pageSize || 5;
        currentPagination.totalPages = apiResponse.meta.pages || 1;
        currentPagination.totalItems = apiResponse.meta.total || 0;

        // Сохраняем пагинацию
        saveFilters();
    }
}

// Функция фильтрации фильмов
async function filterMovies() {
    showFilters_loader();

    try {
        // Получение значений из кастомных селектов
        const getSelectedValue = (selectId) => {
            const select = document.getElementById(selectId);
            if (!select) return '';
            const selected = select.querySelector('.select-selected');
            return selected ? selected.dataset.value || '' : '';
        };

        // Обновляем currentFilters из UI
        currentFilters.category = getSelectedValue('category');
        currentFilters.year = getSelectedValue('yearSelect');
        currentFilters.genre = getSelectedValue('genreSelect');
        currentFilters.country = getSelectedValue('countrySelect');
        currentFilters.language = getSelectedValue('languageSelect');

        // Строим фильтры для API
        let apiFilters = {
            page: currentPagination.currentPage,
            pageSize: currentPagination.pageSize
        };

        if (currentFilters.search) {
            apiFilters.textFilter = currentFilters.search;
        }

        if (currentFilters.category) {
            apiFilters.contentTypeId = [parseInt(currentFilters.category)];
        }

        if (currentFilters.year) {
            apiFilters.year = [parseInt(currentFilters.year)];
        }

        if (currentFilters.genre) {
            apiFilters.genreId = [parseInt(currentFilters.genre)];
        }

        if (currentFilters.country) {
            apiFilters.countryId = [parseInt(currentFilters.country)];
        }

        if (currentFilters.language) {
            apiFilters.languageId = [parseInt(currentFilters.language)];
        }

        // Добавляем фильтр по рейтингу если установлен
        if (currentFilters.ratingFrom > 0 || currentFilters.ratingTo < 10) {
            apiFilters.kinopoiskRating = {
                from: currentFilters.ratingFrom,
                to: currentFilters.ratingTo
            };
        }

        const moviesData = await fetchMovies(apiFilters);
        currentMovies = transformApiMovies(moviesData);

        // Обновляем информацию о пагинации
        updatePaginationInfo(moviesData);

        displayMovies(currentMovies);
        updatePaginationDisplay();

        // Сохраняем фильтры после успешной фильтрации
        saveFilters();

    } catch (error) {
        console.error('Error filtering movies:', error);

        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="no-results">Ошибка при фильтрации</div>';
        }
        hideFilters_loader();
    }
}

// Функция отображения фильмов
function displayMovies(moviesArray) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) {
        console.error('Results container not found');
        hideFilters_loader();
        return;
    }

    resultsContainer.innerHTML = '';

    if (moviesArray.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">По вашему запросу ничего не найдено</div>';
        hideFilters_loader();
        return;
    }

    moviesArray.forEach(movie => {
        const movieCard = document.createElement('a');
        movieCard.href = `movie.html?id=v${movie.id}`;
        movieCard.className = 'movie-card';

        // Форматируем длительность
        const duration = movie.duration ? `${Math.floor(movie.duration / 60)}ч ${movie.duration % 60}м` : '';

        // Информация о сезонах/эпизодах для сериалов
        const seriesInfo = movie.type === 'series' && movie.seasonsCount > 0 ? `<div>${movie.seasonsCount} сезон${movie.seasonsCount > 1 ? 'а' : ''} • ${movie.episodesCount} эпизод${movie.episodesCount > 1 ? 'ов' : ''}</div>` : '';

        movieCard.innerHTML = `
            <div class='image-wrapper'>
                <img src="${movie.poster}" alt="${movie.originalTitle}" title="${movie.title}" class="movie-poster" loading="lazy" onerror="assets/img/default.jpg">>
            </div>
            <div class="movie-info">
                <h4 class="movie-title">${movie.title.replace(":", "<br>") ? movie.title.replace(":", "<br>") : movie.originalTitle.replace(":", "<br>")}</h4>

                <div class="movie-meta">
                    <span class="movie-meta-year">${movie.year}</span>
                    ${duration ? `<span>${duration}</span>` : ''}
                    ${movie.rating > 0 ? `<span class="${movie.rating < 7 ? 'yellow' : 'green'}">★ ${movie.rating.toFixed(1)}</span>` : ''}
                    ${movie.ageRestriction ? `<span>${movie.ageRestriction}</span>` : ''}
                </div>

                <span>${seriesInfo}</span>
                
                <div class="movie-tags">
                    ${movie.type.length >= 1 ? `<span class='movie-tags-span'>${(movie.type === 'movie') ? 'фильм' : 'сериал'}</span>` : ''}
                </div>
            </div>
        `;

        resultsContainer.appendChild(movieCard);
    });

    // ВАЖНО: Скрываем лоадер ПОСЛЕ того как все фильмы отображены
    hideFilters_loader();
}

// Функция сброса всех фильтров
function resetAllFilters() {
    showFilters_loader();
    currentPagination.currentPage = 1;

    // Сбрасываем currentFilters
    currentFilters = {
        ratingFrom: 0,
        ratingTo: 10,
        search: '',
        category: '',
        year: '',
        genre: '',
        country: '',
        language: ''
    };

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // Сбрасываем фильтр рейтинга
    updateRatingDisplay();

    // Сбрасываем ползунки рейтинга
    const ratingFrom = document.getElementById('ratingFrom');
    const ratingTo = document.getElementById('ratingTo');
    if (ratingFrom) ratingFrom.value = 0;
    if (ratingTo) ratingTo.value = 10;

    resetCustomSelect('category', 'Все типы');
    resetCustomSelect('yearSelect', 'Все годы');
    resetCustomSelect('genreSelect', 'Все жанры');
    resetCustomSelect('countrySelect', 'Все страны');
    resetCustomSelect('languageSelect', 'Все языки');

    // Очищаем localStorage
    localStorage.removeItem(STORAGE_KEYS.FILTERS);

    loadInitialMovies();
}

// Обновление отображения пагинации
function updatePaginationDisplay() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    const totalPages = currentPagination.totalPages;
    const currentPage = currentPagination.currentPage;

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    // Кнопка "Назад"
    const prevButton = document.createElement('div');
    prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = '&laquo;';
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPagination.currentPage = currentPage - 1;
            showFilters_loader();
            filterMovies();
        }
    });
    paginationContainer.appendChild(prevButton);

    // Определяем диапазон страниц для отображения
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Корректируем диапазон если мы близко к началу или концу
    if (currentPage <= 3) {
        endPage = Math.min(5, totalPages);
    } else if (currentPage >= totalPages - 2) {
        startPage = Math.max(totalPages - 4, 1);
    }

    // Первая страница и многоточие если нужно
    if (startPage > 1) {
        const firstPageButton = document.createElement('div');
        firstPageButton.className = 'pagination-btn';
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => {
            currentPagination.currentPage = 1;
            showFilters_loader();
            filterMovies();
        });
        paginationContainer.appendChild(firstPageButton);

        if (startPage > 2) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Основные кнопки страниц
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('div');
        pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPagination.currentPage = i;
            showFilters_loader();
            filterMovies();
        });
        paginationContainer.appendChild(pageButton);
    }

    // Последняя страница и многоточие если нужно
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }

        const lastPageButton = document.createElement('div');
        lastPageButton.className = 'pagination-btn';
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => {
            currentPagination.currentPage = totalPages;
            showFilters_loader();
            filterMovies();
        });
        paginationContainer.appendChild(lastPageButton);
    }

    // Кнопка "Вперед"
    const nextButton = document.createElement('div');
    nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = '&raquo;';
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPagination.currentPage = currentPage + 1;
            showFilters_loader();
            filterMovies();
        }
    });
    paginationContainer.appendChild(nextButton);
}

// Функция сброса конкретного кастомного селекта
function resetCustomSelect(selectId, defaultText) {
    const customSelect = document.getElementById(selectId);
    if (!customSelect) return;

    const selected = customSelect.querySelector('.select-selected');
    const items = customSelect.querySelector('.select-items');
    const options = items ? items.querySelectorAll('div') : [];

    // Сброс выбранного значения
    if (selected) {
        selected.textContent = defaultText;
        selected.dataset.value = '';
    }

    // Сброс выделения в списке
    options.forEach(opt => {
        opt.classList.remove('same-as-selected');
        if (opt.textContent === defaultText) {
            opt.classList.add('same-as-selected');
        }
    });
}

// Загрузка фильмов с фильтрами
async function fetchMovies(filters = {}) {
    let page = filters.page || 1;
    let pageSize = filters.pageSize || 30;

    let requestBody = {
        pagination: {
            page: page,
            pageSize: pageSize,
            type: "page"
        }
    };

    // Добавляем текстовый фильтр если есть
    if (filters.textFilter) {
        requestBody.textFilter = filters.textFilter.replace(/\d+/g, '').trim();
        if (filters.textFilter.match(/\d+/g)?.join(' ')) {
            requestBody.year = [filters.textFilter.match(/\d+/g)?.join(' ')];
        }
    }

    // Добавляем фильтры по типу контента
    if (filters.contentTypeId) {
        requestBody.contentTypeId = filters.contentTypeId;
    }

    // Добавляем фильтр по году
    if (filters.year) {
        requestBody.year = filters.year;
    }

    // Добавляем фильтр по жанру
    if (filters.genreId) {
        requestBody.genreId = filters.genreId;
    }

    // Добавляем фильтр по стране
    if (filters.countryId) {
        requestBody.countryId = filters.countryId;
    }

    // Добавляем фильтр по языку
    if (filters.languageId) {
        requestBody.languageId = filters.languageId;
    }

    // Добавляем фильтр по рейтингу
    if (filters.kinopoiskRating) {
        requestBody.kinopoiskRating = filters.kinopoiskRating;
    }

    const response = await fetch(`${API.BASE}/v1/contents`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API.KEY}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// Добавляем обработчик глобальных ошибок
window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
});


// -------------------------------------------
const btn = document.getElementById('filters_top_btn')
const filters = document.getElementById('filters')
let checked = false


if (localStorage.getItem('checked') == 'true') {
    btn.classList.add('filters-top-btn--active')
    filters.classList.add('filters-open')
}

btn.addEventListener('click', () => {
    if (checked) {
        btn.classList.remove('filters-top-btn--active')
        filters.classList.remove('filters-open')
        checked = false
        localStorage.setItem('checked', checked)
    } else {
        btn.classList.add('filters-top-btn--active')
        filters.classList.add('filters-open')
        checked = true
        localStorage.setItem('checked', checked)
    }
})

let t = performance.now();
(function loop(now) {
    if (now - t >= 2000) genloader_hide();
    else requestAnimationFrame(loop);
})(t);