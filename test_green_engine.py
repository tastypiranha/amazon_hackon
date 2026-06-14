import pytest
from datetime import datetime, timedelta
from green_engine import (
    TransactionDTO, EscrowRecord,
    calculate_co2_savings, calculate_disposition_reward,
    process_transaction_points, unlock_escrow,
    calculate_damage_penalty, apply_fee_waiver,
    CATEGORY_BASE_POINTS, DISPOSITION_MULTIPLIERS, PROXIMITY_BONUS,
    RETURN_WINDOWS_DAYS, MAX_DAMAGE_PENALTY_POINTS, POINTS_PER_RUPEE
)

# ============================================================================
# 1. EXTREME EDGE CASES & BOUNDARY TESTING
# ============================================================================

class TestConditionExtremes:
    """Tests extreme boundary limits for condition_delta_percentage."""
    
    @pytest.mark.parametrize("delta, expected_penalty", [
        (0.0, 0),
        (-10.0, 0),         # Negative delta should arguably be 0 penalty (item got better?)
        (100.0, -MAX_DAMAGE_PENALTY_POINTS),
        (150.0, int(-1.5 * MAX_DAMAGE_PENALTY_POINTS)), # Can penalty exceed max? Current logic allows unbounded scaling.
        (0.0001, 0),        # extremely small
    ])
    def test_damage_penalty_boundaries(self, delta, expected_penalty):
        dto = TransactionDTO("laptops", False, "resell", delta, 0.0)
        assert calculate_damage_penalty(dto) == expected_penalty


class TestLogisticsFeeExtremes:
    """Tests extreme values for logistics_fee in fee waiver."""

    def test_zero_fee(self):
        burned, remainder = apply_fee_waiver(1000, 0.0)
        assert burned == 0
        assert remainder == 0.0

    def test_negative_fee(self):
        burned, remainder = apply_fee_waiver(1000, -50.0)
        assert burned == 0
        assert remainder == 0.0

    def test_massive_fee_partial_burn(self):
        # Massive fee requires 1_000_000 * 10 = 10_000_000 points. User has 5_000.
        burned, remainder = apply_fee_waiver(5000, 1_000_000.0)
        assert burned == 5000
        assert remainder == 1_000_000.0 - (5000 / POINTS_PER_RUPEE)


class TestStringHandling:
    """Tests case sensitivity and whitespace handling."""

    def test_category_case_insensitivity_and_whitespace(self):
        # Current logic uses .lower() but does NOT strip whitespace. 
        # This test documents expected behavior (it throws ValueError if whitespace isn't handled).
        # We will strip whitespace in test data to simulate what API might do,
        # or assert raises if the engine doesn't handle it gracefully.
        with pytest.raises(ValueError, match="Unknown category"):
            dto = TransactionDTO(" LAPTOPS ", False, "resell", 0.0, 0.0)
            calculate_co2_savings(dto)

        # But it should handle pure case insensitivity
        dto_upper = TransactionDTO("LAPTOPS", False, "resell", 0.0, 0.0)
        assert calculate_co2_savings(dto_upper) == CATEGORY_BASE_POINTS["laptops"]

    def test_disposition_route_case_insensitivity(self):
        # disposition_route uses .lower(), defaults to 1.0 if not found
        dto = TransactionDTO("laptops", False, "ReCycle", 0.0, 0.0)
        base = CATEGORY_BASE_POINTS["laptops"]
        assert calculate_disposition_reward(dto, base) == base * DISPOSITION_MULTIPLIERS["recycle"]

        # Bad route falls back to 1.0 multiplier
        dto_bad = TransactionDTO("laptops", False, " Unknown Route ", 0.0, 0.0)
        assert calculate_disposition_reward(dto_bad, base) == base * 1.0


class TestFloatingPointPrecision:
    """Tests floating point precision issues."""

    def test_fee_waiver_precision(self):
        fee = 150.33
        points = 801 # Covers 80.1 rupees. Remainder should be 70.23
        burned, remainder = apply_fee_waiver(points, fee)
        assert burned == 801
        assert remainder == pytest.approx(70.23, 0.001)


class TestEscrowMicrosecondBoundaries:
    """Tests unlocking an escrow exactly at the microsecond boundary."""

    def test_exact_microsecond_unlock(self):
        now = datetime.now()
        dto = TransactionDTO("laptops", False, "resell", 0.0, 0.0)
        record = process_transaction_points(dto, 1000, now)
        
        # Exact time of unlock
        exact_unlock = record.unlock_date
        
        # 1 microsecond before
        unlocked_before = unlock_escrow(record, exact_unlock - timedelta(microseconds=1))
        assert unlocked_before.status == "PENDING"
        
        # Exact microsecond
        unlocked_exact = unlock_escrow(record, exact_unlock)
        assert unlocked_exact.status == "AVAILABLE"


# ============================================================================
# 2. COMPLEX CHAINED SCENARIOS (INTEGRATION TESTS)
# ============================================================================

class TestIntegrationScenarios:

    def test_scenario_a_high_reward_immediate_burn(self):
        """
        Scenario A: A user buys a highly-rewarded item (Vehicle, local P2P, Donated), 
        receives points in escrow, the escrow unlocks after 0 days, they immediately 
        burn those points for a massive fee waiver, and we check their exact remaining balance.
        """
        now = datetime.now()
        dto = TransactionDTO(
            category="vehicle",
            is_local_p2p=True,
            disposition_route="donate",
            condition_delta_percentage=0.0,
            logistics_fee=0.0
        )
        
        # 1. Calculate base points
        base = calculate_co2_savings(dto)
        assert base == CATEGORY_BASE_POINTS["vehicle"] + PROXIMITY_BONUS # 5000 + 500 = 5500
        
        # 2. Apply Disposition Multiplier
        final_points = calculate_disposition_reward(dto, base)
        assert final_points == 5500 * DISPOSITION_MULTIPLIERS["donate"] # 5500 * 3 = 16500
        
        # 3. Process into Escrow
        record = process_transaction_points(dto, final_points, now)
        assert record.days_until_unlock == 0 # Vehicles are final sale
        
        # 4. Unlock immediately
        unlocked = unlock_escrow(record, now)
        assert unlocked.status == "AVAILABLE"
        
        # 5. Burn for a massive fee waiver (Fee is 2000 rupees -> requires 20,000 points)
        user_balance = unlocked.points # 16500
        burned, remainder = apply_fee_waiver(user_balance, 2000.0)
        
        assert burned == 16500
        assert remainder == 2000.0 - (16500 / POINTS_PER_RUPEE) # 2000 - 1650 = 350.0
        assert (user_balance - burned) == 0


    def test_scenario_b_last_day_fraud_return(self):
        """
        Scenario B: A user tries to return an item on the last day of the return window, 
        but they heavily damaged the item (85% condition delta). Void the escrow, 
        apply the penalty, and show the user going into negative points.
        """
        now = datetime.now()
        dto = TransactionDTO(
            category="clothing",
            is_local_p2p=False,
            disposition_route="resell",
            condition_delta_percentage=85.0, # 85% damage
            logistics_fee=0.0
        )
        
        user_balance = 200 # Initial balance
        
        base = calculate_co2_savings(dto)
        final_points = calculate_disposition_reward(dto, base)
        record = process_transaction_points(dto, final_points, now)
        
        assert record.days_until_unlock == RETURN_WINDOWS_DAYS["clothing"] # 15 days
        
        # Fast forward to last day of return window (day 15 - 1 second)
        last_day = now + timedelta(days=15) - timedelta(seconds=1)
        record = unlock_escrow(record, last_day)
        
        # Should still be pending
        assert record.status == "PENDING"
        
        # Item returned -> Escrow Voided
        record.status = "VOIDED"
        
        # Apply damage penalty
        penalty = calculate_damage_penalty(dto)
        assert penalty == -int(0.85 * MAX_DAMAGE_PENALTY_POINTS) # -8500
        
        # Update user balance
        user_balance += penalty
        
        assert user_balance == 200 - 8500 # -8300
        assert user_balance < 0


    def test_scenario_c_consecutive_partial_waivers(self):
        """
        Scenario C: A user uses partial fee waivers consecutively across 3 different 
        transactions, draining a specific point balance down to zero seamlessly.
        """
        user_balance = 535 # User has 535 points (covers 53.5 rupees)
        
        # Transaction 1: Fee is 20 rupees. Requires 200 points.
        burned1, rem1 = apply_fee_waiver(user_balance, 20.0)
        assert burned1 == 200
        assert rem1 == 0.0
        user_balance -= burned1 # 335 left
        
        # Transaction 2: Fee is 30 rupees. Requires 300 points.
        burned2, rem2 = apply_fee_waiver(user_balance, 30.0)
        assert burned2 == 300
        assert rem2 == 0.0
        user_balance -= burned2 # 35 left
        
        # Transaction 3: Fee is 10 rupees. Requires 100 points.
        burned3, rem3 = apply_fee_waiver(user_balance, 10.0)
        assert burned3 == 35 # Only 35 points left to burn
        assert rem3 == 10.0 - 3.5 # 6.5 rupees remaining
        user_balance -= burned3 # 0 left
        
        assert user_balance == 0

    def test_scenario_d_mega_lifecycle_simulation(self):
        """
        Scenario D: The Mega E-Commerce Lifecycle Simulation
        Simulates a user's journey over 30 days involving multiple purchases, 
        time advancement, an escrowed return with damage, an immediate vehicle purchase, 
        and a massive point burn.
        """
        user_balance = 0
        day_0 = datetime.now()
        
        # --- DAY 1: Buys a Refurbished Laptop (Local P2P) ---
        dto_laptop = TransactionDTO("laptops", True, "refurbish", 0.0, 0.0)
        base_laptop = calculate_co2_savings(dto_laptop) # 1500 + 500 = 2000
        final_laptop = calculate_disposition_reward(dto_laptop, base_laptop) # 2000 * 1.5 = 3000
        
        day_1 = day_0 + timedelta(days=1)
        escrow_laptop = process_transaction_points(dto_laptop, final_laptop, day_1)
        assert escrow_laptop.days_until_unlock == 7
        
        # --- DAY 3: Buys Donated Clothing (Nationwide) ---
        dto_clothing = TransactionDTO("clothing", False, "donate", 0.0, 0.0)
        base_clothing = calculate_co2_savings(dto_clothing) # 150
        final_clothing = calculate_disposition_reward(dto_clothing, base_clothing) # 150 * 3.0 = 450
        
        day_3 = day_0 + timedelta(days=3)
        escrow_clothing = process_transaction_points(dto_clothing, final_clothing, day_3)
        assert escrow_clothing.days_until_unlock == 15
        
        # --- DAY 5: Returns the Laptop (20% Damage) ---
        day_5 = day_0 + timedelta(days=5)
        # Laptop is returned within 7 days, so escrow is voided.
        escrow_laptop.status = "VOIDED"
        
        # Apply 20% damage penalty on the laptop return
        dto_laptop_return = TransactionDTO("laptops", True, "refurbish", 20.0, 0.0)
        penalty = calculate_damage_penalty(dto_laptop_return)
        assert penalty == -2000 # 20% of 10000
        user_balance += penalty # user_balance is now -2000
        
        # --- DAY 10: Buys a Vehicle (Nationwide, Resell) ---
        dto_vehicle = TransactionDTO("vehicle", False, "resell", 0.0, 0.0)
        base_vehicle = calculate_co2_savings(dto_vehicle) # 5000
        final_vehicle = calculate_disposition_reward(dto_vehicle, base_vehicle) # 5000 * 1.0 = 5000
        
        day_10 = day_0 + timedelta(days=10)
        escrow_vehicle = process_transaction_points(dto_vehicle, final_vehicle, day_10)
        assert escrow_vehicle.days_until_unlock == 0
        
        # Vehicle unlocks immediately
        escrow_vehicle = unlock_escrow(escrow_vehicle, day_10)
        assert escrow_vehicle.status == "AVAILABLE"
        user_balance += escrow_vehicle.points # -2000 + 5000 = 3000
        
        # --- DAY 20: Clothing Escrow Unlocks ---
        day_20 = day_0 + timedelta(days=20)
        # Clothing was bought on Day 3, 15 days escrow -> unlocks Day 18. By Day 20 it should unlock.
        escrow_clothing = unlock_escrow(escrow_clothing, day_20)
        assert escrow_clothing.status == "AVAILABLE"
        user_balance += escrow_clothing.points # 3000 + 450 = 3450
        
        # --- DAY 25: Massive Purchase requiring 500 rupee logistics fee ---
        day_25 = day_0 + timedelta(days=25)
        fee = 500.0 # Requires 5000 points
        
        # User has 3450 points. Will burn all 3450 points and pay remainder.
        burned, remainder = apply_fee_waiver(user_balance, fee)
        assert burned == 3450
        assert remainder == 500.0 - (3450 / 10) # 500 - 345 = 155.0
        
        user_balance -= burned # 3450 - 3450 = 0
        
        assert user_balance == 0
        assert escrow_laptop.status == "VOIDED"
        assert escrow_clothing.status == "AVAILABLE"
        assert escrow_vehicle.status == "AVAILABLE"
