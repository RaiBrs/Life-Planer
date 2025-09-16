import React, { useState } from 'react';
import { useTask } from '../context/TaskContext';
import { 
  Plus, 
  Filter, 
  Search, 
  SortAsc, 
  SortDesc,
  CheckSquare,
  Clock,
  AlertCircle
} from 'lucide-react';
import TaskCard from '../components/TaskCard';
import './Tasks.css';

function Tasks() {
  const { 
    tasks, 
    loading, 
    error, 
    filter, 
    sortBy, 
    sortOrder,
    getFilteredTasks,
    setFilter,
    setSort,
    createTask
  } = useTask();

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pendente'
  });

  const filteredTasks = getFilteredTasks().filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  const handleSortChange = (newSortBy) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
    setSort(newSortBy, newSortOrder);
  };

  const getTaskStats = () => {
    const allTasks = tasks || [];
    return {
      total: allTasks.length,
      pendentes: allTasks.filter(task => task.status === 'pendente').length,
      emAndamento: allTasks.filter(task => task.status === 'em-andamento').length,
      concluidas: allTasks.filter(task => task.status === 'concluida').length
    };
  };

  const stats = getTaskStats();

  if (loading) {
    return (
      <div className="tasks-loading">
        <div className="loading-spinner"></div>
        <p>Carregando tarefas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tasks-error">
        <AlertCircle size={48} />
        <h3>Erro ao carregar tarefas</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-title">
          <h1>Minhas Tarefas</h1>
          <p>Gerencie todas as suas tarefas em um só lugar</p>
        </div>
        
        <div className="tasks-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewTaskForm(true)}
          >
            <Plus size={18} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="tasks-stats">
        <div className="stat-item">
          <CheckSquare size={20} />
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item pending">
          <Clock size={20} />
          <span className="stat-number">{stats.pendentes}</span>
          <span className="stat-label">Pendentes</span>
        </div>
        <div className="stat-item progress">
          <Clock size={20} />
          <span className="stat-number">{stats.emAndamento}</span>
          <span className="stat-label">Em Andamento</span>
        </div>
        <div className="stat-item completed">
          <CheckSquare size={20} />
          <span className="stat-number">{stats.concluidas}</span>
          <span className="stat-label">Concluídas</span>
        </div>
      </div>

      {/* Controles */}
      <div className="tasks-controls">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="controls-right">
          <button 
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filtros
          </button>
          
          <div className="sort-controls">
            <button
              className={`sort-btn ${sortBy === 'created_at' ? 'active' : ''}`}
              onClick={() => handleSortChange('created_at')}
              title="Ordenar por data de criação"
            >
              Data {sortBy === 'created_at' && (
                sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />
              )}
            </button>
            <button
              className={`sort-btn ${sortBy === 'due_date' ? 'active' : ''}`}
              onClick={() => handleSortChange('due_date')}
              title="Ordenar por prazo"
            >
              Prazo {sortBy === 'due_date' && (
                sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />
              )}
            </button>
            <button
              className={`sort-btn ${sortBy === 'title' ? 'active' : ''}`}
              onClick={() => handleSortChange('title')}
              title="Ordenar por título"
            >
              Título {sortBy === 'title' && (
                sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Status:</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${filter === 'todas' ? 'active' : ''}`}
                onClick={() => setFilter('todas')}
              >
                Todas
              </button>
              <button
                className={`filter-btn ${filter === 'pendentes' ? 'active' : ''}`}
                onClick={() => setFilter('pendentes')}
              >
                Pendentes
              </button>
              <button
                className={`filter-btn ${filter === 'em-andamento' ? 'active' : ''}`}
                onClick={() => setFilter('em-andamento')}
              >
                Em Andamento
              </button>
              <button
                className={`filter-btn ${filter === 'concluidas' ? 'active' : ''}`}
                onClick={() => setFilter('concluidas')}
              >
                Concluídas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Tarefas */}
      <div className="tasks-content">
        {filteredTasks.length > 0 ? (
          <div className="tasks-grid">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CheckSquare size={64} />
            <h3>
              {searchTerm ? 'Nenhuma tarefa encontrada' : 
               filter !== 'todas' ? `Nenhuma tarefa ${filter}` : 
               'Nenhuma tarefa criada'}
            </h3>
            <p>
              {searchTerm ? 'Tente ajustar os termos de busca' :
               filter !== 'todas' ? 'Crie uma nova tarefa ou altere os filtros' :
               'Crie sua primeira tarefa para começar a organizar sua rotina'}
            </p>
            {!searchTerm && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowNewTaskForm(true)}
              >
                <Plus size={18} />
                Criar Primeira Tarefa
              </button>
            )}
          </div>
        )}
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
              
              <div className="form-row">
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
                
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    className="input"
                    value={newTask.status}
                    onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em-andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
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

export default Tasks;