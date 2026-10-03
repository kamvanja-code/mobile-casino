window.user = { name: "", password: "", balance: 1000 };
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
        let startDeg = index * sectorDegrees; let endDeg = (index + 1) * sectorDegrees;
        let color = sector.c === 'zero' ? '#116936' : (sector.c === 'red' ? '#bd1c1c' : '#1a1a1a');
        gradientParts.push(color + ' ' + startDeg + 'deg ' + endDeg + 'deg');
    });
    wheel.style.background = 'conic-gradient(' + gradientParts.join(', ') + ')';
}
renderWheelSectors();

loginBtn.addEventListener('click', () => {
    window.AudioEngine.init();
    const name = usernameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const password = passwordInput.value.trim();
    if (!name || !password) { authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ"; return; }

    if (window.globalPlayersDatabase[name]) {
        if (window.globalPlayersDatabase[name].password === password) { window.user = window.globalPlayersDatabase[name]; enterCasino(); }
        else { authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ"; }
    } else {
        window.user = { name: name, password: password, balance: 1000 };
        window.globalPlayersDatabase[name] = window.user; window.sendBalanceUpdate(); enterCasino();
    }
});
function enterCasino() { updateInterface(); authScreen.classList.remove('active'); setTimeout(() => gameScreen.classList.add('active'), 400); }
function updateInterface() {
    userNameDisplay.textContent = window.user.name; userBalanceDisplay.textContent = window.user.balance.toLocaleString();
    ['red', 'black', 'zero'].forEach(type => {
        const holder = document.getElementById('chip-space-' + type);
        if (bets[type] > 0) { holder.textContent = bets[type]; holder.classList.remove('hidden'); } else { holder.classList.add('hidden'); }
    });
}
document.querySelectorAll('.casino-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (isSpinning) return; window.AudioEngine.playChipSound();
        document.querySelectorAll('.casino-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active'); currentSelectedChip = parseInt(e.target.dataset.value);
    });
});
document.querySelectorAll('.bet-spot').forEach(spot => {
    spot.addEventListener('click', () => {
        if (isSpinning) return; const target = spot.dataset.target;
        if (window.user.balance >= currentSelectedChip) {
            window.AudioEngine.playChipSound(); window.user.balance -= currentSelectedChip; bets[target] += currentSelectedChip; updateInterface(); statusMessage.textContent = "СТАВКА ПРИНЯТА";
        } else { statusMessage.textContent = "НЕДОСТАТОЧНО СРЕДСТВ"; }
    });
});
clearBtn.addEventListener('click', () => {
    if (isSpinning) return; window.AudioEngine.playChipSound(); window.user.balance += (bets.red + bets.black + bets.zero); bets = { red: 0, black: 0, zero: 0 }; updateInterface(); statusMessage.textContent = "СТАВКИ СБРОШЕНЫ";
});
globalLeaderboardBtn.addEventListener('click', () => { window.AudioEngine.init(); leaderboardModal.classList.add('active'); renderLeaderboard(); });
closeLeaderboardBtn.addEventListener('click', () => { leaderboardModal.classList.remove('active'); });

function renderLeaderboard() {
    let players = Object.values(window.globalPlayersDatabase); players.sort((a, b) => b.balance - a.balance); leaderboardRows.innerHTML = "";
    if (players.length === 0) { leaderboardRows.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">VIP-список пуст</td></tr>'; return; }
    players.forEach((p, idx) => {
        const row = document.createElement('tr'); row.innerHTML = '<td>#' + (idx + 1) + '</td><td>' + p.name + (p.name === window.user.name ? ' <span style="color:#22c55e">(Вы)</span>' : '') + '</td><td>' + parseInt(p.balance).toLocaleString() + ' $</td>'; leaderboardRows.appendChild(row);
    });
}
cheatConsoleBtn.addEventListener('click', () => {
    if (isSpinning) return; const inputCode = prompt("ВВЕДИТЕ СЕКРЕТНЫЙ VIP-КОД:"); if (!inputCode) return; const cleanCode = inputCode.trim().toLowerCase();
    if (cleanCode === "cashin") { window.user.balance += 5000; window.sendBalanceUpdate(); updateInterface(); alert("Зачислено +5,000 $"); }
    else if (cleanCode === "cashout") { window.user.balance = Math.max(0, window.user.balance - 500); window.sendBalanceUpdate(); updateInterface(); alert("Списано -500 $"); }
    else if (cleanCode.startsWith("deleteplayer ")) {
        const target = inputCode.substring(13).trim().toUpperCase(); if (!target) return;
        pubnub.publish({ channel: "grand_velvet_network_v3", message: { action: "delete_user", name: target } }); alert('Запрос на удаление игрока ' + target + ' отправлен.');
    } else { alert("Неверный VIP-код!"); }
});

let wheelRotation = 0;
spinBtn.addEventListener('click', () => {
    if (isSpinning) return; const activeBet = bets.red + bets.black + bets.zero; if (activeBet === 0) { statusMessage.textContent = "СДЕЛАЙТЕ СТАВКУ НА СУКНО"; return; }
    isSpinning = true; toggleControls(true); document.querySelectorAll('.bet-spot').forEach(spot => spot.classList.remove('winning-highlight')); statusMessage.textContent = "СТАВКИ СДЕЛАНЫ. КОЛЕСО ЗАПУЩЕНО";
    const winningIndex = Math.floor(Math.random() * 37); const resultSector = rouletteNumbers[winningIndex]; const duration = 6500; const startTime = performance.now();
    const wheelTargetAngle = winningIndex * sectorDegrees; const wheelSpins = 2160; const startWheelAngle = wheelRotation; const endWheelAngle = wheelRotation + wheelSpins + (360 - wheelTargetAngle); wheelRotation = endWheelAngle;
    wheel.style.transform = 'rotate(' + wheelRotation + 'deg)'; ball.classList.remove('hidden'); let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime; const progress = Math.min(elapsed / duration, 1); const easeOutQuint = 1 - Math.pow(1 - progress, 5); const currentWheelPos = startWheelAngle + (endWheelAngle - startWheelAngle) * easeOutQuint;
        const ballExtraOrbits = 1080; const currentBallExtra = ballExtraOrbits * Math.pow(1 - progress, 2.5); const currentBallPos = ((currentWheelPos % 360) + wheelTargetAngle + 180) - currentBallExtra; const currentRadius = 96 - (31 * easeOutQuint);
        ball.style.transform = 'translate(-50%, -50%) rotate(' + currentBallPos + 'deg) translate(' + currentRadius + 'px) rotate(' + (-currentBallPos) + 'deg)';
        const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
        if (absoluteRelativeAngle - lastTickAngle >= sectorDegrees) { if (progress < 0.85) window.AudioEngine.playBallTick(); lastTickAngle = absoluteRelativeAngle; }
        if (progress < 1) { requestAnimationFrame(animateSimulation); } else { finishRound(resultSector); }
    }
    requestAnimationFrame(animateSimulation);
});
function finishRound(resultSector) {
    let winSum = 0; if (bets[resultSector.c] > 0 && (resultSector.c === 'red' || resultSector.c === 'black')) winSum += bets[resultSector.c] * 2; if (resultSector.c === 'zero' && bets.zero > 0) winSum += bets.zero * 36;
    window.user.balance += winSum; window.sendBalanceUpdate(); if (winSum > 0) window.AudioEngine.playWinSound();
    const winningFieldElement = document.querySelector('.spot-' + resultSector.c); if (winningFieldElement) winningFieldElement.classList.add('winning-highlight');
    const colorText = resultSector.c === 'red' ? 'КРАСНОЕ' : (resultSector.c === 'black' ? 'ЧЕРНОЕ' : 'ЗЕРО');
    if (winSum > 0) { statusMessage.innerHTML = 'ВЫПАЛО: <span style="color:#ffd700">' + resultSector.n + ' (' + colorText + ')</span>. ВЫИГРЫШ: <span style="color:#22c55e">+$' + winSum + '</span>!'; }
    else { statusMessage.innerHTML = 'ВЫПАЛО: <span style="color:#ffffff">' + resultSector.n + ' (' + colorText + ')</span>. СТАВКА ПРОИГРАЛА.'; }
    setTimeout(() => { isSpinning = false; toggleControls(false); bets = { red: 0, black: 0, zero: 0 }; updateInterface(); statusMessage.textContent = "СДЕЛАЙТЕ ВАШИ СТАВКИ"; }, 3000);
}
function toggleControls(disabled) { spinBtn.disabled = disabled; clearBtn.disabled = disabled; cheatConsoleBtn.disabled = disabled; }
