
let boardN = [5, 5, 5, 5, 5, 5, 5]; // Camp Nord (cases 1 à 7)
let boardS = [5, 5, 5, 5, 5, 5, 5]; // Camp Sud (cases 1 à 7)
let currentPlayer = 'S';            // 'S' pour Sud, 'N' pour Nord
let scorN = 0;                      // Score du joueur Nord
let scorS = 0;                      // Score du joueur Sud
let gameOver = false;

// ─── 2. SELECTION DES ELEMENTS DOM ───
const rowNorth = document.getElementById('row-north');
const rowSouth = document.getElementById('row-south');
const statusText = document.getElementById('status');
const overlay = document.getElementById('overlay');

/* ─── 3. INITIALISATION ET ACTIONS ───*/

function initGame() {
    boardN = [5, 5, 5, 5, 5, 5, 5];
    boardS = [5, 5, 5, 5, 5, 5, 5];
    currentPlayer = 'S';
    scorN = 0; 
    scorS = 0;
    gameOver = false;
    
    render();
    updateScoreboard();
    statusText.textContent = "Sud commence. Cliquez sur une case.";
}

// Génère la boucle de distribution circulaire des graines (Semailles)
function getSowingSequence(player, startIdx) {
    const cycle = [];
    if (player === 'N') {
        // Sens de rotation pour le Nord
        for (let i = 6; i >= 0; i--) cycle.push({ p: 'N', i });
        for (let i = 0; i <= 6; i++) cycle.push({ p: 'S', i });
    } else {
        // Sens de rotation pour le Sud
        for (let i = 6; i >= 0; i--) cycle.push({ p: 'S', i });
        for (let i = 0; i <= 6; i++) cycle.push({ p: 'N', i });
    }
    return { cycle, startPos: 6 - startIdx };
}

// Execution d'un coup de jeu
function playMove(player, idx) {
    if (gameOver) return;

    const currentCamp = player === 'N' ? boardN : boardS;
    let seeds = currentCamp[idx];

    if (seeds === 0) return;

    // Règle d'exclusion de la case 7 (Interdit de semer 1 ou 2 graines)
    if (idx === 6 && (seeds === 1 || seeds === 2)) {
        shakeBoard();
        statusText.textContent = "⛔ Interdit de semer 1 ou 2 graines depuis la case 7 !";
        return;
    }

    // On ramasse les graines de la case sélectionnée
    if (player === 'N') boardN[idx] = 0; else boardS[idx] = 0;

    const { cycle, startPos } = getSowingSequence(player, idx);
    let pos = (startPos + 1) % 14;

    // Distribution des graines une par une
    while (seeds > 0) {
        const targetCell = cycle[pos];
        if (targetCell.p === 'N') boardN[targetCell.i]++; else boardS[targetCell.i]++;
        seeds--;
        if (seeds > 0) pos = (pos + 1) % 14;
    }

    // Récolte et Prise (Vérification de la dernière case d'arrivée)
    const lastCell = cycle[pos];
    const opponent = player === 'N' ? 'S' : 'N';

    if (lastCell.p === opponent) {
        const oppBoard = opponent === 'N' ? boardN : boardS;
        const targetVal = oppBoard[lastCell.i];

        // Si la case contient entre 1 et 3 graines après l'ajout, on capture (devient 2 à 4)
        if (targetVal >= 2 && targetVal <= 4) {
            let captured = targetVal;
            oppBoard[lastCell.i] = 0;

            // Attribution des points
            if (player === 'N') scorN += captured; else scorS += captured;
            statusText.textContent = `Bien joué ! Capturé ${captured} graines !`;
        }
    }

    // Alternance de joueur
    currentPlayer = opponent;
    render();
    updateScoreboard();
    checkEndGame();
}

// ─── 4. AFFICHAGE DYNAMIQUE (RENDER) ───
function render() {
    renderRow(rowNorth, boardN, 'N');
    renderRow(rowSouth, boardS, 'S');
    updateActiveUI();
}

function renderRow(rowElement, dataArray, player) {
    rowElement.innerHTML = '';
    // Gestion visuelle de l'inversion des lignes pour le vis-à-vis
    const order = player === 'N' ? [0,1,2,3,4,5,6] : [6,5,4,3,2,1,0];

    order.forEach(idx => {
        const count = dataArray[idx];
        const hole = document.createElement('div');
        hole.className = 'hole';
        
        // Affichage des numéros de cases
        const num = document.createElement('span');
        num.className = 'hole-num';
        num.textContent = idx + 1;
        hole.appendChild(num);

        // Si la case appartient au joueur actif et contient des graines, elle est cliquable
        if (!gameOver && player === currentPlayer && count > 0) {
            hole.classList.add('playable');
            hole.addEventListener('click', () => playMove(player, idx));
        }

        // Ajout des billes/graines visuelles (maximum 9)
        if (count <= 9) {
            for (let s = 0; s < count; s++) {
                const seed = document.createElement('div');
                seed.className = 'seed';
                hole.appendChild(seed);
            }
        } else {
            const txt = document.createElement('span');
            txt.className = 'seed-count';
            txt.textContent = count;
            hole.appendChild(txt);
        }

        rowElement.appendChild(hole);
    });
}

function updateScoreboard() {
    document.getElementById('north-count').innerHTML = `${scorN} <span>graines</span>`;
    document.getElementById('south-count').innerHTML = `${scorS} <span>graines</span>`;
}

function updateActiveUI() {
    document.getElementById('score-north').classList.toggle('active', currentPlayer === 'N');
    document.getElementById('score-south').classList.toggle('active', currentPlayer === 'S');
}

function shakeBoard() {
    const board = document.querySelector('.board-wrap');
    board.classList.add('shake');
    board.addEventListener('animationend', () => board.classList.remove('shake'), { once: true });
}

// Vérifie si les conditions de fin de partie sont réunies
function checkEndGame() {
    if (scorN >= 40 || scorS >= 40) {
        gameOver = true;
        document.getElementById('final-north').textContent = scorN;
        document.getElementById('final-south').textContent = scorS;
        document.getElementById('modal-title').textContent = "Partie Terminée !";
        document.getElementById('modal-msg').textContent = scorN >= 30 ? "Le Joueur Nord Gagne !" : "Le Joueur Sud Gagne !";
        overlay.classList.add('show');
    }
}

// ─── 5. ECOUTEURS D'EVENEMENTS (LISTENERS) ───
document.getElementById('btn-new-game').addEventListener('click', initGame);
document.getElementById('btn-replay').addEventListener('click', () => {
    overlay.classList.remove('show');
    initGame();
});
document.getElementById('btn-rules').addEventListener('click', () => {
    const details = document.querySelector('details.rules-toggle');
    details.open = !details.open;
});

// Lancement automatique du jeu au chargement du fichier
initGame();
 