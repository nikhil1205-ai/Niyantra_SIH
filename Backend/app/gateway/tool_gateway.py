"""
gateway/tool_gateway.py - The NIYANTRA Tool Gateway.

This is the ONLY component that can execute actions against the CGHS system.
Before EVERY execution it:

  1. Receives the proposal
  2. Reads the CURRENT case state from the database
  3. Asks the Autonomy Controller for the CURRENT autonomy level
  4. Compares the proposed action against what's allowed
  5. Executes OR blocks
  6. Writes a lineage record

CRITICAL: The Gateway NEVER uses a cached authorization.
          It always re-reads the current risk score from the database
          and re-evaluates through the Autonomy Controller.

This means that if new evidence arrives between a proposal and execution,
the Gateway will catch the changed autonomy level and block accordingly.
This is the "dynamic authority revocation" that NIYANTRA demonstrates.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

from sqlmodel import Session

from app.models.case import Case
from app.models.proposal import Proposal
from app.autonomy.controller import determine_autonomy_level, can_execute
from app.gateway.simulated_cghs import simulated_cghs
from app.lineage.store import append_lineage


@dataclass
class GatewayResult:
    """Result returned by the Tool Gateway after processing a proposal."""
    status: str              # "allowed", "blocked", "pending_approval"
    reason: str
    risk_score: float
    autonomy_level: str
    cghs_response: Optional[Dict[str, Any]] = None


def process_proposal(
    proposal: Proposal,
    case: Case,
    session: Session,
) -> GatewayResult:
    """
    The main Gateway entry point.
    
    Always reads CURRENT case state. Never trusts old authorization.
    
    Steps:
    1. Re-read the current risk score from the Case (already done by caller,
       but we use what's in `case` which the caller just fetched fresh).
    2. Ask Autonomy Controller for the CURRENT level.
    3. Check if action is permitted.
    4. Execute or block.
    5. Write lineage.
    6. Return result.
    """
    action_type = proposal.action_type

    # ── Step 2: Ask Autonomy Controller for CURRENT level ─────────────────────
    # We derive it fresh from the CURRENT risk score - never from a stored level.
    current_risk = case.risk_score
    current_level = determine_autonomy_level(current_risk)

    # ── Step 3: L2 special case - settlement/claim_submit need human approval ───
    # L2 is between "allowed" and "blocked". The action is not forbidden,
    # but it requires explicit human sign-off before execution.
    # This check must come BEFORE can_execute() since can_execute blocks L2 settlement.
    if current_level == "L2" and action_type in ("settlement", "claim_submit", "update_status"):
        pending_reason = (
            f"Autonomy level {current_level} requires explicit human approval "
            f"before '{action_type}' can execute. Use POST /api/cases/{{case_id}}/approve."
        )
        _write_gateway_lineage(
            proposal=proposal,
            case=case,
            current_risk=current_risk,
            current_level=current_level,
            outcome="pending_approval",
            reason=pending_reason,
            session=session,
        )
        return GatewayResult(
            status="pending_approval",
            reason=pending_reason,
            risk_score=current_risk,
            autonomy_level=current_level,
        )

    # ── Step 4: Check if action is permitted at current level ─────────────────
    allowed, reason = can_execute(current_level, action_type)

    if not allowed:
        # ── BLOCKED ────────────────────────────────────────────────────────────
        # The simulated CGHS system is NEVER called when blocked.
        _write_gateway_lineage(
            proposal=proposal,
            case=case,
            current_risk=current_risk,
            current_level=current_level,
            outcome="blocked",
            reason=reason,
            session=session,
        )
        return GatewayResult(
            status="blocked",
            reason=reason,
            risk_score=current_risk,
            autonomy_level=current_level,
        )

    # ── Step 5: EXECUTE ────────────────────────────────────────────────────────
    cghs_response = _dispatch_to_cghs(action_type, case)

    _write_gateway_lineage(
        proposal=proposal,
        case=case,
        current_risk=current_risk,
        current_level=current_level,
        outcome="allowed",
        reason=reason,
        session=session,
    )

    return GatewayResult(
        status="allowed",
        reason=reason,
        risk_score=current_risk,
        autonomy_level=current_level,
        cghs_response=cghs_response,
    )


def _dispatch_to_cghs(action_type: str, case: Case) -> Dict[str, Any]:
    """
    Call the appropriate simulated CGHS operation.
    
    Only called when Gateway has determined the action is ALLOWED.
    """
    if action_type == "verify_beneficiary":
        return simulated_cghs.verify_beneficiary(case.case_ref, case.beneficiary_id)
    elif action_type == "check_rate":
        return simulated_cghs.check_rate(
            case.case_ref, case.procedure_code, case.claimed_amount, case.approved_rate
        )
    elif action_type == "claim_submit":
        return simulated_cghs.submit_claim(case.case_ref, case.claimed_amount)
    elif action_type == "settlement":
        return simulated_cghs.execute_settlement(case.case_ref, case.claimed_amount)
    elif action_type in ("read_case", "update_status"):
        # Lightweight operations - just acknowledge
        return {"operation": action_type, "case_ref": case.case_ref, "acknowledged": True}
    else:
        return {"operation": action_type, "case_ref": case.case_ref, "note": "unknown action type"}


def _write_gateway_lineage(
    proposal: Proposal,
    case: Case,
    current_risk: float,
    current_level: str,
    outcome: str,
    reason: str,
    session: Session,
) -> None:
    """Write the gateway decision to the lineage store."""
    append_lineage(
        session=session,
        case_ref=case.case_ref,
        event_type="gateway_decision",
        risk_before=current_risk,
        risk_after=current_risk,
        autonomy_before=current_level,
        autonomy_after=current_level,
        case_status=case.case_status,
        action=proposal.action_type,
        outcome=outcome,
        description=reason,
    )
