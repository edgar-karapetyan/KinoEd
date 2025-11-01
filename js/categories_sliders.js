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

// Функция создания слайдера с бесконечной загрузкой
async function createSlider(config) {
    const {
        containerId,
        swiperClass,
        nextBtnClass,
        prevBtnClass,
        genreId,
        ageRestriction = '18+',
        yearRange = [dhis_year, dhis_year - 1]
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
                pagination: { page, pageSize, type: "page" },
                ageRestriction,
                genreId: Array.isArray(genreId) ? genreId : [genreId],
                year: yearRange
            };

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
            const movies = data?.data || [];

            if (movies.length === 0) {
                state.hasMore = false;
                return [];
            }

            state.totalLoaded += movies.length;

            if (movies.length < pageSize) {
                state.hasMore = false;
            }

            return movies;
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
            0: { slidesPerView: 2, },
            640: { slidesPerView: 3, },
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
    const poster = movie.posterUrl || "https://via.placeholder.com/600x900?text=No+Image";
    const title = movie.title || "Без названия";
    const year = movie.year || "";
    const veoId = 'v' + movie.id || null;
    const rating = movie.ratings?.kinopoisk?.rating || '';
    const showRating = rating > 0;
    const ratingColor = rating >= 7 ? '#4eca00ff' : '#ebba16';
    const videoQuality = movie.videoQuality || '';

    return `
        <a href='./movie.html?id=${veoId}&${movie.originalTitle.replace(/\s+/g, '_')}' class="swiper-slide" style="background-image: url(${poster})">
            <div class="slide-item">
                <div class="top_properties">
                    <span class="videoQuality">${videoQuality}</span>
                    <span class="rating" style="display:${showRating ? 'block' : 'none'}; color: ${ratingColor};">
                        ${rating}★
                    </span>
                </div>
                <div class="slide-info">
                    <h4>${title} : ${year}</h4>
                </div>
            </div>
            <div class='properties_inne' id="${veoId}">
                <img src='./assets/img/bookmark.png' alt="Добавить в закладки">
            </div>
        </a>
    `;
}

// Инициализация всех слайдеров
async function initAllSliders() {
    const slidersConfig = [
        { containerId: "categorySlider_2", swiperClass: '.mySwiper2', nextBtnClass: '.swiper-button-next2', prevBtnClass: '.swiper-button-prev2', genreId: 3 },
        { containerId: "categorySlider_3", swiperClass: '.mySwiper3', nextBtnClass: '.swiper-button-next3', prevBtnClass: '.swiper-button-prev3', genreId: 7 },
        { containerId: "categorySlider_4", swiperClass: '.mySwiper4', nextBtnClass: '.swiper-button-next4', prevBtnClass: '.swiper-button-prev4', genreId: 5, ageRestriction: '16+' },
        { containerId: "categorySlider_5", swiperClass: '.mySwiper5', nextBtnClass: '.swiper-button-next5', prevBtnClass: '.swiper-button-prev5', genreId: 1 },
        { containerId: "categorySlider_6", swiperClass: '.mySwiper6', nextBtnClass: '.swiper-button-next6', prevBtnClass: '.swiper-button-prev6', genreId: 13 },
        { containerId: "categorySlider_7", swiperClass: '.mySwiper7', nextBtnClass: '.swiper-button-next7', prevBtnClass: '.swiper-button-prev7', genreId: 10 },
        { containerId: "categorySlider_8", swiperClass: '.mySwiper8', nextBtnClass: '.swiper-button-next8', prevBtnClass: '.swiper-button-prev8', genreId: 11 },
        { containerId: "categorySlider_9", swiperClass: '.mySwiper9', nextBtnClass: '.swiper-button-next9', prevBtnClass: '.swiper-button-prev9', genreId: 40, yearRange: [] },
        { containerId: "categorySlider_10", swiperClass: '.mySwiper10', nextBtnClass: '.swiper-button-next10', prevBtnClass: '.swiper-button-prev10', genreId: 3 },
        { containerId: "categorySlider_11", swiperClass: '.mySwiper11', nextBtnClass: '.swiper-button-next11', prevBtnClass: '.swiper-button-prev11', genreId: [106, 76, 94], yearRange: [] }
    ];

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
        setTimeout(() => {
            genloader_hide()
        }, 200);
    } catch (error) {
        console.error('Error initializing sliders:', error);
    }
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', initSliders);