import React from 'react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="main-wrapper">
      <section className="section-hero">
        <div className="container-large">
          <div className="hero_content">
            <div className="hero_title">
              <h1>Privacy Policy</h1>
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
                  <p>In this policy, we lay out: what data we collect and why; how your data is handled; and your rights with respect to your data. We never sell your data.</p>
                  <p>This policy applies to all Services offered by Ontologize (see our <Link to="/policies/terms-of-service">Terms of Service</Link> for definitions).</p>
                  <p>This policy applies to our handling of information about site visitors, prospective customers, and customers and authorized users. We refer collectively to these categories of individuals as “you” throughout this policy.</p>
                  <p>If you are a California resident, please <Link to="/policies/ccpa"><strong>click here to see our California Notice at Collection</strong></Link>.</p>
                  
                  <h2>What we collect and why</h2>
                  <p>Our guiding principle is to collect only what we need. Here’s what that means in practice:</p>
                  
                  <h3>Identity and access</h3>
                  <p>When you sign up for an Ontologize Service, we ask for identifying information such as your name, email address, and company name so you can personalize your account and receive essential updates.</p>
                  <p>We’ll never sell your personal information to third parties, and we won’t use your name or company in marketing statements without your permission.</p>

                  <h3>Billing information</h3>
                  <p>If you sign up for a paid Service, credit card information is submitted directly to our payment processor. We store transaction records (last 4 digits) for invoicing and billing support.</p>

                  <h3>How we secure your data</h3>
                  <p>All data is encrypted via SSL/TLS when transmitted from our servers to your browser. Database backups are also encrypted.</p>

                  <h2>Changes and questions</h2>
                  <p>We may update this policy as needed to comply with regulations. Have any questions? Please contact us at <a href="mailto:privacy@ontologize.com"><strong>privacy@ontologize.com</strong></a>.</p>
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
