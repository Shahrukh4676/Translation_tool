import sys
import os
import fitz

# Ensure stdout uses UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.pdf_processor import process_pdf_bytes

# Test with a PDF containing Unicode text
doc = fitz.open()
page = doc.new_page()
# Using a standard font or html rendering in PyMuPDF to test Kannada Unicode text
rect = fitz.Rect(50, 50, 550, 400)
html_content = "<p style='font-family: sans-serif; font-size: 16px;'>ನಮಸ್ಕಾರ, ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ. ಇದು ಕನ್ನಡ PDF ಪಠ್ಯ.</p>"
page.insert_htmlbox(rect, html_content)

pdf_bytes = doc.tobytes()
doc.close()

results = process_pdf_bytes(pdf_bytes)
print("=== PDF Process Results ===")
for r in results:
    print(f"Page {r['page']}:")
    print(f"  Original: {r['original']}")
    print(f"  Transliterated: {r['transliterated']}")
    print(f"  Is Scanned: {r['is_scanned']}")
    print(f"  Char Count: {r['char_count']}")
