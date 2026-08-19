import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <div className="footer">
      <div className="container-large">
        <div className="footer_grid">
          <div
            id="w-node-_672acbcf-3ec8-5fb2-fe3e-4f2cc1871dc3-c1871dc0"
            className="footer_brand"
          >
            <Link to="/" className="footer_logo w-inline-block" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3L27 7.5V15C27 21.5 22.2 27.2 16 29C9.8 27.2 5 21.5 5 15V7.5L16 3Z" stroke="#0087CC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 135, 204, 0.08)" />
                <circle cx="16" cy="16" r="4" fill="#0087CC" />
              </svg>
              <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: '#000433' }}>
                NIYANTRA
              </span>
            </Link>
            <p className="text-size-regular text-color-grey" style={{ marginTop: '10px', maxWidth: '320px' }}>
              Risk-Adaptive Autonomous Governance for Safe and Explainable Government Workflows
            </p>
            <p className="text-size-regular text-color-grey" style={{ marginTop: '8px' }}>
              ©2026 NIYANTRA Governance Systems, Inc.
            </p>
            <div className="footer_legal">
              <Link to="/risk-engine" className="footer_link">
                Governance &amp; Policies
              </Link>
              <Link to="/policies/privacy" className="footer_link">
                Privacy
              </Link>
            </div>
          </div>
          <div className="footer_menu">
            <div
              id="w-node-_672acbcf-3ec8-5fb2-fe3e-4f2cc1871dd2-c1871dc0"
              className="footer_menu_column"
            >
              <div className="heading-style-h3">Platform</div>
              <div className="footer_menu_links">
                <Link to="/workspace" className="footer_link">
                  Workspace
                </Link>
                <Link to="/risk-engine" className="footer_link">
                  Risk Engine
                </Link>
                <Link to="/about" className="footer_link">
                  About Us
                </Link>
              </div>
            </div>
            <div
              id="w-node-_672acbcf-3ec8-5fb2-fe3e-4f2cc1871dde-c1871dc0"
              className="footer_menu_column"
            >
              <div className="heading-style-h3">Resources</div>
              <div className="footer_menu_links">
                <Link to="/demo" className="footer_link">
                  Interactive Demo
                </Link>
                <Link to="/risk-engine" className="footer_link">
                  Explainability Lineage
                </Link>
                <Link to="/policies/privacy" className="footer_link">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grainy pointer-events-off"></div>
    </div>
  )
}
