import json
import logging
import os
import re
import hashlib
import unicodedata
from typing import Dict, Tuple, List
from aksharamukha import transliterate

logger = logging.getLogger("akshara.transliterator")

OVERRIDE_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "override_dictionary.json")

# In-memory LRU cache dictionary mapping SHA-256(text) -> (result_text, stats)
TRANSLITERATION_CACHE: Dict[str, Tuple[str, dict]] = {}
MAX_CACHE_ENTRIES = 500

def load_override_dictionary() -> Dict[str, str]:
    """Load the proper noun override dictionary from JSON file."""
    if os.path.exists(OVERRIDE_FILE_PATH):
        try:
            with open(OVERRIDE_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {unicodedata.normalize("NFC", k): unicodedata.normalize("NFC", v) for k, v in data.items()}
        except Exception as e:
            logger.error(f"Error loading override dictionary: {e}")
            return {}
    return {}

def save_override_dictionary(overrides: Dict[str, str]) -> None:
    """Save the override dictionary to JSON file."""
    normalized_data = {unicodedata.normalize("NFC", k): unicodedata.normalize("NFC", v) for k, v in overrides.items()}
    with open(OVERRIDE_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(normalized_data, f, ensure_ascii=False, indent=2)
    # Clear cache on override dictionary update
    TRANSLITERATION_CACHE.clear()
    logger.info(f"Saved {len(normalized_data)} rules to override dictionary. Cleared transliteration cache.")

def normalize_nfc(text: str) -> str:
    """Normalize text to Unicode NFC form."""
    if not text:
        return ""
    return unicodedata.normalize("NFC", text)

def apply_overrides(text: str, overrides: Dict[str, str]) -> Tuple[str, List[dict]]:
    """
    Replace words in Kannada text that match entries in the override dictionary.
    LONGEST-MATCH-FIRST STRATEGY: Sort keys by length descending.
    """
    if not text or not overrides:
        return text, []
    
    applied = []
    sorted_keys = sorted(overrides.keys(), key=len, reverse=True)
    
    processed = text
    for key in sorted_keys:
        if key in processed:
            replacement = overrides[key]
            processed = processed.replace(key, replacement)
            applied.append({"kannada": key, "devanagari": replacement})
            
    return processed, applied

def transliterate_kannada_to_devanagari(text: str) -> Tuple[str, dict]:
    """
    Main transliteration pipeline with SHA-256 result caching:
    1. NFC Unicode normalization on input
    2. SHA-256 hash lookup in in-memory cache
    3. Check override dictionary (longest-match first)
    4. Run Aksharamukha engine
    5. Cache result & return
    """
    if not text or not text.strip():
        return "", {
            "input_char_count": 0,
            "input_word_count": 0,
            "output_char_count": 0,
            "output_word_count": 0,
            "overrides_applied": []
        }

    # Step 1: Normalize input to NFC
    input_text = normalize_nfc(text)

    # Step 2: SHA-256 Cache Check
    cache_key = hashlib.sha256(input_text.encode("utf-8")).hexdigest()
    if cache_key in TRANSLITERATION_CACHE:
        logger.info("Transliteration cache hit!")
        return TRANSLITERATION_CACHE[cache_key]
    
    # Step 3: Load and apply overrides
    overrides = load_override_dictionary()
    processed_text, applied_overrides = apply_overrides(input_text, overrides)
    
    # Step 4: Run Aksharamukha engine
    try:
        raw_result = transliterate.process('Kannada', 'Devanagari', processed_text)
    except Exception as e:
        logger.error(f"Aksharamukha transliteration error: {e}")
        raw_result = processed_text

    # Step 5: Normalize output to NFC
    output_text = normalize_nfc(raw_result)

    input_words = len(re.findall(r'\S+', input_text))
    output_words = len(re.findall(r'\S+', output_text))

    stats = {
        "input_char_count": len(input_text),
        "input_word_count": input_words,
        "output_char_count": len(output_text),
        "output_word_count": output_words,
        "overrides_applied": applied_overrides
    }

    # Store in LRU cache
    if len(TRANSLITERATION_CACHE) >= MAX_CACHE_ENTRIES:
        # Evict oldest entry
        first_key = next(iter(TRANSLITERATION_CACHE))
        del TRANSLITERATION_CACHE[first_key]
        
    TRANSLITERATION_CACHE[cache_key] = (output_text, stats)
    return output_text, stats
