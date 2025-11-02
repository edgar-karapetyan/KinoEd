// conetns 
// Система рейтинга для комментариев
const stars = document.querySelectorAll('.star[data-rating]');
let selectedRating = 0;

stars.forEach(star => {
    star.addEventListener('click', function () {
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

    star.addEventListener('mouseover', function () {
        const rating = parseInt(this.getAttribute('data-rating'));

        stars.forEach(s => {
            if (parseInt(s.getAttribute('data-rating')) <= rating) {
                s.style.color = '#f36607';
            } else {
                s.style.color = 'rgba(255, 255, 255, 0.3)';
            }
        });
    });

    star.addEventListener('mouseout', function () {
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
document.getElementById('commentForm').addEventListener('submit', function (e) {
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
document.addEventListener('DOMContentLoaded', function () {
    renderComments();
});