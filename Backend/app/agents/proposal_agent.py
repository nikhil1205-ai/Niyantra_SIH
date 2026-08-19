"""
agents/proposal_agent.py - CGHS Proposal Agent.

This agent PROPOSES actions based on case analysis.
It CANNOT execute actions directly.
It CANNOT call the Tool Gateway directly.

The architectural boundary is enforced by design:
- ProposalAgent returns a ProposalOutput dict.
- The API layer passes that to the Tool Gateway.
- The agent never imports from app.gateway.

An actual LLM can replace this deterministic agent later
without changing the Risk Engine or Tool Gateway.
"""
from dataclasses import dataclass
from typing import List
from app.models.case import Case
from app.models.evidence import Evidence


@dataclass
class ProposalOutput:
    """
    The only output the ProposalAgent can produce.
    
    This is handed to the Tool Gateway by the API layer.
    The agent never touches the Gateway itself.
    """
    agent: str
    action_type: str
    confidence: float
    reasoning: str
    evidence_refs: List[str]


class CGHSProposalAgent:
    """
    Deterministic CGHS claim processing agent.
    
    Simulates an AI agent by applying simple rule-based logic
    to generate action proposals with reasoning.
    
    Replacement with a real LLM: swap out generate_proposal()
    while keeping the same ProposalOutput interface.
    """

    AGENT_NAME = "CGHSProposalAgent"

    def generate_proposal(
        self,
        case: Case,
        evidence_list: List[Evidence],
        requested_action: str,
    ) -> ProposalOutput:
        """
        Analyze the case and evidence to produce a proposal.
        
        The agent reasons about whether to propose the action
        and at what confidence level.
        """
        evidence_types = {e.evidence_type for e in evidence_list}

        # Build reasoning and determine confidence based on evidence signals
        issues = []
        confidence_penalty = 0.0

        if "rate_mismatch" in evidence_types:
            issues.append("claimed amount exceeds the approved CGHS rate")
            confidence_penalty += 0.25

        if "missing_document" in evidence_types:
            issues.append("required documents are missing from the claim file")
            confidence_penalty += 0.20

        if "duplicate_claim" in evidence_types:
            issues.append("a possible duplicate claim has been detected")
            confidence_penalty += 0.30

        if "beneficiary_conflict" in evidence_types:
            issues.append("beneficiary information has a conflict with registered records")
            confidence_penalty += 0.25

        if "unreliable_evidence" in evidence_types:
            issues.append("some evidence sources are marked as unreliable")
            confidence_penalty += 0.15

        # Base confidence depends on claimed vs approved amount
        if case.claimed_amount <= case.approved_rate:
            base_confidence = 0.90
            financial_note = f"Claimed ₹{case.claimed_amount:,.0f} is within the approved rate of ₹{case.approved_rate:,.0f}."
        else:
            overage = case.claimed_amount - case.approved_rate
            overage_pct = (overage / case.approved_rate) * 100
            base_confidence = 0.60
            financial_note = (
                f"Claimed ₹{case.claimed_amount:,.0f} exceeds the approved rate of "
                f"₹{case.approved_rate:,.0f} by ₹{overage:,.0f} ({overage_pct:.1f}%)."
            )

        confidence = max(0.05, min(0.99, base_confidence - confidence_penalty))

        # Build the evidence references list
        evidence_refs = list(evidence_types) if evidence_types else ["approved_rate", "claim_amount"]
        if not evidence_types:
            evidence_refs = ["approved_rate", "claim_amount"]

        # Build the reasoning text
        if issues:
            issues_text = "; ".join(issues)
            reasoning = (
                f"{financial_note} "
                f"The following issues were detected: {issues_text}. "
                f"Proposing '{requested_action}' with confidence {confidence:.0%}. "
                f"The Tool Gateway will evaluate the current autonomy level before execution."
            )
        else:
            reasoning = (
                f"{financial_note} "
                f"No anomalies detected in the evidence. "
                f"Proposing '{requested_action}' with confidence {confidence:.0%}."
            )

        return ProposalOutput(
            agent=self.AGENT_NAME,
            action_type=requested_action,
            confidence=round(confidence, 2),
            reasoning=reasoning,
            evidence_refs=evidence_refs,
        )


# Module-level singleton
cghs_agent = CGHSProposalAgent()
