import React from 'react'
import { Link } from 'react-router-dom'

export default function About() {
  return (
    <>
      <section id="Weekly-Interactive-Livestream" className="section is-bg_pattern_teal-outline">
        <div className="div-block-69">
          <div className="w-layout-blockcontainer container-large w-container">
            <div className="div-block-92">
              <h2 className="heading-14">Safe, Explainable, &amp; Risk-Adaptive AI Autonomy</h2>
              <div className="div-block-94">
                <div className="paragraph">
                  <span className="text-span-8">NIYANTRA is designed as a runtime governance and control layer for AI-agent-driven government workflows.</span>
                  <br />
                  <br />
                  Its primary purpose is to allow AI systems to operate autonomously when workflow risk is low, while ensuring that increasing risk results in stronger human oversight and automatic action interception.
                  <br />
                  <br />
                  Traditional static governance models fail when workflow risk evolves mid-execution. NIYANTRA bridges this gap by continuously evaluating case evidence, calculating real-time risk, and enforcing dynamic autonomy levels (0 to 4) before tool execution occurs.
                  <br />
                  <br />
                  Every risk score change, policy trigger, and autonomy shift is fully logged with evidence lineage to provide complete explainability for auditors, supervisors, and decision-makers.
                </div>
                <Link to="/demo" className="button-primary w-button">
                  Explore NIYANTRA Demo
                </Link>
              </div>
            </div>
            <div className="div-block-93">
              <img
                src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37c0e/6840ce1cb98648110022ae73_Group%20shot.png"
                loading="lazy"
                alt="NIYANTRA Governance Engineering Team"
                className="image-33"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="section">
        <div className="w-layout-blockcontainer container-large w-container">
          <div className="div-block-36">
            <div className="section-title">
              <div className="div-block-34">
                <h2>NIYANTRA Governance Team</h2>
              </div>
            </div>
          </div>
          <div>
            <div className="w-dyn-list">
              <div role="list" className="collection-list-_about-page-our-team w-dyn-items">
                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2a4dbb8d2a252b02c22a_Taylor%20Circle.png"
                      alt="Leadership"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Taylor Gregoire</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Lead Systems Architect</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2c0de6a412d9ec5e37b4_Josh%20circle.png"
                      alt="Engineering"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Josh Miller</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Runtime Engine Lead</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2c3abb8d2a252b0404ee_Gena%20Circle.png"
                      alt="Data Science"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Gena Coblentz</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Risk Analytics Lead</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div role="listitem" className="w-dyn-item">
                  <div className="instructor-card">
                    <img
                      loading="lazy"
                      src="/cdn.prod.website-files.com/64b177d7207a0b5e76f37bc9/683e2ca98f88d66403c82f3e_Ben%20Circle.png"
                      alt="Governance"
                    />
                    <div className="div-block-77">
                      <div className="div-block-78">
                        <div className="text-block-8">Ben Thomas</div>
                      </div>
                      <div className="div-block-76">
                        <div className="text-block-33">Policy Framework Engineer</div>
                      </div>
                    </div>
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
