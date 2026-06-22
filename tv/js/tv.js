// tv/js/tv.js

// Memória local da TV para saber qual foi a última animação reproduzida
let lastAnimatedEvent = null;

function renderTV() {
    const state = loadState();

    const roundTitleEl = document.getElementById('tv-round-title');
    const currentNumberEl = document.getElementById('tv-current-number');
    const currentNumbersGrid = document.getElementById('tv-current-numbers-grid');
    const closedRoundsContainer = document.getElementById('tv-closed-rounds');

    const activeRound = state.rounds.find(r => r.endIndex === null) || state.rounds[state.rounds.length - 1];

    // 1. Update Title
    roundTitleEl.textContent = activeRound.name || 'BINGO';

    // 2. Update Giant Number
    const drawn = state.drawnNumbers;
    const lastNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

    if (lastNumber !== null) {
        currentNumberEl.textContent = lastNumber.toString().padStart(2, '0');
        currentNumberEl.classList.remove('empty');
    } else {
        currentNumberEl.textContent = '--';
        currentNumberEl.classList.add('empty');
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

    // Derive slices
    let startIndex = 0;
    const slices = [];
    closedRounds.forEach(round => {
        const slice = drawn.slice(startIndex, round.endIndex + 1);
        slices.push({
            name: round.name,
            numbers: slice
        });
        startIndex = round.endIndex + 1;
    });

    // Render from newest to oldest
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

    // 5. Handle Overlay (Protegido contra falhas de Relógio/Firebase)
    const overlay = document.getElementById('tv-overlay');
    const uiEvents = state.uiEvents || [];
    const lastEvent = uiEvents[uiEvents.length - 1];

    if (lastEvent && lastEvent.type === 'round_closed') {

        // Se ainda não mostramos essa animação
        if (lastAnimatedEvent !== lastEvent.timestamp) {

            const elapsed = Date.now() - lastEvent.timestamp;

            // Usamos Math.abs() porque o relógio do Admin pode estar "no futuro" em relação à TV.
            // Se o evento aconteceu há menos de 1 minuto, exibe. (Isso evita que o pop-up surja se você der F5 na TV meia hora depois).
            if (Math.abs(elapsed) < 60000) {

                // Grava na memória que já viu esse evento
                lastAnimatedEvent = lastEvent.timestamp;

                document.getElementById('overlay-title').textContent = lastEvent.roundName;
                document.getElementById('overlay-count').textContent = `${lastEvent.count} números sorteados`;

                overlay.classList.add('visible');

                // Esconde cravado em 5 segundos redondos, sem contas matemáticas malucas
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