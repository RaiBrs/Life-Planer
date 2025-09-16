import React, { useState, useEffect } from 'react';
import { useTask } from '../context/TaskContext';
import { 
  CheckSquare, 
  Clock, 
  Calendar, 
  TrendingUp,
  Plus,
  Filter
} from 'lucide-react';
import TaskCard from '../components/TaskCard';
import './Dashboard.css';

function Dashboard() {
  const { 
    tasks, 
    loading, 
    error, 
    getFilteredTasks,
    createTask 
  } = useTask();

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pendente'
  });

  // Estatísticas das tarefas
  const getStats = () => {
    const allTasks = tasks || [];
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: allTasks.length,
      pendentes: allTasks.filter(task => task.status === 'pendente').length,
      concluidas: allTasks.filter(task => task.status === 'concluida').length,
      emAndamento: allTasks.filter(task => task.status === 'em-andamento').length,
      hoje: allTasks.filter(task => 
        task.due_date && task.due_date.startsWith(today)
      ).length,
      atrasadas: allTasks.filter(task => 
        task.due_date && 
        new Date(task.due_date) < new Date() && 
        task.status !== 'concluida'
      ).length
    };
  };

  const stats = getStats();
  const recentTasks = getFilteredTasks().slice(0, 5);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTask(newTask);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        status: 'pendente'
      });
      setShowNewTaskForm(false);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Erro ao carregar dashboard: {error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header do Dashboard */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Bem-vindo ao Life Planner</h1>
          <p>Gerencie suas tarefas e organize sua rotina</p>
        </div>
        
        <div className="dashboard-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewTaskForm(true)}
          >
            <Plus size={18} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total de Tarefas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.pendentes}</h3>
            <p>Pendentes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.concluidas}</h3>
            <p>Concluídas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon today">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.hoje}</h3>
            <p>Para Hoje</p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="dashboard-content">
        {/* Tarefas Recentes */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Tarefas Recentes</h2>
            <button className="btn btn-secondary btn-sm">
              <Filter size={16} />
              Filtrar
            </button>
          </div>
          
          <div className="tasks-list">
            {recentTasks.length > 0 ? (
              recentTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="empty-state">
                <CheckSquare size={48} />
                <h3>Nenhuma tarefa encontrada</h3>
                <p>Crie sua primeira tarefa para começar a organizar sua rotina</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowNewTaskForm(true)}
                >
                  <Plus size={18} />
                  Criar Primeira Tarefa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progresso Semanal */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Progresso Semanal</h2>
            <TrendingUp size={20} />
          </div>
          
          <div className="progress-card">
            <div className="progress-stats">
              <div className="progress-item">
                <span className="progress-label">Concluídas esta semana</span>
                <span className="progress-value">{stats.concluidas}</span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Taxa de conclusão</span>
                <span className="progress-value">
                  {stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${stats.total > 0 ? (stats.concluidas / stats.total) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Nova Tarefa */}
      {showNewTaskForm && (
        <div className="modal-overlay" onClick={() => setShowNewTaskForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Tarefa</h3>
              <button 
                className="modal-close"
                onClick={() => setShowNewTaskForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="task-form">
              <div className="form-group">
                <label htmlFor="title">Título *</label>
                <input
                  id="title"
                  type="text"
                  className="input"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Digite o título da tarefa"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  className="input textarea"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Descreva a tarefa (opcional)"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="due_date">Data de Entrega</label>
                <input
                  id="due_date"
                  type="datetime-local"
                  className="input"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowNewTaskForm(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;