import React, { useState, useEffect } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8000'

const DOCUMENT_TYPES = [
  'Case Files',
  'Evidence',
  'Rules & Regulations',
  'Reports',
  'Policies',
  'Government Documents',
  'Other Documents',
]

export default function NiyantraWorkspace() {
  const [selectedDocumentType, setSelectedDocumentType] = useState('Case Files')
  
  // Backend & Case States
  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const [activeCaseRef, setActiveCaseRef] = useState('')
  const [caseData, setCaseData] = useState(null)
  const [lineageData, setLineageData] = useState([])
  const [narrativeData, setNarrativeData] = useState(null)
  const [latestProposal, setLatestProposal] = useState(null)
  const [gatewayResult, setGatewayResult] = useState(null)
  const [demoInstructions, setDemoInstructions] = useState([])
  
  // Form States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // New Case Form State
  const [newCase, setNewCase] = useState({
    claimed_amount: 45000,
    approved_rate: 40000,
    hospital_name: 'Max Healthcare',
    beneficiary_id: 'BEN-10042',
    diagnosis: 'Cardiology Consultation & Tests',
    description: 'CGHS OPD Medical Claim'
  })

  // New Evidence Form State
  const [evidenceType, setEvidenceType] = useState('rate_mismatch')
  const [evidenceDesc, setEvidenceDesc] = useState('Claimed amount exceeds approved CGHS rate card')
  const [evidenceSource, setEvidenceSource] = useState('billing_audit')

  // Proposal Action State
  const [proposalAction, setProposalAction] = useState('settlement')

  // Approval Form State
  const [approvalNotes, setApprovalNotes] = useState('Reviewed by CGHS Senior Officer')
  const [humanId, setHumanId] = useState('OFFICER-789')

  // Ping Backend on Mount
  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/`)
      if (res.ok) {
        setIsBackendConnected(true)
      } else {
        setIsBackendConnected(false)
      }
    } catch {
      setIsBackendConnected(false)
    }
  }

  // ─── API HANDLERS ─────────────────────────────────────────────────────────────

  // 1. GET /api/cases/{case_ref}
  const fetchCaseDetails = async (caseRefToFetch) => {
    const ref = caseRefToFetch || activeCaseRef
    if (!ref) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(ref)}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to fetch case details')
      }
      const data = await res.json()
      setCaseData(data)
      setActiveCaseRef(data.case_ref)
      
      // Auto fetch lineage & explainability
      fetchLineage(data.case_ref)
      fetchExplain(data.case_ref)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 2. POST /api/cases
  const createNewCase = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_type: 'cghs_claim',
          claimed_amount: Number(newCase.claimed_amount),
          approved_rate: Number(newCase.approved_rate),
          hospital_name: newCase.hospital_name,
          beneficiary_id: newCase.beneficiary_id,
          diagnosis: newCase.diagnosis,
          description: newCase.description
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to create case')
      }
      const data = await res.json()
      setCaseData(data)
      setActiveCaseRef(data.case_ref)
      setLatestProposal(null)
      setGatewayResult(null)
      setSuccessMsg(`Created Case ${data.case_ref} successfully!`)
      fetchLineage(data.case_ref)
      fetchExplain(data.case_ref)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. POST /api/cases/{case_ref}/evidence
  const addEvidence = async (e) => {
    if (e) e.preventDefault()
    if (!activeCaseRef) {
      setErrorMsg('No active case selected. Please create or load a case first.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(activeCaseRef)}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_type: evidenceType,
          description: evidenceDesc,
          source: evidenceSource,
          payload: {
            timestamp: new Date().toISOString(),
            risk_flag: evidenceType
          }
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to add evidence')
      }
      const data = await res.json()
      setSuccessMsg(`Evidence added! New Risk Score: ${data.risk_score} (${data.autonomy_level})`)
      fetchCaseDetails(activeCaseRef)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 4. POST /api/cases/{case_ref}/propose
  const requestProposal = async (e) => {
    if (e) e.preventDefault()
    if (!activeCaseRef) {
      setErrorMsg('No active case selected.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setGatewayResult(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(activeCaseRef)}/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: proposalAction })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Proposal generation failed')
      }
      const data = await res.json()
      setLatestProposal(data)
      setSuccessMsg(`AI Agent generated proposal: "${data.action_type}" (Confidence: ${(data.confidence_score * 100).toFixed(0)}%)`)
      fetchCaseDetails(activeCaseRef)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 5. POST /api/cases/{case_ref}/execute
  const executeProposal = async (e) => {
    if (e) e.preventDefault()
    if (!activeCaseRef) {
      setErrorMsg('No active case selected.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(activeCaseRef)}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: latestProposal ? latestProposal.proposal_id : ''
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Tool Gateway execution failed')
      }
      const data = await res.json()
      setGatewayResult(data)
      if (data.status === 'executed') {
        setSuccessMsg(`Tool Gateway EXECUTED action. Risk: ${data.risk_score} (${data.autonomy_level})`)
      } else if (data.status === 'pending_approval') {
        setSuccessMsg(`Tool Gateway placed action in PENDING APPROVAL. Risk: ${data.risk_score} (${data.autonomy_level})`)
      } else {
        setSuccessMsg(`Tool Gateway BLOCKED action. Reason: ${data.reason}`)
      }
      fetchCaseDetails(activeCaseRef)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 6. POST /api/cases/{case_ref}/approve
  const handleHumanApproval = async (approved) => {
    if (!activeCaseRef) {
      setErrorMsg('No active case selected.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(activeCaseRef)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: approved,
          notes: approvalNotes,
          human_id: humanId
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Approval request failed')
      }
      const data = await res.json()
      setSuccessMsg(data.message)
      fetchCaseDetails(activeCaseRef)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 7. GET /api/cases/{case_ref}/lineage
  const fetchLineage = async (caseRefToFetch) => {
    const ref = caseRefToFetch || activeCaseRef
    if (!ref) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(ref)}/lineage`)
      if (res.ok) {
        const data = await res.json()
        setLineageData(data)
      }
    } catch (err) {
      console.error('Lineage fetch error:', err)
    }
  }

  // 8. GET /api/cases/{case_ref}/explain
  const fetchExplain = async (caseRefToFetch) => {
    const ref = caseRefToFetch || activeCaseRef
    if (!ref) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(ref)}/explain`)
      if (res.ok) {
        const data = await res.json()
        setNarrativeData(data)
      }
    } catch (err) {
      console.error('Explain fetch error:', err)
    }
  }

  // 9. POST /api/demo/scenario/{scenarioName}
  const loadDemoScenario = async (scenarioName) => {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo/scenario/${scenarioName}`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to load demo scenario')
      }
      const data = await res.json()
      setSuccessMsg(data.message)
      if (data.instructions) {
        setDemoInstructions(data.instructions)
      }
      if (data.case_ref) {
        setActiveCaseRef(data.case_ref)
        setLatestProposal(null)
        setGatewayResult(null)
        fetchCaseDetails(data.case_ref)
      }
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 10. POST /api/demo/reset
  const resetDemoState = async () => {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo/reset`, { method: 'POST' })
      if (!res.ok) throw new Error('Reset failed')
      const data = await res.json()
      setCaseData(null)
      setActiveCaseRef('')
      setLineageData([])
      setNarrativeData(null)
      setLatestProposal(null)
      setGatewayResult(null)
      setDemoInstructions([])
      setSuccessMsg(data.message)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper badge color calculator
  const getAutonomyBadgeStyle = (level) => {
    switch (level) {
      case 'L4': return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', name: 'L4 - Fully Autonomous' }
      case 'L3': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', name: 'L3 - Audited Autonomous' }
      case 'L2': return { bg: '#fffbebe', color: '#b45309', border: '#fde68a', name: 'L2 - Human Approval Required' }
      case 'L1': return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', name: 'L1 - Recommendation Only' }
      case 'L0': return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', name: 'L0 - Blocked' }
      default: return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', name: level || 'N/A' }
    }
  }

  return (
    <>
      <section className="section" style={{ minHeight: '80vh', paddingTop: '40px', paddingBottom: '60px' }}>
        <div className="container-large">

          {/* Connection Status & Demo Controls Bar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: isBackendConnected ? '#10b981' : '#ef4444',
                  boxShadow: isBackendConnected ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#000433' }}>
                Backend: {isBackendConnected ? `Connected (${API_BASE_URL})` : 'Offline (Start uvicorn)'}
              </span>
              {!isBackendConnected && (
                <button
                  onClick={checkBackendHealth}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                  }}
                >
                  Retry Connection
                </button>
              )}
            </div>

            {/* Quick Demo Scenarios */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#718096' }}>Demo Scenarios:</span>
              <button
                onClick={() => loadDemoScenario('scenario1_clean')}
                style={btnStyleSecondary}
                title="Low risk case (< 20 risk, L4)"
              >
                1. Clean (L4)
              </button>
              <button
                onClick={() => loadDemoScenario('scenario2_medium')}
                style={btnStyleSecondary}
                title="Medium risk case (40-65 risk, L2)"
              >
                2. Medium (L2)
              </button>
              <button
                onClick={() => loadDemoScenario('scenario3_high')}
                style={btnStyleSecondary}
                title="High risk rate mismatch (65-85 risk, L1)"
              >
                3. High (L1)
              </button>
              <button
                onClick={() => loadDemoScenario('scenario4_critical')}
                style={btnStyleSecondary}
                title="Critical multi-factor anomaly (> 85 risk, L0)"
              >
                4. Critical (L0)
              </button>
              <button
                onClick={() => loadDemoScenario('live_demo')}
                style={btnStylePrimary}
              >
                ⚡ Live Demo Flow
              </button>
              <button
                onClick={resetDemoState}
                style={{ ...btnStyleSecondary, color: '#ef4444', borderColor: '#fca5a5' }}
              >
                Reset System
              </button>
            </div>
          </div>

          {/* Alert Banners */}
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: '20px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: '20px',
                borderRadius: '8px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ✅ {successMsg}
            </div>
          )}

          {/* Demo Scenario Instructions Banner if returned */}
          {demoInstructions.length > 0 && (
            <div
              style={{
                padding: '16px',
                marginBottom: '24px',
                borderRadius: '10px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700' }}>
                📋 Demo Scenario Instructions:
              </h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                {demoInstructions.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

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

              {/* Active Case Quick Lookup Box */}
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #edf2f7',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#000433', marginBottom: '8px' }}>
                  Search Case
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="e.g. CGHS-2026-001"
                    value={activeCaseRef}
                    onChange={(e) => setActiveCaseRef(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    onClick={() => fetchCaseDetails(activeCaseRef)}
                    disabled={loading}
                    style={btnStylePrimary}
                  >
                    Load
                  </button>
                </div>
              </div>
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
              {/* Header Info */}
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 className="heading-style-h1" style={{ fontSize: '2.25rem', color: '#000433', marginBottom: '4px' }}>
                    NIYANTRA Workspace
                  </h1>
                  <p className="text-size-large" style={{ fontSize: '15px', color: '#718096', margin: 0 }}>
                    {selectedDocumentType ? `Section: ${selectedDocumentType}` : 'Select a document type to begin.'}
                  </p>
                </div>

                {/* Active Case Badge */}
                {caseData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>
                        Ref: {caseData.case_ref}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                        Risk: {caseData.risk_score} / 100
                      </div>
                    </div>
                    {(() => {
                      const badge = getAutonomyBadgeStyle(caseData.autonomy_level)
                      return (
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontSize: '13px',
                            fontWeight: '700',
                          }}
                        >
                          {badge.name}
                        </span>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Main Content Area Based on Tab Selection */}
              <div
                style={{
                  flex: 1,
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#fafbfe',
                  padding: '24px',
                  minHeight: '450px',
                }}
              >
                {/* TAB 1: Case Files */}
                {selectedDocumentType === 'Case Files' && (
                  <div>
                    <h3 style={sectionHeadingStyle}>CGHS Claim Case File</h3>

                    {/* Case Creation Form */}
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>➕ Create New CGHS Medical Claim Case (POST /api/cases)</h4>
                      <form onSubmit={createNewCase} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={labelStyle}>Beneficiary ID</label>
                          <input
                            type="text"
                            value={newCase.beneficiary_id}
                            onChange={(e) => setNewCase({ ...newCase, beneficiary_id: e.target.value })}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Hospital Name</label>
                          <input
                            type="text"
                            value={newCase.hospital_name}
                            onChange={(e) => setNewCase({ ...newCase, hospital_name: e.target.value })}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Claimed Amount (₹)</label>
                          <input
                            type="number"
                            value={newCase.claimed_amount}
                            onChange={(e) => setNewCase({ ...newCase, claimed_amount: e.target.value })}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Approved CGHS Rate (₹)</label>
                          <input
                            type="number"
                            value={newCase.approved_rate}
                            onChange={(e) => setNewCase({ ...newCase, approved_rate: e.target.value })}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Diagnosis / Medical Condition</label>
                          <input
                            type="text"
                            value={newCase.diagnosis}
                            onChange={(e) => setNewCase({ ...newCase, diagnosis: e.target.value })}
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <button type="submit" disabled={loading} style={{ ...btnStylePrimary, width: '100%', padding: '12px' }}>
                            {loading ? 'Processing...' : 'Submit Claim Case to Backend'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Case Details View */}
                    {caseData ? (
                      <div style={{ ...cardBoxStyle, marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={cardHeaderStyle}>📄 Case Details: {caseData.case_ref}</h4>
                          <button onClick={() => fetchCaseDetails(caseData.case_ref)} style={btnStyleSecondary}>
                            🔄 Refresh Case
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <span style={labelStyle}>Status:</span>
                            <div style={{ fontWeight: '700', color: '#000433' }}>{caseData.status}</div>
                          </div>
                          <div>
                            <span style={labelStyle}>Claimed Amount:</span>
                            <div style={{ fontWeight: '700', color: '#000433' }}>₹{caseData.claimed_amount?.toLocaleString()}</div>
                          </div>
                          <div>
                            <span style={labelStyle}>Approved Rate:</span>
                            <div style={{ fontWeight: '700', color: '#000433' }}>₹{caseData.approved_rate?.toLocaleString()}</div>
                          </div>
                          <div>
                            <span style={labelStyle}>Hospital:</span>
                            <div style={{ fontWeight: '600' }}>{caseData.hospital_name}</div>
                          </div>
                          <div>
                            <span style={labelStyle}>Beneficiary:</span>
                            <div style={{ fontWeight: '600' }}>{caseData.beneficiary_id}</div>
                          </div>
                          <div>
                            <span style={labelStyle}>Diagnosis:</span>
                            <div style={{ fontWeight: '600' }}>{caseData.diagnosis}</div>
                          </div>
                        </div>

                        {/* Triggered Policy Rules */}
                        {caseData.policy_triggers && caseData.policy_triggers.length > 0 && (
                          <div style={{ marginTop: '12px', padding: '12px', background: '#fffbebe', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            <strong style={{ color: '#92400e', fontSize: '13px' }}>⚠️ Triggered Policy Rules:</strong>
                            <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#78350f' }}>
                              {caseData.policy_triggers.map((rule, i) => (
                                <li key={i}>{rule}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#64748b', fontStyle: 'italic', marginTop: '16px' }}>
                        No case loaded yet. Create a case above or pick a Demo Scenario from the top bar.
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 2: Evidence */}
                {selectedDocumentType === 'Evidence' && (
                  <div>
                    <h3 style={sectionHeadingStyle}>Evidence & Anomaly Recording</h3>

                    {/* Add Evidence Form */}
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>🔬 Add Risky Evidence to Case (POST /api/cases/{'{ref}'}/evidence)</h4>
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-8px' }}>
                        Adding evidence automatically triggers the backend Risk Engine to recalculate the 5-factor risk score and update the Autonomy Level in real time.
                      </p>

                      <form onSubmit={addEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={labelStyle}>Active Case</label>
                          <input type="text" value={activeCaseRef || 'No case loaded'} readOnly style={{ ...inputStyle, background: '#f1f5f9' }} />
                        </div>

                        <div>
                          <label style={labelStyle}>Evidence Type (Risk Anomaly Preset)</label>
                          <select
                            value={evidenceType}
                            onChange={(e) => {
                              setEvidenceType(e.target.value)
                              if (e.target.value === 'rate_mismatch') setEvidenceDesc('Claimed amount exceeds approved CGHS rate card limit')
                              if (e.target.value === 'missing_document') setEvidenceDesc('Discharge summary or itemized hospital bill missing')
                              if (e.target.value === 'duplicate_claim') setEvidenceDesc('Duplicate claim submission detected for beneficiary within 30 days')
                              if (e.target.value === 'beneficiary_conflict') setEvidenceDesc('Beneficiary status conflict or identity mismatch flag')
                              if (e.target.value === 'clean') setEvidenceDesc('Verified supporting documentation attached')
                            }}
                            style={inputStyle}
                          >
                            <option value="rate_mismatch">rate_mismatch (High Risk Anomaly)</option>
                            <option value="missing_document">missing_document (Documentation Anomaly)</option>
                            <option value="duplicate_claim">duplicate_claim (High Risk Fraud Anomaly)</option>
                            <option value="beneficiary_conflict">beneficiary_conflict (Identity Anomaly)</option>
                            <option value="clean">clean (Verified Document)</option>
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Description</label>
                          <input
                            type="text"
                            value={evidenceDesc}
                            onChange={(e) => setEvidenceDesc(e.target.value)}
                            style={inputStyle}
                            required
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Source</label>
                          <input
                            type="text"
                            value={evidenceSource}
                            onChange={(e) => setEvidenceSource(e.target.value)}
                            style={inputStyle}
                            required
                          />
                        </div>

                        <button type="submit" disabled={loading || !activeCaseRef} style={btnStylePrimary}>
                          {loading ? 'Submitting Evidence...' : 'Inject Evidence to Backend'}
                        </button>
                      </form>
                    </div>

                    {/* Attached Evidence List */}
                    {caseData && caseData.evidence_list && (
                      <div style={{ ...cardBoxStyle, marginTop: '20px' }}>
                        <h4 style={cardHeaderStyle}>📋 Evidence History ({caseData.evidence_list.length} Items)</h4>
                        {caseData.evidence_list.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '13px' }}>No evidence recorded yet.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {caseData.evidence_list.map((ev, i) => (
                              <div key={i} style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <strong style={{ color: '#0087CC', fontSize: '14px' }}>{ev.evidence_type}</strong>
                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Source: {ev.source}</span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155' }}>{ev.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Rules & Governance (Proposals, Tool Gateway, Human Approval) */}
                {selectedDocumentType === 'Rules & Regulations' && (
                  <div>
                    <h3 style={sectionHeadingStyle}>Governance, Proposal & Tool Gateway Flow</h3>

                    {/* Core Principle Callout */}
                    <div style={{ padding: '12px 16px', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #7dd3fc', color: '#0369a1', marginBottom: '20px', fontSize: '13px' }}>
                      <strong>🛡️ Core Governance Principle:</strong> AI agents can <em>propose</em> actions, but CANNOT directly execute them. Every action must pass through the <strong>Tool Gateway</strong>, which queries live risk scores before execution.
                    </div>

                    {/* STEP 1: AI Agent Proposal */}
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>1️⃣ AI Agent Proposal (POST /api/cases/{'{ref}'}/propose)</h4>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select
                          value={proposalAction}
                          onChange={(e) => setProposalAction(e.target.value)}
                          style={{ ...inputStyle, width: '220px' }}
                        >
                          <option value="settlement">settlement (High Impact: 90)</option>
                          <option value="claim_submit">claim_submit (Medium Impact: 70)</option>
                          <option value="update_status">update_status (Low Impact: 40)</option>
                          <option value="check_rate">check_rate (Low Impact: 20)</option>
                          <option value="verify_beneficiary">verify_beneficiary (Read Only: 10)</option>
                          <option value="read_case">read_case (Read Only: 5)</option>
                        </select>
                        <button onClick={requestProposal} disabled={loading || !activeCaseRef} style={btnStylePrimary}>
                          Generate Proposal
                        </button>
                      </div>

                      {latestProposal && (
                        <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>PROPOSAL CREATED ({latestProposal.proposal_id})</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                            Action: {latestProposal.action_type} | Proposed Amount: ₹{latestProposal.proposed_amount?.toLocaleString() || 'N/A'}
                          </div>
                          <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>
                            Justification: {latestProposal.justification}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* STEP 2: Tool Gateway Execution */}
                    <div style={{ ...cardBoxStyle, marginTop: '20px' }}>
                      <h4 style={cardHeaderStyle}>2️⃣ Tool Gateway Dispatch (POST /api/cases/{'{ref}'}/execute)</h4>
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-8px' }}>
                        The Tool Gateway checks current case risk score and level (never cached auth).
                      </p>
                      <button onClick={executeProposal} disabled={loading || !activeCaseRef} style={{ ...btnStylePrimary, background: '#000433' }}>
                        Submit Proposal to Tool Gateway
                      </button>

                      {gatewayResult && (
                        <div
                          style={{
                            marginTop: '14px',
                            padding: '14px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: gatewayResult.status === 'executed' ? '#a7f3d0' : gatewayResult.status === 'pending_approval' ? '#fde68a' : '#fecaca',
                            background: gatewayResult.status === 'executed' ? '#ecfdf5' : gatewayResult.status === 'pending_approval' ? '#fffbebe' : '#fef2f2',
                          }}
                        >
                          <strong style={{ fontSize: '14px', textTransform: 'uppercase', color: gatewayResult.status === 'executed' ? '#047857' : gatewayResult.status === 'pending_approval' ? '#b45309' : '#b91c1c' }}>
                            Gateway Outcome: {gatewayResult.status}
                          </strong>
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155' }}>
                            {gatewayResult.reason}
                          </p>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                            Risk Score: {gatewayResult.risk_score} | Level: {gatewayResult.autonomy_level}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* STEP 3: Human Approval for L2 */}
                    <div style={{ ...cardBoxStyle, marginTop: '20px' }}>
                      <h4 style={cardHeaderStyle}>3️⃣ Human Officer Override / Approval (POST /api/cases/{'{ref}'}/approve)</h4>
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-8px' }}>
                        Used when Tool Gateway returns `pending_approval` for L2 cases.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={labelStyle}>Human Officer ID</label>
                          <input type="text" value={humanId} onChange={(e) => setHumanId(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Approval Notes</label>
                          <input type="text" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => handleHumanApproval(true)} disabled={loading || !activeCaseRef} style={{ ...btnStylePrimary, background: '#10b981' }}>
                          Approve Action
                        </button>
                        <button onClick={() => handleHumanApproval(false)} disabled={loading || !activeCaseRef} style={{ ...btnStyleSecondary, color: '#ef4444', borderColor: '#fca5a5' }}>
                          Reject Action
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Reports & Narrative Explainability */}
                {selectedDocumentType === 'Reports' && (
                  <div>
                    <h3 style={sectionHeadingStyle}>Governance Narrative & Risk Breakdown</h3>
                    
                    {narrativeData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={cardBoxStyle}>
                          <h4 style={cardHeaderStyle}>📖 Narrative Explanation (GET /api/cases/{'{ref}'}/explain)</h4>
                          <div
                            style={{
                              padding: '16px',
                              background: '#ffffff',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              fontSize: '14px',
                              lineHeight: '1.7',
                              color: '#1e293b',
                              whiteSpace: 'pre-line'
                            }}
                          >
                            {narrativeData.narrative}
                          </div>
                        </div>

                        {narrativeData.risk_breakdown && (
                          <div style={cardBoxStyle}>
                            <h4 style={cardHeaderStyle}>📊 5-Factor Risk Weight Breakdown</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              {Object.entries(narrativeData.risk_breakdown).map(([factor, score]) => (
                                <div key={factor} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>
                                    {factor.replace('_', ' ')}
                                  </div>
                                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#000433' }}>
                                    {typeof score === 'number' ? score.toFixed(1) : score}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                        No case loaded. Create or pick a case to view explanations.
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 5: Policies & Lineage */}
                {selectedDocumentType === 'Policies' && (
                  <div>
                    <h3 style={sectionHeadingStyle}>Append-Only Decision Lineage Audit Log</h3>

                    <div style={cardBoxStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ ...cardHeaderStyle, margin: 0 }}>📜 Audit Trail Timeline (GET /api/cases/{'{ref}'}/lineage)</h4>
                        <button onClick={() => fetchLineage(activeCaseRef)} style={btnStyleSecondary}>
                          🔄 Refresh Log
                        </button>
                      </div>

                      {lineageData.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>No lineage records yet for this case.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {lineageData.map((rec, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '12px 16px',
                                background: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                borderLeft: `4px solid ${rec.outcome === 'executed' ? '#10b981' : rec.outcome === 'blocked' ? '#ef4444' : '#0087CC'}`
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                                <span><strong>Actor:</strong> {rec.actor}</span>
                                <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
                                Event: {rec.event_type} | Action: {rec.action || 'N/A'} | Outcome: {rec.outcome}
                              </div>
                              <div style={{ fontSize: '12px', color: '#475569' }}>
                                {rec.details}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                Risk Score: {rec.risk_score} | Autonomy Level: {rec.autonomy_level}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: Government Documents & Other */}
                {(selectedDocumentType === 'Government Documents' || selectedDocumentType === 'Other Documents') && (
                  <div>
                    <h3 style={sectionHeadingStyle}>CGHS Official Policy & AI Governance Standards</h3>
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>🏛️ CGHS Governance Policy Reference</h4>
                      <ul style={{ lineHeight: '1.8', fontSize: '14px', color: '#334155' }}>
                        <li><strong>Standard CGHS Package Rate:</strong> ₹40,000 max for routine OPD/Procedural claims</li>
                        <li><strong>Risk Autonomy Scale:</strong> L4 (&lt;20 risk), L3 (20-40 risk), L2 (40-65 risk), L1 (65-85 risk), L0 (&gt;85 risk)</li>
                        <li><strong>Non-Negotiable Safety Rule:</strong> AI agents possess NO direct execution permissions over CGHS tool endpoints.</li>
                        <li><strong>Dynamic Authority Revocation:</strong> Real-time risk triggers continuously restrict agent permissions as new evidence arrives.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </section>
    </>
  )
}

// ─── Inline Reusable Styles matching NIYANTRA theme ───────────────────────────

const sectionHeadingStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#000433',
  marginBottom: '16px',
}

const cardBoxStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
}

const cardHeaderStyle = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#000433',
  margin: '0 0 12px 0',
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  marginBottom: '4px',
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnStylePrimary = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: '600',
  borderRadius: '6px',
  border: 'none',
  background: '#0087CC',
  color: '#ffffff',
  cursor: 'pointer',
  transition: 'opacity 0.2s ease',
}

const btnStyleSecondary = {
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: '600',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#475569',
  cursor: 'pointer',
}
