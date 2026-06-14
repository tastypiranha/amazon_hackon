import json
from dataclasses import dataclass, replace
from typing import Tuple, Dict, Any
from datetime import datetime, timedelta

# ============================================================================
# RE-CIRC OS - Green Engine ("Karma Engine")
# ============================================================================
# Handles all Gamification, Carbon Tracking, and Eco-Score Logic
# Strictly decoupled from the financial math of decision_engine.py
# ============================================================================

# ─── DATA CONTRACT ────────────────────────────────────────────────────────
@dataclass
class TransactionDTO:
    category: str
    is_local_p2p: bool
    disposition_route: str          # 'donate', 'exchange', 'recycle', 'refurbish', 'resell'
    condition_delta_percentage: float # e.g., 20.0 for 20% depreciation
    logistics_fee: float            # Required shipping fee

@dataclass
class EscrowRecord:
    status: str  # "PENDING" | "AVAILABLE" | "VOIDED"
    points: int
    transaction_date: datetime
    unlock_date: datetime
    days_until_unlock: int

# ─── CONSTANTS ─────────────────────────────────────────────────────────────
# 1 kg CO2 saved = 10 Green Points
# Average CO2 savings by category (in kg) * 10
CATEGORY_BASE_POINTS = {
    "laptops": 1500,               # ~150kg CO2 saved
    "phones": 800,                 # ~80kg CO2 saved
    "electrical_appliances": 1200, # ~120kg CO2 saved
    "wearables": 300,              # ~30kg CO2 saved
    "audio": 400,                  # ~40kg CO2 saved
    "cameras": 1000,               # ~100kg CO2 saved
    "clothing": 150,               # ~15kg CO2 saved
    "vehicle": 5000,               # ~500kg CO2 saved
    "household_utensils": 200,     # ~20kg CO2 saved
}

# Hierarchy of sustainable outcomes
DISPOSITION_MULTIPLIERS = {
    "donate": 3.0,
    "exchange": 2.0,
    "recycle": 2.0,
    "refurbish": 1.5,
    "resell": 1.0
}

# Return window duration (Escrow period before points unlock)
RETURN_WINDOWS_DAYS = {
    "laptops": 7,
    "phones": 7,
    "electrical_appliances": 7,
    "wearables": 7,
    "audio": 7,
    "cameras": 7,
    "clothing": 15,
    "household_utensils": 15,
    "vehicle": 0, # Final sale
}

PROXIMITY_BONUS = 500
POINTS_PER_RUPEE = 10  # 10 points = Rs 1
MAX_DAMAGE_PENALTY_POINTS = 10_000  # 100% damage = -10,000 pts

# ─── CORE LOGIC ────────────────────────────────────────────────────────────

def calculate_co2_savings(dto: TransactionDTO) -> int:
    """Calculates baseline Green Points for a transaction based on carbon footprint."""
    cat = dto.category.lower()
    if cat not in CATEGORY_BASE_POINTS:
        raise ValueError(f"Unknown category: '{cat}'. Cannot calculate CO2 savings.")
        
    base_points = CATEGORY_BASE_POINTS[cat]
    
    if dto.is_local_p2p:
        base_points += PROXIMITY_BONUS
        
    return base_points


def calculate_disposition_reward(dto: TransactionDTO, base_points: int) -> int:
    """Multiplies points based on how circular the final routing outcome was."""
    multiplier = DISPOSITION_MULTIPLIERS.get(dto.disposition_route.lower(), 1.0)
    return int(base_points * multiplier)


def process_transaction_points(dto: TransactionDTO, points: int, transaction_date: datetime) -> EscrowRecord:
    """
    Places points in escrow until the category's return window expires.
    """
    cat = dto.category.lower()
    if cat not in RETURN_WINDOWS_DAYS:
        raise ValueError(f"Unknown category: '{cat}'. Cannot determine return window.")
        
    days = RETURN_WINDOWS_DAYS[cat]
    unlock_date = transaction_date + timedelta(days=days)
    
    return EscrowRecord(
        status="PENDING",
        points=points,
        transaction_date=transaction_date,
        unlock_date=unlock_date,
        days_until_unlock=days
    )


def unlock_escrow(record: EscrowRecord, as_of: datetime) -> EscrowRecord:
    """Transitions an escrow record from PENDING to AVAILABLE if the lock period has expired."""
    if record.status == "PENDING" and as_of >= record.unlock_date:
        return replace(record, status="AVAILABLE")
    return record


def calculate_damage_penalty(dto: TransactionDTO) -> int:
    """
    Penalizes a user's Eco-Score for returning an item in worse condition.
    E.g. a 20.0% depreciation -> 20.0/100 * 10000 = -2000 points
    """
    if dto.condition_delta_percentage <= 0:
        return 0
        
    return -int((dto.condition_delta_percentage / 100) * MAX_DAMAGE_PENALTY_POINTS)


def apply_fee_waiver(current_points: int, required_fee: float) -> Tuple[int, float]:
    """
    Burns points to zero-out logistics fees. Handles partial burns if points are insufficient.
    Returns: (points_burned, remaining_fee_to_pay)
    """
    if required_fee <= 0:
        return (0, 0.0)
        
    # How many points needed to fully cover the fee?
    points_required = int(required_fee * POINTS_PER_RUPEE)
    
    if current_points >= points_required:
        # Full burn
        return (points_required, 0.0)
    else:
        # Partial burn
        points_burned = current_points
        value_covered = points_burned / POINTS_PER_RUPEE
        remaining_fee = round(required_fee - value_covered, 2)
        return (points_burned, remaining_fee)


# ============================================================================
# VERIFICATION SUITE
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print(" RE-CIRC OS: GREEN ENGINE VERIFICATION SUITE")
    print("="*60)

    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 1] The Normal Purchase & Escrow")
    print("Scenario: User buys a laptop via Local P2P.")
    
    dto1 = TransactionDTO(
        category="laptops",
        is_local_p2p=True,
        disposition_route="resell",
        condition_delta_percentage=0.0,
        logistics_fee=0.0
    )
    
    today = datetime.now()
    base_pts = calculate_co2_savings(dto1)
    final_pts = calculate_disposition_reward(dto1, base_pts)
    escrow = process_transaction_points(dto1, final_pts, today)
    
    print(f"  -> Generated {final_pts} pts (Base + Local Bonus)")
    print(f"  -> Escrow State: {escrow.status}")
    print(f"  -> Unlock Date: {escrow.unlock_date.isoformat()} ({escrow.days_until_unlock} days)")
    
    # Fast forward time simulation
    future_date = today + timedelta(days=8)
    escrow = unlock_escrow(escrow, as_of=future_date)
    print(f"  -> (Simulating day 8) Escrow unlock evaluated. Status: {escrow.status}")


    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 2] The Fraud Return & Damage Penalty")
    print("Scenario: User returns clothing on day 3 with 15% new damage.")
    
    dto2 = TransactionDTO(
        category="clothing",
        is_local_p2p=False,
        disposition_route="recycle", # So damaged it got recycled
        condition_delta_percentage=15.0,
        logistics_fee=0.0
    )
    
    return_date = today + timedelta(days=3)
    # Validate it was within window
    escrow_days = RETURN_WINDOWS_DAYS.get(dto2.category, 7)
    if (return_date - today).days <= escrow_days:
        # In a real app, there would be a void_escrow() function. Simulating:
        escrow = replace(escrow, status="VOIDED")
        print("  -> Item returned within window. Pending points VOIDED.")
    
    penalty = calculate_damage_penalty(dto2)
    print(f"  -> Damage Detected: {dto2.condition_delta_percentage}%")
    print(f"  -> Eco-Score Penalty Applied: {penalty} points")


    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 3] The Partial Fee Waiver Edge Case")
    print("Scenario: User has 800 available points. Logistics fee is Rs 150.")
    
    current_points = 800
    fee = 150.0
    
    burned, remainder = apply_fee_waiver(current_points, fee)
    print(f"  -> Starting Points: {current_points}")
    print(f"  -> Target Fee: Rs {fee}")
    print(f"  -> Points Burned: {burned}")
    print(f"  -> Remaining Fee to Pay: Rs {remainder}")
    
    if abs(remainder - 70.0) < 0.01 and burned == 800:
        print("  [OK] Partial burn calculated perfectly.")

    print("\n" + "="*60 + "\n")
