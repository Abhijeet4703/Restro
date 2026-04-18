"""
Menu Analyser Bridge API
========================
A lightweight Flask HTTP server that sits between the Node.js backend and
your existing ocr_extractor.py.

The Node server POSTs a base64 image (or plain text) here, this script runs
OCR via ocr_extractor.extract_text(), then parses the raw text into structured
menu items and returns them as JSON.

Run with:
    python api.py          (listens on http://127.0.0.1:8765)

Endpoints
---------
POST /analyze-image   { "imageData": "<base64-or-data-url>" }
POST /analyze-text    { "text": "<raw menu text>" }
GET  /health          -> { "status": "ok" }
"""

import base64
import json
import os
import re
import sys
import tempfile

from flask import Flask, jsonify, request
from flask_cors import CORS

# ocr_extractor lives in the same folder
sys.path.insert(0, os.path.dirname(__file__))
from ocr_extractor import extract_text


# ---------------------------------------------------------------------------
# Menu parsing helpers  (same patterns as server/utils/menuAnalyzer.js)
# ---------------------------------------------------------------------------

MENU_PATTERNS = {
    "starters":    ["starter","appetizer","samosa","pakora","spring roll","momos",
                    "cutlet","kebab","soup","salad","finger food","avocado",
                    "bruschetta","nachos","wings","fries","wedges"],
    "main-course": ["curry","biryani","rice","pasta","main","special","chicken",
                    "fish","mutton","goat","paneer","dal","sabzi","thali",
                    "burger","sandwich","wrap","pizza","steak","roast"],
    "drinks":      ["drink","juice","coffee","tea","cola","water","lassi","shake",
                    "smoothie","beverage","lemonade","soda","beer","wine",
                    "mocktail","milkshake","frappe"],
    "desserts":    ["dessert","sweet","cake","ice cream","kheer","gulab jamun",
                    "brownie","pastry","pudding","chocolate","waffle",
                    "cheesecake","tiramisu","gelato"],
    "sides":       ["side","bread","naan","roti","fries","gravy","pickle","sauce",
                    "dipping","coleslaw","onion rings"],
}

VEG_KW    = ["veg","vegetarian","paneer","dal","sabzi","mushroom","tofu","beans","vegetables"]
NONVEG_KW = ["chicken","fish","mutton","goat","beef","shrimp","crab","meat","non-veg","nonveg"]

SECTION_HEADERS = {
    "MENU","STARTERS","APPETIZERS","MAIN","MAIN COURSE","DRINKS",
    "DESSERTS","BREADS","RICE","SIDES","SPECIALS","BEVERAGES",
    "SOUPS","SALADS","SNACKS","COMBOS","HEALTHY FOOD MENU",
    "FOOD MENU","STARTER","COMBO","FOOD NAME","ITEM NAME","PRICE",
}

FOOD_HINTS = re.compile(
    r"biryani|rice|curry|paneer|chicken|mutton|fish|naan|roti|salad|soup|dal|"
    r"tikka|kebab|masala|burger|pasta|pizza|cake|shake|lassi|coffee|tea|juice|"
    r"dessert|sweet|special|thali", re.IGNORECASE
)

_STANDALONE = re.compile(
    r"^(?:₹|Rs\.?|\$|USD\s?)?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/\-|only)?$", re.IGNORECASE
)
_INLINE = [
    re.compile(r"^(.+?)\s*[-–—.]{2,}\s*(?:₹|Rs\.?|\$)?\s*(\d+(?:\.\d{1,2})?)"),
    re.compile(r"^(.+?)\s+(?:₹|Rs\.?|\$)\s*(\d+(?:\.\d{1,2})?)$"),
    re.compile(r"^(.+?)\s{2,}(\d{2,5}(?:\.\d{1,2})?)\s*$"),
    re.compile(r"^(.+?)\s+(\d{2,5})\s*(?:\/\-|only)\s*$", re.IGNORECASE),
    re.compile(r"^([A-Za-z][A-Za-z\s&'\-]{2,})\s+(\d{2,5}(?:\.\d{1,2})?)\s*$"),
]


def _categorize(name):
    nl = name.lower()
    for cat, kws in MENU_PATTERNS.items():
        if any(kw in nl for kw in kws):
            return cat
    return "main-course"


def _is_veg(name):
    nl = name.lower()
    if any(kw in nl for kw in NONVEG_KW):
        return False
    if any(kw in nl for kw in VEG_KW):
        return True
    return True


def _item(name, price):
    cat = _categorize(name)
    return {
        "name":        name,
        "price":       round(float(price), 2),
        "category":    cat,
        "description": f"{cat.replace('-', ' ').title()} item",
        "isVeg":       _is_veg(name),
        "prepTime":    5 if cat == "drinks" else 10 if cat in ("starters", "sides") else 20,
    }


def parse_menu_text(text):
    items = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Strategy 1: standalone price lines
    price_idx = [(i, float(m.group(1))) for i, l in enumerate(lines)
                 if (m := _STANDALONE.match(l))]

    if price_idx:
        for idx, price in price_idx:
            if not (0 < price < 100_000):
                continue
            best, best_score = None, -1
            for j in range(idx - 1, max(-1, idx - 11), -1):
                c = lines[j]
                if _STANDALONE.match(c):
                    break
                if c.upper() in SECTION_HEADERS or len(c) < 3 or len(c) > 60:
                    continue
                if c[0].islower() or ("," in c and len(c) > 25):
                    continue
                is_caps = c == c.upper() and any(ch.isalpha() for ch in c)
                score = (100 if is_caps else 0) + max(0, 60 - len(c))
                if score > best_score:
                    best_score, best = score, re.sub(r"[:.]+$", "", c).strip()
            if best and len(best) >= 3:
                items.append(_item(best, price))
        if items:
            return items

    # Strategy 2: inline price
    for line in lines:
        if line.upper() in SECTION_HEADERS:
            continue
        for pat in _INLINE:
            m = pat.match(line)
            if m:
                name  = re.sub(r"[:.]+$", "", m.group(1)).strip()
                price = float(m.group(2))
                if len(name) >= 3 and 0 < price < 100_000:
                    items.append(_item(name, price))
                    break
    if items:
        return items

    # Strategy 3: relaxed fallback
    for line in lines:
        if len(line) < 3 or len(line) > 60 or line.upper() in SECTION_HEADERS:
            continue
        if line[0].isdigit():
            continue
        if FOOD_HINTS.search(line) or (line[0].isupper() and len(line.split()) <= 5):
            pm = re.search(r"(\d+(?:\.\d{1,2})?)", line)
            price = float(pm.group(1)) if pm else 0
            name  = re.sub(r"\d+(?:\.\d{1,2})?", "", line).strip(" -.,:")
            if len(name) >= 3:
                items.append(_item(name, price))
    return items


# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/analyze-image")
def analyze_image():
    data = request.get_json(force=True, silent=True) or {}
    image_data = data.get("imageData", "")
    if not image_data:
        return jsonify({"error": "imageData is required"}), 400

    # Strip data-URL prefix if present
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(image_data)
    except Exception:
        return jsonify({"error": "Invalid base64 image data"}), 400

    suffix = ".png"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            tmp.write(img_bytes)

        raw_text = extract_text(image_path=tmp_path, engine="easyocr",
                                languages=["en"], output_format="text")
        # strip the decoration lines added by format_output
        lines = [l for l in raw_text.split("\n")
                 if not l.startswith("=") and not l.startswith("  Image") and not l.startswith("  OCR")]
        clean_text = "\n".join(lines).strip()

        items = parse_menu_text(clean_text)
        return jsonify({"items": items, "rawText": clean_text})

    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/analyze-text")
def analyze_text():
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "text is required"}), 400

    items = parse_menu_text(text)
    return jsonify({"items": items})


if __name__ == "__main__":
    port = int(os.environ.get("ANALYSER_PORT", 8765))
    print(f"[MenuAnalyser API] Running on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
