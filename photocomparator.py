import torch
import numpy as np
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

# Load CLIP model (same one used by your classifiers — cached after first load)
print("Loading CLIP model...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("Model loaded!")

# Similarity threshold: above this = same product (tune as needed)
SIMILARITY_THRESHOLD = 0.90


def get_image_embedding(image_path):
    """Extract a normalized CLIP embedding for a product image."""
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model.vision_model(pixel_values=inputs["pixel_values"])
    features = outputs.pooler_output  # shape: [1, 768]
    # Normalize to unit vector for cosine similarity
    features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().squeeze()


def compare_products(image_path_1, image_path_2):
    """
    Compare two product images and determine if they are the same item.
    Returns similarity score (0 to 1) and match verdict.
    """
    emb1 = get_image_embedding(image_path_1)
    emb2 = get_image_embedding(image_path_2)

    # Cosine similarity (embeddings are already normalized)
    similarity = float(np.dot(emb1, emb2))

    is_match = similarity >= SIMILARITY_THRESHOLD
    return similarity, is_match


# ============================================================================
# DEMO: Compare two product photos
# ============================================================================
if __name__ == "__main__":
    # Paths to the two product images to compare
    original_photo = "/Users/highmonk/Amazon hackon/amazon_hackon/samplephotos/cooker.jpg"
    returned_photo = "/Users/highmonk/Amazon hackon/amazon_hackon/samplephotos/23.jpg"

    try:
        similarity, is_match = compare_products(original_photo, returned_photo)

        if is_match:
            print(f"✅ MATCH — Same product confirmed (similarity: {similarity:.4f})")
        else:
            print(f"❌ MISMATCH — Products do not match (similarity: {similarity:.4f})")

        print(f"Threshold: {SIMILARITY_THRESHOLD}")

    except Exception as e:
        print(f"Error during comparison: {e}")