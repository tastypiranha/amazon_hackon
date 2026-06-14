import json

# ============================================================================
# DONATION MODULE - Smart Circular Commerce Ecosystem
# ============================================================================
# When a seller wants to DONATE a product:
#   - No pricing calculation needed (price = ₹0 for the product itself)
#   - Ad is visible to ALL regions (nationwide)
#   - Two pickup options for receiver:
#     OPTION A: Self-pickup — receiver goes to donor's location (FREE)
#     OPTION B: Amazon delivers — receiver pays transit cost + processing fee
#              Amazon earns from the delivery charges
# ============================================================================

# Import transportation and processing data from warehouse engine
from warehouse import data


def donate_product(donor_loc, category, product_description=""):
    """
    Donor lists a product for free donation.

    Flow:
      1. Donor posts item with description and photo
      2. Ad is listed ONLY in donor's local warehouse region
      3. Interested receiver claims the item
      4. Receiver chooses:
         A) Self-pickup: go to donor's location (₹0)
         B) Amazon delivery: pay transit + processing fee

    Args:
        donor_loc: City/warehouse region where the donor is located
        category: Product category (clothing, electronics, etc.)
        product_description: Brief description of the donated item
    """
    donor_loc = donor_loc.lower()
    category = category.lower()

    r_donor = data["processing_fees"][donor_loc]

    print(f"\n{'='*60}")
    print(f" DONATION LISTING")
    print(f"{'='*60}")
    print(f" Category:       {category.upper()}")
    print(f" Donor Location: {donor_loc.upper()}")
    print(f" Description:    {product_description or 'N/A'}")
    print(f"{'─'*60}")
    print(f" Product Price:  ₹0 (FREE)")
    print(f"{'─'*60}")
    print(f" OPTION A: Self-Pickup")
    print(f"   Cost to Receiver: ₹0")
    print(f"   Receiver goes to donor's location")
    print(f"{'─'*60}")
    print(f" OPTION B: Amazon Delivery")
    print(f"   Processing Fee:   ₹{r_donor}")
    print(f"   Transit Cost:     Depends on receiver's location (see below)")
    print(f"   Amazon Earns:     Processing + Transit")
    print(f"{'='*60}")

    # Show delivery costs to all locations
    print(f"\n   Delivery costs FROM {donor_loc.upper()} to:")
    delivery_options = {}
    for dest in data["transportation_matrix"][donor_loc]:
        tc = data["transportation_matrix"][donor_loc][dest]
        r_dest = data["processing_fees"][dest]

        if dest == donor_loc:
            # Same city: no transit, just one processing fee for Amazon handling
            total_delivery_cost = r_donor
            delivery_options[dest] = {
                "transit_cost": 0,
                "processing_fee_origin": r_donor,
                "processing_fee_destination": 0,
                "total_receiver_pays": total_delivery_cost,
                "amazon_earns": total_delivery_cost,
                "note": "Same city — single processing fee only",
            }
            print(f"     {dest.upper():12s} → ₹{total_delivery_cost} (processing ₹{r_donor} only) [same city]")
        else:
            # Different city: origin processing + transit + destination processing
            total_delivery_cost = r_donor + tc + r_dest
            delivery_options[dest] = {
                "transit_cost": tc,
                "processing_fee_origin": r_donor,
                "processing_fee_destination": r_dest,
                "total_receiver_pays": total_delivery_cost,
                "amazon_earns": total_delivery_cost,
            }
            print(f"     {dest.upper():12s} → ₹{total_delivery_cost} (origin ₹{r_donor} + transit ₹{tc} + dest ₹{r_dest})")

    return {
        "decision": "DONATION LISTED",
        "action": f"Ad posted nationwide. Donor located at {donor_loc.upper()}. Receiver chooses pickup or delivery.",
        "donor_location": donor_loc.upper(),
        "category": category,
        "description": product_description,
        "product_price": 0,
        "option_a_self_pickup": {
            "cost_to_receiver": 0,
            "amazon_earns": 0,
            "method": "Receiver collects from donor's location",
            "note": "Only available if receiver is in same city as donor",
        },
        "option_b_amazon_delivery": {
            "same_city": f"Processing fee only: ₹{r_donor}",
            "different_city": "Origin processing + Transit + Destination processing",
            "delivery_costs_by_destination": delivery_options,
            "method": "Amazon picks up from donor, delivers to receiver",
            "amazon_earns": "All delivery charges",
        },
    }


# ============================================================================
# DEMO
# ============================================================================

if __name__ == "__main__":

    print("\n" + "▓"*60)
    print(" SCENARIO 1: DONOR LISTS CLOTHING IN DELHI")
    print("▓"*60)

    result1 = donate_product(
        donor_loc="delhi",
        category="clothing",
        product_description="Gently used winter jacket, size L",
    )
    print("\n📋 RESULT:")
    print(json.dumps(result1, indent=2))

    print("\n" + "▓"*60)
    print(" SCENARIO 2: DONOR LISTS ELECTRONICS IN KOLKATA")
    print("▓"*60)

    result2 = donate_product(
        donor_loc="kolkata",
        category="electrical_appliances",
        product_description="Working table fan, slightly noisy",
    )
    print("\n📋 RESULT:")
    print(json.dumps(result2, indent=2))
