import React from 'react'
import { Link } from 'react-router-dom'

export default function Architecture() {
  return (
    <>
      <section className="section is-pattern_teal">
        <div className="container-large">
          <div className="div-block-71">
            <div className="heading-style-h1 text-color-white">Architecture &amp; Control Layer</div>
            <div className="text-block-30">Sitting between AI agents and government systems to enforce risk-adaptive autonomy.</div>
            <Link to="/demo" className="button-primary bg-white_text-black w-button">
              Explore Demo
            </Link>
          </div>
        </div>
      </section>

      <section id="Weekly-Interactive-Livestream" className="section bg-up-arrows">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-87">
            <div className="div-block-97">
              <h1 className="heading-18">
                <span className="text-blue-bold-underline">Dynamic Autonomy Scaling</span> Engine
              </h1>
              <h2 className="text-size-large">
                As workflow risk increases, allowed autonomy decreases automatically.
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Autonomy Levels Grid */}
      <section className="section is-light_grey">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-36">
            <div className="section-header-div">
              <div className="section-labels is-dark-blue">Autonomy Levels</div>
            </div>
            <div className="section-title">
              <div className="div-block-34">
                <h2>5 Levels of Governance Autonomy Control</h2>
              </div>
            </div>
            <div className="training-format-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              
              <div className="training-format-card">
                <div className="div-block-79">
                  <div className="color-tab-teal" style={{ background: '#E53935' }}></div>
                  <div className="training-format-title" style={{ color: '#E53935' }}>LEVEL 0</div>
                </div>
                <div className="w-layout-vflex flex-block-8">
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Human Only</h3>
                  <div className="text-block-22">Zero AI autonomy. All actions must be manually created and executed by human operators.</div>
                </div>
              </div>

              <div className="training-format-card">
                <div className="div-block-80">
                  <div className="color-tab-blue" style={{ background: '#FF9800' }}></div>
                  <div className="training-format-title" style={{ color: '#FF9800' }}>LEVEL 1</div>
                </div>
                <div className="w-layout-vflex flex-block-8">
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>AI Recommends</h3>
                  <div className="text-block-22">AI generates recommendations and evidence summaries; human retains full execution authority.</div>
                </div>
              </div>

              <div className="training-format-card">
                <div className="div-block-81">
                  <div className="color-tab-dark-blue" style={{ background: '#0087CC' }}></div>
                  <div className="training-format-title is-dark_blue">LEVEL 2</div>
                </div>
                <div className="w-layout-vflex flex-block-8">
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Human-Approved Execution</h3>
                  <div className="text-block-22">AI prepares the complete execution payload; action executes only after human explicit approval.</div>
                </div>
              </div>

              <div className="training-format-card">
                <div className="div-block-79">
                  <div className="color-tab-teal"></div>
                  <div className="training-format-title is-teal">LEVEL 3</div>
                </div>
                <div className="w-layout-vflex flex-block-8">
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Audited Autonomous</h3>
                  <div className="text-block-22">AI executes actions autonomously while logging real-time audit traces for continuous inspection.</div>
                </div>
              </div>

              <div className="training-format-card">
                <div className="div-block-80">
                  <div className="color-tab-blue" style={{ background: '#00A859' }}></div>
                  <div className="training-format-title" style={{ color: '#00A859' }}>LEVEL 4</div>
                </div>
                <div className="w-layout-vflex flex-block-8">
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Fully Autonomous</h3>
                  <div className="text-block-22">High-confidence, low-risk automated execution without intermediate human intervention.</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Hard Enforcement Feature Section */}
      <section className="section">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="_2-column-grid_portal">
            <div className="div-block-90">
              <div className="div-block-50">
                <div className="section-labels is-blue">Hard Enforcement</div>
                <h1>Tool Gateway Interception</h1>
              </div>
              <p className="text-size-large">
                Agents cannot bypass the autonomy level enforced by the control layer. Every tool request is validated against current case risk before execution.
              </p>
              <Link to="/risk-engine" className="button-secondary w-button">
                Learn About Risk Engine
              </Link>
            </div>
            <img
              src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/683750469bdde8822d6b7399_Portal%20mockup.png"
              loading="lazy"
              alt="Tool Gateway Interception Architecture"
              className="image-29 slide-up"
            />
          </div>
        </div>
      </section>
    </>
  )
}
