"""
Return Predictor Engine
========================
A static, rule-based heuristic model to predict the probability of a buyer returning an item
in the secondary market. Based on Item Grade, Price Ratios, and Disposition Route.
"""

# Base return probabilities based purely on physical condition
GRADE_BASE_PROBABILITIES = {
    "like new": 5.0,   # 5% base risk
    "good": 12.0,      # 12% base risk
    "fair": 25.0,      # 25% base risk
    "poor": 40.0       # 40% base risk
}

# Routes where price/buyer remorse does not apply
EXCLUDED_ROUTES = {"donate", "exchange"}

# Multipliers based on the type of sale
ROUTE_MULTIPLIERS = {
    "resell": 1.0,      # Standard risk
    "refurbish": 0.8,   # Slightly safer (QC done)
    "recycle": 0.2      # Bought for parts/scrap (very low return risk)
}

def predict_return_probability(
    disposition_route: str,
    amazon_predicted_price: float,
    seller_set_price: float,
    grade: str
) -> float:
    """
    Predicts the probability of an item being returned by the buyer (0.0 to 100.0).

    Args:
        disposition_route: e.g., 'resell', 'refurbish', 'donate', 'exchange', 'recycle'
        amazon_predicted_price: Fair market value as predicted by Amazon
        seller_set_price: The asking price set by the seller
        grade: Item condition ("like new", "good", "fair", "poor")
        
    Returns:
        float: Percentage probability of return (e.g., 15.5)
    """
    route = disposition_route.lower().strip()
    
    # 1. Exclusion Check
    if route in EXCLUDED_ROUTES:
        return 0.0

    # 2. Base Probability by Grade
    grade_key = grade.lower().strip()
    base_prob = GRADE_BASE_PROBABILITIES.get(grade_key, 15.0) # Default to 15% if unknown grade

    # If prices are 0 or invalid, we just return the base probability with route multiplier
    if amazon_predicted_price <= 0 or seller_set_price < 0:
        route_multiplier = ROUTE_MULTIPLIERS.get(route, 1.0)
        return round(min(100.0, max(0.0, base_prob * route_multiplier)), 2)

    # 3. Price Expectation Multiplier
    price_ratio = seller_set_price / amazon_predicted_price
    
    if price_ratio > 1.2:
        # Overpriced: Buyer expects perfection, high risk of remorse
        multiplier = 1.5
    elif price_ratio < 0.9:
        # Underpriced (Bargain): Buyer is forgiving of flaws
        multiplier = 0.6
    else:
        # Fairly Priced: Standard risk
        multiplier = 1.0
        
    interim_prob = base_prob * multiplier
    
    # 4. Route Multiplier
    route_multiplier = ROUTE_MULTIPLIERS.get(route, 1.0)
    final_prob = interim_prob * route_multiplier
    
    # Ensure it stays within valid bounds
    return round(min(100.0, max(0.0, final_prob)), 2)
