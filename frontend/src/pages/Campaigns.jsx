import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Mail, Send, CheckCircle, AlertTriangle, FileText, Sparkles, Inbox, X } from 'lucide-react';

export default function Campaigns() {
  const [lists, setLists] = useState([]);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  // UI state
  const [activeView, setActiveView] = useState('list'); // 'list' or 'create'
  const [sendingState, setSendingState] = useState(null); // success, error, loading
  const [statusMessage, setStatusMessage] = useState('');

  // Campaign Details Modal State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(0);
  const [modalTab, setModalTab] = useState('stats'); // 'stats', 'preview', 'logs'
  const [modalMessage, setModalMessage] = useState(null);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignLogs(selectedCampaign.id, logsPage);
    }
  }, [selectedCampaign, logsPage]);

  const fetchCampaignLogs = async (campaignId, pageNum) => {
    try {
      const response = await fetch(`http://localhost:8080/api/campaigns/${campaignId}/logs?page=${pageNum}&size=10`);
      if (response.ok) {
        const data = await response.json();
        setCampaignLogs(data.content);
        setLogsTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching campaign logs:', err);
    }
  };

  const handleStopCampaign = async (campaignId) => {
    if (!window.confirm('Voulez-vous vraiment stopper cette campagne ? Cette action est irréversible.')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/campaigns/${campaignId}/stop`, {
        method: 'POST'
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedCampaign(updated);
        setModalMessage({ type: 'success', text: 'Campagne stoppée avec succès.' });
        fetchCampaigns();
      } else {
        const text = await response.text();
        setModalMessage({ type: 'error', text: `Erreur: ${text}` });
      }
    } catch (err) {
      setModalMessage({ type: 'error', text: 'Impossible de contacter le serveur.' });
    }
  };

  const handleDuplicateCampaign = async (campaignId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/campaigns/${campaignId}/duplicate`, {
        method: 'POST'
      });
      if (response.ok) {
        setModalMessage({ type: 'success', text: 'Campagne dupliquée comme brouillon avec succès.' });
        fetchCampaigns();
        setTimeout(() => {
          setSelectedCampaign(null);
          setModalTab('stats');
        }, 1500);
      } else {
        setModalMessage({ type: 'error', text: 'Erreur lors de la duplication.' });
      }
    } catch (err) {
      setModalMessage({ type: 'error', text: 'Impossible de contacter le serveur.' });
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette campagne et tout son historique ?')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/campaigns/${campaignId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSelectedCampaign(null);
        fetchCampaigns();
      } else {
        setModalMessage({ type: 'error', text: 'Erreur lors de la suppression.' });
      }
    } catch (err) {
      setModalMessage({ type: 'error', text: 'Impossible de contacter le serveur.' });
    }
  };

  useEffect(() => {
    fetchLists();
    fetchCampaigns();
  }, []);

  const fetchLists = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckboxChange = (listId) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const handleSaveDraft = async () => {
    if (!subject || !htmlContent) {
      setSendingState('error');
      setStatusMessage('Le sujet et le contenu HTML sont requis.');
      return;
    }

    try {
      setSendingState('loading');
      setStatusMessage('Enregistrement de la campagne...');

      const response = await fetch('http://localhost:8080/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent })
      });

      if (response.ok) {
        const campaign = await response.json();
        setSendingState('success');
        setStatusMessage(`Campagne "${campaign.subject}" enregistrée en brouillon.`);
        setSubject('');
        setHtmlContent('');
        setSelectedListIds([]);
        fetchCampaigns();
        setTimeout(() => {
          setSendingState(null);
          setActiveView('list');
        }, 2000);
      } else {
        setSendingState('error');
        setStatusMessage("Erreur lors de l'enregistrement de la campagne.");
      }
    } catch (err) {
      setSendingState('error');
      setStatusMessage('Impossible de se connecter au serveur backend.');
    }
  };

  const handleSendCampaign = async () => {
    if (!subject || !htmlContent) {
      setSendingState('error');
      setStatusMessage('Le sujet et le contenu HTML sont requis.');
      return;
    }

    if (selectedListIds.length === 0) {
      setSendingState('error');
      setStatusMessage('Sélectionnez au moins une liste de diffusion destinataire.');
      return;
    }

    try {
      setSendingState('loading');
      setStatusMessage('Création et envoi de la campagne...');

      // 1. Save campaign first
      const saveResponse = await fetch('http://localhost:8080/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent })
      });

      if (!saveResponse.ok) {
        throw new Error("Erreur de sauvegarde de la campagne.");
      }

      const campaign = await saveResponse.json();

      // 2. Trigger sending
      const sendResponse = await fetch(`http://localhost:8080/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listIds: selectedListIds })
      });

      if (sendResponse.ok) {
        setSendingState('success');
        setStatusMessage(`Campagne "${campaign.subject}" lancée avec succès ! Suivez la progression sur le Tableau de bord.`);
        setSubject('');
        setHtmlContent('');
        setSelectedListIds([]);
        fetchCampaigns();
        setTimeout(() => {
          setSendingState(null);
          setActiveView('list');
        }, 3000);
      } else {
        const errorText = await sendResponse.text();
        setSendingState('error');
        setStatusMessage(`L'envoi a échoué: ${errorText}`);
      }

    } catch (err) {
      setSendingState('error');
      setStatusMessage(err.message || 'Impossible de se connecter au serveur backend.');
    }
  };

  // Preset modules for Quill editor
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'clean']
    ],
  };

  return (
    <div>
      <div className="glass-card-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Création de Campagnes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Rédigez vos templates et ciblez vos envois de manière asynchrone.</p>
        </div>
        <div>
          {activeView === 'list' ? (
            <button className="btn btn-primary" onClick={() => setActiveView('create')}>
              <Mail size={16} />
              Nouvelle Campagne
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setActiveView('list')}>
              <FileText size={16} />
              Voir l'historique
            </button>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={20} color="var(--primary-color)" />
            Historique Global des Campagnes
          </h2>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sujet de l'e-mail</th>
                  <th>Date de création</th>
                  <th>Contacts Ciblés</th>
                  <th>Délivrés</th>
                  <th>Échecs</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                      Aucune campagne n'a été créée pour le moment.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => (
                    <tr key={camp.id}>
                      <td style={{ fontWeight: 600 }}>{camp.subject}</td>
                      <td>{new Date(camp.createdAt).toLocaleString()}</td>
                      <td>{camp.totalContacts}</td>
                      <td style={{ color: 'var(--success-color)' }}>{camp.sentCount}</td>
                      <td style={{ color: 'var(--danger-color)' }}>{camp.failedCount}</td>
                      <td>
                        <span className={`badge ${camp.status.toLowerCase()}`}>
                          {camp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}
                          onClick={() => { setSelectedCampaign(camp); setLogsPage(0); }}
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Create Campaign Editor Screen */
        <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Editor and Subject */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Rédiger le contenu de l'e-mail
            </h2>

            {sendingState && (
              <div 
                style={{ 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: sendingState === 'success' ? 'var(--success-glow)' : sendingState === 'error' ? 'var(--danger-glow)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sendingState === 'success' ? 'var(--success-color)' : sendingState === 'error' ? 'var(--danger-color)' : 'var(--panel-border)'}`
                }}
              >
                {sendingState === 'success' && <CheckCircle size={18} color="var(--success-color)" />}
                {sendingState === 'error' && <AlertTriangle size={18} color="var(--danger-color)" />}
                {sendingState === 'loading' && <span className="animate-spin" style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid', borderTopColor: 'transparent', borderRadius: '50%' }}></span>}
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label>Objet de l'e-mail</label>
              <input
                type="text"
                placeholder="Ex: Newsletter de Juin - Les dernières nouvelles !"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Contenu HTML (Corps de l'e-mail)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Sparkles size={12} color="var(--primary-color)" />
                  Placeholders supportés: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
                </span>
              </label>
              
              <ReactQuill
                theme="snow"
                value={htmlContent}
                onChange={setHtmlContent}
                modules={modules}
                placeholder="Rédigez votre message ici. Personnalisez-le en insérant les variables ci-dessus..."
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleSaveDraft} 
                disabled={sendingState === 'loading'}
                style={{ flex: 1 }}
              >
                Enregistrer en Brouillon
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSendCampaign} 
                disabled={sendingState === 'loading'}
                style={{ flex: 1 }}
              >
                <Send size={16} />
                Lancer la Campagne
              </button>
            </div>
          </div>

          {/* List targets selection */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Destinataires
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Sélectionnez les listes de diffusion qui recevront cette campagne.
            </p>

            {lists.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                Aucune liste de diffusion disponible. Veuillez en créer une dans l'onglet Contacts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {lists.map((list) => (
                  <label
                    key={list.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      background: selectedListIds.includes(list.id) ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedListIds.includes(list.id)}
                      onChange={() => handleCheckboxChange(list.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--primary-color)',
                        cursor: 'pointer'
                      }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, display: 'block', fontSize: '0.9rem' }}>{list.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{list.contacts?.length || 0} contacts</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMPAIGN DETAILS MODAL */}
      {selectedCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          backdropFilter: 'blur(6px)'
        }}>
          <div className="glass-card" style={{
            width: '750px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            background: '#0e1320',
            border: '1px solid var(--primary-color)',
            boxShadow: '0 15px 50px rgba(0,0,0,0.7)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className={`badge ${selectedCampaign.status.toLowerCase()}`} style={{ marginBottom: '0.4rem', display: 'inline-block' }}>
                  {selectedCampaign.status}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
                  {selectedCampaign.subject}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Créée le {new Date(selectedCampaign.createdAt).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => { setSelectedCampaign(null); setModalTab('stats'); setModalMessage(null); }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Alert message if any */}
            {modalMessage && (
              <div 
                style={{ 
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  color: 'white',
                  background: modalMessage.type === 'success' ? 'var(--success-glow)' : 'var(--danger-glow)',
                  border: `1px solid ${modalMessage.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`
                }}
              >
                {modalMessage.text}
              </div>
            )}

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '1.5rem', gap: '1.5rem' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: modalTab === 'stats' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  paddingBottom: '0.5rem',
                  color: modalTab === 'stats' ? 'white' : 'var(--text-secondary)',
                  fontWeight: modalTab === 'stats' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                onClick={() => setModalTab('stats')}
              >
                Détails & Statistiques
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: modalTab === 'preview' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  paddingBottom: '0.5rem',
                  color: modalTab === 'preview' ? 'white' : 'var(--text-secondary)',
                  fontWeight: modalTab === 'preview' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                onClick={() => setModalTab('preview')}
              >
                Prévisualisation
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: modalTab === 'logs' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  paddingBottom: '0.5rem',
                  color: modalTab === 'logs' ? 'white' : 'var(--text-secondary)',
                  fontWeight: modalTab === 'logs' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                onClick={() => setModalTab('logs')}
              >
                Journal de Distribution
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
              
              {/* Tab 1: Stats & Details */}
              {modalTab === 'stats' && (
                <div>
                  <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Destinataires</h4>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', margin: 0 }}>{selectedCampaign.totalContacts}</p>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: 'var(--success-color)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Délivrés</h4>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-color)', margin: 0 }}>{selectedCampaign.sentCount}</p>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: 'var(--danger-color)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Échecs</h4>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger-color)', margin: 0 }}>{selectedCampaign.failedCount}</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Progression</h4>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', margin: 0 }}>
                        {selectedCampaign.totalContacts > 0 ? Math.round(((selectedCampaign.sentCount + selectedCampaign.failedCount) / selectedCampaign.totalContacts) * 100) : 100}%
                      </p>
                    </div>
                  </div>

                  {selectedCampaign.status === 'SENDING' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Envoi en cours :</label>
                      <div className="progress-bar-container" style={{ height: '8px' }}>
                        <div className="progress-bar-fill" style={{ width: `${selectedCampaign.totalContacts > 0 ? ((selectedCampaign.sentCount + selectedCampaign.failedCount) / selectedCampaign.totalContacts) * 100 : 100}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {selectedCampaign.status === 'SENDING' && (
                      <button 
                        className="btn btn-danger"
                        style={{ flex: 1, minWidth: '150px' }}
                        onClick={() => handleStopCampaign(selectedCampaign.id)}
                      >
                        Stopper l'envoi
                      </button>
                    )}
                    <button 
                      className="btn btn-primary"
                      style={{ flex: 1, minWidth: '150px' }}
                      onClick={() => handleDuplicateCampaign(selectedCampaign.id)}
                    >
                      Dupliquer (Brouillon)
                    </button>
                    <button 
                      className="btn btn-danger"
                      style={{ flex: 1, minWidth: '150px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                      onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                    >
                      Supprimer la campagne
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: HTML Preview */}
              {modalTab === 'preview' && (
                <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', border: '1px solid var(--panel-border)', height: '350px', overflowY: 'auto' }}>
                  <div style={{ color: 'black' }} dangerouslySetInnerHTML={{ __html: selectedCampaign.htmlContent }}></div>
                </div>
              )}

              {/* Tab 3: Detailed Distribution Logs */}
              {modalTab === 'logs' && (
                <div>
                  <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Destinataire</th>
                          <th>Statut</th>
                          <th>Date d'envoi</th>
                          <th>Détails</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignLogs.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                              Aucun log d'envoi disponible pour cette campagne.
                            </td>
                          </tr>
                        ) : (
                          campaignLogs.map(log => (
                            <tr key={log.id}>
                              <td style={{ fontWeight: 500, color: 'white' }}>{log.email}</td>
                              <td>
                                <span className={`badge ${log.status.toLowerCase()}`}>
                                  {log.status}
                                </span>
                              </td>
                              <td>{log.sentAt ? new Date(log.sentAt).toLocaleString() : 'PENDING'}</td>
                              <td style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.errorMessage || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Logs Pagination */}
                  {logsTotalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        className="btn btn-secondary"
                        disabled={logsPage === 0}
                        onClick={() => setLogsPage(p => p - 1)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        Précédent
                      </button>
                      <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Page {logsPage + 1} sur {logsTotalPages}
                      </span>
                      <button
                        className="btn btn-secondary"
                        disabled={logsPage >= logsTotalPages - 1}
                        onClick={() => setLogsPage(p => p + 1)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        Suivant
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', textAlign: 'right' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setSelectedCampaign(null); setModalTab('stats'); setModalMessage(null); }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
