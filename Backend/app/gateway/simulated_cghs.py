"""
gateway/simulated_cghs.py - Fake CGHS System.

This simulates the real CGHS backend that the Tool Gateway calls
when an action is ALLOWED.

When the Gateway BLOCKS an action, this module is NEVER called.
This is verified by tests.

In a real deployment, this would be replaced with actual CGHS API calls.
"""
from typing import Dict, Any
from datetime import datetime


class SimulatedCGHSSystem:
    """
    Simulates the CGHS government system.
    
    Tracks which operations have been executed so tests can verify
    that blocked actions NEVER reach this system.
    """

    def __init__(self):
        # In-memory log of executed operations for verification
        self._execution_log: list[Dict[str, Any]] = []

    def _record(self, operation: str, case_ref: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Record an executed operation in the log."""
        record = {
            "operation": operation,
            "case_ref": case_ref,
            "payload": payload,
            "executed_at": datetime.utcnow().isoformat(),
            "cghs_ref": f"CGHS-{operation.upper()}-{case_ref}-{len(self._execution_log)+1:04d}",
        }
        self._execution_log.append(record)
        return record

    def verify_beneficiary(self, case_ref: str, beneficiary_id: str) -> Dict[str, Any]:
        """Simulate beneficiary verification against CGHS records."""
        result = self._record(
            "verify_beneficiary",
            case_ref,
            {"beneficiary_id": beneficiary_id},
        )
        return {
            **result,
            "verified": True,
            "cghs_status": "active",
            "message": f"Beneficiary {beneficiary_id} verified in CGHS registry.",
        }

    def check_rate(self, case_ref: str, procedure_code: str, claimed_amount: float, approved_rate: float) -> Dict[str, Any]:
        """Simulate rate check against CGHS schedule."""
        result = self._record(
            "check_rate",
            case_ref,
            {"procedure_code": procedure_code, "claimed_amount": claimed_amount, "approved_rate": approved_rate},
        )
        within_rate = claimed_amount <= approved_rate
        return {
            **result,
            "within_rate": within_rate,
            "approved_rate": approved_rate,
            "claimed_amount": claimed_amount,
            "message": (
                f"Rate check for {procedure_code}: "
                + ("within approved limit." if within_rate else f"EXCEEDS approved rate by ₹{claimed_amount - approved_rate:,.0f}.")
            ),
        }

    def submit_claim(self, case_ref: str, amount: float) -> Dict[str, Any]:
        """Simulate claim submission to CGHS."""
        result = self._record(
            "submit_claim",
            case_ref,
            {"amount": amount},
        )
        return {
            **result,
            "submitted": True,
            "message": f"Claim for ₹{amount:,.0f} submitted to CGHS for case {case_ref}.",
        }

    def execute_settlement(self, case_ref: str, amount: float) -> Dict[str, Any]:
        """
        Simulate final settlement execution in CGHS.
        
        This is the most sensitive operation - high impact, low reversibility.
        The Gateway will only call this for L3/L4 cases.
        """
        result = self._record(
            "execute_settlement",
            case_ref,
            {"amount": amount},
        )
        return {
            **result,
            "settled": True,
            "settlement_amount": amount,
            "message": f"Settlement of ₹{amount:,.0f} executed for case {case_ref}.",
        }

    def get_execution_log(self) -> list[Dict[str, Any]]:
        """Return the execution log (for tests and debugging)."""
        return list(self._execution_log)

    def was_operation_called(self, operation: str, case_ref: str) -> bool:
        """Check whether a specific operation was ever executed for a case."""
        return any(
            r["operation"] == operation and r["case_ref"] == case_ref
            for r in self._execution_log
        )

    def reset(self) -> None:
        """Clear the execution log (used by demo reset endpoint)."""
        self._execution_log.clear()


# Module-level singleton - the one and only simulated CGHS system
simulated_cghs = SimulatedCGHSSystem()
