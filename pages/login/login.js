
// Переключение между формами входа и регистрации
document.getElementById('showRegistration').addEventListener('click', function () {
    document.querySelector('.form-container').classList.add('show-registration');
});

document.getElementById('showLogin').addEventListener('click', function () {
    document.querySelector('.form-container').classList.remove('show-registration');
});

// Обработка формы входа
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    // В реальном приложении здесь будет отправка данных на сервер
    alert('Вход выполнен успешно!');
});

// Обработка формы регистрации
document.getElementById('registrationForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const age = document.getElementById('age').value;

    if (password !== confirmPassword) {
        alert('Пароли не совпадают!');
        return;
    }

    if (!age) {
        alert('Пожалуйста, выберите ваш возраст');
        return;
    }

    if (parseInt(age) < 18) {
        alert('Регистрация доступна только для пользователей от 18 лет');
        return;
    }

    // В реальном приложении здесь будет отправка данных на сервер
    alert('Регистрация успешно завершена!');
});

// Добавляем анимацию при фокусе на инпуты
const inputs = document.querySelectorAll('input, select');
inputs.forEach(input => {
    input.addEventListener('focus', function () {
        this.parentElement.style.transform = 'translateY(-2px)';
    });

    input.addEventListener('blur', function () {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Анимация для кнопок при клике
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('click', function (e) {
        // Создаем эффект волны
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(0);
                    animation: ripple-animation 0.6s linear;
                    width: ${size}px;
                    height: ${size}px;
                    top: ${y}px;
                    left: ${x}px;
                `;

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Добавляем стили для анимации волны
const style = document.createElement('style');
style.textContent = `
            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
document.head.appendChild(style);