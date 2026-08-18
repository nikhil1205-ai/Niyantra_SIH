import React from 'react'

export default function RiskEngine() {
  return (
    <div className="main-wrapper">
      <section className="section-hero">
        <div className="container-large">
          <div className="hero_content">
            <div className="hero_title">
              <h1>Explainable Governance &amp; Risk Lineage</h1>
            </div>
            <div className="hero_text">
              <p>Every risk calculation, policy trigger, and autonomy change connects directly to evidence.</p>
            </div>
          </div>
        </div>
        <div className="grainy pointer-events-off"></div>
      </section>

      <div className="legal-content">
        <div className="container-large">
          <div className="article-content_grid">
            <div className="article_main">
              <div>
                {/* Explainability Trace Box */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '32px', borderRadius: '12px', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#000433', marginBottom: '16px' }}>
                    Why Did Autonomy Change? (Sample Lineage Trace)
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #00A859' }}>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>RISK BEFORE</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#00A859' }}>22 / 100</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Low Risk State</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #E53935' }}>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>RISK AFTER</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#E53935' }}>58 / 100</div>
                      <div style={{ fontSize: '13px', color: '#E53935', fontWeight: '600' }}>Risk Spike Detected</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #FF9800' }}>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>AUTONOMY SHIFT</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#0087CC' }}>L3 &rarr; L1</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>Human Review Intercept</div>
                    </div>
                  </div>

                  <div className="text-rich-text w-richtext">
                    <p style={{ fontWeight: '700', marginBottom: '6px' }}>Supporting Evidence:</p>
                    <p>Conflicting bank record statement uploaded at 14:22:08 UTC.</p>

                    <p style={{ fontWeight: '700', marginTop: '14px', marginBottom: '6px' }}>Triggered Policy:</p>
                    <p>Governance Policy Rule #402 (Income Verification Discrepancy Gate).</p>

                    <p style={{ fontWeight: '700', marginTop: '14px', marginBottom: '6px' }}>Enforced Action:</p>
                    <p>Tool execution blocked; case routed to human supervisor queue for manual review.</p>
                  </div>
                </div>

                <div className="text-rich-text w-richtext">
                  <h2>Core Risk Engine Principles</h2>
                  <ul role="list">
                    <li><strong>Continuous Risk Reassessment:</strong> Risk scores are not static; they update dynamically as case evidence evolves.</li>
                    <li><strong>Evidence Lineage:</strong> Every autonomy modification cites the exact document, data point, or policy rule that triggered it.</li>
                    <li><strong>Hard Enforcement Gates:</strong> Autonomous execution is intercepted at the Tool Gateway before reaching government endpoints.</li>
                    <li><strong>Derogation Safeguards:</strong> High-risk policy flags immediately lock down autonomy to Level 0 or Level 1.</li>
                  </ul>
                </div>
              </div>
            </div>
            <aside className="article_aside"></aside>
          </div>
        </div>
      </div>
    </div>
  )
}
