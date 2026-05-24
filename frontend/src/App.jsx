import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import { LayoutDashboard, Users, Mail, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'contacts':
        return <Contacts />;
      case 'campaigns':
        return <Campaigns />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <Mail size={20} strokeWidth={2.5} />
          </div>
          <span className="logo-text">MailSender</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => setCurrentPage('dashboard')}>
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            </li>
            <li className={`nav-item ${currentPage === 'contacts' ? 'active' : ''}`}>
              <button onClick={() => setCurrentPage('contacts')}>
                <Users size={18} />
                Contacts
              </button>
            </li>
            <li className={`nav-item ${currentPage === 'campaigns' ? 'active' : ''}`}>
              <button onClick={() => setCurrentPage('campaigns')}>
                <Mail size={18} />
                Campagnes
              </button>
            </li>
            <li className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}>
              <button onClick={() => setCurrentPage('settings')}>
                <SettingsIcon size={18} />
                Paramètres SMTP
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
