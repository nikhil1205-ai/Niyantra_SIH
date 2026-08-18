import React from 'react'
import { Link } from 'react-router-dom'

export default function Policies() {
  return (
    <div className="main-wrapper">
      <section className="section-hero">
        <div className="container-large">
          <div className="hero_content">
            <div className="hero_title">
              <h1>Policies, Terms, and General Service Information</h1>
            </div>
            <div className="hero_text">
              <p>Last updated January 4, 2023</p>
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
                <div className="text-rich-text w-richtext">
                  <p>We make our policies as clear, fair, and readable as possible.</p>
                  <ul role="list">
                    <li>
                      <Link to="/policies/terms-of-service">Terms of Service</Link>
                    </li>
                    <li>
                      <Link to="/policies/privacy">Privacy Policy</Link>
                    </li>
                    <li>
                      <Link to="/policies/ontologize-answers-rules">Ontologize Answers Rules</Link>
                    </li>
                    <li>
                      <Link to="/policies/ccpa">California Resident Notice at Collection</Link>
                    </li>
                    <li>
                      <Link to="/policies/abuse">Use Restrictions Policy</Link>
                    </li>
                    <li>Security Overview</li>
                    <li>
                      <Link to="/policies/account-ownership-policy">Account Ownership Policy</Link>
                    </li>
                  </ul>
                  <p>
                    We may update these policies as needed to comply with relevant regulations and reflect any new practices. If we make significant changes, we will refresh the date at the top of the page.
                  </p>
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
