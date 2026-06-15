"""
Photo Verification Engine for Returns
=======================================
Uses CLIP to compare the original product image against the buyer's return photo.
If similarity >= 85%, the return is approved. Otherwise, it's flagged as a mismatch.

This reuses the CLIP model already loaded in main.py (no duplicate loading).
"""

import numpy as np
from PIL import Image
from sklearn.preprocessing import normalize

# Threshold for return approval — 85% cosine similarity
RETURN_VERIFY_THRESHOLD = 0.85


def verify_return_photo(clip_model, clip_processor, original_image_path: str, return_image_path: str) -> dict:
    """
    Compare original product image with the return photo using CLIP embeddings.

    Args:
        clip_model: Loaded CLIPModel instance
        clip_processor: Loaded CLIPProcessor instance
        original_image_path: Path to the original product listing image
        return_image_path: Path to the photo uploaded by the buyer at return time

    Returns:
        dict with similarity score, match status, and verdict
    """
    import torch

    def _extract_embedding(image_path: str):
        image = Image.open(image_path).convert("RGB")
        inputs = clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = clip_model.vision_model(pixel_values=inputs["pixel_values"])
        features = outputs.pooler_output.cpu().numpy().squeeze()
        return normalize(features.reshape(1, -1)).squeeze()

    emb_original = _extract_embedding(original_image_path)
    emb_return = _extract_embedding(return_image_path)

    similarity = float(np.dot(emb_original, emb_return))
    is_verified = similarity >= RETURN_VERIFY_THRESHOLD

    if is_verified:
        verdict = "VERIFIED — Product matches. Return approved."
    else:
        verdict = "REJECTED — Product does not match the original. Return denied."

    return {
        "similarity": round(similarity, 4),
        "threshold": RETURN_VERIFY_THRESHOLD,
        "is_verified": is_verified,
        "verdict": verdict,
    }
