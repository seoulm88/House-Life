/**
 * Mamma UI Manager
 */
import { store } from './store.js';
import { MammaAI } from './ai.js';

const UI = {
    currentView: 'daily',
    currentDate: new Date().toISOString().split('T')[0],

    init() {
        this.mainContent = document.getElementById('main-content');
        this.headerTitle = document.getElementById('header-title');
        this.headerAction = document.getElementById('header-action');
        
        this.setupNavigation();
        this.renderView(this.currentView);
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const btn = e.target.closest('.nav-item');
                navItems.forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentView = btn.dataset.view;
                this.renderView(this.currentView);
            });
        });

        this.headerAction.addEventListener('click', () => {
            if (this.currentView === 'recipe') {
                this.showRecipeModal();
            } else if (this.currentView === 'daily') {
                this.showSyncModal();
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
    }
};

window.UI = UI;
export { UI };
