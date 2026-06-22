// tv/js/tv.js

// Memória local da TV para saber qual foi a última animação reproduzida
let lastAnimatedEvent = null;

function renderTV() {
    const state = loadState();

    const roundTitleEl = document.getElementById('tv-round-title');
    const currentNumberEl = document.getElementById('tv-current-number');
    const currentNumbersGrid = document.getElementById('tv-current-numbers-grid');
    const closedRoundsContainer = document.getElementById('tv-closed-rounds');

    const tvCartelaContainer = document.getElementById('tv-cartela-container');
    const tvCartelaGrid = document.getElementById('tv-cartela-grid');

    const activeRound = state.rounds.find(r => r.endIndex === null) || state.rounds[state.rounds.length - 1];

    // 1. Update Title
    roundTitleEl.textContent = activeRound.name || 'BINGO';

    // 2. Update Giant Number OR Cartela (O PULO DO GATO)
    const drawn = state.drawnNumbers;
    const lastNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

    // Se o Admin estiver no meio de uma conferência de cartela
    if (state.currentCheckedCartela && state.currentCheckedCartela.status === 'display_active') {
        currentNumberEl.style.display = 'none';
        tvCartelaContainer.classList.add('active');

        tvCartelaGrid.innerHTML = '';
        const cartelaNumeros = state.currentCheckedCartela.numeros;

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
                // Pinta de verde na TV se o número tiver sido sorteado
                if (drawn.includes(num)) {
                    cell.classList.add('matched');
                }
            }
            tvCartelaGrid.appendChild(cell);
        });
    } else {
        // Modo Normal: Esconde a Cartela e mostra o Número Gigante
        tvCartelaContainer.classList.remove('active');
        currentNumberEl.style.display = 'block';

        if (lastNumber !== null) {
            currentNumberEl.textContent = lastNumber.toString().padStart(2, '0');
            currentNumberEl.classList.remove('empty');
        } else {
            currentNumberEl.textContent = '--';
            currentNumberEl.classList.add('empty');
        }
    }

    // 3. Update Current Numbers Grid (Main Board)
    currentNumbersGrid.innerHTML = '';
    drawn.forEach(num => {
        const div = document.createElement('div');
        div.className = 'small-number';
        if (num === lastNumber) {
            div.classList.add('highlight');
        }
        div.textContent = num.toString().padStart(2, '0');
        currentNumbersGrid.appendChild(div);
    });

    // 4. Update Closed Rounds
    closedRoundsContainer.innerHTML = '';

    const closedRounds = state.rounds.filter(r => r.endIndex !== null);

    if (closedRounds.length === 0) {
        closedRoundsContainer.innerHTML = '<div style="color: var(--muted-color); font-size: 0.9rem;">Nenhuma rodada anterior</div>';
    }

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

    // 5. Handle Overlay (Pop-up de Vitória)
    const overlay = document.getElementById('tv-overlay');
    const uiEvents = state.uiEvents || [];
    const lastEvent = uiEvents[uiEvents.length - 1];

    if (lastEvent && lastEvent.type === 'round_closed') {
        if (lastAnimatedEvent !== lastEvent.timestamp) {
            const elapsed = Date.now() - lastEvent.timestamp;
            if (Math.abs(elapsed) < 60000) {
                lastAnimatedEvent = lastEvent.timestamp;
                document.getElementById('overlay-title').textContent = lastEvent.roundName;
                document.getElementById('overlay-count').textContent = `${lastEvent.count} números sorteados`;
                overlay.classList.add('visible');

                setTimeout(() => {
                    overlay.classList.remove('visible');
                }, 5000);
            }
        }
    } else {
        overlay.classList.remove('visible');
    }
}

// Initial render
renderTV();

// Listen for cross-tab or local updates
window.addEventListener('storage', (e) => {
    if (e.key === 'bingo_state') renderTV();
});
window.addEventListener('local-state-change', renderTV);