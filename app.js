// --- ВЫДЕЛЕННАЯ СТАБИЛЬНАЯ МИРОВАЯ БАЗА ДАННЫХ (JSONBIN МГНОВЕННЫЙ ДОСТУП) ---
// Этот выделенный контейнер работает на выделенных серверах без ошибок CORS.
const BIN_ID = "66ffd3eeacd3cb34a88f5726";
const CLOUD_URL = `https://jsonbin.io{BIN_ID}`;
// Открытый бесплатный ключ доступа к чтению/записи
const MASTER_KEY = "\$2a\$10\$R3vB.xQv3/B5zB2117hE8uS3O5C1V8Lp/dI0q.u8bJ9K3y1h5A7G.";

// Сохранение всей базы игроков в облако
async function saveToCloud(allPlayersData) {
    try {
        await fetch(CLOUD_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': MASTER_KEY
            },
            body: JSON.stringify({ players: allPlayersData })
        });
    } catch (e) { console.error("Ошибка сохранения в облако:", e); }
}

// Получение списка всех игроков мира
async function fetchAllPlayers() {
    try {
        const response = await fetch(CLOUD_URL, {
            headers: { 'X-Master-Key': MASTER_KEY }
        });
        if (!response.ok) return {};
        const resData = await response.json();
        return resData.record.players || {};
    } catch (e) {
        console.error("Ошибка чтения из облака:", e);
        return {};
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
        osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + duration + 0.01);
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
    authErrorMsg.textContent = "СИНХРОНИЗАЦИЯ С СЕРВЕРОМ...";

    const allPlayers = await fetchAllPlayers();

    if (allPlayers && allPlayers[name]) {
        if (allPlayers[name].password === password) {
            user = allPlayers[name];
            authErrorMsg.textContent = "";
            enterCasino();
        } else {
            authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ ДЛЯ ЭТОГО VIP-НИКА";
            loginBtn.disabled = false;
        }
    } else {
        // Регистрируем нового игрока
        user = { name: name, password: password, balance: 1000 };
        allPlayers[name] = user;
        await saveToCloud(allPlayers);
        localStorage.setItem(`gv_user_${user.name}`, JSON.stringify(user));
        enterCasino();
    }
});

function enterCasino() {
    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
}

async function saveSession() {
    localStorage.setItem(`gv_user_${user.name}`, JSON.stringify(user));
    const allPlayers = await fetchAllPlayers();
    if (allPlayers) {
        allPlayers[user.name] = user;
        await saveToCloud(allPlayers);
    }
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

async function renderLeaderboard() {
    const cloudData = await fetchAllPlayers();

    if (!cloudData || Object.keys(cloudData).length === 0) {
        leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">VIP-список пуст</td></tr>`;
        return;
    }

    let players = Object.values(cloudData);
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

        const allPlayers = await fetchAllPlayers();
        if (allPlayers && allPlayers[target]) {
            delete allPlayers[target];
            await saveToCloud(allPlayers);
            localStorage.removeItem(`gv_user_${target}`);
            alert(`Игрок ${target} успешно удален.`);
            if (target === user.name) location.reload();
        } else { alert("Игрок не найден."); }
    } else { alert("Неверный VIP-код!"); }
});

// --- ИСПРАВЛЕННАЯ ГЛАДКАЯ КИНЕМАТИКА: КАТУЧИЙ ШАРИК БЕЗ УСКОРЕНИЙ ---
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

    const duration = 6500;
    const startTime = performance.now();

    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 2160;

    const startWheelAngle = wheelRotation;
    const endWheelAngle = wheelRotation + wheelSpins + (360 - wheelTargetAngle);
    wheelRotation = endWheelAngle;

    wheel.style.transform = `rotate(${wheelRotation}deg)`;
    ball.classList.remove('hidden');

    let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Гашение скорости 5-й степени (Идентично для колеса и звуков)
        const easeOutQuint = 1 - Math.pow(1 - progress, 5);
        const currentWheelPos = startWheelAngle + (endWheelAngle - startWheelAngle) * easeOutQuint;

        let currentBallPos = 0;
        let currentRadius = 96;

        // Линейно затухающая орбита шарика без микрорывков
        if (progress < 0.82) {
            const totalBallOrbits = 2520;
            currentBallPos = -(totalBallOrbits * easeOutQuint) + (wheelTargetAngle * progress);
            currentRadius = 96 - (24 * easeOutQuint);

            const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
            if (Math.abs(absoluteRelativeAngle - lastTickAngle) >= sectorDegrees) {
                AudioEngine.playBallTick();
                lastTickAngle = absoluteRelativeAngle;
            }
        }
        // Плавное докатывание шарика в центр выбранного кармана без изменения скорости кручения
        else {
            const phase2Progress = (progress - 0.82) / 0.18;
            const easePhase2 = 1 - Math.pow(1 - phase2Progress, 3); // Плавная параболическая посадка

            const exactCenterAngle = currentWheelPos + wheelTargetAngle + 180;
            const totalBallOrbits = 2520;
            const finalBallAngleAt82 = -(totalBallOrbits * (1 - Math.pow(1 - 0.82, 5))) + (wheelTargetAngle * 0.82);

            // Интерполируем угол: шарик больше не ускоряется, а аккуратно съезжает в паз
            currentBallPos = finalBallAngleAt82 + (exactCenterAngle - finalBallAngleAt82) * easePhase2;

            const radiusAt82 = 96 - (24 * (1 - Math.pow(1 - 0.82, 5)));
            currentRadius = radiusAt82 - ((radiusAt82 - 65) * easePhase2);
        }

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
