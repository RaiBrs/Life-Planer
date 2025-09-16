// Estado da aplicação
let appState = {
    tasks: [],
    currentPage: 'dashboard',
    sidebarOpen: true,
    currentFilter: 'all',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    editingTask: null
};

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadTasks();
    updateStats();
    renderCalendar();
    showPage('dashboard');
}

// Event Listeners
function setupEventListeners() {
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            showPage(page);
            setActiveNavItem(this);
        });
    });
    
    // Add task button
    document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
    
    // Task filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveFilter(this.dataset.filter);
        });
    });
    
    // Modal
    document.getElementById('modal-close').addEventListener('click', closeTaskModal);
    document.getElementById('cancel-btn').addEventListener('click', closeTaskModal);
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    
    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    
    // Settings
    document.getElementById('notifications-enabled').addEventListener('change', handleNotificationToggle);
    
    // Close modal on outside click
    document.getElementById('task-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeTaskModal();
        }
    });
}

// Navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageName}-page`).classList.add('active');
    appState.currentPage = pageName;
    
    // Update page-specific content
    if (pageName === 'tasks') {
        renderTasks();
    } else if (pageName === 'dashboard') {
        updateStats();
        renderRecentTasks();
    } else if (pageName === 'calendar') {
        renderCalendar();
    }
}

function setActiveNavItem(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    appState.sidebarOpen = !appState.sidebarOpen;
    
    if (appState.sidebarOpen) {
        sidebar.classList.remove('collapsed');
    } else {
        sidebar.classList.add('collapsed');
    }
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showNotification('Erro ao conectar com o servidor', 'error');
        return null;
    }
}

async function loadTasks() {
    const tasks = await apiRequest('/tasks');
    if (tasks) {
        appState.tasks = tasks;
        renderTasks();
        updateStats();
        renderRecentTasks();
    }
}

async function createTask(taskData) {
    const task = await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
    
    if (task) {
        appState.tasks.push(task);
        renderTasks();
        updateStats();
        showNotification('Tarefa criada com sucesso!', 'success');
    }
}

async function updateTask(taskId, taskData) {
    const task = await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
    });
    
    if (task) {
        const index = appState.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            appState.tasks[index] = task;
        }
        renderTasks();
        updateStats();
        showNotification('Tarefa atualizada com sucesso!', 'success');
    }
}

async function deleteTask(taskId) {
    const success = await apiRequest(`/tasks/${taskId}`, {
        method: 'DELETE'
    });
    
    if (success !== null) {
        appState.tasks = appState.tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateStats();
        showNotification('Tarefa excluída com sucesso!', 'success');
    }
}

async function toggleTaskComplete(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        const updatedTask = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...task,
                completed: !task.completed
            })
        });
        
        if (updatedTask) {
            const index = appState.tasks.findIndex(t => t.id === taskId);
            appState.tasks[index] = updatedTask;
            renderTasks();
            updateStats();
        }
    }
}

// Task Management
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    const filteredTasks = getFilteredTasks();
    
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
    
    tasksList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
}

function renderRecentTasks() {
    const recentTasksList = document.getElementById('recent-tasks-list');
    const recentTasks = appState.tasks
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    if (recentTasks.length === 0) {
        recentTasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>Nenhuma tarefa ainda</h3>
                <p>Suas tarefas recentes aparecerão aqui</p>
            </div>
        `;
        return;
    }
    
    recentTasksList.innerHTML = recentTasks.map(task => createTaskHTML(task, true)).join('');
}

function createTaskHTML(task, isRecent = false) {
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-actions">
                    <button onclick="toggleTaskComplete(${task.id})" title="${task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button onclick="editTask(${task.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="confirmDeleteTask(${task.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
                <span class="task-due-date">${dueDate}</span>
            </div>
        </div>
    `;
}

function getFilteredTasks() {
    let filtered = appState.tasks;
    
    switch (appState.currentFilter) {
        case 'pending':
            filtered = filtered.filter(task => !task.completed);
            break;
        case 'completed':
            filtered = filtered.filter(task => task.completed);
            break;
        case 'overdue':
            filtered = filtered.filter(task => {
                return task.due_date && 
                       new Date(task.due_date) < new Date() && 
                       !task.completed;
            });
            break;
    }
    
    return filtered.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return new Date(b.created_at) - new Date(a.created_at);
    });
}

function setActiveFilter(filter) {
    appState.currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderTasks();
}

function getPriorityText(priority) {
    const priorities = {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta'
    };
    return priorities[priority] || 'Média';
}

// Modal Management
function openTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const title = document.getElementById('modal-title');
    const dueDateInput = document.getElementById('task-due-date');
    
    // Definir data mínima como hoje
    const today = new Date().toISOString().split('T')[0];
    dueDateInput.min = today;
    
    appState.editingTask = task;
    
    if (task) {
        title.textContent = 'Editar Tarefa';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-due-date').value = task.due_date || '';
        document.getElementById('task-priority').value = task.priority;
    } else {
        title.textContent = 'Nova Tarefa';
        form.reset();
        // Manter a data mínima após reset
        dueDateInput.min = today;
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('active');
    appState.editingTask = null;
}

function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    
    if (!title) {
        alert('Por favor, insira um título para a tarefa.');
        return;
    }
    
    // Validar se a data não é anterior ao dia atual
    if (dueDate) {
        const today = new Date().toISOString().split('T')[0];
        if (dueDate < today) {
            alert('A data de vencimento não pode ser anterior ao dia atual.');
            return;
        }
    }
    
    const taskData = {
        title,
        description,
        due_date: dueDate,
        priority
    };
    
    if (appState.editingTask) {
        updateTask(appState.editingTask.id, taskData);
    } else {
        createTask(taskData);
    }
    
    closeTaskModal();
}

function editTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        openTaskModal(task);
    }
}

function confirmDeleteTask(taskId) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        deleteTask(taskId);
    }
}

// Statistics
async function updateStats() {
    const stats = await apiRequest('/stats');
    if (stats) {
        document.getElementById('total-tasks').textContent = stats.total_tasks;
        document.getElementById('completed-tasks').textContent = stats.completed_tasks;
        document.getElementById('pending-tasks').textContent = stats.pending_tasks;
        document.getElementById('overdue-tasks').textContent = stats.overdue_tasks;
    }
}

// Calendar
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    currentMonthElement.textContent = `${monthNames[appState.currentMonth]} ${appState.currentYear}`;
    
    const firstDay = new Date(appState.currentYear, appState.currentMonth, 1);
    const lastDay = new Date(appState.currentYear, appState.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    calendarGrid.innerHTML = days.map(day => {
        const isCurrentMonth = day.getMonth() === appState.currentMonth;
        const isToday = day.toDateString() === new Date().toDateString();
        const dayTasks = appState.tasks.filter(task => {
            return task.due_date && 
                   new Date(task.due_date).toDateString() === day.toDateString();
        });
        
        return `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                <div class="day-number">${day.getDate()}</div>
                ${dayTasks.map(task => `
                    <div class="calendar-task priority-${task.priority}" title="${task.title}">
                        ${task.title.substring(0, 15)}${task.title.length > 15 ? '...' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

function changeMonth(direction) {
    appState.currentMonth += direction;
    
    if (appState.currentMonth > 11) {
        appState.currentMonth = 0;
        appState.currentYear++;
    } else if (appState.currentMonth < 0) {
        appState.currentMonth = 11;
        appState.currentYear--;
    }
    
    renderCalendar();
}



function handleNotificationToggle(e) {
    const enabled = e.target.checked;
    localStorage.setItem('notifications', enabled);
    
    if (enabled && 'Notification' in window) {
        Notification.requestPermission();
    }
}

// Notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Carregar configurações salvas
function loadSettings() {
    // Carregar configuração de notificações
    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    const notificationToggle = document.getElementById('notifications-toggle');
    if (notificationToggle) {
        notificationToggle.checked = notificationsEnabled;
    }
}

// Initialize settings on load
document.addEventListener('DOMContentLoaded', loadSettings);