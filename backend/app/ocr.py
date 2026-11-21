"""ocr(path) -> mmd via Nougat (HuggingFace transformers). Owner: Thành."""
import os
import threading
from pathlib import Path

import pypdfium2
import torch
from PIL import Image, ImageStat
from transformers import NougatProcessor, VisionEncoderDecoderModel

MODEL_NAME = os.environ.get("NOUGAT_MODEL", "facebook/nougat-small")
MAX_PAGES = int(os.environ.get("OCR_MAX_PAGES", "20"))
DEVICE = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}

# shortcut: one global lock = one OCR job at a time (also keeps a 4GB GPU from OOM); use a queue/worker if users wait too long.
_lock = threading.Lock()
_processor = _model = None


class OCRError(Exception):
    """Message is safe to show the user (stored in documents.error)."""


def _load():
    global _processor, _model
    if _model is None:
        _processor = NougatProcessor.from_pretrained(MODEL_NAME)
        model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)
        _model = (model.half() if DEVICE == "cuda" else model).to(DEVICE).eval()


def _pages(path):
    path = Path(path)
    ext = path.suffix.lower()
    if ext == ".pdf":
        pdf = pypdfium2.PdfDocument(path)
        if len(pdf) > MAX_PAGES:
            raise OCRError(f"PDF có {len(pdf)} trang, tối đa {MAX_PAGES} trang.")
        # Nougat was trained on pages rendered at 96 DPI (PDF unit = 1/72 inch).
        return [page.render(scale=96 / 72).to_pil().convert("RGB") for page in pdf]
    if ext in IMAGE_EXTS:
        return [Image.open(path).convert("RGB")]
    raise OCRError(f"Không hỗ trợ định dạng {ext}. Chỉ nhận PDF hoặc ảnh.")


def _is_blank(image):
    return ImageStat.Stat(image.convert("L")).stddev[0] < 3


def _ocr_page(image):
    if _is_blank(image):  # Nougat hallucinates text on empty pages instead of returning nothing
        return ""
    pixel_values = _processor(image, return_tensors="pt").pixel_values.to(DEVICE, _model.dtype)
    with torch.inference_mode():
        out = _model.generate(
            pixel_values,
            min_length=1,
            max_new_tokens=3584,
            bad_words_ids=[[_processor.tokenizer.unk_token_id]],
        )
    text = _processor.batch_decode(out, skip_special_tokens=True)[0]
    return _processor.post_process_generation(text, fix_markdown=False).strip()


def ocr(path):
    """Blocking. Returns mmd text; raises OCRError with a user-facing message."""
    pages = _pages(path)
    with _lock:
        _load()
        texts = [_ocr_page(img) for img in pages]
    if not any(texts):
        # Typical for handwriting or blurry photos: Nougat only knows typeset documents.
        raise OCRError("Không nhận dạng được nội dung. Nougat chỉ đọc tốt tài liệu in/đánh máy, không đọc tốt chữ viết tay.")
    return "\n\n".join(t or f"[Trang {i}: không nhận dạng được nội dung]" for i, t in enumerate(texts, 1))
