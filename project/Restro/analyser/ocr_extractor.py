"""
OCR Text Extractor
==================
Extracts any text / letters from an image using:
  - EasyOCR  (primary  – deep-learning, no external binary needed)
  - Tesseract (optional – requires Tesseract installed on the system)

CLI usage:
    python ocr_extractor.py <image_path> [--engine easyocr|tesseract]
                                         [--format  text|detailed|json]
                                         [--languages en fr de ...]
                                         [--output result.txt]
"""

import os
import sys
import json
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# Image pre-processing
# ---------------------------------------------------------------------------

def preprocess_image(image_path: str) -> np.ndarray:
    """
    Convert image to a clean grayscale binary image to maximise OCR accuracy.

    Steps applied:
      1. Grayscale conversion
      2. Fast non-local means denoising
      3. Adaptive Gaussian thresholding (handles uneven lighting)
      4. Light morphological dilation to thicken thin strokes
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    gray     = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, h=10,
                                        templateWindowSize=7,
                                        searchWindowSize=21)
    thresh   = cv2.adaptiveThreshold(
                   denoised, 255,
                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                   cv2.THRESH_BINARY, 11, 2)

    kernel  = np.ones((1, 1), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    return dilated


# ---------------------------------------------------------------------------
# EasyOCR engine
# ---------------------------------------------------------------------------

def extract_with_easyocr(image_path: str, languages: list) -> dict:
    """
    Extract text with EasyOCR (deep-learning based).

    Returns a dict with:
      - engine          : "EasyOCR"
      - full_text       : plain concatenated text (lines separated by \\n)
      - detailed_results: list of {text, confidence, bounding_box}
    """
    try:
        import easyocr
    except ImportError:
        raise ImportError(
            "EasyOCR is not installed. Run:  pip install easyocr"
        )

    reader  = easyocr.Reader(languages, gpu=False, verbose=False)
    results = reader.readtext(image_path)

    detailed   = []
    text_lines = []

    for bbox, text, confidence in results:
        detailed.append({
            "text":       text,
            "confidence": round(confidence * 100, 2),
            "bounding_box": {
                "top_left":     [int(bbox[0][0]), int(bbox[0][1])],
                "top_right":    [int(bbox[1][0]), int(bbox[1][1])],
                "bottom_right": [int(bbox[2][0]), int(bbox[2][1])],
                "bottom_left":  [int(bbox[3][0]), int(bbox[3][1])],
            },
        })
        if confidence > 0.30:
            text_lines.append(text)

    return {
        "engine":           "EasyOCR",
        "full_text":        "\n".join(text_lines),
        "detailed_results": detailed,
    }


# ---------------------------------------------------------------------------
# Tesseract engine
# ---------------------------------------------------------------------------

def extract_with_tesseract(image_path: str) -> dict:
    """
    Extract text with Tesseract OCR.

    Requires the Tesseract binary:
      Windows : https://github.com/UB-Mannheim/tesseract/wiki
      Ubuntu  : sudo apt install tesseract-ocr
      macOS   : brew install tesseract

    Returns the same dict shape as extract_with_easyocr().
    """
    try:
        import pytesseract
        from pytesseract import Output
    except ImportError:
        raise ImportError(
            "pytesseract is not installed. Run:  pip install pytesseract"
        )

    preprocessed = preprocess_image(image_path)
    pil_image    = Image.fromarray(preprocessed)

    config    = "--psm 3 --oem 3"
    full_text = pytesseract.image_to_string(pil_image, config=config)
    data      = pytesseract.image_to_data(pil_image,
                                          output_type=Output.DICT,
                                          config=config)

    detailed = []
    for i, word in enumerate(data["text"]):
        if word.strip() and int(data["conf"][i]) > 0:
            detailed.append({
                "text":       word,
                "confidence": int(data["conf"][i]),
                "bounding_box": {
                    "x":      data["left"][i],
                    "y":      data["top"][i],
                    "width":  data["width"][i],
                    "height": data["height"][i],
                },
            })

    return {
        "engine":           "Tesseract",
        "full_text":        full_text.strip(),
        "detailed_results": detailed,
    }


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_output(result: dict, image_path: str, output_format: str) -> str:
    """
    Render OCR results as a formatted string.

    output_format choices:
      "text"     - clean extracted text only  (default)
      "detailed" - human-readable table with per-word confidence scores
      "json"     - machine-readable JSON
    """
    name = os.path.basename(image_path)

    if output_format == "json":
        payload = {
            "image":          name,
            "ocr_engine":     result["engine"],
            "extracted_text": result["full_text"],
            "word_details":   result["detailed_results"],
        }
        return json.dumps(payload, indent=2, ensure_ascii=False)

    if output_format == "detailed":
        lines = [
            "=" * 60,
            f"  Image      : {name}",
            f"  OCR Engine : {result['engine']}",
            "=" * 60,
            "",
            "EXTRACTED TEXT",
            "-" * 40,
            result["full_text"] if result["full_text"] else "(no text detected)",
            "",
            "WORD-LEVEL DETAILS  [confidence % | word]",
            "-" * 40,
        ]
        for item in result["detailed_results"]:
            conf = item.get("confidence", "N/A")
            lines.append(f"  {str(conf):>6}%  |  {item['text']}")
        lines += ["", "=" * 60]
        return "\n".join(lines)

    # default: "text"
    lines = [
        "=" * 60,
        f"  Image      : {name}",
        f"  OCR Engine : {result['engine']}",
        "=" * 60,
        "",
        result["full_text"] if result["full_text"] else "(no text detected)",
        "",
        "=" * 60,
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".tiff", ".tif", ".webp", ".gif",
}


def extract_text(
    image_path:    str,
    engine:        str  = "easyocr",
    languages:     list = None,
    output_format: str  = "text",
) -> str:
    """
    Extract all text / letters from *image_path* and return a formatted string.

    Parameters
    ----------
    image_path    : path to the input image file
    engine        : "easyocr"  (default) | "tesseract"
    languages     : language list for EasyOCR, e.g. ["en", "fr"]  (default: ["en"])
    output_format : "text" (default) | "detailed" | "json"

    Returns
    -------
    Formatted string containing the extracted text.
    """
    image_path = os.path.abspath(image_path)

    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    ext = Path(image_path).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported format '{ext}'. "
            f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    if languages is None:
        languages = ["en"]

    if engine == "easyocr":
        result = extract_with_easyocr(image_path, languages)
    elif engine == "tesseract":
        result = extract_with_tesseract(image_path)
    else:
        raise ValueError(f"Unknown engine '{engine}'. Use 'easyocr' or 'tesseract'.")

    return format_output(result, image_path, output_format)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ocr_extractor",
        description="Extract text / letters from any image file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples
--------
  Basic (EasyOCR, plain text output):
    python ocr_extractor.py photo.png

  Tesseract engine with detailed output:
    python ocr_extractor.py scan.jpg --engine tesseract --format detailed

  Multi-language JSON saved to file:
    python ocr_extractor.py doc.tiff --languages en fr de --format json --output out.json
        """,
    )
    parser.add_argument("image",
                        help="Path to the input image file.")
    parser.add_argument("--engine",
                        choices=["easyocr", "tesseract"],
                        default="easyocr",
                        help="OCR engine (default: easyocr).")
    parser.add_argument("--format",
                        choices=["text", "detailed", "json"],
                        default="text",
                        dest="output_format",
                        help="Output format (default: text).")
    parser.add_argument("--languages",
                        nargs="+",
                        default=["en"],
                        metavar="LANG",
                        help="Language codes for EasyOCR (default: en).")
    parser.add_argument("--output", "-o",
                        default=None,
                        metavar="FILE",
                        help="Save output to FILE instead of printing.")
    return parser


def main() -> None:
    parser = _build_parser()
    args   = parser.parse_args()

    try:
        output = extract_text(
            image_path=args.image,
            engine=args.engine,
            languages=args.languages,
            output_format=args.output_format,
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"[ERROR] OCR failed: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(output)
        print(f"Output saved to: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
