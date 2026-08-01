import sys
import os
import unicodedata

# Force UTF-8 encoding on sys.stdout for Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.transliterator import transliterate_kannada_to_devanagari

# Test dataset of 12 known Kannada -> Devanagari script pairs + mixed script
TEST_CASES = [
    {
        "name": "Basic Greeting",
        "input": "ನಮಸ್ಕಾರ, ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ.",
        "expected_substring": "नमस्कार, ऎल्लरिगू सुस्वागत।"
    },
    {
        "name": "State Name",
        "input": "ಕರ್ನಾಟಕ",
        "expected_substring": "कर्नाटक"
    },
    {
        "name": "City Name (Override Check)",
        "input": "ಬೆಂಗಳೂರು",
        "expected_substring": "बेंगलूरु"
    },
    {
        "name": "Multi-word Phrase Override Check",
        "input": "ನನ್ನ ಊರು ಮೈಸೂರು.",
        "expected_substring": "मैसूरु"
    },
    {
        "name": "Kannada Alphabet Vowels",
        "input": "ಅ ಆ ಇ ಈ ಉ ಊ ಋ ಎ ಏ ಐ ಒ ಓ ಔ ಅಂ ಅಃ",
        "expected_substring": "अ आ इ ई उ ऊ ऋ ऎ ए ऐ ऒ ओ औ अं अः"
    },
    {
        "name": "Consonants ka-kha-ga-gha-nga",
        "input": "ಕ ಖ ಗ ಘ ಙ",
        "expected_substring": "क ख ग घ ङ"
    },
    {
        "name": "Sentence with Punctuation",
        "input": "ನಿಮ್ಮ ಹೆಸರೇನು? ನನ್ನ ಹೆಸರು ರಮೇಶ್.",
        "expected_substring": "निम्म हॆसरेनु? नन्न हॆसरु रमेश्।"
    },
    {
        "name": "Mixed Script: Kannada + English",
        "input": "FastAPI ಮತ್ತು React ಬಳಸಿ Kannada-to-Devanagari transliteration app.",
        "expected_substring": "FastAPI"
    },
    {
        "name": "Mixed Script: Numbers & Dates",
        "input": "ದಿನಾಂಕ 15 August 2026 ರಂದು 100% ಯಶಸ್ಸು.",
        "expected_substring": "15 August 2026"
    },
    {
        "name": "Conjunct Consonants (Otthakshara)",
        "input": "ಸಂಸ್ಕೃತ ಮತ್ತು ಕನ್ನಡ ಸಾಹಿತ್ಯ",
        "expected_substring": "संस्कृत मत्तु कन्नड साहित्य"
    },
    {
        "name": "Literature Quote",
        "input": "ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ.",
        "expected_substring": "सिरिगन्नडं गॆल्गॆ"
    },
    {
        "name": "Numbers & Symbols",
        "input": "₹500 ಬೆಲೆ (10 kg bag)",
        "expected_substring": "₹500"
    }
]

def run_test_suite():
    log_lines = []
    log_lines.append("==================================================")
    log_lines.append("  KANNADA TO DEVANAGARI TRANSLITERATION TEST SUITE")
    log_lines.append("==================================================\n")

    passed_count = 0
    failed_count = 0

    for i, test in enumerate(TEST_CASES, start=1):
        input_text = test["input"]
        expected = test["expected_substring"]
        output, stats = transliterate_kannada_to_devanagari(input_text)

        # Assertion check
        success = expected in output
        if success:
            passed_count += 1
            status_str = "PASSED"
        else:
            failed_count += 1
            status_str = "FAILED"

        log_lines.append(f"Test #{i}: {test['name']} -> {status_str}")
        log_lines.append(f"  Input:    {input_text}")
        log_lines.append(f"  Output:   {output}")
        log_lines.append(f"  Expected: {expected}")
        log_lines.append(f"  Stats:    Chars: In={stats['input_char_count']}, Out={stats['output_char_count']} | Overrides: {stats['overrides_applied']}")
        log_lines.append("-" * 50)

    log_lines.append(f"\nSUMMARY: {passed_count}/{len(TEST_CASES)} passed, {failed_count} failed.")

    # Write output to UTF-8 file
    results_path = os.path.join(os.path.dirname(__file__), "test_results.txt")
    with open(results_path, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))

    print("\n".join(log_lines))
    return failed_count == 0

if __name__ == "__main__":
    success = run_test_suite()
    if not success:
        sys.exit(1)
