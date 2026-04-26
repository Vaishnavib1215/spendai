import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import warnings

warnings.filterwarnings("ignore")


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df["week"] = df["transaction_date"].dt.isocalendar().week.astype(int)
    df["year"] = df["transaction_date"].dt.year
    df["week_key"] = df["year"].astype(str) + "-" + df["week"].astype(str).str.zfill(2)
    df["is_weekend"] = df["transaction_date"].dt.dayofweek.isin([5, 6]).astype(int)
    return df


def run_analysis(transactions: list) -> dict:
    df = pd.DataFrame(transactions)
    if df.empty or len(df) < 3:
        return {"error": "Not enough data"}

    df = build_features(df)

    # ─── Weekly aggregation ───────────────────────────────────────────────────
    weekly = df.groupby(["year", "week"])["amount"].sum().reset_index()
    weekly = weekly.sort_values(["year", "week"]).reset_index(drop=True)
    weekly["row"] = range(len(weekly))

    # ─── 1. Linear Regression — predict next week spending ────────────────────
    X_lr = weekly[["row"]]
    y_lr = weekly["amount"]
    lr = LinearRegression().fit(X_lr, y_lr)
    next_row = [[weekly["row"].max() + 1]]
    predicted_spending = float(lr.predict(next_row)[0])
    predicted_spending = max(0, predicted_spending)

    current_week = int(weekly["week"].iloc[-1])
    next_week_number = current_week + 1 if current_week < 52 else 1

    # ─── 2. Smart Budget Recommendation ──────────────────────────────────────
    recommended_budget = round(predicted_spending * 0.85, 2)

    # ─── 3. Overspending Risk — Decision Tree with explanation ───────────────
    threshold = 5000
    weekly["overspend"] = (weekly["amount"] > threshold).astype(int)

    weekend_weekly = df[df["is_weekend"] == 1].groupby(["year", "week"])["amount"].sum().reset_index()
    weekend_weekly.columns = ["year", "week", "weekend_amt"]
    weekly = weekly.merge(weekend_weekly, on=["year", "week"], how="left").fillna(0)

    food_weekly = df[df["category_name"].str.lower().isin(["food"]) if "category_name" in df.columns else [False]*len(df)].groupby(["year", "week"])["amount"].sum().reset_index()
    food_weekly.columns = ["year", "week", "food_amt"]
    weekly = weekly.merge(food_weekly, on=["year", "week"], how="left").fillna(0)

    weekly["food_pct"] = weekly.apply(
        lambda r: r["food_amt"] / r["amount"] * 100 if r["amount"] > 0 else 0, axis=1
    )

    feat_cols = ["amount", "weekend_amt", "food_pct"]
    X_dt = weekly[feat_cols]
    y_dt = weekly["overspend"]

    overspend_risk = 0
    reason = "Spending appears within normal range."

    if len(weekly) >= 2 and y_dt.nunique() > 1:
        dt = DecisionTreeClassifier(max_depth=3, random_state=42)
        dt.fit(X_dt, y_dt)

        pred_features = pd.DataFrame([[predicted_spending,
                                        weekly["weekend_amt"].mean(),
                                        weekly["food_pct"].mean()]],
                                      columns=feat_cols)
        overspend_risk = int(dt.predict(pred_features)[0])

        # Extract human-readable rule
        rules = export_text(dt, feature_names=feat_cols)
        if overspend_risk:
            if weekly["weekend_amt"].iloc[-1] > 2000:
                reason = f"High weekend spending detected (₹{weekly['weekend_amt'].iloc[-1]:.0f}). Consider reducing weekend expenses."
            elif weekly["food_pct"].iloc[-1] > 50:
                reason = f"Food expenses are {weekly['food_pct'].iloc[-1]:.0f}% of weekly spending. Budget for meals more strictly."
            else:
                reason = "Spending trend is rising. Predicted next week is above ₹5000 threshold."
    elif len(weekly) >= 1:
        overspend_risk = 1 if predicted_spending > threshold else 0
        if overspend_risk:
            reason = f"Predicted spending ₹{predicted_spending:.0f} exceeds ₹{threshold} threshold."

    # ─── 4. Category Drift Detection ─────────────────────────────────────────
    drift_alerts = []
    if "category_name" in df.columns:
        cat_weekly = df.groupby(["week", "category_name"])["amount"].sum().reset_index()
        avg_by_cat = cat_weekly.groupby("category_name")["amount"].mean()
        latest_week = df["week"].max()
        latest_cat = cat_weekly[cat_weekly["week"] == latest_week].set_index("category_name")["amount"]
        for cat, latest_val in latest_cat.items():
            avg = avg_by_cat.get(cat, latest_val)
            if avg > 0 and latest_val > avg * 1.5:
                drift_alerts.append(f"Unusual spike in {cat}: ₹{latest_val:.0f} vs avg ₹{avg:.0f}")

    # ─── 5. K-Means Behavioral Segmentation ──────────────────────────────────
    cluster_label = "Steady Spender"
    if len(weekly) >= 3:
        txn_per_week = df.groupby(["year", "week"]).size().reset_index(name="txn_count")
        weekly = weekly.merge(txn_per_week, on=["year", "week"], how="left").fillna(1)

        seg_features = weekly[["amount", "txn_count", "weekend_amt"]].values
        scaler = StandardScaler()
        seg_scaled = scaler.fit_transform(seg_features)

        n_clusters = min(3, len(weekly))
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        weekly["cluster"] = km.fit_predict(seg_scaled)

        last_cluster = int(weekly["cluster"].iloc[-1])
        centers = km.cluster_centers_

        # Interpret clusters
        cluster_profiles = []
        for i, center in enumerate(centers):
            amt, txns, wknd = scaler.inverse_transform([center])[0]
            cluster_profiles.append({"id": i, "amt": amt, "txns": txns, "wknd": wknd})

        my_profile = next(c for c in cluster_profiles if c["id"] == last_cluster)
        highest_amt = max(c["amt"] for c in cluster_profiles)

        if my_profile["wknd"] > np.mean([c["wknd"] for c in cluster_profiles]) * 1.2:
            cluster_label = "Weekend Splurger"
        elif my_profile["txns"] > np.mean([c["txns"] for c in cluster_profiles]) * 1.2:
            cluster_label = "Daily Small Spender"
        elif my_profile["amt"] >= highest_amt * 0.9:
            cluster_label = "Rare but Heavy Spender"
        else:
            cluster_label = "Steady Spender"

    # ─── 6. Weekend vs Weekday insight ───────────────────────────────────────
    weekend_total = float(df[df["is_weekend"] == 1]["amount"].sum())
    weekday_total = float(df[df["is_weekend"] == 0]["amount"].sum())
    weekend_insight = None
    if weekend_total > weekday_total * 1.3:
        weekend_insight = "You spend significantly more on weekends. Consider setting a weekend budget."

    # ─── Build weekly trend for chart ────────────────────────────────────────
    weekly_trend = weekly[["year", "week", "amount"]].rename(columns={"amount": "total"}).to_dict(orient="records")

    return {
        "predicted_spending": round(predicted_spending, 2),
        "recommended_budget": recommended_budget,
        "overspend_risk": bool(overspend_risk),
        "reason": reason,
        "cluster_label": cluster_label,
        "week_number": next_week_number,
        "drift_alerts": drift_alerts,
        "weekend_insight": weekend_insight,
        "weekly_trend": weekly_trend,
        "weekend_total": round(weekend_total, 2),
        "weekday_total": round(weekday_total, 2),
    }
