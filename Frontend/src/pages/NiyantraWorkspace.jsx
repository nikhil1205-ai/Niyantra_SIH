import React, { useState, useEffect } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8000'

const WORKSPACE_SECTIONS = [
  { id: 'Form', label: 'Form (App Intake)' },
  { id: 'Review', label: 'Review Case' },
  { id: 'Risk', label: 'Risk Engine' },
  { id: 'Progress', label: 'Progress Pipeline' },
  { id: 'EventUpdates', label: 'Event Updates' },
  { id: 'Officer Review', label: 'Officer Review' },
  { id: 'History', label: 'History & Audits' },
]


const DEFAULT_EVIDENCE = [
  { type: 'identity_doc', file_name: 'citizen_identity_proof.pdf', mime_type: 'application/pdf', source: 'CITIZEN' },
  { type: 'damage_photo', file_name: 'disaster_damage_photo1.jpg', mime_type: 'image/jpeg', source: 'CITIZEN' },
]

export default function NiyantraWorkspace() {
  const [activeTab, setActiveTab] = useState('Form')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  // Active Case State
  const [activeCaseRef, setActiveCaseRef] = useState('')
  const [caseDetails, setCaseDetails] = useState(null)
  const [submittedResult, setSubmittedResult] = useState(null)
  
  // Module 5 Actions State
  const [actions, setActions] = useState([])

  // Case History & Audit List State
  const [caseList, setCaseList] = useState([])
  const [caseSearchQuery, setCaseSearchQuery] = useState('')

  // Module 6 Officer Review State
  const [officerQueue, setOfficerQueue] = useState([])
  const [officerDetails, setOfficerDetails] = useState(null)
  const [officerLoading, setOfficerLoading] = useState(false)
  const [decisionReasonInput, setDecisionReasonInput] = useState('')
  const [reqEvidenceInput, setReqEvidenceInput] = useState({ evidenceRequired: '', instructions: '' })
  const [confirmModalType, setConfirmModalType] = useState(null) // 'APPROVED' | 'REJECTED' | 'REQUEST_MORE_EVIDENCE' | null

  // Pipeline Upgrade State
  const [showWhyModal, setShowWhyModal] = useState(false)

  const fetchCaseList = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases`)
      if (res.ok) {
        const data = await res.json()
        setCaseList(data)
      }
    } catch (err) {
      console.error("Failed to fetch case list:", err)
    }
  }

  useEffect(() => {
    fetchCaseList()
  }, [])

  const handleSelectCase = (caseId) => {
    setActiveCaseRef(caseId)
    fetchCaseDetails(caseId)
    fetchHistories(caseId)
  }

  // Module 1 Form State
  const [form, setForm] = useState({
    full_name: '',
    citizen_id: '',
    phone: '',
    address: '',
    district: '',
    state: '',
    disaster_type: 'Flood',
    disaster_date: new Date().toISOString().split('T')[0],
    affected_location: '',
    damage_type: 'House',
    estimated_damage: '',
    bank_account: '',
    ifsc: '',
    requested_amount: '',
  })

  // Evidence state (pre-populated with default documents)
  const [evidenceList, setEvidenceList] = useState(DEFAULT_EVIDENCE)
  const [newEvType, setNewEvType] = useState('identity_doc')
  const [newEvFileName, setNewEvFileName] = useState('')

  // Reset form state for new application
  const handleResetForm = () => {
    setForm({
      full_name: '',
      citizen_id: '',
      phone: '',
      address: '',
      district: '',
      state: '',
      disaster_type: 'Flood',
      disaster_date: new Date().toISOString().split('T')[0],
      affected_location: '',
      damage_type: 'House',
      estimated_damage: '',
      bank_account: '',
      ifsc: '',
      requested_amount: '',
    })
    setEvidenceList(DEFAULT_EVIDENCE)
    setValidationErrors({})
    setErrorMsg('')
    setSuccessMsg('')
    setSubmittedResult(null)
  }

  // Fill sample test application data
  const handleFillSampleData = () => {
    setForm({
      full_name: 'Rahul Sharma',
      citizen_id: 'CTZ-884920',
      phone: '9876543210',
      address: 'House 42, Riverbank Ward No. 4',
      district: 'Kamrup Metro',
      state: 'Assam',
      disaster_type: 'Flood',
      disaster_date: '2026-08-15',
      affected_location: 'Ward 4 Riverbank Colony, Guwahati',
      damage_type: 'House',
      estimated_damage: '80000',
      bank_account: '918273645012',
      ifsc: 'SBIN0001234',
      requested_amount: '25000',
    })
    setEvidenceList(DEFAULT_EVIDENCE)
    setValidationErrors({})
    setErrorMsg('')
    setSuccessMsg('Sample test application data loaded.')
  }

  // Add evidence item
  const handleAddEvidence = () => {
    let nameToAdd = newEvFileName.trim()
    if (!nameToAdd) {
      if (newEvType === 'identity_doc') nameToAdd = 'citizen_identity_proof.pdf'
      else if (newEvType === 'property_doc') nameToAdd = 'property_deed.pdf'
      else if (newEvType === 'damage_photo') nameToAdd = `disaster_damage_photo_${evidenceList.length + 1}.jpg`
      else nameToAdd = 'supporting_verification_doc.pdf'
    }

    setEvidenceList([
      ...evidenceList,
      {
        type: newEvType,
        file_name: nameToAdd,
        mime_type: nameToAdd.endsWith('.jpg') || nameToAdd.endsWith('.png') ? 'image/jpeg' : 'application/pdf',
        source: 'CITIZEN',
      },
    ])
    setNewEvFileName('')
    setValidationErrors((prev) => {
      const copy = { ...prev }
      delete copy.evidence
      return copy
    })
  }

  const handleRemoveEvidence = (index) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== index))
  }

  // Validate form before submission
  const validateForm = () => {
    const errors = {}

    if (!form.full_name.trim()) errors.full_name = 'Full Name is required.'
    if (!form.citizen_id.trim()) errors.citizen_id = 'Citizen ID is required.'
    
    if (!form.phone.trim()) {
      errors.phone = 'Phone Number is required.'
    } else if (!/^\d{10}$/.test(form.phone.trim())) {
      errors.phone = 'Phone Number must be 10 digits.'
    }

    if (!form.address.trim()) errors.address = 'Address is required.'
    if (!form.district.trim()) errors.district = 'District is required.'
    if (!form.state.trim()) errors.state = 'State is required.'
    if (!form.disaster_date) errors.disaster_date = 'Date of Disaster is required.'
    if (!form.affected_location.trim()) errors.affected_location = 'Affected Location is required.'

    const estDamage = Number(form.estimated_damage)
    if (!form.estimated_damage || isNaN(estDamage) || estDamage <= 0) {
      errors.estimated_damage = 'Valid positive damage amount is required.'
    }

    if (!form.bank_account.trim()) {
      errors.bank_account = 'Bank Account Number is required.'
    } else if (!/^\d{9,18}$/.test(form.bank_account.trim())) {
      errors.bank_account = 'Bank Account must be between 9 and 18 digits.'
    }

    if (!form.ifsc.trim()) {
      errors.ifsc = 'IFSC Code is required.'
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifsc.trim())) {
      errors.ifsc = 'Invalid IFSC Code format (e.g. SBIN0001234).'
    }

    const reqAmt = Number(form.requested_amount)
    if (!form.requested_amount || isNaN(reqAmt) || reqAmt <= 0) {
      errors.requested_amount = 'Valid positive relief amount is required.'
    }

    if (evidenceList.length === 0) {
      errors.evidence = 'At least 1 evidence document must be uploaded/attached.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Application Submit (Module 1 POST /api/cases)
  const handleSubmitApplication = async (e) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmittedResult(null)

    if (!validateForm()) {
      setErrorMsg('Please resolve all validation errors before submitting.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        citizen_id: form.citizen_id.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        disaster_type: form.disaster_type,
        disaster_date: form.disaster_date,
        affected_location: form.affected_location.trim(),
        damage_type: form.damage_type,
        estimated_damage: Number(form.estimated_damage),
        bank_account: form.bank_account.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        requested_amount: Number(form.requested_amount),
        evidence: evidenceList.map((ev) => ({
          type: ev.type,
          file_name: ev.file_name,
          mime_type: ev.mime_type,
          path_or_url: `/uploads/${ev.file_name}`,
        })),
      }

      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'We couldn\'t submit the application. Please try again.')
      }

      const data = await res.json()
      setSubmittedResult(data)
      setActiveCaseRef(data.case_id)
      setSuccessMsg(`Application created successfully! Persistent Case ID: ${data.case_id}`)
      
      // Auto fetch created case details
      fetchCaseDetails(data.case_id)
    } catch (err) {
      setErrorMsg(err.message || 'We couldn\'t submit the application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch details for Review tab
  const fetchCaseDetails = async (caseIdToFetch) => {
    const targetId = caseIdToFetch || activeCaseRef
    if (!targetId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}`)
      if (!res.ok) {
        throw new Error(`Case ${targetId} not found.`)
      }
      const data = await res.json()
      setCaseDetails(data)
      setActiveCaseRef(data.case_id)
      
      // Fetch actions for Module 5
      try {
        const actRes = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/actions`)
        if (actRes.ok) {
          const actData = await actRes.json()
          setActions(actData)
        }
      } catch (actErr) {
        console.error("Failed to fetch actions", actErr)
      }

      // Refresh sidebar case list
      fetchCaseList()
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Module 2: Trigger AI Agent Review
  const [reviewLoading, setReviewLoading] = useState(false)
  const handleRunAgentReview = async (simulateDisagreement = false) => {
    const targetId = caseDetails?.case_id || activeCaseRef
    if (!targetId) {
      setErrorMsg("No active case ID selected for review.")
      return
    }
    setReviewLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate_disagreement: simulateDisagreement }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to execute AI Agent Review.')
      }

      setSuccessMsg(
        simulateDisagreement
          ? 'AI Agent Review executed (Disagreement Scenario Simulated).'
          : 'AI Agent Review completed successfully!'
      )
      await fetchCaseDetails(targetId)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setReviewLoading(false)
    }
  }

  // Module 3: Trigger Risk Engine & Autonomy Controller
  const [riskLoading, setRiskLoading] = useState(false)
  const handleRunRiskEvaluation = async () => {
    const targetId = caseDetails?.case_id || activeCaseRef
    if (!targetId) {
      setErrorMsg('No active case selected for risk evaluation.')
      return
    }
    setRiskLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/risk/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Risk evaluation failed.')
      }
      const data = await res.json()
      setSuccessMsg(`Risk evaluation complete. Score: ${data.data.risk_score}/100 (${data.data.risk_level}). Autonomy: ${data.data.autonomy_level}.`)
      await fetchCaseDetails(targetId)
      setActiveTab('Risk')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setRiskLoading(false)
    }
  }

  // Module 4: Histories + Field Inspection Simulator
  const [riskHistory, setRiskHistory] = useState([])
  const [autonomyHistory, setAutonomyHistory] = useState([])
  const [eventLoading, setEventLoading] = useState(false)

  const fetchHistories = async (caseId) => {
    if (!caseId) return
    try {
      const [rh, ah] = await Promise.all([
        fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(caseId)}/risk/history`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(caseId)}/autonomy/history`).then(r => r.ok ? r.json() : []),
      ])
      setRiskHistory(rh)
      setAutonomyHistory(ah)
    } catch (_) { /* silent */ }
  }

  const handleSimulateFieldInspection = async (e) => {
    e.preventDefault()
    const targetId = caseDetails?.case_id || activeCaseRef
    if (!targetId) {
      setErrorMsg('No active case selected. Load a case first.')
      return
    }
    setEventLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const payload = {
        submitter_type: eventForm.submitterType,
        submitted_by: eventForm.submitterType === 'OFFICER' ? 'Officer John Doe' : 'Public Citizen',
        event_type: eventForm.eventType || 'DAMAGE_UPDATE',
        description: eventForm.description || `Event update for ${eventForm.field || 'case condition'}`,
        location: eventForm.location || 'Field Ward 4',
        damage_finding: eventForm.damageFinding,
        field: eventForm.field,
        previous_value: eventForm.previousValue,
        new_value: eventForm.newValue,
        evidence_files: eventForm.evidenceFiles || [],
      }

      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Event submission failed.')
      }
      const data = await res.json()
      if (data.idempotent) {
        setSuccessMsg('This event was already processed (idempotency enforced). No duplicate records created.')
      } else if (data.submitter_type === 'PUBLIC') {
        setSuccessMsg(`Public event submitted successfully. Event ID: ${data.event_id}. Status is PENDING verification.`)
      } else {
        const conflictMsg = data.conflict_detected
          ? ` Evidence conflict detected: AI assessed ${data.ai_damage_level} damage, field report says ${data.field_damage_level}.` : ''
        const autonomyMsg = data.autonomy_changed
          ? ` Autonomy: ${data.before.autonomy} → ${data.after.autonomy}.` : ''
        setSuccessMsg(`Officer event processed. Risk: ${data.before.risk} → ${data.after.risk}.${conflictMsg}${autonomyMsg} Action: ${data.after.action}.`)
      }
      await fetchCaseDetails(targetId)
      await fetchHistories(targetId)
      setActiveTab('Progress')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setEventLoading(false)
    }
  }

  const handleVerifyEvent = async (eventId) => {
    const targetId = caseDetails?.case_id || activeCaseRef
    if (!targetId || !eventId) return
    setEventLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/events/${encodeURIComponent(eventId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_by: 'Officer John Doe', notes: 'Verified via officer portal.' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Event verification failed.')
      }
      const data = await res.json()
      setSuccessMsg(`Event ${eventId} verified. Case risk recalculated: ${data.after?.risk || 'Updated'}. Autonomy: ${data.after?.autonomy || 'L1'}.`)
      await fetchCaseDetails(targetId)
      await fetchHistories(targetId)
      setActiveTab('Progress')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setEventLoading(false)
    }
  }

  // Module 5: Action Gateway Handlers
  const handleProposeDemoAction = async () => {
    const targetId = caseDetails?.case_id || activeCaseRef
    if (!targetId) return
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'PREPARE_RELIEF_PAYMENT',
          requested_by: 'relief_agent',
          parameters: { amount: 25000 }
        }),
      })
      if (!res.ok) throw new Error('Failed to propose action.')
      await fetchCaseDetails(targetId)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  const handleExecuteAction = async (actionId) => {
    const targetId = caseDetails?.case_id || activeCaseRef
    if (!targetId) return
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/actions/${encodeURIComponent(actionId)}/execute`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Action execution request failed.')
      const data = await res.json()
      if (data.decision === 'ALLOWED') {
        setSuccessMsg(`Action permitted and executed successfully.`)
      } else {
        setErrorMsg(`Action blocked by Tool Gateway. Reason: ${data.reason}`)
      }
      await fetchCaseDetails(targetId)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  // Module 6: Officer Review Handlers
  const fetchOfficerQueue = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/officer-review/queue`)
      if (res.ok) {
        const data = await res.json()
        setOfficerQueue(data)
      }
    } catch (err) {
      console.error("Failed to fetch officer queue", err)
    }
  }

  const fetchOfficerDetails = async (caseId) => {
    if (!caseId) return
    setOfficerLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(caseId)}/officer-review`)
      if (res.ok) {
        const data = await res.json()
        setOfficerDetails(data)
      }
    } catch (err) {
      console.error("Failed to fetch officer review details", err)
    } finally {
      setOfficerLoading(false)
    }
  }

  const handleSelectOfficerCase = (caseId) => {
    setActiveCaseRef(caseId)
    fetchCaseDetails(caseId)
    fetchOfficerDetails(caseId)
  }

  const handleConfirmDecision = async () => {
    const targetId = officerDetails?.case_id || activeCaseRef
    if (!targetId || !confirmModalType) return

    setOfficerLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      if (confirmModalType === 'REQUEST_MORE_EVIDENCE') {
        if (!reqEvidenceInput.evidenceRequired.trim()) {
          throw new Error("Specification of required evidence is mandatory.")
        }
        const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/request-evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evidence_required: reqEvidenceInput.evidenceRequired,
            instructions: reqEvidenceInput.instructions,
            officer_name: 'Officer John Doe'
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Failed to submit request for evidence.")
        }
        const data = await res.json()
        setSuccessMsg(`Additional evidence requested. Case stage set to ${data.new_stage}. Returned to Event Updates.`)
      } else {
        if (!decisionReasonInput.trim()) {
          throw new Error("Decision justification reason is mandatory.")
        }
        const targetAction = officerDetails?.actions?.find(a => a.status.includes('AUTHORIZATION') || a.status === 'BLOCKED' || a.status === 'PERMITTED')
        const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(targetId)}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: confirmModalType,
            reason: decisionReasonInput,
            action_id: targetAction?.action_id || null,
            officer_name: 'Officer John Doe'
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Officer decision submission failed.")
        }
        const data = await res.json()
        setSuccessMsg(`Officer decision recorded as ${data.decision}. Case stage updated to ${data.new_stage}.`)
      }

      setConfirmModalType(null)
      setDecisionReasonInput('')
      setReqEvidenceInput({ evidenceRequired: '', instructions: '' })
      
      await fetchCaseDetails(targetId)
      await fetchOfficerDetails(targetId)
      await fetchOfficerQueue()
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setOfficerLoading(false)
    }
  }

  const [eventForm, setEventForm] = useState({
    submitterType: 'PUBLIC',
    description: '',
    location: '',
    damageFinding: 'MINOR',
    evidenceFiles: ['simulated_field_photo_1.jpg'],
  })

  const handleContinueToReview = () => {
    setActiveTab('Review')
    if (activeCaseRef) {
      fetchCaseDetails(activeCaseRef)
    }
  }

  // Fetch histories / queues whenever switching tabs
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'Progress' && (caseDetails?.case_id || activeCaseRef)) {
      fetchHistories(caseDetails?.case_id || activeCaseRef)
    } else if (tabId === 'Officer Review') {
      fetchOfficerQueue()
      if (caseDetails?.case_id || activeCaseRef) {
        fetchOfficerDetails(caseDetails?.case_id || activeCaseRef)
      }
    }
  }

  return (
    <section className="section" style={{ minHeight: '80vh', paddingTop: '30px', paddingBottom: '60px', fontFamily: "Calibri, 'Segoe UI', Candara, Segoe, Optima, Arial, sans-serif" }}>
      <div className="container-large">

        {/* Top Header Connection Bar */}
        <div style={topBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            {activeCaseRef && (
              <span style={{ fontSize: '13px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
                Active Case: {activeCaseRef}
              </span>
            )}
          </div>
        </div>

        {/* Global Error and Success Alerts */}
        {errorMsg && (
          <div style={{ ...alertErrorStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '18px', fontWeight: '700', lineHeight: 1, padding: '0 4px', marginLeft: '12px' }}
              title="Dismiss alert"
            >
              ×
            </button>
          </div>
        )}
        {successMsg && (
          <div style={{ ...alertSuccessStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '18px', fontWeight: '700', lineHeight: 1, padding: '0 4px', marginLeft: '12px' }}
              title="Dismiss alert"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="workspace-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', marginTop: '20px' }}>
          
          {/* Left Sidebar */}
          <aside style={sidebarBoxStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000433', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
              NIYANTRA Workflow
            </h3>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {WORKSPACE_SECTIONS.map((sec) => {
                const isSelected = activeTab === sec.id
                return (
                  <li key={sec.id}>
                    <button
                      onClick={() => handleTabChange(sec.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #0087CC' : '1px solid transparent',
                        background: isSelected ? 'rgba(0, 135, 204, 0.08)' : 'transparent',
                        color: isSelected ? '#0087CC' : '#4a5568',
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>{sec.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Quick Case Lookup */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
              <label style={labelStyle}>Lookup Existing Case</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="e.g. CASE-2026-0001"
                  value={activeCaseRef}
                  onChange={(e) => setActiveCaseRef(e.target.value)}
                  style={inputStyle}
                />
                <button onClick={() => { setActiveTab('Review'); fetchCaseDetails(activeCaseRef) }} style={btnStylePrimary}>
                  Go
                </button>
              </div>
            </div>
          </aside>

          {/* Right Main Workspace Content */}
          <main style={mainWorkspaceStyle}>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: FORM — DISASTER RELIEF APPLICATION (MODULE 1)               */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'Form' && (
              <div>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.3', opacity: 1, filter: 'none', WebkitFontSmoothing: 'antialiased' }}>
                      Disaster Relief Application
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Module 1: Intake & Case Registration (Flood Disaster Relief Intake)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillSampleData}
                    style={{ ...btnStyleSecondary, background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd', padding: '8px 16px', fontWeight: '700' }}
                  >
                    Autofill Test Data
                  </button>
                </div>

                {/* SUBMISSION CONFIRMATION STATE */}
                {submittedResult ? (
                  <div style={cardBoxStyle}>
                    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#166534', margin: '0 0 8px 0' }}>
                        APPLICATION SUBMITTED
                      </h2>
                      <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px' }}>
                        Your application has been logged into the NIYANTRA immutable database.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', maxW: '600px', margin: '0 auto 28px auto', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={labelStyle}>CASE ID</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0087CC' }}>{submittedResult.case_id}</div>
                        </div>
                        <div>
                          <div style={labelStyle}>STATUS</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#000433' }}>{submittedResult.status}</div>
                        </div>
                        <div>
                          <div style={labelStyle}>STAGE</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>{submittedResult.current_stage}</div>
                        </div>
                        <div>
                          <div style={labelStyle}>RISK SCORE</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#eab308' }}>PENDING</div>
                        </div>
                        <div>
                          <div style={labelStyle}>AUTONOMY LEVEL</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#eab308' }}>PENDING</div>
                        </div>
                        <div>
                          <div style={labelStyle}>NEXT STEP</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb' }}>AI REVIEW</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={handleContinueToReview} style={{ ...btnStylePrimary, padding: '12px 24px', fontSize: '15px' }}>
                          Continue to Review →
                        </button>
                        <button onClick={handleResetForm} style={btnStyleSecondary}>
                          Submit Another Application
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* APPLICATION FORM */
                  <form onSubmit={handleSubmitApplication} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* SECTION A: CITIZEN INFORMATION */}
                    <div style={cardBoxStyle}>
                      <h3 style={cardHeaderStyle}>Section A — Citizen Information</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={labelStyle}>Full Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Rahul Sharma"
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            style={validationErrors.full_name ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.full_name && <span style={errorTextStyle}>{validationErrors.full_name}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>Citizen ID *</label>
                          <input
                            type="text"
                            placeholder="e.g. CTZ-884920"
                            value={form.citizen_id}
                            onChange={(e) => setForm({ ...form, citizen_id: e.target.value })}
                            style={validationErrors.citizen_id ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.citizen_id && <span style={errorTextStyle}>{validationErrors.citizen_id}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>Phone Number *</label>
                          <input
                            type="text"
                            placeholder="10 digit mobile number"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            style={validationErrors.phone ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.phone && <span style={errorTextStyle}>{validationErrors.phone}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>District *</label>
                          <input
                            type="text"
                            placeholder="e.g. Kamrup Metro"
                            value={form.district}
                            onChange={(e) => setForm({ ...form, district: e.target.value })}
                            style={validationErrors.district ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.district && <span style={errorTextStyle}>{validationErrors.district}</span>}
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Address *</label>
                          <input
                            type="text"
                            placeholder="Full residential address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            style={validationErrors.address ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.address && <span style={errorTextStyle}>{validationErrors.address}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>State *</label>
                          <input
                            type="text"
                            placeholder="e.g. Assam"
                            value={form.state}
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                            style={validationErrors.state ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.state && <span style={errorTextStyle}>{validationErrors.state}</span>}
                        </div>
                      </div>
                    </div>

                    {/* SECTION B: DISASTER INFORMATION */}
                    <div style={cardBoxStyle}>
                      <h3 style={cardHeaderStyle}>Section B — Disaster Information</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={labelStyle}>Disaster Type *</label>
                          <select
                            value={form.disaster_type}
                            onChange={(e) => setForm({ ...form, disaster_type: e.target.value })}
                            style={inputStyle}
                          >
                            <option value="Flood">Flood (Primary Scenario)</option>
                            <option value="Cyclone">Cyclone</option>
                            <option value="Earthquake">Earthquake</option>
                            <option value="Landslide">Landslide</option>
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Date of Disaster *</label>
                          <input
                            type="date"
                            value={form.disaster_date}
                            onChange={(e) => setForm({ ...form, disaster_date: e.target.value })}
                            style={validationErrors.disaster_date ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.disaster_date && <span style={errorTextStyle}>{validationErrors.disaster_date}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>Affected Location *</label>
                          <input
                            type="text"
                            placeholder="e.g. Ward 4 Riverbank Colony"
                            value={form.affected_location}
                            onChange={(e) => setForm({ ...form, affected_location: e.target.value })}
                            style={validationErrors.affected_location ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.affected_location && <span style={errorTextStyle}>{validationErrors.affected_location}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>Damage Type *</label>
                          <select
                            value={form.damage_type}
                            onChange={(e) => setForm({ ...form, damage_type: e.target.value })}
                            style={inputStyle}
                          >
                            <option value="House">House Damage</option>
                            <option value="Agriculture">Agriculture / Crop Loss</option>
                            <option value="Livelihood">Livelihood Loss</option>
                            <option value="Other">Other Property Damage</option>
                          </select>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Estimated Damage Amount (₹) *</label>
                          <input
                            type="number"
                            placeholder="e.g. 80000"
                            value={form.estimated_damage}
                            onChange={(e) => setForm({ ...form, estimated_damage: e.target.value })}
                            style={validationErrors.estimated_damage ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.estimated_damage && <span style={errorTextStyle}>{validationErrors.estimated_damage}</span>}
                        </div>
                      </div>
                    </div>

                    {/* SECTION C: BANK / RELIEF INFORMATION */}
                    <div style={cardBoxStyle}>
                      <h3 style={cardHeaderStyle}>Section C — Bank & Relief Information</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={labelStyle}>Bank Account Number *</label>
                          <input
                            type="text"
                            placeholder="e.g. 918273645012"
                            value={form.bank_account}
                            onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                            style={validationErrors.bank_account ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.bank_account && <span style={errorTextStyle}>{validationErrors.bank_account}</span>}
                        </div>

                        <div>
                          <label style={labelStyle}>IFSC Code *</label>
                          <input
                            type="text"
                            placeholder="e.g. SBIN0001234"
                            value={form.ifsc}
                            onChange={(e) => setForm({ ...form, ifsc: e.target.value })}
                            style={validationErrors.ifsc ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.ifsc && <span style={errorTextStyle}>{validationErrors.ifsc}</span>}
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Requested Relief Amount (₹) *</label>
                          <input
                            type="number"
                            placeholder="e.g. 25000"
                            value={form.requested_amount}
                            onChange={(e) => setForm({ ...form, requested_amount: e.target.value })}
                            style={validationErrors.requested_amount ? inputErrorStyle : inputStyle}
                          />
                          {validationErrors.requested_amount && <span style={errorTextStyle}>{validationErrors.requested_amount}</span>}
                        </div>
                      </div>
                    </div>

                    {/* SECTION D: EVIDENCE UPLOAD */}
                    <div style={cardBoxStyle}>
                      <h3 style={cardHeaderStyle}>Section D — Evidence Attachment</h3>
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-8px' }}>
                        Attach supporting evidence documents (Identity proof, Damage photos, Property deeds).
                      </p>

                      {validationErrors.evidence && <div style={alertErrorStyle}>{validationErrors.evidence}</div>}

                      {/* Evidence List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {evidenceList.map((ev, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{ev.file_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Type: {ev.type} | Source: {ev.source}</div>
                              </div>
                            </div>
                            <button type="button" onClick={() => handleRemoveEvidence(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700' }}>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add Custom Evidence Form */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <label style={labelStyle}>Document Type</label>
                          <select value={newEvType} onChange={(e) => setNewEvType(e.target.value)} style={inputStyle}>
                            <option value="identity_doc">Identity Document</option>
                            <option value="property_doc">Property / Address Document</option>
                            <option value="damage_photo">Damage Photograph</option>
                            <option value="supporting_doc">Additional Supporting Document</option>
                          </select>
                        </div>

                        <div style={{ flex: 2, minWidth: '220px' }}>
                          <label style={labelStyle}>File Name / Attachment</label>
                          <input
                            type="text"
                            placeholder="e.g. house_damage_photo1.jpg"
                            value={newEvFileName}
                            onChange={(e) => setNewEvFileName(e.target.value)}
                            style={inputStyle}
                          />
                        </div>

                        <button type="button" onClick={handleAddEvidence} style={btnStyleSecondary}>
                          + Attach Document
                        </button>
                      </div>
                    </div>

                    {/* COMPACT APPLICATION SUMMARY */}
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
                        Application Summary Preview
                      </h4>
                      <div style={{ fontSize: '13px', color: '#0c4a6e', lineHeight: '1.6' }}>
                        <div><strong>Applicant:</strong> {form.full_name || '—'} (ID: {form.citizen_id || '—'})</div>
                        <div><strong>Disaster:</strong> {form.disaster_type} ({form.affected_location || '—'}, {form.district || '—'})</div>
                        <div><strong>Estimated Damage:</strong> ₹{form.estimated_damage ? Number(form.estimated_damage).toLocaleString() : '0'}</div>
                        <div><strong>Requested Relief:</strong> ₹{form.requested_amount ? Number(form.requested_amount).toLocaleString() : '0'}</div>
                        <div><strong>Evidence Attached:</strong> {evidenceList.length} files</div>
                      </div>
                    </div>

                    {/* SUBMIT CTA */}
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        ...btnStylePrimary,
                        padding: '14px 28px',
                        fontSize: '16px',
                        fontWeight: '800',
                        width: '100%',
                        borderRadius: '8px',
                      }}
                    >
                      {loading ? 'Submitting Application...' : 'Submit Relief Application'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: REVIEW CASE (MODULE 2 — AI AGENT REVIEW & EVIDENCE ANALYSIS) */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'Review' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#000433', margin: 0 }}>
                      AI Agent Review & Evidence Package
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Module 2: Autonomous Multi-Agent Verification (Identity, Eligibility & Evidence Agents)
                    </p>
                  </div>
                  {caseDetails && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleRunAgentReview(false)}
                        disabled={reviewLoading}
                        style={{ ...btnStylePrimary, padding: '10px 18px', fontSize: '13px' }}
                      >
                        {reviewLoading ? 'Running Agents...' : 'Run AI Agent Review'}
                      </button>
                      <button
                        onClick={() => handleRunAgentReview(true)}
                        disabled={reviewLoading}
                        style={{ ...btnStyleSecondary, borderColor: '#f59e0b', color: '#b45309' }}
                      >
                        Test Agent Disagreement
                      </button>
                    </div>
                  )}
                </div>

                {caseDetails ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Case Header Card */}
                    <div style={cardBoxStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>PERSISTENT CASE ID</span>
                          <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0087CC', margin: 0 }}>{caseDetails.case_id}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                            Stage: {caseDetails.current_stage}
                          </span>
                          <span style={{ padding: '6px 12px', background: caseDetails.status === 'READY_FOR_RISK_EVALUATION' ? '#dcfce7' : '#fef3c7', color: caseDetails.status === 'READY_FOR_RISK_EVALUATION' ? '#166534' : '#92400e', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                            Status: {caseDetails.status}
                          </span>
                        </div>
                      </div>

                      {/* Consensus Status Indicator */}
                      {caseDetails.agent_consensus && caseDetails.agent_consensus !== 'PENDING' && (
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                            Multi-Agent Consensus Signal:
                          </div>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: caseDetails.agent_consensus === 'FULL_CONSENSUS' ? '#f0fdf4' : '#fffbeb',
                            color: caseDetails.agent_consensus === 'FULL_CONSENSUS' ? '#166534' : '#b45309',
                            border: caseDetails.agent_consensus === 'FULL_CONSENSUS' ? '1px solid #bbf7d0' : '1px solid #fde68a',
                          }}>
                            {caseDetails.agent_consensus === 'FULL_CONSENSUS' ? 'FULL CONSENSUS (All Agents Verified)' : 'PARTIAL DISAGREEMENT (Preserved for Module 3)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* AI AGENT REVIEW CARDS */}
                    {caseDetails.agent_results && caseDetails.agent_results.length > 0 ? (
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000433', marginBottom: '14px' }}>
                          Structured Agent Evidence Package ({caseDetails.agent_results.length} Agents Evaluated)
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          {caseDetails.agent_results.map((ag) => {
                            const isPass = ['VERIFIED', 'ELIGIBLE', 'DAMAGE_DETECTED'].includes(ag.status)
                            const confidencePct = Math.round(ag.confidence * 100)

                            return (
                              <div key={ag.result_id} style={{ ...cardBoxStyle, borderLeft: isPass ? '4px solid #22c55e' : '4px solid #f59e0b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                  {/* Header */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#0f172a' }}>
                                      {ag.agent_name.replace('_', ' ')}
                                    </h4>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      background: isPass ? '#dcfce7' : '#fef3c7',
                                      color: isPass ? '#15803d' : '#b45309',
                                    }}>
                                      {ag.status}
                                    </span>
                                  </div>

                                  {/* Confidence Meter */}
                                  <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                                      <span>Confidence Signal</span>
                                      <span>{confidencePct}%</span>
                                    </div>
                                    <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${confidencePct}%`, background: isPass ? '#22c55e' : '#f59e0b', height: '100%' }} />
                                    </div>
                                  </div>

                                  {/* Damage level if present */}
                                  {ag.damage_level && (
                                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                                      <strong>Damage Level:</strong> {ag.damage_level}
                                    </div>
                                  )}

                                  {/* Findings List */}
                                  <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                    <strong>Findings & Evidence Checked:</strong>
                                    {ag.findings && ag.findings.map((f, fi) => (
                                      <div key={fi} style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '11px' }}>[{f.type}]</div>
                                        <div>{f.description}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Card Footer Provenance */}
                                <div style={{ paddingTop: '10px', borderTop: '1px dashed #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                                  <div><strong>Action:</strong> <span style={{ color: '#0369a1', fontWeight: '700' }}>{ag.recommended_action}</span></div>
                                  {ag.evidence_ids && ag.evidence_ids.length > 0 && (
                                    <div style={{ marginTop: '2px' }}>
                                      <strong>Evidence Refs:</strong> {ag.evidence_ids.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Prompt to trigger review */
                      <div style={{ ...cardBoxStyle, textAlign: 'center', padding: '36px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>
                          AI Agent Review Pending
                        </h4>
                        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '500px', margin: '0 auto 20px auto' }}>
                          Case `{caseDetails.case_id}` is stored and ready for autonomous agent review. Trigger the Agent Orchestrator to execute Identity, Eligibility, and Evidence Agents.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button onClick={() => handleRunAgentReview(false)} disabled={reviewLoading} style={{ ...btnStylePrimary, padding: '12px 24px', fontSize: '14px' }}>
                            {reviewLoading ? 'Executing Agents...' : 'Run AI Agent Review'}
                          </button>
                          <button onClick={() => handleRunAgentReview(true)} disabled={reviewLoading} style={{ ...btnStyleSecondary, borderColor: '#f59e0b', color: '#b45309' }}>
                            Test Agent Disagreement Scenario
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Application & Evidence Provenance Details */}
                    {caseDetails.application && (
                      <div style={cardBoxStyle}>
                        <h4 style={cardHeaderStyle}>Submitted Application & Evidence Provenance</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                          <div><strong>Full Name:</strong> {caseDetails.application.full_name}</div>
                          <div><strong>Citizen ID:</strong> {caseDetails.application.citizen_id}</div>
                          <div><strong>Disaster Type:</strong> {caseDetails.application.disaster_type} ({caseDetails.application.disaster_date})</div>
                          <div><strong>Location:</strong> {caseDetails.application.affected_location}, {caseDetails.application.district}</div>
                          <div><strong>Estimated Damage:</strong> ₹{caseDetails.application.estimated_damage?.toLocaleString()}</div>
                          <div><strong>Requested Relief:</strong> ₹{caseDetails.application.requested_amount?.toLocaleString()}</div>
                        </div>

                        {caseDetails.evidence && (
                          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #edf2f7' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>LINKED EVIDENCE FILES ({caseDetails.evidence.length})</div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {caseDetails.evidence.map((ev, i) => (
                                <span key={i} style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0', color: '#334155' }}>
                                  <strong>{ev.evidence_id}:</strong> {ev.file_name} ({ev.type})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Module 3 Handoff — Run Risk Evaluation */}
                    <div style={{
                      padding: '16px 20px',
                      background: caseDetails.current_stage === 'RISK_EVALUATED'
                        ? '#f0fdf4' : caseDetails.current_stage === 'AI_REVIEW_COMPLETED'
                        ? '#eff6ff' : '#fef3c7',
                      border: caseDetails.current_stage === 'RISK_EVALUATED'
                        ? '1px solid #bbf7d0' : caseDetails.current_stage === 'AI_REVIEW_COMPLETED'
                        ? '1px solid #bfdbfe' : '1px solid #fde68a',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: caseDetails.current_stage === 'RISK_EVALUATED' ? '#166534' : caseDetails.current_stage === 'AI_REVIEW_COMPLETED' ? '#1e40af' : '#92400e' }}>
                          {caseDetails.current_stage === 'RISK_EVALUATED'
                            ? 'Module 3 Complete — Risk & Autonomy Evaluated'
                            : caseDetails.current_stage === 'AI_REVIEW_COMPLETED'
                            ? 'Module 2 Complete — Ready for Module 3 Risk Evaluation'
                            : 'Agent Review not yet run'}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '3px', opacity: 0.85, color: '#475569' }}>
                          Stage: <strong>{caseDetails.current_stage}</strong> | Status: <strong>{caseDetails.status}</strong>
                          {caseDetails.current_risk != null && (
                            <> | Risk: <strong>{caseDetails.current_risk}/100</strong> | Autonomy: <strong>{caseDetails.current_autonomy}</strong></>
                          )}
                        </div>
                      </div>
                      {caseDetails.current_stage === 'AI_REVIEW_COMPLETED' && (
                        <button
                          onClick={handleRunRiskEvaluation}
                          disabled={riskLoading}
                          style={{ ...btnStylePrimary, background: '#1d4ed8', padding: '10px 20px', fontSize: '13px', fontWeight: '700' }}
                        >
                          {riskLoading ? 'Evaluating Risk...' : 'Evaluate Risk (Module 3)'}
                        </button>
                      )}
                      {caseDetails.current_stage === 'RISK_EVALUATED' && (
                        <button
                          onClick={() => setActiveTab('Risk')}
                          style={{ ...btnStylePrimary, background: '#166534', padding: '10px 20px', fontSize: '13px' }}
                        >
                          View Risk Assessment
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={cardBoxStyle}>
                    <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                      No active case loaded. Please submit an application in the <strong>Form</strong> tab or load a Case ID on the left sidebar.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: RISK ENGINE (MODULE 3)                                      */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'Risk' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#000433', margin: 0 }}>NIYANTRA Risk Assessment</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Module 3: Dynamic Risk Engine & Autonomy Controller</p>
                  </div>
                  {caseDetails && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(caseDetails.current_stage === 'AI_REVIEW_COMPLETED' || caseDetails.current_stage === 'RISK_EVALUATED') && (
                        <button
                          onClick={handleRunRiskEvaluation}
                          disabled={riskLoading}
                          style={{ ...btnStylePrimary, background: '#1d4ed8', padding: '10px 18px', fontSize: '13px' }}
                        >
                          {riskLoading ? 'Evaluating...' : caseDetails.current_stage === 'RISK_EVALUATED' ? 'Re-Evaluate Risk' : 'Evaluate Risk'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {caseDetails?.risk ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Case Reference */}
                    <div style={{ ...cardBoxStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PERSISTENT CASE ID</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#0087CC' }}>{caseDetails.case_id}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '5px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                          Stage: {caseDetails.current_stage}
                        </span>
                        <span style={{ padding: '5px 12px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                          Status: {caseDetails.status}
                        </span>
                      </div>
                    </div>

                    {/* Risk Score + Autonomy Level — Hero Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      {/* Risk Score */}
                      <div style={{ ...cardBoxStyle, textAlign: 'center', borderTop: `4px solid ${ caseDetails.risk.risk_level === 'LOW' ? '#22c55e' : caseDetails.risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#ef4444' }` }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>RISK SCORE</div>
                        <div style={{ fontSize: '42px', fontWeight: '900', color: caseDetails.risk.risk_level === 'LOW' ? '#166534' : caseDetails.risk.risk_level === 'MEDIUM' ? '#b45309' : '#991b1b', lineHeight: 1 }}>
                          {caseDetails.risk.risk_score}
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>/ 100</div>
                        {/* Score bar */}
                        <div style={{ width: '100%', background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
                          <div style={{ width: `${caseDetails.risk.risk_score}%`, height: '100%', background: caseDetails.risk.risk_level === 'LOW' ? '#22c55e' : caseDetails.risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#ef4444', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>

                      {/* Risk Level */}
                      <div style={{ ...cardBoxStyle, textAlign: 'center', borderTop: `4px solid ${ caseDetails.risk.risk_level === 'LOW' ? '#22c55e' : caseDetails.risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#ef4444' }` }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>RISK LEVEL</div>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: caseDetails.risk.risk_level === 'LOW' ? '#166534' : caseDetails.risk.risk_level === 'MEDIUM' ? '#b45309' : '#991b1b' }}>
                          {caseDetails.risk.risk_level}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                          {caseDetails.risk.risk_level === 'LOW' ? 'Within autonomous threshold' : caseDetails.risk.risk_level === 'MEDIUM' ? 'Partial authorization required' : 'Human review required'}
                        </div>
                      </div>

                      {/* Autonomy Level */}
                      {caseDetails.autonomy && (
                        <div style={{ ...cardBoxStyle, textAlign: 'center', borderTop: `4px solid ${ caseDetails.autonomy.autonomy_level === 'L3' ? '#22c55e' : caseDetails.autonomy.autonomy_level === 'L2' ? '#f59e0b' : '#ef4444' }` }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>AUTONOMY LEVEL</div>
                          <div style={{ fontSize: '28px', fontWeight: '900', color: caseDetails.autonomy.autonomy_level === 'L3' ? '#166534' : caseDetails.autonomy.autonomy_level === 'L2' ? '#b45309' : '#991b1b' }}>
                            {caseDetails.autonomy.autonomy_level === 'L3' ? 'LEVEL 3' : caseDetails.autonomy.autonomy_level === 'L2' ? 'LEVEL 2' : 'LEVEL 1'}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                            {caseDetails.autonomy.autonomy_level === 'L3' ? 'High Autonomy' : caseDetails.autonomy.autonomy_level === 'L2' ? 'Controlled Autonomy' : 'Human Controlled'}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', background: caseDetails.autonomy.autonomy_level === 'L3' ? '#dcfce7' : caseDetails.autonomy.autonomy_level === 'L2' ? '#fef3c7' : '#fee2e2', color: caseDetails.autonomy.autonomy_level === 'L3' ? '#166534' : caseDetails.autonomy.autonomy_level === 'L2' ? '#b45309' : '#991b1b' }}>
                            {caseDetails.autonomy.autonomy_level === 'L3' ? 'AI ACTION PERMITTED' : caseDetails.autonomy.autonomy_level === 'L2' ? 'PARTIAL AUTHORIZATION' : 'HUMAN APPROVAL REQUIRED'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Risk Factor Breakdown */}
                    {caseDetails.risk.risk_factors && caseDetails.risk.risk_factors.length > 0 && (
                      <div style={cardBoxStyle}>
                        <h4 style={cardHeaderStyle}>Risk Factor Breakdown</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {caseDetails.risk.risk_factors.map((f, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 80px', gap: '12px', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{f.display}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{f.raw_label}</div>
                              <div style={{ width: '100%' }}>
                                <div style={{ width: '100%', background: '#e2e8f0', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(f.factor_risk, 100)}%`, height: '100%', background: f.contribution === 'LOW' ? '#22c55e' : f.contribution === 'MEDIUM' ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                                </div>
                              </div>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', textAlign: 'center', background: f.contribution === 'LOW' ? '#dcfce7' : f.contribution === 'MEDIUM' ? '#fef3c7' : '#fee2e2', color: f.contribution === 'LOW' ? '#166534' : f.contribution === 'MEDIUM' ? '#b45309' : '#991b1b' }}>
                                {f.contribution}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #edf2f7', paddingTop: '10px' }}>
                          Weighted formula: each factor contributes proportionally to its configured weight. Weights sum to 1.0.
                        </div>
                      </div>
                    )}

                    {/* Why This Score — Explanation */}
                    <div style={{ ...cardBoxStyle, background: '#f8fafc', borderLeft: '4px solid #0087CC' }}>
                      <h4 style={{ ...cardHeaderStyle, color: '#0369a1' }}>Why This Score?</h4>
                      <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.65', margin: 0 }}>
                        {caseDetails.risk.explanation}
                      </p>
                    </div>

                    {/* Autonomy Card */}
                    {caseDetails.autonomy && (
                      <div style={cardBoxStyle}>
                        <h4 style={cardHeaderStyle}>Current Autonomy Decision</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>AI CAN DO</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {caseDetails.autonomy.allowed_actions.map((act, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#166534' }}>
                                  <span style={{ fontWeight: '700' }}>✓</span> {act.replace(/_/g, ' ')}
                                </div>
                              ))}
                              {caseDetails.autonomy.allowed_actions.length === 0 && (
                                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No autonomous actions permitted.</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>REQUIRES HUMAN APPROVAL</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {caseDetails.autonomy.restricted_actions.map((act, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#991b1b' }}>
                                  <span style={{ fontWeight: '700' }}>—</span> {act.replace(/_/g, ' ')}
                                </div>
                              ))}
                              {caseDetails.autonomy.restricted_actions.length === 0 && (
                                <div style={{ fontSize: '13px', color: '#166534' }}>No restrictions. Human approval not currently required.</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #edf2f7', fontSize: '13px', color: '#475569' }}>
                          <strong>Reason:</strong> {caseDetails.autonomy.reason}
                        </div>
                        {caseDetails.autonomy.previous_autonomy && caseDetails.autonomy.previous_autonomy !== caseDetails.autonomy.autonomy_level && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            Autonomy transition: <strong>{caseDetails.autonomy.previous_autonomy}</strong> → <strong>{caseDetails.autonomy.autonomy_level}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Decision Lineage Summary */}
                    <div style={{ ...cardBoxStyle, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <h4 style={{ ...cardHeaderStyle, color: '#0369a1' }}>Decision Lineage</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', fontSize: '13px' }}>
                        <div>
                          <div style={labelStyle}>AGENT OUTPUTS</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{caseDetails.agent_results?.length || 0} Agents</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{caseDetails.agent_consensus}</div>
                        </div>
                        <div>
                          <div style={labelStyle}>RISK FACTORS</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{caseDetails.risk.risk_factors?.length || 0} Factors</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Weighted deterministic</div>
                        </div>
                        <div>
                          <div style={labelStyle}>RISK SCORE</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{caseDetails.risk.risk_score} / 100</div>
                          <div style={{ fontSize: '12px', color: caseDetails.risk.risk_level === 'LOW' ? '#166534' : caseDetails.risk.risk_level === 'MEDIUM' ? '#b45309' : '#991b1b' }}>{caseDetails.risk.risk_level}</div>
                        </div>
                        <div>
                          <div style={labelStyle}>AUTONOMY</div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{caseDetails.autonomy?.autonomy_level || '—'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{caseDetails.autonomy?.autonomy_level === 'L3' ? 'High Autonomy' : caseDetails.autonomy?.autonomy_level === 'L2' ? 'Controlled' : caseDetails.autonomy?.autonomy_level === 'L1' ? 'Human Controlled' : '—'}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #bae6fd', fontSize: '12px', color: '#0369a1' }}>
                        Risk ID: <strong>{caseDetails.risk.risk_id}</strong> | Decision ID: <strong>{caseDetails.autonomy?.decision_id || '—'}</strong>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div style={{ ...cardBoxStyle, textAlign: 'center', padding: '40px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Risk Evaluation Pending</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                      {caseDetails
                        ? caseDetails.current_stage === 'AI_REVIEW_COMPLETED'
                          ? `Case ${caseDetails.case_id} has completed AI Agent Review and is ready for risk evaluation. Click below to run the Risk Engine.`
                          : `Case ${caseDetails.case_id} must complete AI Agent Review (Module 2) before risk evaluation.`
                        : 'Load a case in the Review tab first, then return here to evaluate risk.'}
                    </p>
                    {caseDetails?.current_stage === 'AI_REVIEW_COMPLETED' && (
                      <button
                        onClick={handleRunRiskEvaluation}
                        disabled={riskLoading}
                        style={{ ...btnStylePrimary, background: '#1d4ed8', padding: '12px 28px', fontSize: '14px', fontWeight: '700' }}
                      >
                        {riskLoading ? 'Evaluating Risk...' : 'Run Risk Evaluation'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 4: LIVE GOVERNANCE PIPELINE & OPERATIONAL CONSOLE             */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'Progress' && (
              <div>
                {/* ── TOP HEADER & CASE GOVERNANCE STATE ────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.3' }}>
                      NIYANTRA PIPELINE & GOVERNANCE CONSOLE
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {caseDetails ? `${caseDetails.case_id} — ${caseDetails.application?.disaster_type || 'Disaster'} Relief (${caseDetails.application?.full_name})` : 'Select a Case to Inspect Operational Pipeline'}
                    </p>
                  </div>
                  {caseDetails && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                        ● LIVE GOVERNANCE STATE
                      </span>
                      <button
                        onClick={() => fetchHistories(caseDetails.case_id)}
                        style={{ ...btnStyleSecondary, fontSize: '12px', padding: '5px 12px' }}
                      >
                        Refresh State
                      </button>
                    </div>
                  )}
                </div>

                {!caseDetails ? (
                  <div style={{ ...cardBoxStyle, textAlign: 'center', padding: '50px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>No Active Case Selected</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Submit an application or select an existing case to open the live pipeline console.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* ══════════════════════════════════════════════════════════ */}
                    {/* LAYER 1: HERO DECISION BANNER & HERO RISK SCORE           */}
                    {/* ══════════════════════════════════════════════════════════ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
                      
                      {/* Hero Risk Card */}
                      <div style={{
                        ...cardBoxStyle,
                        textAlign: 'center',
                        background: caseDetails.current_risk > 60 ? '#fef2f2' : caseDetails.current_risk > 30 ? '#fffbeb' : '#f0fdf4',
                        border: caseDetails.current_risk > 60 ? '2px solid #fecaca' : caseDetails.current_risk > 30 ? '2px solid #fde68a' : '2px solid #bbf7d0',
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'center'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          CURRENT RISK SCORE
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '900', color: caseDetails.current_risk > 60 ? '#dc2626' : caseDetails.current_risk > 30 ? '#d97706' : '#166534', lineHeight: '1.1', margin: '6px 0' }}>
                          {caseDetails.current_risk != null ? caseDetails.current_risk.toFixed(0) : '—'}
                          <span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '700' }}>/100</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: caseDetails.current_risk > 60 ? '#b91c1c' : caseDetails.current_risk > 30 ? '#b45309' : '#15803d' }}>
                          {caseDetails.current_risk > 60 ? 'HIGH RISK' : caseDetails.current_risk > 30 ? 'MEDIUM RISK' : 'LOW RISK'}
                        </div>

                        {/* Risk Delta Indicator */}
                        {caseDetails.previous_risk != null && caseDetails.risk_delta != null && (
                          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: '700', color: caseDetails.risk_delta > 0 ? '#dc2626' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span>{caseDetails.previous_risk} → {caseDetails.current_risk}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: caseDetails.risk_delta > 0 ? '#fee2e2' : '#dcfce7', fontSize: '11px', fontWeight: '800' }}>
                              {caseDetails.risk_delta > 0 ? `▲ +${caseDetails.risk_delta.toFixed(0)}` : `▼ ${caseDetails.risk_delta.toFixed(0)}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* NIYANTRA Decision Banner Card */}
                      <div style={{
                        ...cardBoxStyle,
                        background: caseDetails.current_autonomy === 'L1' ? '#fffbeb' : '#f0fdf4',
                        border: caseDetails.current_autonomy === 'L1' ? '2px solid #f59e0b' : '2px solid #10b981',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              NIYANTRA AUTOMATED DECISION
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', background: caseDetails.current_autonomy === 'L1' ? '#fef2f2' : '#dcfce7', color: caseDetails.current_autonomy === 'L1' ? '#dc2626' : '#166534', border: '1px solid' }}>
                              AUTONOMY: {caseDetails.current_autonomy || 'L1'}
                            </span>
                          </div>

                          <div style={{ fontSize: '22px', fontWeight: '800', color: caseDetails.current_autonomy === 'L1' ? '#b45309' : '#047857', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {caseDetails.current_autonomy === 'L1' ? '🔒 HUMAN INTERVENTION REQUIRED' : '✓ AI EXECUTION PERMITTED'}
                          </div>

                          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                            {caseDetails.has_evidence_conflict
                              ? "Verified ground field report conflicts with initial AI damage assessment. Process Anomaly penalty applied (+55 pts). Autonomy level downgraded to L1."
                              : caseDetails.current_risk > 60
                              ? "Case risk score exceeds autonomous execution threshold (>60). Sensitive actions are blocked until officer authorization."
                              : "Case parameters and evidence are fully consistent. Autonomous processing permitted under L3 autonomy."}
                          </p>

                          {/* Proposed / Blocked Action Row */}
                          {actions && actions.length > 0 && (
                            <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong>Target Action:</strong> {actions[0].action_type.replace(/_/g, ' ')} (₹{actions[0].parameters?.amount?.toLocaleString() || '25,000'})
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', background: actions[0].status === 'BLOCKED' || actions[0].status.includes('AUTHORIZATION') ? '#fee2e2' : '#dcfce7', color: actions[0].status === 'BLOCKED' || actions[0].status.includes('AUTHORIZATION') ? '#dc2626' : '#166534' }}>
                                {actions[0].status}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {caseDetails.current_autonomy === 'L1' && (
                            <button
                              onClick={() => setActiveTab('Officer Review')}
                              style={{ ...btnStylePrimary, background: '#dc2626', padding: '10px 20px', fontSize: '13px', fontWeight: '800' }}
                            >
                              [ OPEN OFFICER REVIEW ]
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════ */}
                    {/* LAYER 2: INTERACTIVE PIPELINE FLOWCHART NODES             */}
                    {/* ══════════════════════════════════════════════════════════ */}
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>PRIMARY OPERATIONAL PIPELINE (Interactive Nodes)</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'stretch' }}>
                        
                        {/* Node 1: Evidence */}
                        <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: caseDetails.has_evidence_conflict ? '2px solid #f59e0b' : '1px solid #cbd5e1', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>STAGE 1</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>EVIDENCE</div>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                            {caseDetails.evidence?.length || 0} Records
                          </div>
                          {caseDetails.has_evidence_conflict ? (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                              ⚠ CONFLICT
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                              ✓ VERIFIED
                            </span>
                          )}
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '900' }}>→</div>

                        {/* Node 2: AI Analysis */}
                        <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>STAGE 2</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>AI ANALYSIS</div>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                            3 Agents (Multi-Scan)
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: caseDetails.agent_consensus === 'FULL_CONSENSUS' ? '#dcfce7' : '#fef3c7', color: caseDetails.agent_consensus === 'FULL_CONSENSUS' ? '#166534' : '#b45309', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                            {caseDetails.agent_consensus === 'FULL_CONSENSUS' ? '✓ CONSENSUS' : '⚠ PARTIAL'}
                          </span>
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '900' }}>→</div>

                        {/* Node 3: Risk Engine */}
                        <div style={{ padding: '12px', borderRadius: '8px', background: caseDetails.current_risk > 60 ? '#fef2f2' : '#f8fafc', border: caseDetails.current_risk > 60 ? '2px solid #fecaca' : '1px solid #cbd5e1', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>STAGE 3</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>RISK ENGINE</div>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: caseDetails.current_risk > 60 ? '#dc2626' : '#166534' }}>
                            {caseDetails.current_risk != null ? caseDetails.current_risk.toFixed(0) : '—'} / 100
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: caseDetails.current_risk > 60 ? '#fee2e2' : '#dcfce7', color: caseDetails.current_risk > 60 ? '#dc2626' : '#166534', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                            {caseDetails.current_risk > 60 ? 'HIGH' : 'LOW'}
                          </span>
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '900' }}>→</div>

                        {/* Node 4: Autonomy */}
                        <div style={{ padding: '12px', borderRadius: '8px', background: caseDetails.current_autonomy === 'L1' ? '#fef2f2' : '#f8fafc', border: caseDetails.current_autonomy === 'L1' ? '2px solid #fecaca' : '1px solid #cbd5e1', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>STAGE 4</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>AUTONOMY</div>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: caseDetails.current_autonomy === 'L1' ? '#dc2626' : '#166534' }}>
                            {caseDetails.current_autonomy || 'L1'}
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: caseDetails.current_autonomy === 'L1' ? '#fee2e2' : '#dcfce7', color: caseDetails.current_autonomy === 'L1' ? '#dc2626' : '#166534', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                            {caseDetails.current_autonomy === 'L1' ? 'HUMAN-FIRST' : 'FULL-AUTO'}
                          </span>
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '900' }}>→</div>

                        {/* Node 5: Action Gateway */}
                        <div style={{ padding: '12px', borderRadius: '8px', background: actions[0]?.status === 'BLOCKED' || actions[0]?.status?.includes('AUTHORIZATION') ? '#fef2f2' : '#f8fafc', border: actions[0]?.status === 'BLOCKED' || actions[0]?.status?.includes('AUTHORIZATION') ? '2px solid #fecaca' : '1px solid #cbd5e1', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>STAGE 5</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>TOOL GATEWAY</div>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                            Relief Payment
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: actions[0]?.status === 'BLOCKED' || actions[0]?.status?.includes('AUTHORIZATION') ? '#fee2e2' : '#dcfce7', color: actions[0]?.status === 'BLOCKED' || actions[0]?.status?.includes('AUTHORIZATION') ? '#dc2626' : '#166534', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                            🔒 {actions[0]?.status || 'PENDING'}
                          </span>
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '900' }}>→</div>

                        {/* Node 6: Human Oversight */}
                        <div style={{ padding: '12px', borderRadius: '8px', background: caseDetails.current_autonomy === 'L1' ? '#fffbeb' : '#f8fafc', border: caseDetails.current_autonomy === 'L1' ? '2px solid #f59e0b' : '1px solid #cbd5e1', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>STAGE 6</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>HUMAN OVERSIGHT</div>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                            Officer Review
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: caseDetails.current_autonomy === 'L1' ? '#fef3c7' : '#f1f5f9', color: caseDetails.current_autonomy === 'L1' ? '#b45309' : '#64748b', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                            {caseDetails.current_autonomy === 'L1' ? 'INTERVENTION' : 'STANDBY'}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════ */}
                    {/* REASON LAYER: SIDE-BY-SIDE EVIDENCE & RISK CONTRIBUTORS   */}
                    {/* ══════════════════════════════════════════════════════════ */}
                    <div style={{ display: 'block', width: '100%' }}>
                      
                      {/* Evidence Conflict Card */}
                      <div style={{ ...cardBoxStyle, border: caseDetails.has_evidence_conflict ? '2px solid #f59e0b' : '1px solid #e2e8f0', background: caseDetails.has_evidence_conflict ? '#fffbeb' : '#ffffff', width: '100%', boxSizing: 'border-box' }}>
                        <h4 style={{ ...cardHeaderStyle, color: caseDetails.has_evidence_conflict ? '#b45309' : '#0f172a' }}>
                          EVIDENCE & GROUND INSPECTION SUMMARY
                        </h4>
                        
                        {caseDetails.has_evidence_conflict && (
                          <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span>
                            <span>EVIDENCE CONFLICT DETECTED — AI vision assessment contradicts ground field report (+55 Process Anomaly penalty).</span>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          {/* AI Box */}
                          <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>AI Vision Scan (Module 2)</div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: caseDetails.agent_results?.find(a => a.agent_name === 'evidence_agent')?.damage_level === 'SEVERE' ? '#dc2626' : '#d97706', margin: '4px 0' }}>
                              {caseDetails.agent_results?.find(a => a.agent_name === 'evidence_agent')?.damage_level || 'SEVERE'} DAMAGE
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Confidence: {Math.round((caseDetails.agent_results?.find(a => a.agent_name === 'evidence_agent')?.confidence || 0.89) * 100)}%
                            </div>
                          </div>

                          {/* Field Report Box */}
                          <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>Ground Field Report (Module 4)</div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7', margin: '4px 0' }}>
                              MINOR DAMAGE
                            </div>
                            <div style={{ fontSize: '11px', color: '#0369a1' }}>
                              Status: Verified Officer Event
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* INTERACTIVE "WHY?" EXPLAINER MODAL                        */}
                {/* ══════════════════════════════════════════════════════════ */}
                {showWhyModal && caseDetails && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '580px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                      
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
                        WHY IS RISK SCORE {caseDetails.current_risk > 60 ? 'HIGH' : 'LOW'}?
                      </h3>
                      
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                        NIYANTRA Deterministic Risk & Autonomy Calculation Breakdown
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Primary Risk Trigger</div>
                          <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', fontWeight: '600' }}>
                            {caseDetails.risk?.explanation || 'Multi-factor assessment based on AI certainty, ground verification, and action impact.'}
                          </div>
                        </div>

                        <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>Risk Score Progression</div>
                          <div style={{ fontSize: '14px', color: '#0369a1', marginTop: '4px', fontWeight: '800' }}>
                            Prior Risk: {caseDetails.previous_risk ?? '15'} → Current Risk: {caseDetails.current_risk} ({caseDetails.risk_delta != null ? `+${caseDetails.risk_delta} pts` : 'Initial'})
                          </div>
                        </div>

                        {caseDetails.has_evidence_conflict && (
                          <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>Evidence Conflict Anomaly (+55 pts)</div>
                            <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
                              Ground inspection officer reported MINOR damage, contradicting the AI vision scan which reported SEVERE damage. Both evidence sources remain preserved in audit lineage.
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setShowWhyModal(false)}
                          style={{ ...btnStylePrimary, padding: '10px 20px', fontWeight: '700' }}
                        >
                          Close Explainer
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 4.5: EVENT UPDATES (MODULE 4)                                  */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'EventUpdates' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#000433', margin: 0 }}>Event Updates</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Module 4: Submit new evidence & trigger re-evaluations.</p>
                  </div>
                </div>

                {!caseDetails ? (
                  <div style={{ ...cardBoxStyle, textAlign: 'center', padding: '40px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>No Active Case</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Load a case first to submit events.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Submit Structured Event Form */}
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>Submit New Case Event & Structured Condition Update</h4>
                      <form onSubmit={handleSimulateFieldInspection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={labelStyle}>Event Type</label>
                            <select
                              value={eventForm.eventType || 'DAMAGE_UPDATE'}
                              onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                              style={inputStyle}
                            >
                              <option value="DAMAGE_UPDATE">Damage Update</option>
                              <option value="FIELD_INSPECTION">Field Inspection Report</option>
                              <option value="FRAUD_INDICATOR">Fraud Indicator Alert</option>
                              <option value="IDENTITY_VERIFICATION">Identity Verification Update</option>
                              <option value="DOCUMENT_VERIFICATION">Document Verification Update</option>
                              <option value="POLICY_EXCEPTION">Policy Exception Alert</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Target Condition Field</label>
                            <select
                              value={eventForm.field || 'damage_severity'}
                              onChange={(e) => setEventForm({ ...eventForm, field: e.target.value })}
                              style={inputStyle}
                            >
                              <option value="damage_severity">Damage Severity</option>
                              <option value="fraud_indicator">Fraud Indicator</option>
                              <option value="identity_status">Identity Status</option>
                              <option value="evidence_quality">Evidence Quality</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Submitter Trust Authority</label>
                            <select
                              value={eventForm.submitterType}
                              onChange={(e) => setEventForm({ ...eventForm, submitterType: e.target.value })}
                              style={inputStyle}
                            >
                              <option value="OFFICER">OFFICER (Auto-Verified & Instant Closed-Loop)</option>
                              <option value="PUBLIC">PUBLIC (Pending Officer Verification)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={labelStyle}>Previous Value</label>
                            <input
                              type="text"
                              value={eventForm.previousValue || 'SEVERE'}
                              onChange={(e) => setEventForm({ ...eventForm, previousValue: e.target.value })}
                              style={inputStyle}
                              placeholder="e.g. SEVERE / FALSE"
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>New Value</label>
                            <select
                              value={eventForm.newValue || 'MODERATE'}
                              onChange={(e) => setEventForm({ ...eventForm, newValue: e.target.value, damageFinding: e.target.value })}
                              style={inputStyle}
                            >
                              <option value="MODERATE">MODERATE</option>
                              <option value="MINOR">MINOR</option>
                              <option value="SEVERE">SEVERE</option>
                              <option value="DETECTED">DETECTED (Fraud True)</option>
                              <option value="NONE">NONE (Fraud False)</option>
                              <option value="VERIFIED">VERIFIED</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Location / Ward</label>
                            <input
                              type="text"
                              value={eventForm.location || 'Ward 4 Riverbank'}
                              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                              style={inputStyle}
                              placeholder="Location observed"
                            />
                          </div>
                        </div>

                        <div>
                          <label style={labelStyle}>Description & Verification Reason</label>
                          <textarea
                            value={eventForm.description}
                            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                            style={{ ...inputStyle, minHeight: '70px' }}
                            placeholder="Provide physical verification context or inspector notes..."
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {eventForm.submitterType === 'OFFICER' ? '⚡ OFFICER submission updates state version v' + ((caseDetails?.state_version || 1) + 1) + ' and re-evaluates Risk immediately.' : '⏳ PUBLIC submission creates PENDING evidence awaiting officer verification.'}
                          </span>
                          <button
                            type="submit"
                            disabled={eventLoading || !['RISK_EVALUATED','RUNTIME_REEVALUATION', 'REQUIRES_HUMAN_REVIEW', 'AI_REVIEW_COMPLETED'].includes(caseDetails.current_stage)}
                            style={{ ...btnStylePrimary, padding: '12px 24px', fontSize: '14px', fontWeight: '700', opacity: !['RISK_EVALUATED','RUNTIME_REEVALUATION', 'REQUIRES_HUMAN_REVIEW', 'AI_REVIEW_COMPLETED'].includes(caseDetails.current_stage) ? 0.5 : 1 }}
                          >
                            {eventLoading ? 'Processing Governance Loop...' : 'Submit & Trigger Governance Loop'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Pending Events List for Verification */}
                    <div style={cardBoxStyle}>
                      <h4 style={cardHeaderStyle}>Pending Events (Requires Officer Verification)</h4>
                      {caseDetails.events?.filter(e => {
                         try {
                           const meta = JSON.parse(e.metadata_json || "{}")
                           return e.submitter_type === 'PUBLIC' && meta.verification_status === 'PENDING'
                         } catch (err) {
                           return false
                         }
                      }).length === 0 && caseDetails.events?.filter(e => e.submitter_type === 'PUBLIC' && e.verification_status === 'PENDING').length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>No pending events.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {caseDetails.events?.filter(e => e.submitter_type === 'PUBLIC' && e.verification_status === 'PENDING').map((evt) => (
                            <div key={evt.event_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>Event ID: {evt.event_id}</div>
                                <div style={{ fontSize: '12px', color: '#78350f' }}>{evt.description || 'No description provided'}</div>
                                <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px' }}>Submitted By: {evt.submitted_by}</div>
                              </div>
                              <button
                                onClick={() => handleVerifyEvent(evt.event_id)}
                                disabled={eventLoading}
                                style={{ ...btnStylePrimary, background: '#f59e0b', fontSize: '12px', padding: '8px 16px' }}
                              >
                                {eventLoading ? 'Verifying...' : 'Verify Event'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 4.8: HISTORY & DECISION TIMELINE AUDIT PORTAL                   */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'History' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.3' }}>
                      History & Governance Audit Portal
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Case Event Timeline with history of every case with reason of decision
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Filter Case:</span>
                    <select
                      value={activeCaseRef}
                      onChange={(e) => handleSelectCase(e.target.value)}
                      style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontWeight: '700', color: '#0369a1', background: '#f0f9ff', borderColor: '#bae6fd' }}
                    >
                      <option value="">-- All System Cases --</option>
                      {caseList.map(c => (
                        <option key={c.case_id} value={c.case_id}>
                          {c.case_id} — {c.applicant_name} ({c.current_autonomy || 'Intake'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CASE SUMMARY BANNER */}
                {caseDetails && (
                  <div style={{ ...cardBoxStyle, background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)', borderLeft: '4px solid #0087CC', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            {caseDetails.case_id}
                          </h3>
                          <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 10px', borderRadius: '12px', background: caseDetails.current_autonomy === 'L3' ? '#ecfdf5' : caseDetails.current_autonomy === 'L2' ? '#fffbeb' : '#fef2f2', color: caseDetails.current_autonomy === 'L3' ? '#059669' : caseDetails.current_autonomy === 'L2' ? '#d97706' : '#dc2626', border: '1px solid' }}>
                            Autonomy: {caseDetails.current_autonomy || 'Unassigned'}
                          </span>
                          {caseDetails.has_evidence_conflict && (
                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                              EVIDENCE CONFLICT DETECTED
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px', marginBottom: 0 }}>
                          Applicant: <strong>{caseDetails.application?.full_name}</strong> | District: <strong>{caseDetails.application?.district}</strong> | Disaster: <strong>{caseDetails.application?.disaster_type}</strong>
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Calculated Risk Score</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: caseDetails.current_risk > 60 ? '#dc2626' : caseDetails.current_risk > 25 ? '#d97706' : '#059669' }}>
                          {caseDetails.current_risk != null ? caseDetails.current_risk.toFixed(1) : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Reason of decision callout */}
                    {caseDetails.autonomy?.reason && (
                      <div style={{ marginTop: '14px', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#1e293b' }}>
                        <strong style={{ color: '#0f172a' }}>Primary Decision Governance Rationale:</strong> {caseDetails.autonomy.reason}
                      </div>
                    )}
                  </div>
                )}

                {/* CASE EVENT TIMELINE WITH HISTORY OF EVERY CASE WITH REASON OF DECISION */}
                <div style={cardBoxStyle}>
                  <h4 style={cardHeaderStyle}>
                    Case Event Timeline with history of every case with reason of decision
                  </h4>

                  {(!caseDetails || !caseDetails.events || caseDetails.events.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                      <p style={{ fontSize: '14px', margin: 0 }}>Select a case from the Left Sidebar <strong>History</strong> list or top dropdown to view its complete timeline and decision reasons.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {[...caseDetails.events].reverse().map((evt, i) => {
                        const isConflict = evt.event_type === 'EVIDENCE_CONFLICT_DETECTED'
                        const isReauth   = evt.event_type === 'ACTION_REAUTHORIZATION_REQUIRED' || evt.event_type === 'ACTION_REQUIRES_REAUTHORIZATION'
                        const isField    = evt.event_type === 'FIELD_INSPECTION_RECEIVED' || evt.event_type === 'PUBLIC_OBSERVATION'
                        const isRisk     = evt.event_type === 'RISK_EVALUATED' || evt.event_type === 'RISK_REEVALUATED'
                        const isAuto     = evt.event_type === 'AUTONOMY_ASSIGNED' || evt.event_type === 'AUTONOMY_CHANGED'
                        const isExecuted = evt.event_type === 'ACTION_SIMULATED_EXECUTED'
                        const isBlocked  = evt.event_type === 'ACTION_BLOCKED'
                        const dotColor   = isConflict || isReauth || isBlocked ? '#ef4444' : isField ? '#1d4ed8' : isRisk || isAuto ? '#0087CC' : '#22c55e'
                        
                        let details = null
                        let decisionReason = null
                        try {
                          const meta = evt.metadata_json ? JSON.parse(evt.metadata_json) : {}
                          if (isRisk) {
                            details = `Risk Score: ${meta.risk_score} | Risk Level: ${meta.risk_level}`
                            decisionReason = meta.reason || meta.explanation || `Risk score calculated deterministically by multi-factor Risk Engine.`
                          }
                          else if (isAuto) {
                            details = `Autonomy Assigned: ${meta.autonomy_level || meta.new_autonomy || meta.to}`
                            decisionReason = meta.reason || `Autonomy transitioned from ${meta.from || 'N/A'} to ${meta.to || meta.autonomy_level} based on risk bounds.`
                          }
                          else if (isField) {
                            details = `Damage Reported: ${meta.damage_level || meta.damage_finding} (${meta.verification_status || 'VERIFIED'})`
                            decisionReason = `Field observation submitted by officer/public recorded for verification.`
                          }
                          else if (isConflict) {
                            details = `Conflict Detected: AI (${meta.ai_damage_level}) vs Field (${meta.field_damage_level})`
                            decisionReason = `Contradiction between AI vision assessment and officer ground report added +55 anomaly risk penalty.`
                          }
                          else if (isReauth) {
                            details = `Action Suspended: Re-authorization required`
                            decisionReason = meta.reason || `Autonomy level downgraded; sensitive action requires human officer sign-off.`
                          }
                          else if (isBlocked) {
                            details = `Action Blocked by Tool Gateway: ${meta.action_type || 'ACTION'}`
                            decisionReason = meta.reason || `Action requires autonomy ${meta.required}, but case is operating under ${meta.current}.`
                          }
                          else if (isExecuted) {
                            details = `Action Executed: ${meta.action_type || 'ACTION'}`
                            decisionReason = `Tool Gateway verified case autonomy level as sufficient for autonomous execution.`
                          }
                          else if (evt.event_type === 'AGENT_COMPLETED') {
                            details = `Agent: ${evt.source} | Confidence: ${meta.confidence ? Math.round(meta.confidence*100) + '%' : 'N/A'}`
                            decisionReason = `Multi-agent findings completed and recorded to evidence package.`
                          }
                          else if (evt.description) {
                            details = evt.description
                          }
                        } catch (e) {}

                        return (
                          <div key={evt.event_id} style={{ display: 'flex', gap: '16px', padding: '14px 0', borderBottom: i < caseDetails.events.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '18px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: dotColor, marginTop: '4px', flexShrink: 0 }} />
                              {i < caseDetails.events.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e2e8f0', marginTop: '4px' }} />}
                            </div>
                            <div style={{ flex: 1, paddingBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: dotColor }}>{evt.event_type.replace(/_/g, ' ')}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', padding: '2px 8px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: '600' }}>{evt.source.replace(/_/g, ' ')}</span>
                              </div>
                              
                              {details && <div style={{ fontSize: '13px', color: '#1e293b', marginTop: '6px', fontWeight: '600' }}>{details}</div>}
                              
                              {decisionReason && (
                                <div style={{ marginTop: '8px', padding: '10px 14px', background: '#f8fafc', borderLeft: `4px solid ${dotColor}`, borderRadius: '4px', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                                  <strong style={{ color: '#0f172a' }}>Reason of Decision:</strong> {decisionReason}
                                </div>
                              )}

                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                                {new Date(evt.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* AUDIT SUMMARY TABLE OF ALL CASES */}
                <div style={{ ...cardBoxStyle, marginTop: '24px' }}>
                  <h4 style={cardHeaderStyle}>System-Wide Governance Audit Registry</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px' }}>Case ID</th>
                          <th style={{ padding: '10px' }}>Applicant</th>
                          <th style={{ padding: '10px' }}>District</th>
                          <th style={{ padding: '10px' }}>Risk Score</th>
                          <th style={{ padding: '10px' }}>Autonomy</th>
                          <th style={{ padding: '10px' }}>Reason of Decision</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseList.map(c => (
                          <tr key={c.case_id} style={{ borderBottom: '1px solid #f1f5f9', background: c.case_id === activeCaseRef ? '#f0f9ff' : 'transparent' }}>
                            <td style={{ padding: '10px', fontWeight: '700', color: '#0087CC' }}>{c.case_id}</td>
                            <td style={{ padding: '10px', fontWeight: '600', color: '#1e293b' }}>{c.applicant_name}</td>
                            <td style={{ padding: '10px', color: '#64748b' }}>{c.district}</td>
                            <td style={{ padding: '10px', fontWeight: '700' }}>{c.current_risk != null ? c.current_risk.toFixed(1) : '—'}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: c.current_autonomy === 'L3' ? '#ecfdf5' : c.current_autonomy === 'L2' ? '#fffbeb' : '#fef2f2', color: c.current_autonomy === 'L3' ? '#059669' : c.current_autonomy === 'L2' ? '#d97706' : '#dc2626' }}>
                                {c.current_autonomy || 'Intake'}
                              </span>
                            </td>
                            <td style={{ padding: '10px', fontSize: '12px', color: '#475569', maxWidth: '300px' }}>
                              {c.decision_reason || 'Registered in system'}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleSelectCase(c.case_id)}
                                style={{ ...btnStyleSecondary, padding: '4px 10px', fontSize: '11px' }}
                              >
                                Select & Audit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB 5: OFFICER REVIEW & HUMAN DECISION COCKPIT (MODULE 6)          */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'Officer Review' && (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.3' }}>
                      Officer Review & Decision Cockpit
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Module 6: Human-in-the-Loop Governance & Authorization Center
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', background: '#fef3c7', color: '#b45309', padding: '6px 14px', borderRadius: '20px', border: '1px solid #fde68a' }}>
                    {officerQueue.length} Cases Requiring Intervention
                  </span>
                </div>

                {/* Main 1-Column Layout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Case Cockpit Workspace */}
                  <div>
                    {(!officerDetails && !activeCaseRef) ? (
                      <div style={{ ...cardBoxStyle, textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                        <h3>No Active Case Selected for Review</h3>
                        <p>Select a case from the Left Sidebar History or top lookup to open the decision cockpit.</p>
                      </div>
                    ) : officerLoading ? (
                      <div style={{ ...cardBoxStyle, textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                        <p>Loading Officer Decision Cockpit data...</p>
                      </div>
                    ) : officerDetails ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* 1. CASE SUMMARY BANNER */}
                        <div style={{ ...cardBoxStyle, borderLeft: '5px solid #dc2626', background: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                  {officerDetails.case_id}
                                </h2>
                                <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 10px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                  {officerDetails.current_stage.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p style={{ fontSize: '14px', color: '#334155', marginTop: '6px', marginBottom: 0, fontWeight: '500' }}>
                                Applicant: <strong>{officerDetails.application?.full_name}</strong> ({officerDetails.application?.citizen_id}) | District: <strong>{officerDetails.application?.district}</strong>
                              </p>
                              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                                Disaster Type: <strong>{officerDetails.application?.disaster_type}</strong> | Requested Relief: <strong style={{ color: '#059669', fontSize: '15px' }}>₹{officerDetails.application?.requested_amount?.toLocaleString()}</strong>
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', textAlign: 'center' }}>
                              <div style={{ background: '#ffffff', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Current Risk</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: officerDetails.current_risk > 60 ? '#dc2626' : '#d97706' }}>
                                  {officerDetails.current_risk != null ? officerDetails.current_risk.toFixed(1) : 'N/A'}
                                </div>
                              </div>
                              <div style={{ background: '#ffffff', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Current Autonomy</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626' }}>
                                  {officerDetails.current_autonomy}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 6. OFFICER DECISION CONTROLS */}
                        <div style={{ ...cardBoxStyle, background: '#f8fafc', border: '2px solid #cbd5e1' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
                            OFFICER DECISION PANEL (Human Oversight Action)
                          </h3>

                          {officerDetails.current_autonomy === 'L3' && officerDetails.current_stage !== 'REQUIRES_HUMAN_REVIEW' ? (
                            <div style={{ padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534' }}>
                              <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>
                                ✓ AI EXECUTION PERMITTED
                              </div>
                              <div style={{ fontSize: '13px', color: '#15803d' }}>
                                Case operates under Autonomous Authority (L3). Human officer intervention is not required for this low-risk case.
                              </div>
                            </div>
                          ) : (
                            <>
                              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '18px' }}>
                                Review the evidence and select the decision action below. Your decision will be persisted with your name, timestamp, and audit justification.
                              </p>

                              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => { setConfirmModalType('APPROVED'); setDecisionReasonInput('Evidence reviewed and conflict resolved. Payment approved.'); }}
                                  style={{ ...btnStylePrimary, background: '#10b981', padding: '12px 24px', fontSize: '14px', flex: 1, minWidth: '160px' }}
                                >
                                  ✓ APPROVE RELIEF
                                </button>

                                <button
                                  type="button"
                                  onClick={() => { setConfirmModalType('REJECTED'); setDecisionReasonInput(''); }}
                                  style={{ ...btnStylePrimary, background: '#ef4444', padding: '12px 24px', fontSize: '14px', flex: 1, minWidth: '160px' }}
                                >
                                  ✗ REJECT RELIEF
                                </button>

                                <button
                                  type="button"
                                  onClick={() => { setConfirmModalType('REQUEST_MORE_EVIDENCE'); }}
                                  style={{ ...btnStyleSecondary, borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb', padding: '12px 24px', fontSize: '14px', flex: 1, minWidth: '200px', fontWeight: '700' }}
                                >
                                  📋 REQUEST MORE EVIDENCE
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                         

                        {/* 2. WHY IS THIS CASE HERE? (EXPLANATION NARRATIVE PANEL) */}
                        <div style={{ ...cardBoxStyle, background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                          <h4 style={{ ...cardHeaderStyle, color: '#92400e', marginBottom: '10px' }}>
                            WHY IS THIS CASE HERE? (Governance Decision Lineage)
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {officerDetails.explanation_narrative?.map((step, idx) => (
                              <div key={idx} style={{ fontSize: '13px', color: '#78350f', fontWeight: '500', lineHeight: '1.5' }}>
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>

                         

                        {/* 5. BLOCKED / RESTRICTED AI ACTION (MODULE 5 TOOL GATEWAY) */}
                        {officerDetails.actions && officerDetails.actions.length > 0 && (
                          <div style={{ ...cardBoxStyle, borderTop: '4px solid #ef4444' }}>
                            <h4 style={{ ...cardHeaderStyle, color: '#b91c1c' }}>BLOCKED / RESTRICTED AI ACTION (Tool Gateway Status)</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {officerDetails.actions.map(act => (
                                <div key={act.action_id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b' }}>{act.action_type.replace(/_/g, ' ')}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                                      🔒 {act.status}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: '6px' }}>
                                    Required Autonomy Level: <strong>{act.required_autonomy}</strong> | Current Case Autonomy: <strong>{officerDetails.current_autonomy}</strong>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#991b1b', fontStyle: 'italic', background: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                    Tool Gateway Enforcement: Current case autonomy does not permit autonomous execution of this action. Human officer authorization is required.
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 7. PAST OFFICER DECISIONS LOG */}
                        {officerDetails.past_decisions && officerDetails.past_decisions.length > 0 && (
                          <div style={cardBoxStyle}>
                            <h4 style={cardHeaderStyle}>Decision History & Audit Trail</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {officerDetails.past_decisions.map(dec => (
                                <div key={dec.decision_id} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: dec.decision === 'APPROVED' ? '#059669' : dec.decision === 'REJECTED' ? '#dc2626' : '#d97706' }}>
                                      {dec.decision}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      Decided By: {dec.decided_by} ({new Date(dec.created_at).toLocaleString()})
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#334155' }}>
                                    <strong>Justification:</strong> {dec.reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ) : null}
                  </div>

                </div>

                {/* DECISION CONFIRMATION MODAL */}
                {confirmModalType && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '540px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                      
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: confirmModalType === 'APPROVED' ? '#059669' : confirmModalType === 'REJECTED' ? '#dc2626' : '#d97706', margin: '0 0 10px 0' }}>
                        Confirm Officer Decision: {confirmModalType.replace(/_/g, ' ')}
                      </h3>
                      
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>
                        {confirmModalType === 'APPROVED' && "You are approving the disaster relief action for this case after reviewing AI findings and field evidence."}
                        {confirmModalType === 'REJECTED' && "You are rejecting the disaster relief application for this case. A mandatory justification reason is required."}
                        {confirmModalType === 'REQUEST_MORE_EVIDENCE' && "You are requesting additional evidence. The case stage will set to AWAITING_ADDITIONAL_EVIDENCE and return to Event Updates."}
                      </p>

                      {confirmModalType !== 'REQUEST_MORE_EVIDENCE' ? (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={labelStyle}>Decision Justification Reason (Mandatory)</label>
                          <textarea
                            value={decisionReasonInput}
                            onChange={(e) => setDecisionReasonInput(e.target.value)}
                            style={{ ...inputStyle, minHeight: '90px' }}
                            placeholder="Enter detailed reason for officer sign-off..."
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                          <div>
                            <label style={labelStyle}>Evidence Required (Mandatory)</label>
                            <input
                              type="text"
                              value={reqEvidenceInput.evidenceRequired}
                              onChange={(e) => setReqEvidenceInput({ ...reqEvidenceInput, evidenceRequired: e.target.value })}
                              style={inputStyle}
                              placeholder="e.g. Geo-tagged clear photograph of house structural damage"
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>Instructions for Applicant / Field Officer</label>
                            <textarea
                              value={reqEvidenceInput.instructions}
                              onChange={(e) => setReqEvidenceInput({ ...reqEvidenceInput, instructions: e.target.value })}
                              style={{ ...inputStyle, minHeight: '70px' }}
                              placeholder="Instructions for re-inspection..."
                            />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setConfirmModalType(null)}
                          disabled={officerLoading}
                          style={btnStyleSecondary}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDecision}
                          disabled={officerLoading}
                          style={{
                            ...btnStylePrimary,
                            background: confirmModalType === 'APPROVED' ? '#10b981' : confirmModalType === 'REJECTED' ? '#ef4444' : '#f59e0b',
                            padding: '10px 20px',
                            fontWeight: '700'
                          }}
                        >
                          {officerLoading ? 'Submitting...' : `Confirm ${confirmModalType.replace(/_/g, ' ')}`}
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

          </main>
        </div>
      </div>
    </section>
  )
}

// ─── Inline Reusable Styles ────────────────────────────────────────────────────

const topBarStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '14px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '12px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
}

const sidebarBoxStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  height: 'fit-content',
}

const mainWorkspaceStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '28px',
  minHeight: '600px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
}

const cardBoxStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '20px',
}

const cardHeaderStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#000433',
  margin: '0 0 14px 0',
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
  padding: '10px 12px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const inputErrorStyle = {
  ...inputStyle,
  borderColor: '#ef4444',
  background: '#fef2f2',
}

const errorTextStyle = {
  color: '#dc2626',
  fontSize: '12px',
  marginTop: '4px',
  display: 'block',
}

const alertErrorStyle = {
  padding: '12px 16px',
  borderRadius: '8px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '500',
  marginTop: '16px',
}

const alertSuccessStyle = {
  padding: '12px 16px',
  borderRadius: '8px',
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  fontSize: '14px',
  fontWeight: '500',
  marginTop: '16px',
}

const btnStylePrimary = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: '700',
  borderRadius: '6px',
  border: 'none',
  background: '#0087CC',
  color: '#ffffff',
  cursor: 'pointer',
  fontFamily: 'inherit',
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
  fontFamily: 'inherit',
}
