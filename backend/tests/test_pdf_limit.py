import sys
import os
import fitz

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.pdf_processor import MAX_PDF_PAGES, validate_pdf_file

def test_pdf_page_limit():
    print(f"MAX_PDF_PAGES constant is set to: {MAX_PDF_PAGES}")
    assert MAX_PDF_PAGES == 200, f"Expected MAX_PDF_PAGES to be 200, got {MAX_PDF_PAGES}"
    
    # Create an in-memory PDF with 201 pages to test boundary validation
    doc = fitz.open()
    for _ in range(201):
        doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()

    raised = False
    try:
        validate_pdf_file(pdf_bytes, "test_large.pdf")
    except ValueError as e:
        raised = True
        print(f"Validation correctly caught excess page count: {e}")
        assert "PDF exceeds maximum page limit of 200 pages" in str(e)

    assert raised, "Validation should have raised ValueError for 201 pages document"

    # Create an in-memory PDF with 200 pages to test valid limit boundary
    doc2 = fitz.open()
    for _ in range(200):
        doc2.new_page()
    valid_pdf_bytes = doc2.tobytes()
    doc2.close()

    try:
        validate_pdf_file(valid_pdf_bytes, "test_valid.pdf")
        print("200-page PDF successfully validated without errors.")
    except ValueError as e:
        assert False, f"200-page PDF should be allowed, but raised: {e}"

if __name__ == "__main__":
    test_pdf_page_limit()
