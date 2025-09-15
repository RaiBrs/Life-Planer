import React, { useState } from 'react';
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Database,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import './Settings.css';

function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: {
      taskReminders: true,
      dailySummary: true,
      weeklyReport: false,
      soundEnabled: true
    },
    general: {
      language: 'pt-BR',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '24h',
      startOfWeek: 'sunday'
    },
    data: {
      autoBackup: true,
      backupFrequency: 'weekly',
      storageUsed: '2.3 MB',
      totalTasks: 45,
      completedTasks: 23
    }
  });
  
  const [saveStatus, setSaveStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const tabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'data', label: 'Dados', icon: Database }
  ];

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aqui você salvaria as configurações no localStorage ou backend
      localStorage.setItem('lifeplannerSettings', JSON.stringify(settings));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    
    try {
      // Simular exportação
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const data = {
        settings,
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `life-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.settings) {
        setSettings(data.settings);
      }
      
      if (data.tasks) {
        localStorage.setItem('tasks', JSON.stringify(data.tasks));
      }
      
      alert('Dados importados com sucesso! Recarregue a página para ver as alterações.');
      
    } catch (error) {
      alert('Erro ao importar dados. Verifique se o arquivo está correto.');
      console.error('Erro ao importar:', error);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleClearData = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      localStorage.clear();
      alert('Dados limpos com sucesso! Recarregue a página.');
    }
  };

  const getThemeIcon = (theme) => {
    switch (theme) {
      case 'light': return Sun;
      case 'dark': return Moon;
      default: return Monitor;
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-title">
          <h1>Configurações</h1>
          <p>Personalize sua experiência no Life Planner</p>
        </div>
        
        <div className="settings-actions">
          <button 
            className={`btn btn-primary ${saveStatus === 'saving' ? 'loading' : ''}`}
            onClick={handleSaveSettings}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw size={18} className="spinning" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status de Salvamento */}
      {saveStatus && saveStatus !== 'saving' && (
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === 'success' ? (
            <>
              <CheckCircle size={18} />
              Configurações salvas com sucesso!
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              Erro ao salvar configurações. Tente novamente.
            </>
          )}
        </div>
      )}

      <div className="settings-content">
        {/* Tabs */}
        <div className="settings-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo das Tabs */}
        <div className="settings-panel">
          {/* Geral */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2>Configurações Gerais</h2>
              
              <div className="setting-group">
                <label>Idioma</label>
                <select
                  value={settings.general.language}
                  onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                  className="input"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Formato de Data</label>
                <select
                  value={settings.general.dateFormat}
                  onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                  className="input"
                >
                  <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                  <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                  <option value="yyyy-MM-dd">AAAA-MM-DD</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Formato de Hora</label>
                <select
                  value={settings.general.timeFormat}
                  onChange={(e) => handleSettingChange('general', 'timeFormat', e.target.value)}
                  className="input"
                >
                  <option value="24h">24 horas</option>
                  <option value="12h">12 horas (AM/PM)</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Início da Semana</label>
                <select
                  value={settings.general.startOfWeek}
                  onChange={(e) => handleSettingChange('general', 'startOfWeek', e.target.value)}
                  className="input"
                >
                  <option value="sunday">Domingo</option>
                  <option value="monday">Segunda-feira</option>
                </select>
              </div>
            </div>
          )}

          {/* Aparência */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2>Aparência</h2>
              
              <div className="setting-group">
                <label>Tema</label>
                <div className="theme-options">
                  {['light', 'dark', 'auto'].map(theme => {
                    const Icon = getThemeIcon(theme);
                    return (
                      <button
                        key={theme}
                        className={`theme-btn ${settings.theme === theme ? 'active' : ''}`}
                        onClick={() => handleSettingChange('', 'theme', theme)}
                      >
                        <Icon size={20} />
                        <span>
                          {theme === 'light' ? 'Claro' : 
                           theme === 'dark' ? 'Escuro' : 'Automático'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-group">
                <label>Cores de Destaque</label>
                <div className="color-options">
                  {[
                    { name: 'Roxo', value: '#8b5cf6' },
                    { name: 'Azul', value: '#3b82f6' },
                    { name: 'Verde', value: '#10b981' },
                    { name: 'Rosa', value: '#ec4899' },
                    { name: 'Laranja', value: '#f59e0b' }
                  ].map(color => (
                    <button
                      key={color.value}
                      className="color-btn"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      onClick={() => {
                        document.documentElement.style.setProperty('--accent-primary', color.value);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notificações */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notificações</h2>
              
              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Lembretes de Tarefas</label>
                    <p>Receba notificações sobre tarefas próximas do prazo</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.taskReminders}
                      onChange={(e) => handleSettingChange('notifications', 'taskReminders', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Resumo Diário</label>
                    <p>Receba um resumo das suas tarefas todos os dias</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.dailySummary}
                      onChange={(e) => handleSettingChange('notifications', 'dailySummary', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Relatório Semanal</label>
                    <p>Receba um relatório de produtividade semanal</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.weeklyReport}
                      onChange={(e) => handleSettingChange('notifications', 'weeklyReport', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Sons de Notificação</label>
                    <p>Reproduzir sons quando receber notificações</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.soundEnabled}
                      onChange={(e) => handleSettingChange('notifications', 'soundEnabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Dados */}
          {activeTab === 'data' && (
            <div className="settings-section">
              <h2>Gerenciamento de Dados</h2>
              
              {/* Estatísticas */}
              <div className="data-stats">
                <div className="stat-card">
                  <h3>Armazenamento Usado</h3>
                  <p className="stat-value">{settings.data.storageUsed}</p>
                </div>
                <div className="stat-card">
                  <h3>Total de Tarefas</h3>
                  <p className="stat-value">{settings.data.totalTasks}</p>
                </div>
                <div className="stat-card">
                  <h3>Tarefas Concluídas</h3>
                  <p className="stat-value">{settings.data.completedTasks}</p>
                </div>
              </div>

              {/* Backup Automático */}
              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Backup Automático</label>
                    <p>Fazer backup automático dos seus dados</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.data.autoBackup}
                      onChange={(e) => handleSettingChange('data', 'autoBackup', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {settings.data.autoBackup && (
                <div className="setting-group">
                  <label>Frequência do Backup</label>
                  <select
                    value={settings.data.backupFrequency}
                    onChange={(e) => handleSettingChange('data', 'backupFrequency', e.target.value)}
                    className="input"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
              )}

              {/* Ações de Dados */}
              <div className="data-actions">
                <button 
                  className={`btn btn-secondary ${isExporting ? 'loading' : ''}`}
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw size={18} className="spinning" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Exportar Dados
                    </>
                  )}
                </button>

                <label className={`btn btn-secondary ${isImporting ? 'loading' : ''}`}>
                  {isImporting ? (
                    <>
                      <RefreshCw size={18} className="spinning" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Importar Dados
                    </>
                  )}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    style={{ display: 'none' }}
                    disabled={isImporting}
                  />
                </label>

                <button 
                  className="btn btn-danger"
                  onClick={handleClearData}
                >
                  <Trash2 size={18} />
                  Limpar Todos os Dados
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;