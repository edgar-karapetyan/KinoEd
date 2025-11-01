
document.addEventListener('DOMContentLoaded', function () {
    // Элементы страницы
    const duration = document.getElementById('duration');
    const movieTitle = document.getElementById('movieTitle');
    const movieDescription = document.querySelector('.movie-description');
    const movieYear = document.getElementById('movieYear');
    const movieAge = document.getElementById('movieAge');
    const movieCountry = document.getElementById('movieCountry');
    const movieGenre = document.getElementById('movieGenre');
    const movieQuality = document.getElementById('movieQuality');
    const ratingValue = document.querySelector('.rating-value');

    // API конфигурация
    const API = {
        BASE: "https://catalog-sync-api.rstprgapipt.com",
        KEY: "eyJhbGciOiJIUzI1NiJ9.eyJ3ZWJTaXRlIjoiMzYzIiwiaXNzIjoiYXBpLXdlYm1hc3RlciIsInN1YiI6IjQwMiIsImlhdCI6MTc1OTQzMzY4NywianRpIjoiZWQ1NTBjYmQtYTY2Mi00M2QyLWIyMzEtNGI0YmZiMmU0OGJmIiwic2NvcGUiOiJETEUifQ._wDSGrMovlDKeMXfpZT9lwDm0TrS3rMXf2T-chNzgy0"
    };

    // Загрузка данных фильма
    async function loadMovieData(movieId) {
        try {
            const response = await fetch(`${API.BASE}/v1/contents/${movieId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API.KEY}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Неверный API ключ');
                } else if (response.status === 404) {
                    throw new Error('Фильм не найден');
                } else if (response.status >= 500) {
                    throw new Error('Ошибка сервера');
                } else {
                    throw new Error(`HTTP ошибка: ${response.status}`);
                }
            }


            const movieData = await response.json();
            updateMovieInfo(movieData);
            return movieData;
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    // Обновление информации о фильме на странице
    function updateMovieInfo(movieData) {
        const detail_label = document.querySelectorAll('.detail-item')

        // Основная информация
        if (movieData.directors) movieTitle.innerHTML = movieData.title || '';
        if (movieData.description) movieDescription.innerHTML = movieData.description || '';
        if (movieData.year) movieYear.innerHTML = movieData.year || '';


        function renderMovieDetails(movieData) {
            const container = document.querySelector('.movie-details');
            if (!container || !movieData) return;

            container.innerHTML = ''; // очищаем старые данные

            const labels = {
                contentType: 'Тип',
                ageRestriction: 'Возраст',
                videoQuality: 'Качество',
                countries: 'Страна',
                premiereAt: 'Премьера',
                directors: 'Режиссёр',
                genres: 'Жанр',
                composers: 'Композитор',
                operators: 'Операторы',
                editors: 'Монтаж',
                screenwriters: 'Сценаристы',
                voiceAuthors: 'Озвучка',
                producers: 'Продюсеры',
                audioTracks: 'Аудиодорожки',
                cast: 'В ролях',
            };

            for (const [key, label] of Object.entries(labels)) {
                let value = movieData[key];
                if (!value) continue;

                // форматирование значений
                switch (key) {
                    case 'premiereAt':
                        value = value.slice(0, 10);
                        break;
                    case 'genres':
                        value = value.map(g => g.name).join(', ');
                        break;
                    case 'countries':
                        value = value.map(c => c.name).join(', ');
                        break;
                    case 'contentType':
                        value = value.name;
                        break;
                    case 'ageRestriction':
                        value = value.replace('AGE_', '') + '+';
                        break;
                    case 'audioTracks':
                        value = value.replace(/"/g, '');
                        break;
                }

                const item = document.createElement('div');
                item.className = 'detail-item';
                item.innerHTML = `
            <span class="detail-label">${label}:</span>
            <span class="midle"></span>
            <span class="end">${value}</span>`;

                container.appendChild(item);
            }
        }
        renderMovieDetails(movieData);


        // Возрастное ограничение
        if (movieAge) {
            const age = movieData.ageRestriction ? movieData.ageRestriction.replace('AGE_', '') : '';
            movieAge.textContent = age + '+';
        }

        // Длительность
        if (duration) {
            duration.textContent = formatDuration(movieData.duration) || '';
        }

        // Форматирование длительности
        function formatDuration(totalMinutes) {
            if (!totalMinutes) return '';
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            return `${hours}ч ${mins}мин`;
        }

        // Страна
        if (movieCountry && movieData.countries && movieData.countries.length > 0) {
            movieCountry.textContent = movieData.countries.map(c => c.name).join(', ');
        }

        // Жанр
        if (movieGenre && movieData.genres && movieData.genres.length > 0) {
            movieGenre.textContent = movieData.genres.map(g => g.name).join(', ');
        }

        // Качество видео
        if (movieQuality) {
            movieQuality.textContent = movieData.videoQuality || 'HD';
        }

        // Рейтинг
        if (ratingValue && movieData.ratings) {
            const rating = movieData.ratings.kinopoisk?.rating || movieData.ratings.imdb?.rating || 0;
            ratingValue.textContent = rating.toFixed(1);

            // Обновляем звезды рейтинга
            updateRatingStars(rating);
        }
        // Обновление звезд рейтинга
        function updateRatingStars(rating) {
            const starsElement = document.querySelector('.rating-stars');
            if (!starsElement) return;
            if (rating < 0.1) { document.querySelector('.movie-rating').style.display = 'none'; return }
            const maxStars = 5;
            const normalizedRating = (rating / 10) * maxStars; // Конвертируем из 10-балльной системы
            const fullStars = Math.floor(normalizedRating);
            const hasHalfStar = normalizedRating % 1 >= 0.5;

            let stars = '★'.repeat(fullStars);
            if (hasHalfStar) stars += '★';
            stars += '☆'.repeat(maxStars - fullStars - (hasHalfStar ? 1 : 0));

            starsElement.textContent = stars;
        }

        // Загрузка постера


        if (movieData.posterUrl) {
            const posterElement = document.querySelector('.movie-poster img');
            if (posterElement) {
                posterElement.src = movieData.posterUrl;
                posterElement.alt = movieData.title;
            }
        }

        // Загрузка актеров

        const veoid = movieData.id || null;
        const imdbId = movieData.imdbId || null;
        const kinopoiskId = movieData.kinopoiskId || null;
        const title = movieData.title || null;

        startPlayer(veoid, imdbId, kinopoiskId, title);

        getMoviesByGenre(movieData.genres.map(g => g.name), 100, movieData.year);
    }

    async function startPlayer(veoid, imdbId, kinopoiskId, title) {
        console.log();

        if (!(veoid || imdbId || kinopoiskId || title)) {
            console.error('Данные фильма не загружены');
            return;
        }


        window.createMultiPlayer = function () {
            window.playersConfig = [
                {
                    name: 'Player 1',
                    type: 'veoveo',
                    id: veoid,
                    imdbId: imdbId,
                    kinopoiskId: kinopoiskId,
                    title: title,
                    url: `https://api.rstprgapipt.com/balancer-api/iframe?movie_id=${veoid}&token=${API.KEY}`,
                },
                {
                    name: 'Player 2',
                    type: 'kinoplayerTop',
                    id: veoid,
                    imdbId: imdbId,
                    kinopoiskId: kinopoiskId,
                    title: title,
                },
                {
                    name: 'Trailer',
                    type: 'kinoplayerTrailer',
                    id: veoid,
                    imdbId: imdbId,
                    kinopoiskId: kinopoiskId,
                    title: title,
                }
            ];

            const container = document.getElementById('multiPlayerContainer');
            if (!container) return;
            let index = 0;

            container.innerHTML = `
            <div class="player-tabs">
                ${window.playersConfig.map((player, index) => `
                    <button class="player-tab ${index === 0 ? 'active' : ''}" 
                            onclick="window.switchPlayer(${index})">
                        ${player.name}
                    </button>
                `).join('')}
            </div>
            <div class="player-${index}"
                <div class="player-wrapper" id="active-player-wrapper">
                    <div class="wrapper-veo">
                        <iframe class="veoplayer" 
                                src="${window.playersConfig[index].url}" 
                                width="100%" 
                                height="100%" 
                                frameborder="0"
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>
            </div>`;
        };

        window.switchPlayer = function (index) {
            const tabs = document.querySelectorAll('.player-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            if (tabs[index]) tabs[index].classList.add('active');

            const wrapper = document.getElementById('active-player-wrapper');
            if (!wrapper || !window.playersConfig) return;

            const player = window.playersConfig[index];
            wrapper.innerHTML = '';

            if (player.type === 'veoveo') {
                wrapper.innerHTML = `
                <div class="wrapper-veo">
                    <iframe class="veoplayer" 
                            src="${player.url}" 
                            height="100%" 
                            frameborder="0"
                            allowfullscreen>
                    </iframe>
                </div>`;
            } else {
                // Для kinoplayer создаем специальную структуру
                const kinoplayerHTML = `
                <div id="kinoplayertop" 
                    data-kinopoisk="${player.kinopoiskId}"
                    data-title="${title}"
                    data-show-errors="false"
                    height="100%" 
                    data-shearch="false" 
                    data-bg="#ffe600ff"
                    ${player.type === 'kinoplayerTrailer' ? 'data-player="trailer" data-player-active="trailer"' : 'data-player="alloha"'}>
                </div>`;

                wrapper.innerHTML = kinoplayerHTML;

                // Загружаем скрипт kinoplayer
                loadKinoplayerScript();
            }
        };

        function loadKinoplayerScript() {
            // Удаляем старый скрипт если есть
            const oldScript = document.getElementById('kinoplayer-script');
            if (oldScript) oldScript.remove();

            // Сбрасываем флаг загрузки при каждом новом вызове
            window.kinoplayerLoaded = false;
            window.kinoplayerRetryCount = window.kinoplayerRetryCount || 0;

            // Проверяем лимит попыток
            if (window.kinoplayerRetryCount >= 30) {
                console.log('Достигнут лимит попыток загрузки kinoplayer');
                showKinoplayerError();
                return;
            }

            window.kinoplayerRetryCount++;

            const script = document.createElement('script');
            script.id = 'kinoplayer-script';
            script.src = '//kinoplayer.top/top.js';
            script.onload = function () {
                window.kinoplayerLoaded = true;
                initializeKinoplayer();
            };

            script.onerror = function () {
                console.error('Ошибка загрузки скрипта kinoplayer');
                // Пробуем повторить через 2 секунды
                setTimeout(loadKinoplayerScript, 1000);
            };

            document.body.appendChild(script);
        }

        function initializeKinoplayer() {
            if (typeof runKinoplayertop === 'function') {
                // Запускаем плеер
                runKinoplayertop();

                // Проверяем через 3 секунды не появилась ли ошибка (только один раз)
                setTimeout(() => {
                    checkKinoplayerError();
                }, 3000);
            } else {
                // Если функция не найдена, пробуем снова через секунду (максимум 3 попытки)
                if (window.kinoplayerInitAttempts === undefined) {
                    window.kinoplayerInitAttempts = 0;
                }

                if (window.kinoplayerInitAttempts < 3) {
                    window.kinoplayerInitAttempts++;
                    setTimeout(initializeKinoplayer, 1000);
                } else {
                    showKinoplayerError();
                }
            }
        }

        function checkKinoplayerError() {
            const kinoplayerContainer = document.getElementById('kinoplayertop');
            if (!kinoplayerContainer) return;

            // Ищем кнопку "Повторить" или сообщение об ошибке (только один раз)
            const errorElements = kinoplayerContainer.querySelectorAll('button, a, div, span');
            let foundError = false;

            for (let element of errorElements) {
                const text = element.textContent || '';
                if ((text.includes('Ошибка') || text.includes('Повторить') ||
                    text.includes('ошибка') || text.includes('повторить')) &&
                    !text.includes('Установить')) {

                    foundError = true;
                    console.log('Обнаружена ошибка kinoplayer, выполняем повтор...');

                    // Кликаем по элементу
                    element.click();

                    // После клика больше не проверяем
                    break;
                }
            }

            // Если нашли ошибку и кликнули, больше не проверяем
            if (!foundError) {
                // Если ошибки нет, сбрасываем счетчик попыток
                window.kinoplayerRetryCount = 0;
            }
        }

        function showKinoplayerError() {
            const wrapper = document.getElementById('active-player-wrapper');
            if (wrapper) {
                wrapper.innerHTML = `
                <div style="display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                height: 100%;">

                    <p style="margin-bottom: 15px;">Не удалось загрузить плеер</p>
                    <button onclick="window.retryKinoplayer()" style="
                            padding: 12px 25px;
                            border-radius: 5px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                            background-color: transparent;
                            background-color: #f36607;
                            border: 2px solid #f36607;">

                        Попробовать снова ?
                        
                    </button>

                </div>`;
            }
        }

        // Функция для принудительного повтора
        window.retryKinoplayer = function () {
            window.location.reload();
        };

        // Инициализация
        window.createMultiPlayer();
    }

    // Отображение похожих фильмов из API

    async function getMoviesByGenre(genres, count = 60, year) {

        try {
            const token = API.KEY;
            const baseUrl = API.BASE;

            // Получаем список жанров
            const genresResponse = await fetch(`${baseUrl}/v1/filters/genres`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const allGenres = await genresResponse.json();

            const genreArray = Array.isArray(genres) ? genres : [genres];
            const genreIds = [];

            for (const genre of genreArray) {
                const genreObj = allGenres.find(g =>
                    g.name.toLowerCase().includes(genre.toLowerCase()) ||
                    g.slug.toLowerCase().includes(genre.toLowerCase())
                );
                if (genreObj) genreIds.push(genreObj.id);
            }

            if (!genreIds.length) {
                console.log('Не найдено ни одного валидного жанра');
                return;
            }

            // Получаем фильмы по жанрам
            const moviesResponse = await fetch(`${baseUrl}/v1/contents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pagination: { page: 1, pageSize: count, type: "page" },
                    genreId: genreIds,
                    textFilter: ""
                })
            });

            const data = await moviesResponse.json();
            const similarMovies_title = document.getElementById('similarMovies_title');

            similarMovies_title.innerHTML = `<span>Похожие фильмы в жанре:</span> ${genreArray.join(', ')}`;
            const wrapper = document.getElementById('similarMoviesWrapp');
            let html = '';

            data.data.forEach(movie => {
                const poster = movie.posterUrl || "./assets/img/kinoed.png";
                const title = movie.title || "Без названия";
                const year = movie.year || "";
                const veoId = 'v' + movie.id;
                const rating = movie.ratings?.kinopoisk?.rating || '';
                const showRating = rating > 0;
                const ratingColor = rating >= 7 ? '#4eca00ff' : '#ffac07';

                html += `
                <a href="./movie.html?id=${veoId}&${movie.originalTitle}" class="swiper-slide" style="background-image: url(${poster})">
                    <div class="slide-item">
                        <div class="top_properties">
                            <span class="videoQuality">HD</span>
                            <span class="rating" style="display:${showRating ? 'block' : 'none'}; color:${ratingColor};">${rating}★</span>
                        </div>
                        <div class="properties_inne">
                            <img src="./assets/img/bookmark.png" alt="Добавить в закладки" id="${veoId}">
                        </div>
                        <div class="slide-info">
                            <h4>${title} : ${year}</h4>
                        </div>
                    </div>
                </a>
            `;
            });

            wrapper.innerHTML = html;

            // Инициализация Swiper
            new Swiper('.similarMovies .swiper', {
                slidesPerView: 6,
                spaceBetween: 10,
                freeMode: true,
                navigation: {
                    nextEl: '.swiper-button-next2',
                    prevEl: '.swiper-button-prev2'
                },
                breakpoints: {
                    0: { slidesPerView: 2, },
                    640: { slidesPerView: 2.5, },
                    768: { slidesPerView: 3, },
                    1024: { slidesPerView: 4, },
                    1440: { slidesPerView: 5, },
                    1920: { slidesPerView: 6, },
                },
            });

        } catch (error) {
            console.error('Ошибка:', error);
        }
    }



    // Инициализация страницы
    async function init() {
        try {
            // Получаем ID фильма из URL
            const url = new URLSearchParams(window.location.search);
            let movieId = url.get('id')
            let newmovieId = movieId.slice(1, movieId.length)
            await loadMovieData(newmovieId);
            setTimeout(() => {
                genloader_hide()
            }, 200);
        } catch (error) {
            console.error('Ошибка инициализации:', error);
        }
    }

    // Запуск инициализации
    init();
});



// conetns 
        // Система рейтинга для комментариев
        const stars = document.querySelectorAll('.star[data-rating]');
        let selectedRating = 0;
        
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                selectedRating = rating;
                
                stars.forEach(s => {
                    if (parseInt(s.getAttribute('data-rating')) <= rating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
            
            star.addEventListener('mouseover', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                
                stars.forEach(s => {
                    if (parseInt(s.getAttribute('data-rating')) <= rating) {
                        s.style.color = '#f36607';
                    } else {
                        s.style.color = 'rgba(255, 255, 255, 0.3)';
                    }
                });
            });
            
            star.addEventListener('mouseout', function() {
                stars.forEach(s => {
                    if (parseInt(s.getAttribute('data-rating')) <= selectedRating) {
                        s.style.color = '#f36607';
                    } else {
                        s.style.color = 'rgba(255, 255, 255, 0.3)';
                    }
                });
            });
        });
        
        // Массив для хранения комментариев
        let comments = [
            {
                id: 1,
                author: "Алексей Петров",
                date: "15.03.2023",
                rating: 5,
                text: "Один из лучших научно-фантастических фильмов, которые я когда-либо видел. Потрясающая визуализация черных дыр и теорий относительности. Сюжет заставляет задуматься о нашем месте во Вселенной."
            },
            {
                id: 2,
                author: "Мария Иванова",
                date: "10.03.2023",
                rating: 4,
                text: "Отличный фильм, но немного затянут. Визуальные эффекты просто потрясающие, а актерская игра на высоте. Особенно впечатлили отношения отца и дочери - очень трогательно и эмоционально."
            }
        ];
        
        // Функция для отображения комментариев
        function renderComments() {
            const commentsList = document.getElementById('commentsList');
            
            if (comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">Пока нет комментариев. Будьте первым!</div>';
                return;
            }
            
            commentsList.innerHTML = '';
            
            comments.forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                commentElement.setAttribute('data-id', comment.id);
                
                commentElement.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-date">${comment.date}</span>
                    </div>
                    <div class="comment-rating">
                        ${'<span class="star active">★</span>'.repeat(comment.rating)}
                        ${'<span class="star">★</span>'.repeat(5 - comment.rating)}
                    </div>
                    <p class="comment-text">${comment.text}</p>
                    <div class="comment-actions">
                        <button class="btn btn-edit" onclick="editComment(${comment.id})">Редактировать</button>
                        <button class="btn btn-delete" onclick="deleteComment(${comment.id})">Удалить</button>
                    </div>
                    <div class="edit-form" id="editForm-${comment.id}">
                        <textarea id="editText-${comment.id}">${comment.text}</textarea>
                        <div class="edit-actions">
                            <button class="btn btn-edit" onclick="saveComment(${comment.id})">Сохранить</button>
                            <button class="btn btn-cancel" onclick="cancelEdit(${comment.id})">Отмена</button>
                        </div>
                    </div>
                `;
                
                commentsList.appendChild(commentElement);
            });
        }
        
        // Функция для добавления комментария
        function addComment(author, rating, text) {
            const newComment = {
                id: Date.now(), // Используем временную метку как ID
                author: author,
                date: new Date().toLocaleDateString(),
                rating: rating,
                text: text
            };
            
            comments.unshift(newComment); // Добавляем в начало массива
            renderComments();
        }
        
        // Функция для редактирования комментария
        function editComment(id) {
            document.getElementById(`editForm-${id}`).style.display = 'block';
        }
        
        // Функция для сохранения отредактированного комментария
        function saveComment(id) {
            const newText = document.getElementById(`editText-${id}`).value.trim();
            
            if (newText === '') {
                alert('Текст комментария не может быть пустым');
                return;
            }
            
            const commentIndex = comments.findIndex(comment => comment.id === id);
            if (commentIndex !== -1) {
                comments[commentIndex].text = newText;
                comments[commentIndex].date = new Date().toLocaleDateString() + ' (изменено)';
                renderComments();
            }
        }
        
        // Функция для отмены редактирования
        function cancelEdit(id) {
            document.getElementById(`editForm-${id}`).style.display = 'none';
        }
        
        // Функция для удаления комментария
        function deleteComment(id) {
            if (confirm('Вы уверены, что хотите удалить этот комментарий?')) {
                comments = comments.filter(comment => comment.id !== id);
                renderComments();
            }
        }
        
        // Обработка формы добавления комментария
        document.getElementById('commentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userName = 'valod'; // poluchit iz servera 
            const commentText = document.getElementById('commentText').value.trim(); // 
            
            if (userName === '') {
                alert('Пожалуйста, введите ваше имя');
                return;
            }
            
            if (selectedRating === 0) {
                alert('Пожалуйста, выберите оценку');
                return;
            }
            
            if (commentText === '') {
                alert('Пожалуйста, введите текст комментария');
                return;
            }
            
            addComment(userName, selectedRating, commentText);
            
            // Сброс формы
            document.getElementById('userName').value = '';
            document.getElementById('commentText').value = '';
            selectedRating = 0;
            stars.forEach(star => {
                star.classList.remove('active');
                star.style.color = 'rgba(255, 255, 255, 0.3)';
            });
        });
        
        // Инициализация при загрузке страницы
        document.addEventListener('DOMContentLoaded', function() {
            renderComments();
        });