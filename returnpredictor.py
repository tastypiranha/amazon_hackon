"""
Return Predictor Engine
========================
A static, rule-based heuristic model to predict the probability of a buyer returning an item
in the Amazon ReLife secondary marketplace. Based on Disposition Route (from image classifier),
Price Ratios, and Product Category.

Integrates with:
  - warehouse.py: Uses compute_dynamic_resale_price() for Amazon's predicted price (S_i)
  - decision_engine.py: Uses CONDITION_MULTIPLIERS for value adjustment context
  - main.py: Called via API endpoint for return risk assessment
"""

from warehouse import compute_dynamic_resale_price, CONDITION_MULTIPLIERS, data

# ============================================================================
# CONFIGURATION — Aligned with project's disposition routes & categories
# ============================================================================

# Base return probabilities based on disposition route (from image classifier)
# These reflect inherent return risk per condition type
ROUTE_BASE_PROBABILITIES = {
    "resell": 18.0,       # Base for resell — multiplied by ownership to get final range
    "refurbish": 14.0,    # Lower base — refurbished items have been QC'd
    "recycle": 8.0,       # Lowest — bought for parts, rarely returned
}

# Routes where return prediction does not apply (no buyer exists)
EXCLUDED_ROUTES = {"donate", "exchange"}

# Category-specific return risk multipliers
# Some categories have inherently higher return rates in secondary markets
CATEGORY_RISK_MULTIPLIERS = {
    "electrical_appliances": 1.3,   # Higher risk — electronics may malfunction
    "clothing": 1.5,                # Highest risk — fit/appearance issues common
    "household_utensils": 0.8,      # Lower risk — durable, less subjective
    "vehicle": 0.6,                 # Lowest risk — high-value considered purchase
}

# Price ratio thresholds for over/under pricing assessment
OVERPRICED_THRESHOLD = 1.2    # seller_price > 120% of Amazon predicted → buyer expects perfection
UNDERPRICED_THRESHOLD = 0.85  # seller_price < 85% of Amazon predicted → bargain, buyer more forgiving

# Ownership multipliers — the purchase channel is the primary risk driver
OWNERSHIP_MULTIPLIERS = {
    "amazon": 1.0,    # Amazon: 15-20% range
    "seller": 1.8,    # P2P: 25-35% range
    "exchange": 0.6,  # Exchange: 8-14% range
    "donate": 0.2,    # Donate: 0-5% range
}


def predict_return_probability(
    disposition_route: str,
    seller_price: float,
    category: str,
    location: str,
    ownership: str = "amazon"
) -> dict:
    """
    Predicts the probability of an item being returned by the buyer.

    Args:
        disposition_route: 'resell', 'refurbish', 'recycle', 'donate', or 'exchange'
                          (determined by image classifier at listing time)
        seller_price: The asking price set by the seller (₹)
        category: Product category ('electrical_appliances', 'clothing',
                  'household_utensils', 'vehicle')
        location: Warehouse/seller location ('delhi', 'mumbai', 'chennai',
                  'lucknow', 'kolkata', 'prayagraj')
        ownership: 'amazon' or 'seller' — who owns the product

    Returns:
        dict with return probability percentage, risk level, and breakdown
    """
    route = disposition_route.lower().strip()
    category = category.lower().strip()
    location = location.lower().strip()
    ownership = ownership.lower().strip()

    # 1. Exclusion Check — donate/exchange have no buyer, so no return risk
    if route in EXCLUDED_ROUTES:
        return {
            "return_probability": 0.0,
            "risk_level": "NONE",
            "reason": f"Route '{route}' has no buyer — return not applicable.",
            "disposition_route": route,
            "category": category,
            "location": location,
        }

    # 2. Base Probability by Disposition Route
    base_prob = ROUTE_BASE_PROBABILITIES.get(route, 12.0)

    # 3. Category Risk Multiplier
    category_mult = CATEGORY_RISK_MULTIPLIERS.get(category, 1.0)

    # 4. Price Expectation Multiplier
    # Use Amazon's dynamic resale price (S_i) as the fair market reference
    amazon_predicted_price, _ = compute_dynamic_resale_price(category, location, route)

    if amazon_predicted_price <= 0 or seller_price <= 0:
        # Fallback: no valid pricing data, use base * category only
        price_mult = 1.0
        price_assessment = "unknown"
    else:
        price_ratio = seller_price / amazon_predicted_price

        if price_ratio > OVERPRICED_THRESHOLD:
            price_mult = 1.2
            price_assessment = "overpriced"
        elif price_ratio < UNDERPRICED_THRESHOLD:
            price_mult = 0.8
            price_assessment = "bargain"
        else:
            price_mult = 1.0
            price_assessment = "fair"

    # 5. Ownership Multiplier
    ownership_mult = OWNERSHIP_MULTIPLIERS.get(ownership, 1.0)

    # 6. Demand Factor — high local demand means buyers are more intentional
    d_i = data["probabilities"].get(location, {}).get(category, 0.75)
    # High demand (>0.8) → slightly lower return risk; low demand → slightly higher
    demand_factor = 1.0 + (0.75 - d_i) * 0.3  # Range: ~0.85 to ~1.15

    # 7. Final Probability Calculation
    final_prob = base_prob * category_mult * price_mult * ownership_mult * demand_factor

    # Clamp to valid range
    final_prob = round(min(100.0, max(0.0, final_prob)), 2)

    # 8. Risk Level Classification
    if final_prob <= 15.0:
        risk_level = "LOW"
    elif final_prob <= 30.0:
        risk_level = "MODERATE"
    elif final_prob <= 45.0:
        risk_level = "HIGH"
    else:
        risk_level = "VERY_HIGH"

    return {
        "return_probability": final_prob,
        "risk_level": risk_level,
        "disposition_route": route,
        "category": category,
        "location": location.upper(),
        "ownership": ownership.upper(),
        "amazon_predicted_price": amazon_predicted_price,
        "seller_price": seller_price,
        "price_assessment": price_assessment,
        "condition_multiplier": CONDITION_MULTIPLIERS.get(route, 1.0),
        "breakdown": {
            "base_probability": base_prob,
            "category_multiplier": category_mult,
            "price_multiplier": price_mult,
            "ownership_multiplier": ownership_mult,
            "demand_factor": round(demand_factor, 3),
        },
    }


# ============================================================================
# CONVENIENCE FUNCTION — Quick risk check for the decision engine
# ============================================================================

def get_return_risk_score(
    disposition_route: str,
    seller_price: float,
    category: str,
    location: str,
    ownership: str = "amazon"
) -> float:
    """
    Simplified interface — returns just the probability as a float (0.0 to 100.0).
    Use this for quick checks in the decision pipeline.
    """
    result = predict_return_probability(
        disposition_route, seller_price, category, location, ownership
    )
    return result["return_probability"]


# ============================================================================
# DEMO
# ============================================================================

if __name__ == "__main__":
    import json

    print("=" * 60)
    print(" RETURN PREDICTOR — Amazon ReLife")
    print("=" * 60)

    # Scenario 1: Resell clothing in Delhi (Amazon-owned, fairly priced)
    result1 = predict_return_probability(
        disposition_route="resell",
        seller_price=100,
        category="clothing",
        location="delhi",
        ownership="amazon"
    )
    print("\n[1] Resell Clothing — Delhi (Amazon-owned, ₹100):")
    print(json.dumps(result1, indent=2))

    # Scenario 2: Refurbished electronics in Mumbai (seller-owned, overpriced)
    result2 = predict_return_probability(
        disposition_route="refurbish",
        seller_price=250,
        category="electrical_appliances",
        location="mumbai",
        ownership="seller"
    )
    print("\n[2] Refurbish Electronics — Mumbai (Seller-owned, ₹250):")
    print(json.dumps(result2, indent=2))

    # Scenario 3: Recycle vehicle in Kolkata (Amazon-owned, bargain)
    result3 = predict_return_probability(
        disposition_route="recycle",
        seller_price=500,
        category="vehicle",
        location="kolkata",
        ownership="amazon"
    )
    print("\n[3] Recycle Vehicle — Kolkata (Amazon-owned, ₹500):")
    print(json.dumps(result3, indent=2))

    # Scenario 4: Donate — should return 0
    result4 = predict_return_probability(
        disposition_route="donate",
        seller_price=0,
        category="household_utensils",
        location="prayagraj",
        ownership="seller"
    )
    print("\n[4] Donate Household — Prayagraj:")
    print(json.dumps(result4, indent=2))

    # Scenario 5: Exchange — should return 0
    result5 = predict_return_probability(
        disposition_route="exchange",
        seller_price=0,
        category="clothing",
        location="lucknow",
        ownership="seller"
    )
    print("\n[5] Exchange Clothing — Lucknow:")
    print(json.dumps(result5, indent=2))
