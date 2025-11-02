const now = new Date();
const toUpdatedAt = now.toISOString();
const from = new Date();
from.setDate(from.getDate() - 30);
const fromUpdatedAt = from.toISOString();
const dhis_year = Number(fromUpdatedAt.slice(0, 4))

const ageRestriction = 18;
const API = {
    BASE: "https://catalog-sync-api.rstprgapipt.com",
    KEY: "eyJhbGciOiJIUzI1NiJ9.eyJ3ZWJTaXRlIjoiMzYzIiwiaXNzIjoiYXBpLXdlYm1hc3RlciIsInN1YiI6IjQwMiIsImlhdCI6MTc1OTQzMzY4NywianRpIjoiZWQ1NTBjYmQtYTY2Mi00M2QyLWIyMzEtNGI0YmZiMmU0OGJmIiwic2NvcGUiOiJETEUifQ._wDSGrMovlDKeMXfpZT9lwDm0TrS3rMXf2T-chNzgy0"
};

// Объект для хранения состояния каждого слайдера
const sliderStates = new Map();

// Конфигурация загрузки
const LOAD_CONFIG = {
    INITIAL_LOAD: 20,
    LOAD_MORE: 20,
    TRIGGER_LOAD_AT: 0.5
};

// ID мультфильмов и мультсериалов (исключаем из обычных жанров)
const MULTFILM_GENRE_IDS = [5, 40, 138]; // Мультфильм, Аниме, Детский

// Категории (типы контента) из HTML
const CONTENT_TYPES = {
    MOVIE: "4",        // Фильмы
    SERIES: "2",       // Сериалы
    MULTFILM: "12",    // Мультфильм
    MULTSERIAL: "10",  // Мультсериал
    ANIME: "11",       // Аниме
    DOCUMENTARY: "3",  // Докуфильмы
    DOCSERIES: "5",    // Докусериалы
    CONCERT: "6",      // Концерты
    TVSHOW: "7"        // ТВ Шоу
};

// Функция проверки, является ли контент мультиком
function isMultfilm(content) {
    if (!content.genres || !Array.isArray(content.genres)) return false;

    // Проверяем по жанрам
    const hasMultfilmGenre = content.genres.some(genre =>
        MULTFILM_GENRE_IDS.includes(genre.id)
    );

    // Проверяем по типу контента
    const isMultfilmType = content.contentType &&
        (content.contentType.id == CONTENT_TYPES.MULTFILM ||
            content.contentType.id == CONTENT_TYPES.MULTSERIAL ||
            content.contentType.id == CONTENT_TYPES.ANIME);

    return hasMultfilmGenre || isMultfilmType;
}

// Функция создания слайдера с бесконечной загрузкой
async function createSlider(config) {
    const {
        containerId,
        swiperClass,
        nextBtnClass,
        prevBtnClass,
        genreId,
        contentTypeId, // ID категории (типа контента)
        ageRestriction = '18+',
        yearRange = [dhis_year, dhis_year - 1],
    } = config;

    const swiperWrapper = document.getElementById(containerId);

    if (!swiperWrapper) {
        console.error(`Ошибка: не найден элемент с id=${containerId}`);
        return;
    }

    // Инициализация состояния слайдера
    sliderStates.set(containerId, {
        currentPage: 1,
        isLoading: false,
        hasMore: true,
        allMovies: [],
        totalLoaded: 0,
        lastLoadIndex: 0
    });

    const state = sliderStates.get(containerId);

    // Функция загрузки фильмов
    const loadMovies = async (page = 1, pageSize = LOAD_CONFIG.INITIAL_LOAD) => {
        if (state.isLoading || !state.hasMore) return [];

        state.isLoading = true;

        try {
            const body = {
                pagination: {
                    page,
                    pageSize,
                    type: "page",
                    order: "DESC",
                    sortBy: "year"
                },
                ageRestriction,
                year: yearRange
            };

            // Добавляем фильтр по типу контента (если указан) - ПЕРВЫЙ ПРИОРИТЕТ
            if (contentTypeId) {
                body.contentTypeId = Array.isArray(contentTypeId) ? contentTypeId : [contentTypeId];
                // console.log(`🎯 Слайдер ${containerId}: Категория`, getContentTypeName(contentTypeId));
            }

            // Добавляем фильтр по жанру (если указан) - ВТОРОЙ ПРИОРИТЕТ
            if (genreId) {
                body.genreId = Array.isArray(genreId) ? genreId : [genreId];
                // console.log(`🎯 Слайдер ${containerId}: Жанр`, getGenreName(genreId));
            }

            // Если yearRange пустой, используем последние 5 лет для сортировки новых
            if (!yearRange || yearRange.length === 0) {
                const currentYear = new Date().getFullYear();
                body.year = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
            }

            // console.log(`📦 Запрос для ${containerId}:`, body);

            const res = await fetch(`${API.BASE}/v1/contents/details`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API.KEY}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            const data = await res.json();
            let movies = data?.data || [];

            // Фильтруем фильмы без постера
            const moviesWithPoster = movies.filter(movie => {
                const hasPoster = movie.posterUrl &&
                    movie.posterUrl.trim() !== '' &&
                    !movie.posterUrl.includes('default.jpg') &&
                    !movie.posterUrl.includes('via.placeholder.com');

                if (!hasPoster) {
                    console.log(`🚫 Скрыт фильм без постера: "${movie.title}" (ID: ${movie.id})`);
                }

                return hasPoster;
            });

            // Фильтруем мультики (если не разрешено в этом слайдере)
            let filteredMovies = moviesWithPoster;

            return filteredMovies;
        } catch (err) {
            console.error("API error:", err.message);
            return [];
        } finally {
            state.isLoading = false;
        }
    };

    // Функция отображения фильмов
    const displayMovies = (movies) => {
        const moviesHTML = movies.map(m => createSlideHTML(m)).join('');

        if (state.currentPage === 1) {
            swiperWrapper.innerHTML = moviesHTML;
            state.allMovies = movies;
        } else {
            swiperWrapper.insertAdjacentHTML('beforeend', moviesHTML);
            state.allMovies = [...state.allMovies, ...movies];
        }
    };

    // Загружаем первую партию фильмов
    const firstBatch = await loadMovies(1, LOAD_CONFIG.INITIAL_LOAD);
    if (firstBatch.length === 0) {
        swiperWrapper.innerHTML = `<p style="color:white;text-align:center;">Нет фильмов</p>`;
        return;
    }

    displayMovies(firstBatch);
    state.currentPage = 2;

    // Инициализация Swiper
    const swiper = new Swiper(swiperClass, {
        slidesPerView: 6,
        spaceBetween: 10,
        freeMode: true,
        navigation: {
            nextEl: nextBtnClass,
            prevEl: prevBtnClass,
        },
        breakpoints: {
            0: { slidesPerView: 3, },
            768: { slidesPerView: 4, },
            1024: { slidesPerView: 6, },
        },
        on: {
            // Загружаем когда пользователь дошел до середины
            slideChange: function () {
                const state = sliderStates.get(containerId);
                if (!state || state.isLoading || !state.hasMore) return;

                const totalSlides = this.slides.length;
                const currentIndex = this.activeIndex;
                const slidesPerView = this.params.slidesPerView;

                const progress = currentIndex / Math.max(1, totalSlides - slidesPerView);
                const slidesSinceLastLoad = currentIndex - state.lastLoadIndex;

                // Загружаем при 50% прогресса или последних 20%
                const shouldTrigger =
                    (slidesSinceLastLoad >= 5 && progress >= LOAD_CONFIG.TRIGGER_LOAD_AT) ||
                    progress >= 0.8;

                if (shouldTrigger) {
                    state.lastLoadIndex = currentIndex;
                    loadMoreMovies();
                }
            },

            // Загружаем при достижении конца
            reachEnd: function () {
                const state = sliderStates.get(containerId);
                if (state && !state.isLoading && state.hasMore) {
                    loadMoreMovies();
                }
            }
        }
    });

    // Функция для подгрузки дополнительных фильмов
    async function loadMoreMovies() {
        const state = sliderStates.get(containerId);

        if (state.isLoading || !state.hasMore) return;

        const newMovies = await loadMovies(state.currentPage, LOAD_CONFIG.LOAD_MORE);
        if (newMovies.length > 0) {
            displayMovies(newMovies);

            // Обновляем Swiper после добавления новых слайдов
            setTimeout(() => {
                swiper.update();
            }, 100);

            state.currentPage++;
        }
    }

    return swiper;
}

// Функция создания HTML для слайда
function createSlideHTML(movie) {
    const poster = movie.posterUrl;
    const title = movie.title || "Без названия";
    const year = movie.year || "";
    const veoId = 'v' + movie.id || null;
    const rating = movie.ratings?.kinopoisk?.rating || '';
    const showRating = rating > 0;
    const ratingColor = rating >= 7 ? '#4eca00ff' : '#ebba16';
    const videoQuality = movie.videoQuality || '';

    return `
        <div class="swiper-slide">
            <a href='./movie.html?id=${veoId}&${movie.originalTitle ? movie.originalTitle.replace(/\s+/g, '_') : title.replace(/\s+/g, '_')}' style="background-image: url(${poster})" class="slide-item">
                <div class="top_properties">
                    <span class="videoQuality">${videoQuality}</span>
                    <span class="rating" style="display:${showRating ? 'block' : 'none'}; color: ${ratingColor};">
                        ${rating}★
                    </span>
                </div>
                <div class="slide-info">
                    <h4>${title} : ${year}</h4>
                </div>
            </a>
            <div class='properties_inne' id="${veoId}">
                <img src='./assets/img/bookmark.png' alt="Добавить в закладки">
            </div>
        </div>
    `;
}

// Получение названия категории по ID
function getContentTypeName(typeId) {
    const types = {
        "1": "3D",
        "2": "Сериалы",
        "3": "Докуфильмы",
        "4": "Фильмы",
        "5": "Докусериалы",
        "6": "Концерты",
        "7": "ТВ Шоу",
        "10": "Мультсериал",
        "11": "Аниме",
        "12": "Мультфильм"
    };
    return types[typeId] || `Категория ${typeId}`;
}

// Получение названия жанра по ID
function getGenreName(genreId) {
    const genres = {
        "1": "Комедия",
        "2": "Семейный",
        "3": "Приключения",
        "4": "Музыкальный",
        "5": "Мультфильм",
        "6": "Криминал",
        "7": "Фантастика",
        "8": "Боевик",
        "9": "Фэнтези",
        "10": "Драма",
        "11": "Ужасы",
        "12": "Документальный",
        "13": "Триллер",
        "14": "Биография",
        "15": "Мелодрама",
        "16": "Детектив",
        "17": "Военный",
        "18": "Вестерн",
        "19": "Спорт",
        "20": "Исторический",
        "21": "Короткометражка",
        "40": "Аниме",
        "138": "Детский",
        "106": "Дорама"
    };
    return genres[genreId] || `Жанр ${genreId}`;
}

// Инициализация всех слайдеров
async function initAllSliders() {
    const slidersConfig = [
        {
            containerId: "categorySlider_2",
            swiperClass: '.mySwiper2',
            nextBtnClass: '.swiper-button-next2',
            prevBtnClass: '.swiper-button-prev2',
            contentTypeId: CONTENT_TYPES.MOVIE, // ТОЛЬКО Фильмы
            genreId: 8, // Боевик
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_3",
            swiperClass: '.mySwiper3',
            nextBtnClass: '.swiper-button-next3',
            prevBtnClass: '.swiper-button-prev3',
            contentTypeId: [CONTENT_TYPES.MOVIE, CONTENT_TYPES.SERIES],  // Фильмы и сериалы
            genreId: 7, // Фантастика
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_4",
            swiperClass: '.mySwiper4',
            nextBtnClass: '.swiper-button-next4',
            prevBtnClass: '.swiper-button-prev4',
            contentTypeId: [CONTENT_TYPES.MULTFILM, CONTENT_TYPES.MULTSERIAL], // ТОЛЬКО мультики
            genreId: 5, // Мультфильм
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_5",
            swiperClass: '.mySwiper5',
            nextBtnClass: '.swiper-button-next5',
            prevBtnClass: '.swiper-button-prev5',
            contentTypeId: CONTENT_TYPES.MOVIE, // ТОЛЬКО Фильмы
            genreId: 1, // Комедия
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_6",
            swiperClass: '.mySwiper6',
            nextBtnClass: '.swiper-button-next6',
            prevBtnClass: '.swiper-button-prev6',
            contentTypeId: CONTENT_TYPES.MOVIE, // ТОЛЬКО Фильмы
            genreId: 13, // Триллер
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_7",
            swiperClass: '.mySwiper7',
            nextBtnClass: '.swiper-button-next7',
            prevBtnClass: '.swiper-button-prev7',
            contentTypeId: CONTENT_TYPES.MOVIE, // ТОЛЬКО Фильмы
            genreId: 10, // Драма
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_8",
            swiperClass: '.mySwiper8',
            nextBtnClass: '.swiper-button-next8',
            prevBtnClass: '.swiper-button-prev8',
            contentTypeId: CONTENT_TYPES.MOVIE, // ТОЛЬКО Сериалы
            genreId: 11, // Ужасы
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_9",
            swiperClass: '.mySwiper9',
            nextBtnClass: '.swiper-button-next9',
            prevBtnClass: '.swiper-button-prev9',
            contentTypeId: [CONTENT_TYPES.ANIME], // ТОЛЬКО ANIME
            // genreId: 40, // Аниме
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],

        },
        {
            containerId: "categorySlider_10",
            swiperClass: '.mySwiper10',
            nextBtnClass: '.swiper-button-next10',
            prevBtnClass: '.swiper-button-prev10',
            contentTypeId: CONTENT_TYPES.SERIES, // ТОЛЬКО Сериалы
            genreId: 3, // Приключения
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6],
        },
        {
            containerId: "categorySlider_11",
            swiperClass: '.mySwiper11',
            nextBtnClass: '.swiper-button-next11',
            prevBtnClass: '.swiper-button-prev11',
            contentTypeId: [CONTENT_TYPES.MOVIE, CONTENT_TYPES.SERIES, CONTENT_TYPES.DOCUMENTARY, CONTENT_TYPES.DOCSERIES, CONTENT_TYPES.CONCERT], // Фильмы и сериалы
            genreId: 106, // Дорама
            yearRange: [dhis_year, dhis_year - 1, dhis_year - 2, dhis_year - 3, dhis_year - 4, dhis_year - 5, dhis_year - 6, dhis_year - 7, dhis_year - 8, dhis_year - 9, dhis_year - 10, dhis_year - 11, dhis_year - 12, dhis_year - 13, dhis_year - 14, dhis_year - 15, dhis_year - 16, dhis_year - 17, dhis_year - 18],
}
    ];

// console.log('🎬 ИНИЦИАЛИЗАЦИЯ СЛАЙДЕРОВ:');
// slidersConfig.forEach(config => {
//     console.log(`📺 ${config.containerId}:`);
//     console.log(`   Категория: ${getContentTypeName(config.contentTypeId)}`);
//     console.log(`   Жанр: ${getGenreName(config.genreId)}`);
//     console.log(`   Мультики: ${config.allowMultfilms ? '✅ Разрешены' : '❌ Запрещены'}`);
// });

await Promise.all(slidersConfig.map(config => createSlider(config)));
initPlayButtons();
}

// Инициализация кнопок воспроизведения
function initPlayButtons() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('play_id')) {
            const kinopoiskId = e.target.id;
        }

        if (e.target.closest('.properties_inne')) {
            const kinopoiskId = e.target.id;
            console.log('Добавить в закладки - ', kinopoiskId);
        }
    });
}

// Основная функция инициализации
async function initSliders() {
    try {
        await initAllSliders();
            if (typeof genloader_hide === 'function') {
                genloader_hide();
            }
    } catch (error) {
        console.error('Error initializing sliders:', error);
    }
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', initSliders);