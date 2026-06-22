// state.js
const defaultState = {
    drawnNumbers: [],
    rounds: [
        { name: '', endIndex: null, status: 'active' }
    ],
    range: { min: 1, max: 75 },
    auditLog: [],
    checkingCard: null // <-- NOVO: Guarda a cartela que está sendo auditada
};

function loadState() {
    const local = localStorage.getItem('bingo_state');
    if (local) {
        return JSON.parse(local);
    }
    return JSON.parse(JSON.stringify(defaultState));
}

function saveState(state) {
    localStorage.setItem('bingo_state', JSON.stringify(state));
    window.dispatchEvent(new Event('local-state-change'));

    if (window.BINGO_MODE === 'admin' && typeof DB_REF !== 'undefined') {
        // Envia apenas o necessário para o Firebase para evitar loop e instabilidade
        DB_REF.update({
            drawnNumbers: state.drawnNumbers,
            rounds: state.rounds,
            range: state.range,
            checkingCard: state.checkingCard || null // <-- NOVO: TV precisa saber disso
        }).catch(err => console.error("Erro ao salvar no Firebase:", err));
    }
}

function pushHistory(state) {
    const hist = localStorage.getItem('bingo_history');
    let h = hist ? JSON.parse(hist) : [];
    h.push(JSON.parse(JSON.stringify(state)));
    if (h.length > 50) h.shift();
    localStorage.setItem('bingo_history', JSON.stringify(h));
    window.dispatchEvent(new Event('local-history-change'));
}

function canUndo() {
    const hist = localStorage.getItem('bingo_history');
    return hist && JSON.parse(hist).length > 0;
}

function undoLastAction() {
    const hist = localStorage.getItem('bingo_history');
    if (!hist) return;
    let h = JSON.parse(hist);
    if (h.length > 0) {
        const prevState = h.pop();
        localStorage.setItem('bingo_history', JSON.stringify(h));
        saveState(prevState);
    }
}

function resetState() {
    localStorage.removeItem('bingo_history');
    saveState(JSON.parse(JSON.stringify(defaultState)));
}

function rebuildState(newState) {
    localStorage.removeItem('bingo_history');
    saveState(newState);
}