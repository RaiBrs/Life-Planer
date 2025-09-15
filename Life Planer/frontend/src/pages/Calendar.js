import React, { useState, useMemo } from 'react';
import { useTask } from '../context/TaskContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  CheckSquare
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isToday,
  parseISO,
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Calendar.css';

function Calendar() {
  const { tasks, createTask } = useTask();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'day', 'week', 'month'
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pendente'
  });

  // Filtrar tarefas por data
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      try {
        const taskDate = parseISO(task.due_date);
        return isValid(taskDate) && isSameDay(taskDate, date);
      } catch {
        return false;
      }
    });
  };

  // Navegação
  const navigateDate = (direction) => {
    if (view === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  // Obter período atual
  const getCurrentPeriod = () => {
    if (view === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'd MMM', { locale: ptBR })} - ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
    } else {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  // Obter dias para renderizar
  const getDaysToRender = useMemo(() => {
    if (view === 'day') {
      return [currentDate];
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthStart = startOfWeek(start, { weekStartsOn: 0 });
      const monthEnd = endOfWeek(end, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  }, [currentDate, view]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const taskData = {
        ...newTask,
        due_date: selectedDate ? 
          format(selectedDate, "yyyy-MM-dd'T'12:00:00") : 
          newTask.due_date
      };
      
      await createTask(taskData);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        status: 'pendente'
      });
      setShowNewTaskForm(false);
      setSelectedDate(null);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setNewTask({
      ...newTask,
      due_date: format(date, "yyyy-MM-dd'T'12:00:00")
    });
    setShowNewTaskForm(true);
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'concluida': return '#10b981';
      case 'em-andamento': return '#3b82f6';
      default: return '#f59e0b';
    }
  };

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-title">
          <h1>Calendário</h1>
          <p>Visualize suas tarefas organizadas por data</p>
        </div>
        
        <div className="calendar-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewTaskForm(true)}
          >
            <Plus size={18} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="calendar-controls">
        <div className="view-controls">
          <button
            className={`view-btn ${view === 'day' ? 'active' : ''}`}
            onClick={() => setView('day')}
          >
            Dia
          </button>
          <button
            className={`view-btn ${view === 'week' ? 'active' : ''}`}
            onClick={() => setView('week')}
          >
            Semana
          </button>
          <button
            className={`view-btn ${view === 'month' ? 'active' : ''}`}
            onClick={() => setView('month')}
          >
            Mês
          </button>
        </div>

        <div className="navigation-controls">
          <button 
            className="nav-btn"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="current-period">
            <CalendarIcon size={18} />
            <span>{getCurrentPeriod()}</span>
          </div>
          
          <button 
            className="nav-btn"
            onClick={() => navigateDate('next')}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => setCurrentDate(new Date())}
        >
          Hoje
        </button>
      </div>

      {/* Calendário */}
      <div className={`calendar-content ${view}`}>
        {view === 'month' && (
          <div className="calendar-weekdays">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>
        )}

        <div className={`calendar-grid ${view}`}>
          {getDaysToRender.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isTodayDate ? 'today' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="day-header">
                  <span className="day-number">
                    {format(date, view === 'month' ? 'd' : 'dd')}
                  </span>
                  {view !== 'month' && (
                    <span className="day-name">
                      {format(date, 'EEE', { locale: ptBR })}
                    </span>
                  )}
                </div>

                <div className="day-tasks">
                  {dayTasks.slice(0, view === 'month' ? 3 : 10).map(task => (
                    <div
                      key={task.id}
                      className={`task-item ${task.status}`}
                      style={{ borderLeftColor: getTaskStatusColor(task.status) }}
                      title={task.description || task.title}
                    >
                      <div className="task-content">
                        <span className="task-title">{task.title}</span>
                        {task.due_date && (
                          <span className="task-time">
                            <Clock size={12} />
                            {format(parseISO(task.due_date), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <div 
                        className="task-status-indicator"
                        style={{ backgroundColor: getTaskStatusColor(task.status) }}
                      />
                    </div>
                  ))}
                  
                  {dayTasks.length > (view === 'month' ? 3 : 10) && (
                    <div className="more-tasks">
                      +{dayTasks.length - (view === 'month' ? 3 : 10)} mais
                    </div>
                  )}
                </div>

                {dayTasks.length === 0 && view !== 'month' && (
                  <div className="no-tasks">
                    <span>Nenhuma tarefa</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo Lateral (apenas para visualização diária) */}
      {view === 'day' && (
        <div className="day-summary">
          <h3>Resumo do Dia</h3>
          <div className="summary-stats">
            <div className="summary-item">
              <CheckSquare size={16} />
              <span>{getTasksForDate(currentDate).length} tarefas</span>
            </div>
            <div className="summary-item">
              <Clock size={16} />
              <span>
                {getTasksForDate(currentDate).filter(t => t.status === 'concluida').length} concluídas
              </span>
            </div>
          </div>
          
          <div className="day-tasks-list">
            {getTasksForDate(currentDate).map(task => (
              <div key={task.id} className={`summary-task ${task.status}`}>
                <div 
                  className="task-status-dot"
                  style={{ backgroundColor: getTaskStatusColor(task.status) }}
                />
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  {task.due_date && (
                    <span className="task-time">
                      {format(parseISO(task.due_date), 'HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {getTasksForDate(currentDate).length === 0 && (
              <div className="no-tasks-message">
                <CalendarIcon size={24} />
                <p>Nenhuma tarefa para hoje</p>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleDateClick(currentDate)}
                >
                  Adicionar Tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Nova Tarefa */}
      {showNewTaskForm && (
        <div className="modal-overlay" onClick={() => setShowNewTaskForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Nova Tarefa
                {selectedDate && (
                  <span className="selected-date">
                    - {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                  </span>
                )}
              </h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowNewTaskForm(false);
                  setSelectedDate(null);
                }}
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
                  <label htmlFor="due_date">Data e Hora</label>
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
                  onClick={() => {
                    setShowNewTaskForm(false);
                    setSelectedDate(null);
                  }}
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

export default Calendar;