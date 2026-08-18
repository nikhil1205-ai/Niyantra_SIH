import React, { useEffect } from 'react'

export default function Demo() {
  useEffect(() => {
    // Load SavvyCal embed if available
    const script = document.createElement('script')
    script.src = 'https://embed.savvycal.com/v1/embed.js'
    script.async = true
    script.onload = () => {
      if (window.SavvyCal) {
        window.SavvyCal('init', { origin: 'https://contact.ontologize.com' })
        window.SavvyCal('inline', { link: 'sales/discovery-call-2', selector: '#booking-page' })
      }
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return (
    <>
      <section id="Weekly-Interactive-Livestream" className="section is-bg_pattern_teal-outline">
        <div className="container-large">
          <h2 className="heading-style-h1">Schedule a NIYANTRA Demo</h2>
          <h4 className="text-size-large">
            Have questions? Want to explore runtime governance for your government workflows? Book a live demo session.
          </h4>
        </div>
        <section className="section-form">
          <div className="w-embed w-script">
            <div id="booking-page" style={{ minHeight: '600px', width: '100%' }}>
              <iframe
                src="https://contact.ontologize.com/sales/discovery-call-2"
                title="Schedule a NIYANTRA Demo"
                style={{ width: '100%', height: '700px', border: 'none', borderRadius: '8px' }}
              ></iframe>
            </div>
          </div>
        </section>
      </section>
    </>
  )
}
