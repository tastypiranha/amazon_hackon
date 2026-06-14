import json

# ============================================================================
# SMART CIRCULAR COMMERCE ECOSYSTEM - Intelligent Decision Engine
# ============================================================================
# Core Algorithm: Ki = (Si - Pcurrent - ri - TCi) × di
# Where Ki = Expected Profit Utility Score for warehouse i
# Si = S_base × condition_multiplier × (1 + α × (d_i - d_avg))
# condition_multiplier: resell=1.0, refurbish=0.55, recycle=0.15
# condition is determined ONCE at listing time by the image classifier and never changes.
# ============================================================================
# 
# WORKFLOW:
# ─────────────────────────────────────────────────────────────────────────────
# PHASE 0: IMAGE CLASSIFIER DETERMINES CONDITION (ONCE, NEVER CHANGES)
#   - Seller uploads product photo
#   - Classifier outputs: "resell" / "refurbish" / "recycle"
#   - This condition stays fixed for the entire product lifecycle
#
# PHASE 1: SELLER LISTS PRODUCT
#   1. Seller posts item with asking price (P_seller) + condition from classifier
#   2. Engine computes Ki for all warehouses (S_i adjusted by condition multiplier)
#   3. IF K_max > threshold → AMAZON BUYS at P_seller
#      - Ships to best warehouse (highest K location)
#      - Lists on Amazon Resale at customer_price = S_i (condition-adjusted)
#   4. IF K_max not enough → Suggest revised price to seller
#      - Seller accepts → Amazon buys at revised price
#      - Seller rejects → Item listed locally (seller's warehouse only)
#        Customer sees: seller_price + r_local + listing_fee
#
# PHASE 2A: AMAZON-OWNED PRODUCT GETS RETURNED
#   - Condition remains the SAME as when originally listed
#   - Customer returns → product stays in SAME warehouse (already best K location)
#   - Re-list on Amazon Resale at same warehouse, same condition
#   - Processing fee is non-refundable to customer
#
# PHASE 2B: SELLER-OWNED PRODUCT GETS RETURNED (local listing)
#   - Product was never bought by Amazon, sold locally to customer
#   - Customer returns → item goes back to seller
#   - Amazon deducts: listing_fee + miscellaneous charges it spent
#   - Refund to buyer = customer_paid - (listing_fee + misc_charges)
#   - Remaining amount returned to seller
# ─────────────────────────────────────────────────────────────────────────────

data = {
    # d_i: Probability of Sale (0 to 1) for a specific product category in a specific city
    "probabilities": {
        "delhi":     {"electrical_appliances": 0.85, "vehicle": 0.70, "clothing": 0.90, "household_utensils": 0.75},
        "chennai":   {"electrical_appliances": 0.80, "vehicle": 0.85, "clothing": 0.45, "household_utensils": 0.80},
        "mumbai":    {"electrical_appliances": 0.92, "vehicle": 0.75, "clothing": 0.88, "household_utensils": 0.82},
        "lucknow":   {"electrical_appliances": 0.65, "vehicle": 0.60, "clothing": 0.75, "household_utensils": 0.70},
        "kolkata":   {"electrical_appliances": 0.78, "vehicle": 0.55, "clothing": 0.82, "household_utensils": 0.88},
        "prayagraj": {"electrical_appliances": 0.50, "vehicle": 0.45, "clothing": 0.60, "household_utensils": 0.65},
    },

    # S_base: National average resale price per category (single reference price)
    # S_i is computed dynamically as: S_base × (1 + α × (d_i - d_avg))
    "base_resale_prices": {
        "electrical_appliances": 300,
        "vehicle": 4700,
        "clothing": 260,
        "household_utensils": 250,
    },

    # TC_i: Transit cost from origin to warehouse i (₹ per unit, approximate)
    "transportation_matrix": {
        "delhi":     {"delhi": 0, "chennai": 95, "mumbai": 75, "lucknow": 35, "kolkata": 80, "prayagraj": 45},
        "chennai":   {"delhi": 95, "chennai": 0, "mumbai": 65, "lucknow": 85, "kolkata": 80, "prayagraj": 85},
        "mumbai":    {"delhi": 75, "chennai": 65, "mumbai": 0, "lucknow": 70, "kolkata": 90, "prayagraj": 65},
        "lucknow":   {"delhi": 35, "chennai": 85, "mumbai": 70, "lucknow": 0, "kolkata": 55, "prayagraj": 15},
        "kolkata":   {"delhi": 80, "chennai": 80, "mumbai": 90, "lucknow": 55, "kolkata": 0, "prayagraj": 45},
        "prayagraj": {"delhi": 45, "chennai": 85, "mumbai": 65, "lucknow": 15, "kolkata": 45, "prayagraj": 0},
    },

    # r_i: Local registration and processing overhead at warehouse i
    "processing_fees": {
        "delhi": 15, "chennai": 18, "mumbai": 12, "lucknow": 38, "kolkata": 28, "prayagraj": 45,
    },

    # Listing fee charged by Amazon for hosting a seller's product locally
    "listing_fees": {
        "delhi": 10, "chennai": 12, "mumbai": 8, "lucknow": 15, "kolkata": 12, "prayagraj": 18,
    },
}

# Decision thresholds
AMAZON_PURCHASE_THRESHOLD = 30    # Minimum K_max for Amazon to buy the product
LOW_DEMAND_THRESHOLD = 0.65       # Below this, local demand is considered too low

# Demand-Price Elasticity Factor (α)
DEMAND_ELASTICITY = 0.5

# Condition multiplier based on image classifier output (recycle/refurbish/resell)
# Adjusts S_base to reflect actual recoverable value
CONDITION_MULTIPLIERS = {
    "resell": 1.0,       # Full value — product is in good shape, sell as-is
    "refurbish": 0.55,   # 55% of base — needs repair/cleaning, reduced margin
    "recycle": 0.15,     # 15% of base — only raw material/scrap value recoverable
}


# ============================================================================
# CORE ENGINE FUNCTIONS
# ============================================================================

def compute_dynamic_resale_price(category, location, condition="resell"):
    """
    Compute S_i dynamically as a function of demand and product condition.
    Formula: S_i = S_base × condition_multiplier × (1 + α × (d_i - d_avg))
    
    condition: "resell", "refurbish", or "recycle" (from image classifier)
    """
    s_base = data["base_resale_prices"][category]
    d_i = data["probabilities"][location][category]
    condition_mult = CONDITION_MULTIPLIERS.get(condition.lower(), 1.0)

    all_probs = [data["probabilities"][city][category] for city in data["probabilities"]]
    d_avg = sum(all_probs) / len(all_probs)

    s_i = s_base * condition_mult * (1 + DEMAND_ELASTICITY * (d_i - d_avg))
    return round(s_i, 2), d_avg


def compute_ki_all_warehouses(current_loc, category, acquisition_cost, r_origin=0, condition="resell"):
    """
    Compute Ki = (Si - Pcurrent - r_origin - TCi - r_i) × di for ALL warehouse hubs.
    
    r_origin = processing fee at the seller/item's current location (paid once for acquisition)
    r_i = processing fee at the destination warehouse (paid to list/store there)
    condition = "resell", "refurbish", or "recycle" (from image classifier)
    Both processing fees are included as costs.
    """
    current_loc = current_loc.lower()
    category = category.lower()
    results = {}

    for loc in data["probabilities"]:
        s_i, d_avg = compute_dynamic_resale_price(category, loc, condition)
        r_i = data["processing_fees"][loc]              # Destination processing fee
        tc_i = data["transportation_matrix"][current_loc][loc]
        d_i = data["probabilities"][loc][category]

        k_i = (s_i - acquisition_cost - r_origin - tc_i - r_i) * d_i

        results[loc] = {
            "K_i": round(k_i, 2),
            "S_i": s_i,
            "r_origin": r_origin,
            "r_destination": r_i,
            "TC_i": tc_i,
            "d_i": d_i,
            "d_avg": round(d_avg, 3),
            "condition": condition,
            "condition_multiplier": CONDITION_MULTIPLIERS.get(condition.lower(), 1.0),
            "margin_before_probability": round(s_i - acquisition_cost - r_origin - tc_i - r_i, 2),
        }

    return results


def find_best_warehouse(ki_results):
    """Find the warehouse with highest K_i."""
    k_max = float('-inf')
    best_location = None
    for loc, info in ki_results.items():
        if info["K_i"] > k_max:
            k_max = info["K_i"]
            best_location = loc
    return best_location, k_max


def compute_revised_price(ki_results, best_location):
    """
    Calculate the maximum price Amazon can pay for K to be positive at best location.
    K = (S_i - P - r_origin - TC_i - r_dest) * d_i > 0
    → P < S_i - r_origin - TC_i - r_dest
    """
    info = ki_results[best_location]
    p_max = info["S_i"] - info["r_origin"] - info["TC_i"] - info["r_destination"]
    return round(p_max, 2)


# ============================================================================
# PHASE 1: SELLER LISTS PRODUCT
# ============================================================================

def seller_lists_product(seller_loc, category, seller_price, condition="resell"):
    """
    PHASE 1: Seller posts product with asking price.
    
    condition is determined by the image classifier at listing time (resell/refurbish/recycle)
    and stays fixed for the entire product lifecycle.
    
    Flow:
      1. Compute Ki for all warehouses using seller_price as acquisition cost
      2. If K_max >= threshold → Amazon buys, ships to best warehouse, lists at S_i
      3. If K_max < threshold → Suggest revised (lower) price to seller
         - Returns both the suggestion and what happens if seller rejects
    """
    seller_loc = seller_loc.lower()
    category = category.lower()
    condition = condition.lower()

    r_seller = data["processing_fees"][seller_loc]  # Processing fee at seller's location
    ki_results = compute_ki_all_warehouses(seller_loc, category, seller_price, r_origin=r_seller, condition=condition)
    best_location, k_max = find_best_warehouse(ki_results)
    best_info = ki_results[best_location]

    print(f"\n{'='*60}")
    print(f" PHASE 1: SELLER LISTS PRODUCT")
    print(f"{'='*60}")
    print(f" Category:        {category.upper()}")
    print(f" Condition:       {condition.upper()} (multiplier: {CONDITION_MULTIPLIERS[condition]})")
    print(f" Seller Location: {seller_loc.upper()}")
    print(f" Seller Price:    ₹{seller_price}")
    print(f" Processing (origin): ₹{r_seller}")
    print(f" Best Warehouse:  {best_location.upper()} (K = {k_max})")
    print(f"{'─'*60}")
    # Show all three possible selling prices at the best warehouse
    s_resell, _ = compute_dynamic_resale_price(category, best_location, "resell")
    s_refurbish, _ = compute_dynamic_resale_price(category, best_location, "refurbish")
    s_recycle, _ = compute_dynamic_resale_price(category, best_location, "recycle")
    print(f" Selling Prices at {best_location.upper()} (all conditions):")
    print(f"   {'→' if condition == 'resell' else ' '} Resell:    ₹{s_resell}")
    print(f"   {'→' if condition == 'refurbish' else ' '} Refurbish: ₹{s_refurbish}")
    print(f"   {'→' if condition == 'recycle' else ' '} Recycle:   ₹{s_recycle}")
    print(f" Selected ({condition.upper()}): ₹{best_info['S_i']}")
    print(f"{'='*60}")

    if k_max >= AMAZON_PURCHASE_THRESHOLD:
        # --- AMAZON BUYS THE PRODUCT ---
        customer_price = best_info["S_i"]  # Price shown to customer at destination
        amazon_profit = k_max

        return {
            "decision": "AMAZON PURCHASES",
            "condition": condition,
            "seller_gets": seller_price,
            "amazon_ships_to": best_location.upper(),
            "customer_sees_price": customer_price,
            "amazon_expected_profit": amazon_profit,
            "transit_cost": best_info["TC_i"],
            "processing_fee_origin": r_seller,
            "processing_fee_destination": best_info["r_destination"],
            "sale_probability": best_info["d_i"],
            "ownership": "AMAZON",
            "all_ki": {loc: info["K_i"] for loc, info in ki_results.items()},
        }

    else:
        # --- AMAZON DOES NOT BUY → SUGGEST REVISED PRICE ---
        revised_price = compute_revised_price(ki_results, best_location)
        # Revised price should NEVER exceed seller's listed price
        revised_price = min(revised_price, seller_price)
        local_d = data["probabilities"][seller_loc][category]
        local_r = data["processing_fees"][seller_loc]
        local_listing_fee = data["listing_fees"][seller_loc]

        # What customer sees if listed locally (seller rejects revised price)
        local_customer_price = seller_price + local_r + local_listing_fee

        suggestion = {
            "decision": "AMAZON SUGGESTS REVISED PRICE",
            "current_k_max": k_max,
            "revised_price_suggestion": revised_price,
            "price_reduction_needed": round(seller_price - revised_price, 2),
            "best_warehouse_if_accepted": best_location.upper(),
            "local_demand": local_d,
            "if_seller_accepts": {
                "amazon_buys_at": revised_price,
                "ships_to": best_location.upper(),
                "customer_price_at_destination": best_info["S_i"],
                "ownership": "AMAZON",
            },
            "if_seller_rejects": {
                "action": "LIST LOCALLY ONLY",
                "listed_at_warehouse": seller_loc.upper(),
                "seller_price": seller_price,
                "listing_fee": local_listing_fee,
                "processing_fee": local_r,
                "customer_sees_price": local_customer_price,
                "ownership": "SELLER",
                "note": "Product visible only in local warehouse region.",
            },
            "all_ki": {loc: info["K_i"] for loc, info in ki_results.items()},
        }

        # If local demand is too low, also suggest exchange
        if local_d < LOW_DEMAND_THRESHOLD:
            suggestion["exchange_suggestion"] = {
                "reason": (
                    f"Local demand is low (d = {local_d}) and price is too high for Amazon. "
                    f"Even if listed locally, sale probability is poor."
                ),
                "recommendation": (
                    "Suggest seller opt for Exchange/Trade-in program: "
                    "trade item for credit toward a new purchase, or list on "
                    "Peer-to-Peer Exchange marketplace."
                ),
            }

        return suggestion


# ============================================================================
# PHASE 2A: RETURN ON AMAZON-OWNED PRODUCT
# ============================================================================

def return_amazon_owned(warehouse_loc, category, original_purchase_price, customer_price, condition="resell"):
    """
    PHASE 2A: Customer returns a product that Amazon owns.
    
    Flow:
      - Amazon had bought this product, shipped to best warehouse, sold to customer
      - Customer returns it
      - condition was already determined at listing time — it does NOT change
      - Product STAYS in the same warehouse (it was already the highest-K location)
      - Re-listed on Amazon Resale at same condition-adjusted price
      - Refund to customer = customer_price - processing_fee_of_warehouse
        (processing fee at the warehouse where customer transacted is non-refundable)
    """
    warehouse_loc = warehouse_loc.lower()
    category = category.lower()

    r_warehouse = data["processing_fees"][warehouse_loc]  # Non-refundable

    # Same condition as original listing — never changes
    s_i, _ = compute_dynamic_resale_price(category, warehouse_loc, condition)
    d_i = data["probabilities"][warehouse_loc][category]
    condition_mult = CONDITION_MULTIPLIERS.get(condition.lower(), 1.0)

    # New K for relisting (no transit cost since it stays put)
    k_relist = (s_i - original_purchase_price - r_warehouse) * d_i

    # Refund: customer gets back what they paid MINUS the non-refundable processing fee
    refund_to_customer = round(customer_price - r_warehouse, 2)

    print(f"\n{'='*60}")
    print(f" PHASE 2A: RETURN ON AMAZON-OWNED PRODUCT")
    print(f"{'='*60}")
    print(f" Category:          {category.upper()}")
    print(f" Warehouse:         {warehouse_loc.upper()}")
    print(f" Condition (fixed): {condition.upper()} (multiplier: {condition_mult})")
    print(f" Amazon Total Investment: ₹{original_purchase_price}")
    print(f" Customer Paid:     ₹{customer_price}")
    print(f"{'─'*60}")
    # Show all three possible relist prices for comparison
    s_resell, _ = compute_dynamic_resale_price(category, warehouse_loc, "resell")
    s_refurbish, _ = compute_dynamic_resale_price(category, warehouse_loc, "refurbish")
    s_recycle, _ = compute_dynamic_resale_price(category, warehouse_loc, "recycle")
    print(f" Relist Prices at {warehouse_loc.upper()} (all conditions):")
    print(f"   {'→' if condition == 'resell' else ' '} Resell:    ₹{s_resell}")
    print(f"   {'→' if condition == 'refurbish' else ' '} Refurbish: ₹{s_refurbish}")
    print(f"   {'→' if condition == 'recycle' else ' '} Recycle:   ₹{s_recycle}")
    print(f" Selected ({condition.upper()}): ₹{s_i}")
    print(f"{'─'*60}")
    print(f" K for relist:                      ₹{round(k_relist, 2)}")
    print(f" Processing Fee (non-refundable):   ₹{r_warehouse} (warehouse: {warehouse_loc.upper()})")
    print(f" Refund to Customer:                ₹{refund_to_customer}")
    print(f"{'='*60}")

    if k_relist > 0:
        return {
            "decision": "RE-LIST AT SAME WAREHOUSE",
            "action": f"Product re-listed as {condition.upper()} at {warehouse_loc.upper()} for ₹{s_i}.",
            "warehouse": warehouse_loc.upper(),
            "condition": condition,
            "condition_multiplier": condition_mult,
            "amazon_total_investment": original_purchase_price,
            "relist_customer_price": s_i,
            "expected_profit_on_relist": round(k_relist, 2),
            "sale_probability": d_i,
            "ownership": "AMAZON",
            "customer_paid": customer_price,
            "non_refundable_processing_fee": r_warehouse,
            "refund_to_customer": refund_to_customer,
        }
    else:
        return {
            "decision": "ROUTE TO CIRCULAR ECONOMY",
            "action": (
                f"Re-listing unprofitable (K = ₹{round(k_relist, 2)}). "
                f"Route to Circular Economy: Peer Exchange / Green Credits."
            ),
            "warehouse": warehouse_loc.upper(),
            "condition": condition,
            "condition_multiplier": condition_mult,
            "amazon_total_investment": original_purchase_price,
            "loss_if_relisted": round(k_relist, 2),
            "ownership": "AMAZON",
            "customer_paid": customer_price,
            "non_refundable_processing_fee": r_warehouse,
            "refund_to_customer": refund_to_customer,
            "next_step": "Peer Exchange / Green Credits program",
        }


# ============================================================================
# PHASE 2B: RETURN ON SELLER-OWNED PRODUCT (local listing)
# ============================================================================

def return_seller_owned(seller_loc, category, seller_price):
    """
    PHASE 2B: Customer returns a product that the seller owns (local listing).
    
    Flow:
      - Amazon never bought this item. It was listed locally by seller.
      - Customer had paid: seller_price + processing_fee + listing_fee
      - Customer returns → item goes back to seller
      - Amazon deducts costs it already spent (non-refundable):
          • listing_fee (Amazon's platform charge)
          • processing_fee (handling, packaging, etc.)
      - Refund to buyer = customer_paid - listing_fee - processing_fee
      - Seller gets the physical product back
      - Amazon asks seller: do you want to relist the item?
    """
    seller_loc = seller_loc.lower()
    category = category.lower()

    r_local = data["processing_fees"][seller_loc]
    listing_fee = data["listing_fees"][seller_loc]

    customer_paid = seller_price + r_local + listing_fee
    refund_to_buyer = customer_paid - listing_fee - r_local  # = seller_price

    print(f"\n{'='*60}")
    print(f" PHASE 2B: RETURN ON SELLER-OWNED PRODUCT")
    print(f"{'='*60}")
    print(f" Category:           {category.upper()}")
    print(f" Seller Location:    {seller_loc.upper()}")
    print(f" Seller Price:       ₹{seller_price}")
    print(f"{'─'*60}")
    print(f" Customer Originally Paid:  ₹{customer_paid}")
    print(f"   (seller_price ₹{seller_price} + processing ₹{r_local} + listing ₹{listing_fee})")
    print(f"{'─'*60}")
    print(f" Amazon Deductions (non-refundable):")
    print(f"   Listing Fee:       ₹{listing_fee}")
    print(f"   Processing Fee:    ₹{r_local}")
    print(f"{'─'*60}")
    print(f" Refund to Buyer:     ₹{refund_to_buyer}")
    print(f" Seller Gets Back:    Physical product")
    print(f"{'='*60}")

    return {
        "decision": "RETURN TO SELLER",
        "action": (
            f"Item returned to seller at {seller_loc.upper()}. "
            f"Amazon deducts ₹{listing_fee} (listing) + ₹{r_local} (processing) from refund."
        ),
        "customer_originally_paid": customer_paid,
        "refund_to_buyer": refund_to_buyer,
        "amazon_keeps": listing_fee + r_local,
        "seller_gets": "Physical product returned",
        "ownership": "SELLER",
        "seller_prompt": {
            "question": "Do you want to relist this item?",
            "if_yes": {
                "action": "RELIST LOCALLY",
                "new_listing_fee": listing_fee,
                "new_processing_fee": r_local,
                "customer_will_see": seller_price + r_local + listing_fee,
                "note": "Seller can also choose a new price for relisting.",
            },
            "if_no": {
                "action": "ITEM WITHDRAWN",
                "note": "Seller takes back the product. No further Amazon involvement.",
            },
        },
        "breakdown": {
            "seller_price": seller_price,
            "processing_fee": r_local,
            "listing_fee": listing_fee,
        },
    }


# ============================================================================
# DEMO SIMULATIONS
# ============================================================================

if __name__ == "__main__":

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 1: Seller lists cheap clothing (classified as RESELL) → Amazon buys & ships
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 1: SELLER LISTS RESELL ITEM → AMAZON PURCHASES")
    print("▓"*60)

    result1 = seller_lists_product(
        seller_loc="prayagraj",
        category="clothing",
        seller_price=100,
        condition="resell",  # Determined by image classifier at listing time
    )
    print("\n📋 DECISION:")
    print(json.dumps(result1, indent=2))

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 2: Same product gets returned — condition stays RESELL
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 2: RETURN — CONDITION STAYS AS RESELL (never changes)")
    print("▓"*60)

    s_delhi, _ = compute_dynamic_resale_price("clothing", "delhi", "resell")
    result2 = return_amazon_owned(
        warehouse_loc="delhi",
        category="clothing",
        original_purchase_price=100 + 45 + 45,
        customer_price=s_delhi,
        condition="resell",  # Same as when listed — never changes
    )
    print("\n📋 DECISION:")
    print(json.dumps(result2, indent=2))

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 3: Seller lists REFURBISH condition item
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 3: SELLER LISTS REFURBISH ITEM")
    print("▓"*60)

    result3 = seller_lists_product(
        seller_loc="mumbai",
        category="electrical_appliances",
        seller_price=120,
        condition="refurbish",  # Classifier says needs refurbishment
    )
    print("\n📋 DECISION:")
    print(json.dumps(result3, indent=2))

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 4: Seller lists RECYCLE condition item — low value
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 4: SELLER LISTS RECYCLE ITEM — SCRAP VALUE ONLY")
    print("▓"*60)

    result4 = seller_lists_product(
        seller_loc="kolkata",
        category="household_utensils",
        seller_price=30,
        condition="recycle",  # Classifier says only recyclable
    )
    print("\n📋 DECISION:")
    print(json.dumps(result4, indent=2))

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 5: Overpriced resell item → Amazon suggests revision
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 5: OVERPRICED RESELL → PRICE REVISION")
    print("▓"*60)

    result5 = seller_lists_product(
        seller_loc="prayagraj",
        category="electrical_appliances",
        seller_price=350,
        condition="resell",
    )
    print("\n📋 DECISION:")
    print(json.dumps(result5, indent=2))

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 6: Seller-owned product gets returned
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 6: SELLER-OWNED LOCAL LISTING → CUSTOMER RETURNS")
    print("▓"*60)

    result6 = return_seller_owned(
        seller_loc="prayagraj",
        category="electrical_appliances",
        seller_price=350,
    )
    print("\n📋 DECISION:")
    print(json.dumps(result6, indent=2))

    # ═══════════════════════════════════════════════════════════════════
    # SCENARIO 7: Vehicle (resell) in Lucknow → Amazon buys & routes
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "▓"*60)
    print(" SCENARIO 7: VEHICLE RESELL → AMAZON BUYS & ROUTES")
    print("▓"*60)

    result7 = seller_lists_product(
        seller_loc="lucknow",
        category="vehicle",
        seller_price=3500,
        condition="resell",
    )
    print("\n📋 DECISION:")
    print(json.dumps(result7, indent=2))
