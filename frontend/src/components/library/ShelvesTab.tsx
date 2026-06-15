import React, { useState } from 'react';

interface ShelvesTabProps {
  filter: 'all' | 'saved' | 'read' | 'topic';
  libraryCollections: any[];
  createCollection: (name: string, description: string) => Promise<void>;
  handleFolderSelect: (collectionId: string) => void;
}

export function ShelvesTab({
  filter,
  libraryCollections,
  createCollection,
  handleFolderSelect,
}: ShelvesTabProps) {
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');

  if (filter !== 'topic') return null;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    await createCollection(folderName, folderDesc);
    setFolderName('');
    setFolderDesc('');
    setShowAddFolder(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase' }}>
          Shelf Folders
        </p>
        <button
          onClick={() => setShowAddFolder(!showAddFolder)}
          className="filter-btn on"
          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none' }}
        >
          <i className="ti ti-folder-plus" style={{ marginRight: '4px' }}></i>
          New Shelf
        </button>
      </div>

      {/* Add Folder form */}
      {showAddFolder && (
        <form onSubmit={handleCreateFolder} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ margin: '0 0 4px', fontSize: '13px' }}>Create New Shelf</h3>
          
          <input
            type="text"
            placeholder="Shelf Name (e.g. Science, Space)"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            required
            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-secondary)' }}
          />

          <input
            type="text"
            placeholder="Description"
            value={folderDesc}
            onChange={(e) => setFolderDesc(e.target.value)}
            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-secondary)' }}
          />

          <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end', marginTop: '4px' }}>
            <button type="submit" className="filter-btn on" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: 'none' }}>
              Create
            </button>
            <button type="button" className="filter-btn" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }} onClick={() => setShowAddFolder(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Folder grid */}
      {libraryCollections.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {libraryCollections.map((col) => (
            <div
              key={col.id}
              className="card"
              onClick={() => handleFolderSelect(col.id)}
              style={{ cursor: 'pointer', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', transition: 'transform 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1.5px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <i className="ti ti-folder" style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '4px' }}></i>
              <h4 className="card-title" style={{ fontSize: '12.5px', fontWeight: 650, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {col.name}
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {col.description || 'No description.'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
          <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
            No shelves created yet.
          </p>
        </div>
      )}
    </div>
  );
}
