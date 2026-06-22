// shared/js/state.js

// =========================================================================
// CONFIGURAÇÃO DO FIREBASE
// =========================================================================
// ATENÇÃO: Caso seu código utilize chaves específicas abaixo, certifique-se
// de mantê-las ou configurá-las conforme o seu projeto ativo.
const firebaseConfig = {
    // Insira suas chaves do Firebase aqui caso necessário:
    // apiKey: "...",
    // authDomain: "...",
    // databaseURL: "...",
    // projectId: "...",
    // storageBucket: "...",
    // messagingSenderId: "...",
    // appId: "..."
};

// Inicializa o Firebase apenas se ele já não tiver sido inicializado
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

// =========================================================================
// ESTADO INICIAL PADRÃO DO JOGO
// =========================================================================
const DEFAULT_STATE = {
    drawnNumbers: [],
    rounds: [{ name: '1ª RODADA', endIndex: null, status: 'active' }],
    range: { min: 1, max: 75 },
    currentCheckedCartela: null // Armazena os números e o status da conferência em tempo real
};

// =========================================================================
// FUNÇÕES DE PERSISTÊNCIA E SINCRONIZAÇÃO
// =========================================================================

/**
 * Carrega o estado atual do Bingo a partir do LocalStorage.
 * Retorna o estado padrão caso não encontre nenhum registro válido.
 */
function loadState() {
    const local = localStorage.getItem('bingo_state');
    if (local) {
        try {
            return JSON.parse(local);
        } catch (e) {
            console.error("Erro ao ler o estado local do LocalStorage:", e);
        }
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

/**
 * Salva o estado atual localmente e sincroniza o OBJETO INTEIRO com o Firebase,
 * garantindo o espelhamento instantâneo da conferência de cartelas na TV.
 */
function saveState(state) {
    // 1. Salva no LocalStorage do navegador atual
    localStorage.setItem('bingo_state', JSON.stringify(state));

    // Dispara o evento local para atualizar as telas na mesma máquina instantaneamente
    window.dispatchEvent(new Event('local-state-change'));

    // 2. Envia o estado completo e irrestrito para o Firebase Realtime Database
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        firebase.database().ref('bingo_state').set(state)
            .catch(err => console.error("Erro ao sincronizar dados com o Firebase:", err));
    }
}

// =========================================================================
// MÓDULO DE HISTÓRICO - SISTEMA DE DESFAZER (UNDO)
// =========================================================================

/**
 * Salva uma foto do estado anterior no histórico antes de realizar uma nova ação.
 */
function pushHistory(state) {
    const history = loadHistory();
    history.push(JSON.stringify(state));
    localStorage.setItem('bingo_history', JSON.stringify(history));
    window.dispatchEvent(new Event('local-history-change'));
}

/**
 * Recupera a lista de histórico de ações do LocalStorage.
 */
function loadHistory() {
    const h = localStorage.getItem('bingo_history');
    return h ? JSON.parse(h) : [];
}

/**
 * Verifica se existe alguma ação passível de ser desfeita.
 */
function canUndo() {
    return loadHistory().length > 0;
}

/**
 * Retorna o jogo para o estado imediatamente anterior ao último sorteio ou alteração.
 */
function undoLastAction() {
    const history = loadHistory();
    if (history.length === 0) return;

    const previous = JSON.parse(history.pop());
    localStorage.setItem('bingo_history', JSON.stringify(history));

    saveState(previous);
    window.dispatchEvent(new Event('local-history-change'));
}

// =========================================================================
// UTILITÁRIOS DE MANUTENÇÃO DO ESTADO
// =========================================================================

/**
 * Reseta completamente o jogo eliminando históricos e retornando ao padrão inicial.
 */
function resetState() {
    localStorage.removeItem('bingo_history');
    saveState(JSON.parse(JSON.stringify(DEFAULT_STATE)));
}

/**
 * Garante a integridade estrutural do estado ao realizar importações de backup.
 */
function rebuildState(state) {
    if (!state.range) state.range = { min: 1, max: 75 };
    if (!state.currentCheckedCartela) state.currentCheckedCartela = null;
    return state;
}

// =========================================================================
// ESCUTADOR EM TEMPO REAL PARA A TV (FIREBASE -> LOCALSTORAGE)
// =========================================================================
if (typeof firebase !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (firebase.apps.length > 0) {
            // Escuta qualquer mudança remota feita pelo Admin e replica na TV
            firebase.database().ref('bingo_state').on('value', (snapshot) => {
                const remoteState = snapshot.val();
                if (remoteState) {
                    localStorage.setItem('bingo_state', JSON.stringify(remoteState));
                    // Dispara o evento que aciona a função renderTV() no script da TV
                    window.dispatchEvent(new Event('local-state-change'));
                }
            });
        }
    });
}