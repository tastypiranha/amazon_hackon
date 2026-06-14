import json
from dataclasses import dataclass
from typing import Dict, Any

# ============================================================================
# AMAZON RELIFE - Trust Engine ("Amazon ReLife Trust Index")
# ============================================================================
# Computes a 0-100 reputation score used exclusively as a public social signal
# to facilitate safe Peer-to-Peer (P2P) trading.
# NOTE: This score carries ZERO financial incentive (no fee waivers/refunds).
# ============================================================================

# ─── DATA CONTRACT ────────────────────────────────────────────────────────
@dataclass
class TrustProfileDTO:
    lifetime_green_points: int
    total_listings: int
    accurate_condition_listings: int # Listings where AI/Buyer agreed with Seller's condition
    total_returns: int
    damaged_returns: int             # Returns that triggered a Green Point penalty
    p2p_scheduled: int
    p2p_completed: int               # Did not ghost/cancel

# ─── CONSTANTS ─────────────────────────────────────────────────────────────

# Pillar Weights
WEIGHT_HONESTY = 0.40      # Condition accuracy is paramount
WEIGHT_CARE = 0.30         # Not damaging returned items
WEIGHT_RELIABILITY = 0.20  # Showing up to P2P meets
WEIGHT_ECO = 0.10          # Consistent platform participation

# Baselines
BASE_TRUST_SCORE = 50.0
MAX_ECO_POINTS_THRESHOLD = 10000  # Cap eco score scaling at 10,000 points

# ─── CORE LOGIC ────────────────────────────────────────────────────────────

def calculate_trust_index(profile: TrustProfileDTO) -> float:
    """
    Computes the 0-100 Amazon ReLife Trust Index based on four behavioral pillars.
    Gracefully handles new users with zero history by defaulting to BASE_TRUST_SCORE.
    """
    # 1. Honesty Metric (Condition Accuracy)
    if profile.total_listings == 0:
        honesty_score = 100.0  # Benefit of the doubt for new sellers
    else:
        honesty_score = (profile.accurate_condition_listings / profile.total_listings) * 100.0

    # 2. Care Metric (Return Integrity)
    if profile.total_returns == 0:
        care_score = 100.0
    else:
        damage_rate = profile.damaged_returns / profile.total_returns
        care_score = max(0.0, (1.0 - damage_rate) * 100.0)

    # 3. Reliability Metric (P2P Completion)
    if profile.p2p_scheduled == 0:
        reliability_score = 100.0
    else:
        reliability_score = (profile.p2p_completed / profile.p2p_scheduled) * 100.0

    # 4. Eco Metric (Green Point History)
    eco_ratio = min(1.0, profile.lifetime_green_points / MAX_ECO_POINTS_THRESHOLD)
    eco_score = eco_ratio * 100.0

    # Check if user is completely brand new (no activity whatsoever)
    if (profile.total_listings == 0 and 
        profile.total_returns == 0 and 
        profile.p2p_scheduled == 0 and 
        profile.lifetime_green_points == 0):
        return BASE_TRUST_SCORE

    # Calculate weighted sum
    final_score = (
        (honesty_score * WEIGHT_HONESTY) +
        (care_score * WEIGHT_CARE) +
        (reliability_score * WEIGHT_RELIABILITY) +
        (eco_score * WEIGHT_ECO)
    )

    return round(final_score, 1)


def apply_benefit_of_doubt(profile: TrustProfileDTO) -> bool:
    """
    Checks if a trusted user is eligible to have a minor damage penalty forgiven.
    Only applies to Exceptional users (Score >= 90.0).
    """
    score = calculate_trust_index(profile)
    return score >= 90.0


def execute_fraud_conviction(profile: TrustProfileDTO) -> float:
    """
    Called by warehouse staff after a manual review confirms a Grade D swap/destruction.
    Hard-resets the user's score to 0.0 (Blacklisted), overriding all math.
    """
    # In a real system, this would write a permanent 'BANNED' flag to the database.
    # For the engine math, it forces a 0.0 return.
    return 0.0


def get_trust_badge(score: float) -> str:
    """Returns a UI-friendly categorical string for the frontend."""
    if score >= 90.0:
        return "Exceptional"
    elif score >= 75.0:
        return "Highly Trusted"
    elif score >= 50.0:
        return "Neutral"
    else:
        return "Caution"


# ============================================================================
# VERIFICATION SUITE
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print(" AMAZON RELIFE: TRUST ENGINE VERIFICATION SUITE")
    print("="*60)

    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 1] The Perfect Citizen")
    print("Scenario: Accurate listings, no damaged returns, perfect P2P, high eco.")
    
    dto1 = TrustProfileDTO(
        lifetime_green_points=15000, # Over the max threshold
        total_listings=10,
        accurate_condition_listings=10,
        total_returns=4,
        damaged_returns=0,
        p2p_scheduled=5,
        p2p_completed=5
    )
    
    score1 = calculate_trust_index(dto1)
    badge1 = get_trust_badge(score1)
    print(f"  -> Calculated Score: {score1}/100")
    print(f"  -> Display Badge:    [{badge1}]")


    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 2] The Brand New User")
    print("Scenario: Completely blank history (all zeroes).")
    
    dto2 = TrustProfileDTO(
        lifetime_green_points=0,
        total_listings=0,
        accurate_condition_listings=0,
        total_returns=0,
        damaged_returns=0,
        p2p_scheduled=0,
        p2p_completed=0
    )
    
    score2 = calculate_trust_index(dto2)
    badge2 = get_trust_badge(score2)
    print(f"  -> Calculated Score: {score2}/100")
    print(f"  -> Display Badge:    [{badge2}]")


    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 3] The Scammer")
    print("Scenario: Lies about condition (2/10), damages returns (3/3), ghosts P2P (0/2).")
    
    dto3 = TrustProfileDTO(
        lifetime_green_points=500, # Some minor points
        total_listings=10,
        accurate_condition_listings=2, # Very dishonest
        total_returns=3,
        damaged_returns=3,             # Very careless
        p2p_scheduled=2,
        p2p_completed=0                # Unreliable
    )
    
    score3 = calculate_trust_index(dto3)
    badge3 = get_trust_badge(score3)
    print(f"  -> Calculated Score: {score3}/100")
    print(f"  -> Display Badge:    [{badge3}]")


    # ───────────────────────────────────────────────────────────────────────
    print("\n[TEST 4] Benefit of the Doubt & Fraud Conviction")
    
    is_forgiven = apply_benefit_of_doubt(dto1) # Perfect citizen
    print(f"  -> Perfect Citizen Eligible for Benefit of Doubt: {is_forgiven}")
    
    banned_score = execute_fraud_conviction(dto3)
    print(f"  -> Scammer Caught Swapping Item! New Score: {banned_score}/100 (BANNED)")

    print("\n" + "="*60 + "\n")
