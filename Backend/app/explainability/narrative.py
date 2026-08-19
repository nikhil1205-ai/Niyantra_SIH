"""
explainability/narrative.py - Explainability Engine.

Generates human-readable explanations from the decision lineage.

No LLM used. All text is directly derived from lineage data.
Every explanation is 100% traceable to an actual recorded event.
"""
import json
from typing import List, Optional
from app.models.lineage import LineageRecord


def generate_narrative(records: List[LineageRecord]) -> str:
    """
    Generate a plain-English explanation of what happened to a case.
    
    Each sentence in the output maps to a specific lineage record.
    """
    if not records:
        return "No governance events have been recorded for this case yet."

    paragraphs: List[str] = []
    paragraphs.append("=== NIYANTRA Decision Explanation ===\n")

    for record in records:
        sentence = _explain_record(record)
        if sentence:
            paragraphs.append(f"[{record.timestamp.strftime('%H:%M:%S')}] {sentence}")

    paragraphs.append("\n=== End of Explanation ===")
    return "\n".join(paragraphs)


def _explain_record(record: LineageRecord) -> Optional[str]:
    """Convert a single lineage record into a sentence."""
    ev = record.event_type

    if ev == "case_created":
        return (
            f"Case {record.case_ref} was created. "
            f"Initial risk was not yet calculated."
        )

    elif ev == "risk_change":
        r_before = record.risk_before or 0
        r_after = record.risk_after or 0
        a_before = record.autonomy_before or "unknown"
        a_after = record.autonomy_after or "unknown"

        direction = "increased" if r_after > r_before else "decreased"
        reason = record.description or "new evidence was evaluated"

        text = (
            f"Risk {direction} from {r_before:.1f} to {r_after:.1f} because {reason}. "
            f"Autonomy level changed from {a_before} to {a_after}."
        )

        # Add human implication
        if a_after == "L0":
            text += " The system is now fully blocked — only human intervention is permitted."
        elif a_after == "L1":
            text += " The AI may only recommend actions; execution requires human decision."
        elif a_after == "L2":
            text += " Human approval is required before any sensitive action can execute."
        elif a_after == "L3":
            text += " The system can proceed autonomously with audit logging."
        elif a_after == "L4":
            text += " The system can proceed fully autonomously."

        return text

    elif ev == "evidence_added":
        ev_list = _parse_evidence(record.evidence)
        policy = record.policy_triggered
        parts = [f"New evidence added: {', '.join(ev_list) if ev_list else 'general evidence'}."]
        if policy:
            parts.append(f"Policy rule {policy} was triggered.")
        return " ".join(parts)

    elif ev == "proposal_created":
        return (
            f"AI agent proposed action '{record.action}' "
            f"(confidence visible in proposal record). "
            f"The proposal was handed to the Tool Gateway for authorization."
        )

    elif ev == "gateway_decision":
        outcome = record.outcome or "unknown"
        action = record.action or "unknown"
        level = record.autonomy_before or "unknown"

        if outcome == "allowed":
            return (
                f"Tool Gateway ALLOWED '{action}' execution at autonomy level {level}. "
                f"The action was dispatched to the CGHS system."
            )
        elif outcome == "blocked":
            return (
                f"Tool Gateway BLOCKED '{action}' execution. "
                f"Current autonomy level {level} does not permit this action. "
                f"The CGHS system was NOT contacted."
            )
        elif outcome == "pending_approval":
            return (
                f"Tool Gateway placed '{action}' in PENDING APPROVAL state. "
                f"Level {level} requires explicit human sign-off before execution."
            )
        else:
            return f"Gateway decision recorded: {outcome} for '{action}'."

    elif ev == "human_approval":
        return (
            f"Human operator approved action '{record.action}'. "
            f"Governance constraint satisfied — action may proceed."
        )

    elif ev == "status_change":
        return f"Case status changed to '{record.case_status}'. {record.description or ''}"

    else:
        return record.description


def _parse_evidence(evidence_json: Optional[str]) -> List[str]:
    """Parse the evidence JSON field from a lineage record."""
    if not evidence_json:
        return []
    try:
        return json.loads(evidence_json)
    except (json.JSONDecodeError, TypeError):
        return [str(evidence_json)]


def generate_summary(records: List[LineageRecord], current_risk: float, current_level: str) -> str:
    """
    Generate a short one-paragraph summary of the case governance state.
    Used in the /api/cases/{id} response field 'latest_decision'.
    """
    if not records:
        return "Case created. Awaiting evidence and risk assessment."

    # Find the most recent gateway decision
    gateway_decisions = [r for r in records if r.event_type == "gateway_decision"]
    if gateway_decisions:
        last = gateway_decisions[-1]
        outcome = last.outcome or "unknown"
        action = last.action or "unknown"
        if outcome == "allowed":
            return f"Last action '{action}' was executed successfully (Risk: {current_risk:.1f}, Level: {current_level})."
        elif outcome == "blocked":
            return f"Last action '{action}' was BLOCKED. Human review required (Risk: {current_risk:.1f}, Level: {current_level})."
        elif outcome == "pending_approval":
            return f"Awaiting human approval for '{action}' (Risk: {current_risk:.1f}, Level: {current_level})."

    # No gateway decisions yet
    if current_level in ("L0", "L1"):
        return f"High risk detected ({current_risk:.1f}). Human review required — autonomy level {current_level}."
    elif current_level == "L2":
        return f"Risk {current_risk:.1f} — human approval required for sensitive actions (Level: {current_level})."
    else:
        return f"Case under review. Risk: {current_risk:.1f}, Autonomy: {current_level}."
