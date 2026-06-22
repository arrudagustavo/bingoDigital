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

            if (document.activeElement !== roundNameInput) roundNameInput.value = activeRound.name;
            if (document.activeElement !== inputRangeMin) inputRangeMin.value = state.range.min;
            if (document.activeElement !== inputRangeMax) inputRangeMax.value = state.range.max;

            const drawn = state.drawnNumbers;
            const lastNumber = drawn.length > 0 ? drawn[drawn.length - 1] : null;

            lastNumberEl.textContent = lastNumber !== null ? lastNumber.toString().padStart(2, '0') : '--';
            countEl.textContent = `${drawn.length} sorteados no total`;

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
                        if (isNaN(novo) || novo < state.range.min || novo > state.range.max) return showAlert('Número inválido fora do intervalo.');
                        if (st.drawnNumbers.includes(novo)) return showAlert('Este número já foi sorteado no jogo!');

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
                        const res = await showPrompt('Renomear Rodada', `Digite o novo nome para "${st.rounds[rIndex].name}":`, st.rounds[rIndex].name);
                        if (res.action === 'ok' && res.value && res.value.trim() !== '' && res.value !== st.rounds[rIndex].name) {
                            pushHistory(st);
                            st.rounds[rIndex].name = res.value.trim().toUpperCase();
                            saveState(st);
                        }
                    });
                });

                closedRoundsEl.querySelectorAll('.btn-reopen-round').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const rIndex = parseInt(e.target.getAttribute('data-index'));
                        const st = loadState();
                        const confirmRes = await showConfirm('ATENÇÃO', `Reabrir a rodada "${st.rounds[rIndex].name}"?\nTodas as rodadas que vieram depois dela serão APAGADAS e esta voltará a ser a rodada ativa da TV.`);
                        if (confirmRes.action === 'confirm') {
                            pushHistory(st);
                            st.rounds.splice(rIndex + 1);
                            st.rounds[rIndex].endIndex = null;
                            st.rounds[rIndex].status = 'active';
                            saveState(st);
                        }
                    });
                });
            }

            btnDraw.disabled = drawn.length >= (state.range.max - state.range.min + 1);
            btnUndo.disabled = !canUndo();
        }

        renderUI();

        window.addEventListener('storage', (e) => { if (e.key === 'bingo_state' || e.key === 'bingo_history') renderUI(); });
        window.addEventListener('local-state-change', renderUI);
        window.addEventListener('local-history-change', renderUI);

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
            const available = [];
            for (let i = state.range.min; i <= state.range.max; i++) {
                if (!state.drawnNumbers.includes(i)) available.push(i);
            }
            if (available.length === 0) return showAlert('Todos os números já foram sorteados nesta série!');

            pushHistory(state);
            state.drawnNumbers.push(available[Math.floor(Math.random() * available.length)]);
            saveState(state);
        });

        btnDrawManual.addEventListener('click', async () => {
            const val = inputManual.value;
            if (!val) return;
            const num = parseInt(val, 10);
            const state = loadState();
            if (isNaN(num) || num < state.range.min || num > state.range.max) return await showAlert('Número inválido fora do intervalo.');
            if (state.drawnNumbers.includes(num)) return await showAlert('Este número já foi sorteado no jogo!');

            pushHistory(state);
            state.drawnNumbers.push(num);
            saveState(state);
            inputManual.value = '';
        });

        inputManual.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnDrawManual.click(); });
        btnUndo.addEventListener('click', () => { if (canUndo()) undoLastAction(); });

        btnCloseRound.addEventListener('click', async () => {
            const state = loadState();
            const activeRound = state.rounds.find(r => r.endIndex === null);
            const lastClosedRound = [...state.rounds].reverse().find(r => r.endIndex !== null && r !== activeRound);
            const startIndex = lastClosedRound ? lastClosedRound.endIndex + 1 : 0;

            if (state.drawnNumbers.length === startIndex) return await showAlert('Não há novos números sorteados para fechar nesta rodada.');

            pushHistory(state);
            activeRound.endIndex = state.drawnNumbers.length - 1;
            activeRound.status = 'finished';
            state.rounds.push({ name: '', endIndex: null, status: 'active' });
            saveState(state);
            roundNameInput.focus();
            roundNameInput.select();
        });

        btnNewSeries.addEventListener('click', async () => {
            const res = await showConfirm('ATENÇÃO', 'Isso irá zerar TODOS os números sorteados e histórico de rodadas. Deseja iniciar uma NOVA SÉRIE?');
            if (res.action === 'confirm') resetState();
        });

        btnExport.addEventListener('click', () => {
            const state = loadState();
            const payload = JSON.stringify({ ...state, exportTimestamp: Date.now(), schemaVersion: '1.0' }, null, 2);
            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bingo-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)}.json`;
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
                        rebuildState(data);
                        saveState(data);
                        await showAlert("Backup importado com sucesso!");
                    }
                } catch (err) { await showAlert("Erro ao importar: Arquivo inválido ou corrompido."); }
                e.target.value = '';
            };
            reader.readAsText(file);
        });

        btnSaveRange.addEventListener('click', async () => {
            const min = parseInt(inputRangeMin.value, 10);
            const max = parseInt(inputRangeMax.value, 10);
            if (isNaN(min) || isNaN(max) || min >= max || min < 1) return await showAlert("Range inválido. O mínimo deve ser menor que o máximo e maior que 0.");

            const state = loadState();
            pushHistory(state);
            state.range = { min, max };
            saveState(state);
            await showAlert(`Range atualizado: sorteio de ${min} até ${max}.`);
        });

        // =========================================================================
        // MÓDULO INJETADO: CÂMERA E OCR (O FATIADOR COM MAPA DE COORDENADAS GPS)
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
                            autoCropArea: 1,
                            responsive: true,
                            restore: true,
                            ready: function () { this.cropper.zoomTo(1); }
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

            btnProcessCrop.addEventListener('click', () => {
                if (!cropperInstance) return;

                const croppedCanvas = cropperInstance.getCroppedCanvas({ width: 1000, height: 1000 });

                // O FATIADOR
                const cleanCanvas = document.createElement('canvas');
                cleanCanvas.width = 1200;  // 5x5 de células (cada uma ocupa 240x240 na tela nova)
                cleanCanvas.height = 1200;
                const cleanCtx = cleanCanvas.getContext('2d');

                cleanCtx.fillStyle = '#FFFFFF';
                cleanCtx.fillRect(0, 0, 1200, 1200);

                const cellW = 1000 / 5; // 200px na foto original
                const cellH = 1000 / 5;

                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (row === 2 && col === 2) continue; // Pula o meio (FREE)

                        // CORREÇÃO: Cortamos 10% da borda em vez de 20%, protegendo o seu número 5!
                        const padX = cellW * 0.10;
                        const padY = cellH * 0.10;
                        const srcX = (col * cellW) + padX;
                        const srcY = (row * cellH) + padY;
                        const sWidth = cellW * 0.80; // 80% do miolo
                        const sHeight = cellH * 0.80;

                        // Colamos os miolos na lousa digital.
                        // Cada bloco mora num quadrado invisível de 240x240.
                        const destX = (col * 240) + 60;
                        const destY = (row * 240) + 60;
                        const dWidth = 120;
                        const dHeight = 120;

                        cleanCtx.drawImage(croppedCanvas, srcX, srcY, sWidth, sHeight, destX, destY, dWidth, dHeight);
                    }
                }

                // Filtro para tirar a sombra rosa e deixar a tinta preta
                const imgData = cleanCtx.getImageData(0, 0, 1200, 1200);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    let gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
                    gray = ((gray - 128) * 1.5) + 128;
                    if (gray < 0) gray = 0;
                    if (gray > 255) gray = 255;
                    data[i] = data[i + 1] = data[i + 2] = gray;
                }
                cleanCtx.putImageData(imgData, 0, 0);

                cleanCanvas.toBlob((blob) => {
                    modalCrop.classList.remove('visible');
                    cropperInstance.destroy();

                    modalReview.classList.add('visible');
                    document.getElementById('ocr-loading-status').style.display = 'block';
                    document.getElementById('ocr-inputs-container').innerHTML = '';

                    runTesseractOCR(blob);
                }, 'image/png');
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
                state.currentCheckedCartela = { numeros: cartelaNumeros, timestamp: Date.now(), status: 'display_active' };
                saveState(state);

                modalReview.classList.remove('visible');
                fileInput.value = '';
                await showAlert('Cartela enviada com sucesso para a TV!');
            });
        }

        async function runTesseractOCR(imageBlob) {
            const objectURL = URL.createObjectURL(imageBlob);

            try {
                const worker = await Tesseract.createWorker({ logger: m => console.log(m) });

                await worker.loadLanguage('eng');
                await worker.initialize('eng');

                await worker.setParameters({ tessedit_pageseg_mode: '6' });

                // A IA DEVOLVE O TEXTO E A POSIÇÃO (Bounding Box) DO TEXTO NA TELA!
                const { data } = await worker.recognize(objectURL);
                await worker.terminate();

                // Montamos a grade de inputs zerada, livre da dança das cadeiras!
                let matrixGrid = Array(5).fill(null).map(() => Array(5).fill(0));
                matrixGrid[2][2] = 99; // FREE

                // Percorremos cada "palavra" que a IA encontrou na imagem
                data.words.forEach(word => {
                    // Tradutor flexível (removi o B->8 porque estava transformando seu 5 em 8)
                    let cleaned = word.text.toUpperCase()
                        .replace(/[OQDo]/g, '0')
                        .replace(/[Il\|!i]/g, '1')
                        .replace(/[Zz]/g, '2')
                        .replace(/[A]/g, '4')
                        .replace(/[Ss]/g, '5')
                        .replace(/[Gg]/g, '6')
                        .replace(/[Tt]/g, '7');

                    const numMatch = cleaned.match(/\b([1-9]|[1-6][0-9]|7[0-5])\b/);

                    if (numMatch) {
                        const num = parseInt(numMatch[0], 10);

                        // Pegamos o centro exato de onde esse número estava desenhado
                        const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
                        const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

                        // A nossa matemática perfeita revela a qual linha e coluna esse pixel pertence
                        const col = Math.floor(centerX / 240);
                        const row = Math.floor(centerY / 240);

                        if (row >= 0 && row < 5 && col >= 0 && col < 5 && !(row === 2 && col === 2)) {
                            // Validação extra de segurança: só insere se o número bater com a regra daquela coluna BINGO
                            const minVal = col * 15 + 1;
                            const maxVal = col * 15 + 15;
                            if (num >= minVal && num <= maxVal) {
                                matrixGrid[row][col] = num;
                            }
                        }
                    }
                });

                // Agora só passamos a matriz exata pra tela desenhar os inputs
                generateOcrInputGrid(matrixGrid);

            } catch (err) {
                console.error("Erro no Worker OCR:", err);
                // Matriz limpa em caso de falha severa
                generateOcrInputGrid(Array(5).fill(null).map(() => Array(5).fill(0)));
            } finally {
                document.getElementById('ocr-loading-status').style.display = 'none';
            }
        }

        // A função de tela agora é passiva: só desenha o que o Tesseract mapeou pelo GPS
        function generateOcrInputGrid(gridMatrix) {
            const container = document.getElementById('ocr-inputs-container');
            container.innerHTML = '';

            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const input = document.createElement('input');
                    input.type = "number";
                    input.className = "ocr-input-cell";
                    input.pattern = "[0-9]*";
                    input.inputMode = "numeric";

                    const val = gridMatrix[row][col];

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

        setupOCREvents();
    });
}