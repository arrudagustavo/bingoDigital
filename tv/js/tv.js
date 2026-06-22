// tv.js

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

    // 5. Handle Overlay
    const overlay = document.getElementById('tv-overlay');
    const uiEvents = state.uiEvents || [];
    const lastEvent = uiEvents[uiEvents.length - 1];

    if (lastEvent && lastEvent.type === 'round_closed') {
        const elapsed = Date.now() - lastEvent.timestamp;
        if (elapsed < 3000) {
            document.getElementById('overlay-title').textContent = lastEvent.roundName;
            document.getElementById('overlay-count').textContent = `${lastEvent.count} números sorteados`;
            overlay.classList.add('visible');

            // Auto hide after the 3000ms window expires
            setTimeout(() => {
                overlay.classList.remove('visible');
            }, 3000 - elapsed);
        } else {
            overlay.classList.remove('visible');
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