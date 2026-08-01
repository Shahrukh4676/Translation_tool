import os
import sys
import urllib.request
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("install_kannada_pack")

TESSERACT_POSSIBLE_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tessdata",
    r"C:\Program Files (x86)\Tesseract-OCR\tessdata",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tessdata"),
    os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tessdata"),
]

KAN_URL = "https://github.com/tesseract-ocr/tessdata_fast/raw/main/kan.traineddata"

def download_kannada_pack():
    downloaded = False
    
    # Try to find valid tessdata directories
    found_paths = []
    for path in TESSERACT_POSSIBLE_PATHS:
        if os.path.exists(path):
            found_paths.append(path)
            
    # Check environment variable TESSDATA_PREFIX
    tessdata_env = os.environ.get("TESSDATA_PREFIX")
    if tessdata_env and os.path.exists(tessdata_env):
        found_paths.append(tessdata_env)

    if not found_paths:
        logger.warning("No Tesseract tessdata directory found yet. Is Tesseract installed?")
        # Create default one in C:\Program Files\Tesseract-OCR\tessdata as fallback
        default_dir = r"C:\Program Files\Tesseract-OCR\tessdata"
        try:
            os.makedirs(default_dir, exist_ok=True)
            found_paths.append(default_dir)
            logger.info(f"Created default directory: {default_dir}")
        except Exception as e:
            logger.error(f"Failed to create default directory: {e}")
            return False

    for tessdata_dir in found_paths:
        target_file = os.path.join(tessdata_dir, "kan.traineddata")
        logger.info(f"Downloading Kannada language pack to: {target_file}")
        try:
            urllib.request.urlretrieve(KAN_URL, target_file)
            logger.info("Successfully downloaded kan.traineddata!")
            downloaded = True
        except Exception as e:
            logger.error(f"Failed to download to {tessdata_dir}: {e}")
            
    return downloaded

if __name__ == "__main__":
    download_kannada_pack()
