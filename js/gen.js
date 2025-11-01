// ------------------------------------------------- animatedText
const animatedText = () => {
    document.querySelectorAll('.wave-text').forEach(block => {
        const text = block.textContent.trim();
        block.textContent = '';

        [...text].forEach(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            block.appendChild(span);
        });

        const duration = 800; // время анимации в мс

        block.addEventListener('mouseenter', () => {
            // если класс уже есть — сбрасываем анимацию
            block.classList.remove('wave-active');
            void block.offsetWidth; // хак, чтобы перезапустить CSS-анимацию
            block.classList.add('wave-active');
        });

        block.addEventListener('mouseleave', () => {
            setTimeout(() => {
                block.classList.remove('wave-active');
            }, duration);
        });
    });

}
animatedText()
// ------------------------------------------------- scroll js

// Индикатор прогресса скролла
function initScrollProgress() {
    // Создаем элемент индикатора
    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    document.body.appendChild(scrollProgress);

    // Обновляем индикатор при скролле
    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        const progress = scrollTop / (documentHeight - windowHeight);
        scrollProgress.style.transform = `scaleX(${progress})`;
    });
}

// Плавный скролл к элементам
function smoothScrollTo(target, duration = 1000) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return;

    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    initScrollProgress();

    // Добавляем плавный скролл для всех внутренних ссылок
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            smoothScrollTo(target);
        });
    });
});

// Функция для проверки видимости элемента при скролле
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Ленивая загрузка при скролле
function initLazyLoading() {
    const lazyElements = document.querySelectorAll('[data-lazy]');

    const lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const lazyElement = entry.target;
                // Загружаем контент
                if (lazyElement.dataset.src) {
                    lazyElement.src = lazyElement.dataset.src;
                }
                if (lazyElement.dataset.background) {
                    lazyElement.style.backgroundImage = `url(${lazyElement.dataset.background})`;
                }
                lazyObserver.unobserve(lazyElement);
            }
        });
    });

    lazyElements.forEach(element => {
        lazyObserver.observe(element);
    });
}

// ------------------------------------------ укорочивания текста
function shortenText(text, maxLength = 100) {
    if (typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

// burger menu
const burger_btn = document.getElementById("burger_btn");
const burger = document.getElementById("burger");


burger_btn.addEventListener("click", () => {
    burger_btn.classList.toggle("active");
    burger.classList.toggle("active");
});

function genloader_hide() {
    console.log('genloader_hide ok');
    
    document.querySelector('.genLoader').style.cssText = 'opacity: 0;'

    setTimeout(() => {
        document.querySelector('.genLoader').style.cssText = 'display:none'
    },1000);
}