"""
Comprehensive Test Suite for greencredit.py
============================================
SDET-grade tests covering all anticipated scenarios:
  1. Unit Tests: calculate_earned_credits
  2. Unit Tests: calculate_credit_discount
  3. Unit Tests: earn_credits (wallet)
  4. Unit Tests: redeem_credits (wallet)
  5. Unit Tests: expire_credits
  6. Unit Tests: adjust_credits
  7. Integration / Chained Journey Tests
  8. Edge Cases & Boundary Tests
"""

import pytest
from greencredit import (
    CREDITS_PER_RUPEE_SPENT, RUPEES_PER_CREDIT_REDEEMED,
    EARN_RATE_PCT, MAX_REDEEM_PCT,
    CreditWallet, CreditTransaction,
    calculate_earned_credits, calculate_credit_discount,
    earn_credits, redeem_credits, expire_credits, adjust_credits,
)


# ============================================================================
# 1. UNIT TESTS: calculate_earned_credits
# ============================================================================

class TestCalculateEarnedCredits:

    def test_standard_purchase(self):
        # ₹500 * 10% * 10 = 500 credits
        assert calculate_earned_credits(500.0) == 500

    def test_zero_purchase(self):
        assert calculate_earned_credits(0.0) == 0

    def test_negative_purchase(self):
        # Negative purchase amounts should return 0
        assert calculate_earned_credits(-100.0) == 0

    def test_large_purchase(self):
        # ₹100,000 * 10% * 10 = 100,000 credits
        assert calculate_earned_credits(100_000.0) == 100_000

    def test_fractional_purchase(self):
        # ₹15.50 * 0.10 * 10 = 15 (int truncation)
        assert calculate_earned_credits(15.50) == 15

    def test_very_small_purchase(self):
        # ₹0.99 * 0.10 * 10 = 0 (truncated)
        assert calculate_earned_credits(0.99) == 0

    @pytest.mark.parametrize("amount, expected", [
        (100.0,   100),
        (250.0,   250),
        (999.0,   999),
        (1000.0, 1000),
        (1.0,       1),
    ])
    def test_parametrized_earn(self, amount, expected):
        assert calculate_earned_credits(amount) == expected


# ============================================================================
# 2. UNIT TESTS: calculate_credit_discount
# ============================================================================

class TestCalculateCreditDiscount:

    def test_more_credits_than_needed_capped_at_50_pct(self):
        # 50% of ₹500 = ₹250 max discount → 2500 credits max burned
        burned, discount = calculate_credit_discount(5000, 500.0)
        assert burned == 2500
        assert discount == 250.0

    def test_exact_50pct_credits(self):
        # User has exactly enough to reach the 50% cap
        burned, discount = calculate_credit_discount(2500, 500.0)
        assert burned == 2500
        assert discount == 250.0

    def test_fewer_credits_than_cap(self):
        # User has 100 credits = ₹10 discount (far below 50% cap)
        burned, discount = calculate_credit_discount(100, 500.0)
        assert burned == 100
        assert discount == 10.0

    def test_zero_credits(self):
        burned, discount = calculate_credit_discount(0, 500.0)
        assert burned == 0
        assert discount == 0.0

    def test_zero_cart_total(self):
        burned, discount = calculate_credit_discount(1000, 0.0)
        assert burned == 0
        assert discount == 0.0

    def test_negative_credits(self):
        burned, discount = calculate_credit_discount(-500, 500.0)
        assert burned == 0
        assert discount == 0.0

    def test_negative_cart_total(self):
        burned, discount = calculate_credit_discount(1000, -500.0)
        assert burned == 0
        assert discount == 0.0

    def test_floating_point_cart_total(self):
        # ₹199.99 cart, 50% cap = ₹100.0 (rounded), user has 10000 credits
        burned, discount = calculate_credit_discount(10000, 199.99)
        assert discount == pytest.approx(100.0, abs=0.01)

    def test_custom_redeem_pct_100_pct(self):
        # Allow 100% redemption (override)
        burned, discount = calculate_credit_discount(5000, 500.0, max_redeem_pct=1.0)
        assert burned == 5000
        assert discount == 500.0

    def test_custom_redeem_pct_zero(self):
        # No redemption allowed
        burned, discount = calculate_credit_discount(5000, 500.0, max_redeem_pct=0.0)
        assert burned == 0
        assert discount == 0.0

    def test_1_credit_on_large_cart(self):
        # 1 credit = ₹0.1 discount on ₹10,000 cart
        burned, discount = calculate_credit_discount(1, 10_000.0)
        assert burned == 1
        assert discount == 0.1


# ============================================================================
# 3. UNIT TESTS: earn_credits (wallet operations)
# ============================================================================

class TestEarnCredits:

    def test_earn_adds_to_balance(self):
        wallet = CreditWallet()
        wallet = earn_credits(wallet, 1000.0)
        assert wallet.balance == 1000

    def test_earn_from_zero(self):
        wallet = CreditWallet(balance=0)
        wallet = earn_credits(wallet, 300.0)
        assert wallet.balance == 300

    def test_earn_is_additive(self):
        wallet = CreditWallet(balance=500)
        wallet = earn_credits(wallet, 500.0)
        assert wallet.balance == 1000

    def test_earn_logs_transaction(self):
        wallet = CreditWallet()
        wallet = earn_credits(wallet, 500.0, note="Test note")
        assert len(wallet.transactions) == 1
        assert wallet.transactions[0].type == "earned"
        assert wallet.transactions[0].amount == 500
        assert wallet.transactions[0].note == "Test note"

    def test_earn_zero_amount_does_nothing(self):
        wallet = CreditWallet(balance=100)
        wallet = earn_credits(wallet, 0.0)
        assert wallet.balance == 100
        assert len(wallet.transactions) == 0

    def test_earn_negative_amount_does_nothing(self):
        wallet = CreditWallet(balance=100)
        wallet = earn_credits(wallet, -200.0)
        assert wallet.balance == 100
        assert len(wallet.transactions) == 0

    def test_earn_does_not_mutate_original_wallet(self):
        # Verify immutable-style: original wallet should not change
        original = CreditWallet(balance=100)
        _ = earn_credits(original, 500.0)
        assert original.balance == 100


# ============================================================================
# 4. UNIT TESTS: redeem_credits (wallet operations)
# ============================================================================

class TestRedeemCredits:

    def test_basic_redemption(self):
        # 1000 credits = ₹100 discount. 50% cap on ₹500 = ₹250 (needs 2500 credits).
        # User only has 1000, so partial burn: 1000 credits → ₹100 off → final ₹400.
        wallet = CreditWallet(balance=1000)
        wallet, final = redeem_credits(wallet, 500.0)
        assert final == 400.0
        assert wallet.balance == 0  # all 1000 credits burned

    def test_50pct_cap_triggered(self):
        # User has WAY more credits than needed — confirm cap kicks in at exactly 50%
        wallet = CreditWallet(balance=10_000)
        wallet, final = redeem_credits(wallet, 500.0)
        assert final == 250.0  # 50% cap: max ₹250 off
        assert wallet.balance == 10_000 - 2500  # only 2500 credits burned, rest kept

    def test_partial_redemption_not_enough_credits(self):
        wallet = CreditWallet(balance=100)  # Only 100 credits = ₹10 discount
        wallet, final = redeem_credits(wallet, 500.0)
        assert final == 490.0
        assert wallet.balance == 0

    def test_zero_balance_no_discount(self):
        wallet = CreditWallet(balance=0)
        wallet, final = redeem_credits(wallet, 300.0)
        assert final == 300.0
        assert wallet.balance == 0

    def test_redemption_logs_transaction(self):
        wallet = CreditWallet(balance=500)
        wallet, _ = redeem_credits(wallet, 200.0)
        redeemed_txs = [t for t in wallet.transactions if t.type == "redeemed"]
        assert len(redeemed_txs) == 1
        assert redeemed_txs[0].amount < 0

    def test_redemption_does_not_go_negative(self):
        # Even if user uses all credits, balance should be 0 not negative
        wallet = CreditWallet(balance=50)
        wallet, _ = redeem_credits(wallet, 1000.0)
        assert wallet.balance == 0

    def test_zero_cart_total_no_redemption(self):
        wallet = CreditWallet(balance=1000)
        wallet, final = redeem_credits(wallet, 0.0)
        assert wallet.balance == 1000
        assert final == 0.0

    def test_final_total_never_negative(self):
        # Even if max discount exceeds cart (very small cart), final >= 0
        wallet = CreditWallet(balance=10_000)
        wallet, final = redeem_credits(wallet, 1.0)
        assert final >= 0.0


# ============================================================================
# 5. UNIT TESTS: expire_credits
# ============================================================================

class TestExpireCredits:

    def test_expire_partial(self):
        wallet = CreditWallet(balance=500)
        wallet = expire_credits(wallet, 200)
        assert wallet.balance == 300

    def test_expire_all(self):
        wallet = CreditWallet(balance=300)
        wallet = expire_credits(wallet, 300)
        assert wallet.balance == 0

    def test_expire_more_than_balance(self):
        # Should not go negative — expire only what is available
        wallet = CreditWallet(balance=100)
        wallet = expire_credits(wallet, 999)
        assert wallet.balance == 0

    def test_expire_zero(self):
        wallet = CreditWallet(balance=500)
        wallet = expire_credits(wallet, 0)
        assert wallet.balance == 500
        assert len(wallet.transactions) == 0

    def test_expire_logs_transaction(self):
        wallet = CreditWallet(balance=500)
        wallet = expire_credits(wallet, 100, note="Annual expiry")
        expired_txs = [t for t in wallet.transactions if t.type == "expired"]
        assert len(expired_txs) == 1
        assert expired_txs[0].amount == -100
        assert expired_txs[0].note == "Annual expiry"


# ============================================================================
# 6. UNIT TESTS: adjust_credits
# ============================================================================

class TestAdjustCredits:

    def test_positive_adjustment(self):
        wallet = CreditWallet(balance=100)
        wallet = adjust_credits(wallet, +500, note="Promo bonus")
        assert wallet.balance == 600

    def test_negative_adjustment(self):
        wallet = CreditWallet(balance=300)
        wallet = adjust_credits(wallet, -100)
        assert wallet.balance == 200

    def test_negative_adjustment_floors_at_zero(self):
        # Balance should never go below 0 from admin adjustment
        wallet = CreditWallet(balance=100)
        wallet = adjust_credits(wallet, -500)
        assert wallet.balance == 0

    def test_zero_adjustment(self):
        wallet = CreditWallet(balance=100)
        wallet = adjust_credits(wallet, 0)
        assert wallet.balance == 100

    def test_adjustment_logs_transaction(self):
        wallet = CreditWallet(balance=100)
        wallet = adjust_credits(wallet, +200, note="Referral bonus")
        adj_txs = [t for t in wallet.transactions if t.type == "adjusted"]
        assert len(adj_txs) == 1
        assert adj_txs[0].amount == 200
        assert adj_txs[0].note == "Referral bonus"


# ============================================================================
# 7. INTEGRATION / CHAINED JOURNEY TESTS
# ============================================================================

class TestCreditJourneys:

    def test_journey_a_new_user_earns_and_spends(self):
        """
        A brand new user makes their first purchase, earns credits,
        then uses those credits on their second purchase.
        """
        wallet = CreditWallet()

        # First purchase: ₹2000
        wallet = earn_credits(wallet, 2000.0)
        assert wallet.balance == 2000  # 2000 * 0.1 * 10

        # Second purchase: ₹1000, uses green credits
        wallet, final = redeem_credits(wallet, 1000.0)
        # 50% cap = ₹500, requires 5000 credits. User has 2000 → burns 2000 = ₹200 discount
        assert final == 800.0
        assert wallet.balance == 0

    def test_journey_b_heavy_shopper_accumulates_then_redeems(self):
        """
        A power user makes 5 purchases, accumulates large balance,
        then redeems on one big purchase.
        """
        wallet = CreditWallet()
        purchases = [500, 1200, 300, 800, 1000]
        expected_earned = sum(calculate_earned_credits(p) for p in purchases)

        for p in purchases:
            wallet = earn_credits(wallet, float(p))
        assert wallet.balance == expected_earned  # 3800 credits

        # Big purchase: ₹5000
        wallet, final = redeem_credits(wallet, 5000.0)
        # 50% cap = ₹2500 = 25000 credits. User has 3800 → burns 3800 = ₹380 discount
        assert final == 4620.0
        assert wallet.balance == 0

    def test_journey_c_expiry_then_earn_and_use(self):
        """
        User has old credits that expire, then earns new ones and uses them.
        """
        wallet = CreditWallet(balance=5000)

        # Annual expiry of 4000 credits
        wallet = expire_credits(wallet, 4000)
        assert wallet.balance == 1000

        # Makes a purchase: ₹200
        wallet = earn_credits(wallet, 200.0)
        assert wallet.balance == 1200

        # Uses credits on a ₹100 cart
        wallet, final = redeem_credits(wallet, 100.0)
        # 50% cap = ₹50 = 500 credits. Burns 500, discount ₹50
        assert final == 50.0
        assert wallet.balance == 700

    def test_journey_d_full_admin_correction_flow(self):
        """
        Admin accidentally gives too many credits, then corrects with negative adjustment.
        """
        wallet = CreditWallet(balance=100)

        # Error: gave 10,000 credits by mistake
        wallet = adjust_credits(wallet, +10_000, note="ERROR: over-credited")
        assert wallet.balance == 10_100

        # Correction: remove 10,000
        wallet = adjust_credits(wallet, -10_000, note="Correction")
        assert wallet.balance == 100  # Back to original

        assert len(wallet.transactions) == 2

    def test_journey_e_repeated_small_redemptions_drain_to_zero(self):
        """
        A user makes 4 small purchases, then redeems on each.
        Balance should smoothly drain to near zero.
        """
        wallet = CreditWallet()
        
        # Earn from 4 purchases
        wallet = earn_credits(wallet, 100.0)  # +100
        wallet = earn_credits(wallet, 200.0)  # +200
        wallet = earn_credits(wallet, 150.0)  # +150
        wallet = earn_credits(wallet, 50.0)   # +50
        assert wallet.balance == 500

        # Redeem on 4 small carts (₹20 each — max 50% = ₹10 = 100 credits per transaction)
        for _ in range(4):
            wallet, _ = redeem_credits(wallet, 20.0)
        
        # Each burns 100 credits, 4 * 100 = 400 burned
        assert wallet.balance == 100

    def test_journey_f_mega_lifecycle_30_days(self):
        """
        Mega scenario: 30-day journey with earn, expire, redeem, adjustment, and full history.
        """
        wallet = CreditWallet()

        # Week 1: Multiple purchases
        wallet = earn_credits(wallet, 1000.0, note="Week 1 purchase 1")  # +1000
        wallet = earn_credits(wallet, 500.0, note="Week 1 purchase 2")   # +500
        assert wallet.balance == 1500

        # Week 2: Partial redemption on a ₹800 cart
        wallet, final_w2 = redeem_credits(wallet, 800.0)
        # 50% of 800 = ₹400 = 4000 credits. User has 1500 → burns 1500 = ₹150 discount
        assert final_w2 == 650.0
        assert wallet.balance == 0

        # Week 3: Admin promo bonus
        wallet = adjust_credits(wallet, +300, note="Festive bonus")
        assert wallet.balance == 300

        # Week 4: More purchases
        wallet = earn_credits(wallet, 750.0)  # +750
        assert wallet.balance == 1050

        # End of month: Annual expiry of 200 credits
        wallet = expire_credits(wallet, 200)
        assert wallet.balance == 850

        # Final big cart: ₹2000
        wallet, final = redeem_credits(wallet, 2000.0)
        # 50% of 2000 = ₹1000 = 10000 credits. User has 850 → burns 850 = ₹85 discount
        assert final == 1915.0
        assert wallet.balance == 0

        # Verify transaction log integrity
        tx_types = [t.type for t in wallet.transactions]
        assert tx_types.count("earned") == 3
        assert tx_types.count("redeemed") == 2
        assert tx_types.count("adjusted") == 1
        assert tx_types.count("expired") == 1
        assert len(wallet.transactions) == 7


# ============================================================================
# 8. EDGE CASES & BOUNDARY TESTS
# ============================================================================

class TestEdgeCases:

    def test_earn_exactly_1_rupee(self):
        # ₹1 → 0.10 * 10 = 1 credit
        assert calculate_earned_credits(1.0) == 1

    def test_earn_just_below_threshold(self):
        # ₹0.9 → int(0.9 * 0.1 * 10) = int(0.9) = 0
        assert calculate_earned_credits(0.9) == 0

    def test_redeem_1_credit_on_large_cart(self):
        wallet = CreditWallet(balance=1)
        wallet, final = redeem_credits(wallet, 10_000.0)
        assert final == 9999.9
        assert wallet.balance == 0

    def test_redeem_on_cart_total_of_1_rupee(self):
        wallet = CreditWallet(balance=10_000)
        wallet, final = redeem_credits(wallet, 1.0)
        # 50% of ₹1 = ₹0.5 = 5 credits
        assert final == 0.5
        assert wallet.balance == 10_000 - 5

    def test_balance_immutability_across_earn(self):
        w1 = CreditWallet(balance=0)
        w2 = earn_credits(w1, 100.0)
        assert w1.balance == 0   # original unchanged
        assert w2.balance == 100

    def test_balance_immutability_across_redeem(self):
        w1 = CreditWallet(balance=500)
        w2, _ = redeem_credits(w1, 200.0)
        assert w1.balance == 500  # original unchanged

    def test_all_transaction_types_present_in_log(self):
        wallet = CreditWallet()
        wallet = earn_credits(wallet, 100.0)
        wallet, _ = redeem_credits(wallet, 50.0)
        wallet = earn_credits(wallet, 200.0)
        wallet = expire_credits(wallet, 50)
        wallet = adjust_credits(wallet, +10)

        types = {t.type for t in wallet.transactions}
        assert "earned" in types
        assert "redeemed" in types
        assert "expired" in types
        assert "adjusted" in types

    def test_large_cart_small_credits_precision(self):
        # ₹1,23,456.78 cart, 50 credits (= ₹5 discount)
        burned, discount = calculate_credit_discount(50, 123456.78)
        assert burned == 50
        assert discount == 5.0

    @pytest.mark.parametrize("balance, cart, expected_final", [
        (0,     500.0, 500.0),   # No credits
        (10,    500.0, 499.0),   # 10 credits = ₹1 off
        (5000,  500.0, 250.0),   # Capped at 50%
        (2500,  500.0, 250.0),   # Exactly at cap
        (2499,  500.0, 250.1),   # Just under cap
        (100,  1000.0, 990.0),   # Small credits on big cart
    ])
    def test_redeem_parametrized_matrix(self, balance, cart, expected_final):
        wallet = CreditWallet(balance=balance)
        _, final = redeem_credits(wallet, cart)
        assert final == pytest.approx(expected_final, abs=0.01)
