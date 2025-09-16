import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const TaskContext = createContext();

// Estados iniciais
const initialState = {
  tasks: [],
  loading: false,
  error: null,
  filter: 'todas', // todas, pendentes, concluidas
  sortBy: 'created_at', // created_at, due_date, title
  sortOrder: 'desc' // asc, desc
};

// Reducer para gerenciar o estado das tarefas
function taskReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, loading: false, error: null };
    
    case 'ADD_TASK':
      return { 
        ...state, 
        tasks: [action.payload, ...state.tasks],
        loading: false,
        error: null
      };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
        loading: false,
        error: null
      };
    
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        loading: false,
        error: null
      };
    
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    
    case 'SET_SORT':
      return { 
        ...state, 
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };
    
    default:
      return state;
  }
}

// Provider do contexto
export function TaskProvider({ children }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // API base URL
  const API_BASE_URL = 'http://localhost:5000/api';

  // Função para buscar todas as tarefas
  const fetchTasks = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      dispatch({ type: 'SET_TASKS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar tarefas' });
      console.error('Erro ao buscar tarefas:', error);
    }
  };

  // Função para criar uma nova tarefa
  const createTask = async (taskData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);
      
      // Buscar a tarefa criada para obter todos os dados
      const newTaskResponse = await axios.get(`${API_BASE_URL}/tasks`);
      const newTask = newTaskResponse.data.find(task => task.id === response.data.id);
      
      dispatch({ type: 'ADD_TASK', payload: newTask });
      return newTask;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao criar tarefa' });
      console.error('Erro ao criar tarefa:', error);
      throw error;
    }
  };

  // Função para atualizar uma tarefa
  const updateTask = async (taskId, taskData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await axios.put(`${API_BASE_URL}/tasks/${taskId}`, taskData);
      
      // Buscar a tarefa atualizada
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      const updatedTask = response.data.find(task => task.id === taskId);
      
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      return updatedTask;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao atualizar tarefa' });
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
  };

  // Função para excluir uma tarefa
  const deleteTask = async (taskId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
      dispatch({ type: 'DELETE_TASK', payload: taskId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao excluir tarefa' });
      console.error('Erro ao excluir tarefa:', error);
      throw error;
    }
  };

  // Função para buscar tarefas por data
  const fetchTasksByDate = async (date) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.get(`${API_BASE_URL}/tasks/date/${date}`);
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar tarefas da data' });
      console.error('Erro ao buscar tarefas por data:', error);
      return [];
    }
  };

  // Função para filtrar tarefas
  const getFilteredTasks = () => {
    let filteredTasks = [...state.tasks];

    // Aplicar filtro
    switch (state.filter) {
      case 'pendentes':
        filteredTasks = filteredTasks.filter(task => task.status === 'pendente');
        break;
      case 'concluidas':
        filteredTasks = filteredTasks.filter(task => task.status === 'concluida');
        break;
      case 'em-andamento':
        filteredTasks = filteredTasks.filter(task => task.status === 'em-andamento');
        break;
      default:
        // 'todas' - não filtra
        break;
    }

    // Aplicar ordenação
    filteredTasks.sort((a, b) => {
      let aValue = a[state.sortBy];
      let bValue = b[state.sortBy];

      // Tratar datas
      if (state.sortBy === 'due_date' || state.sortBy === 'created_at') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (state.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredTasks;
  };

  // Carregar tarefas ao inicializar
  useEffect(() => {
    fetchTasks();
  }, []);

  const value = {
    ...state,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    fetchTasksByDate,
    getFilteredTasks,
    setFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: filter }),
    setSort: (sortBy, sortOrder) => dispatch({ 
      type: 'SET_SORT', 
      payload: { sortBy, sortOrder } 
    })
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

// Hook personalizado para usar o contexto
export function useTask() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask deve ser usado dentro de um TaskProvider');
  }
  return context;
}