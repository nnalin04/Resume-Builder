interface Version {
  id: number;
  name: string;
  created_at: string;
}

interface SaveVersionControlProps {
  backendResumeId: number | null;
  showVersionInput: boolean;
  setShowVersionInput: (value: boolean) => void;
  versionName: string;
  setVersionName: (value: string) => void;
  isSavingVersion: boolean;
  handleSaveVersion: () => Promise<void>;
}

function SaveVersionControl({
  backendResumeId,
  showVersionInput,
  setShowVersionInput,
  versionName,
  setVersionName,
  isSavingVersion,
  handleSaveVersion,
}: SaveVersionControlProps) {
  return (
    <>
      {!showVersionInput ? (
        <button
          onClick={() => {
            if (backendResumeId) setShowVersionInput(true);
          }}
          disabled={!backendResumeId}
          title={!backendResumeId ? 'Upload a PDF resume to enable version history' : 'Save current resume as a named version'}
          className="text-xs font-bold bg-white text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Version
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            autoFocus
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSaveVersion();
              if (e.key === 'Escape') setShowVersionInput(false);
            }}
            placeholder="Version name..."
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #c7d2fe', borderRadius: 8, outline: 'none', width: 130 }}
          />
          <button
            onClick={() => void handleSaveVersion()}
            disabled={isSavingVersion || !versionName.trim()}
            style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: isSavingVersion ? 0.6 : 1 }}
          >
            {isSavingVersion ? '...' : 'Save'}
          </button>
          <button onClick={() => setShowVersionInput(false)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
            X
          </button>
        </div>
      )}
    </>
  );
}

export function VersionHistoryPanel({
  backendResumeId,
  showVersions,
  isLoadingVersions,
  versions,
  handleLoadVersions,
  handleRestoreVersion,
}: {
  backendResumeId: number | null;
  showVersions: boolean;
  isLoadingVersions: boolean;
  versions: Version[];
  handleLoadVersions: () => Promise<void>;
  handleRestoreVersion: (versionId: number) => Promise<void>;
}) {
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <button
        onClick={() => void handleLoadVersions()}
        disabled={!backendResumeId}
        title={!backendResumeId ? 'Upload a PDF resume to enable version history' : undefined}
        style={{
          width: '100%',
          padding: '12px 20px',
          background: 'none',
          border: 'none',
          cursor: backendResumeId ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 600,
          color: backendResumeId ? '#64748b' : '#cbd5e1',
          opacity: backendResumeId ? 1 : 0.5,
        }}
      >
        <span>Version History</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{showVersions ? '▲ hide' : '▼ show'}</span>
      </button>
      {showVersions && (
        <div style={{ padding: '0 16px 12px' }}>
          {isLoadingVersions ? (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Loading...</div>
          ) : versions.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>No saved versions yet. Use "Save Version" above.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {versions.map((version) => (
                <div key={version.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{version.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(version.created_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => void handleRestoreVersion(version.id)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#6366f1', cursor: 'pointer' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SaveVersionControl;
