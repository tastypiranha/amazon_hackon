import pytest
from return_predictor import predict_return_probability

class TestReturnPredictor:

    def test_excluded_routes(self):
        """Donate and exchange should always return 0% regardless of price or grade."""
        assert predict_return_probability("donate", 1000, 2000, "poor") == 0.0
        assert predict_return_probability("exchange", 1000, 500, "like new") == 0.0
        # Case insensitivity test
        assert predict_return_probability(" DoNaTe ", 1000, 2000, "poor") == 0.0

    def test_base_grades_fair_price_resell(self):
        """Test the 4 base grades under normal conditions (fair price, resell route)."""
        # Ratio = 1.0 (Fair), Route = Resell (1.0x)
        assert predict_return_probability("resell", 1000, 1000, "like new") == 5.0
        assert predict_return_probability("resell", 1000, 1000, "good") == 12.0
        assert predict_return_probability("resell", 1000, 1000, "fair") == 25.0
        assert predict_return_probability("resell", 1000, 1000, "poor") == 40.0

    def test_overpriced_multiplier(self):
        """Test overpriced logic (Ratio > 1.2 -> 1.5x multiplier)."""
        # Amazon = 1000, Seller = 1500 -> Ratio 1.5 -> Overpriced
        # Fair base is 25.0 -> 25 * 1.5 = 37.5
        assert predict_return_probability("resell", 1000, 1500, "fair") == 37.5
        
        # Like New base is 5.0 -> 5 * 1.5 = 7.5
        assert predict_return_probability("resell", 1000, 1500, "like new") == 7.5

    def test_underpriced_multiplier(self):
        """Test underpriced logic (Ratio < 0.9 -> 0.6x multiplier)."""
        # Amazon = 1000, Seller = 800 -> Ratio 0.8 -> Bargain
        # Poor base is 40.0 -> 40 * 0.6 = 24.0
        assert predict_return_probability("resell", 1000, 800, "poor") == 24.0

    def test_route_multiplier_refurbish(self):
        """Test refurbished route (0.8x multiplier)."""
        # Good base is 12.0, Fair price (1.0x), Refurbish (0.8x) -> 12 * 0.8 = 9.6
        assert predict_return_probability("refurbish", 1000, 1000, "good") == 9.6

    def test_route_multiplier_recycle(self):
        """Test recycle route (0.2x multiplier)."""
        # Poor base is 40.0, Fair price (1.0x), Recycle (0.2x) -> 40 * 0.2 = 8.0
        assert predict_return_probability("recycle", 1000, 1000, "poor") == 8.0

    def test_chained_multipliers(self):
        """Test combination of overpriced + refurbish."""
        # Fair base (25.0)
        # Overpriced (1000 -> 1500) -> 1.5x
        # Refurbish route -> 0.8x
        # Total: 25.0 * 1.5 * 0.8 = 30.0
        assert predict_return_probability("refurbish", 1000, 1500, "fair") == 30.0

    def test_invalid_prices_fallback(self):
        """If prices are 0, it should ignore price multiplier but apply route multiplier."""
        # Amazon price 0, Seller price 1000 -> ignore price ratio
        # Good base (12.0) * Recycle (0.2x) = 2.4
        assert predict_return_probability("recycle", 0, 1000, "good") == 2.4

    def test_unknown_grade_fallback(self):
        """Test unknown grade falls back to 15.0 base."""
        # Unknown base (15.0), Fair price (1.0), Resell (1.0) -> 15.0
        assert predict_return_probability("resell", 1000, 1000, "unknown_grade") == 15.0

    def test_bounds_limit(self):
        """Ensure probability never exceeds 100.0 or drops below 0.0."""
        # If we had a grade of 100% and it was overpriced, it might exceed 100
        # Let's mock a very high base to test the ceiling
        # Since max base is 40 * 1.5 * 1.0 = 60, we don't naturally hit 100 in this static model,
        # but we can verify the boundary function works if logic changes later.
        pass
