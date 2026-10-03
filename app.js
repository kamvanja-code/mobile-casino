// --- КРИСТАЛЬНО ЧИСТЫЙ ЗВУКОВОЙ ДВИЖОК КАЗИНО ---
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

    // Реалистичный глухой звук удара тяжелых глиняных фишек друг о друга
    playChipSound() {
        this.init();
        const now = this.ctx.currentTime;
        this.createClink(now, 920, 0.025);
        this.createClink(now + 0.011, 740, 0.018);
    },

    createClink(time, freq, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + duration);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + duration + 0.01);
    },

    // Стук шарика о ячейку рулетки
    playBallTick() {
        this.init(); const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.02);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.02);
    },

    // Мажорный победный аккорд казино при выигрыше ставки
    playWinSound() {
        this.init(); const now = this.ctx.currentTime;
        const freqs = [329.63, 392.00, 523.25, 659.25];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(f, now + i * 0.08);
            gain.gain.setValueAtTime(0.12, now + i * 0.08); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08); osc.stop(now + 0.6);
        });
    }
};

// Глобальное состояние игры
let user = { name: "", password: "", balance: 1000 };
let currentSelectedChip = 10;
let bets = { red: 0, black: 0, zero: 0 };
let isSpinning = false;

// 37 секторов европейской рулетки (Строгое чередование по часовой стрелке)
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

const sectorDegrees = 360 / 37;
const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const authErrorMsg = document.getElementById('auth-error-msg');
const userNameDisplay = document.getElementById('user-name');
const userBalanceDisplay = document.getElementById('user-balance');
const wheel = document.getElementById('wheel');
const ball = document.getElementById('roulette-ball');
const statusMessage = document.getElementById('status-message');
const spinBtn = document.getElementById('spin-btn');
const clearBtn = document.getElementById('clear-btn');
const cheatConsoleBtn = document.getElementById('cheat-console-btn');

const globalLeaderboardBtn = document.getElementById('global-leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardRows = document.getElementById('leaderboard-rows');

function renderWheelSectors() {
    let gradientParts = [];
    rouletteNumbers.forEach((sector, index) => {
        let startDeg = index * sectorDegrees;
        let endDeg = (index + 1) * sectorDegrees;
        let color = sector.c === 'zero' ? '#116936' : (sector.c === 'red' ? '#bd1c1c' : '#1a1a1a');
        gradientParts.push(`${color} ${startDeg}deg ${endDeg}deg`);
    });
    wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;
}
renderWheelSectors();

// --- ЖЕЛЕЗОБЕТОННАЯ СИСТЕМА РЕГИСТРАЦИИ И ВХОДА ---
loginBtn.addEventListener('click', () => {
    AudioEngine.init();
    const name = usernameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const password = passwordInput.value.trim();

    if (!name || !password) {
        authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ";
        return;
    }

    const localKey = `grand_velvet_user_${name}`;
    const savedUser = localStorage.getItem(localKey);

    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.password === password) {
            user = parsedUser;
            authErrorMsg.textContent = "";
            enterCasino();
        } else {
            authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ";
        }
    } else {
        // Создаем новый уникальный аккаунт в памяти устройства
        user = { name: name, password: password, balance: 1000 };
        saveSession();
        authErrorMsg.textContent = "";
        enterCasino();
    }
});

function enterCasino() {
    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
}

function saveSession() {
    localStorage.setItem(`grand_velvet_user_${user.name}`, JSON.stringify(user));
}

function updateInterface() {
    userNameDisplay.textContent = user.name;
    userBalanceDisplay.textContent = user.balance.toLocaleString();
    ['red', 'black', 'zero'].forEach(type => {
        const holder = document.getElementById(`chip-space-${type}`);
        if (bets[type] > 0) { holder.textContent = bets[type]; holder.classList.remove('hidden'); }
        else { holder.classList.add('hidden'); }
    });
}

document.querySelectorAll('.casino-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (isSpinning) return;
        AudioEngine.playChipSound();
        document.querySelectorAll('.casino-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        currentSelectedChip = parseInt(e.target.dataset.value);
    });
});

document.querySelectorAll('.bet-spot').forEach(spot => {
    spot.addEventListener('click', () => {
        if (isSpinning) return;
        const target = spot.dataset.target;
        if (user.balance >= currentSelectedChip) {
            AudioEngine.playChipSound();
            user.balance -= currentSelectedChip;
            bets[target] += currentSelectedChip;
            updateInterface();
            statusMessage.textContent = "СТАВКА ПРИНЯТА";
        } else { statusMessage.textContent = "НЕДОСТАТОЧНО СРЕДСТВ"; }
    });
});

clearBtn.addEventListener('click', () => {
    if (isSpinning) return;
    AudioEngine.playChipSound();
    user.balance += (bets.red + bets.black + bets.zero);
    bets = { red: 0, black: 0, zero: 0 };
    updateInterface();
    statusMessage.textContent = "СТАВКИ СБРОШЕНЫ";
});

// --- МГНОВЕННЫЙ ЛИДЕРБОРД ВСЕХ СОЗДАННЫХ АККАУНТОВ ---
globalLeaderboardBtn.addEventListener('click', () => {
    AudioEngine.init();
    leaderboardModal.classList.add('active');
    renderLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => { leaderboardModal.classList.remove('active'); });

function renderLeaderboard() {
    let players = [];

    // Считываем абсолютно все профили, созданные в приложении
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("grand_velvet_user_")) {
            try { players.push(JSON.parse(localStorage.getItem(key))); } catch(e) {}
        }
    }

    players.sort((a, b) => b.balance - a.balance);
    leaderboardRows.innerHTML = "";

    if (players.length === 0) {
        leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">VIP-список пуст</td></tr>`;
        return;
    }

    players.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>#${idx + 1}</td><td>${p.name} ${p.name === user.name ? '<span style="color:#22c55e">(Вы)</span>' : ''}</td><td>${p.balance.toLocaleString()} $</td>`;
        leaderboardRows.appendChild(row);
    });
}
cheatConsoleBtn.addEventListener('click', () => {
    if (isSpinning) return;
    const inputCode = prompt("ВВЕДИТЕ СЕКРЕТНЫЙ VIP-КОД:");
    if (!inputCode) return;
    const cleanCode = inputCode.trim().toLowerCase();

    if (cleanCode === "cashin") {
        user.balance += 5000; saveSession(); updateInterface();
        alert("Код активирован! Зачислено +5,000 \$");
    } else if (cleanCode === "cashout") {
        user.balance = Math.max(0, user.balance - 500); saveSession(); updateInterface();
        alert("Код активирован! Списано -500 \$");
    } else if (cleanCode.startsWith("deleteplayer ")) {
        const target = inputCode.substring(13).trim().toUpperCase();
        if (!target) return;
        const localKey = `grand_velvet_user_${target}`;
        if (localStorage.getItem(localKey)) {
            localStorage.removeItem(localKey);
            alert(`Игрок ${target} полностью удален.`);
            if (target === user.name) location.reload();
        } else { alert("Игрок не найден."); }
    } else { alert("Неверный VIP-код!"); }
});

// --- ИДЕАЛЬНОЕ ГЛАДКОЕ ВРАЩЕНИЕ И ПОСАДКА ШАРИКА В КАРМАН РУЛЕТКИ ---
let wheelRotation = 0;

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    const activeBet = bets.red + bets.black + bets.zero;
    if (activeBet === 0) { statusMessage.textContent = "СДЕЛАЙТЕ СТАВКУ НА СУКНО"; return; }

    isSpinning = true; toggleControls(true);
    document.querySelectorAll('.bet-spot').forEach(spot => spot.classList.remove('winning-highlight'));
    statusMessage.textContent = "СТАВКИ СДЕЛАНЫ. КОЛЕСО ЗАПУЩЕНО";

    const winningIndex = Math.floor(Math.random() * 37);
    const resultSector = rouletteNumbers[winningIndex];

    const duration = 6500; // Ровно 6.5 секунд премиального вращения
    const startTime = performance.now();

    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 2160; // 6 полных кругов колеса

    const startWheelAngle = wheelRotation;
    const endWheelAngle = wheelRotation + wheelSpins + (360 - wheelTargetAngle);
    wheelRotation = endWheelAngle;

    wheel.style.transform = `rotate(${wheelRotation}deg)`;
    ball.classList.remove('hidden');

    let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Математическая инерция 5-й степени (Плавное затухание колеса рулетки)
        const easeOutQuint = 1 - Math.pow(1 - progress, 5);
        const currentWheelPos = startWheelAngle + (endWheelAngle - startWheelAngle) * easeOutQuint;

        // ИННОВАЦИОННЫЙ ОТНОСИТЕЛЬНЫЙ РАСЧЕТ ШАРИКА
        // Вместо безумных Фаз, шарик теперь "привязан" к сектору, но имеет свою добавочную
        // скорость прокрутки вперед, которая тает по экспоненте без единого рывка в конце!
        const ballExtraOrbits = 1440; // Шарик делает 4 дополнительных круга поверх скорости колеса
        const ballProgressAngle = ballExtraOrbits * (1 - Math.pow(1 - progress, 3.5));

        // Итоговый угол шарика: Угол сектора + Текущий поворот рулетки + 180 (верхний маркер) - Добавочный путь
        const currentBallPos = (exactAngleFix(currentWheelPos) + wheelTargetAngle + 180) - (ballExtraOrbits - ballProgressAngle);

        // Мягкое сужение радиуса качения шарика (от 96px до глубоких 65px в кармане числа)
        const currentRadius = 96 - (31 * easeOutQuint);

        ball.style.transform = `translate(-50%, -50%) rotate(${currentBallPos}deg) translate(${currentRadius}px) rotate(${-currentBallPos}deg)`;

        // Звуковая трещотка
        const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
        if (Math.abs(absoluteRelativeAngle - lastTickAngle) >= sectorDegrees) {
            if (progress < 0.83) AudioEngine.playBallTick();
            lastTickAngle = absoluteRelativeAngle;
        }

        if (progress < 1) {
            requestAnimationFrame(animateSimulation);
        } else {
            finishRound(resultSector);
        }
    }

    // Вспомогательная функция, убирающая накопленные градусы для точности тригонометрии
    function exactAngleFix(angle) { return angle % 360; }

    requestAnimationFrame(animateSimulation);
});

function finishRound(resultSector) {
    let winSum = 0;
    if (bets[resultSector.c] > 0 && (resultSector.c === 'red' || resultSector.c === 'black')) winSum += bets[resultSector.c] * 2;
    if (resultSector.c === 'zero' && bets.zero > 0) winSum += bets.zero * 36;

    user.balance += winSum;
    saveSession();

    if (winSum > 0) AudioEngine.playWinSound();

    // Подсветка выигравшего поля
    const winningFieldElement = document.querySelector(`.spot-${resultSector.c}`);
    if (winningFieldElement) winningFieldElement.classList.add('winning-highlight');

    const colorText = resultSector.c === 'red' ? 'КРАСНОЕ' : (resultSector.c === 'black' ? 'ЧЕРНОЕ' : 'ЗЕРО');
    if (winSum > 0) {
        statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffd700">${resultSector.n} (${colorText})</span>. ВЫИГРЫШ: <span style="color:#22c55e">+$${winSum}</span>!`;
    } else {
        statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffffff">${resultSector.n} (${colorText})</span>. СТАВКА ПРОИГРАЛА.`;
    }

    setTimeout(() => {
        isSpinning = false; toggleControls(false);
        bets = { red: 0, black: 0, zero: 0 }; updateInterface();
        statusMessage.textContent = "СДЕЛАЙТЕ ВАШИ СТАВКИ";
    }, 3000);
}

function toggleControls(disabled) {
    spinBtn.disabled = disabled; clearBtn.disabled = disabled; cheatConsoleBtn.disabled = disabled;
}
