# type: ignore

from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from flask import Flask, render_template
import os

app = Flask(__name__)
CORS(app)  # Enable CORS

# Set the path to the HTML directory
HTML_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'html')

# ------------------- Image Processing Functionality -------------------

# Load the trained model
model = load_model('skin_condition_model_mobilenetv2.h5')  # Ensure the correct model path

# Define the class labels
labels = ['Acne', 'Irrelevant']

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    try:
        # Load and preprocess the image
        img = Image.open(file).convert('RGB')  # Ensure the image has 3 channels
        img = img.resize((224, 224))  # Match model input size
        img_array = np.array(img) / 255.0  # Normalize
        img_array = np.expand_dims(img_array, axis=0)

        # Predict using the trained model
        predictions = model.predict(img_array)
        confidence = np.max(predictions)  # Highest confidence score
        predicted_label = labels[np.argmax(predictions)]  # Get the class with highest confidence

        # Apply confidence threshold
        threshold = 0.75
        if confidence < threshold:
            predicted_label = "Irrelevant"

        print(f"Prediction: {predicted_label}, Confidence: {confidence:.2f}")
        return jsonify({
            "condition": predicted_label,
            "confidence": round(float(confidence) * 100, 2)  # Convert to percentage
        })
    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({"error": "Error processing image"}), 500

# ------------------- KNN Recommendation Functionality -------------------

# Load the product data
df = pd.read_csv("acne_products_modified.csv")

# Extract features for KNN
features = ["Oily", "Dry", "Combination", "Sensitive", "Normal",
            "Hyaluronic Acid", "Salicylic Acid", "Retinol", "Niacinamide", "Vitamin C"]
product_ids = df["ID"]  # Product IDs for reference
product_features = df[features].values  # Convert features to NumPy array

# Initialize the KNN model
knn = NearestNeighbors(n_neighbors=5, metric="euclidean")  # Adjust n_neighbors as needed
knn.fit(product_features)

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        # Receive input from the user (e.g., skin type and preferences)
        user_input = request.json  # Expecting JSON with skin type and preferences
        print(f"Received user input for recommendation: {user_input}")

        # Convert input to a query vector
        query_vector = np.array([[user_input.get(col, 0) for col in features]])

        # Perform KNN to find similar products
        distances, indices = knn.kneighbors(query_vector)

        # Get recommended product details
        recommended_products = df.iloc[indices[0]].to_dict(orient="records")
        
        print(f"Recommended products: {recommended_products}")
        # Return recommendations as JSON
        return jsonify(recommended_products)
    except Exception as e:
        print(f"Error during recommendation: {e}")
        return jsonify({"error": "Error generating recommendations"}), 500

# ------------------------------------------------------------

@app.route('/')
def home():
    return render_template('login.html')  # Serve the login.html

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))  # Use Glitch's PORT environment variable
    app.run(host='0.0.0.0', port=port, debug=True)