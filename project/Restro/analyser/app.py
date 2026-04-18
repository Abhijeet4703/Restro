"""
OCR Text Extractor - Gradio Web Interface
=========================================
Launch with:
    python app.py

Then open the URL shown in the terminal (usually http://127.0.0.1:7860).

Upload any image, choose your settings, and click "Extract Text".
"""

import os
import tempfile

import gradio as gr

from ocr_extractor import extract_text, SUPPORTED_EXTENSIONS


# ---------------------------------------------------------------------------
# Core handler
# ---------------------------------------------------------------------------

def process_image(
    image,
    engine: str,
    output_format: str,
    languages_str: str,
) -> tuple:
    """
    Called by Gradio when the user clicks "Extract Text".

    Returns (extracted_text, status_message).
    """
    if image is None:
        return "", "Please upload an image first."

    # Parse the comma-separated language list
    languages = [lang.strip() for lang in languages_str.split(",") if lang.strip()]
    if not languages:
        languages = ["en"]

    # Save the PIL image to a temporary file so ocr_extractor can read it
    suffix = ".png"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
        image.save(tmp_path)

        result = extract_text(
            image_path=tmp_path,
            engine=engine.lower(),
            languages=languages,
            output_format=output_format.lower(),
        )
        status = f"Done. Engine: {engine}  |  Languages: {', '.join(languages)}"
        return result, status

    except FileNotFoundError as exc:
        return "", f"Error: {exc}"
    except Exception as exc:
        return "", f"Extraction failed: {exc}"
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Gradio interface
# ---------------------------------------------------------------------------

with gr.Blocks(title="OCR Text Extractor") as demo:
    gr.Markdown(
        "# OCR Text Extractor\n"
        "Upload any image to extract the text it contains."
    )

    with gr.Row():
        img_input = gr.Image(type="pil", label="Input Image")
        with gr.Column():
            engine_radio = gr.Radio(
                ["EasyOCR", "Tesseract"],
                value="EasyOCR",
                label="OCR Engine",
            )
            format_radio = gr.Radio(
                ["Text", "Detailed", "JSON"],
                value="Text",
                label="Output Format",
            )
            languages_box = gr.Textbox(
                value="en",
                label="Languages (comma-separated, EasyOCR only)",
                placeholder="e.g. en, hi, fr",
            )
            extract_btn = gr.Button("Extract Text", variant="primary")

    output_text = gr.Textbox(label="Extracted Text", lines=20)
    status_text = gr.Textbox(label="Status", interactive=False)

    extract_btn.click(
        fn=process_image,
        inputs=[img_input, engine_radio, format_radio, languages_box],
        outputs=[output_text, status_text],
    )

    gr.Markdown(
        "**Supported formats:** "
        + ", ".join(sorted(SUPPORTED_EXTENSIONS))
    )


if __name__ == "__main__":
    demo.launch()
