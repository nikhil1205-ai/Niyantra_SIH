import React from 'react'

export default function TermsOfService() {
  return (
    <div className="main-wrapper">
      <section className="section-hero">
        <div className="container-large">
          <div className="hero_content">
            <div className="hero_title">
              <h1>Terms of Service</h1>
            </div>
            <div className="hero_text">
              <p>Last updated January 4, 2024</p>
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
                  <p>Welcome to Ontologize. By accessing or using our websites, services, and live training sessions, you agree to be bound by these Terms of Service.</p>
                  <h2>1. Training &amp; Content Access</h2>
                  <p>All training materials, presentations, and resources provided by Ontologize are for personal or internal organizational learning. Unauthorized redistribution is strictly prohibited.</p>
                  <h2>2. Accounts &amp; Registration</h2>
                  <p>You agree to provide accurate registration information and to maintain the security of your account credentials.</p>
                  <h2>3. Contact</h2>
                  <p>For questions regarding these Terms, please reach out to <a href="mailto:support@ontologize.com">support@ontologize.com</a>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
