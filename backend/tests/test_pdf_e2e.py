import sys
import os
import fitz
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Create a proper Kannada test PDF via insert_htmlbox
doc = fitz.open()

# Page 1: Kannada text
page1 = doc.new_page()
kannada_page1 = "ಕರ್ನಾಟಕ ರಾಜ್ಯದ ರಾಜಧಾನಿ ಬೆಂಗಳೂರು. ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ ನವೆಂಬರ್ ೧ ರಂದು ಆಚರಿಸಲಾಗುತ್ತದೆ."
page1.insert_htmlbox(fitz.Rect(50, 50, 550, 750), f"<p style='font-size:14px'>{kannada_page1}</p>")

# Page 2: More Kannada text
page2 = doc.new_page()
kannada_page2 = "ನಮಸ್ಕಾರ, ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ. ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ."
page2.insert_htmlbox(fitz.Rect(50, 50, 550, 750), f"<p style='font-size:14px'>{kannada_page2}</p>")

pdf_bytes = doc.tobytes()
doc.close()

print(f"Test PDF created ({len(pdf_bytes)} bytes, 2 pages)")

# Send to the running backend
url = "http://127.0.0.1:8000/api/transliterate/pdf"
files = {"file": ("test_kannada_2page.pdf", pdf_bytes, "application/pdf")}

response = requests.post(url, files=files)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    for page in data:
        print(f"\n--- Page {page['page']} ---")
        print(f"  Original (first 100 chars): {page['original'][:100]!r}")
        print(f"  Transliterated (first 100): {page['transliterated'][:100]!r}")
        print(f"  Is Scanned: {page['is_scanned']}")
        print(f"  Char Count: {page['char_count']}")
else:
    print(f"ERROR: {response.text[:500]}")
