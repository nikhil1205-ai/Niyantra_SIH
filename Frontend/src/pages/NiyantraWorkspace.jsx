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