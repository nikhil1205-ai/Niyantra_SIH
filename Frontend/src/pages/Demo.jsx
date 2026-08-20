import React from 'react'
import { Link } from 'react-router-dom'

export default function Workflow() {
  const steps = [
    {
      number: '01',
      title: 'Application Intake',
      description: 'The citizen submits relief request applications containing documents and damage photographs via public portals.',
      module: 'Module 1: Intake System',
      color: '#3b82f6',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      number: '02',
      title: 'AI Agent Assessment',
      description: 'Multi-agent vision systems scan uploads, calculate damage severity, and verify identity metrics (89% standard confidence).',
      module: 'Module 2: Agent Panel',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      border: '#ddd6fe',
    },
    {
      number: '03',
      title: 'Real-Time Risk Engine',
      description: 'A dynamic engine scores case risk factors (Process Anomaly, Action Sensitivity, Financial Value) from 0 to 100.',
      module: 'Module 3: Risk Engine',
      color: '#ec4899',
      bg: '#fdf2f8',
      border: '#fbcfe8',
    },
    {
      number: '04',
      title: 'Autonomy Controller',
      description: 'Maps the risk score to an Autonomy Level. L3 allows full automation. L1 triggers an immediate security lock.',
      module: 'Module 4: Autonomy Guard',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fef3c7',
    },
    {
      number: '05',
      title: 'Officer Review Cockpit',
      description: 'L1 cases display action authorization panels to verified officers. Officers approve, reject, or request more evidence.',
      module: 'Module 5: Oversight Portal',
      color: '#10b981',
      bg: '#ecfdf5',
      border: '#a7f3d0',
    },
    {
      number: '06',
      title: 'Tool Gateway & Execution',
      description: 'Verifies case autonomy credentials before permitting real-world actions, locking unsafe execution attempts.',
      module: 'Module 6: Tool Gateway',
      color: '#6366f1',
      bg: '#e0e7ff',
      border: '#c7d2fe',
    },
  ]

  const ruleCards = [
    {
      title: 'Single Source of Truth',
      desc: 'The frontend NEVER calculates risk, risk level, autonomy, or human intervention requirements. The Python backend operates as the sole governance engine.',
      icon: '🔒',
    },
    {
      title: 'Conditional Oversight',
      desc: 'Officer review controls only become active when the backend case autonomy requires human intervention (L1). Low-risk L3 cases execute automatically.',
      icon: '⚙️',
    },
    {
      title: 'Event-Driven Recalculation',
      desc: 'When real-world updates or new field reports arrive, the Risk Engine re-evaluates the case state from scratch, triggering safe dynamic state changes.',
      icon: '⚡',
    },
  ]

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', color: '#1e293b', background: '#f8fafc', minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', tracking: '0.1em', color: '#3b82f6', background: '#dbeafe', padding: '6px 16px', borderRadius: '100px', display: 'inline-block', marginBottom: '16px' }}>
            Closed-Loop Governance Guide
          </span>
          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', margin: '0 0 16px 0', letterSpacing: '-0.025em' }}>
            How NIYANTRA Workspace Works
          </h1>
          <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
            NIYANTRA operates as a runtime governance layer that ensures safe, explainable, and risk-adaptive AI autonomy for public sector workflows.
          </p>
        </div>

        {/* Dynamic Workflow Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '60px' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ background: '#ffffff', borderRadius: '16px', border: `1px solid ${step.border}`, padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '96px', fontWeight: '900', color: step.bg, zIndex: 1, userSelect: 'none', lineHeight: 1 }}>
                {step.number}
              </div>
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: step.color, background: step.bg, padding: '4px 10px', borderRadius: '4px', border: `1px solid ${step.border}`, display: 'inline-block', marginBottom: '16px' }}>
                  {step.module}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                  {step.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step.color }}></div>
                Active Governance Loop Node
              </div>
            </div>
          ))}
        </div>

        {/* Design Constraints / Rules Section */}
        <div style={{ background: '#0f172a', borderRadius: '24px', padding: '48px', color: '#ffffff', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', textAlign: 'center' }}>
            System Governance Integrity Rules
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px auto', lineHeight: '1.6' }}>
            NIYANTRA enforces hard constraints to guarantee that human officers maintain full control over high-impact agency actions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {ruleCards.map((rule, idx) => (
              <div key={idx} style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '28px', marginBottom: '14px' }}>{rule.icon}</div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
                  {rule.title}
                </h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA to Workspace */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/workspace" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: '#ffffff', textDecoration: 'none', fontWeight: '800', fontSize: '15px', padding: '14px 28px', borderRadius: '12px', boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)', transition: 'all 0.2s ease-in-out' }}>
            Launch Active Governance Workspace →
          </Link>
        </div>

      </div>
    </div>
  )
}
