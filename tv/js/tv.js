// tv/js/tv.js
let lastAnimatedEvent = null;

function renderTV() {
    const state = loadState();

    const roundTitleEl = document.getElementById('tv-round-title');
    const currentNumberEl = document.getElementById('tv-current-number');
    const reviewCardEl = document.getElementById('tv-review-card');
    const currentNumbersGrid = document.getElementById('tv-current-numbers-grid');
    const closedRoundsContainer = document.getElementById('tv-closed-rounds');

    const activeRound = state.rounds.find(r => r.endIndex === null) || state.rounds[state.rounds.length - 1];

    // 1. TÍTULO
    roundTitleEl.textContent = activeRound.name || 'BINGO';

    // 2. LÓGICA DA TELA ESQUERDA (Número Grandão vs Cartela)
    const drawn = state.drawnNumbers || [];
    const lastNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;
    const isChecking = state.checkingCard && state.checkingCard.length === 25;

    if (isChecking) {
        currentNumberEl.style.display = 'none';
        reviewCardEl.classList.add('visible');
        reviewCardEl.innerHTML = '';

        state.checkingCard.forEach((num, index) => {
            const cell = document.createElement('div');
            cell.className = 'tv-card-cell';

            // O 0 do meio vira espaço livre verde (ou exibe 0 se preferir)
            if (index === 12 || num === 0) {
                cell.textContent = '0';
                cell.classList.add('matched');
            } else {
                cell.textContent = num;
                if (drawn.includes(num)) {
                    cell.classList.add('matched');
                }
            }
            reviewCardEl.appendChild(cell);
        });
    } else {
        reviewCardEl.classList.remove('visible');
        currentNumberEl.style.display = '';

        if (lastNumber !== null) {
            currentNumberEl.textContent = lastNumber.toString().padStart(2, '0');
            currentNumberEl.classList.remove('empty');
        } else {
            currentNumberEl.textContent = '--';
            currentNumberEl.classList.add('empty');
        }
    }

    // 3. LADO DIREITO: NÚMEROS SORTEADOS
    currentNumbersGrid.innerHTML = '';
    drawn.forEach(num => {
        const div = document.createElement('div');
        div.className = 'small-number';

        if (isChecking) {
            // Modo Auditoria: destaca os números da cartela na lista
            if (state.checkingCard.includes(num)) {
                div.classList.add('card-matched');
            }
        } else {
            // Modo Normal: destaca o último
            if (num === lastNumber) {
                div.classList.add('highlight');
            }
        }

        div.textContent = num.toString().padStart(2, '0');
        currentNumbersGrid.appendChild(div);
    });

    // 4. LADO DIREITO: RODADAS ANTERIORES
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

    // 5. OVERLAY ANIMAÇÃO
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
                setTimeout(() => { overlay.classList.remove('visible'); }, 5000);
            }
        }
    } else {
        overlay.classList.remove('visible');
    }
}

// Inicializa TV e reata a conexão correta
renderTV();
window.addEventListener('storage', (e) => { if (e.key === 'bingo_state') renderTV(); });
window.addEventListener('local-state-change', renderTV);