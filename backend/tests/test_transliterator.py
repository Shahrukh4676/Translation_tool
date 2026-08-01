import sys
import os
import unicodedata

# Reconfigure stdout for Windows console UTF-8 support
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.transliterator import transliterate_kannada_to_devanagari

def test_transliterate_sample_kannada():
    # Sample Kannada sentence: "ನಮಸ್ಕಾರ, ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ." (Hello, welcome everyone.)
    sample_text = "ನಮಸ್ಕಾರ, ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ."
    devanagari_output, stats = transliterate_kannada_to_devanagari(sample_text)

    print("--- Transliteration Test ---")
    print(f"Input  (Kannada):   {sample_text}")
    print(f"Output (Devanagari): {devanagari_output}")
    print(f"Stats: {stats}")

    assert devanagari_output != "", "Output should not be empty"
    # Verify Devanagari Unicode character range (\u0900-\u097F) is present
    has_devanagari = any("\u0900" <= c <= "\u097F" for c in devanagari_output)
    assert has_devanagari, "Output should contain Devanagari script characters"
    print("Test Passed Successfully!")

def test_transliterate_with_override():
    sample_text = "ನನ್ನ ಊರು ಬೆಂಗಳೂರು."
    devanagari_output, stats = transliterate_kannada_to_devanagari(sample_text)
    print("\n--- Override Test ---")
    print(f"Input  (Kannada):   {sample_text}")
    print(f"Output (Devanagari): {devanagari_output}")
    print(f"Overrides Applied:  {stats['overrides_applied']}")
    assert "बेंगलूरु" in devanagari_output, "Override for Bengaluru should be applied"
    print("Override Test Passed Successfully!")

if __name__ == "__main__":
    test_transliterate_sample_kannada()
    test_transliterate_with_override()

