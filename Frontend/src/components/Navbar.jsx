import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <div className="navbar-v2">
      <div
        data-animation="default"
        data-collapse="medium"
        data-duration="400"
        data-easing="ease"
        data-easing2="ease"
        role="banner"
        className="navbar-no-shadow-container w-nav"
      >
        <div>
          <div className="navbar-wrapper-2">
            <Link
              to="/"
              className={`navbar-brand-2 w-nav-brand ${location.pathname === '/' ? 'w--current' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
            >
              <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3L27 7.5V15C27 21.5 22.2 27.2 16 29C9.8 27.2 5 21.5 5 15V7.5L16 3Z" stroke="#0087CC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 135, 204, 0.08)" />
                <circle cx="16" cy="16" r="4" fill="#0087CC" />
                <path d="M16 8V12M16 20V24M10 16H12M20 16H22" stroke="#0087CC" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', color: '#000433', fontFamily: 'inherit' }}>
                NIYANTRA
              </span>
            </Link>
            <nav
              role="navigation"
              className={`nav-menu-wrapper-2 w-nav-menu ${isOpen ? 'w--open' : ''}`}
              style={{
                transform: isOpen ? 'translateY(0px)' : undefined,
                transition: 'transform 400ms ease',
              }}
            >
              <ul role="list" className="nav-menu _2 w-list-unstyled">
                <li>
                  <Link
                    to="/workspace"
                    className={`nav-link-2 ${location.pathname === '/workspace' ? 'w--current' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    Workspace
                  </Link>
                </li>

                <li>
                  <Link
                    to="/risk-engine"
                    className={`nav-link-2 ${location.pathname === '/risk-engine' ? 'w--current' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    Risk Engine
                  </Link>
                </li>
                <li>
                  <Link
                    to="/demo"
                    className={`nav-link-2 ${location.pathname === '/demo' ? 'w--current' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    Workflow
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className={`nav-link-2 ${location.pathname === '/about' ? 'w--current' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    About
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="nav-button-wrapper">
              <Link to="/demo" className="button-primary nav w-button">
                Explore NIYANTRA
              </Link>
            </div>
            <div
              className={`menu-button-2 w-nav-button ${isOpen ? 'w--open' : ''}`}
              onClick={toggleMenu}
              aria-label="menu"
              role="button"
              tabIndex={0}
            >
              <div className="icon w-icon-nav-menu"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
