document.addEventListener("DOMContentLoaded", () => {
    const API = {
        BASE: "https://catalog-sync-api.rstprgapipt.com",
        KEY: "eyJhbGciOiJIUzI1NiJ9.eyJ3ZWJTaXRlIjoiMzYzIiwiaXNzIjoiYXBpLXdlYm1hc3RlciIsInN1YiI6IjQwMiIsImlhdCI6MTc1OTQzMzY4NywianRpIjoiZWQ1NTBjYmQtYTY2Mi00M2QyLWIyMzEtNGI0YmZiMmU0OGJmIiwic2NvcGUiOiJETEUifQ._wDSGrMovlDKeMXfpZT9lwDm0TrS3rMXf2T-chNzgy0"
    };

    const now = new Date();
    const toUpdatedAt = now.toISOString();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fromUpdatedAt = from.toISOString();

    const body = {
        pagination: { page: 1, pageSize: 30, type: "page" },
        year: [2025],
        fromUpdatedAt,
        toUpdatedAt,
    };

    const swiperWrapper = document.getElementById("swiperMovies");

    if (!swiperWrapper) {
        console.error("Ошибка: не найден элемент с id='swiperMovies'");
        return;
    }

    // === Запрос к API ===
    fetch(`${API.BASE}/v1/contents/details`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API.KEY}`,
        },
        body: JSON.stringify(body),
    })
        .then(res => {
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return res.json();
        })
        .then(data => {
            const movies = data?.data || [];

            if (!movies.length) {
                swiperWrapper.innerHTML = `<p style="color:white;text-align:center;">Нет фильмов</p>`;
                return;
            }

            swiperWrapper.innerHTML = ""; // очищаем

            movies.forEach(movie => {
                const poster = movie.posterUrl || "https://via.placeholder.com/600x900?text=No+Image";
                const title = movie.title || "Без названия";
                const year = movie.year ? `${movie.year}` : "";
                // const kinopoiskId = 'k' + movie.kinopoiskId || null;
                // const imdbId = 'i' + movie.imdbId || null;
                const veoId = 'v' + movie.id || null;
                const rating = Math.floor(movie.ratings.kinopoisk.rating) ? movie.ratings.kinopoisk.rating : '';



                const slide = document.createElement("div");
                slide.classList.add("swiper-slide");
                slide.style.backgroundImage = `url(${poster})`;
                slide.innerHTML = `
                    <a href='./movie.html?id=${veoId}&${movie.originalTitle.replace(/\s+/g, '_')}' class="slide-item">
                        <div class="top_properties">
                            <span class="videoQuality">${movie.videoQuality}</span>
                            <span class="rating" style="display:${rating > 1 ? 'block' : 'none'}; color: ${rating >= 7 ? '#4eca00ff' : '#ebba16'};">${rating > 1 ? rating : ''}★</span>
                        </div>
                        <div class="slide-info">
                            <h4>${title} : ${year}</h4>
                        </div>
                    </a>
                    <div class='properties_inne' id=${veoId}>
                        <img src='./assets/img/bookmark.png'>
                    </div>
                    `;
                swiperWrapper.appendChild(slide);
            });

            // === Инициализация Swiper ===
            setTimeout(() => {
                const swiperContainer = document.querySelector(".top_swipper");

                if (!swiperContainer) {
                    console.error("Ошибка: .top_swipper не найден");
                    return;
                }

                new Swiper(".top_swipper", {
                    effect: "coverflow",
                    loop: true,
                    centeredSlides: true,
                    slidesPerView: 3,
                    spaceBetween: 40,
                    speed: 600,
                    coverflowEffect: {
                        rotate: 10,
                        stretch: 0,
                        depth: 200,
                        modifier: 1,
                        slideShadows: true,
                    },
                    navigation: {
                        nextEl: ".swiper-button-next1",
                        prevEl: ".swiper-button-prev1",
                    },
                    pagination: {
                        el: ".swiper-pagination1",
                        clickable: true,
                    },
                    //   autoplay: {
                    //     delay: 4000,
                    //     disableOnInteraction: false,
                    //   },
                    breakpoints: {
                        0: { slidesPerView: 2.5, },
                        640: { slidesPerView: 2.5, },
                        768: { slidesPerView: 4, },
                        1024: { slidesPerView: 6, },
                    },
                });
            }, 100); // небольшая задержка, чтобы DOM успел обновиться
        })
        .catch(err => {
            console.error("API error:", err.message);
            swiperWrapper.innerHTML = `<h3 style="color:white;text-align:center;">Ошибка загрузки фильмов</h3>`;
        });
});
