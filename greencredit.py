from __future__ import annotations
from dataclasses import dataclass, field
from typing import Tuple, List
from datetime import datetime

# ============================================================================
# AMAZON RELIFE - Green Credit Engine
# ============================================================================
# Handles the FINANCIAL side of the Green economy:
#   - Green Credits earned at checkout (10% of purchase amount, in credits)
#   - Credit redemption (100 credits = ₹10, i.e. 10 credits = ₹1)
#   - Credit wallet state management (earn, redeem, expire)
#
# Strictly separate from green_engine.py which handles CO2 / gamification.
# ============================================================================

# ─── CONSTANTS ──────────────────────────────────────────────────────────────
CREDITS_PER_RUPEE_SPENT   = 10    # 10 credits earned per ₹1 spent
RUPEES_PER_CREDIT_REDEEMED = 10   # 10 credits = ₹1 discount
EARN_RATE_PCT             = 0.10  # 10% of purchase amount back as credits
MAX_REDEEM_PCT            = 0.50  # Cannot use credits for more than 50% of any bill

# ─── DATA MODELS ────────────────────────────────────────────────────────────
@dataclass
class CreditTransaction:
    """Represents a single credit earn/redeem event."""
    amount: int          # Positive = earned, Negative = redeemed/expired
    type: str            # "earned" | "redeemed" | "expired" | "adjusted"
    timestamp: datetime
    note: str = ""


@dataclass
class CreditWallet:
    """The user's live credit wallet."""
    balance: int = 0
    transactions: List[CreditTransaction] = field(default_factory=list)


# ─── CORE FUNCTIONS ─────────────────────────────────────────────────────────

def calculate_earned_credits(purchase_amount: float) -> int:
    """
    Calculate how many Green Credits a user earns from a purchase.
    Rule: 10% of purchase amount, converted at 10 credits per rupee.

    E.g.: ₹500 purchase → 500 * 0.10 * 10 = 500 credits
    """
    if purchase_amount <= 0:
        return 0
    return int(purchase_amount * EARN_RATE_PCT * CREDITS_PER_RUPEE_SPENT)


def calculate_credit_discount(
    available_credits: int,
    cart_total: float,
    max_redeem_pct: float = MAX_REDEEM_PCT
) -> Tuple[int, float]:
    """
    Calculate how many credits to burn and the resulting rupee discount.

    Rules:
    - 10 credits = ₹1 discount.
    - Cannot redeem more than `max_redeem_pct` (50%) of the cart total.
    - Cannot redeem more credits than the user has.

    Returns:
        (credits_burned, rupee_discount)
    """
    if available_credits <= 0 or cart_total <= 0:
        return (0, 0.0)

    max_discount_rupees = round(cart_total * max_redeem_pct, 2)
    max_credits_for_max_discount = int(max_discount_rupees * RUPEES_PER_CREDIT_REDEEMED)

    # How many credits can actually be burned?
    credits_to_burn = min(available_credits, max_credits_for_max_discount)
    rupee_discount = round(credits_to_burn / RUPEES_PER_CREDIT_REDEEMED, 2)

    return (credits_to_burn, rupee_discount)


def earn_credits(wallet: CreditWallet, purchase_amount: float, note: str = "") -> CreditWallet:
    """
    Add earned credits to a wallet after a successful purchase.
    Returns an updated wallet (immutable-style; original is not modified).
    """
    credits = calculate_earned_credits(purchase_amount)
    if credits <= 0:
        return wallet

    new_tx = CreditTransaction(
        amount=credits,
        type="earned",
        timestamp=datetime.now(),
        note=note or f"Earned from ₹{purchase_amount} purchase"
    )
    return CreditWallet(
        balance=wallet.balance + credits,
        transactions=wallet.transactions + [new_tx]
    )


def redeem_credits(
    wallet: CreditWallet,
    cart_total: float,
    note: str = ""
) -> Tuple[CreditWallet, float]:
    """
    Redeem credits against a cart total.

    Returns:
        (updated_wallet, final_cart_total_after_discount)
    """
    credits_burned, discount = calculate_credit_discount(wallet.balance, cart_total)

    if credits_burned <= 0:
        return (wallet, cart_total)

    new_tx = CreditTransaction(
        amount=-credits_burned,
        type="redeemed",
        timestamp=datetime.now(),
        note=note or f"Redeemed for ₹{discount} discount on ₹{cart_total} cart"
    )
    new_wallet = CreditWallet(
        balance=wallet.balance - credits_burned,
        transactions=wallet.transactions + [new_tx]
    )
    final_total = round(cart_total - discount, 2)
    return (new_wallet, final_total)


def expire_credits(wallet: CreditWallet, amount: int, note: str = "Credits expired") -> CreditWallet:
    """
    Forcibly expire a given number of credits from the wallet (e.g. annual expiry).
    Cannot expire more than available balance.
    """
    expire_amount = min(amount, wallet.balance)
    if expire_amount <= 0:
        return wallet

    new_tx = CreditTransaction(
        amount=-expire_amount,
        type="expired",
        timestamp=datetime.now(),
        note=note
    )
    return CreditWallet(
        balance=wallet.balance - expire_amount,
        transactions=wallet.transactions + [new_tx]
    )


def adjust_credits(wallet: CreditWallet, delta: int, note: str = "") -> CreditWallet:
    """
    Manual admin adjustment (positive or negative).
    Balance is floored at 0 for negative adjustments.
    """
    new_balance = max(0, wallet.balance + delta)
    new_tx = CreditTransaction(
        amount=delta,
        type="adjusted",
        timestamp=datetime.now(),
        note=note or f"Admin adjustment: {delta:+d}"
    )
    return CreditWallet(
        balance=new_balance,
        transactions=wallet.transactions + [new_tx]
    )


# ============================================================================
# QUICK VERIFICATION SUITE
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print(" AMAZON RELIFE: GREEN CREDIT ENGINE VERIFICATION")
    print("="*60)

    # TEST 1: Earn credits from a purchase
    print("\n[TEST 1] Earn Credits")
    wallet = CreditWallet()
    wallet = earn_credits(wallet, 1000.0)
    print(f"  -> ₹1000 purchase -> Earned: {wallet.balance} credits (expected 1000)")
    assert wallet.balance == 1000

    # TEST 2: Redeem credits, capped at 50%
    print("\n[TEST 2] Redeem credits (50% cap)")
    wallet2 = CreditWallet(balance=5000)
    wallet2, total = redeem_credits(wallet2, 500.0)
    print(f"  -> 5000 credits on ₹500 cart -> Discount: ₹{500-total}, Final: ₹{total}")
    assert total == 250.0  # 50% of 500

    # TEST 3: Not enough credits for max cap
    print("\n[TEST 3] Partial redemption")
    wallet3 = CreditWallet(balance=100)
    wallet3, total3 = redeem_credits(wallet3, 500.0)
    print(f"  -> 100 credits on ₹500 cart -> Discount: ₹{500-total3}, Final: ₹{total3}")
    assert total3 == 490.0  # 100 credits = ₹10 discount

    # TEST 4: Expire credits
    print("\n[TEST 4] Expire credits")
    wallet4 = CreditWallet(balance=300)
    wallet4 = expire_credits(wallet4, 200)
    print(f"  -> Expired 200 from 300 -> Remaining: {wallet4.balance} (expected 100)")
    assert wallet4.balance == 100

    print("\n" + "="*60 + "\n")
    print("All verification tests passed!")
