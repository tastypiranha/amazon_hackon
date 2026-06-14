import os
import numpy as np
import torch
import pickle

from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from sklearn.svm import SVC
from sklearn.preprocessing import normalize

# Resolve paths relative to this file's location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PKL_OUTPUT = os.path.join(BASE_DIR, "classifier_electronics.pkl")

# Load CLIP model
print("Loading CLIP model...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("Model loaded!")

classes = ["recycle", "refurbish", "resell"]

dataset_path = os.path.join(BASE_DIR, "images_moniter", "electronics ")

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")


def extract_features(image_path):
    """Extract CLIP image features from a single image."""
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model.vision_model(pixel_values=inputs["pixel_values"])
    features = outputs.pooler_output
    return features.cpu().numpy().squeeze()


def train_classifier():
    """Train a KNN classifier using 100% of the dataset."""
    X = []
    y = []

    for label in classes:
        folder = os.path.join(dataset_path, label)
        if not os.path.exists(folder):
            print(f"  WARNING: folder not found: {folder}")
            continue

        for img_file in os.listdir(folder):
            if not img_file.lower().endswith(VALID_EXTENSIONS):
                continue

            path = os.path.join(folder, img_file)

            try:
                features = extract_features(path)
                X.append(features)
                y.append(label)
                print(f"  Processed: {label}/{img_file}")
            except Exception as e:
                print(f"  Error processing {path}: {e}")

    X = np.array(X)
    y = np.array(y)

    # Normalize features — this is what main.py does at inference time too
    X = normalize(X)

    print(f"\nDataset: {X.shape[0]} images, {X.shape[1]} features")
    print(f"  recycle: {np.sum(y == 'recycle')}")
    print(f"  refurbish: {np.sum(y == 'refurbish')}")
    print(f"  resell: {np.sum(y == 'resell')}")
    print(f"\n  TOTAL: {len(y)} samples used for training (100% of data)")

    # SVM with probability=True gives spread-out confidence scores
    clf = SVC(kernel="rbf", probability=True, C=1.0, gamma="scale")
    clf.fit(X, y)

    # Save to project root (same dir as main.py)
    with open(PKL_OUTPUT, "wb") as f:
        pickle.dump(clf, f)

    print(f"\nClassifier trained and saved to {PKL_OUTPUT}")
    return clf


def classify_image(image_path, clf=None):
    """Classify a single image into recycle/refurbish/resell."""
    if clf is None:
        with open(PKL_OUTPUT, "rb") as f:
            clf = pickle.load(f)

    features = extract_features(image_path)
    features = normalize(features.reshape(1, -1))

    prediction = clf.predict(features)[0]
    probabilities = clf.predict_proba(features)[0]

    print(f"\nImage: {image_path}")
    print(f"Prediction: {prediction}")
    print("Confidence scores:")
    for cls, prob in zip(clf.classes_, probabilities):
        print(f"  {cls}: {prob:.2%}")

    return prediction, dict(zip(clf.classes_, probabilities))


if __name__ == "__main__":
    print("Training electronics classifier on 100% of data...")
    clf = train_classifier()
    print("\nDone! classifier_electronics.pkl ready.")
