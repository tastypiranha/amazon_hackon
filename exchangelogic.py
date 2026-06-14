import json
from warehouse import data, compute_dynamic_resale_price, CONDITION_MULTIPLIERS

# ============================================================================
# EXCHANGE MODULE - Smart Circular Commerce Ecosystem
# ============================================================================
# When warehouse engine suggests EXCHANGE to a seller:
#   1. Amazon calculates the item's value (S_i at seller's location with condition)
#   2. Seller sees a nationwide list of items with similar Amazon-calculated values
#   3. Seller picks an item they want to exchange with
#   4. Other party (Party B) gets notified of the exchange offer
#   5. If Party B accepts → exchange happens
#   6. Delivery options:
#      - Same location + manual exchange: ₹0 (no Amazon involvement)
#      - Same location + Amazon handles: both pay 1x processing fee each
#      - Different locations + Amazon handles: both pay origin processing +
#        transit + destination processing (each direction)
# ============================================================================

# Simulated exchange marketplace (items listed by other sellers nationwide)
# In production this would be a database query
EXCHANGE_MARKETPLACE = [
    {"id": 1, "owner": "Party_B1", "location": "mumbai", "category": "clothing", "condition": "resell", "description": "Denim jacket, size M"},
    {"id": 2, "owner": "Party_B2", "location": "delhi", "category": "electrical_appliances", "condition": "refurbish", "description": "Bluetooth speaker, needs new battery"},
    {"id": 3, "owner": "Party_B3", "location": "chennai", "category": "household_utensils", "condition": "resell", "description": "Stainless steel pressure cooker"},
    {"id": 4, "owner": "Party_B4", "location": "kolkata", "category": "clothing", "condition": "resell", "description": "Cotton kurta set, unused"},
    {"id": 5, "owner": "Party_B5", "location": "delhi", "category": "clothing", "condition": "refurbish", "description": "Leather belt, minor scratches"},
    {"id": 6, "owner": "Party_B6", "location": "lucknow", "category": "electrical_appliances", "condition": "resell", "description": "USB-C charger, working"},
    {"id": 7, "owner": "Party_B7", "location": "prayagraj", "category": "vehicle", "condition": "refurbish", "description": "Bicycle, needs new tires"},
    {"id": 8, "owner": "Party_B8", "location": "mumbai", "category": "household_utensils", "condition": "resell", "description": "Iron kadai, good condition"},
]

# How close the values need to be for a valid exchange match (±percentage)
VALUE_MATCH_TOLERANCE = 0.30  # 30% tolerance


def compute_item_value(location, category, condition):
    """Compute Amazon's calculated value for an item (S_i at its location)."""
    s_i, _ = compute_dynamic_resale_price(category, location, condition)
    return s_i


def find_exchange_matches(seller_item_value):
    """
    Find items in the marketplace whose Amazon-calculated value is similar
    to the seller's item value (within tolerance).
    """
    matches = []
    for item in EXCHANGE_MARKETPLACE:
        item_value = compute_item_value(item["location"], item["category"], item["condition"])
        diff_pct = abs(item_value - seller_item_value) / seller_item_value if seller_item_value > 0 else 1

        if diff_pct <= VALUE_MATCH_TOLERANCE:
            matches.append({
                **item,
                "amazon_value": item_value,
                "value_difference": round(item_value - seller_item_value, 2),
                "difference_pct": round(diff_pct * 100, 1),
            })

    # Sort by closest value match
    matches.sort(key=lambda x: abs(x["value_difference"]))
    return matches


def compute_exchange_costs(party_a_loc, party_b_loc):
    """
    Compute delivery costs for an exchange between two parties.

    Returns costs for EACH party (both need to send their item to the other).

    Rules:
      - Same location + manual: ₹0 for both
      - Same location + Amazon handles: 1x processing fee each
      - Different locations: origin processing + transit + destination processing (each)
    """
    party_a_loc = party_a_loc.lower()
    party_b_loc = party_b_loc.lower()

    r_a = data["processing_fees"][party_a_loc]
    r_b = data["processing_fees"][party_b_loc]

    if party_a_loc == party_b_loc:
        # Same city
        return {
            "same_location": True,
            "option_manual": {
                "party_a_pays": 0,
                "party_b_pays": 0,
                "amazon_earns": 0,
                "method": "Both parties meet and exchange manually",
            },
            "option_amazon_handles": {
                "party_a_pays": r_a,
                "party_b_pays": r_b,
                "amazon_earns": r_a + r_b,
                "method": "Amazon picks up from both, delivers to each",
                "breakdown_a": f"Processing fee: ₹{r_a}",
                "breakdown_b": f"Processing fee: ₹{r_b}",
            },
        }
    else:
        # Different cities — each party sends to the other
        tc_a_to_b = data["transportation_matrix"][party_a_loc][party_b_loc]
        tc_b_to_a = data["transportation_matrix"][party_b_loc][party_a_loc]

        # Party A sends item to Party B: A's processing + transit A→B + B's processing
        cost_a = r_a + tc_a_to_b + r_b
        # Party B sends item to Party A: B's processing + transit B→A + A's processing
        cost_b = r_b + tc_b_to_a + r_a

        return {
            "same_location": False,
            "option_manual": {
                "note": "Manual exchange not possible — different cities",
            },
            "option_amazon_handles": {
                "party_a_pays": cost_a,
                "party_b_pays": cost_b,
                "amazon_earns": cost_a + cost_b,
                "method": "Amazon handles both shipments",
                "breakdown_a": f"Origin ₹{r_a} + Transit ₹{tc_a_to_b} + Dest ₹{r_b} = ₹{cost_a}",
                "breakdown_b": f"Origin ₹{r_b} + Transit ₹{tc_b_to_a} + Dest ₹{r_a} = ₹{cost_b}",
            },
        }


def initiate_exchange(seller_loc, category, condition, seller_price):
    """
    Full exchange flow triggered when warehouse engine suggests exchange.

    Args:
        seller_loc: Seller's location (Party A)
        category: Product category
        condition: Condition determined by classifier (resell/refurbish/recycle)
        seller_price: Seller's original asking price (NOT used for matching —
                      Amazon's calculated value is used instead)
    """
    seller_loc = seller_loc.lower()
    category = category.lower()
    condition = condition.lower()

    # Step 1: Amazon calculates the item's actual value
    item_value = compute_item_value(seller_loc, category, condition)

    print(f"\n{'='*60}")
    print(f" EXCHANGE INITIATED")
    print(f"{'='*60}")
    print(f" Seller (Party A) Location: {seller_loc.upper()}")
    print(f" Category:                  {category.upper()}")
    print(f" Condition:                 {condition.upper()}")
    print(f" Seller's Asking Price:     ₹{seller_price}")
    print(f" Amazon Calculated Value:   ₹{item_value}  ← used for matching")
    print(f" Match Tolerance:           ±{int(VALUE_MATCH_TOLERANCE*100)}%")
    print(f"{'='*60}")

    # Step 2: Find matching items nationwide
    matches = find_exchange_matches(item_value)

    print(f"\n Found {len(matches)} exchange matches (nationwide):")
    print(f"{'─'*60}")
    for i, m in enumerate(matches, 1):
        print(f"  {i}. [{m['owner']}] {m['description']}")
        print(f"     Location: {m['location'].upper()} | Value: ₹{m['amazon_value']} | Diff: {m['difference_pct']}%")
    print(f"{'─'*60}")

    if not matches:
        return {
            "decision": "NO EXCHANGE MATCHES",
            "action": "No items found with similar value. Seller can wait or relist.",
            "seller_item_value": item_value,
            "matches_found": 0,
        }

    # Step 3: Show exchange costs for each match
    exchange_options = []
    for m in matches:
        costs = compute_exchange_costs(seller_loc, m["location"])
        exchange_options.append({
            "match": m,
            "costs": costs,
        })

    # Step 4: Demo — assume seller picks the first match
    selected = exchange_options[0]
    selected_match = selected["match"]
    selected_costs = selected["costs"]

    print(f"\n Seller selects: {selected_match['description']} (from {selected_match['owner']})")
    print(f" Party B Location: {selected_match['location'].upper()}")
    print(f"{'─'*60}")

    if selected_costs["same_location"]:
        print(f" SAME CITY — Two options:")
        print(f"   Manual exchange: ₹0 for both")
        amazon_opt = selected_costs["option_amazon_handles"]
        print(f"   Amazon handles:  Party A pays ₹{amazon_opt['party_a_pays']}, Party B pays ₹{amazon_opt['party_b_pays']}")
        print(f"   Amazon earns:    ₹{amazon_opt['amazon_earns']}")
    else:
        print(f" DIFFERENT CITIES — Amazon delivery required:")
        amazon_opt = selected_costs["option_amazon_handles"]
        print(f"   Party A pays: {amazon_opt['breakdown_a']}")
        print(f"   Party B pays: {amazon_opt['breakdown_b']}")
        print(f"   Amazon earns: ₹{amazon_opt['amazon_earns']}")

    print(f"{'='*60}")

    return {
        "decision": "EXCHANGE MATCHES FOUND",
        "seller_item_value": item_value,
        "seller_asking_price": seller_price,
        "note": "Matching uses Amazon's calculated value, NOT seller's asking price",
        "matches_found": len(matches),
        "all_matches": exchange_options,
        "selected_exchange": {
            "party_b": selected_match["owner"],
            "party_b_location": selected_match["location"].upper(),
            "party_b_item": selected_match["description"],
            "party_b_item_value": selected_match["amazon_value"],
            "value_difference": selected_match["value_difference"],
            "delivery_costs": selected_costs,
            "status": "PENDING — waiting for Party B to accept",
        },
    }


# ============================================================================
# DEMO
# ============================================================================

if __name__ == "__main__":

    # Scenario: Warehouse engine suggested exchange for overpriced electronics in Prayagraj
    print("\n" + "▓"*60)
    print(" SCENARIO 1: EXCHANGE — ELECTRONICS FROM PRAYAGRAJ")
    print("▓"*60)

    result1 = initiate_exchange(
        seller_loc="prayagraj",
        category="electrical_appliances",
        condition="refurbish",
        seller_price=350,  # Seller asked too much, Amazon suggested exchange
    )
    print("\n📋 RESULT:")
    print(json.dumps(result1, indent=2, default=str))

    # Scenario: Exchange for clothing from Delhi (same city match possible)
    print("\n" + "▓"*60)
    print(" SCENARIO 2: EXCHANGE — CLOTHING FROM DELHI (same city match)")
    print("▓"*60)

    result2 = initiate_exchange(
        seller_loc="delhi",
        category="clothing",
        condition="resell",
        seller_price=300,
    )
    print("\n📋 RESULT:")
    print(json.dumps(result2, indent=2, default=str))
