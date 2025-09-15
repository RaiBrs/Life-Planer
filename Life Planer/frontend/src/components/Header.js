import React from 'react';
import { Menu, Search, Bell, User, Calendar, CheckSquare } from 'lucide-react';
import './Header.css';

function Header({ toggleSidebar, sidebarOpen, currentView }) {
  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'tasks':
        return 'Tarefas';
      case 'calendar':
        return 'Calendário';
      case 'settings':
        return 'Configurações';
      default:
        return 'Life Planner';
    }
  };

  const getViewIcon = () => {
    switch (currentView) {
      case 'dashboard':
        return <CheckSquare size={24} />;
      case 'tasks':
        return <CheckSquare size={24} />;
      case 'calendar':
        return <Calendar size={24} />;
      case 'settings':
        return <User size={24} />;
      default:
        return <CheckSquare size={24} />;
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        
        <div className="header-title">
          {getViewIcon()}
          <h1>{getViewTitle()}</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            className="search-input"
          />
        </div>
      </div>

      <div className="header-right">
        <button className="header-btn" aria-label="Notificações">
          <Bell size={20} />
        </button>
        
        <div className="user-menu">
          <button className="user-btn" aria-label="Menu do usuário">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;