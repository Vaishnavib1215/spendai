from flask import Flask, request, jsonify
from flask_cors import CORS
from ml_models import run_analysis

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data or "transactions" not in data:
        return jsonify({"error": "transactions field required"}), 400

    transactions = data["transactions"]
    if not isinstance(transactions, list) or len(transactions) < 3:
        return jsonify({"error": "At least 3 transactions required"}), 422

    result = run_analysis(transactions)
    if "error" in result:
        return jsonify(result), 422

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5001, debug=True)
