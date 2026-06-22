// tv/js/tv.js

let lastAnimatedEvent = null;

function renderTV() {
    const state = loadState();

    // Travas de segurança: Se o estado não carregou direito, aborta para não quebrar a tela
    if (!state || !state.drawnNumbers || !state.rounds) return;

    const roundTitleEl = document.getElementById('tv-round-title');
    const currentNumberEl = document.getElementById('tv-current-number');
    const currentNumbersGrid = document.getElementById('tv-current-numbers-grid');
    const closedRoundsContainer = document.getElementById('tv-closed-rounds');

    const tvCartelaContainer = document.getElementById('tv-cartela-container');
    const tvCartelaGrid = document.getElementById('tv-cartela-grid');

    // Pega a rodada ativa com segurança
    const activeRound = state.rounds.find(r => r.endIndex === null) || state.rounds[state.rounds.length - 1] || { name: 'BINGO' };
    if (roundTitleEl) roundTitleEl.textContent = activeRound.name || 'BINGO';

    const drawn = state.drawnNumbers;
    const lastNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

    // ==========================================
    // O PULO DO GATO: CONFERÊNCIA DA CARTELA
    // ==========================================
    if (state.currentCheckedCartela && state.currentCheckedCartela.status === 'display_active') {

        if (currentNumberEl) currentNumberEl.style.display = 'none';
        if (tvCartelaContainer) {
            tvCartelaContainer.classList.add('active');
            tvCartelaContainer.style.display = 'flex'; // Força a exibição
        }

        if (tvCartelaGrid) {
            tvCartelaGrid.innerHTML = '';
            const cartelaNumeros = state.currentCheckedCartela.numeros || [];

            cartelaNumeros.forEach((num, index) => {
                const cell = document.createElement('div');
                cell.className = 'cartela-match-cell';

                if (index === 12 && num === 0) { // O Quadrado FREE do meio
                    cell.classList.add('free');
                    cell.innerHTML = '<span style="font-size: 1rem;">FREE</span>';
                } else if (num === 0) {
                    cell.textContent = '';
                } else {
                    cell.textContent = num;
                    if (drawn.includes(num)) {
                        cell.classList.add('matched');
                    }
                }
                tvCartelaGrid.appendChild(cell);
            });
        }
    } else {
        // MODO NORMAL: MOSTRA NÚMERO
        if (tvCartelaContainer) {
            tvCartelaContainer.classList.remove('active');
            tvCartelaContainer.style.display = 'none'; // Esconde a cartela
        }

        if (currentNumberEl) {
            currentNumberEl.style.display = 'block';
            if (lastNumber !== null) {
                currentNumberEl.textContent = lastNumber.toString().padStart(2, '0');
                currentNumberEl.classList.remove('empty');
            } else {
                currentNumberEl.textContent = '--';
                currentNumberEl.classList.add('empty');
            }
        }
    }

    // ==========================================
    // GRADE DE NÚMEROS E RODADAS
    // ==========================================
    if (currentNumbersGrid) {
        currentNumbersGrid.innerHTML = '';
        drawn.forEach(num => {
            const div = document.createElement('div');
            div.className = 'small-number';
            if (num === lastNumber) div.classList.add('highlight');
            div.textContent = num.toString().padStart(2, '0');
            currentNumbersGrid.appendChild(div);
        });
    }

    if (closedRoundsContainer) {
        closedRoundsContainer.innerHTML = '';
        const closedRounds = state.rounds.filter(r => r.endIndex !== null);

        if (closedRounds.length === 0) {
            closedRoundsContainer.innerHTML = '<div style="color: var(--muted-color); font-size: 0.9rem;">Nenhuma rodada anterior</div>';
        } else {
            let startIndex = 0;
            const slices = [];
            closedRounds.forEach(round => {
                const slice = drawn.slice(startIndex, round.endIndex + 1);
                slices.push({ name: round.name, numbers: slice });
                startIndex = round.endIndex + 1;
            });

            slices.reverse().forEach(slice => {
                const div = document.createElement('div');
                div.className = 'closed-round';

                let numbersText = '';
                if (slice.numbers.length > 0) {
                    const numStrList = slice.numbers.map(n => n.toString().padStart(2, '0'));
                    numbersText = numStrList.join(' • ');
                }

                div.innerHTML = `
                    <div class="closed-round-header">
                        <span class="closed-round-title">✓ ${slice.name}</span>
                        <span class="closed-round-count">${slice.numbers.length} números</span>
                    </div>
                    <div class="closed-round-numbers">${numbersText}</div>
                `;
                closedRoundsContainer.appendChild(div);
            });
        }
    }
}

// Rodar na abertura
renderTV();

// Escutadores de Sincronia
window.addEventListener('storage', (e) => {
    if (e.key === 'bingo_state') renderTV();
});
window.addEventListener('local-state-change', renderTV);