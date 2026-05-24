import React, { useEffect, useState } from 'react';
import { Users, Mail, AlertTriangle, CheckCircle, RefreshCw, Terminal, Inbox } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeContacts: 0,
    unsubscribedContacts: 0,
    totalCampaigns: 0,
    totalSent: 0,
    totalFailed: 0,
    totalPending: 0,
    successRate: 100.0,
    recentLogs: [],
    campaigns: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to back-end server. Make sure it is running on localhost:8080.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 5 seconds to track progress
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculateProgress = (campaign) => {
    if (campaign.totalContacts === 0) return 100;
    return Math.min(
      Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalContacts) * 100),
      100
    );
  };

  // SVGs Circular Success Ring Parameters
  const radius = 60;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (stats.successRate / 100) * circumference;

  return (
    <div>
      <div className="glass-card-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Tableau de bord</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Vue d'ensemble de vos campagnes d'e-mailing en temps réel.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--danger-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertTriangle color="var(--danger-color)" />
          <span style={{ color: 'var(--text-primary)' }}>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Contacts Actifs</h3>
            <p>{stats.activeContacts} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {stats.totalContacts}</span></p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <h3>E-mails Envoyés</h3>
            <p>{stats.totalSent}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon danger">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <h3>Envois Échoués</h3>
            <p>{stats.totalFailed}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon warning">
            <Mail size={24} />
          </div>
          <div className="stat-details">
            <h3>En File d'Attente</h3>
            <p>{stats.totalPending}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-overview">
        {/* Active Campaigns Progress */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={20} color="var(--primary-color)" />
            Campagnes Récentes
          </h2>
          
          {stats.campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Aucune campagne enregistrée. Créez-en une pour commencer.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {stats.campaigns.slice(0, 5).map((campaign) => {
                const progress = calculateProgress(campaign);
                return (
                  <div key={campaign.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{campaign.subject}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Créé le {new Date(campaign.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`badge ${campaign.status.toLowerCase()}`}>
                        {campaign.status}
                      </span>
                    </div>

                    {campaign.status !== 'DRAFT' && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>{campaign.sentCount} envoyés / {campaign.failedCount} échoués</span>
                          <span>{progress}% ({campaign.totalContacts} contacts)</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Circular Success Rate & Stats */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
            Taux de Délivrabilité
          </h2>
          <div className="success-ring-container">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="progress-ring"
            >
              {/* Background ring */}
              <circle
                stroke="rgba(255,255,255,0.04)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              {/* Animated foreground ring */}
              <circle
                stroke="var(--success-color)"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                className="progress-ring-circle"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="ring-value">{stats.successRate}%</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
              Pourcentage d'e-mails transmis avec succès.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal logs */}
      <div className="glass-card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={20} color="var(--success-color)" />
          Journal d'expédition en direct
        </h2>
        <div className="console-log">
          {stats.recentLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem' }}>
              Aucun envoi récent. Les logs s'afficheront en temps réel dès que vous démarrerez une campagne.
            </div>
          ) : (
            stats.recentLogs.map((logItem) => (
              <div key={logItem.id} className="console-line">
                <span className="console-timestamp">
                  [{logItem.sentAt ? new Date(logItem.sentAt).toLocaleTimeString() : 'PENDING'}]
                </span>
                <span style={{ color: logItem.status === 'SENT' ? '#10b981' : logItem.status === 'FAILED' ? '#ef4444' : '#fbbf24' }}>
                  {logItem.status === 'SENT' ? 'SUCCESS' : logItem.status === 'FAILED' ? 'FAILURE' : 'PENDING'}
                </span>
                <span>
                  &gt; Destinataire: <strong style={{ color: 'white' }}>{logItem.email}</strong> | 
                  Campagne: <span style={{ color: 'var(--text-secondary)' }}>"{logItem.campaignSubject}"</span>
                  {logItem.errorMessage && (
                    <span style={{ color: 'var(--text-muted)' }}> (Erreur: {logItem.errorMessage})</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
