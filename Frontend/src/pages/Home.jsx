import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <div className="section-home-hero">
        <div className="w-layout-hflex flex-block">
          <div className="container-large">
            <div className="h-hero_content">
              <div className="h-hero_title" data-ix="slide-in-animation">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(0, 135, 204, 0.1)', border: '1px solid rgba(0, 135, 204, 0.25)', borderRadius: '20px', marginBottom: '16px' }}>
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                    <path d="M16 3L27 7.5V15C27 21.5 22.2 27.2 16 29C9.8 27.2 5 21.5 5 15V7.5L16 3Z" stroke="#0087CC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 135, 204, 0.2)" />
                    <circle cx="16" cy="16" r="4" fill="#0087CC" />
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0087CC', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    NIYANTRA
                  </span>
                </div>
                <h1 className="heading-style-h1">Risk-Adaptive Autonomous Governance</h1>
              </div>
              <div className="h-hero_text" data-ix="slide-in-animation">
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#000433', marginBottom: '8px' }}>
                  For Safe and Explainable Government Workflows
                </h3>
                <p className="text-size-large">
                  AI autonomy that adapts to risk — <span className="text-span-9">in real time</span>.
                </p>
              </div>
              <div className="spacer-large"></div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link to="/how-it-works" className="button-primary w-button">
                  Explore NIYANTRA
                </Link>
                <Link to="/architecture" className="button-_secondary-wide" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
          <div className="h-hero__illustration">
            <img
              src="https://cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/64b177d7207a0b5e76f37c0b_illustration__elements.svg"
              loading="lazy"
              alt="NIYANTRA Risk Governance Constellation"
              className="h-hero__illustration__elements"
            />
            <img
              src="https://cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/64b4df451f671c394c244eef_illustration_badge_3.svg"
              loading="lazy"
              alt="NIYANTRA Central Control Badge"
              className="h-hero__illustration__badge"
            />
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="section">
        <div className="container-large">
          <div>
            <img
              src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/68362d9e3d8868d3b201ac74_Hero%20Arrow.png"
              loading="lazy"
              alt="Hero Arrow"
              className="image-22"
            />
          </div>
          <div className="div-block-84">
            <p className="text-size-large">
              Traditional AI governance is static. <span className="text-span-5">NIYANTRA continuously evaluates case risk</span> <br />
            </p>
            <p className="text-size-large">
              and dynamically controls <span className="text-span-6">AI agent autonomy in real time.</span>
            </p>
          </div>

          <div className="pricing-wrapper">
            <div id="w-node-a2d2f0a9-7c66-93ea-83f9-cb5d4f40990d-7f346238" className="pricing-card">
              <div>
                <div className="w-layout-vflex flex-block-16">
                  <div className="div-block-61"></div>
                  <h2 className="pricing-title">Runtime Control</h2>
                  <div className="text-size-large">Dynamic Autonomy Adjustment</div>
                  <div className="spacer-small"></div>
                  <p className="paragraph">
                    Sits between AI agents and government systems. As live case evidence evolves, NIYANTRA automatically scales allowed autonomy up or down.
                  </p>
                </div>
              </div>
              <Link to="/architecture" className="button-_secondary-wide">
                View Architecture
              </Link>
            </div>

            <div id="w-node-_501296ed-3771-f9cf-fc7e-d8c18f2a31ed-7f346238" className="pricing-card">
              <div>
                <div className="w-layout-vflex">
                  <div className="div-block-61"></div>
                  <h2 className="pricing-title">Explainable Lineage</h2>
                  <div className="text-size-large">Evidence-Backed Audit Traces</div>
                  <div className="spacer-small"></div>
                  <p className="paragraph">
                    Every risk calculation, policy trigger, and autonomy reduction connects directly back to supporting evidence for full accountability.
                  </p>
                </div>
              </div>
              <Link to="/risk-engine" className="button-_secondary-wide">
                Explore Risk Engine
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <section className="section is-light_grey">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-75">
            <div className="section-labels is-yellow">Governance Features</div>
          </div>
          <h2>Built for High-Stakes Public &amp; Government Workflows</h2>
          <div className="div-block-37" style={{ marginTop: '2rem' }}>
            <div className="w-layout-grid grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="card-quote-box" style={{ background: '#ffffff', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '20px', color: '#0087CC', marginBottom: '8px' }}>Continuous Risk</h3>
                <p className="paragraph">
                  Risk is continuously reassessed as new evidence enters the running case workflow.
                </p>
              </div>
              <div className="card-quote-box" style={{ background: '#ffffff', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '20px', color: '#0087CC', marginBottom: '8px' }}>Dynamic Autonomy</h3>
                <p className="paragraph">
                  AI permissions automatically increase or decrease based on the current real-time risk level.
                </p>
              </div>
              <div className="card-quote-box" style={{ background: '#ffffff', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '20px', color: '#0087CC', marginBottom: '8px' }}>Hard Enforcement</h3>
                <p className="paragraph">
                  AI agents cannot bypass the autonomy level enforced by the NIYANTRA control layer.
                </p>
              </div>
              <div className="card-quote-box" style={{ background: '#ffffff', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '20px', color: '#0087CC', marginBottom: '8px' }}>Decision Lineage</h3>
                <p className="paragraph">
                  Every important risk and autonomy decision is connected directly to supporting evidence.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-layout-blockcontainer container-large w-container" style={{ marginTop: '3rem' }}>
          <div className="collection-list-wrapper-6 w-dyn-list">
            <div role="list" className="collection-list-5 w-dyn-items">
              <div role="listitem" className="collection-item-4 w-dyn-item">
                <div className="card-quote-box">
                  <div className="div-block-72">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68016b830d45748ff87dd5b8_dod-logo.png"
                      alt="Governance Evaluation"
                      className="image-14"
                    />
                  </div>
                  <div className="review-quote">
                    "NIYANTRA provides the exact runtime guardrails needed to deploy autonomous AI agents safely in critical workflows."
                  </div>
                  <div>
                    <div className="div-block-73"></div>
                    <div className="text-block-31">Government Workflow Evaluator</div>
                    <div>Public Sector AI Governance Study</div>
                  </div>
                </div>
              </div>

              <div role="listitem" className="collection-item-4 w-dyn-item">
                <div className="card-quote-box">
                  <div className="div-block-72">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/68016ec747baf8a55b4dad0c_PMW%20logo%20color.png"
                      alt="Analytics Audit"
                      className="image-14"
                    />
                  </div>
                  <div className="review-quote">
                    "The ability to automatically drop autonomy from Level 3 to Level 1 when evidence conflicts is game-changing."
                  </div>
                  <div>
                    <div className="div-block-73"></div>
                    <div className="text-block-31">Enterprise Risk Auditor</div>
                    <div>Autonomous System Review</div>
                  </div>
                </div>
              </div>

              <div role="listitem" className="collection-item-4 w-dyn-item">
                <div className="card-quote-box">
                  <div className="div-block-72">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/6801739fba4d9ec8b21096ff_fortune%20100%20logo%20color.png"
                      alt="Compliance Team"
                      className="image-14"
                    />
                  </div>
                  <div className="review-quote">
                    "Complete decision lineage makes explainability straightforward for auditors and human reviewers."
                  </div>
                  <div>
                    <div className="div-block-73"></div>
                    <div className="text-block-31">Lead Systems Governance Architect</div>
                    <div>Public Benefit System Analysis</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
