from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from app.models.case import Case
from app.models.evidence import Evidence


@dataclass
class AgentResult:
    """Standardized output structure for all PM-JAY verification agents."""
    agent_id: str
    case_id: str
    status: str            # "verified", "flagged", "failed", "pending"
    confidence: float      # 0.0 to 1.0
    evidence: List[str]
    risk_factors: List[str]
    proposed_action: Optional[str] = None


@dataclass
class ProposalOutput:
    """The proposal output handed to the Tool Gateway by the API layer."""
    agent: str
    action_type: str
    confidence: float
    reasoning: str
    evidence_refs: List[str]
    agent_results: List[Dict[str, Any]] = field(default_factory=list)


class BeneficiaryVerificationAgent:
    """Agent A: Beneficiary Verification Agent for PM-JAY."""
    AGENT_ID = "BeneficiaryVerificationAgent"

    def analyze(self, case: Case, evidence_list: List[Evidence]) -> AgentResult:
        ev_types = {e.evidence_type for e in evidence_list}
        risk_factors = []
        evidence = ["synthetic_eligibility_record"]
        status = "verified"
        confidence = 0.96

        if "beneficiary_conflict" in ev_types or "identity_mismatch" in ev_types:
            status = "flagged"
            confidence = 0.45
            risk_factors.append("Beneficiary demographic mismatch with SECC registration")
            evidence.append("identity_conflict_flag")
        if case.eligibility_status != "verified":
            status = "flagged"
            confidence = min(confidence, 0.50)
            risk_factors.append(f"Beneficiary eligibility status is '{case.eligibility_status}'")

        return AgentResult(
            agent_id=self.AGENT_ID,
            case_id=case.case_ref,
            status=status,
            confidence=confidence,
            evidence=evidence,
            risk_factors=risk_factors
        )


class IdentityDocumentVerificationAgent:
    """Agent B: Identity / Document Verification Agent."""
    AGENT_ID = "IdentityDocumentAgent"

    def analyze(self, case: Case, evidence_list: List[Evidence]) -> AgentResult:
        ev_types = {e.evidence_type for e in evidence_list}
        risk_factors = []
        evidence = ["pmjay_e_card_verified", "aadhaar_vault_token_valid"]
        status = "verified"
        confidence = 0.95

        if "missing_document" in ev_types:
            status = "flagged"
            confidence -= 0.35
            risk_factors.append("Mandatory discharge summary or clinical voucher missing")
            evidence.append("missing_document_flag")
        if "identity_mismatch" in ev_types:
            status = "flagged"
            confidence -= 0.30
            risk_factors.append("Biometric / e-KYC mismatch detected at admission")

        return AgentResult(
            agent_id=self.AGENT_ID,
            case_id=case.case_ref,
            status=status,
            confidence=max(0.10, confidence),
            evidence=evidence,
            risk_factors=risk_factors
        )


class HospitalVerificationAgent:
    """Agent C: Hospital Verification Agent."""
    AGENT_ID = "HospitalVerificationAgent"

    def analyze(self, case: Case, evidence_list: List[Evidence]) -> AgentResult:
        ev_types = {e.evidence_type for e in evidence_list}
        risk_factors = []
        evidence = ["hospital_empanelment_active", "geo_fencing_verified"]
        status = "verified"
        confidence = 0.94

        if "hospital_conflict" in ev_types:
            status = "flagged"
            confidence = 0.40
            risk_factors.append("Hospital empanelment tier mismatch for package code")
            evidence.append("empanelment_warning")

        return AgentResult(
            agent_id=self.AGENT_ID,
            case_id=case.case_ref,
            status=status,
            confidence=confidence,
            evidence=evidence,
            risk_factors=risk_factors
        )


class PackageTreatmentVerificationAgent:
    """Agent D: Package / Treatment Verification Agent."""
    AGENT_ID = "PackageTreatmentAgent"

    def analyze(self, case: Case, evidence_list: List[Evidence]) -> AgentResult:
        ev_types = {e.evidence_type for e in evidence_list}
        risk_factors = []
        evidence = ["package_tariff_check_passed", "pre_auth_approved"]
        status = "verified"
        confidence = 0.92

        if "treatment_mismatch" in ev_types:
            status = "flagged"
            confidence = 0.40
            risk_factors.append("Surgical diagnostic notes do not match package ICD-10 code")
            evidence.append("clinical_mismatch_flag")

        return AgentResult(
            agent_id=self.AGENT_ID,
            case_id=case.case_ref,
            status=status,
            confidence=confidence,
            evidence=evidence,
            risk_factors=risk_factors
        )


class ClaimValidationAgent:
    """Agent E: Claim Validation Agent."""
    AGENT_ID = "ClaimValidationAgent"

    def analyze(self, case: Case, evidence_list: List[Evidence]) -> AgentResult:
        ev_types = {e.evidence_type for e in evidence_list}
        risk_factors = []
        evidence = ["billing_audit_complete"]
        status = "verified"
        confidence = 0.95

        if "duplicate_claim" in ev_types:
            status = "flagged"
            confidence -= 0.40
            risk_factors.append("Duplicate claim indicator: prior settlement detected within 30 days")
            evidence.append("duplicate_claim_flag")
        if "rate_mismatch" in ev_types or case.claimed_amount > case.approved_rate:
            status = "flagged"
            confidence -= 0.25
            risk_factors.append(f"Claimed amount (₹{case.claimed_amount:,.0f}) exceeds approved tariff (₹{case.approved_rate:,.0f})")
            evidence.append("tariff_overage_flag")
        if "agent_disagreement" in ev_types:
            status = "flagged"
            confidence -= 0.20
            risk_factors.append("Inter-agent conflict detected between audit rules")

        return AgentResult(
            agent_id=self.AGENT_ID,
            case_id=case.case_ref,
            status=status,
            confidence=max(0.10, confidence),
            evidence=evidence,
            risk_factors=risk_factors
        )


class PMJAYProposalAgent:
    """
    PM-JAY Proposal Agent orchestrates all 5 verification agents
    and generates an action proposal for the Tool Gateway.
    """

    AGENT_NAME = "PMJAYProposalAgent"

    def __init__(self):
        self.beneficiary_agent = BeneficiaryVerificationAgent()
        self.identity_agent = IdentityDocumentVerificationAgent()
        self.hospital_agent = HospitalVerificationAgent()
        self.package_agent = PackageTreatmentVerificationAgent()
        self.claim_agent = ClaimValidationAgent()

    def run_all_agents(self, case: Case, evidence_list: List[Evidence]) -> List[AgentResult]:
        return [
            self.beneficiary_agent.analyze(case, evidence_list),
            self.identity_agent.analyze(case, evidence_list),
            self.hospital_agent.analyze(case, evidence_list),
            self.package_agent.analyze(case, evidence_list),
            self.claim_agent.analyze(case, evidence_list),
        ]

    def generate_proposal(
        self,
        case: Case,
        evidence_list: List[Evidence],
        requested_action: str = "authorize_claim",
    ) -> ProposalOutput:
        results = self.run_all_agents(case, evidence_list)
        agent_dicts = [
            {
                "agent_id": r.agent_id,
                "case_id": r.case_id,
                "status": r.status,
                "confidence": r.confidence,
                "evidence": r.evidence,
                "risk_factors": r.risk_factors,
                "proposed_action": r.proposed_action,
            }
            for r in results
        ]

        # Calculate weighted overall confidence across agents
        confidences = [r.confidence for r in results]
        avg_confidence = sum(confidences) / len(confidences)

        # Aggregate risk factors
        all_risk_factors = []
        for r in results:
            all_risk_factors.extend(r.risk_factors)

        all_evidence = set()
        for r in results:
            all_evidence.update(r.evidence)

        if all_risk_factors:
            reasoning = (
                f"PM-JAY Multi-Agent Analysis detected {len(all_risk_factors)} risk signals: "
                f"{'; '.join(all_risk_factors)}. Average Agent Confidence: {avg_confidence:.0%}. "
                f"Proposing '{requested_action}' for Tool Gateway authorization evaluation."
            )
        else:
            reasoning = (
                f"All 5 PM-JAY Verification Agents returned clean status with high confidence ({avg_confidence:.0%}). "
                f"Proposing '{requested_action}'."
            )

        return ProposalOutput(
            agent=self.AGENT_NAME,
            action_type=requested_action,
            confidence=round(avg_confidence, 2),
            reasoning=reasoning,
            evidence_refs=list(all_evidence),
            agent_results=agent_dicts,
        )


# Backward compatibility singleton
cghs_agent = PMJAYProposalAgent()
pmjay_agent = cghs_agent

