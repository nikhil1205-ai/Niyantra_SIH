import React, { useState } from 'react'

const DOCUMENT_TYPES = [
  'Government Documents',
  'Policies',
  'Case Files',
  'Evidence',
  'Rules & Regulations',
  'Reports',
  'Other Documents',
]

export default function NiyantraWorkspace() {
  const [selectedDocumentType, setSelectedDocumentType] = useState(null)

  return (
    <>
      <section className="section" style={{ minHeight: '80vh', paddingTop: '40px', paddingBottom: '60px' }}>
        <div className="container-large">
          <div className="workspace-grid">
            {/* Left Sidebar */}
            <aside
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#000433',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #edf2f7',
                }}
              >
                Documents
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DOCUMENT_TYPES.map((docType) => {
                  const isSelected = selectedDocumentType === docType
                  return (
                    <li key={docType}>
                      <button
                        onClick={() => setSelectedDocumentType(docType)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #0087CC' : '1px solid transparent',
                          background: isSelected ? 'rgba(0, 135, 204, 0.08)' : 'transparent',
                          color: isSelected ? '#0087CC' : '#4a5568',
                          fontWeight: isSelected ? '600' : '500',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {docType}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </aside>

            {/* Right Main Content Workspace */}
            <main
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '32px',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h1 className="heading-style-h1" style={{ fontSize: '2.25rem', color: '#000433', marginBottom: '8px' }}>
                  NIYANTRA Workspace
                </h1>
                <p className="text-size-large" style={{ fontSize: '16px', color: '#718096' }}>
                  {selectedDocumentType
                    ? `Selected: ${selectedDocumentType}`
                    : 'Select a document type from the sidebar to begin.'}
                </p>
              </div>

              {/* Empty Workspace Area */}
              <div
                style={{
                  flex: 1,
                  border: '2px dashed #e2e8f0',
                  borderRadius: '8px',
                  background: '#fafbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                }}
              >
                {/* Intentionally empty area for future document operations */}
              </div>
            </main>
          </div>
        </div>
      </section>
    </>
  )
}
