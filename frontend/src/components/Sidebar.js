import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Calendar, 
  Settings, 
  Plus,
  Filter,
  BarChart3
} from 'lucide-react';
import './Sidebar.css';

function Sidebar({ isOpen, currentView, setCurrentView }) {
  const location = useLocation();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home size={20} />,
      path: '/dashboard'
    },
    {
      id: 'tasks',
      label: 'Tarefas',
      icon: <CheckSquare size={20} />,
      path: '/tasks'
    },
    {
      id: 'calendar',
      label: 'Calendário',
      icon: <Calendar size={20} />,
      path: '/calendar'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: <Settings size={20} />,
      path: '/settings'
    }
  ];

  const quickActions = [
    {
      id: 'new-task',
      label: 'Nova Tarefa',
      icon: <Plus size={18} />,
      action: () => console.log('Nova tarefa')
    },
    {
      id: 'filter',
      label: 'Filtros',
      icon: <Filter size={18} />,
      action: () => console.log('Filtros')
    },
    {
      id: 'stats',
      label: 'Estatísticas',
      icon: <BarChart3 size={18} />,
      action: () => console.log('Estatísticas')
    }
  ];

  const handleMenuClick = (itemId) => {
    setCurrentView(itemId);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-content">
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <CheckSquare size={24} className="logo-icon" />
            {isOpen && <span className="logo-text">Life Planner</span>}
          </div>
        </div>

        {/* Menu Principal */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {isOpen && <h3 className="nav-title">Menu Principal</h3>}
            <ul className="nav-list">
              {menuItems.map((item) => (
                <li key={item.id} className="nav-item">
                  <Link
                    to={item.path}
                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => handleMenuClick(item.id)}
                    title={!isOpen ? item.label : ''}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {isOpen && <span className="nav-label">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ações Rápidas */}
          <div className="nav-section">
            {isOpen && <h3 className="nav-title">Ações Rápidas</h3>}
            <ul className="nav-list">
              {quickActions.map((action) => (
                <li key={action.id} className="nav-item">
                  <button
                    className="nav-link nav-action"
                    onClick={action.action}
                    title={!isOpen ? action.label : ''}
                  >
                    <span className="nav-icon">{action.icon}</span>
                    {isOpen && <span className="nav-label">{action.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Resumo de Tarefas */}
        {isOpen && (
          <div className="sidebar-summary">
            <div className="summary-card">
              <h4>Resumo de Hoje</h4>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-number">5</span>
                  <span className="stat-label">Pendentes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">3</span>
                  <span className="stat-label">Concluídas</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;