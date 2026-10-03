// Переменные состояния игры
let user = { name: "", balance: 1000 };
let currentSelectedChip = 10;
let bets = { red: 0, black: 0, zero: 0 };
let isSpinning = false;

// Структура колеса европейской рулетки (37 секторов в правильном порядке)
const rouletteNumbers = [
    { n: 0, c: 'zero' },  { n: 32, c: 'red' },   { n: 15, c: 'black' }, { n: 19, c: 'red' },
    { n: 4, c: 'black' },  { n: 21, c: 'red' },   { n: 2, c: 'black' },  { n: 25, c: 'red' },
    { n: 17, c: 'black' }, { n: 34, c: 'red' },   { n: 6, c: 'black' },  { n: 27, c: 'red' },
    { n: 13, c: 'black' }, { n: 36, c: 'red' },   { n: 11, c: 'black' }, { n: 30, c: 'red' },
    { n: 8, c: 'black' },  { n: 23, c: 'red' },   { n: 10, c: 'black' }, { n: 5, c: 'red' },
    { n: 24, c: 'black' }, { n: 16, c: 'red' },   { n: 33, c: 'black' }, { n: 1, c: 'red' },
    { n: 20, c: 'black' }, { n: 14, c: 'red' },   { n: 31, c: 'black' }, { n: 9, c: 'red' },
    { n: 22, c: 'black' }, { n: 18, c: 'red' },   { n: 29, c: 'black' }, { n: 7, c: 'red' },
    { n: 28, c: 'black' }, { n: 12, c: 'red' },   { n: 35, c: 'black' }, { n: 3, c: 'red' },
    { n: 26, c: 'black' }
];

const sectorDegrees = 360 / 37; // ~9.73 градусов на один сектор

// DOM Элементы
const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const userNameDisplay = document.getElementById('user-name');
const userBalanceDisplay = document.getElementById('user-balance');
const wheel = document.getElementById('wheel');
const statusMessage = document.getElementById('status-message');
const spinBtn = document.getElementById('spin-btn');
const clearBtn = document.getElementById('clear-btn');
const refillBtn = document.getElementById('refill-btn');

// Настройка динамического CSS-колеса рулетки (генерация красивого градиента)
function generateWheelBackground() {
    let gradientParts = [];
    rouletteNumbers.forEach((sector, index) => {
        let startDeg = index * sectorDegrees;
        let endDeg = (index + 1) * sectorDegrees;
        let color = sector.c === 'green' || sector.c === 'zero' ? '#008000' : (sector.c === 'red' ? '#d32f2f' : '#1a1a1a');
        gradientParts.push(`${color} ${startDeg}deg ${endDeg}deg`);
    });
    wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;
}
generateWheelBackground();

// --- АВТОРИЗАЦИЯ И LOCALSTORAGE ---
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (!name) return alert('Пожалуйста, введите имя!');

    user.name = name;
    const savedData = localStorage.getItem(`casino_user_${name}`);

    if (savedData) {
        user = JSON.parse(savedData);
    } else {
        user.balance = 1000;
        saveUserToStorage();
    }

    updateUI();
    authScreen.classList.remove('active');
    setTimeout(() => {
        gameScreen.classList.add('active');
    }, 400);
});

function saveUserToStorage() {
    localStorage.setItem(`casino_user_${user.name}`, JSON.stringify(user));
}

function updateUI() {
    userNameDisplay.textContent = user.name;
    userBalanceDisplay.textContent = user.balance;

    // Обновление отображения фишек на полях ставок
    ['red', 'black', 'zero'].forEach(type => {
        const chipEl = document.getElementById(`bet-amount-${type}`);
        if (bets[type] > 0) {
            chipEl.textContent = bets[type];
            chipEl.classList.remove('hidden');
        } else {
            chipEl.classList.add('hidden');
        }
    });
}

// --- УПРАВЛЕНИЕ СТАВКАМИ ---
// Выбор номинала фишки
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (isSpinning) return;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        currentSelectedChip = parseInt(e.target.dataset.value);
    });
});

// Клик по игровому полю (постановка ставки)
document.querySelectorAll('.bet-option').forEach(option => {
    option.addEventListener('click', (e) => {
        if (isSpinning) return;
        const target = option.dataset.target;

        if (user.balance >= currentSelectedChip) {
            user.balance -= currentSelectedChip;
            bets[target] += currentSelectedChip;
            updateUI();
            statusMessage.textContent = `Ставка принята!`;
        } else {
            statusMessage.textContent = `Недостаточно фишек!`;
        }
    });
});

// Сброс всех ставок
clearBtn.addEventListener('click', () => {
    if (isSpinning) return;
    user.balance += (bets.red + bets.black + bets.zero);
    bets = { red: 0, black: 0, zero: 0 };
    updateUI();
    statusMessage.textContent = `Ставки сброшены.`;
});

// Бесплатный закуп фишек
refillBtn.addEventListener('click', () => {
    if (isSpinning) return;
    user.balance += 500;
    saveUserToStorage();
    updateUI();
    statusMessage.textContent = `Баланс пополнен на 500 фишек!`;
});


// --- ЛОГИКА ВРАЩЕНИЯ И ИГРЫ ---
let currentRotation = 0;

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;

    const totalBet = bets.red + bets.black + bets.zero;
    if (totalBet === 0) {
        statusMessage.textContent = `Сделайте хотя бы одну ставку!`;
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    clearBtn.disabled = true;
    refillBtn.disabled = true;
    statusMessage.textContent = `Ставки сделаны, колесо крутится!`;

    // 1. Выбираем случайный выигрышный сектор (индекс от 0 до 36)
    const winningIndex = Math.floor(Math.random() * 37);
    const winningSector = rouletteNumbers[winningIndex];

    // 2. Расчет угла поворота
    // Чтобы маркер наверху указывал точно на сектор, нам нужно сместить колесо назад на этот угол.
    const sectorAngle = winningIndex * sectorDegrees;

    // Добавляем минимум 5 полных оборотов (1800 градусов) для реалистичности вращения
    const extraSpins = 1800;

    // Итоговый угол поворота (вычитаем из накопленного, чтобы крутилось по часовой стрелке)
    currentRotation += extraSpins + (360 - sectorAngle);

    // Вращаем колесо с помощью CSS
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    // 3. Ждем окончания анимации (4 секунды, как прописано в CSS transition)
    setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        clearBtn.disabled = false;
        refillBtn.disabled = false;

        // Расчет выигрыша
        let winnings = 0;
        if (bets[winningSector.c] > 0) {
            // Если ставка на цвет (красное/черное) — выплата 2х
            if (winningSector.c === 'red' || winningSector.c === 'black') {
                winnings += bets[winningSector.c] * 2;
            }
        }
        // Если выпало зеро и на него была ставка — выплата 36х (или 35 к 1)
        if (winningSector.c === 'zero' && bets.zero > 0) {
            winnings += bets.zero * 36;
        }

        // Обновление кошелька игрока
        user.balance += winnings;
        saveUserToStorage();

        // Отображение результатов
        const colorName = winningSector.c === 'red' ? 'КРАСНОЕ' : (winningSector.c === 'black' ? 'ЧЕРНОЕ' : 'ЗЕРО');
        if (winnings > 0) {
            statusMessage.innerHTML = `Выпало: <strong style="color:#ffd700">${winningSector.n} (${colorName})</strong>. Вы выиграли <span style="color:#00c853">+${winnings}</span>!`;
        } else {
            statusMessage.innerHTML = `Выпало: <strong>${winningSector.n} (${colorName})</strong>. Повезет в следующий раз!`;
        }

        // Обнуляем ставки для следующего раунда
        bets = { red: 0, black: 0, zero: 0 };
        updateUI();

    }, 4000);
});
