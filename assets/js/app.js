/**
 * Life Planner Application
 * Main JavaScript file with improved structure and optimizations
 */

// Application State Management
class AppState {
    constructor() {
        this.tasks = [];
        this.currentPage = 'dashboard';
        this.sidebarOpen = window.innerWidth > 768;
        this.currentFilter = 'all';
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.editingTask = null;
        this.isLoading = false;
        this.settings = {};
        this.lastSyncTime = 0;
        this.isDirty = false; // Flag para indicar se há mudanças não salvas
    }

    setState(newState) {
        Object.assign(this, newState);
        this.isDirty = true;
        this.debouncedSave();
    }

    // Debounced save para evitar salvamentos excessivos
    debouncedSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            if (this.isDirty) {
                this.saveToLocalStorage();
                this.isDirty = false;
            }
        }, 500);
    }

    saveToLocalStorage() {
        try {
            const stateToSave = {
                tasks: this.tasks,
                currentFilter: this.currentFilter,
                sidebarOpen: this.sidebarOpen,
                currentPage: this.currentPage,
                currentMonth: this.currentMonth,
                currentYear: this.currentYear,
                settings: this.settings,
                lastSyncTime: Date.now()
            };
            localStorage.setItem('lifeplannerState', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('lifeplannerState');
            if (saved) {
                const state = JSON.parse(saved);
                this.tasks = state.tasks || [];
                this.currentFilter = state.currentFilter || 'all';
                this.sidebarOpen = state.sidebarOpen !== undefined ? state.sidebarOpen : this.sidebarOpen;
                this.currentPage = state.currentPage || 'dashboard';
                this.currentMonth = state.currentMonth !== undefined ? state.currentMonth : new Date().getMonth();
                this.currentYear = state.currentYear || new Date().getFullYear();
                this.settings = state.settings || {};
                this.lastSyncTime = state.lastSyncTime || 0;
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }

    // Método para invalidar cache quando necessário
    invalidateCache() {
        TaskManager.cachedTasks = null;
        TaskManager.lastCacheTime = 0;
        DOMManager.clearCache();
    }
}

// Initialize application state
const appState = new AppState();

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
};

// Utility Functions
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
};

// DOM Management
class DOMManager {
    static elementCache = new Map();
    static queryCache = new Map();
    static CACHE_EXPIRY = 30000; // 30 segundos
    
    static getElement(selector) {
        // Cache mais agressivo para elementos que não mudam
        const cacheKey = `single_${selector}`;
        const cached = this.elementCache.get(cacheKey);
        
        if (cached && cached.timestamp > Date.now() - this.CACHE_EXPIRY) {
            return cached.element;
        }
        
        const element = document.querySelector(selector);
        if (element) {
            this.elementCache.set(cacheKey, {
                element,
                timestamp: Date.now()
            });
        }
        return element;
    }

    static getAllElements(selector) {
        // Cache para NodeLists
        const cacheKey = `all_${selector}`;
        const cached = this.queryCache.get(cacheKey);
        
        if (cached && cached.timestamp > Date.now() - this.CACHE_EXPIRY) {
            return cached.elements;
        }
        
        const elements = document.querySelectorAll(selector);
        this.queryCache.set(cacheKey, {
            elements,
            timestamp: Date.now()
        });
        return elements;
    }

    static createElement(tag, className = '', content = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.textContent = content;
        return element;
    }

    static show(element) {
        if (element) element.style.display = 'block';
    }

    static hide(element) {
        if (element) element.style.display = 'none';
    }

    static toggle(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    static clearCache() {
        this.elementCache.clear();
        this.queryCache.clear();
    }

    // Método otimizado para batch updates
    static batchUpdate(updates) {
        // Usar requestAnimationFrame para otimizar updates
        requestAnimationFrame(() => {
            updates.forEach(update => {
                const { element, property, value } = update;
                if (element && property) {
                    element[property] = value;
                }
            });
        });
    }
}

// API Service
class APIService {
    static async request(endpoint, options = {}) {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: API_CONFIG.TIMEOUT,
            ...options
        };

        try {
            appState.setState({ isLoading: true });
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            // Fallback to localStorage for offline functionality
            return this.handleOfflineMode(endpoint, options);
        } finally {
            appState.setState({ isLoading: false });
        }
    }

    static handleOfflineMode(endpoint, options) {
        console.log('Working in offline mode');
        // Return mock data or use localStorage
        if (endpoint === '/tasks' && options.method === 'GET') {
            return { tasks: appState.tasks };
        }
        return null;
    }

    static async getTasks() {
        const response = await this.request('/tasks');
        return response?.tasks || appState.tasks;
    }

    static async createTask(taskData) {
        const task = {
            id: Utils.generateId(),
            ...taskData,
            createdAt: new Date().toISOString(),
            completed: false
        };

        try {
            await this.request('/tasks', {
                method: 'POST',
                body: JSON.stringify(task)
            });
        } catch (error) {
            console.log('Adding task offline');
        }

        appState.tasks.push(task);
        appState.saveToLocalStorage();
        return task;
    }

    static async updateTask(taskId, updates) {
        try {
            await this.request(`/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.log('Updating task offline');
        }

        const taskIndex = appState.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            appState.tasks[taskIndex] = { ...appState.tasks[taskIndex], ...updates };
            appState.saveToLocalStorage();
        }
    }

    static async deleteTask(taskId) {
        try {
            await this.request(`/tasks/${taskId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.log('Deleting task offline');
        }

        appState.tasks = appState.tasks.filter(t => t.id !== taskId);
        appState.saveToLocalStorage();
    }
}

// Task Manager
class TaskManager {
    static cachedTasks = null;
    static lastCacheTime = 0;
    static CACHE_DURATION = 2000; // Reduzido para 2 segundos
    static renderQueue = [];
    static isRendering = false;

    // Método para limpar cache quando necessário
    static clearCache() {
        this.cachedTasks = null;
        this.lastCacheTime = 0;
    }

    static getFilteredTasks() {
        // Cache mais eficiente para filtros
        const cacheKey = `filtered_${appState.currentFilter}`;
        const now = Date.now();
        
        if (this.cachedTasks && this.cachedTasks[cacheKey] && 
            (now - this.lastCacheTime) < this.CACHE_DURATION) {
            return this.cachedTasks[cacheKey];
        }

        const filter = appState.currentFilter || 'all';
        let tasks = appState.tasks || [];
        let filtered;

        switch (filter) {
            case 'pending':
                filtered = tasks.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = tasks.filter(task => task.completed);
                break;
            case 'high':
                filtered = tasks.filter(task => task.priority === 'high');
                break;
            case 'medium':
                filtered = tasks.filter(task => task.priority === 'medium');
                break;
            case 'low':
                filtered = tasks.filter(task => task.priority === 'low');
                break;
            case 'overdue':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                filtered = tasks.filter(task => 
                    !task.completed && task.dueDate && new Date(task.dueDate) < today
                );
                break;
            default:
                filtered = tasks;
        }

        // Inicializar cache se não existir
        if (!this.cachedTasks) {
            this.cachedTasks = {};
        }
        
        this.cachedTasks[cacheKey] = filtered;
        this.lastCacheTime = now;
        return filtered;
    }

    static renderTasks() {
        // Evitar renderizações simultâneas
        if (this.isRendering) {
            this.renderQueue.push('tasks');
            return;
        }

        this.isRendering = true;
        
        // Usar requestAnimationFrame para melhor performance
        requestAnimationFrame(() => {
            const tasksList = DOMManager.getElement('#tasks-list');
            if (!tasksList) {
                this.isRendering = false;
                return;
            }

            const filteredTasks = this.getFilteredTasks();
            
            if (filteredTasks.length === 0) {
                tasksList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tasks"></i>
                        <h3>Nenhuma tarefa encontrada</h3>
                        <p>Crie sua primeira tarefa para começar!</p>
                    </div>
                `;
                this.isRendering = false;
                this.processQueue();
                return;
            }

            // Usar DocumentFragment para melhor performance
            const fragment = document.createDocumentFragment();
            
            // Renderizar em lotes para não bloquear a UI
            const batchSize = 10;
            let index = 0;
            
            const renderBatch = () => {
                const endIndex = Math.min(index + batchSize, filteredTasks.length);
                
                for (let i = index; i < endIndex; i++) {
                    const taskElement = this.createTaskElement(filteredTasks[i]);
                    fragment.appendChild(taskElement);
                }
                
                index = endIndex;
                
                if (index < filteredTasks.length) {
                    // Continuar no próximo frame
                    requestAnimationFrame(renderBatch);
                } else {
                    // Finalizar renderização
                    tasksList.innerHTML = '';
                    tasksList.appendChild(fragment);
                    this.isRendering = false;
                    this.processQueue();
                }
            };
            
            renderBatch();
        });
    }

    static processQueue() {
        if (this.renderQueue.length > 0) {
            const next = this.renderQueue.shift();
            if (next === 'tasks') {
                this.renderTasks();
            } else if (next === 'recent') {
                this.renderRecentTasks();
            }
        }
    }

    static renderRecentTasks() {
        if (this.isRendering) {
            this.renderQueue.push('recent');
            return;
        }

        const recentTasksList = DOMManager.getElement('.recent-tasks');
        if (!recentTasksList) return;

        // Cache mais específico para tarefas recentes
        const now = Date.now();
        const cacheKey = 'recent_tasks';
        
        if (this.cachedTasks && this.cachedTasks[cacheKey] && 
            (now - this.lastCacheTime) < this.CACHE_DURATION) {
            return;
        }

        const recentTasks = appState.tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const fragment = document.createDocumentFragment();
        recentTasks.forEach(task => {
            const taskElement = this.createTaskElement(task, true);
            fragment.appendChild(taskElement);
        });

        recentTasksList.innerHTML = '';
        recentTasksList.appendChild(fragment);
        
        if (!this.cachedTasks) {
            this.cachedTasks = {};
        }
        this.cachedTasks[cacheKey] = recentTasks;
        this.lastCacheTime = now;
    }

    static createTaskElement(task, isRecent = false) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-card ${task.completed ? 'completed' : ''}`;
        taskDiv.dataset.taskId = task.id;
        
        const priorityClass = `priority-${task.priority}`;
        
        taskDiv.innerHTML = `
            <div class="task-header">
                <div>
                    <h3 class="task-title">${Utils.sanitizeInput(task.title)}</h3>
                    <span class="task-priority ${priorityClass}">
                        ${this.getPriorityText(task.priority)}
                    </span>
                </div>
                <div class="task-actions">
                    <button class="task-action complete" data-task-id="${task.id}" data-action="toggle"
                            title="${task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}">
                        <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                    </button>
                    ${!isRecent ? `
                        <button class="task-action edit" data-task-id="${task.id}" data-action="edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-action delete" data-task-id="${task.id}" data-action="delete" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            ${task.description ? `<p class="task-description">${Utils.sanitizeInput(task.description)}</p>` : ''}
            <div class="task-meta">
                <span class="task-date">
                    <i class="fas fa-calendar"></i>
                    ${task.dueDate ? Utils.formatDate(task.dueDate) : 'Sem prazo'}
                </span>
            </div>
        `;
        
        return taskDiv;
    }

    static createTaskHTML(task, isRecent = false) {
        const priorityClass = `priority-${task.priority}`;
        const completedClass = task.completed ? 'completed' : '';
        
        return `
            <div class="task-card ${completedClass}" data-task-id="${task.id}">
                <div class="task-header">
                    <div>
                        <h3 class="task-title">${Utils.sanitizeInput(task.title)}</h3>
                        <span class="task-priority ${priorityClass}">
                            ${this.getPriorityText(task.priority)}
                        </span>
                    </div>
                    <div class="task-actions">
                        <button class="task-action complete" onclick="TaskManager.toggleComplete('${task.id}')" 
                                title="${task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}">
                            <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                        </button>
                        ${!isRecent ? `
                            <button class="task-action edit" onclick="TaskManager.editTask('${task.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="task-action delete" onclick="TaskManager.confirmDelete('${task.id}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${Utils.sanitizeInput(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="task-date">
                        <i class="fas fa-calendar"></i>
                        ${task.dueDate ? Utils.formatDate(task.dueDate) : 'Sem prazo'}
                    </span>
                </div>
            </div>
        `;
    }

    static getPriorityText(priority) {
        const priorities = {
            high: 'Alta',
            medium: 'Média',
            low: 'Baixa'
        };
        return priorities[priority] || priority;
    }

    static async toggleComplete(taskId) {
        const task = appState.tasks.find(t => t.id === taskId);
        if (!task) return;

        await APIService.updateTask(taskId, { completed: !task.completed });
        this.renderTasks();
        this.renderRecentTasks();
        StatsManager.updateStats();
        
        NotificationManager.show(
            task.completed ? 'Tarefa marcada como pendente' : 'Tarefa concluída!',
            'success'
        );
    }

    static editTask(taskId) {
        const task = appState.tasks.find(t => t.id === taskId);
        if (!task) return;

        appState.setState({ editingTask: task });
        ModalManager.openTaskModal(task);
    }

    static confirmDelete(taskId) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            this.deleteTask(taskId);
        }
    }

    static async deleteTask(taskId) {
        await APIService.deleteTask(taskId);
        this.renderTasks();
        this.renderRecentTasks();
        StatsManager.updateStats();
        NotificationManager.show('Tarefa excluída com sucesso', 'success');
    }

    static setFilter(filter) {
        // Limpar cache quando filtro muda
        TaskManager.cachedTasks = null;
        
        appState.setState({ currentFilter: filter });
        
        // Atualizar UI do filtro ativo
        DOMManager.getAllElements('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = DOMManager.getElement(`[data-filter="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Usar requestAnimationFrame para renderização suave
        requestAnimationFrame(() => {
            this.renderTasks();
        });
    }
}

// Modal Manager
class ModalManager {
    static openTaskModal(task = null) {
        const modal = DOMManager.getElement('#task-modal');
        const form = DOMManager.getElement('#task-form');
        const title = DOMManager.getElement('#modal-title');
        
        if (!modal || !form || !title) return;

        // Reset form
        form.reset();
        
        if (task) {
            title.textContent = 'Editar Tarefa';
            DOMManager.getElement('#task-title').value = task.title;
            DOMManager.getElement('#task-description').value = task.description || '';
            DOMManager.getElement('#task-priority').value = task.priority;
            DOMManager.getElement('#task-due-date').value = task.dueDate || '';
        } else {
            title.textContent = 'Nova Tarefa';
            appState.setState({ editingTask: null });
        }

        modal.classList.add('show');
        DOMManager.getElement('#task-title')?.focus();
    }

    static closeTaskModal() {
        const modal = DOMManager.getElement('#task-modal');
        if (modal) {
            modal.classList.remove('show');
            appState.setState({ editingTask: null });
        }
    }

    static async handleTaskSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const taskData = {
            title: formData.get('title')?.trim(),
            description: formData.get('description')?.trim(),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate')
        };

        console.log('Form data captured:', taskData); // Debug log

        // Validation
        if (!taskData.title) {
            NotificationManager.show('Título é obrigatório', 'error');
            return;
        }

        try {
            if (appState.editingTask) {
                await APIService.updateTask(appState.editingTask.id, taskData);
                NotificationManager.show('Tarefa atualizada com sucesso', 'success');
            } else {
                const newTask = await APIService.createTask(taskData);
                console.log('Task created successfully:', newTask); // Debug log
                NotificationManager.show('Tarefa criada com sucesso', 'success');
            }

            TaskManager.renderTasks();
            TaskManager.renderRecentTasks();
            StatsManager.updateStats();
            ModalManager.closeTaskModal();
        } catch (error) {
            console.error('Error saving task:', error); // Better error logging
            NotificationManager.show('Erro ao salvar tarefa: ' + error.message, 'error');
        }
    }
}

// Statistics Manager
class StatsManager {
    static updateStats() {
        const { tasks } = appState;
        
        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.completed).length,
            pending: tasks.filter(t => !t.completed).length,
            highPriority: tasks.filter(t => t.priority === 'high' && !t.completed).length
        };

        // Update DOM elements
        const elements = {
            '#total-tasks': stats.total,
            '#completed-tasks': stats.completed,
            '#pending-tasks': stats.pending,
            '#high-priority-tasks': stats.highPriority
        };

        Object.entries(elements).forEach(([selector, value]) => {
            const element = DOMManager.getElement(selector);
            if (element) element.textContent = value;
        });
    }
}

// Navigation Manager
class NavigationManager {
    static showPage(pageName) {
        // Hide all pages
        DOMManager.getAllElements('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = DOMManager.getElement(`#${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            appState.setState({ currentPage: pageName });
        }

        // Update page-specific content
        this.updatePageContent(pageName);
    }

    static updatePageContent(pageName) {
        switch (pageName) {
            case 'dashboard':
                StatsManager.updateStats();
                TaskManager.renderRecentTasks();
                break;
            case 'tasks':
                TaskManager.renderTasks();
                break;
            case 'calendar':
                CalendarManager.renderCalendar();
                break;
            case 'settings':
                SettingsManager.loadSettings();
                break;
        }
    }

    static setActiveNavItem(activeItem) {
        DOMManager.getAllElements('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        if (activeItem) activeItem.classList.add('active');
    }

    static toggleSidebar() {
        const sidebar = DOMManager.getElement('.sidebar');
        const content = DOMManager.getElement('.content');
        
        if (sidebar && content) {
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            sidebar.classList.toggle('collapsed');
            content.classList.toggle('sidebar-collapsed');
            
            appState.setState({ sidebarOpen: isCollapsed });
        }
    }
}

// Calendar Manager
class CalendarManager {
    static renderCalendar() {
        const calendarGrid = DOMManager.getElement('.calendar-grid');
        const monthYear = DOMManager.getElement('#current-month');
        
        if (!calendarGrid) return;

        const { currentMonth, currentYear } = appState;
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        if (monthYear) {
            monthYear.textContent = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
            });
        }

        let calendarHTML = '';
        
        // Day headers
        const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dayHeaders.forEach(day => {
            calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        // Calendar days
        const currentDate = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const isCurrentMonth = currentDate.getMonth() === currentMonth;
            const isToday = this.isToday(currentDate);
            const dayTasks = this.getTasksForDate(currentDate);

            calendarHTML += `
                <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    <div class="day-tasks">
                        ${dayTasks.map(task => `
                            <div class="day-task" title="${Utils.sanitizeInput(task.title)}">
                                ${Utils.sanitizeInput(task.title)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        calendarGrid.innerHTML = calendarHTML;
    }

    static isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    static getTasksForDate(date) {
        return appState.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === date.toDateString();
        });
    }

    static changeMonth(direction) {
        const { currentMonth, currentYear } = appState;
        let newMonth = currentMonth + direction;
        let newYear = currentYear;

        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }

        appState.setState({ currentMonth: newMonth, currentYear: newYear });
        this.renderCalendar();
    }
}

// Settings Manager
class SettingsManager {
    static loadSettings() {
        const settings = this.getSettings();
        
        // Update toggle switches
        Object.entries(settings).forEach(([key, value]) => {
            const toggle = DOMManager.getElement(`#${key}-toggle`);
            if (toggle) {
                toggle.classList.toggle('active', value);
            }
        });
    }

    static getSettings() {
        try {
            const settings = localStorage.getItem('lifeplannerSettings');
            return settings ? JSON.parse(settings) : {
                notifications: true,
                darkMode: true,
                autoSave: true
            };
        } catch (error) {
            console.warn('Failed to load settings:', error);
            return { notifications: true, darkMode: true, autoSave: true };
        }
    }

    static saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        
        try {
            localStorage.setItem('lifeplannerSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    static handleToggle(e) {
        const toggle = e.target.closest('.toggle-switch');
        if (!toggle) return;

        const setting = toggle.id.replace('-toggle', '');
        const isActive = toggle.classList.contains('active');
        
        toggle.classList.toggle('active');
        this.saveSetting(setting, !isActive);
        
        NotificationManager.show(
            `${setting} ${!isActive ? 'ativado' : 'desativado'}`,
            'info'
        );
    }
}

// Notification Manager
class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        const notification = DOMManager.createElement('div', `notification ${type}`, message);
        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
}

// Event Listeners Setup with Performance Optimizations
class EventManager {
    // Debounced functions para evitar execuções excessivas
    static debounceTimers = new Map();
    
    static debounce(func, delay, key) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    static setupEventListeners() {
        // Menu toggle - com debounce
        const menuToggle = DOMManager.getElement('#menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.debounce(() => {
                    NavigationManager.toggleSidebar();
                }, 100, 'menu-toggle');
            });
        }

        // Navigation - com debounce
        DOMManager.getAllElements('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const page = this.dataset.page;
                EventManager.debounce(() => {
                    NavigationManager.showPage(page);
                    NavigationManager.setActiveNavItem(this);
                }, 150, `nav-${page}`);
            });
        });

        // Add task button - com debounce
        const addTaskBtn = DOMManager.getElement('#add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                this.debounce(() => {
                    ModalManager.openTaskModal();
                }, 200, 'add-task');
            });
        }

        // Task filters - com debounce mais agressivo
        DOMManager.getAllElements('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.dataset.filter;
                EventManager.debounce(() => {
                    TaskManager.setFilter(filter);
                }, 250, 'filter-change');
            });
        });

        // Modal close buttons - com debounce
        DOMManager.getAllElements('.close-btn, #cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.debounce(() => {
                    ModalManager.closeTaskModal();
                }, 100, 'close-modal');
            });
        });

        // Task form submission - com debounce
        const taskForm = DOMManager.getElement('#task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.debounce(() => {
                    ModalManager.handleTaskSubmit(e);
                }, 300, 'save-task');
            });
        }

        // Calendar navigation - com debounce
        const prevMonthBtn = DOMManager.getElement('#prev-month');
        const nextMonthBtn = DOMManager.getElement('#next-month');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.debounce(() => {
                    CalendarManager.changeMonth(-1);
                }, 200, 'prev-month');
            });
        }
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.debounce(() => {
                    CalendarManager.changeMonth(1);
                }, 200, 'next-month');
            });
        }

        // Settings toggles - com debounce
        DOMManager.getAllElements('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                this.debounce(() => {
                    SettingsManager.handleToggle(e);
                }, 200, 'settings-toggle');
            });
        });

        // Modal backdrop click - sem debounce para responsividade
        const modal = DOMManager.getElement('#task-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    ModalManager.closeTaskModal();
                }
            });
        }

        // Event delegation para ações de tarefas - otimizado com debounce
        const tasksContainer = DOMManager.getElement('#tasks-list');
        if (tasksContainer) {
            tasksContainer.addEventListener('click', function(e) {
                const button = e.target.closest('.task-action');
                if (!button) return;
                
                const taskId = button.dataset.taskId;
                const action = button.dataset.action;
                
                // Usar debounce para ações de tarefa
                switch (action) {
                    case 'toggle':
                        EventManager.debounce(() => {
                            TaskManager.toggleComplete(taskId);
                        }, 150, `toggle-${taskId}`);
                        break;
                    case 'edit':
                        EventManager.debounce(() => {
                            TaskManager.editTask(taskId);
                        }, 150, `edit-${taskId}`);
                        break;
                    case 'delete':
                        EventManager.debounce(() => {
                            TaskManager.confirmDelete(taskId);
                        }, 150, `delete-${taskId}`);
                        break;
                }
            });
        }

        // Event delegation para tarefas recentes - com debounce
        const recentTasksContainer = DOMManager.getElement('.recent-tasks');
        if (recentTasksContainer) {
            recentTasksContainer.addEventListener('click', function(e) {
                const button = e.target.closest('.task-action');
                if (!button) return;
                
                const taskId = button.dataset.taskId;
                const action = button.dataset.action;
                
                if (action === 'toggle') {
                    EventManager.debounce(() => {
                        TaskManager.toggleComplete(taskId);
                    }, 150, `recent-toggle-${taskId}`);
                }
            });
        }

        // Keyboard shortcuts - sem debounce para responsividade
        document.addEventListener('keydown', function(e) {
            // ESC to close modal
            if (e.key === 'Escape') {
                ModalManager.closeTaskModal();
            }
            
            // Ctrl+N to add new task
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                ModalManager.openTaskModal();
            }
        });

        // Responsive sidebar com debounce otimizado
        const debouncedResize = Utils.debounce(() => {
            if (window.innerWidth <= 768) {
                const sidebar = DOMManager.getElement('.sidebar');
                const content = DOMManager.getElement('.content');
                
                if (sidebar && content) {
                    sidebar.classList.add('collapsed');
                    content.classList.add('sidebar-collapsed');
                }
            }
        }, 100); // Reduzido para 100ms para melhor responsividade
        
        window.addEventListener('resize', debouncedResize);
    }
}

// Função de compatibilidade
function setupEventListeners() {
    EventManager.setupEventListeners();
}

// Application Initialization
async function initializeApp() {
    try {
        // Load saved state
        appState.loadFromLocalStorage();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load tasks
        const tasks = await APIService.getTasks();
        appState.setState({ tasks });
        
        // Initialize UI
        NavigationManager.showPage('dashboard');
        StatsManager.updateStats();
        TaskManager.renderRecentTasks();
        CalendarManager.renderCalendar();
        SettingsManager.loadSettings();
        
        // Set initial sidebar state
        const sidebar = DOMManager.getElement('.sidebar');
        const content = DOMManager.getElement('.content');
        
        if (sidebar && content) {
            if (!appState.sidebarOpen || window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
                content.classList.add('sidebar-collapsed');
            }
        }
        
        console.log('Life Planner initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        NotificationManager.show('Erro ao inicializar aplicação', 'error');
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for global access (if needed)
window.LifePlanner = {
    TaskManager,
    ModalManager,
    NavigationManager,
    CalendarManager,
    SettingsManager,
    NotificationManager,
    appState
};