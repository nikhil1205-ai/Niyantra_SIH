import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'

// NIYANTRA Pages
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import Architecture from './pages/Architecture'
import RiskEngine from './pages/RiskEngine'
import Demo from './pages/Demo'
import About from './pages/About'

// Policy Sub-pages
import Privacy from './pages/policies/Privacy'
import TermsOfService from './pages/policies/TermsOfService'
import Abuse from './pages/policies/Abuse'
import Ccpa from './pages/policies/Ccpa'
import AccountOwnership from './pages/policies/AccountOwnership'
import CompanyProcessors from './pages/policies/CompanyProcessors'
import AnswersRules from './pages/policies/AnswersRules'
import Copyright from './pages/policies/Copyright'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          
          {/* Primary NIYANTRA Routes */}
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="risk-engine" element={<RiskEngine />} />
          <Route path="demo" element={<Demo />} />
          <Route path="about" element={<About />} />

          {/* Backward Compatibility Alias Routes */}
          <Route path="free-tutorials" element={<HowItWorks />} />
          <Route path="trainings" element={<Architecture />} />
          <Route path="policies" element={<RiskEngine />} />
          <Route path="contact" element={<Demo />} />
          <Route path="our-story" element={<About />} />

          {/* Governance & Privacy Sub-pages */}
          <Route path="policies/privacy" element={<Privacy />} />
          <Route path="policies/terms-of-service" element={<TermsOfService />} />
          <Route path="policies/abuse" element={<Abuse />} />
          <Route path="policies/ccpa" element={<Ccpa />} />
          <Route path="policies/account-ownership" element={<AccountOwnership />} />
          <Route path="policies/company-processors" element={<CompanyProcessors />} />
          <Route path="policies/answers-rules" element={<AnswersRules />} />
          <Route path="policies/copyright" element={<Copyright />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
