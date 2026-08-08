/**
 * Mamma UI Manager
 */
import { store } from './store.js';
import { MammaAI } from './ai.js';
import { APP_VERSION, RELEASE_NOTES } from './version.js';

const UI = {
    currentView: 'daily',
    currentDate: new Date().toISOString().split('T')[0],

    init() {
        this.mainContent = document.getElementById('main-content');
        this.headerTitle = document.getElementById('header-title');
        this.headerAction = document.getElementById('header-action');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        
        this.setupNavigation();
        this.setupSidebarEvents();
        this.renderView(this.currentView);
        this.checkVersionUpdateNotice();
    },

    setupSidebarEvents() {
        // Toggle mobile drawer
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
                this.sidebarOverlay.classList.toggle('open');
            });
        }

        // Click overlay to close drawer
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => {
                this.sidebar.classList.remove('open');
                this.sidebarOverlay.classList.remove('open');
            });
        }

        // Version & release notes button in sidebar footer
        const versionBtn = document.getElementById('version-btn');
        if (versionBtn) {
            versionBtn.addEventListener('click', () => {
                this.showReleaseNotesModal(true);
                if (this.sidebar) this.sidebar.classList.remove('open');
                if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('open');
            });
        }

        // Accordion for Mamma menu group
        const mammaHeader = document.getElementById('mamma-group-header');
        const mammaSubItems = document.getElementById('mamma-sub-items');
        if (mammaHeader && mammaSubItems) {
            mammaHeader.addEventListener('click', (e) => {
                mammaHeader.classList.toggle('collapsed');
            });
        }
    },

    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const btn = e.target.closest('.menu-item');
                menuItems.forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentView = btn.dataset.view;
                this.renderView(this.currentView);
                
                // Keep the group header high-lighted if navigating within mamma
                const mammaHeader = document.getElementById('mamma-group-header');
                if (btn.closest('#mamma-sub-items')) {
                    if (mammaHeader) mammaHeader.classList.add('active');
                } else {
                    if (mammaHeader) mammaHeader.classList.remove('active');
                }

                // Close mobile sidebar
                if (this.sidebar) {
                    this.sidebar.classList.remove('open');
                }
                if (this.sidebarOverlay) {
                    this.sidebarOverlay.classList.remove('open');
                }
            });
        });

        this.headerAction.addEventListener('click', () => {
            if (this.currentView === 'recipe') {
                this.showRecipeModal();
            } else if (this.currentView === 'daily') {
                this.showSyncModal();
            } else if (this.currentView === 'fishing') {
                this.showFishingLogModal();
            } else if (this.currentView === 'dining') {
                this.showDiningEntryModal();
            }
        });
    },

    renderView(view) {
        this.mainContent.innerHTML = '';
        this.headerAction.style.display = 'none';

        switch (view) {
            case 'daily':
                this.headerTitle.textContent = 'Mamma - 식단 기록';
                this.headerAction.style.display = 'flex';
                this.headerAction.innerHTML = '<span class="material-icons-round">sync</span>';
                this.renderDailyView();
                break;
            case 'recipe':
                this.headerTitle.textContent = '레시피 & 식재료';
                this.headerAction.style.display = 'flex';
                this.headerAction.innerHTML = '<span class="material-icons-round">add</span>';
                this.renderRecipeView();
                break;
            case 'stats':
                this.headerTitle.textContent = '통계 & AI';
                this.renderStatsView();
                break;
            case 'shopping':
                this.headerTitle.textContent = '장보기';
                this.renderShoppingView();
                break;
            case 'dining':
                this.headerTitle.textContent = '미니다이닝';
                this.headerAction.style.display = 'flex';
                this.headerAction.innerHTML = '<span class="material-icons-round">add</span>';
                this.renderDiningView();
                break;
            case 'cart':
                this.headerTitle.textContent = '쇼핑카트';
                this.renderCartView();
                break;
            case 'fishing':
                this.headerTitle.textContent = '낚시기록';
                this.headerAction.style.display = 'flex';
                this.headerAction.innerHTML = '<span class="material-icons-round">add</span>';
                this.renderFishingView();
                break;
        }
    },

    // ==========================================
    // Daily View
    // ==========================================
    renderDailyView() {
        const log = store.getLogForDate(this.currentDate);
        
        let html = `
            <div class="date-selector">
                <button class="icon-btn" onclick="UI.changeDate(-1)"><span class="material-icons-round">chevron_left</span></button>
                <div style="position:relative;">
                    <h2 id="date-display" style="cursor:pointer;">${this.currentDate} <span class="material-icons-round" style="font-size:16px; vertical-align:middle;">arrow_drop_down</span></h2>
                    <input type="date" id="date-picker-overlay" value="${this.currentDate}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; padding:0; margin:0; border:none;">
                </div>
                <button class="icon-btn" onclick="UI.changeDate(1)"><span class="material-icons-round">chevron_right</span></button>
            </div>
            
            ${this.buildMealSection('아침', 'breakfast', log.breakfast)}
            ${this.buildMealSection('점심', 'lunch', log.lunch)}
            ${this.buildMealSection('저녁', 'dinner', log.dinner)}
        `;
        
        this.mainContent.innerHTML = html;
        this.addMealListeners();

        // Date Picker Listener
        document.getElementById('date-picker-overlay').addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.renderDailyView();
        });
    },

    changeDate(offset) {
        const d = new Date(this.currentDate);
        d.setDate(d.getDate() + offset);
        this.currentDate = d.toISOString().split('T')[0];
        this.renderDailyView();
    },

    buildMealSection(title, type, recipeIds) {
        let itemsHtml = '';
        let totalCost = 0;
        
        if (recipeIds.length === 0) {
            itemsHtml = `<div style="color: var(--text-secondary); padding: 10px; text-align: center;">기록된 메뉴가 없습니다.</div>`;
        } else {
            recipeIds.forEach((id, index) => {
                const recipe = store.getRecipe(id);
                if (recipe) {
                    totalCost += recipe.totalCost || 0;
                    const costDisplay = recipe.hasUndecidedCost ? `₩${(recipe.totalCost||0).toLocaleString()} (단가 미정 포함)` : `₩${(recipe.totalCost||0).toLocaleString()}`;
                    const costColor = recipe.hasUndecidedCost ? `color: #ff9800;` : `color: var(--text-secondary);`;
                    
                    itemsHtml += `
                        <div class="menu-item-tag">
                            <div class="menu-item-info">
                                <strong>${recipe.name}</strong>
                                <span style="${costColor}">${recipe.category} • ${costDisplay}</span>
                            </div>
                            <button class="icon-btn menu-item-delete" data-type="${type}" data-id="${id}" data-index="${index}">
                                <span class="material-icons-round">remove_circle_outline</span>
                            </button>
                        </div>
                    `;
                }
            });
        }

        return `
            <div class="meal-section card">
                <div class="meal-header">
                    <h3>${title}</h3>
                    <span>합계: ₩${totalCost.toLocaleString()}</span>
                </div>
                <div class="meal-items">${itemsHtml}</div>
                <button class="secondary-btn add-meal-btn" data-type="${type}" style="margin-top: 12px;">+ 메뉴 추가</button>
            </div>
        `;
    },

    addMealListeners() {
        this.mainContent.querySelectorAll('.add-meal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showAddMealModal(e.target.dataset.type);
            });
        });

        this.mainContent.querySelectorAll('.menu-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const t = e.target.closest('button');
                store.removeMealFromLog(this.currentDate, t.dataset.type, t.dataset.id, t.dataset.index);
                this.renderDailyView();
            });
        });
    },

    showAddMealModal(mealType) {
        const recipes = store.getRecipes();
        const mealNames = { breakfast: '아침', lunch: '점심', dinner: '저녁' };
        
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;">${mealNames[mealType]} 메뉴 추가</h3>
                <button class="primary-btn" style="width:auto; padding:8px 16px; font-size:13px;" onclick="UI.showRecipeModal(null, '${mealType}')">+ 새 메뉴 등록</button>
            </div>
            <p style="color:var(--text-secondary); margin-bottom: 20px; font-size:14px;">저장된 레시피 목록에서 선택하세요.</p>
            <div style="max-height: 400px; overflow-y: auto;">
        `;
        
        if (recipes.length === 0) {
            html += `<p style="text-align:center;">저장된 메뉴가 없습니다.<br>새 메뉴를 등록해주세요.</p>`;
        } else {
            recipes.forEach(r => {
                const costDisplay = r.hasUndecidedCost ? `₩${(r.totalCost||0).toLocaleString()} (미정 포함)` : `₩${(r.totalCost||0).toLocaleString()}`;
                html += `
                    <div class="menu-item-tag" style="cursor:pointer;" onclick="UI.selectMeal('${mealType}', '${r.id}')">
                        <div class="menu-item-info">
                            <strong>${r.name}</strong>
                            <span style="${r.hasUndecidedCost ? 'color:#ff9800;' : ''}">${r.category} • ${costDisplay}</span>
                        </div>
                        <span class="material-icons-round">add_circle</span>
                    </div>
                `;
            });
        }
        
        html += `</div>
            <button class="secondary-btn" style="margin-top:20px;" onclick="UI.closeModal()">닫기</button>
        `;
        
        this.openModal(html);
    },

    selectMeal(type, recipeId) {
        store.addMealToLog(this.currentDate, type, recipeId);
        this.closeModal();
        this.renderDailyView();
    },

    // Sync Modals
    showSyncModal() {
        const isCloudConnected = store.cloudSync && store.cloudSync.isConnected;
        let html = `
            <h3>가족 연결 (실시간 동기화)</h3>
            <p style="color:var(--text-secondary); font-size:14px; margin-bottom:20px;">
                서버를 통해 아내분과 식단 기록을 실시간으로 공유할 수 있습니다. Firebase API Key를 입력하세요.
            </p>
            
            <div style="margin-bottom:24px;">
                ${isCloudConnected ? 
                    `<div style="color:#4caf50; font-weight:bold; margin-bottom:10px; display:flex; align-items:center; gap:8px;"><span class="material-icons-round">cloud_done</span> 서버에 연결됨</div>
                     <button class="secondary-btn" onclick="UI.disconnectCloud()">연결 해제 및 로컬 모드 전환</button>` 
                    : 
                    `<input type="text" id="firebase-api-key" placeholder="Firebase API Key (AIzaSy...)" style="margin-bottom:12px;">
                     <button class="primary-btn" onclick="UI.connectCloud()">실시간 연동 시작하기</button>`
                }
            </div>

            <div style="border-top:1px solid var(--border-color); padding-top:20px;">
                <h4 style="margin-bottom:10px;">수동 백업/복원</h4>
                <div style="display:flex; gap:10px;">
                    <button class="secondary-btn" onclick="UI.exportData()">기기에서 내보내기</button>
                    <button class="secondary-btn" onclick="UI.showManualImport()">수동으로 가져오기</button>
                </div>
            </div>
            
            <button class="secondary-btn" style="margin-top:20px; border:none;" onclick="UI.closeModal()">닫기</button>
        `;
        this.openModal(html);
    },

    async connectCloud() {
        const key = document.getElementById('firebase-api-key').value.trim();
        if(!key) return alert('API Key를 입력해주세요.');
        
        try {
            const success = await store.cloudSync.initSync(key);
            if(success) {
                // If cloud connected and it successfully pulls, the listener will update UI.
                // But we should push our local stuff just in case we are the first one, or wait for merge.
                // For simplicity, we just push our data now.
                await store.cloudSync.syncToCloud();
                alert('가족 연동 서버에 성공적으로 연결되었습니다!');
                this.showSyncModal(); // refresh UI
            } else {
                alert('연결 실패! API Key를 확인해주세요.');
            }
        } catch (e) {
            alert('연결 오류: ' + e.message);
        }
    },

    disconnectCloud() {
        if(confirm('실시간 연동을 해제하시겠습니까? (서버 데이터는 지워지지 않습니다)')) {
            localStorage.removeItem('mamma_firebase_config');
            location.reload(); // Quickest way to clean state and unsubscribe
        }
    },

    showManualImport() {
        let html = `
            <h3>수동 데이터 가져오기</h3>
            <p style="color:var(--text-secondary); font-size:14px; margin-bottom:10px;">백업된 데이터를 아래에 붙여넣으세요.</p>
            <textarea id="import-data-text" placeholder="여기에 데이터 붙여넣기..." style="width:100%; height:120px; background:var(--bg-color); color:var(--text-primary); border:1px solid var(--border-color); border-radius:8px; padding:10px; margin-bottom:12px;"></textarea>
            <div style="display:flex; gap:10px;">
                <button class="secondary-btn" onclick="UI.showSyncModal()">뒤로</button>
                <button class="primary-btn" onclick="UI.importData()">가져오기</button>
            </div>
        `;
        this.openModal(html);
    },

    exportData() {
        const data = store.exportData();
        navigator.clipboard.writeText(data).then(() => {
            alert('데이터가 클립보드에 복사되었습니다. 카카오톡 창에 붙여넣기 하세요.');
        }).catch(err => {
            alert('복사 실패. 수동으로 복사해주세요.\n' + data);
        });
    },

    importData() {
        const text = document.getElementById('import-data-text').value.trim();
        if(!text) return alert('데이터를 입력해주세요.');
        if(confirm('데이터를 덮어씌웁니다. 기존 데이터가 사라질 수 있습니다. 계속하시겠습니까?')) {
            const success = store.importData(text);
            if(success) {
                alert('가져오기 성공!');
                this.closeModal();
                this.renderDailyView(); // re-render
            } else {
                alert('데이터가 올바르지 않습니다.');
            }
        }
    },

    // ==========================================
    // Modal Utils
    // ==========================================
    openModal(htmlContent) {
        const container = document.getElementById('modal-container');
        const body = document.getElementById('modal-body');
        body.innerHTML = htmlContent;
        container.classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-container').classList.add('hidden');
    },

    // ==========================================
    // Recipe & Ingredient View
    // ==========================================
    renderRecipeView() {
        const recipes = store.getRecipes();
        const ingredients = store.getIngredients();
        
        let html = `
            <div class="card">
                <div class="card-title">
                    <span>식재료 단가 관리</span>
                    <button class="icon-btn" onclick="UI.showIngredientModal()"><span class="material-icons-round">edit</span></button>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
        `;
        
        const ingKeys = Object.keys(ingredients);
        if (ingKeys.length === 0) {
            html += `<span style="color:var(--text-secondary);">등록된 식재료가 없습니다.</span>`;
        } else {
            html += ingKeys.map(k => {
                const costDisplay = ingredients[k].costPerGram === null ? '미정' : `₩${ingredients[k].costPerGram}/g`;
                return `<span style="background:var(--border-color); padding:4px 10px; border-radius:20px; font-size:12px;">${k} (${costDisplay})</span>`;
            }).join('');
        }
        
        html += `</div></div><h3 style="margin: 24px 0 12px;">저장된 메뉴</h3>`;
        
        if (recipes.length === 0) {
            html += `<div class="card"><p style="text-align:center; color:var(--text-secondary);">우측 상단 + 버튼을 눌러 새 메뉴를 등록하세요.</p></div>`;
        } else {
            recipes.forEach(r => {
                const costDisplay = r.hasUndecidedCost ? `₩${(r.totalCost||0).toLocaleString()} (단가 미정 포함)` : `₩${(r.totalCost||0).toLocaleString()}`;
                html += `
                    <div class="card" onclick="UI.showRecipeModal('${r.id}')" style="cursor:pointer;">
                        <div class="card-title" style="margin-bottom:4px;">${r.name} <span class="material-icons-round">chevron_right</span></div>
                        <div style="color:${r.hasUndecidedCost?'#ff9800':'var(--text-secondary)'}; font-size:14px;">
                            ${r.category} • 예상 단가: ${costDisplay}
                        </div>
                        <div style="margin-top:8px; font-size:13px; color:#aaa;">
                            재료: ${r.ingredients.map(i => {
                                const iCost = (i.cost !== null && i.cost !== undefined) ? `₩${i.cost.toLocaleString()}` : '미정';
                                return `${i.name}(${i.grams}g / ${iCost})`;
                            }).join(', ')}
                        </div>
                    </div>
                `;
            });
        }
        
        this.mainContent.innerHTML = html;
    },

    showIngredientModal() {
        const ingredients = store.getIngredients();
        let listHtml = Object.keys(ingredients).map(k => {
            const cost = ingredients[k].costPerGram;
            const costDisplay = cost === null ? '<span style="color:#ff9800">미정</span>' : `₩${cost}/g`;
            return `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
                <span>${k}</span>
                <div>
                    <span style="margin-right:10px;">${costDisplay}</span>
                    <button class="icon-btn" onclick="store.deleteIngredient('${k}'); UI.showIngredientModal();" style="display:inline-flex; width:24px; height:24px; color:#ff5252;"><span class="material-icons-round" style="font-size:18px;">delete</span></button>
                </div>
            </div>
            `;
        }).join('');

        let html = `
            <h3>식재료 단가 관리</h3>
            <div style="margin: 20px 0; max-height: 200px; overflow-y:auto;">
                ${listHtml || '<p style="color:var(--text-secondary);">식재료가 없습니다.</p>'}
            </div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <input type="text" id="ing-name" placeholder="재료명 (예: 양파)" style="margin-bottom:0;">
                <input type="number" id="ing-cost" placeholder="1g당 가격(원)" style="margin-bottom:0;">
                <button class="primary-btn" onclick="UI.addIngredient()" style="width:auto; padding:0 20px;">추가</button>
            </div>
            <button class="secondary-btn" onclick="UI.closeModal(); UI.renderRecipeView();">닫기</button>
        `;
        this.openModal(html);
    },

    addIngredient() {
        const name = document.getElementById('ing-name').value.trim();
        const costStr = document.getElementById('ing-cost').value;
        if (name) {
            // Can add without cost (null)
            store.saveIngredient(name, costStr || null);
            this.showIngredientModal(); // refresh
        }
    },

    showRecipeModal(id = null, returnMealType = null) {
        const recipe = id ? store.getRecipe(id) : { name: '', category: '한식', ingredients: [] };
        const categories = store.getCategories();
        
        let catsHtml = categories.map(c => `<option value="${c}" ${recipe.category === c ? 'selected' : ''}>${c}</option>`).join('');
        
        // Expose editing state to window temporarily
        window._tempRecipeIngs = recipe.ingredients ? [...recipe.ingredients] : [];
        window._tempReturnMealType = returnMealType;
        
        this._renderRecipeForm(recipe.name, catsHtml, id);
    },

    _renderRecipeForm(name, catsHtml, id) {
        const ingsHtml = window._tempRecipeIngs.map((ing, idx) => {
            const cDisplay = (ing.cost !== null && ing.cost !== undefined) ? ing.cost : '';
            return `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" value="${ing.name}" readonly style="padding:8px; margin-bottom:0; background:var(--bg-color); width:100px;">
                <input type="number" value="${ing.grams}" readonly style="padding:8px; margin-bottom:0; background:var(--bg-color); width:60px;">
                <input type="number" value="${cDisplay}" readonly style="padding:8px; margin-bottom:0; background:var(--bg-color); width:80px;" placeholder="미정">
                <button class="icon-btn" onclick="UI.removeTempIng(${idx}, '${name}', '${escape(catsHtml)}', '${id}')" style="color:#ff5252; width:40px;height:35px;"><span class="material-icons-round">remove_circle</span></button>
            </div>
        `;
        }).join('');

        const allIngs = Object.keys(store.getIngredients());
        let dlHtml = `<datalist id="ings-list">`;
        allIngs.forEach(i => dlHtml += `<option value="${i}">`);
        dlHtml += `</datalist>`;

        let html = `
            <h3>${id ? '레시피 수정' : '새 메뉴 등록'}</h3>
            <input type="text" id="recipe-name" placeholder="메뉴 이름" value="${name}" style="margin-top:20px;">
            <select id="recipe-cat">${catsHtml}</select>
            
            <div class="card" style="padding:15px;">
                <div class="card-title" style="font-size:14px; margin-bottom:10px;">재료 구성 (g 단위)</div>
                <div id="recipe-ing-list">${ingsHtml || '<span style="color:var(--text-secondary);font-size:13px;">추가된 재료가 없습니다.</span>'}</div>
                
                <div style="display:flex; gap:5px; margin-top:15px; align-items:center;">
                    ${dlHtml}
                    <input type="text" id="new-req-ing" list="ings-list" placeholder="재료명" style="margin-bottom:0; width:100px; padding:10px 5px; font-size:14px;">
                    <input type="number" id="new-req-g" placeholder="g수" oninput="UI.autoCalcIngredientCost()" style="margin-bottom:0; width:60px; padding:10px 5px; font-size:14px;">
                    <input type="number" id="new-req-cost" placeholder="가격(원)" style="margin-bottom:0; width:80px; padding:10px 5px; font-size:14px;">
                    <button class="secondary-btn" onclick="UI.addTempIng('${id}')" style="width:auto; padding:0 10px;">+</button>
                </div>
                <div style="font-size:11px; color:var(--text-secondary); margin-top:8px;">*g수 입력시 수동단가가 있다면 가격이 자동 계산됩니다. 재료의 가격을 직접(구성 당 가격) 확정하여 레시피를 등록합니다.</div>
            </div>
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="secondary-btn" onclick="UI.closeModal()">취소</button>
                ${id ? `<button class="secondary-btn" style="color:#ff5252; border-color:#ff5252;" onclick="UI.deleteRecipe('${id}')">삭제</button>` : ''}
                <button class="primary-btn" onclick="UI.saveRecipe('${id}')">저장</button>
            </div>
        `;
        this.openModal(html);
    },

    autoCalcIngredientCost() {
        const ingSelector = document.getElementById('new-req-ing');
        const gField = document.getElementById('new-req-g');
        const costField = document.getElementById('new-req-cost');
        
        if (ingSelector && gField && costField) {
            const ingVal = ingSelector.value.trim();
            const grams = Number(gField.value);
            if (ingVal && grams > 0) {
                const globalIng = store.getIngredients()[ingVal];
                if (globalIng && globalIng.costPerGram !== null) {
                    costField.value = Math.round(globalIng.costPerGram * grams);
                }
            }
        }
    },

    addTempIng(id) {
        const nameField = document.getElementById('recipe-name');
        const catField = document.getElementById('recipe-cat');
        const ingSelector = document.getElementById('new-req-ing');
        const gField = document.getElementById('new-req-g');
        const costField = document.getElementById('new-req-cost');
        
        let name = nameField ? nameField.value : '';
        let catsHtml = catField ? catField.innerHTML : '';

        const ingVal = ingSelector.value.trim();
        if (ingVal && gField.value) {
            window._tempRecipeIngs.push({
                name: ingVal,
                grams: Number(gField.value),
                cost: costField.value ? Number(costField.value) : null
            });
            // HACK to re-render form within modal
            this._renderRecipeForm(name, catsHtml, id === 'null' ? null : id);
        } else {
            alert('식재료 이름과 g수를 모두 입력하세요.');
        }
    },

    removeTempIng(idx, name, encodedCats, id) {
        window._tempRecipeIngs.splice(idx, 1);
        this._renderRecipeForm(name, unescape(encodedCats), id === 'null' ? null : id);
    },

    saveRecipe(id) {
        const name = document.getElementById('recipe-name').value.trim();
        const category = document.getElementById('recipe-cat').value;
        const ingredients = window._tempRecipeIngs;
        
        if (!name) return alert('메뉴 이름을 입력하세요.');
        
        store.saveRecipe(id === 'null' ? null : id, { name, category, ingredients });
        
        // Handle Return Logic Context (Inline Create)
        if (window._tempReturnMealType) {
            const newRecipes = store.getRecipes();
            const newId = newRecipes[newRecipes.length-1].id;
            // Go back to the 'Add meal' modal for the type
            this.showAddMealModal(window._tempReturnMealType);
            window._tempReturnMealType = null;
        } else {
            this.closeModal();
            this.renderRecipeView();
        }
    },

    deleteRecipe(id) {
        if(confirm('이 레시피를 삭제하시겠습니까?')) {
            store.deleteRecipe(id);
            this.closeModal();
            this.renderRecipeView();
        }
    },

    // ==========================================
    // Stats View
    // ==========================================
    renderStatsView() {
        const logs = store.getLogs();
        const recipes = store.getRecipes(); // Make sure recipes are loaded to get the costs
        
        // Calculate Data
        let totalCost = 0;
        let mealCount = 0;
        let categoryCounts = {};
        let ingredientUsage = {};

        Object.values(logs).forEach(day => {
            ['breakfast', 'lunch', 'dinner'].forEach(type => {
                day[type].forEach(rId => {
                    const r = store.getRecipe(rId);
                    if (r) {
                        mealCount++;
                        totalCost += (r.totalCost || 0);
                        
                        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
                        
                        r.ingredients.forEach(i => {
                            ingredientUsage[i.name] = (ingredientUsage[i.name] || 0) + i.grams;
                        });
                    }
                });
            });
        });

        const avgCost = mealCount > 0 ? Math.round(totalCost / mealCount) : 0;
        
        // Sort ingredients
        const sortedIngs = Object.entries(ingredientUsage).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const sortedCats = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]);

        let html = `
            <div class="card">
                <div style="text-align:center; padding: 20px 0;">
                    <div style="font-size:14px; color:var(--text-secondary);">한끼 평균 식단가격</div>
                    <div style="font-size:32px; font-weight:700; margin-top:8px;">₩${avgCost.toLocaleString()}</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">총 ${mealCount}끼니 기록됨</div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom:15px; font-size:16px;">가장 많이 소비되는 식재료 Top 5</h3>
                ${sortedIngs.length > 0 ? sortedIngs.map((ing, idx) => `
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
                        <span style="font-weight:500;">${idx+1}. ${ing[0]}</span>
                        <span style="color:var(--text-secondary);">${ing[1].toLocaleString()}g 소비</span>
                    </div>
                `).join('') : '<span style="color:var(--text-secondary); font-size:14px;">데이터가 부족합니다.</span>'}
                <p style="margin-top:10px; font-size:12px; color:var(--text-secondary);">*이 데이터를 바탕으로 냉장고에 해당 식재료를 우선 구비하세요.</p>
            </div>

            <div class="card">
                <h3 style="margin-bottom:15px; font-size:16px;">카테고리별 선호도</h3>
                ${sortedCats.length > 0 ? sortedCats.map(cat => `
                    <div style="margin-bottom: 15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;">
                            <span>${cat[0]}</span>
                            <span>${Math.round((cat[1]/mealCount)*100)}%</span>
                        </div>
                        <div style="height:6px; background:var(--surface-light); border-radius:3px; overflow:hidden;">
                            <div style="height:100%; background:var(--text-primary); width:${(cat[1]/mealCount)*100}%;"></div>
                        </div>
                    </div>
                `).join('') : '<span style="color:var(--text-secondary); font-size:14px;">데이터가 부족합니다.</span>'}
            </div>

            <!-- AI Section in Stats -->
            <div style="margin-top: 32px; padding-top:20px; border-top:1px solid var(--border-color);">
                <div class="card" style="text-align:center; padding:30px 20px;">
                    <span class="material-icons-round" style="font-size:48px; margin-bottom:16px;">auto_awesome</span>
                    <h3 style="margin-bottom:12px;">Gemini AI 식단 코칭</h3>
                    <p style="color:var(--text-secondary); font-size:14px; margin-bottom:24px;">최근 7일간의 식단 기록과 요리 데이터를 바탕으로 영양사가 부족한 점과 개선점을 분석해 드립니다.</p>
                    <button class="primary-btn" id="run-ai-btn">AI 분석 시작하기</button>
                </div>
                <div id="ai-result-container"></div>
            </div>
        `;
        
        this.mainContent.innerHTML = html;
        document.getElementById('run-ai-btn').addEventListener('click', () => this.runAIAnalysis());
    },

    // ==========================================
    // AI Analysis View (Merged logic)
    // ==========================================

    async runAIAnalysis() {
        const container = document.getElementById('ai-result-container');
        document.getElementById('run-ai-btn').classList.add('hidden');
        
        container.innerHTML = `
            <div class="ai-loading">
                <div class="spinner"></div>
                <span>식단을 분석하고 있습니다...</span>
            </div>
        `;

        try {
            // Gather last 7 days Logs
            const logs = store.getLogs();
            const keys = Object.keys(logs).sort((a,b) => new Date(b) - new Date(a)).slice(0, 7);
            const recentLogs = {};
            keys.forEach(k => recentLogs[k] = logs[k]);
            
            const recipesInfo = store.getRecipes().map(r => ({
                name: r.name,
                category: r.category,
                ingredients: r.ingredients.map(i => `${i.name}(${i.grams}g)`)
            }));

            // Resolve AI using marked for markdown (using regex replace for simplicity if marked not loaded)
            let result = await MammaAI.analyzeDiet(recentLogs, recipesInfo);
            
            // Simple markdown formatter since we don't have a library
            result = result.replace(/^### (.*$)/gim, '<h3>$1</h3>')
                           .replace(/^## (.*$)/gim, '<h3 style="border-bottom:1px solid #333; padding-bottom:5px; margin-top:20px;">$1</h3>')
                           .replace(/^\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                           .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                           .replace(/\n/gim, '<br>');

            container.innerHTML = `
                <div class="ai-bubble animation-slideUp">
                    ${result}
                </div>
                <button class="secondary-btn" style="margin-top:20px;" onclick="UI.renderAIView()">다시 분석하기</button>
            `;
            
        } catch(e) {
            container.innerHTML = `
                <div class="ai-bubble" style="border-color:#ff5252;">
                    <span class="material-icons-round" style="color:#ff5252; vertical-align:middle;">error</span>
                    <span style="color:#ff5252;">오류가 발생했습니다: ${e.message}</span>
                </div>
                <button class="primary-btn" style="margin-top:20px;" onclick="UI.renderStatsView()">다시 시도</button>
            `;
        }
    },

    // ==========================================
    // Shopping List View
    // ==========================================
    renderShoppingView() {
        const slv = store.getShoppingList();
        const recipes = store.getRecipes();

        // 1. Calculate needed ingredients from selected menus
        const requiredIngs = {}; // { '양파': 50, ... }
        slv.selectedMenus.forEach(rId => {
            const r = store.getRecipe(rId);
            if (r) {
                r.ingredients.forEach(i => {
                    requiredIngs[i.name] = (requiredIngs[i.name] || 0) + i.grams;
                });
            }
        });

        // 2. Build Recipe Selection UI
        let rSelectHtml = `<p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">이번 주에 먹을 메뉴를 선택하면 필요한 식재료량을 자동 계산합니다.</p>`;
        
        if (recipes.length === 0) {
            rSelectHtml += `<p style="color:var(--text-secondary); text-align:center;">저장된 레시피가 없습니다.</p>`;
        } else {
            rSelectHtml += `<div style="max-height:150px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; padding:10px;">`;
            recipes.forEach(r => {
                const isSelected = slv.selectedMenus.includes(r.id);
                rSelectHtml += `
                    <label style="display:flex; align-items:center; margin-bottom:10px; cursor:pointer;">
                        <input type="checkbox" value="${r.id}" class="slv-recipe-check" ${isSelected ? 'checked' : ''} style="width: auto; margin-right: 10px; margin-bottom:0;" onchange="UI.updateShoppingMenus();">
                        <span>${r.name}</span>
                    </label>
                `;
            });
            rSelectHtml += `</div>`;
        }

        // 3. Build Compiled list UI
        let reqListHtml = ``;
        const reqKeys = Object.keys(requiredIngs);
        if (reqKeys.length === 0) {
            reqListHtml = `<p style="color:var(--text-secondary); text-align:center; font-size:14px; padding:10px;">선택된 메뉴가 없습니다.</p>`;
        } else {
            reqKeys.forEach(k => {
                reqListHtml += `
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">
                        <span>${k}</span>
                        <span style="font-weight:600;">${requiredIngs[k]}g</span>
                    </div>
                `;
            });
        }

        // 4. Custom Items
        let customHtml = ``;
        slv.customItems.forEach(item => {
            customHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border-color);">
                    <label style="display:flex; align-items:center; cursor:pointer; width:100%;">
                        <input type="checkbox" style="width:auto; margin-bottom:0; margin-right:10px;" ${item.isChecked?'checked':''} onchange="store.toggleCustomShoppingItem('${item.id}'); UI.renderShoppingView();">
                        <span style="${item.isChecked?'text-decoration:line-through; color:var(--text-secondary);':''}">${item.name}</span>
                    </label>
                    <button class="icon-btn" style="width:24px;height:24px; color:#ff5252;" onclick="store.deleteCustomShoppingItem('${item.id}'); UI.renderShoppingView();">
                        <span class="material-icons-round" style="font-size:18px;">close</span>
                    </button>
                </div>
            `;
        });

        let html = `
            <div class="card">
                <div class="card-title">목표 메뉴 (자동 계산)</div>
                ${rSelectHtml}
            </div>
            
            <div class="card">
                <div class="card-title">사야 할 재료 (총합)</div>
                ${reqListHtml}
            </div>

            <div class="card">
                <div class="card-title">추가 장보기 (수동)</div>
                ${customHtml}
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <input type="text" id="slv-custom-input" placeholder="생수 1박스 등..." style="margin-bottom:0;">
                    <button class="secondary-btn" style="width:auto; padding:0 20px;" onclick="UI.addShoppingItem()">+</button>
                </div>
            </div>
        `;

        this.mainContent.innerHTML = html;
    },

    updateShoppingMenus() {
        const checks = document.querySelectorAll('.slv-recipe-check:checked');
        const selected = Array.from(checks).map(c => c.value);
        store.updateShoppingListMenus(selected);
        this.renderShoppingView();
    },

    addShoppingItem() {
        const inp = document.getElementById('slv-custom-input');
        if (inp.value.trim()) {
            store.addCustomShoppingItem(inp.value.trim());
            this.renderShoppingView();
        }
    },

    // ==========================================
    // Shopping Cart View
    // ==========================================
    renderCartView() {
        const cart = store.getShoppingCart();
        
        let activeHtml = '';
        if (cart.active.length === 0) {
            activeHtml = `<p style="color:var(--text-secondary); text-align:center; padding: 20px 0;">현재 장바구니에 담긴 물품이 없습니다.</p>`;
        } else {
            cart.active.forEach(item => {
                let memoHtml = '';
                if (item.memo) {
                    const isLink = item.memo.startsWith('http://') || item.memo.startsWith('https://');
                    if (isLink) {
                        memoHtml = `<a href="${item.memo}" target="_blank" style="color:#2196f3; font-size:12px; margin-top:2px; display:inline-flex; align-items:center; gap:2px; text-decoration:none;"><span class="material-icons-round" style="font-size:14px;">open_in_new</span>구매 링크</a>`;
                    } else {
                        memoHtml = `<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${item.memo}</div>`;
                    }
                }
                activeHtml += `
                    <div class="cart-item">
                        <div style="display:flex; flex-direction:column; align-items:flex-start;">
                            <span>${item.name}</span>
                            ${memoHtml}
                        </div>
                        <button class="icon-btn" style="color:#4caf50;" onclick="UI.archiveCartItem('${item.id}')">
                            <span class="material-icons-round">check_circle</span>
                        </button>
                    </div>
                `;
            });
        }

        // History list with search
        const filterVal = window._cartSearchFilter || '';
        let filteredHistory = cart.history;
        if (filterVal) {
            filteredHistory = cart.history.filter(h => h.name.toLowerCase().includes(filterVal.toLowerCase()));
        }

        let historyHtml = '';
        if (filteredHistory.length === 0) {
            historyHtml = `<p style="color:var(--text-secondary); text-align:center; padding: 20px 0;">이전 구매 목록이 없습니다.</p>`;
        } else {
            filteredHistory.forEach(item => {
                let memoHtml = '';
                if (item.memo) {
                    memoHtml = `<div style="font-size:11px; color:var(--text-secondary); margin-top:1px;">${item.memo}</div>`;
                }
                historyHtml += `
                    <div class="history-item" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column; align-items:flex-start;">
                            <span>${item.name}</span>
                            ${memoHtml}
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button class="icon-btn" style="width:28px; height:28px; color:var(--text-primary);" onclick="UI.restoreCartItem('${item.id}')" title="카트에 다시 담기">
                                <span class="material-icons-round" style="font-size:18px;">refresh</span>
                            </button>
                            <button class="icon-btn" style="width:28px; height:28px; color:#ff5252;" onclick="UI.deleteCartItemPermanently('${item.id}')" title="영구 삭제">
                                <span class="material-icons-round" style="font-size:18px;">delete_forever</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        let html = `
            <div class="card">
                <div class="card-title">🛒 현재 살 것들</div>
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                    <input type="text" id="cart-add-input" placeholder="생필품 이름 입력 (예: 우유, 화장지, 생수)" style="margin-bottom:0;" onkeypress="if(event.key === 'Enter') UI.addCartItem()">
                    <input type="text" id="cart-add-memo" placeholder="비고/구매 사이트 주소 입력 (선택)" style="margin-bottom:0;" onkeypress="if(event.key === 'Enter') UI.addCartItem()">
                    <button class="primary-btn" onclick="UI.addCartItem()">추가하기</button>
                </div>
                <div id="active-cart-list">${activeHtml}</div>
            </div>
            
            <div class="history-section">
                <div class="history-title">
                    <span>🕒 자주 사는 품목 (이전 기록)</span>
                </div>
                <div class="search-bar">
                    <span class="material-icons-round">search</span>
                    <input type="text" id="cart-history-search" placeholder="자주 사던 물품 검색..." value="${filterVal}">
                </div>
                <div id="history-cart-list">${historyHtml}</div>
            </div>
        `;

        this.mainContent.innerHTML = html;

        // Hook search event
        const searchInput = document.getElementById('cart-history-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                window._cartSearchFilter = e.target.value;
                this.renderCartView();
                // Maintain focus and cursor
                const inp = document.getElementById('cart-history-search');
                if (inp) {
                    inp.focus();
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                }
            });
        }
    },

    addCartItem() {
        const inp = document.getElementById('cart-add-input');
        const memoInp = document.getElementById('cart-add-memo');
        if (!inp) return;
        const name = inp.value.trim();
        const memo = memoInp ? memoInp.value.trim() : '';
        if (name) {
            store.addCartItem(name, memo);
            inp.value = '';
            if (memoInp) memoInp.value = '';
            this.renderCartView();
        }
    },

    archiveCartItem(id) {
        store.archiveCartItem(id);
        this.renderCartView();
    },

    restoreCartItem(id) {
        store.restoreCartItem(id);
        this.renderCartView();
    },

    deleteCartItemPermanently(id) {
        if (confirm('이 품목을 이전 기록에서 완전히 삭제하시겠습니까?')) {
            store.deleteCartItemPermanently(id);
            this.renderCartView();
        }
    },

    // ==========================================
    // Fishing Record View
    // ==========================================
    renderFishingView() {
        if (!window._fishingActiveSection) window._fishingActiveSection = 'logs';
        const activeSec = window._fishingActiveSection;
        
        let html = `
            <div class="fishing-toggle">
                <button class="${activeSec === 'logs' ? 'active' : ''}" onclick="UI.setFishingSection('logs')">낚시 기록</button>
                <button class="${activeSec === 'analytics' ? 'active' : ''}" onclick="UI.setFishingSection('analytics')">조황 분석 & AI</button>
            </div>
            <div id="fishing-section-content"></div>
        `;
        
        this.mainContent.innerHTML = html;
        
        if (activeSec === 'logs') {
            this.renderFishingLogsSection();
        } else {
            this.renderFishingAnalyticsSection();
        }
    },

    setFishingSection(section) {
        window._fishingActiveSection = section;
        this.renderFishingView();
    },

    renderFishingLogsSection() {
        const container = document.getElementById('fishing-section-content');
        if (!container) return;
        
        const logs = store.getFishingLogs();
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center; padding:40px 20px;">
                    <span class="material-icons-round" style="font-size:48px; color:var(--text-secondary); margin-bottom:12px;">phishing</span>
                    <p style="color:var(--text-secondary);">기록된 낚시 정보가 없습니다.<br>우측 상단 + 버튼을 눌러 출조 기록을 남겨보세요!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        logs.forEach(log => {
            const weatherIcons = {
                '맑음': 'wb_sunny',
                '흐림': 'cloud',
                '비': 'umbrella',
                '눈': 'ac_unit',
                '바람 강함': 'air'
            };
            const weatherIcon = weatherIcons[log.weather] || 'wb_sunny';
            
            html += `
                <div class="log-card">
                    <div class="log-card-header">
                        <div>
                            <div class="log-point" style="display:flex; align-items:center; gap:6px;">
                                <span class="material-icons-round" style="font-size:18px; color:var(--text-secondary);">place</span>
                                ${log.point}
                            </div>
                            <div class="log-time">${log.startDate} ${log.startTime} ~ ${log.endDate} ${log.endTime}</div>
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button class="icon-btn" style="width:32px; height:32px; background:var(--surface-light);" onclick="UI.showFishingLogModal('${log.id}')">
                                <span class="material-icons-round" style="font-size:16px;">edit</span>
                            </button>
                            <button class="icon-btn" style="width:32px; height:32px; color:#ff5252; background:var(--surface-light);" onclick="UI.deleteFishingLog('${log.id}')">
                                <span class="material-icons-round" style="font-size:16px;">delete</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="log-catches">
                        ${log.catches && log.catches.length > 0 
                            ? log.catches.map(c => `<span class="catch-badge">${c.species} (${c.count}마리)</span>`).join('')
                            : '<span class="catch-badge" style="color:var(--text-secondary);">조과 없음 🎣</span>'
                        }
                    </div>
                    
                    <div class="log-env">
                        <span><span class="material-icons-round" style="font-size:14px; vertical-align:middle; margin-right:2px;">${weatherIcon}</span>${log.weather}</span>
                        <span><span class="material-icons-round" style="font-size:14px; vertical-align:middle; margin-right:2px;">water</span>물때: ${log.tide || '미입력'}</span>
                        <span><span class="material-icons-round" style="font-size:14px; vertical-align:middle; margin-right:2px;">thermostat</span>수온: ${log.waterTemp ? log.waterTemp + '°C' : '미입력'}</span>
                    </div>
                    
                    ${log.memo ? `<div class="log-memo">${log.memo}</div>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    deleteFishingLog(id) {
        if (confirm('이 낚시 기록을 삭제하시겠습니까?')) {
            store.deleteFishingLog(id);
            this.renderFishingLogsSection();
        }
    },

    showFishingLogModal(id = null) {
        const log = id ? store.getFishingLogs().find(l => l.id === id) : null;
        
        const todayStr = new Date().toISOString().split('T')[0];
        const pointVal = log ? log.point : '';
        const startDateVal = log ? log.startDate : todayStr;
        const startTimeVal = log ? log.startTime : '06:00';
        const endDateVal = log ? log.endDate : todayStr;
        const endTimeVal = log ? log.endTime : '12:00';
        const weatherVal = log ? log.weather : '맑음';
        const tideVal = log ? log.tide : '';
        const waterTempVal = log ? log.waterTemp : '';
        const memoVal = log ? log.memo : '';
        
        window._tempCatches = log ? [...log.catches] : [];
        
        const weathers = ['맑음', '흐림', '비', '눈', '바람 강함'];
        const weatherOptions = weathers.map(w => `<option value="${w}" ${weatherVal === w ? 'selected' : ''}>${w}</option>`).join('');
        
        const commonFish = ['우럭', '광어', '감성돔', '참돔', '돌돔', '농어', '볼락', '삼치', '주꾸미', '갑오징어', '갈치', '숭어', '학꽁치', '붕어', '배스', '메기'];
        let dlHtml = `<datalist id="fish-list">`;
        commonFish.forEach(f => dlHtml += `<option value="${f}">`);
        dlHtml += `</datalist>`;
        
        this._renderFishingFormModal({
            id, pointVal, startDateVal, startTimeVal, endDateVal, endTimeVal, weatherOptions, weatherVal, tideVal, waterTempVal, memoVal, dlHtml
        });
    },

    _renderFishingFormModal(opts) {
        const catchTags = window._tempCatches.map((c, idx) => `
            <span class="catch-tag">
                <strong>${c.species}</strong>: ${c.count}마리
                <button class="remove-btn" onclick="UI.removeTempCatch(${idx}, ${JSON.stringify(opts).replace(/"/g, '&quot;')})">×</button>
            </span>
        `).join('');
        
        let html = `
            <h3>${opts.id ? '낚시 기록 수정' : '새 출조 기록 등록'}</h3>
            <div style="max-height: 65vh; overflow-y: auto; padding-right:4px; margin-top:15px;">
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">낚시 포인트</label>
                <input type="text" id="fish-point" placeholder="방포방파제, 대천항 등" value="${opts.pointVal}">
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">시작 날짜</label>
                        <input type="date" id="fish-start-date" value="${opts.startDateVal}">
                    </div>
                    <div>
                        <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">시작 시간</label>
                        <input type="time" id="fish-start-time" value="${opts.startTimeVal}">
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">종료 날짜</label>
                        <input type="date" id="fish-end-date" value="${opts.endDateVal}">
                    </div>
                    <div>
                        <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">종료 시간</label>
                        <input type="time" id="fish-end-time" value="${opts.endTimeVal}">
                    </div>
                </div>
                
                <div class="card" style="padding:15px; margin-bottom:16px; background:rgba(255,255,255,0.02);">
                    <div class="card-title" style="font-size:14px; margin-bottom:10px;">조과 결과 (잡은 어종)</div>
                    <div class="catch-tag-list" style="margin-bottom:15px; display:flex; flex-wrap:wrap; gap:8px;">
                        ${catchTags || '<span style="color:var(--text-secondary); font-size:13px;">등록된 조과가 없습니다.</span>'}
                    </div>
                    
                    <div class="catch-builder-row">
                        ${opts.dlHtml}
                        <input type="text" id="fish-species" list="fish-list" placeholder="어종 (예: 우럭)" style="flex:2;">
                        <input type="number" id="fish-count" placeholder="마리" value="1" style="flex:1;">
                        <button class="secondary-btn" style="width:auto; padding:0 15px; height:48px; border-color:var(--border-color);" onclick="UI.addTempCatch(${JSON.stringify(opts).replace(/"/g, '&quot;')})">+</button>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">날씨</label>
                        <select id="fish-weather">${opts.weatherOptions}</select>
                    </div>
                    <div>
                        <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">물때 (Tide)</label>
                        <input type="text" id="fish-tide" placeholder="예: 3물, 만조" value="${opts.tideVal}">
                    </div>
                </div>
                
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">수온 (°C)</label>
                <input type="number" step="0.1" id="fish-watertemp" placeholder="예: 18.5" value="${opts.waterTempVal}">
                
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">출조 메모</label>
                <textarea id="fish-memo" placeholder="미끼 종류, 공략 수심 등 특이사항 기록" style="width:100%; height:80px; background:var(--surface-color); color:var(--text-primary); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:16px; font-family:inherit; outline:none; resize:none;">${opts.memoVal}</textarea>
            </div>
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="secondary-btn" onclick="UI.closeModal()">취소</button>
                <button class="primary-btn" onclick="UI.saveFishingLog('${opts.id}')">저장</button>
            </div>
        `;
        
        this.openModal(html);
    },

    addTempCatch(opts) {
        const specField = document.getElementById('fish-species');
        const countField = document.getElementById('fish-count');
        if (!specField || !countField) return;
        
        const species = specField.value.trim();
        const count = parseInt(countField.value, 10);
        
        if (species && count > 0) {
            const existing = window._tempCatches.find(c => c.species === species);
            if (existing) {
                existing.count += count;
            } else {
                window._tempCatches.push({ species, count });
            }
            
            opts.pointVal = document.getElementById('fish-point').value;
            opts.startDateVal = document.getElementById('fish-start-date').value;
            opts.startTimeVal = document.getElementById('fish-start-time').value;
            opts.endDateVal = document.getElementById('fish-end-date').value;
            opts.endTimeVal = document.getElementById('fish-end-time').value;
            opts.tideVal = document.getElementById('fish-tide').value;
            opts.waterTempVal = document.getElementById('fish-watertemp').value;
            opts.memoVal = document.getElementById('fish-memo').value;
            
            // Rebuild weather options
            const weatherVal = document.getElementById('fish-weather').value;
            const weathers = ['맑음', '흐림', '비', '눈', '바람 강함'];
            opts.weatherOptions = weathers.map(w => `<option value="${w}" ${weatherVal === w ? 'selected' : ''}>${w}</option>`).join('');
            
            this._renderFishingFormModal(opts);
        } else {
            alert('어종 이름 and 마리 수를 확인해주세요.');
        }
    },

    removeTempCatch(idx, opts) {
        window._tempCatches.splice(idx, 1);
        
        opts.pointVal = document.getElementById('fish-point').value;
        opts.startDateVal = document.getElementById('fish-start-date').value;
        opts.startTimeVal = document.getElementById('fish-start-time').value;
        opts.endDateVal = document.getElementById('fish-end-date').value;
        opts.endTimeVal = document.getElementById('fish-end-time').value;
        opts.tideVal = document.getElementById('fish-tide').value;
        opts.waterTempVal = document.getElementById('fish-watertemp').value;
        opts.memoVal = document.getElementById('fish-memo').value;
        
        const weatherVal = document.getElementById('fish-weather').value;
        const weathers = ['맑음', '흐림', '비', '눈', '바람 강함'];
        opts.weatherOptions = weathers.map(w => `<option value="${w}" ${weatherVal === w ? 'selected' : ''}>${w}</option>`).join('');
        
        this._renderFishingFormModal(opts);
    },

    saveFishingLog(id) {
        const point = document.getElementById('fish-point').value.trim();
        if (!point) return alert('포인트 이름을 입력해주세요.');
        
        const startDate = document.getElementById('fish-start-date').value;
        const startTime = document.getElementById('fish-start-time').value;
        const endDate = document.getElementById('fish-end-date').value;
        const endTime = document.getElementById('fish-end-time').value;
        const weather = document.getElementById('fish-weather').value;
        const tide = document.getElementById('fish-tide').value.trim();
        const waterTemp = document.getElementById('fish-watertemp').value;
        const memo = document.getElementById('fish-memo').value.trim();
        const catches = window._tempCatches;
        
        const logData = {
            point, startDate, startTime, endDate, endTime, weather, tide, waterTemp, memo, catches
        };
        
        store.saveFishingLog(id === 'null' ? null : id, logData);
        this.closeModal();
        this.renderFishingView();
    },

    renderFishingAnalyticsSection() {
        const container = document.getElementById('fishing-section-content');
        if (!container) return;
        
        const logs = store.getFishingLogs();
        if (logs.length === 0) {
            container.innerHTML = `<p style="color:var(--text-secondary); text-align:center; padding:40px 0;">조황을 분석할 낚시 기록 데이터가 부족합니다.</p>`;
            return;
        }
        
        const totalTrips = logs.length;
        let totalFish = 0;
        const pointStats = {};
        const speciesStats = {};
        const envStats = {
            weather: {},
            tide: {}
        };
        
        logs.forEach(log => {
            let tripFishCount = 0;
            
            if (log.catches) {
                log.catches.forEach(c => {
                    totalFish += c.count;
                    tripFishCount += c.count;
                    
                    speciesStats[c.species] = (speciesStats[c.species] || 0) + c.count;
                    
                    if (!pointStats[log.point]) {
                        pointStats[log.point] = { total: 0, species: {} };
                    }
                    pointStats[log.point].total += c.count;
                    pointStats[log.point].species[c.species] = (pointStats[log.point].species[c.species] || 0) + c.count;
                });
            }
            
            if (tripFishCount > 0) {
                envStats.weather[log.weather] = (envStats.weather[log.weather] || 0) + tripFishCount;
                if (log.tide) {
                    envStats.tide[log.tide] = (envStats.tide[log.tide] || 0) + tripFishCount;
                }
            }
        });
        
        const sortedSpecies = Object.entries(speciesStats).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const sortedPoints = Object.entries(pointStats).sort((a,b) => b[1].total - a[1].total);
        
        let speciesHtml = sortedSpecies.map(([name, count]) => {
            const pct = totalFish > 0 ? Math.round((count / totalFish) * 100) : 0;
            return `
                <div class="chart-bar-container">
                    <div class="chart-bar-header">
                        <span>${name}</span>
                        <span>${count}마리 (${pct}%)</span>
                    </div>
                    <div class="chart-bar-outer">
                        <div class="chart-bar-inner" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        let pointHtml = sortedPoints.map(([point, data]) => {
            const detailText = Object.entries(data.species).map(([sp, cnt]) => `${sp} ${cnt}마리`).join(', ');
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border-color);">
                    <div>
                        <strong style="display:block; font-size:14px;">${point}</strong>
                        <span style="font-size:12px; color:var(--text-secondary);">${detailText}</span>
                    </div>
                    <span style="font-size:14px; font-weight:600;">총 ${data.total}마리</span>
                </div>
            `;
        }).join('');
        
        let weatherHtml = Object.entries(envStats.weather).sort((a,b) => b[1] - a[1]).map(([w, cnt]) => `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
                <span>${w}</span>
                <span style="color:var(--text-secondary);">${cnt}마리 조과</span>
            </div>
        `).join('');

        let html = `
            <div class="analytics-grid">
                <div class="analytic-metric">
                    <div class="value">${totalTrips}회</div>
                    <div class="label">총 출조 횟수</div>
                </div>
                <div class="analytic-metric">
                    <div class="value">${totalFish}마리</div>
                    <div class="label">총 조과수</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title" style="font-size:15px; margin-bottom:15px;">🐟 어종별 누적 조과 Top 5</div>
                <div style="margin-top:10px;">
                    ${speciesHtml || '<p style="color:var(--text-secondary); font-size:13px; text-align:center;">기록된 어종이 없습니다.</p>'}
                </div>
            </div>
            
            <div class="card">
                <div class="card-title" style="font-size:15px; margin-bottom:15px;">📍 포인트별 조과 현황</div>
                <div style="margin-top:10px; max-height:220px; overflow-y:auto;">
                    ${pointHtml || '<p style="color:var(--text-secondary); font-size:13px; text-align:center;">포인트 기록이 없습니다.</p>'}
                </div>
            </div>
            
            <div class="card">
                <div class="card-title" style="font-size:15px; margin-bottom:15px;">☀️ 날씨별 조과 분포</div>
                <div style="margin-top:10px;">
                    ${weatherHtml || '<p style="color:var(--text-secondary); font-size:13px; text-align:center;">날씨 조과 데이터가 없습니다.</p>'}
                </div>
            </div>
            
            <div class="card" style="border: 1px solid var(--border-color); text-align:center; padding:30px 20px; margin-top:24px;">
                <span class="material-icons-round" style="font-size:48px; margin-bottom:12px;">auto_awesome</span>
                <h3 style="margin-bottom:8px;">Gemini AI 낚시 분석 코치</h3>
                <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px; line-height:1.5;">
                    출조지 데이터와 조과 패턴을 분석하여 다음 출조에 물때, 날씨, 포인트, 추천 어종 등의 낚시 계획을 처방해 드립니다.
                </p>
                <button class="primary-btn" id="run-fishing-ai-btn">AI 분석 가이드 받기</button>
                <div id="fishing-ai-result" style="text-align:left; margin-top:20px;"></div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('run-fishing-ai-btn').addEventListener('click', () => this.runAIFishingAnalysis());
    },

    async runAIFishingAnalysis() {
        const container = document.getElementById('fishing-ai-result');
        const btn = document.getElementById('run-fishing-ai-btn');
        if (btn) btn.classList.add('hidden');
        
        container.innerHTML = `
            <div class="ai-loading">
                <div class="spinner"></div>
                <span>낚시 데이터를 분석하고 있습니다...</span>
            </div>
        `;
        
        try {
            const logs = store.getFishingLogs();
            let result = await MammaAI.analyzeFishing(logs);
            
            result = result.replace(/^### (.*$)/gim, '<h3 style="font-size:15px; margin-top:15px; margin-bottom:6px;">$1</h3>')
                           .replace(/^## (.*$)/gim, '<h3 style="border-bottom:1px solid #333; padding-bottom:5px; margin-top:20px; font-size:16px;">$1</h3>')
                           .replace(/^\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                           .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                           .replace(/\n/gim, '<br>');
                           
            container.innerHTML = `
                <div class="ai-bubble animation-slideUp" style="margin-bottom:0; font-size:14px;">
                    ${result}
                </div>
                <button class="secondary-btn" style="margin-top:15px;" onclick="UI.renderFishingAnalyticsSection()">다시 분석하기</button>
            `;
        } catch (e) {
            container.innerHTML = `
                <div class="ai-bubble" style="border-color:#ff5252; margin-bottom:0;">
                    <span class="material-icons-round" style="color:#ff5252; vertical-align:middle; margin-right:6px;">error</span>
                    <span style="color:#ff5252;">분석 실패: ${e.message}</span>
                </div>
                <button class="primary-btn" style="margin-top:15px;" onclick="UI.renderFishingAnalyticsSection()">재시도</button>
            `;
        }
    },

    // ==========================================
    // Mini Dining Helper Methods
    // ==========================================
    compressImage(file, maxDimension = 600, targetMaxKB = 45) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxDimension) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        }
                    } else {
                        if (height > maxDimension) {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    let quality = 0.5;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Progressive compression to ensure size is under targetMaxKB
                    while (dataUrl.length > targetMaxKB * 1370 && quality > 0.15) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    
                    if (dataUrl.length > targetMaxKB * 1370) {
                        canvas.width = Math.round(width * 0.7);
                        canvas.height = Math.round(height * 0.7);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        dataUrl = canvas.toDataURL('image/jpeg', 0.35);
                    }
                    
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    },

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    },

    // ==========================================
    // Mini Dining View
    // ==========================================
    renderDiningView() {
        const list = store.getMiniDiningList();
        const searchKeyword = window._diningSearchFilter || '';
        
        let filteredList = list;
        if (searchKeyword) {
            filteredList = list.filter(e => e.name.toLowerCase().includes(searchKeyword.toLowerCase()));
        }
        
        let gridHtml = '';
        if (filteredList.length === 0) {
            gridHtml = `
                <div style="grid-column: 1/-1; text-align:center; color:var(--text-secondary); padding:40px 0;">
                    <span class="material-icons-round" style="font-size:48px; margin-bottom:12px;">local_dining</span>
                    <p>${searchKeyword ? '검색 결과가 없습니다.' : '등록된 요리가 없습니다.<br>우측 상단 + 버튼을 눌러 첫 요리를 등록해 보세요!'}</p>
                </div>
            `;
        } else {
            filteredList.forEach(entry => {
                const imgHtml = entry.photo 
                    ? `<img class="dining-card-img" src="${entry.photo}" alt="${entry.name}">`
                    : `<div class="dining-card-no-img"><span class="material-icons-round">restaurant</span></div>`;
                    
                gridHtml += `
                    <div class="dining-card" onclick="UI.showDiningDetailModal('${entry.id}')">
                        ${imgHtml}
                        <div class="dining-card-info">
                            <div class="dining-card-title">${entry.name}</div>
                        </div>
                    </div>
                `;
            });
        }
        
        let html = `
            <div class="search-bar">
                <span class="material-icons-round">search</span>
                <input type="text" id="dining-search" placeholder="요리 이름 검색..." value="${searchKeyword}">
            </div>
            <div class="dining-grid">
                ${gridHtml}
            </div>
        `;
        
        this.mainContent.innerHTML = html;
        
        // Search input event
        const searchInput = document.getElementById('dining-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                window._diningSearchFilter = e.target.value;
                this.renderDiningView();
                // Maintain cursor position
                const inp = document.getElementById('dining-search');
                if (inp) {
                    inp.focus();
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                }
            });
        }
    },

    showDiningEntryModal(id = null) {
        const entry = id ? store.getMiniDiningList().find(e => e.id === id) : null;
        
        const nameVal = entry ? entry.name : '';
        window._tempDiningData = {
            photo: entry ? entry.photo : null,
            menuCard: entry ? entry.menuCard : null,
            recipe: entry ? entry.recipe : null,
            recipeType: entry && entry.recipe && !entry.recipe.startsWith('data:') ? 'text' : 'file'
        };
        
        this._renderDiningFormModal(nameVal, id);
    },
    
    _renderDiningFormModal(nameVal, id) {
        const data = window._tempDiningData;
        
        // Photo preview
        const photoPreview = data.photo 
            ? `<div class="file-preview-box has-file">
                 <button class="file-delete-btn" onclick="UI.deleteDiningTempFile('photo', '${nameVal}', '${id}')">×</button>
                 <img class="file-preview-img" src="${data.photo}">
               </div>`
            : `<div class="file-preview-box">
                 <span style="color:var(--text-secondary); font-size:13px;">요리 완성 사진 없음</span><br>
                 <label class="file-input-label">
                     <span class="material-icons-round" style="font-size:16px;">add_a_photo</span>사진 등록
                     <input type="file" accept="image/*" style="display:none;" onchange="UI.uploadDiningFile(this, 'photo', '${nameVal}', '${id}')">
                 </label>
               </div>`;
               
        // MenuCard preview
        const menuPreview = data.menuCard
            ? `<div class="file-preview-box has-file">
                 <button class="file-delete-btn" onclick="UI.deleteDiningTempFile('menuCard', '${nameVal}', '${id}')">×</button>
                 ${data.menuCard.startsWith('data:application/pdf') 
                     ? `<span style="color:#4caf50; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:4px;"><span class="material-icons-round">picture_as_pdf</span>PDF 메뉴판 등록됨</span>`
                     : `<img class="file-preview-img" src="${data.menuCard}">`
                 }
               </div>`
            : `<div class="file-preview-box">
                 <span style="color:var(--text-secondary); font-size:13px;">메뉴판 파일 없음</span><br>
                 <label class="file-input-label">
                     <span class="material-icons-round" style="font-size:16px;">upload_file</span>파일 등록
                     <input type="file" accept="image/*,application/pdf" style="display:none;" onchange="UI.uploadDiningFile(this, 'menuCard', '${nameVal}', '${id}')">
                 </label>
               </div>`;

        // Recipe preview
        let recipeContentHtml = '';
        if (data.recipeType === 'text') {
            const textVal = data.recipe && !data.recipe.startsWith('data:') ? data.recipe : '';
            recipeContentHtml = `
                <textarea id="dining-recipe-text" placeholder="레시피 내용을 텍스트로 작성하세요..." style="width:100%; height:120px; background:var(--surface-color); color:var(--text-primary); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:0; font-family:inherit; outline:none; resize:none;">${textVal}</textarea>
            `;
        } else {
            recipeContentHtml = data.recipe
                ? `<div class="file-preview-box has-file">
                     <button class="file-delete-btn" onclick="UI.deleteDiningTempFile('recipe', '${nameVal}', '${id}')">×</button>
                     ${data.recipe.startsWith('data:application/pdf')
                         ? `<span style="color:#4caf50; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:4px;"><span class="material-icons-round">picture_as_pdf</span>PDF 레시피 등록됨</span>`
                         : `<img class="file-preview-img" src="${data.recipe}">`
                     }
                   </div>`
                : `<div class="file-preview-box">
                     <span style="color:var(--text-secondary); font-size:13px;">레시피 파일 없음</span><br>
                     <label class="file-input-label">
                         <span class="material-icons-round" style="font-size:16px;">upload_file</span>파일 등록
                         <input type="file" accept="image/*,application/pdf" style="display:none;" onchange="UI.uploadDiningFile(this, 'recipe', '${nameVal}', '${id}')">
                     </label>
                   </div>`;
        }
        
        const recipeSelectorHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; margin-top:15px;">
                <label style="font-size:13px; color:var(--text-secondary);">레시피</label>
                <div style="display:flex; gap:8px;">
                    <button class="secondary-btn" style="width:auto; padding:4px 8px; font-size:11px; height:28px; background-color:${data.recipeType==='text'?'var(--surface-light)':'transparent'}" onclick="UI.toggleDiningRecipeType('text', '${nameVal}', '${id}')">텍스트 작성</button>
                    <button class="secondary-btn" style="width:auto; padding:4px 8px; font-size:11px; height:28px; background-color:${data.recipeType==='file'?'var(--surface-light)':'transparent'}" onclick="UI.toggleDiningRecipeType('file', '${nameVal}', '${id}')">파일 업로드</button>
                </div>
            </div>
            ${recipeContentHtml}
        `;
        
        let html = `
            <h3>${id ? '요리 수정' : '새 요리 등록'}</h3>
            <div style="max-height:62vh; overflow-y:auto; padding-right:4px; margin-top:15px;">
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">요리 이름</label>
                <input type="text" id="dining-name" placeholder="요리 이름 입력 (예: 스테이크, 우럭 조림)" value="${nameVal}">
                
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">요리 완성 사진</label>
                ${photoPreview}
                
                <label style="font-size:13px; color:var(--text-secondary); display:block; margin-bottom:4px;">메뉴판 이미지/PDF</label>
                ${menuPreview}
                
                ${recipeSelectorHtml}
            </div>
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="secondary-btn" onclick="UI.closeModal()">취소</button>
                <button class="primary-btn" onclick="UI.saveMiniDiningEntry('${id}')">저장</button>
            </div>
        `;
        
        this.openModal(html);
    },
    
    toggleDiningRecipeType(type, nameVal, id) {
        const currentName = document.getElementById('dining-name').value;
        if (window._tempDiningData.recipeType !== type) {
            window._tempDiningData.recipeType = type;
            window._tempDiningData.recipe = null;
        }
        this._renderDiningFormModal(currentName || nameVal, id === 'null' ? null : id);
    },
    
    async uploadDiningFile(inputEl, field, nameVal, id) {
        const file = inputEl.files[0];
        if (!file) return;
        
        const currentName = document.getElementById('dining-name').value;
        
        // Show loading state
        const parentBox = inputEl.closest('.file-preview-box');
        if (parentBox) {
            parentBox.innerHTML = `<div style="padding:10px; color:var(--text-secondary);">업로드 중...</div>`;
        }
        
        try {
            if (file.type.startsWith('image/')) {
                const compressedBase64 = await this.compressImage(file, 800);
                window._tempDiningData[field] = compressedBase64;
            } else if (file.type === 'application/pdf') {
                if (file.size > 300 * 1024) {
                    alert('PDF 파일이 너무 큽니다. Firestore 용량 확보를 위해 300KB 이하의 파일을 권장합니다.');
                }
                const base64Pdf = await this.readFileAsDataURL(file);
                window._tempDiningData[field] = base64Pdf;
            } else {
                alert('이미지 또는 PDF 파일만 업로드할 수 있습니다.');
            }
        } catch (e) {
            console.error('File load error:', e);
            alert('파일을 불러오는 도중 오류가 발생했습니다.');
        }
        
        this._renderDiningFormModal(currentName || nameVal, id === 'null' ? null : id);
    },
    
    deleteDiningTempFile(field, nameVal, id) {
        const currentName = document.getElementById('dining-name').value;
        window._tempDiningData[field] = null;
        this._renderDiningFormModal(currentName || nameVal, id === 'null' ? null : id);
    },
    
    saveMiniDiningEntry(id) {
        const name = document.getElementById('dining-name').value.trim();
        if (!name) return alert('요리 이름을 입력해 주세요.');
        
        const data = window._tempDiningData;
        
        let recipeVal = data.recipe;
        if (data.recipeType === 'text') {
            const txtArea = document.getElementById('dining-recipe-text');
            recipeVal = txtArea ? txtArea.value.trim() : '';
        }
        
        const entryData = {
            name: name,
            photo: data.photo,
            menuCard: data.menuCard,
            recipe: recipeVal
        };
        
        store.saveMiniDiningEntry(id === 'null' ? null : id, entryData);
        this.closeModal();
        this.renderDiningView();
    },

    showDiningDetailModal(id) {
        const entry = store.getMiniDiningList().find(e => e.id === id);
        if (!entry) return;
        
        const bigPhotoHtml = entry.photo
            ? `<img class="dining-detail-img" src="${entry.photo}" alt="${entry.name}">`
            : `<div class="dining-card-no-img" style="height:180px; border-radius:12px; margin-bottom:16px;"><span class="material-icons-round" style="font-size:36px;">restaurant</span>사진 없음</div>`;
            
        let menuCardHtml = '<p style="color:var(--text-secondary); font-size:13px; text-align:center; padding:10px 0;">등록된 메뉴판이 없습니다.</p>';
        if (entry.menuCard) {
            if (entry.menuCard.startsWith('data:application/pdf')) {
                menuCardHtml = `
                    <div style="text-align:center; padding:15px 0;">
                        <span class="material-icons-round" style="font-size:48px; color:#ff9800; margin-bottom:8px;">picture_as_pdf</span>
                        <p style="font-weight:600; margin-bottom:12px; font-size:14px;">PDF 메뉴판</p>
                        <a href="${entry.menuCard}" target="_blank" class="primary-btn" style="width:auto; display:inline-flex; padding:8px 16px; font-size:13px;">메뉴판 PDF 파일 열기</a>
                    </div>
                `;
            } else {
                menuCardHtml = `<img src="${entry.menuCard}" style="width:100%; max-height:350px; object-fit:contain; border-radius:8px; border:1px solid var(--border-color); display:block; margin:0 auto;">`;
            }
        }
        
        let recipeHtml = '<p style="color:var(--text-secondary); font-size:13px; text-align:center; padding:10px 0;">등록된 레시피가 없습니다.</p>';
        if (entry.recipe) {
            if (entry.recipe.startsWith('data:application/pdf')) {
                recipeHtml = `
                    <div style="text-align:center; padding:15px 0;">
                        <span class="material-icons-round" style="font-size:48px; color:#ff9800; margin-bottom:8px;">picture_as_pdf</span>
                        <p style="font-weight:600; margin-bottom:12px; font-size:14px;">PDF 레시피</p>
                        <a href="${entry.recipe}" target="_blank" class="primary-btn" style="width:auto; display:inline-flex; padding:8px 16px; font-size:13px;">레시피 PDF 파일 열기</a>
                    </div>
                `;
            } else if (entry.recipe.startsWith('data:image/')) {
                recipeHtml = `<img src="${entry.recipe}" style="width:100%; max-height:350px; object-fit:contain; border-radius:8px; border:1px solid var(--border-color); display:block; margin:0 auto;">`;
            } else {
                recipeHtml = `
                    <div style="background:var(--surface-light); padding:16px; border-radius:10px; font-size:14px; line-height:1.6; white-space:pre-wrap; border:1px solid var(--border-color); max-height:300px; overflow-y:auto;">${entry.recipe}</div>
                `;
            }
        }
        
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0;">${entry.name}</h3>
                <div style="display:flex; gap:6px;">
                    <button class="secondary-btn" style="width:auto; padding:6px 12px; font-size:12px; height:32px;" onclick="UI.showDiningEntryModal('${entry.id}')">수정</button>
                    <button class="secondary-btn" style="width:auto; padding:6px 12px; font-size:12px; height:32px; color:#ff5252; border-color:#ff5252;" onclick="UI.deleteMiniDiningEntry('${entry.id}')">삭제</button>
                </div>
            </div>
            
            <div style="max-height:62vh; overflow-y:auto; padding-right:4px;">
                ${bigPhotoHtml}
                
                <div class="dining-detail-section">
                    <div class="dining-section-title"><span class="material-icons-round" style="font-size:18px;">receipt_long</span>메뉴판</div>
                    ${menuCardHtml}
                </div>
                
                <div class="dining-detail-section">
                    <div class="dining-section-title"><span class="material-icons-round" style="font-size:18px;">menu_book</span>레시피 및 조리법</div>
                    ${recipeHtml}
                </div>
            </div>
            
            <button class="secondary-btn" style="margin-top:20px;" onclick="UI.closeModal()">닫기</button>
        `;
        
        this.openModal(html);
    },
    
    deleteMiniDiningEntry(id) {
        if (confirm('이 요리 정보를 삭제하시겠습니까?')) {
            store.deleteMiniDiningEntry(id);
            this.closeModal();
            this.renderDiningView();
        }
    },

    // ==========================================
    // App Version & Update Release Notes Modal
    // ==========================================
    checkVersionUpdateNotice() {
        const lastSeen = localStorage.getItem('mamma_seen_version');
        if (lastSeen !== APP_VERSION) {
            // Delay slightly so the UI finishes loading smoothly
            setTimeout(() => {
                this.showReleaseNotesModal(false);
            }, 300);
        }
    },

    showReleaseNotesModal(isManual = false) {
        const notes = RELEASE_NOTES;
        let itemsHtml = '';
        
        notes.items.forEach(item => {
            const badgeBg = item.type === 'new' ? '#e3f2fd' : '#e8f5e9';
            const badgeColor = item.type === 'new' ? '#1976d2' : '#2e7d32';
            itemsHtml += `
                <div style="background:var(--surface-color); border:1px solid var(--border-color); border-radius:10px; padding:14px; margin-bottom:10px; text-align:left;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:11px; font-weight:700; background:${badgeBg}; color:${badgeColor}; padding:2px 8px; border-radius:4px;">${item.tag}</span>
                        <strong style="font-size:14px;">${item.title}</strong>
                    </div>
                    <p style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin:0;">${item.desc}</p>
                </div>
            `;
        });

        const actionBtnHtml = isManual
            ? `<button class="primary-btn" onclick="UI.closeModal()">닫기</button>`
            : `
                <button class="primary-btn" onclick="UI.dismissUpdateNotice()">확인 (다시 보지 않기)</button>
              `;

        const html = `
            <div style="text-align:center; margin-bottom:16px;">
                <div style="font-size:36px; margin-bottom:6px;">🎉</div>
                <h3 style="margin-bottom:4px;">${notes.title}</h3>
                <div style="font-size:12px; color:var(--text-secondary);">버전 ${notes.version} (${notes.date})</div>
            </div>
            
            <div style="max-height:55vh; overflow-y:auto; padding-right:4px; margin-bottom:16px;">
                ${itemsHtml}
            </div>

            ${actionBtnHtml}
        `;

        this.openModal(html);
    },

    dismissUpdateNotice() {
        localStorage.setItem('mamma_seen_version', APP_VERSION);
        this.closeModal();
    },

    showUpdateBanner() {
        if (document.getElementById('pwa-update-banner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--surface-color);
            border: 1px solid #4caf50;
            color: var(--text-primary);
            padding: 12px 18px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            font-size: 13px;
        `;
        banner.innerHTML = `
            <span class="material-icons-round" style="color:#4caf50; font-size:20px;">update</span>
            <span>새로운 업데이트가 적용 가능합니다!</span>
            <button class="primary-btn" style="width:auto; padding:6px 12px; font-size:12px;" onclick="window.location.reload()">새로고침</button>
        `;
        document.body.appendChild(banner);
    }
};

window.UI = UI;
export { UI };
