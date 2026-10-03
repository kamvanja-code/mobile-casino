// --- ВЫДЕЛЕННАЯ СТАБИЛЬНАЯ МИРОВАЯ БАЗА ДАННЫХ (GOOGLE REALTIME API) ---
const GOOGLE_API_URL = "https://google.com";

// Отправка данных игрока в глобальную базу Google
async function saveToCloud(playerName, password, balance) {
    try {
        await fetch(GOOGLE_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "save",
                name: playerName,
                password: password,
                balance: balance
            })
        });
    } catch (e) { console.error("Ошибка сохранения в Google Cloud:", e); }
}

// Запрос данных конкретного игрока или всей таблицы лидеров
async function fetchCloudData(actionType, playerName = "") {
    try {
        const url = `${GOOGLE_API_URL}?action=${actionType}&name=${playerName}&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Ошибка чтения из Google Cloud:", e);
        return null;
    }
}

// --- ЗВУКОВОЙ ДВИЖОК С СОУДАРЕНИЕМ ТЯЖЕЛЫХ ФИШЕК ---
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

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

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + duration + 0.01);
    },

    playBallTick() {
        this.init(); const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.02);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.02);
    },

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

let user = { name: "", password: "", balance: 1000 };
let currentSelectedChip = 10;
let bets = { red: 0, black: 0, zero: 0 };
let isSpinning = false;

// Полное точное колесо европейской рулетки (37 секторов)
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

loginBtn.addEventListener('click', async () => {
    AudioEngine.init();
    const name = usernameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const password = passwordInput.value.trim();

    if (!name || !password) {
        authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ";
        return;
    }

    loginBtn.disabled = true;
    authErrorMsg.textContent = "СИНХРОНИЗАЦИЯ С СЕРВЕРОМ GOOGLE...";

    const cloudUser = await fetchCloudData("get", name);

    if (cloudUser && cloudUser.status === "found") {
        if (cloudUser.password === password) {
            user = { name: name, password: password, balance: parseInt(cloudUser.balance) };
            authErrorMsg.textContent = "";
            enterCasino();
        } else {
            authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ ДЛЯ ЭТОГО VIP-НИКА";
            loginBtn.disabled = false;
        }
    } else {
        user = { name: name, password: password, balance: 1000 };
        await saveSession();
        // Даем Google Скрипту 400мс фонового времени перед переходом на игровой экран
        setTimeout(enterCasino, 400);
    }
});

function enterCasino() {
    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
}

async function saveSession() {
    localStorage.setItem(`gv_user_${user.name}`, JSON.stringify(user));
    await saveToCloud(user.name, user.password, user.balance);
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

globalLeaderboardBtn.addEventListener('click', async () => {
    AudioEngine.init();
    leaderboardModal.classList.add('active');
    leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">СКАЧИВАНИЕ МИРОВОГО ТОПА...</td></tr>`;
    await renderLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => { leaderboardModal.classList.remove('active'); });

// Умный метод загрузки топа с авто-перезапросом при пустой базе
async function renderLeaderboard(retryCount = 0) {
    const response = await fetchCloudData("leaderboard");

    if (!response || !response.players || response.players.length === 0) {
        // Если база пуста, но это первый вход игрока, делаем одну попытку перезапроса через 1.2 сек
        if (retryCount < 1) {
            setTimeout(() => renderLeaderboard(1), 1200);
        } else {
            leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">VIP-список пуст (Зарегистрируйте аккаунт)</td></tr>`;
        }
        return;
    }

    let players = response.players;
    players.sort((a, b) => b.balance - a.balance);
    leaderboardRows.innerHTML = "";

    players.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>#${idx + 1}</td><td>${p.name} ${p.name === user.name ? '<span style="color:#22c55e">(Вы)</span>' : ''}</td><td>${parseInt(p.balance).toLocaleString()} $</td>`;
        leaderboardRows.appendChild(row);
    });
}
cheatConsoleBtn.addEventListener('click', async () => {
    if (isSpinning) return;
    const inputCode = prompt("ВВЕДИТЕ СЕКРЕТНЫЙ VIP-КОД:");
    if (!inputCode) return;
    const cleanCode = inputCode.trim().toLowerCase();

    if (cleanCode === "cashin") {
        user.balance += 5000; await saveSession(); updateInterface();
        alert("Код активирован! Зачислено +5,000 \$");
    } else if (cleanCode === "cashout") {
        user.balance = Math.max(0, user.balance - 500); await saveSession(); updateInterface();
        alert("Код активирован! Списано -500 \$");
    } else if (cleanCode.startsWith("deleteplayer ")) {
        const target = inputCode.substring(13).trim().toUpperCase();
        if (!target) return;
        try {
            await fetch(GOOGLE_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ action: "delete", name: target })
            });
            localStorage.removeItem(`gv_user_${target}`);
            alert(`Игрок ${target} удален.`);
            if (target === user.name) location.reload();
        } catch(e) { alert("Ошибка удаления."); }
    } else { alert("Неверный VIP-код!"); }
});

// --- ВЫВЕРЕННАЯ ПОСАДКА ШАРИКА СТРОГО ПО ЦЕНТРУ КЛЮЧЕВОЙ ЯЧЕЙКИ ---
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

    const duration = 6500; // Общее время крутки
    const startTime = performance.now();

    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 2160; // 6 полных оборотов колеса

    // Рассчитываем финальный угол колеса
    const startWheelAngle = wheelRotation;
    const endWheelAngle = wheelRotation + wheelSpins + (360 - wheelTargetAngle);
    wheelRotation = endWheelAngle;

    wheel.style.transform = `rotate(${wheelRotation}deg)`;
    ball.classList.remove('hidden');

    let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Математическое гашение скорости колеса (Инерция)
        const easeOutQuint = 1 - Math.pow(1 - progress, 5);
        const currentWheelPos = startWheelAngle + (endWheelAngle - startWheelAngle) * easeOutQuint;

        let currentBallPos = 0;
        let currentRadius = 96;

        // Фаза 1: Шарик бешено мчится по внешнему борту (первые 85% времени анимации)
        if (progress < 0.85) {
            const totalBallOrbits = 2520;
            currentBallPos = -(totalBallOrbits * easeOutQuint) + (wheelTargetAngle * progress);
            currentRadius = 96 - (24 * easeOutQuint);

            // Эффект трещотки рулетки
            const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
            if (Math.abs(absoluteRelativeAngle - lastTickAngle) >= sectorDegrees) {
                AudioEngine.playBallTick();
                lastTickAngle = absoluteRelativeAngle;
            }
        }
        // Фаза 2: Мягкий захват и жесткое центрирование шарика строго в середину выпавшего кармана
        else {
            const phase2Progress = (progress - 0.85) / 0.15; // от 0 до 1
            const easePhase2 = 1 - Math.pow(1 - phase2Progress, 2);

            // Чтобы шарик лег строго по центру, его угол должен идеально совпасть с меткой (угол колеса + угол сектора)
            // Добавляем +180 градусов, так как физический маркер находится вверху
            const exactCenterAngle = currentWheelPos + wheelTargetAngle + 180;

            // Плавно притягиваем текущий хаотичный угол шарика к идеальному центру
            const totalBallOrbits = 2520;
            const finalBallAngleAt85 = -(totalBallOrbits * (1 - Math.pow(1 - 0.85, 5))) + (wheelTargetAngle * 0.85);

            currentBallPos = finalBallAngleAt85 + (exactCenterAngle - finalBallAngleAt85) * easePhase2;

            // Докатываем радиус до центральной оси ячеек (65px)
            const radiusAt85 = 96 - (24 * (1 - Math.pow(1 - 0.85, 5)));
            currentRadius = radiusAt85 - ((radiusAt85 - 65) * easePhase2);
        }

        // Отрисовка позиции шарика на холсте телефона
        ball.style.transform = `translate(-50%, -50%) rotate(${currentBallPos}deg) translate(${currentRadius}px) rotate(${-currentBallPos}deg)`;

        if (progress < 1) {
            requestAnimationFrame(animateSimulation);
        } else {
            finishRound(resultSector);
        }
    }
    requestAnimationFrame(animateSimulation);
});

function finishRound(resultSector) {
    let winSum = 0;
    if (bets[resultSector.c] > 0 && (resultSector.c === 'red' || resultSector.c === 'black')) winSum += bets[resultSector.c] * 2;
    if (resultSector.c === 'zero' && bets.zero > 0) winSum += bets.zero * 36;

    user.balance += winSum;
    saveSession();

    if (winSum > 0) AudioEngine.playWinSound();

    // Подсветка поля по типу выпавшего сектора
    const winningFieldElement = document.querySelector(`.spot-${resultSector.c}`);
    if (winningFieldElement) {
        winningFieldElement.classList.add('winning-highlight');
    }

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
