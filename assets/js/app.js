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
    }

    setState(newState) {
        Object.assign(this, newState);
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('lifeplannerState', JSON.stringify({
                tasks: this.tasks,
                currentFilter: this.currentFilter,
                sidebarOpen: this.sidebarOpen
            }));
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
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
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
    static getElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }

    static getAllElements(selector) {
        return document.querySelectorAll(selector);
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
    static getFilteredTasks() {
        const { tasks, currentFilter } = appState;
        
        switch (currentFilter) {
            case 'completed':
                return tasks.filter(task => task.completed);
            case 'pending':
                return tasks.filter(task => !task.completed);
            case 'high':
                return tasks.filter(task => task.priority === 'high');
            case 'medium':
                return tasks.filter(task => task.priority === 'medium');
            case 'low':
                return tasks.filter(task => task.priority === 'low');
            default:
                return tasks;
        }
    }

    static renderTasks() {
        const tasksList = DOMManager.getElement('.tasks-list');
        if (!tasksList) return;

        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Nenhuma tarefa encontrada</h3>
                    <p>Crie sua primeira tarefa para começar!</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
    }

    static renderRecentTasks() {
        const recentTasksList = DOMManager.getElement('.recent-tasks');
        if (!recentTasksList) return;

        const recentTasks = appState.tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        recentTasksList.innerHTML = recentTasks.map(task => 
            this.createTaskHTML(task, true)
        ).join('');
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
        appState.setState({ currentFilter: filter });
        
        // Update filter buttons
        DOMManager.getAllElements('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTasks();
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
                await APIService.createTask(taskData);
                NotificationManager.show('Tarefa criada com sucesso', 'success');
            }

            TaskManager.renderTasks();
            TaskManager.renderRecentTasks();
            StatsManager.updateStats();
            this.closeTaskModal();
        } catch (error) {
            NotificationManager.show('Erro ao salvar tarefa', 'error');
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
        const monthYear = DOMManager.getElement('#current-month-year');
        
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

// Event Listeners Setup
function setupEventListeners() {
    // Menu toggle
    const menuToggle = DOMManager.getElement('#menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', NavigationManager.toggleSidebar);
    }

    // Navigation
    DOMManager.getAllElements('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            NavigationManager.showPage(page);
            NavigationManager.setActiveNavItem(this);
        });
    });

    // Add task button
    const addTaskBtn = DOMManager.getElement('#add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => ModalManager.openTaskModal());
    }

    // Task filters
    DOMManager.getAllElements('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            TaskManager.setFilter(this.dataset.filter);
        });
    });

    // Modal close buttons
    DOMManager.getAllElements('.close-btn, #cancel-btn').forEach(btn => {
        btn.addEventListener('click', ModalManager.closeTaskModal);
    });

    // Task form submission
    const taskForm = DOMManager.getElement('#task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', ModalManager.handleTaskSubmit);
    }

    // Calendar navigation
    const prevMonthBtn = DOMManager.getElement('#prev-month');
    const nextMonthBtn = DOMManager.getElement('#next-month');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => CalendarManager.changeMonth(-1));
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => CalendarManager.changeMonth(1));
    }

    // Settings toggles
    DOMManager.getAllElements('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', SettingsManager.handleToggle);
    });

    // Modal backdrop click
    const modal = DOMManager.getElement('#task-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                ModalManager.closeTaskModal();
            }
        });
    }

    // Keyboard shortcuts
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

    // Responsive sidebar
    window.addEventListener('resize', Utils.debounce(() => {
        if (window.innerWidth <= 768) {
            const sidebar = DOMManager.getElement('.sidebar');
            const content = DOMManager.getElement('.content');
            
            if (sidebar && content) {
                sidebar.classList.add('collapsed');
                content.classList.add('sidebar-collapsed');
            }
        }
    }, 250));
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