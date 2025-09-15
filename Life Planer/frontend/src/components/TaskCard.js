import React, { useState } from 'react';
import { useTask } from '../context/TaskContext';
import { 
  CheckSquare, 
  Clock, 
  Calendar, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  AlertCircle
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './TaskCard.css';

function TaskCard({ task }) {
  const { updateTask, deleteTask } = useTask();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    due_date: task.due_date || '',
    status: task.status
  });

  const handleStatusChange = async (newStatus) => {
    try {
      await updateTask(task.id, { ...task, status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await updateTask(task.id, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao editar tarefa:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'concluida':
        return 'success';
      case 'em-andamento':
        return 'progress';
      case 'pendente':
      default:
        return 'pending';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'em-andamento':
        return 'Em Andamento';
      case 'pendente':
      default:
        return 'Pendente';
    }
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = parseISO(dateString);
      
      if (isToday(date)) {
        return `Hoje, ${format(date, 'HH:mm')}`;
      }
      
      return format(date, "dd 'de' MMMM, HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const isOverdue = () => {
    if (!task.due_date || task.status === 'concluida') return false;
    try {
      return isPast(parseISO(task.due_date));
    } catch {
      return false;
    }
  };

  if (isEditing) {
    return (
      <div className="task-card editing">
        <form onSubmit={handleEdit} className="edit-form">
          <div className="form-group">
            <input
              type="text"
              className="input"
              value={editData.title}
              onChange={(e) => setEditData({...editData, title: e.target.value})}
              placeholder="Título da tarefa"
              required
            />
          </div>
          
          <div className="form-group">
            <textarea
              className="input textarea"
              value={editData.description}
              onChange={(e) => setEditData({...editData, description: e.target.value})}
              placeholder="Descrição (opcional)"
              rows="2"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <input
                type="datetime-local"
                className="input"
                value={editData.due_date}
                onChange={(e) => setEditData({...editData, due_date: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <select
                className="input"
                value={editData.status}
                onChange={(e) => setEditData({...editData, status: e.target.value})}
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
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Salvar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`task-card ${task.status} ${isOverdue() ? 'overdue' : ''}`}>
      <div className="task-content">
        <div className="task-header">
          <div className="task-status">
            <button
              className={`status-btn ${getStatusColor(task.status)}`}
              onClick={() => {
                const nextStatus = task.status === 'pendente' ? 'em-andamento' : 
                                 task.status === 'em-andamento' ? 'concluida' : 'pendente';
                handleStatusChange(nextStatus);
              }}
              title="Clique para alterar status"
            >
              <CheckSquare size={16} />
            </button>
            <span className={`status-label ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
          </div>
          
          <div className="task-actions">
            <button
              className="action-btn"
              onClick={() => setShowActions(!showActions)}
              title="Mais ações"
            >
              <MoreHorizontal size={16} />
            </button>
            
            {showActions && (
              <div className="actions-menu">
                <button
                  className="action-item"
                  onClick={() => {
                    setIsEditing(true);
                    setShowActions(false);
                  }}
                >
                  <Edit3 size={14} />
                  Editar
                </button>
                <button
                  className="action-item danger"
                  onClick={() => {
                    handleDelete();
                    setShowActions(false);
                  }}
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="task-body">
          <h3 className="task-title">{task.title}</h3>
          {task.description && (
            <p className="task-description">{task.description}</p>
          )}
        </div>
        
        {task.due_date && (
          <div className="task-footer">
            <div className={`task-due-date ${isOverdue() ? 'overdue' : ''}`}>
              {isOverdue() ? (
                <AlertCircle size={14} />
              ) : (
                <Calendar size={14} />
              )}
              <span>{formatDueDate(task.due_date)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCard;