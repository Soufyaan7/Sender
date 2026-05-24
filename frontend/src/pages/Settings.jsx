import React, { useState, useEffect } from 'react';
import { Server, Save, CheckCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    fromEmail: '',
    auth: true,
    starttls: true
  });
  
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Status states
  const [saveStatus, setSaveStatus] = useState(null); // success, error
  const [testStatus, setTestStatus] = useState(null); // success, error

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/settings/smtp');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus(null);
    try {
      const response = await fetch('http://localhost:8080/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setSaveStatus({ type: 'success', text: 'Paramètres SMTP enregistrés avec succès.' });
        fetchSettings();
      } else {
        setSaveStatus({ type: 'error', text: 'Erreur lors de la sauvegarde des paramètres.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', text: 'Impossible de se connecter au serveur backend.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      setTestStatus({ type: 'error', text: "Veuillez entrer une adresse e-mail pour recevoir l'e-mail de test." });
      return;
    }
    
    setTesting(true);
    setTestStatus({ type: 'info', text: 'Tentative de connexion et envoi du message de test...' });
    
    try {
      const response = await fetch('http://localhost:8080/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, toEmail: testEmail })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestStatus({ type: 'success', text: `Message de test envoyé avec succès à ${testEmail} ! Vérifiez votre boîte de réception.` });
        } else {
          setTestStatus({ type: 'error', text: `La connexion SMTP a échoué: ${data.error}` });
        }
      } else {
        setTestStatus({ type: 'error', text: "Erreur de communication avec le serveur lors du test." });
      }
    } catch (err) {
      setTestStatus({ type: 'error', text: 'Impossible de joindre le serveur pour le test.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="glass-card-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Configuration SMTP</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Configurez vos identifiants d'envoi. Les e-mails seront relayés via ce serveur.</p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Settings Form */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={20} color="var(--primary-color)" />
            Serveur Sortant (SMTP)
          </h2>

          {saveStatus && (
            <div 
              style={{ 
                padding: '0.75rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: saveStatus.type === 'success' ? 'var(--success-glow)' : 'var(--danger-glow)',
                border: `1px solid ${saveStatus.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`
              }}
            >
              {saveStatus.type === 'success' ? <CheckCircle size={16} color="var(--success-color)" /> : <AlertTriangle size={16} color="var(--danger-color)" />}
              <span>{saveStatus.text}</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Hôte SMTP (Serveur)</label>
              <input
                type="text"
                required
                placeholder="smtp.mailgun.org, smtp.gmail.com..."
                className="form-input"
                value={settings.host || ''}
                onChange={(e) => setSettings({ ...settings, host: e.target.value })}
              />
            </div>

            <div className="grid-2" style={{ gap: '1rem', marginBottom: 0 }}>
              <div className="form-group">
                <label>Port SMTP</label>
                <input
                  type="number"
                  required
                  placeholder="587"
                  className="form-input"
                  value={settings.port || 587}
                  onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Adresse d'expédition (From)</label>
                <input
                  type="email"
                  required
                  placeholder="sender@domain.com"
                  className="form-input"
                  value={settings.fromEmail || ''}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Nom d'utilisateur SMTP</label>
              <input
                type="text"
                placeholder="postmaster@yourdomain.com"
                className="form-input"
                value={settings.username || ''}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Mot de passe SMTP</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="form-input"
                value={settings.password || ''}
                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', margin: '1.5rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={settings.auth}
                  onChange={(e) => setSettings({ ...settings, auth: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                />
                Authentification requise
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={settings.starttls}
                  onChange={(e) => setSettings({ ...settings, starttls: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                />
                Activer TLS / STARTTLS
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              <Save size={16} />
              Enregistrer les Paramètres
            </button>
          </form>
        </div>

        {/* Live Test Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={18} color="var(--success-color)" />
              Tester la configuration
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Envoyez un e-mail de test immédiat pour valider les paramètres saisis à gauche sans les enregistrer.
            </p>

            {testStatus && (
              <div 
                style={{ 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  background: testStatus.type === 'success' ? 'var(--success-glow)' : testStatus.type === 'error' ? 'var(--danger-glow)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${testStatus.type === 'success' ? 'var(--success-color)' : testStatus.type === 'error' ? 'var(--danger-color)' : 'var(--panel-border)'}`
                }}
              >
                <span>{testStatus.text}</span>
              </div>
            )}

            <div className="form-group">
              <label>Adresse e-mail de réception</label>
              <input
                type="email"
                placeholder="test-recipient@gmail.com"
                className="form-input"
                value={testEmail}
                onChange={(e) => { setTestEmail(e.target.value); setTestStatus(null); }}
              />
            </div>

            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={handleTestConnection}
              disabled={testing || !settings.host}
            >
              {testing ? 'Test en cours...' : 'Envoyer un e-mail de test'}
            </button>
          </div>

          <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HelpCircle size={16} color="var(--primary-color)" />
              Note Importante
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Si aucun serveur SMTP n'est configuré ou si les champs restent vides, le back-end passera en mode <strong>Mock/Log-Only</strong>. 
              Les e-mails ne seront pas réellement expédiés, mais ils seront journalisés dans la console du back-end comme s'ils avaient été envoyés. Cela vous permet de tester la file d'attente et l'application sans identifiants réels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
