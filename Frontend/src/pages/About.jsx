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
                  Explore NIYANTRA Workflow
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
