import cv2
import numpy as np
import pytesseract
import logging
import io
import os
from PIL import Image

logger = logging.getLogger("akshara.image_processor")

MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB free-tier limit
MAX_IMAGE_DIMENSION = 1600  # Cap max width/height at 1600px to save server CPU/RAM

# Auto-detect common Windows Tesseract executable paths
TESSERACT_COMMON_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
    r"C:\Users\shahr\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
]

# Also check PATH environment variable
_tesseract_from_path = None
try:
    import shutil
    _tesseract_from_path = shutil.which("tesseract")
except Exception:
    pass

_found_tesseract = False
for p in TESSERACT_COMMON_PATHS:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        logger.info(f"Configured Tesseract binary at: {p}")
        _found_tesseract = True
        # Programmatically set TESSDATA_PREFIX env var if tessdata folder is adjacent to binary
        tessdata_path = os.path.join(os.path.dirname(p), "tessdata")
        if os.path.exists(tessdata_path):
            os.environ["TESSDATA_PREFIX"] = tessdata_path
            logger.info(f"Configured TESSDATA_PREFIX to: {tessdata_path}")
        break

if not _found_tesseract and _tesseract_from_path:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_from_path
    logger.info(f"Configured Tesseract binary from PATH: {_tesseract_from_path}")
    _found_tesseract = True

if not _found_tesseract:
    logger.warning("Tesseract binary not found in common paths or PATH. OCR will fail.")

def validate_image_file(file_bytes: bytes, filename: str) -> None:
    """Validate image size and format."""
    if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError(f"Image size exceeds maximum free-tier limit of 8 MB (File is {len(file_bytes)/(1024*1024):.1f} MB).")
    
    valid_exts = (".png", ".jpg", ".jpeg", ".webp", ".bmp")
    if not any(filename.lower().endswith(ext) for ext in valid_exts):
        raise ValueError("Invalid image format. Supported formats: PNG, JPEG, WEBP, BMP.")

def resize_image_if_large(img: np.ndarray, max_dim: int = MAX_IMAGE_DIMENSION) -> np.ndarray:
    """Resize image so its maximum dimension does not exceed max_dim."""
    height, width = img.shape[:2]
    if max(height, width) <= max_dim:
        return img
    
    scale = max_dim / float(max(height, width))
    new_w = int(width * scale)
    new_h = int(height * scale)
    logger.info(f"Resizing large image from {width}x{height} to {new_w}x{new_h} to optimize OCR speed.")
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

def preprocess_image_cv2(image_bytes: bytes) -> np.ndarray:
    """
    OpenCV Pre-processing pipeline:
    1. Decode image bytes
    2. Resize if image exceeds max dimension (1600px)
    3. Convert to Grayscale
    4. Apply CLAHE contrast enhancement
    5. Apply Otsu Binarization
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image file.")

    # 1. Resize large photos to cap RAM/CPU usage
    img = resize_image_if_large(img)

    # 2. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. CLAHE Contrast Enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # 4. Otsu Binarization
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return binary

def perform_ocr_on_bytes(image_bytes: bytes) -> str:
    """Run Tesseract OCR on preprocessed image bytes with Kannada language pack ('kan')."""
    try:
        processed_img = preprocess_image_cv2(image_bytes)
        pil_img = Image.fromarray(processed_img)

        # Run Tesseract with Kannada language pack
        extracted_text = pytesseract.image_to_string(pil_img, lang='kan')
        return extracted_text.strip()
    except pytesseract.TesseractNotFoundError:
        logger.error("Tesseract OCR binary not found.")
        raise RuntimeError("Tesseract OCR binary is not installed or configured on the server. Please install tesseract-ocr with 'kan' language pack.")
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            return pytesseract.image_to_string(pil_img, lang='kan').strip()
        except Exception as fb_err:
            raise RuntimeError(f"OCR failed to process image: {fb_err}")
