import os
import tempfile
import numpy as np
import torch
import pickle
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from transformers import CLIPProcessor, CLIPModel
from sklearn.preprocessing import normalize

from warehouse import (
    data, compute_dynamic_resale_price, compute_ki_all_warehouses,
    find_best_warehouse, compute_revised_price, CONDITION_MULTIPLIERS,
    AMAZON_PURCHASE_THRESHOLD, LOW_DEMAND_THRESHOLD
)
from checkout import (
    get_listing_price, checkout_amazon_owned, checkout_seller_owned,
    checkout_donation, checkout_exchange
)
from donatelogic import donate_product
from exchangelogic import (
    compute_item_value, find_exchange_matches, compute_exchange_costs,
    EXCHANGE_MARKETPLACE, VALUE_MATCH_TOLERANCE
)
from green_engine import (
    TransactionDTO, calculate_co2_savings, calculate_disposition_reward,
    process_transaction_points, POINTS_PER_RUPEE, CATEGORY_BASE_POINTS
)
from trust_engine import TrustProfileDTO, calculate_trust_index, get_trust_badge
from returnpredictor import predict_return_probability

# ============================================================================
# FASTAPI SERVER — Amazon ReLife Backend
# ============================================================================

app = FastAPI(
    title="Amazon ReLife API",
    description="Smart Circular Commerce Ecosystem — AI Decision Engine",
    version="1.0.0"
)

# CORS — allow frontend to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load CLIP model once at startup ──────────────────────────────────────────
print("Loading CLIP model...")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("CLIP model loaded!")

# ─── Load pre-trained classifiers ─────────────────────────────────────────────
CLASSIFIERS = {}
CLASSIFIER_FILES = {
    "electrical_appliances": "classifier_electronics.pkl",
    "clothing": "classifier_clothing.pkl",
    "household_utensils": "classifier_household.pkl",
    "vehicle": "classifier_vehicle.pkl",
}

for category, pkl_file in CLASSIFIER_FILES.items():
    pkl_path = os.path.join(os.path.dirname(__file__), pkl_file)
    if os.path.exists(pkl_path):
        with open(pkl_path, "rb") as f:
            CLASSIFIERS[category] = pickle.load(f)
        print(f"  Loaded classifier: {category}")
    else:
        print(f"  WARNING: {pkl_file} not found — {category} classification unavailable")


# ─── Helper: Extract CLIP features ───────────────────────────────────────────

def extract_clip_features(image_path: str):
    """Extract CLIP image features (raw, unnormalized)."""
    image = Image.open(image_path).convert("RGB")
    inputs = clip_processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = clip_model.vision_model(pixel_values=inputs["pixel_values"])
    features = outputs.pooler_output.cpu().numpy().squeeze()
    return features  # Return raw features — normalization happens at classify time


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class DecisionRequest(BaseModel):
    seller_loc: str
    category: str
    seller_price: float
    condition: str  # resell / refurbish / recycle


class CheckoutAmazonRequest(BaseModel):
    selling_price: float
    product_category: str
    condition: str
    warehouse_loc: str


class CheckoutSellerRequest(BaseModel):
    seller_price: float
    product_category: str
    condition: str
    seller_loc: str


class CheckoutDonationRequest(BaseModel):
    donor_loc: str
    receiver_loc: str


class CheckoutExchangeRequest(BaseModel):
    party_a_loc: str
    party_b_loc: str


class DonateRequest(BaseModel):
    donor_loc: str
    category: str
    description: Optional[str] = ""


class ExchangeRequest(BaseModel):
    seller_loc: str
    category: str
    condition: str
    seller_price: float


class CompareRequest(BaseModel):
    image_path_1: str
    image_path_2: str


class GreenPointsRequest(BaseModel):
    category: str
    is_local: bool = False
    condition: str = "resell"
    logistics_fee: float = 0.0


class TrustRequest(BaseModel):
    lifetime_green_points: int = 0
    total_listings: int = 0
    accurate_condition_listings: int = 0
    total_returns: int = 0
    damaged_returns: int = 0
    p2p_scheduled: int = 0
    p2p_completed: int = 0


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    return {"status": "ok", "service": "Amazon ReLife API", "version": "1.0.0"}


# ─── 1. IMAGE CLASSIFICATION ─────────────────────────────────────────────────

@app.post("/api/classify")
async def classify_image(
    image: UploadFile = File(...),
    category: str = Form(...)
):
    """
    Upload a product image → get condition (resell / refurbish / recycle).
    Category must be one of: electrical_appliances, clothing, household_utensils, vehicle
    """
    category = category.lower()

    if category not in CLASSIFIERS:
        return {
            "error": f"No classifier for category '{category}'",
            "available": list(CLASSIFIERS.keys())
        }

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Extract features and classify
        features = extract_clip_features(tmp_path)
        features_normalized = normalize(features.reshape(1, -1))

        clf = CLASSIFIERS[category]
        prediction = clf.predict(features_normalized)[0]
        probabilities = clf.predict_proba(features_normalized)[0]

        confidence_scores = dict(zip(clf.classes_, [round(float(p), 4) for p in probabilities]))

        return {
            "condition": prediction,
            "confidence": confidence_scores,
            "category": category,
        }
    finally:
        os.unlink(tmp_path)


# ─── 2. WAREHOUSE DECISION ENGINE ────────────────────────────────────────────

@app.post("/api/decide")
def decide(req: DecisionRequest):
    """
    Given seller price + condition + location → Amazon buy/reject decision.
    Returns K values, best warehouse, and decision.
    """
    seller_loc = req.seller_loc.lower()
    category = req.category.lower()
    condition = req.condition.lower()
    seller_price = req.seller_price

    r_seller = data["processing_fees"][seller_loc]
    ki_results = compute_ki_all_warehouses(
        seller_loc, category, seller_price, r_origin=r_seller, condition=condition
    )
    best_location, k_max = find_best_warehouse(ki_results)
    best_info = ki_results[best_location]

    # All three prices at best warehouse
    s_resell, _ = compute_dynamic_resale_price(category, best_location, "resell")
    s_refurbish, _ = compute_dynamic_resale_price(category, best_location, "refurbish")
    s_recycle, _ = compute_dynamic_resale_price(category, best_location, "recycle")

    if k_max >= AMAZON_PURCHASE_THRESHOLD:
        # Amazon buys
        listing_price = get_listing_price("AMAZON", best_info["S_i"], best_location)
        return {
            "decision": "AMAZON_PURCHASES",
            "condition": condition,
            "seller_gets": seller_price,
            "best_warehouse": best_location.upper(),
            "selling_price_si": best_info["S_i"],
            "listing_price_shown": listing_price,
            "k_max": k_max,
            "prices_comparison": {
                "resell": s_resell,
                "refurbish": s_refurbish,
                "recycle": s_recycle,
            },
            "all_ki": {loc: info["K_i"] for loc, info in ki_results.items()},
        }
    else:
        # Amazon rejects — offer 3 options
        revised_price = compute_revised_price(ki_results, best_location)
        revised_price = min(revised_price, seller_price)
        local_d = data["probabilities"][seller_loc][category]
        local_r = data["processing_fees"][seller_loc]
        local_listing_fee = data["listing_fees"][seller_loc]

        options = {
            "option_1_lower_price": {
                "description": "Lower your price to Amazon's suggested price",
                "revised_price": revised_price,
                "price_reduction": round(seller_price - revised_price, 2),
                "amazon_would_buy": revised_price > 0,
            },
            "option_2_list_locally": {
                "description": "List at your price in your local warehouse area",
                "seller_price": seller_price,
                "processing_fee_at_checkout": local_r,
                "customer_pays": seller_price + local_r,
                "listing_fee": local_listing_fee,
            },
            "option_3_exchange": {
                "description": "Exchange with similar-value items nationwide",
                "your_item_value": best_info["S_i"],
                "match_tolerance": f"±{int(VALUE_MATCH_TOLERANCE * 100)}%",
            },
        }

        # Add donation as 4th option
        options["option_4_donate"] = {
            "description": "Donate for free — visible nationwide",
        }

        # Exchange suggestion if low demand
        if local_d < LOW_DEMAND_THRESHOLD:
            options["exchange_recommended"] = True
            options["reason"] = f"Local demand is low (d={local_d})"

        return {
            "decision": "AMAZON_REJECTS",
            "condition": condition,
            "best_warehouse": best_location.upper(),
            "k_max": k_max,
            "threshold": AMAZON_PURCHASE_THRESHOLD,
            "prices_comparison": {
                "resell": s_resell,
                "refurbish": s_refurbish,
                "recycle": s_recycle,
            },
            "options": options,
            "all_ki": {loc: info["K_i"] for loc, info in ki_results.items()},
        }


# ─── 3. CHECKOUT ENDPOINTS ───────────────────────────────────────────────────

@app.post("/api/checkout/amazon")
def api_checkout_amazon(req: CheckoutAmazonRequest):
    """Checkout for Amazon-owned product — adds processing fee."""
    warehouse_loc = req.warehouse_loc.lower()
    r_dest = data["processing_fees"][warehouse_loc]
    listing_price = round(req.selling_price - r_dest, 2)

    # Green points
    is_local = True  # buyer is in same city as warehouse
    dto = TransactionDTO(
        category=req.product_category.lower(),
        is_local_p2p=is_local,
        disposition_route=req.condition.lower(),
        condition_delta_percentage=0.0,
        logistics_fee=r_dest,
    )
    base_points = calculate_co2_savings(dto)
    green_points = calculate_disposition_reward(dto, base_points)

    return {
        "listing_price_shown": listing_price,
        "processing_fee": r_dest,
        "total_to_pay": req.selling_price,
        "green_points_earned": green_points,
        "cashback_value": round(green_points / POINTS_PER_RUPEE, 2),
        "co2_saved_kg": round(green_points / 10, 2),
    }


@app.post("/api/checkout/seller")
def api_checkout_seller(req: CheckoutSellerRequest):
    """Checkout for seller-owned product — adds processing fee."""
    seller_loc = req.seller_loc.lower()
    r_local = data["processing_fees"][seller_loc]
    total = req.seller_price + r_local

    dto = TransactionDTO(
        category=req.product_category.lower(),
        is_local_p2p=True,
        disposition_route=req.condition.lower(),
        condition_delta_percentage=0.0,
        logistics_fee=r_local,
    )
    base_points = calculate_co2_savings(dto)
    green_points = calculate_disposition_reward(dto, base_points)

    return {
        "listing_price_shown": req.seller_price,
        "processing_fee": r_local,
        "total_to_pay": total,
        "green_points_earned": green_points,
        "cashback_value": round(green_points / POINTS_PER_RUPEE, 2),
        "co2_saved_kg": round(green_points / 10, 2),
    }


@app.post("/api/checkout/donation")
def api_checkout_donation(req: CheckoutDonationRequest):
    """Checkout for donation — receiver pays delivery charges only."""
    donor_loc = req.donor_loc.lower()
    receiver_loc = req.receiver_loc.lower()

    r_donor = data["processing_fees"][donor_loc]
    r_receiver = data["processing_fees"][receiver_loc]

    if donor_loc == receiver_loc:
        transit = 0
        processing = r_donor
    else:
        transit = data["transportation_matrix"][donor_loc][receiver_loc]
        processing = r_donor + r_receiver

    total = transit + processing

    return {
        "product_price": 0,
        "transit_cost": transit,
        "processing_fee": processing,
        "total_to_pay": total,
        "same_city": donor_loc == receiver_loc,
    }


@app.post("/api/checkout/exchange")
def api_checkout_exchange(req: CheckoutExchangeRequest):
    """Checkout for exchange — delivery fees for both parties."""
    costs = compute_exchange_costs(req.party_a_loc, req.party_b_loc)
    return costs


# ─── 4. DONATION ──────────────────────────────────────────────────────────────

@app.post("/api/donate")
def api_donate(req: DonateRequest):
    """List a product for donation."""
    donor_loc = req.donor_loc.lower()
    r_donor = data["processing_fees"][donor_loc]

    # Compute delivery costs to all locations
    delivery_options = {}
    for dest in data["transportation_matrix"][donor_loc]:
        r_dest = data["processing_fees"][dest]
        if dest == donor_loc:
            delivery_options[dest] = {
                "transit": 0,
                "processing": r_donor,
                "total": r_donor,
                "note": "Same city — single processing fee",
            }
        else:
            tc = data["transportation_matrix"][donor_loc][dest]
            total = r_donor + tc + r_dest
            delivery_options[dest] = {
                "transit": tc,
                "processing": r_donor + r_dest,
                "total": total,
            }

    return {
        "decision": "DONATION_LISTED",
        "donor_location": donor_loc.upper(),
        "category": req.category,
        "description": req.description,
        "product_price": 0,
        "self_pickup_cost": 0,
        "delivery_options": delivery_options,
    }


# ─── 5. EXCHANGE ─────────────────────────────────────────────────────────────

@app.post("/api/exchange/matches")
def api_exchange_matches(req: ExchangeRequest):
    """Find exchange matches based on Amazon-calculated value."""
    item_value = compute_item_value(req.seller_loc.lower(), req.category.lower(), req.condition.lower())
    matches = find_exchange_matches(item_value)

    # Add delivery costs for each match
    results = []
    for m in matches:
        costs = compute_exchange_costs(req.seller_loc, m["location"])
        results.append({
            "id": m["id"],
            "owner": m["owner"],
            "location": m["location"].upper(),
            "category": m["category"],
            "condition": m["condition"],
            "description": m["description"],
            "amazon_value": m["amazon_value"],
            "value_difference": m["value_difference"],
            "difference_pct": m["difference_pct"],
            "delivery_costs": costs,
        })

    return {
        "seller_item_value": item_value,
        "seller_asking_price": req.seller_price,
        "matches_found": len(results),
        "matches": results,
    }


# ─── 6. PHOTO COMPARISON ─────────────────────────────────────────────────────

@app.post("/api/compare")
async def api_compare(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...)
):
    """Compare two product images — verify returned product matches original."""
    # Save both images temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp1:
        tmp1.write(await image1.read())
        path1 = tmp1.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp2:
        tmp2.write(await image2.read())
        path2 = tmp2.name

    try:
        emb1 = extract_clip_features(path1)
        emb2 = extract_clip_features(path2)

        # Normalize for cosine similarity (dot product of unit vectors = cosine)
        emb1 = normalize(emb1.reshape(1, -1)).squeeze()
        emb2 = normalize(emb2.reshape(1, -1)).squeeze()

        similarity = float(np.dot(emb1, emb2))
        is_match = similarity >= 0.85

        return {
            "similarity": round(similarity, 4),
            "is_match": is_match,
            "threshold": 0.85,
            "verdict": "MATCH — Same product" if is_match else "MISMATCH — Different product",
        }
    finally:
        os.unlink(path1)
        os.unlink(path2)


# ─── 7. GREEN POINTS ─────────────────────────────────────────────────────────

@app.post("/api/green-points")
def api_green_points(req: GreenPointsRequest):
    """Calculate green points for a transaction."""
    dto = TransactionDTO(
        category=req.category.lower(),
        is_local_p2p=req.is_local,
        disposition_route=req.condition.lower(),
        condition_delta_percentage=0.0,
        logistics_fee=req.logistics_fee,
    )

    base_points = calculate_co2_savings(dto)
    final_points = calculate_disposition_reward(dto, base_points)
    cashback = round(final_points / POINTS_PER_RUPEE, 2)
    co2_saved = round(final_points / 10, 2)

    return {
        "base_points": base_points,
        "final_points": final_points,
        "cashback_value_inr": cashback,
        "co2_saved_kg": co2_saved,
        "category": req.category,
        "condition": req.condition,
        "is_local": req.is_local,
    }


# ─── 8. TRUST SCORE ──────────────────────────────────────────────────────────

@app.post("/api/trust-score")
def api_trust_score(req: TrustRequest):
    """Calculate trust index for a user."""
    profile = TrustProfileDTO(
        lifetime_green_points=req.lifetime_green_points,
        total_listings=req.total_listings,
        accurate_condition_listings=req.accurate_condition_listings,
        total_returns=req.total_returns,
        damaged_returns=req.damaged_returns,
        p2p_scheduled=req.p2p_scheduled,
        p2p_completed=req.p2p_completed,
    )

    score = calculate_trust_index(profile)
    badge = get_trust_badge(score)

    return {
        "trust_score": score,
        "badge": badge,
        "max_score": 100,
    }


# ─── 9. PRICING INFO ─────────────────────────────────────────────────────────

@app.get("/api/prices/{category}/{location}/{condition}")
def api_prices(category: str, location: str, condition: str):
    """Get selling prices for a category at a location for all conditions."""
    category = category.lower()
    location = location.lower()

    s_resell, _ = compute_dynamic_resale_price(category, location, "resell")
    s_refurbish, _ = compute_dynamic_resale_price(category, location, "refurbish")
    s_recycle, _ = compute_dynamic_resale_price(category, location, "recycle")

    selected, _ = compute_dynamic_resale_price(category, location, condition.lower())
    r_loc = data["processing_fees"][location]
    listing_price = round(selected - r_loc, 2)

    return {
        "category": category,
        "location": location.upper(),
        "condition": condition,
        "prices": {
            "resell": s_resell,
            "refurbish": s_refurbish,
            "recycle": s_recycle,
        },
        "selected_price": selected,
        "listing_price_shown": listing_price,
        "processing_fee_hidden": r_loc,
    }


# ─── 10. RETURN PREDICTOR ─────────────────────────────────────────────────────

@app.get("/api/return-predict")
def api_return_predict(category: str = "electrical_appliances", condition: str = "resell", price: float = 100, location: str = "delhi", ownership: str = "amazon"):
    """Predict return probability for a purchased product."""
    result = predict_return_probability(
        disposition_route=condition,
        seller_price=price,
        category=category,
        location=location,
        ownership=ownership
    )
    return result


# ─── 11. HEALTH CHECK ────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    """Health check — shows loaded classifiers and system status."""
    return {
        "status": "healthy",
        "clip_model": "loaded",
        "classifiers_loaded": list(CLASSIFIERS.keys()),
        "classifiers_missing": [
            cat for cat in CLASSIFIER_FILES if cat not in CLASSIFIERS
        ],
        "warehouses": list(data["probabilities"].keys()),
        "categories": list(data["base_resale_prices"].keys()),
    }


# ─── Run server ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
