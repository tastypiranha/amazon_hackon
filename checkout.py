import json
from warehouse import data, compute_dynamic_resale_price, CONDITION_MULTIPLIERS
from green_engine import (
    TransactionDTO, calculate_co2_savings, calculate_disposition_reward,
    POINTS_PER_RUPEE
)

# ============================================================================
# CHECKOUT MODULE - Smart Circular Commerce Ecosystem
# ============================================================================
#
# PRICING FLOW:
# ─────────────────────────────────────────────────────────────────────────────
#
# CASE 1: AMAZON-OWNED PRODUCT (Amazon purchased from seller)
#
#   1.1) Same location (product already in buyer's city warehouse):
#        - Dashboard shows: S_i - processing_fee (attractive price)
#        - Checkout adds: + processing_fee
#        - Customer pays: S_i (full selling price at that location)
#
#   1.2) Different location (product shipped to best warehouse, buyer is there):
#        - Dashboard shows: S_i - processing_fee_destination
#          (origin processing was Amazon's cost, not shown to buyer)
#        - Checkout adds: + processing_fee_destination
#        - Customer pays: S_i
#
# CASE 2: SELLER-OWNED PRODUCT (Amazon didn't buy, listed locally)
#
#   2.1) Buyer is in same location as seller (warehouse-level visibility):
#        - Dashboard shows: seller_price (raw price, no fees)
#        - Checkout adds: + processing_fee
#        - Customer pays: seller_price + processing_fee
#
# CASE 3: DONATION (with Amazon delivery)
#        - Dashboard shows: FREE (₹0)
#        - Checkout adds: processing + transit (if different city)
#        - Customer pays: only delivery charges
#
# CASE 4: EXCHANGE
#        - Dashboard shows: exchange item (₹0 product cost)
#        - Checkout adds: processing + transit fees for both parties
#
# KEY RULE: Processing fees are NEVER shown upfront.
#           They are ALWAYS added at checkout only.
# ─────────────────────────────────────────────────────────────────────────────


def get_listing_price(ownership, selling_price, warehouse_loc, seller_price=None):
    """
    Compute what the customer sees on the DASHBOARD (before checkout).
    Processing fees are hidden here — added only at checkout.

    Args:
        ownership: "AMAZON" or "SELLER"
        selling_price: S_i (Amazon's calculated selling price at that location)
        warehouse_loc: Location where product is listed
        seller_price: Only for seller-owned products
    """
    warehouse_loc = warehouse_loc.lower()
    r_dest = data["processing_fees"][warehouse_loc]

    if ownership == "AMAZON":
        # Customer sees S_i minus processing fee (fee added at checkout)
        listing_price = round(selling_price - r_dest, 2)
        return listing_price
    else:
        # Seller-owned: customer sees seller's raw price (fee added at checkout)
        return seller_price


def checkout_amazon_owned(selling_price, product_category, condition, warehouse_loc):
    """
    Checkout for AMAZON-OWNED product.

    Customer was seeing: S_i - processing_fee on the dashboard.
    Now at checkout: processing_fee is added back → total = S_i.

    Args:
        selling_price: S_i at the warehouse location (from warehouse engine)
        product_category: Category
        condition: resell/refurbish/recycle (fixed)
        warehouse_loc: Where product is stored (same as buyer's city)
    """
    warehouse_loc = warehouse_loc.lower()
    product_category = product_category.lower()
    condition = condition.lower()

    r_dest = data["processing_fees"][warehouse_loc]
    listing_price = round(selling_price - r_dest, 2)
    total = selling_price

    # Green points
    dto = TransactionDTO(
        category=product_category,
        is_local_p2p=True,
        disposition_route=condition,
        condition_delta_percentage=0.0,
        logistics_fee=r_dest,
    )
    base_points = calculate_co2_savings(dto)
    green_points = calculate_disposition_reward(dto, base_points)
    cashback = round(green_points / POINTS_PER_RUPEE, 2)
    co2_saved = round(green_points / 10, 2)

    print(f"\n{'='*60}")
    print(f" 🛒 CHECKOUT — AMAZON-OWNED PRODUCT")
    print(f"{'='*60}")
    print(f" Product:      {product_category.upper()} ({condition.upper()})")
    print(f" Location:     {warehouse_loc.upper()}")
    print(f"{'─'*60}")
    print(f" Listed Price (shown on dashboard):  ₹{listing_price}")
    print(f" + Processing Fee:                   ₹{r_dest}")
    print(f"{'─'*60}")
    print(f" TOTAL TO PAY:                       ₹{total}")
    print(f"{'─'*60}")
    print(f" 🌱 Green Points:  +{green_points} pts (₹{cashback} cashback)")
    print(f"    CO₂ Saved:     ~{co2_saved} kg")
    print(f"{'='*60}")
    print(f" → Proceed to Payment Gateway")
    print(f"{'='*60}")

    return {
        "ownership": "AMAZON",
        "product_category": product_category,
        "condition": condition,
        "location": warehouse_loc.upper(),
        "listing_price_shown": listing_price,
        "processing_fee_added": r_dest,
        "total_to_pay": total,
        "green_rewards": {
            "points_earned": green_points,
            "cashback_value": cashback,
            "co2_saved_kg": co2_saved,
        },
        "next_step": "PAYMENT GATEWAY",
    }


def checkout_seller_owned(seller_price, product_category, condition, seller_loc):
    """
    Checkout for SELLER-OWNED product (listed locally, Amazon didn't buy).

    Customer was seeing: seller_price on the dashboard.
    Now at checkout: processing_fee is added → total = seller_price + processing.

    Args:
        seller_price: The price seller listed (shown on dashboard)
        product_category: Category
        condition: resell/refurbish/recycle
        seller_loc: Location where product is listed (same as buyer)
    """
    seller_loc = seller_loc.lower()
    product_category = product_category.lower()
    condition = condition.lower()

    r_local = data["processing_fees"][seller_loc]
    total = seller_price + r_local

    # Green points
    dto = TransactionDTO(
        category=product_category,
        is_local_p2p=True,
        disposition_route=condition,
        condition_delta_percentage=0.0,
        logistics_fee=r_local,
    )
    base_points = calculate_co2_savings(dto)
    green_points = calculate_disposition_reward(dto, base_points)
    cashback = round(green_points / POINTS_PER_RUPEE, 2)
    co2_saved = round(green_points / 10, 2)

    print(f"\n{'='*60}")
    print(f" 🛒 CHECKOUT — SELLER-OWNED PRODUCT")
    print(f"{'='*60}")
    print(f" Product:      {product_category.upper()} ({condition.upper()})")
    print(f" Location:     {seller_loc.upper()}")
    print(f" Seller:       Local listing (Amazon did not purchase)")
    print(f"{'─'*60}")
    print(f" Listed Price (shown on dashboard):  ₹{seller_price}")
    print(f" + Processing Fee:                   ₹{r_local}")
    print(f"{'─'*60}")
    print(f" TOTAL TO PAY:                       ₹{total}")
    print(f"{'─'*60}")
    print(f" 🌱 Green Points:  +{green_points} pts (₹{cashback} cashback)")
    print(f"    CO₂ Saved:     ~{co2_saved} kg")
    print(f"{'='*60}")
    print(f" → Proceed to Payment Gateway")
    print(f"{'='*60}")

    return {
        "ownership": "SELLER",
        "product_category": product_category,
        "condition": condition,
        "location": seller_loc.upper(),
        "listing_price_shown": seller_price,
        "processing_fee_added": r_local,
        "total_to_pay": total,
        "green_rewards": {
            "points_earned": green_points,
            "cashback_value": cashback,
            "co2_saved_kg": co2_saved,
        },
        "next_step": "PAYMENT GATEWAY",
    }


def checkout_donation(donor_loc, receiver_loc):
    """
    Checkout for DONATION — product is free, receiver pays delivery only.

    Dashboard shows: FREE (₹0)
    Checkout adds: processing + transit (if different city)
    """
    donor_loc = donor_loc.lower()
    receiver_loc = receiver_loc.lower()

    r_donor = data["processing_fees"][donor_loc]
    r_receiver = data["processing_fees"][receiver_loc]

    if donor_loc == receiver_loc:
        # Same city — single processing fee
        transit = 0
        processing = r_donor
        total = processing
    else:
        # Different city — origin + transit + destination
        transit = data["transportation_matrix"][donor_loc][receiver_loc]
        processing = r_donor + r_receiver
        total = transit + processing

    print(f"\n{'='*60}")
    print(f" 🛒 CHECKOUT — DONATION")
    print(f"{'='*60}")
    print(f" From:         {donor_loc.upper()}")
    print(f" To:           {receiver_loc.upper()}")
    print(f"{'─'*60}")
    print(f" Product Price:                      ₹0 (FREE)")
    if transit > 0:
        print(f" + Transit Cost:                     ₹{transit}")
    print(f" + Processing Fee:                   ₹{processing}")
    if donor_loc != receiver_loc:
        print(f"   (Origin ₹{r_donor} + Destination ₹{r_receiver})")
    print(f"{'─'*60}")
    print(f" TOTAL TO PAY:                       ₹{total}")
    print(f"{'='*60}")
    print(f" → Proceed to Payment Gateway")
    print(f"{'='*60}")

    return {
        "ownership": "DONATION",
        "product_price": 0,
        "transit_cost": transit,
        "processing_fee": processing,
        "total_to_pay": total,
        "next_step": "PAYMENT GATEWAY",
    }


def checkout_exchange(party_a_loc, party_b_loc):
    """
    Checkout for EXCHANGE — both parties pay delivery fees.

    Dashboard shows: exchange match (₹0 product cost)
    Checkout adds: processing + transit for each party
    """
    party_a_loc = party_a_loc.lower()
    party_b_loc = party_b_loc.lower()

    r_a = data["processing_fees"][party_a_loc]
    r_b = data["processing_fees"][party_b_loc]

    if party_a_loc == party_b_loc:
        # Same city — each pays single processing fee
        cost_a = r_a
        cost_b = r_b
        transit = 0
    else:
        # Different city — each pays origin + transit + destination
        tc_a_to_b = data["transportation_matrix"][party_a_loc][party_b_loc]
        tc_b_to_a = data["transportation_matrix"][party_b_loc][party_a_loc]
        cost_a = r_a + tc_a_to_b + r_b
        cost_b = r_b + tc_b_to_a + r_a
        transit = tc_a_to_b  # just for display

    print(f"\n{'='*60}")
    print(f" 🛒 CHECKOUT — EXCHANGE")
    print(f"{'='*60}")
    print(f" Party A:      {party_a_loc.upper()}")
    print(f" Party B:      {party_b_loc.upper()}")
    print(f"{'─'*60}")
    print(f" Product Cost:                       ₹0 (exchange)")
    print(f" Party A pays (delivery):            ₹{cost_a}")
    print(f" Party B pays (delivery):            ₹{cost_b}")
    print(f"{'─'*60}")
    print(f" Amazon earns total:                 ₹{cost_a + cost_b}")
    print(f"{'='*60}")
    print(f" → Both proceed to Payment Gateway")
    print(f"{'='*60}")

    return {
        "ownership": "EXCHANGE",
        "product_cost": 0,
        "party_a_pays": cost_a,
        "party_b_pays": cost_b,
        "amazon_earns": cost_a + cost_b,
        "next_step": "PAYMENT GATEWAY",
    }


# ============================================================================
# DEMO
# ============================================================================

if __name__ == "__main__":

    # ─── CASE 1: Amazon-owned, resell clothing at Delhi
    print("\n" + "▓"*60)
    print(" CASE 1: AMAZON-OWNED — RESELL CLOTHING AT DELHI")
    print("▓"*60)

    s_delhi, _ = compute_dynamic_resale_price("clothing", "delhi", "resell")
    listing = get_listing_price("AMAZON", s_delhi, "delhi")
    print(f"\n  📋 Dashboard shows: ₹{listing}")
    print(f"  (Full S_i = ₹{s_delhi}, processing ₹{data['processing_fees']['delhi']} hidden)")

    result1 = checkout_amazon_owned(
        selling_price=s_delhi,
        product_category="clothing",
        condition="resell",
        warehouse_loc="delhi",
    )
    print("\n📋 RESULT:")
    print(json.dumps(result1, indent=2))

    # ─── CASE 2: Amazon-owned, refurbish electronics at Mumbai
    print("\n" + "▓"*60)
    print(" CASE 2: AMAZON-OWNED — REFURBISH ELECTRONICS AT MUMBAI")
    print("▓"*60)

    s_mumbai, _ = compute_dynamic_resale_price("electrical_appliances", "mumbai", "refurbish")
    listing2 = get_listing_price("AMAZON", s_mumbai, "mumbai")
    print(f"\n  📋 Dashboard shows: ₹{listing2}")
    print(f"  (Full S_i = ₹{s_mumbai}, processing ₹{data['processing_fees']['mumbai']} hidden)")

    result2 = checkout_amazon_owned(
        selling_price=s_mumbai,
        product_category="electrical_appliances",
        condition="refurbish",
        warehouse_loc="mumbai",
    )
    print("\n📋 RESULT:")
    print(json.dumps(result2, indent=2))

    # ─── CASE 3: Seller-owned, local listing at Prayagraj
    print("\n" + "▓"*60)
    print(" CASE 3: SELLER-OWNED — LOCAL LISTING AT PRAYAGRAJ")
    print("▓"*60)

    seller_price = 350
    listing3 = get_listing_price("SELLER", None, "prayagraj", seller_price=seller_price)
    print(f"\n  📋 Dashboard shows: ₹{listing3}")
    print(f"  (Processing ₹{data['processing_fees']['prayagraj']} hidden, added at checkout)")

    result3 = checkout_seller_owned(
        seller_price=seller_price,
        product_category="electrical_appliances",
        condition="resell",
        seller_loc="prayagraj",
    )
    print("\n📋 RESULT:")
    print(json.dumps(result3, indent=2))

    # ─── CASE 4: Donation — Delhi to Mumbai
    print("\n" + "▓"*60)
    print(" CASE 4: DONATION — DELHI → MUMBAI")
    print("▓"*60)

    print(f"\n  📋 Dashboard shows: FREE")
    result4 = checkout_donation(donor_loc="delhi", receiver_loc="mumbai")
    print("\n📋 RESULT:")
    print(json.dumps(result4, indent=2))

    # ─── CASE 5: Exchange — Kolkata ↔ Chennai
    print("\n" + "▓"*60)
    print(" CASE 5: EXCHANGE — KOLKATA ↔ CHENNAI")
    print("▓"*60)

    print(f"\n  📋 Dashboard shows: Exchange match (₹0)")
    result5 = checkout_exchange(party_a_loc="kolkata", party_b_loc="chennai")
    print("\n📋 RESULT:")
    print(json.dumps(result5, indent=2))
