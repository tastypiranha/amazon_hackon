import sys
import os

# Add current directory to path to ensure we can import green_engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from green_engine import (
    CATEGORY_BASE_POINTS, 
    DISPOSITION_MULTIPLIERS, 
    TransactionDTO,
    calculate_co2_savings,
    calculate_disposition_reward
)

def generate_matrix():
    markdown_lines = []
    markdown_lines.append("# Green Engine - Scenario Matrix\n")
    markdown_lines.append("This table illustrates the final Green Points rewarded across all base permutations.\n")
    
    # Table header
    markdown_lines.append("| Category | Is Local P2P | Disposition Route | Base Points | Final Points | Multiplier |")
    markdown_lines.append("|---|---|---|---|---|---|")
    
    # Generate all permutations
    for category in CATEGORY_BASE_POINTS.keys():
        for is_local in [False, True]:
            for route in DISPOSITION_MULTIPLIERS.keys():
                dto = TransactionDTO(
                    category=category,
                    is_local_p2p=is_local,
                    disposition_route=route,
                    condition_delta_percentage=0.0,
                    logistics_fee=0.0
                )
                
                # Calculate
                base_points = calculate_co2_savings(dto)
                final_points = calculate_disposition_reward(dto, base_points)
                multiplier = DISPOSITION_MULTIPLIERS[route]
                
                # Format strings
                local_str = "Yes" if is_local else "No"
                category_str = category.replace("_", " ").title()
                route_str = route.title()
                
                markdown_lines.append(
                    f"| {category_str} | {local_str} | {route_str} | {base_points} | **{final_points}** | {multiplier}x |"
                )

    output = "\n".join(markdown_lines)
    
    # Print to console
    print(output)
    
    # Save to file
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "matrix_output.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n[Matrix successfully written to {out_path}]")

if __name__ == "__main__":
    generate_matrix()
