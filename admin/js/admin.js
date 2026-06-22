// admin.js

// MÁGICA ANTI-DUPLICIDADE: Garante que os cliques não rodem dobrado
if (!window.__ADMIN_JS_LOADED__) {
    window.__ADMIN_JS_LOADED__ = true;

    document.addEventListener('DOMContentLoaded', () => {
        // DOM Elements
        const roundNameInput = document.getElementById('admin-round-name');
        const lastNumberEl = document.getElementById('admin-last-number');
        const countEl = document.getElementById('admin-count');
        const historyGrid = document.getElementById('admin-history');
        const closedRoundsEl = document.getElementById('admin-closed-rounds');

        const btnDraw = document.getElementById('btn-draw');
        const btnDrawManual = document.getElementById('btn-draw-manual');
        const inputManual = document.getElementById('input-manual');
        const btnUndo = document.getElementById('btn-undo');
        const btnCloseRound = document.getElementById('btn-close-round');
        const btnNewSeries = document.getElementById('btn-new-series');
        const btnExport = document.getElementById('btn-export');
        const inputImport = document.getElementById('input-import');
        const inputRangeMin = document.getElementById('input-range-min');
        const inputRangeMax = document.getElementById('input-range-max');
        const btnSaveRange = document.getElementById('btn-save-range');

        // Modal System
        const modalOverlay = document.getElementById('custom-modal-overlay');
        const modalContainer = document.getElementById('modal-content-container');

        function showModal(html) {
            return new Promise((resolve) => {
                modalContainer.innerHTML = html;
                modalOverlay.classList.add('visible');

                const btns = modalContainer.querySelectorAll('[data-action]');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const action = btn.getAttribute('data-action');
                        let value = null;
                        const input = modalContainer.querySelector('input');
                        if (input) value = input.value;

                        modalOverlay.classList.remove('visible');
                        resolve({ action, value });
                    });
                });
            });
        }

        // Modais Reestilizadas com UX aprimorada
        function showAlert(message) {
            return showModal(`
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">Aviso</h3>
                <p style="margin-bottom: 1.5rem; color: var(--muted-color); font-size: 0.95rem;">${message}</p>
                <div class="modal-buttons" style="display: flex; justify-content: flex-end;">
                    <button class="btn" data-action="ok" style="padding: 0.6rem 1.5rem; font-size: 0.9rem; background-color: var(--primary-color); color: white; border: none;">OK</button>
                </div>
            `);
        }

        function showConfirm(title, message) {
            return showModal(`
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${title}</h3>
                <p style="margin-bottom: 1.5rem; color: var(--muted-color); font-size: 0.95rem;">${message}</p>
                <div class="modal-buttons" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn" data-action="cancel" style="padding: 0.6rem 1rem; font-size: 0.9rem;">Cancelar</button>
                    <button class="btn btn-danger" data-action="confirm" style="padding: 0.6rem 1rem; font-size: 0.9rem;">Confirmar</button>
                </div>
            `);
        }

        function showPrompt(title, message, defaultValue = '') {
            return showModal(`
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${title}</h3>
                <p style="margin-bottom: 1rem; color: var(--muted-color); font-size: 0.95rem;">${message}</p>
                <div style="margin-bottom: 1.5rem;">
                    <input type="text" class="form-control" value="${defaultValue}" autocomplete="off" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--bg-color); color: var(--text-color); font-size: 1.1rem; outline: none;">
                </div>
                <div class="modal-buttons" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn" data-action="cancel" style="padding: 0.6rem 1rem; font-size: 0.9rem;">Cancelar</button>
                    <button class="btn" data-action="ok" style="padding: 0.6rem 1rem; font-size: 0.9rem; background-color: var(--primary-color); color: white; border: none;">Salvar</button>
                </div>
            `);
        }

        // Render Logic
        function renderUI() {
            const state = loadState();
            const activeRound = state.rounds.find(r => r.endIndex === null) || state.rounds[state.rounds.length - 1];

            if (document.activeElement !== roundNameInput) {
                roundNameInput.value = activeRound.name;
            }

            if (document.activeElement !== inputRangeMin) inputRangeMin.value = state.range.min;
            if (document.activeElement !== inputRangeMax) inputRangeMax.value = state.range.max;

            const drawn = state.drawnNumbers;
            const lastNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

            if (lastNumber !== null) {
                lastNumberEl.textContent = lastNumber.toString().padStart(2, '0');
            } else {
                lastNumberEl.textContent = '--';
            }

            countEl.textContent = `${drawn.length} sorteados no total`;

            // Render History Chips
            historyGrid.innerHTML = '';
            drawn.forEach((num, index) => {
                const chip = document.createElement('div');
                chip.className = 'history-chip';
                chip.textContent = num.toString().padStart(2, '0');
                chip.title = `Clique para editar o ${index + 1}º número sorteado`;

                chip.addEventListener('click', async () => {
                    const result = await showModal(`
                        <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">Número ${num} <span style="font-size: 0.9rem; color: var(--muted-color); font-weight: normal;">(Sorteio #${index + 1})</span></h3>
                        <p style="margin-bottom: 1rem; color: var(--muted-color); font-size: 0.95rem;">O que deseja fazer com este número?</p>
                        
                        <div style="background-color: var(--bg-color); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.85rem; color: var(--muted-color); margin-bottom: 0.5rem;">Substituir por um novo número:</label>
                            <input type="number" class="form-control" placeholder="Ex: 42" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background-color: var(--panel-bg); color: var(--text-color); font-size: 1.1rem; outline: none; text-align: center;">
                        </div>

                        <div class="modal-buttons" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
                            <button class="btn" data-action="cancel" style="padding: 0.75rem 0.5rem; font-size: 0.9rem;">Cancelar</button>
                            <button class="btn btn-danger" data-action="delete" style="padding: 0.75rem 0.5rem; font-size: 0.9rem;">Apagar</button>
                            <button class="btn" data-action="replace" style="padding: 0.75rem 0.5rem; font-size: 0.9rem; background-color: var(--primary-color); color: white; border: none;">Substituir</button>
                        </div>
                    `);

                    if (result.action === 'replace') {
                        if (!result.value) return;
                        const novo = parseInt(result.value, 10);
                        if (isNaN(novo) || novo < state.range.min || novo > state.range.max) {
                            showAlert('Número inválido fora do intervalo.');
                            return;
                        }

                        const st = loadState();
                        if (st.drawnNumbers.includes(novo)) {
                            showAlert('Este número já foi sorteado no jogo!');
                            return;
                        }

                        const confirmRes = await showConfirm('Confirmação', `Confirma a troca de ${num} por ${novo}?`);
                        if (confirmRes.action === 'confirm') {
                            pushHistory(st);
                            st.auditLog.push({ action: 'edit_number', old: num, new: novo, index, timestamp: Date.now() });
                            st.drawnNumbers[index] = novo;
                            saveState(st);
                        }
                    } else if (result.action === 'delete') {
                        const confirmRes = await showConfirm('Atenção', `Deseja apagar definitivamente o número ${num}? Isso reindexará todo o histórico da TV.`);
                        if (confirmRes.action === 'confirm') {
                            const st = loadState();
                            pushHistory(st);
                            st.auditLog.push({ action: 'delete_number', number: num, index, timestamp: Date.now() });
                            st.drawnNumbers.splice(index, 1);
                            rebuildState(st);
                            saveState(st);
                        }
                    }
                });

                historyGrid.appendChild(chip);
            });

            // Rodadas Fechadas
            const closedRounds = state.rounds.filter(r => r.endIndex !== null);
            if (closedRounds.length === 0) {
                closedRoundsEl.innerHTML = '<div style="color: var(--muted-color); font-size: 0.9rem;">Nenhuma rodada fechada</div>';
            } else {
                closedRoundsEl.innerHTML = '';
                [...closedRounds].reverse().forEach((r) => {
                    const rIndex = state.rounds.indexOf(r);

                    const prevRound = state.rounds[rIndex - 1];
                    const startIndex = prevRound && prevRound.endIndex !== null ? prevRound.endIndex + 1 : 0;
                    const totalInRound = Math.max(0, r.endIndex - startIndex + 1);

                    const div = document.createElement('div');
                    div.className = 'closed-round-item';
                    div.innerHTML = `
                        <div><strong>${r.name}</strong> <span style="color:var(--muted-color); font-size:0.85rem;">(${totalInRound} Nº.)</span></div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-edit-round" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" data-index="${rIndex}">Editar</button>
                            <button class="btn btn-reopen-round" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" data-index="${rIndex}">Reabrir</button>
                        </div>
                    `;
                    closedRoundsEl.appendChild(div);
                });

                closedRoundsEl.querySelectorAll('.btn-edit-round').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const rIndex = parseInt(e.target.getAttribute('data-index'));
                        const st = loadState();
                        const roundName = st.rounds[rIndex].name;

                        const res = await showPrompt('Renomear Rodada', `Digite o novo nome para "${roundName}":`, roundName);
                        if (res.action === 'ok' && res.value && res.value.trim() !== '' && res.value !== roundName) {
                            pushHistory(st);
                            const novoNome = res.value.trim().toUpperCase();
                            st.auditLog.push({ action: 'rename_round', old: roundName, new: novoNome, roundIndex: rIndex, timestamp: Date.now() });
                            st.rounds[rIndex].name = novoNome;
                            saveState(st);
                        }
                    });
                });

                closedRoundsEl.querySelectorAll('.btn-reopen-round').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const rIndex = parseInt(e.target.getAttribute('data-index'));
                        const st = loadState();
                        const roundName = st.rounds[rIndex].name;

                        const confirmRes = await showConfirm('ATENÇÃO', `Reabrir a rodada "${roundName}"?\nTodas as rodadas que vieram depois dela serão APAGADAS e esta voltará a ser a rodada ativa da TV.`);
                        if (confirmRes.action === 'confirm') {
                            pushHistory(st);
                            st.auditLog.push({ action: 'reopen_round', roundIndex: rIndex, roundName, timestamp: Date.now() });
                            st.rounds.splice(rIndex + 1);
                            st.rounds[rIndex].endIndex = null;
                            st.rounds[rIndex].status = 'active';
                            saveState(st);
                        }
                    });
                });
            }

            const maxDraws = state.range.max - state.range.min + 1;
            btnDraw.disabled = drawn.length >= maxDraws;
            btnUndo.disabled = !canUndo();
        }

        renderUI();

        window.addEventListener('storage', (e) => {
            if (e.key === 'bingo_state' || e.key === 'bingo_history') renderUI();
        });
        window.addEventListener('local-state-change', renderUI);
        window.addEventListener('local-history-change', renderUI);

        // Event Handlers
        roundNameInput.addEventListener('change', (e) => {
            const state = loadState();
            const activeRound = state.rounds.find(r => r.endIndex === null);
            if (activeRound && activeRound.name !== e.target.value.trim().toUpperCase()) {
                pushHistory(state);
                activeRound.name = e.target.value.trim().toUpperCase();
                saveState(state);
            }
        });

        btnDraw.addEventListener('click', () => {
            const state = loadState();
            const { min, max } = state.range;
            const drawn = state.drawnNumbers;

            const available = [];
            for (let i = min; i <= max; i++) {
                if (!drawn.includes(i)) available.push(i);
            }

            if (available.length === 0) {
                showAlert('Todos os números já foram sorteados nesta série!');
                return;
            }

            pushHistory(state);
            const randomIndex = Math.floor(Math.random() * available.length);
            const num = available[randomIndex];

            state.drawnNumbers.push(num);
            saveState(state);
        });

        // Inserção Manual
        btnDrawManual.addEventListener('click', async () => {
            const val = inputManual.value;
            if (!val) return;
            const num = parseInt(val, 10);

            const state = loadState();
            if (isNaN(num) || num < state.range.min || num > state.range.max) {
                await showAlert('Número inválido fora do intervalo.');
                return;
            }

            if (state.drawnNumbers.includes(num)) {
                await showAlert('Este número já foi sorteado no jogo!');
                return;
            }

            pushHistory(state);
            state.drawnNumbers.push(num);
            saveState(state);
            inputManual.value = '';
        });

        inputManual.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnDrawManual.click();
        });

        btnUndo.addEventListener('click', async () => {
            if (!canUndo()) return;
            undoLastAction();
        });

        btnCloseRound.addEventListener('click', async () => {
            const state = loadState();
            const activeRound = state.rounds.find(r => r.endIndex === null);

            const lastClosedRound = [...state.rounds].reverse().find(r => r.endIndex !== null && r !== activeRound);
            const startIndex = lastClosedRound ? lastClosedRound.endIndex + 1 : 0;

            if (state.drawnNumbers.length === startIndex) {
                await showAlert('Não há novos números sorteados para fechar nesta rodada.');
                return;
            }

            pushHistory(state);

            activeRound.endIndex = state.drawnNumbers.length - 1;
            activeRound.status = 'finished';

            const totalInRound = activeRound.endIndex - startIndex + 1;
            state.uiEvents.push({
                type: 'round_closed',
                roundName: activeRound.name,
                count: totalInRound,
                timestamp: Date.now()
            });

            state.rounds.push({
                name: '',
                endIndex: null,
                status: 'active'
            });

            saveState(state);

            roundNameInput.focus();
            roundNameInput.select();
        });

        btnNewSeries.addEventListener('click', async () => {
            const res = await showConfirm('ATENÇÃO', 'Isso irá zerar TODOS os números sorteados e histórico de rodadas. Deseja iniciar uma NOVA SÉRIE?');
            if (res.action === 'confirm') {
                resetState();
            }
        });

        btnExport.addEventListener('click', () => {
            const state = loadState();
            const payload = JSON.stringify({
                ...state,
                exportTimestamp: Date.now(),
                schemaVersion: '1.0'
            }, null, 2);

            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
            a.download = `bingo-backup-${dateStr}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        inputImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.drawnNumbers || !data.rounds) throw new Error("Formato inválido");

                    const res = await showConfirm('Atenção', 'Importar backup substituirá todo o jogo atual. Continuar?');
                    if (res.action === 'confirm') {
                        pushHistory(loadState());

                        delete data.exportTimestamp;
                        delete data.schemaVersion;

                        rebuildState(data);
                        saveState(data);
                        await showAlert("Backup importado com sucesso!");
                    }
                } catch (err) {
                    await showAlert("Erro ao importar: Arquivo inválido ou corrompido.");
                }
                e.target.value = ''; // reset input
            };
            reader.readAsText(file);
        });

        btnSaveRange.addEventListener('click', async () => {
            const min = parseInt(inputRangeMin.value, 10);
            const max = parseInt(inputRangeMax.value, 10);

            if (isNaN(min) || isNaN(max) || min >= max || min < 1) {
                await showAlert("Range inválido. O mínimo deve ser menor que o máximo e maior que 0.");
                return;
            }

            const state = loadState();
            pushHistory(state);
            state.range = { min, max };
            state.auditLog.push({ action: 'change_range', min, max, timestamp: Date.now() });
            saveState(state);
            await showAlert(`Range atualizado: sorteio de ${min} até ${max}. A grade da TV foi reajustada.`);
        });


        // =========================================================================
        // MÓDULO INJETADO: CÂMERA E OCR (COM FILTRO PRETO E BRANCO E TRADUTOR)
        // =========================================================================

        let cropperInstance = null;

        function setupOCREvents() {
            const triggerBtn = document.getElementById('btn-trigger-ocr');
            const fileInput = document.getElementById('ocr-file-input');

            const modalCrop = document.getElementById('modal-ocr-crop');
            const cropContainer = document.querySelector('.crop-container');
            const btnCancelCrop = document.getElementById('btn-cancel-crop');
            const btnProcessCrop = document.getElementById('btn-process-crop');

            const modalReview = document.getElementById('modal-ocr-review');
            const btnCancelReview = document.getElementById('btn-cancel-review');
            const btnSubmitTv = document.getElementById('btn-submit-tv');

            if (!triggerBtn) return;

            triggerBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const imageUrl = URL.createObjectURL(file);

                cropContainer.innerHTML = '';

                const newImg = document.createElement('img');
                newImg.id = 'ocr-crop-image';
                newImg.style.display = 'block';
                newImg.style.maxWidth = '100%';

                cropContainer.style.display = 'block';
                cropContainer.style.width = '100%';
                cropContainer.style.height = '350px';

                cropContainer.appendChild(newImg);
                modalCrop.classList.add('visible');

                newImg.onload = () => {
                    setTimeout(() => {
                        if (cropperInstance) cropperInstance.destroy();

                        cropperInstance = new Cropper(newImg, {
                            aspectRatio: 1,
                            viewMode: 1,
                            dragMode: 'move',
                            autoCropArea: 0.9,
                            responsive: true,
                            restore: true,
                            ready: function () {
                                this.cropper.zoomTo(1);
                            }
                        });
                    }, 100);
                };

                newImg.src = imageUrl;
            });

            btnCancelCrop.addEventListener('click', () => {
                modalCrop.classList.remove('visible');
                if (cropperInstance) cropperInstance.destroy();
                fileInput.value = '';
            });

            // NOVA LÓGICA: FILTRO MATADOR DE FUNDO ROSA
            btnProcessCrop.addEventListener('click', () => {
                if (!cropperInstance) return;

                const canvas = cropperInstance.getCroppedCanvas({ width: 600, height: 600 });
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // Varrida pixel por pixel: Força a imagem a ficar Preto Puro ou Branco Puro
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Cálculo de luminosidade
                    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

                    // Se for menor que 130 (é tinta preta), pinta de PRETO. Se for maior (fundo rosa), pinta de BRANCO.
                    const color = luminance < 130 ? 0 : 255;

                    data[i] = data[i + 1] = data[i + 2] = color;
                }
                ctx.putImageData(imgData, 0, 0);

                canvas.toBlob((blob) => {
                    modalCrop.classList.remove('visible');
                    cropperInstance.destroy();

                    modalReview.classList.add('visible');
                    document.getElementById('ocr-loading-status').style.display = 'block';
                    document.getElementById('ocr-inputs-container').innerHTML = '';

                    runTesseractOCR(blob);
                }, 'image/jpeg', 0.9);
            });

            btnCancelReview.addEventListener('click', () => {
                modalReview.classList.remove('visible');
                fileInput.value = '';
            });

            btnSubmitTv.addEventListener('click', async () => {
                const inputs = document.querySelectorAll('.ocr-input-cell');
                const cartelaNumeros = [];

                inputs.forEach(input => {
                    const val = parseInt(input.value, 10);
                    cartelaNumeros.push(isNaN(val) ? 0 : val);
                });

                const state = loadState();
                state.currentCheckedCartela = {
                    numeros: cartelaNumeros,
                    timestamp: Date.now(),
                    status: 'display_active'
                };

                saveState(state);
                modalReview.classList.remove('visible');
                fileInput.value = '';

                await showAlert('Cartela enviada com sucesso para a TV!');
            });
        }

        function runTesseractOCR(imageBlob) {
            const objectURL = URL.createObjectURL(imageBlob);

            Tesseract.recognize(
                objectURL,
                'eng', // MUDANÇA 1: Mudamos de Português para Inglês (foco melhor em números)
                { logger: m => console.log(m) }
            ).then(({ data: { text } }) => {

                // MUDANÇA 2: O TRADUTOR DE CONFUSÕES (Limpa os erros comuns de letras vs números)
                let cleanText = text.toUpperCase();
                cleanText = cleanText.replace(/[L|I|\|]/g, '1'); // L, I ou barra reta viram o número 1
                cleanText = cleanText.replace(/O/g, '0');        // Letra O vira Zero
                cleanText = cleanText.replace(/Z/g, '2');        // Letra Z vira 2
                cleanText = cleanText.replace(/S/g, '5');        // Letra S vira 5
                cleanText = cleanText.replace(/B/g, '8');        // Letra B vira 8
                cleanText = cleanText.replace(/A/g, '4');        // Letra A vira 4

                const regexNumbers = /\b([1-9]|[1-6][0-9]|7[0-5])\b/g;
                let foundNumbers = cleanText.match(regexNumbers) || [];
                foundNumbers = [...new Set(foundNumbers.map(n => parseInt(n, 10)))];

                generateOcrInputGrid(foundNumbers);
            }).catch(err => {
                generateOcrInputGrid([]);
            }).finally(() => {
                document.getElementById('ocr-loading-status').style.display = 'none';
            });
        }

        function generateOcrInputGrid(extractedNumbers) {
            const container = document.getElementById('ocr-inputs-container');
            container.innerHTML = '';

            const colRanges = [
                { min: 1, max: 15 },   // B
                { min: 16, max: 30 },  // I
                { min: 31, max: 45 },  // N
                { min: 46, max: 60 },  // G
                { min: 61, max: 75 }   // O
            ];

            let grid = Array(5).fill(null).map(() => Array(5).fill(0));

            colRanges.forEach((range, colIndex) => {
                const validForColumn = extractedNumbers.filter(n => n >= range.min && n <= range.max);

                for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
                    if (colIndex === 2 && rowIndex === 2) {
                        grid[rowIndex][colIndex] = 99;
                        continue;
                    }
                    if (validForColumn[rowIndex]) {
                        grid[rowIndex][colIndex] = validForColumn[rowIndex];
                    }
                }
            });

            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const input = document.createElement('input');
                    input.type = "number";
                    input.className = "ocr-input-cell";
                    input.pattern = "[0-9]*";
                    input.inputMode = "numeric";

                    const val = grid[row][col];

                    if (val === 99) {
                        input.value = "0";
                        input.disabled = true;
                        input.style.backgroundColor = "var(--primary-dark)";
                        input.style.color = "#fff";
                        input.style.opacity = "0.7";
                    } else if (val > 0) {
                        input.value = val;
                    } else {
                        input.value = "";
                    }

                    container.appendChild(input);
                }
            }
        }

        // Ativa os cliques e eventos da Câmera isoladamente
        setupOCREvents();
        // FIM DO MÓDULO DE OCR
    });
}