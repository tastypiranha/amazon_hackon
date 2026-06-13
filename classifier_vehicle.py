import os
import numpy as np
import torch
import pickle

from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import normalize

# Load CLIP model
print("Loading CLIP model...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("Model loaded!")

classes = ["recycle", "refurnish", "resell"]

dataset_path = "/Users/highmonk/Amazon hackon/amazon_hackon/images_moniter/vehicle"

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
    """Train a KNN classifier on the vehicle dataset."""
    X = []
    y = []

    for label in classes:
        folder = os.path.join(dataset_path, label)

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

    # Normalize features for better similarity matching
    X = normalize(X)

    print(f"\nDataset: {X.shape[0]} images, {X.shape[1]} features")
    print(f"  recycle: {np.sum(y == 'recycle')}")
    print(f"  refurnish: {np.sum(y == 'refurnish')}")
    print(f"  resell: {np.sum(y == 'resell')}")

    # KNN with k=3 works well for small, distinct datasets
    clf = KNeighborsClassifier(n_neighbors=3, metric="cosine")
    clf.fit(X, y)

    # Save the trained classifier
    with open("classifier_vehicle.pkl", "wb") as f:
        pickle.dump(clf, f)

    print("\nClassifier trained and saved to classifier_vehicle.pkl")
    return clf


def classify_image(image_path, clf=None):
    """Classify a vehicle image into recycle/refurnish/resell."""
    if clf is None:
        with open("classifier_vehicle.pkl", "rb") as f:
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
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score

    # Extract all features
    print("Extracting features from all vehicle images...")
    X = []
    y = []

    for label in classes:
        folder = os.path.join(dataset_path, label)
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
                print(f"  Error: {path}: {e}")

    X = np.array(X)
    y = np.array(y)
    X = normalize(X)

    print(f"\nDataset: {X.shape[0]} images, {X.shape[1]} features")

    # Train/test split (70% train, 30% test, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    print(f"Train: {len(X_train)} samples | Test: {len(X_test)} samples")

    # Train on the split
    clf = KNeighborsClassifier(n_neighbors=3, metric="cosine")
    clf.fit(X_train, y_train)

    # Predict on test set
    y_pred = clf.predict(X_test)

    print("\n--- Test Results (Vehicle) ---")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.2%}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # Also train final model on ALL data and save it
    print("\n--- Training final model on all vehicle data ---")
    clf_final = train_classifier()
    print("Done! Final model saved to classifier_vehicle.pkl")
