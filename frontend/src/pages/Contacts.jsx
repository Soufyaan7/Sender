import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Upload, Search, CheckCircle, AlertCircle, ListPlus, Folder, Settings, X } from 'lucide-react';

export default function Contacts() {
  const [activeTab, setActiveTab] = useState('contacts');
  
  // Contacts Grid state
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [contactMessage, setContactMessage] = useState(null);

  // New Contact Creation state
  const [newContact, setNewContact] = useState({ email: '', firstName: '', lastName: '', status: 'ACTIVE' });
  const [newContactListIds, setNewContactListIds] = useState([]);

  // Lists state
  const [lists, setLists] = useState([]);
  const [newList, setNewList] = useState({ name: '', description: '' });
  const [selectedList, setSelectedList] = useState(null);
  const [listContacts, setListContacts] = useState([]);

  // Autocomplete Linker state
  const [autocompleteSearch, setAutocompleteSearch] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [isAutocompleteFocused, setIsAutocompleteFocused] = useState(false);

  // Inline List Membership Editor Modal state
  const [listEditingContact, setListEditingContact] = useState(null);

  // Bulk Operations State
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [listAddMode, setListAddMode] = useState('search'); // 'search' or 'text'
  const [rawEmailsInput, setRawEmailsInput] = useState('');
  const [bulkListMessage, setBulkListMessage] = useState(null);

  // CSV Import state
  const [importTargetListId, setImportTargetListId] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);

  useEffect(() => {
    setSelectedContactIds([]);
  }, [search, page]);

  const handleRowCheckboxChange = (contactId) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSelectAllChange = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map(c => c.id));
    }
  };

  const executeBulkAssociation = async (listId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${listId}/contacts/bulk-add-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds })
      });
      if (response.ok) {
        setContactMessage({ type: 'success', text: `Association en masse réussie pour ${selectedContactIds.length} contacts.` });
        setSelectedContactIds([]);
        fetchContacts();
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeBulkDissociation = async (listId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${listId}/contacts/bulk-remove-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds })
      });
      if (response.ok) {
        setContactMessage({ type: 'success', text: `Désassociation en masse réussie pour ${selectedContactIds.length} contacts.` });
        setSelectedContactIds([]);
        fetchContacts();
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeBulkDelete = async () => {
    if (!window.confirm(`Voulez-vous supprimer définitivement ces ${selectedContactIds.length} contacts du répertoire ?`)) return;
    try {
      const response = await fetch('http://localhost:8080/api/contacts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds })
      });
      if (response.ok) {
        setContactMessage({ type: 'success', text: `Suppression en masse réussie.` });
        setSelectedContactIds([]);
        fetchContacts();
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkEmailsSubmit = async (e) => {
    e.preventDefault();
    if (!rawEmailsInput.trim()) return;

    const parsedEmails = rawEmailsInput
      .split(/[\s,\n]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));

    if (parsedEmails.length === 0) {
      setBulkListMessage({ type: 'error', text: 'Aucune adresse e-mail valide trouvée.' });
      return;
    }

    try {
      setBulkListMessage({ type: 'info', text: 'Ajout en cours...' });
      const response = await fetch(`http://localhost:8080/api/lists/${selectedList.id}/contacts/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: parsedEmails })
      });
      if (response.ok) {
        const result = await response.json();
        setBulkListMessage({ type: 'success', text: `${result.addedCount} contacts ajoutés/mis à jour avec succès.` });
        setRawEmailsInput('');
        fetchListContacts(selectedList.id);
        fetchLists();
      } else {
        setBulkListMessage({ type: 'error', text: 'Erreur lors de l\'ajout en masse.' });
      }
    } catch (err) {
      console.error(err);
      setBulkListMessage({ type: 'error', text: 'Impossible de contacter le serveur.' });
    }
  };

  useEffect(() => {
    fetchLists();
    if (activeTab === 'contacts') {
      fetchContacts();
    }
  }, [activeTab, search, page]);

  // Load suggestions as user types in the list autocomplete box
  useEffect(() => {
    if (autocompleteSearch.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        searchAutocompleteContacts();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setAutocompleteSuggestions([]);
    }
  }, [autocompleteSearch]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/contacts?search=${search}&page=${page}&size=15`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.content);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const fetchLists = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  };

  const fetchListContacts = async (listId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${listId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedList(data);
        setListContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Error fetching list contacts:', err);
    }
  };

  const searchAutocompleteContacts = async () => {
    try {
      // Fetch matching contacts (page size 10 is enough for suggestions)
      const response = await fetch(`http://localhost:8080/api/contacts?search=${autocompleteSearch}&page=0&size=10`);
      if (response.ok) {
        const data = await response.json();
        
        // Filter out contacts who are already members of the selected list
        const memberIds = new Set(listContacts.map(c => c.id));
        const suggestions = data.content.filter(c => !memberIds.has(c.id) && c.status === 'ACTIVE');
        setAutocompleteSuggestions(suggestions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Contact & Link to Selected Lists
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.email) return;

    try {
      const response = await fetch('http://localhost:8080/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      });
      
      if (response.ok) {
        const createdContact = await response.json();
        
        // Link to checked lists sequentially
        if (newContactListIds.length > 0) {
          for (const listId of newContactListIds) {
            await fetch(`http://localhost:8080/api/lists/${listId}/contacts/${createdContact.id}`, {
              method: 'POST'
            });
          }
        }

        setNewContact({ email: '', firstName: '', lastName: '', status: 'ACTIVE' });
        setNewContactListIds([]);
        setContactMessage({ type: 'success', text: 'Contact créé et affecté avec succès.' });
        fetchContacts();
        fetchLists(); // Update counts
      } else {
        setContactMessage({ type: 'error', text: 'Ce contact existe déjà (l\'e-mail doit être unique).' });
      }
    } catch (err) {
      setContactMessage({ type: 'error', text: 'Erreur lors du traitement. Vérifiez le serveur back-end.' });
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Voulez-vous supprimer définitivement ce contact du répertoire ?')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/contacts/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchContacts();
        fetchLists(); // Refreshes sizes
        if (selectedList) {
          fetchListContacts(selectedList.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleContactStatus = async (contact) => {
    const nextStatus = contact.status === 'ACTIVE' ? 'UNSUBSCRIBED' : 'ACTIVE';
    try {
      const response = await fetch(`http://localhost:8080/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, status: nextStatus })
      });
      if (response.ok) {
        fetchContacts();
        if (selectedList) {
          fetchListContacts(selectedList.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Existing Contact to Selected List via Autocomplete
  const linkContactToList = async (contact) => {
    if (!selectedList) return;
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${selectedList.id}/contacts/${contact.id}`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchListContacts(selectedList.id);
        fetchLists(); // Update list count details
        setAutocompleteSearch('');
        setAutocompleteSuggestions([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unlinkContactFromList = async (contactId) => {
    if (!selectedList) return;
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${selectedList.id}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchListContacts(selectedList.id);
        fetchLists(); // Update list count details
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Contact's memberships inside the Modal
  const handleToggleListMembership = async (listId, isCurrentlyMember) => {
    if (!listEditingContact) return;
    
    const method = isCurrentlyMember ? 'DELETE' : 'POST';
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${listId}/contacts/${listEditingContact.id}`, {
        method: method
      });

      if (response.ok) {
        // Reload list configurations
        fetchLists();
        fetchContacts();
        
        // Refresh local contact object in modal state
        const updatedLists = isCurrentlyMember
          ? listEditingContact.lists.filter(l => l.id !== listId)
          : [...(listEditingContact.lists || []), lists.find(l => l.id === listId)];
        
        setListEditingContact({
          ...listEditingContact,
          lists: updatedLists
        });

        if (selectedList) {
          fetchListContacts(selectedList.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Lists configurations
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newList.name) return;

    try {
      const response = await fetch('http://localhost:8080/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      if (response.ok) {
        setNewList({ name: '', description: '' });
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (id) => {
    if (!window.confirm('Voulez-vous supprimer cette liste ? Les contacts ne seront pas supprimés.')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/lists/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSelectedList(null);
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Import
  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    const formData = new FormData();
    formData.append('file', csvFile);
    if (importTargetListId) {
      formData.append('listId', importTargetListId);
    }

    try {
      setImportStatus({ type: 'info', text: 'Importation en cours...' });
      const response = await fetch('http://localhost:8080/api/contacts/import', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        setImportStatus({
          type: 'success',
          text: `Terminé ! Créés: ${result.created}, Mis à jour: ${result.updated}, Échoués: ${result.failed}`
        });
        setCsvFile(null);
        document.getElementById('csv-file-input').value = '';
        fetchContacts();
        fetchLists();
        if (selectedList) {
          fetchListContacts(selectedList.id);
        }
      } else {
        const errData = await response.json();
        setImportStatus({ type: 'error', text: errData.error || 'Erreur d\'importation.' });
      }
    } catch (err) {
      setImportStatus({ type: 'error', text: 'Impossible de contacter le serveur.' });
    }
  };

  const handleFormListCheckboxChange = (listId) => {
    setNewContactListIds(prev => 
      prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]
    );
  };

  return (
    <div>
      <div className="glass-card-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Répertoire & Diffusion</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Gérez l'association de vos contacts et de vos listes de manière fluide.</p>
        </div>
      </div>

      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => { setActiveTab('contacts'); setSelectedList(null); }}
        >
          <Users size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
          Tous les Contacts
        </button>
        <button
          className={`tab-btn ${activeTab === 'lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          <Folder size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
          Listes de Diffusion
        </button>
      </div>

      {activeTab === 'contacts' ? (
        <div className="grid-2" style={{ gridTemplateColumns: '2.2fr 1fr' }}>
          {/* Main Contacts Directory */}
          <div className="glass-card">
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Rechercher par e-mail ou prénom..."
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                        onChange={handleSelectAllChange}
                        style={{ accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                      />
                    </th>
                    <th>Email</th>
                    <th>Listes</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                        Aucun contact dans le répertoire.
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} style={{ background: selectedContactIds.includes(contact.id) ? 'rgba(99, 102, 241, 0.05)' : '' }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(contact.id)}
                            onChange={() => handleRowCheckboxChange(contact.id)}
                            style={{ accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {contact.email}
                          {(contact.firstName || contact.lastName) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {contact.firstName} {contact.lastName}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '280px' }}>
                            {(!contact.lists || contact.lists.length === 0) ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune</span>
                            ) : (
                              contact.lists.map(l => (
                                <span key={l.id} className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)', fontSize: '0.7rem', padding: '0.1rem 0.4rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                  {l.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => toggleContactStatus(contact)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Changer le statut"
                            disabled={contact.status === 'BOUNCED'}
                          >
                            <span className={`badge ${contact.status.toLowerCase()}`}>
                              {contact.status}
                            </span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem', borderRadius: '6px' }}
                              title="Gérer les listes"
                              onClick={() => setListEditingContact(contact)}
                            >
                              <Settings size={14} />
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.4rem', borderRadius: '6px' }}
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bulk Actions Panel */}
            {selectedContactIds.length > 0 && (
              <div className="bulk-actions-bar animate-fade-in" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                marginTop: '1rem',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge active" style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', background: 'var(--primary-color)', color: 'white' }}>
                    {selectedContactIds.length}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                    contacts sélectionnés
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Associate to List */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <select
                      id="bulk-associate-list-select"
                      className="form-select"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 1.5rem 0.3rem 0.5rem', width: '180px', margin: 0 }}
                      defaultValue=""
                    >
                      <option value="" disabled>Associer à la liste...</option>
                      {lists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      onClick={async () => {
                        const listId = document.getElementById('bulk-associate-list-select').value;
                        if (!listId) return;
                        await executeBulkAssociation(listId);
                      }}
                    >
                      Appliquer
                    </button>
                  </div>

                  {/* Dissociate from List */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <select
                      id="bulk-dissociate-list-select"
                      className="form-select"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 1.5rem 0.3rem 0.5rem', width: '180px', margin: 0 }}
                      defaultValue=""
                    >
                      <option value="" disabled>Retirer de la liste...</option>
                      {lists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      onClick={async () => {
                        const listId = document.getElementById('bulk-dissociate-list-select').value;
                        if (!listId) return;
                        await executeBulkDissociation(listId);
                      }}
                    >
                      Appliquer
                    </button>
                  </div>

                  {/* Bulk Delete */}
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                    onClick={executeBulkDelete}
                  >
                    <Trash2 size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  className="btn btn-secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Précédent
                </button>
                <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page {page + 1} sur {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>

          {/* Creation Forms Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Create Contact Form */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--primary-color)" />
                Ajouter un contact
              </h2>
              {contactMessage && (
                <div 
                  style={{ 
                    fontSize: '0.85rem',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    color: 'white',
                    background: contactMessage.type === 'success' ? 'var(--success-glow)' : 'var(--danger-glow)',
                    border: `1px solid ${contactMessage.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`
                  }}
                >
                  {contactMessage.text}
                </div>
              )}
              <form onSubmit={handleAddContact}>
                <div className="form-group">
                  <label>Adresse E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="form-input"
                    value={newContact.email}
                    onChange={(e) => { setNewContact({ ...newContact, email: e.target.value }); setContactMessage(null); }}
                  />
                </div>
                <div className="grid-2" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Prénom</label>
                    <input
                      type="text"
                      placeholder="Jean"
                      className="form-input"
                      value={newContact.firstName}
                      onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Nom</label>
                    <input
                      type="text"
                      placeholder="Dupont"
                      className="form-input"
                      value={newContact.lastName}
                      onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    />
                  </div>
                </div>

                {/* List preselection checkboxes */}
                <div className="form-group">
                  <label>Associer directement aux listes</label>
                  {lists.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune liste créée.</p>
                  ) : (
                    <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                      {lists.map(l => (
                        <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={newContactListIds.includes(l.id)}
                            onChange={() => handleFormListCheckboxChange(l.id)}
                            style={{ accentColor: 'var(--primary-color)' }}
                          />
                          <span>{l.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Créer le contact
                </button>
              </form>
            </div>

            {/* CSV Import */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} color="var(--primary-color)" />
                Importer via CSV
              </h2>
              {importStatus && (
                <div 
                  style={{ 
                    fontSize: '0.85rem',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    background: importStatus.type === 'success' ? 'var(--success-glow)' : importStatus.type === 'error' ? 'var(--danger-glow)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${importStatus.type === 'success' ? 'var(--success-color)' : importStatus.type === 'error' ? 'var(--danger-color)' : 'var(--panel-border)'}`
                  }}
                >
                  <span>{importStatus.text}</span>
                </div>
              )}
              <form onSubmit={handleCsvImport}>
                <div className="form-group">
                  <label>Sélectionner le fichier (.csv, .txt)</label>
                  <input
                    type="file"
                    id="csv-file-input"
                    accept=".csv,.txt"
                    className="form-input"
                    onChange={(e) => { setCsvFile(e.target.files[0]); setImportStatus(null); }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Associer à la liste (Optionnel)</label>
                  <select
                    className="form-select"
                    value={importTargetListId}
                    onChange={(e) => setImportTargetListId(e.target.value)}
                  >
                    <option value="">-- Aucun --</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={!csvFile}>
                  Importer
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Lists Segment Management Tab */
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
          {/* Lists Directories list */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Folder size={18} color="var(--primary-color)" />
              Listes de Diffusion
            </h2>
            {lists.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0', textAlign: 'center' }}>
                Aucune liste de diffusion créée.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lists.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => fetchListContacts(l.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: `1px solid ${selectedList?.id === l.id ? 'var(--primary-color)' : 'var(--panel-border)'}`,
                      background: selectedList?.id === l.id ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: 600, color: 'white' }}>{l.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.description || 'Pas de description.'}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.4rem', borderRadius: '6px' }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id); }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create list */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ListPlus size={16} color="var(--primary-color)" />
                Créer une liste
              </h3>
              <form onSubmit={handleCreateList}>
                <div className="form-group">
                  <label>Nom de la liste</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Newsletter Mensuelle"
                    className="form-input"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="Contacts clients..."
                    className="form-input"
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Créer la liste
                </button>
              </form>
            </div>
          </div>

          {/* Members of selected list + Search Autocomplete */}
          <div className="glass-card">
            {selectedList ? (
              <>
                <div className="glass-card-header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      Membres de "{selectedList.name}"
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Total : {listContacts.length} contacts dans cette liste
                    </p>
                  </div>
                </div>
 
                 {/* Mode Toggles */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <button
                    className={`btn ${listAddMode === 'search' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                    onClick={() => { setListAddMode('search'); setBulkListMessage(null); }}
                  >
                    Recherche individuelle
                  </button>
                  <button
                    className={`btn ${listAddMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                    onClick={() => { setListAddMode('text'); setBulkListMessage(null); }}
                  >
                    Multi-ajout par e-mails
                  </button>
                </div>

                {listAddMode === 'search' ? (
                  /* AUTOCOMPLETE LINKER SEARCH */
                  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Associer un contact existant à cette liste :
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.2rem', fontSize: '0.85rem', paddingHeight: '0.6rem' }}
                        placeholder="Saisissez au moins 2 lettres de l'e-mail..."
                        value={autocompleteSearch}
                        onChange={(e) => setAutocompleteSearch(e.target.value)}
                        onFocus={() => setIsAutocompleteFocused(true)}
                        onBlur={() => setTimeout(() => setIsAutocompleteFocused(false), 200)}
                      />
                    </div>

                    {/* Suggestion Dropdown */}
                    {isAutocompleteFocused && autocompleteSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#131929',
                        border: '1px solid var(--primary-color)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        borderRadius: '8px',
                        zIndex: 100,
                        marginTop: '0.25rem',
                        maxHeight: '180px',
                        overflowY: 'auto'
                      }}>
                        {autocompleteSuggestions.map(contact => (
                          <div
                            key={contact.id}
                            onClick={() => linkContactToList(contact)}
                            style={{
                              padding: '0.6rem 1rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              fontSize: '0.85rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseDown={(e) => e.preventDefault()} // Prevents input blur on click
                            className="suggestion-row"
                          >
                            <span style={{ color: 'white', fontWeight: 500 }}>{contact.email}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ Cliquer pour lier</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isAutocompleteFocused && autocompleteSearch.length >= 2 && autocompleteSuggestions.length === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#131929',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '8px',
                        zIndex: 100,
                        marginTop: '0.25rem',
                        padding: '0.75rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center'
                      }}>
                        Aucun contact actif hors de la liste ne correspond.
                      </div>
                    )}
                  </div>
                ) : (
                  /* BULK EMAILS TEXTAREA INPUT */
                  <div style={{ marginBottom: '1.5rem' }}>
                    {bulkListMessage && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.6rem',
                          borderRadius: '6px',
                          marginBottom: '0.75rem',
                          color: 'white',
                          background: bulkListMessage.type === 'success' ? 'var(--success-glow)' : bulkListMessage.type === 'error' ? 'var(--danger-glow)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${bulkListMessage.type === 'success' ? 'var(--success-color)' : bulkListMessage.type === 'error' ? 'var(--danger-color)' : 'var(--panel-border)'}`
                        }}
                      >
                        {bulkListMessage.text}
                      </div>
                    )}
                    <form onSubmit={handleBulkEmailsSubmit}>
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          Saisissez ou collez des e-mails (séparés par des virgules, des espaces ou des retours à la ligne) :
                        </label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: '90px', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
                          placeholder="client1@domain.com, client2@domain.com&#10;client3@domain.com"
                          value={rawEmailsInput}
                          onChange={(e) => setRawEmailsInput(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                        Ajouter à la liste
                      </button>
                    </form>
                  </div>
                )}

                {/* List members table */}
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listContacts.length === 0 ? (
                        <tr>
                          <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                            Cette liste est vide. Recherchez un contact ci-dessus pour l'ajouter.
                          </td>
                        </tr>
                      ) : (
                        listContacts.map((contact) => (
                          <tr key={contact.id}>
                            <td style={{ fontWeight: 500 }}>
                              {contact.email}
                              {(contact.firstName || contact.lastName) && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                  ({contact.firstName} {contact.lastName})
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.4rem', borderRadius: '6px' }}
                                title="Retirer de la liste"
                                onClick={() => unlinkContactFromList(contact.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', height: '100%', minHeight: '300px', color: 'var(--text-muted)' }}>
                <Folder size={48} strokeWidth={1} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
                <span>Sélectionnez une liste à gauche pour voir et gérer ses membres.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INLINE LIST MEMBERSHIP EDITOR DIALOG (MODAL) */}
      {listEditingContact && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{
            width: '450px',
            padding: '2rem',
            margin: '1.5rem',
            background: '#111726',
            border: '1px solid var(--primary-color)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>Gérer les listes</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{listEditingContact.email}</p>
              </div>
              <button 
                onClick={() => setListEditingContact(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1.5rem' }}>
              {lists.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Aucune liste disponible.</p>
              ) : (
                lists.map(list => {
                  const isMember = (listEditingContact.lists || []).some(l => l.id === list.id);
                  return (
                    <label 
                      key={list.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        background: isMember ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)', 
                        border: `1px solid ${isMember ? 'var(--primary-color)' : 'var(--panel-border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={isMember}
                          onChange={() => handleToggleListMembership(list.id, isMember)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                        />
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', color: 'white' }}>{list.name}</span>
                          {list.description && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{list.description}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => setListEditingContact(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
