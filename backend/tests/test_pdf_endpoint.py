import fitz
import requests

# Create a sample PDF file with 2 pages of Kannada text
doc = fitz.open()

page1 = doc.new_page()
page1.insert_text((50, 50), "ನಮಸ್ಕಾರ, ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ. ಕನ್ನಡ ಪಠ್ಯ.", fontsize=14)

page2 = doc.new_page()
page2.insert_text((50, 50), "ಕರ್ನಾಟಕ ರಾಜ್ಯದ ರಾಜಧಾನಿ ಬೆಂಗಳೂರು.", fontsize=14)

pdf_bytes = doc.tobytes()
doc.close()

# Send to running backend server
url = "http://127.0.0.1:8000/api/transliterate/pdf"
files = {"file": ("test_kannada.pdf", pdf_bytes, "application/pdf")}

response = requests.post(url, files=files)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
