import React from 'react'
import { Link } from 'react-router-dom'

export default function HowItWorks() {
  return (
    <>
      <section id="Weekly-Interactive-Livestream" className="section is-bg_pattern_teal-outline">
        <div className="container-large">
          <div className="div-block-70">
            <h2 className="heading-style-h1">
              How NIYANTRA Governs <br />Autonomous AI Workflows
            </h2>
            <p className="text-size-large" style={{ marginTop: '12px', color: '#000433' }}>
              Agent Proposes &nbsp;&rarr;&nbsp; NIYANTRA Authorizes &nbsp;&rarr;&nbsp; Tool Gateway Executes
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-98">
            <div id="w-node-_018521c1-8c06-7b9f-3e28-b83e5e4beb4a-35594b8a" className="w-layout-vflex flex-block-12">
              <div className="w-layout-vflex">
                <h2>Runtime Control Layer</h2>
                <div className="text-size-large">
                  <em>Sitting between AI agents and government systems.</em> <br />
                  <br />
                  NIYANTRA prevents unvetted AI actions from executing by enforcing continuous risk-adaptive autonomy controls.
                </div>
              </div>
              <Link to="/demo" className="button-primary" style={{ display: 'inline-block', width: 'fit-content' }}>
                Schedule a Demo
              </Link>
            </div>
            <div id="w-node-_887f7868-2121-7ce8-d405-cb03b50aefd5-35594b8a" className="div-block-116">
              <img
                src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/68374f96ddeeede1553b28d4_Computer%20Illustration.png"
                loading="lazy"
                alt="NIYANTRA Runtime Architecture"
                className="image-34"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Process Pipeline Section */}
      <section className="section is-light_grey">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-36">
            <div className="section-title">
              <div className="div-block-34">
                <h2>4-Stage Runtime Governance Pipeline</h2>
              </div>
            </div>
            <div className="w-layout-hflex flex-block-9" style={{ gap: '20px' }}>
              <div className="youtube-div" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', flex: '1', minWidth: '240px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0087CC', marginBottom: '8px' }}>01</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>AI Agent Proposes Action</h3>
                <p className="paragraph">
                  The AI agent analyzes case inputs and generates a proposed action or tool invocation request.
                </p>
              </div>
              <div className="youtube-div" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', flex: '1', minWidth: '240px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0087CC', marginBottom: '8px' }}>02</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Continuous Risk Evaluation</h3>
                <p className="paragraph">
                  NIYANTRA continuously evaluates case-level risk as new evidence or data arrives in real time.
                </p>
              </div>
              <div className="youtube-div" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', flex: '1', minWidth: '240px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0087CC', marginBottom: '8px' }}>03</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Autonomy Controller</h3>
                <p className="paragraph">
                  Governance rules dynamically determine allowed autonomy levels (Level 0 to Level 4).
                </p>
              </div>
              <div className="youtube-div" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', flex: '1', minWidth: '240px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0087CC', marginBottom: '8px' }}>04</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Tool Gateway Enforcement</h3>
                <p className="paragraph">
                  Authorizes low-risk executions or intercepts risky actions until human approval is obtained.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Demonstration Section */}
      <section className="section">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="section-title">
            <div className="div-block-34">
              <div className="w-layout-hflex flex-block-13">
                <div className="w-layout-hflex flex-block-15">
                  <h2 className="heading-19">Workflow Case Scenarios</h2>
                </div>
                <div className="text-size-large">How autonomy adapts when evidence changes during runtime</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
              <div style={{ background: '#F4FBF7', border: '1px solid #B8E6CE', padding: '28px', borderRadius: '12px' }}>
                <span style={{ background: '#00A859', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  LOW-RISK SCENARIO
                </span>
                <h3 style={{ fontSize: '20px', marginTop: '14px', marginBottom: '10px' }}>Consistent Evidence</h3>
                <p className="paragraph">
                  High confidence + consistent documents + low risk score.
                </p>
                <div style={{ marginTop: '16px', fontWeight: '700', color: '#00A859' }}>
                  &rarr; Level 4 Autonomy: Automated Execution Approved
                </div>
              </div>

              <div style={{ background: '#FFF5F5', border: '1px solid #FFC9C9', padding: '28px', borderRadius: '12px' }}>
                <span style={{ background: '#E53935', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  RISK ESCALATION SCENARIO
                </span>
                <h3 style={{ fontSize: '20px', marginTop: '14px', marginBottom: '10px' }}>Conflicting Evidence Arrives</h3>
                <p className="paragraph">
                  Discrepancy detected in bank record $\rightarrow$ Risk score spikes from 22 to 58.
                </p>
                <div style={{ marginTop: '16px', fontWeight: '700', color: '#E53935' }}>
                  &rarr; Autonomy Reduced: Level 3 &rarr; Level 1 (Action Blocked for Human Review)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
