// shared/js/state.js
// Um estado global simples baseado em um único JSON (Single Source of Truth)

// MÁGICA ANTI-DUPLICIDADE: Impede que o Firebase tente se conectar duas vezes
if (!window.__FIREBASE_INIT__) {
    window.__FIREBASE_INIT__ = true;

    const firebaseConfig = {
        apiKey: "AIzaSyBX7pu3-vFTzQdwqYE5O3Bf5SksJakvfr0",
        authDomain: "bingodigital-b182b.firebaseapp.com",
        databaseURL: "https://bingodigital-b182b-default-rtdb.firebaseio.com",
        projectId: "bingodigital-b182b",
        storageBucket: "bingodigital-b182b.firebasestorage.app",
        messagingSenderId: "958614312677",
        appId: "1:958614312677:web:789350c66eda097e3da60c"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

const db = firebase.database();
const SESSION_ID = 'FESTA_JUNINA_2026';
const DB_REF = db.ref('sessions/' + SESSION_ID);

const STORAGE_KEY = 'bingo_state';
const HISTORY_KEY = 'bingo_history';

const defaultState = {
    range: { min: 1, max: 75 },
    drawnNumbers: [],
    rounds: [
        {
            name: '',
            endIndex: null,
            status: 'active'
        }
    ],
    auditLog: [],
    uiEvents: []
};

// VACINA CONTRA O FIREBASE: Garante que os dados nunca venham quebrados
function sanitizeState(state) {
    if (!state) return JSON.parse(JSON.stringify(defaultState));

    // Garante que drawnNumbers é sempre um Array (Firebase às vezes converte em objeto)
    let safeDrawnNumbers = [];
    if (Array.isArray(state.drawnNumbers)) {
        safeDrawnNumbers = state.drawnNumbers;
    } else if (state.drawnNumbers && typeof state.drawnNumbers === 'object') {
        safeDrawnNumbers = Object.values(state.drawnNumbers);
    }

    const safeState = {
        range: state.range || { min: 1, max: 75 },
        drawnNumbers: safeDrawnNumbers,
        auditLog: state.auditLog || [],
        uiEvents: state.uiEvents || [],
        rounds: state.rounds || []
    };

    if (safeState.rounds.length === 0) {
        safeState.rounds.push({ name: '', endIndex: null, status: 'active' });
    } else {
        safeState.rounds = safeState.rounds.map(r => ({
            ...r,
            name: r.name || '',
            endIndex: r.endIndex === undefined ? null : r.endIndex,
            status: r.status || 'active'
        }));
    }

    return safeState;
}

function loadState() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? sanitizeState(JSON.parse(data)) : JSON.parse(JSON.stringify(defaultState));
}

function saveState(state) {
    const safeState = sanitizeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
    window.dispatchEvent(new Event('local-state-change'));

    DB_REF.set(safeState).catch(e => console.error("Erro Firebase:", e));
}

// Ouve o Firebase apenas UMA vez
if (!window.__FIREBASE_LISTENER__) {
    window.__FIREBASE_LISTENER__ = true;
    DB_REF.on('value', (snapshot) => {
        const cloudState = snapshot.val();
        if (cloudState) {
            const safeCloudState = sanitizeState(cloudState);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(safeCloudState));
            window.dispatchEvent(new Event('local-state-change'));
            window.dispatchEvent(new Event('storage'));
        }
    });
}

function pushHistory(state) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push(JSON.parse(JSON.stringify(state)));
    if (history.length > 50) history.shift();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event('local-history-change'));
}

function undoLastAction() {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length === 0) return false;

    const previousState = history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    saveState(previousState);

    window.dispatchEvent(new Event('local-history-change'));
    return true;
}

function canUndo() {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return history.length > 0;
}

// MÁGICA AQUI: O reset agora preserva as configurações de Min/Máx
function resetState() {
    // 1. Pega o estado atual para salvar as configurações
    const currentState = loadState();
    const savedRange = currentState.range || { min: 1, max: 75 };

    // 2. Cria um estado zeradinho
    const newState = JSON.parse(JSON.stringify(defaultState));

    // 3. Devolve a sua configuração de Min/Máx salva
    newState.range = savedRange;

    // 4. Salva o novo estado
    localStorage.setItem(HISTORY_KEY, '[]');
    saveState(newState);
    window.dispatchEvent(new Event('local-history-change'));
}

function rebuildState(state) {
    const totalNumbers = state.drawnNumbers ? state.drawnNumbers.length : 0;
    if (state.rounds) {
        state.rounds.forEach(r => {
            if (r.endIndex !== null && r.endIndex >= totalNumbers) {
                r.endIndex = totalNumbers - 1 < 0 ? null : totalNumbers - 1;
            }
        });

        const activeRounds = state.rounds.filter(r => r.endIndex === null);
        if (activeRounds.length === 0 && state.rounds.length > 0) {
            state.rounds.push({ name: '', endIndex: null, status: 'active' });
        } else if (activeRounds.length > 1) {
            for (let i = 0; i < state.rounds.length - 1; i++) {
                if (state.rounds[i].endIndex === null) {
                    state.rounds[i].endIndex = totalNumbers - 1;
                }
            }
        }
    }
    return state;
}