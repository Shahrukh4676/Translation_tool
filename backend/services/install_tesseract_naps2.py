import os
import sys
import zipfile
import urllib.request
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("install_tesseract_naps2")

NUPKG_URL = "https://api.nuget.org/v3-flatcontainer/naps2.tesseract.binaries/1.4.0/naps2.tesseract.binaries.1.4.0.nupkg"
ENG_LANG_URL = "https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata"
KAN_LANG_URL = "https://github.com/tesseract-ocr/tessdata_fast/raw/main/kan.traineddata"

TARGET_DIR = r"C:\Users\shahr\AppData\Local\Tesseract-OCR"
TESSDATA_DIR = os.path.join(TARGET_DIR, "tessdata")

def install_standalone_tesseract():
    logger.info("Starting standalone Tesseract OCR setup...")
    
    # 1. Create target directories
    os.makedirs(TARGET_DIR, exist_ok=True)
    os.makedirs(TESSDATA_DIR, exist_ok=True)
    
    temp_nupkg = os.path.join(TARGET_DIR, "temp_package.zip")
    tesseract_exe_path = os.path.join(TARGET_DIR, "tesseract.exe")
    
    # 2. Download NuGet package containing tesseract.exe
    logger.info(f"Downloading Tesseract binary from {NUPKG_URL}...")
    try:
        urllib.request.urlretrieve(NUPKG_URL, temp_nupkg)
        logger.info("Binary package downloaded successfully.")
    except Exception as e:
        logger.error(f"Failed to download binary package: {e}")
        return False
        
    # 3. Extract win-x64 binary
    logger.info("Extracting Tesseract executable...")
    try:
        with zipfile.ZipFile(temp_nupkg, 'r') as zf:
            # We want to extract contentFiles/_win64/tesseract.exe and place it directly in TARGET_DIR
            data = zf.read("contentFiles/_win64/tesseract.exe")
            with open(tesseract_exe_path, "wb") as f:
                f.write(data)
        logger.info(f"Tesseract executable saved to {tesseract_exe_path}")
    except Exception as e:
        logger.error(f"Failed to extract tesseract.exe: {e}")
        return False
    finally:
        # Clean up temp nupkg zip file
        if os.path.exists(temp_nupkg):
            os.remove(temp_nupkg)

    # 4. Download language packs
    languages = {
        "eng.traineddata": ENG_LANG_URL,
        "kan.traineddata": KAN_LANG_URL
    }
    
    for lang_name, lang_url in languages.items():
        lang_path = os.path.join(TESSDATA_DIR, lang_name)
        if not os.path.exists(lang_path):
            logger.info(f"Downloading language pack {lang_name} from {lang_url}...")
            try:
                urllib.request.urlretrieve(lang_url, lang_path)
                logger.info(f"Successfully downloaded {lang_name}")
            except Exception as e:
                logger.error(f"Failed to download language pack {lang_name}: {e}")
                return False
        else:
            logger.info(f"Language pack {lang_name} already exists.")

    # 5. Verify the installation
    logger.info("Verifying Tesseract installation...")
    try:
        # Set environment variable so Tesseract knows where to look for languages
        env = os.environ.copy()
        env["TESSDATA_PREFIX"] = TESSDATA_DIR
        
        result_ver = subprocess.run([tesseract_exe_path, "--version"], capture_output=True, text=True, env=env)
        logger.info(f"Tesseract version output:\n{result_ver.stdout.strip()}")
        
        result_langs = subprocess.run([tesseract_exe_path, "--list-langs"], capture_output=True, text=True, env=env)
        logger.info(f"Tesseract available languages:\n{result_langs.stdout.strip()}")
        
        # Verify that kan is listed
        if "kan" in result_langs.stdout:
            logger.info("Kannada language pack verified successfully!")
        else:
            logger.warning("Kannada language pack is missing in the list-langs output.")
            
    except Exception as e:
        logger.error(f"Failed to verify Tesseract installation: {e}")
        return False

    logger.info("Tesseract installation completed successfully!")
    return True

if __name__ == "__main__":
    install_standalone_tesseract()
