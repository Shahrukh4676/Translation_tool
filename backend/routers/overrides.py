from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from services.transliterator import load_override_dictionary, save_override_dictionary, normalize_nfc

router = APIRouter(prefix="/api/overrides", tags=["overrides"])

class OverrideItem(BaseModel):
    kannada: str = Field(..., description="Kannada word or phrase")
    devanagari: str = Field(..., description="Forced Devanagari transliteration")

@router.get("/")
async def get_overrides():
    """Retrieve all current override dictionary mappings."""
    data = load_override_dictionary()
    return {"overrides": [{"kannada": k, "devanagari": v} for k, v in data.items()]}

@router.post("/")
async def add_or_update_override(item: OverrideItem):
    """Add or update a Kannada to Devanagari override rule."""
    k_norm = normalize_nfc(item.kannada.strip())
    d_norm = normalize_nfc(item.devanagari.strip())
    
    if not k_norm or not d_norm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both Kannada and Devanagari fields must be non-empty."
        )

    current = load_override_dictionary()
    current[k_norm] = d_norm
    save_override_dictionary(current)
    return {"message": "Override saved successfully", "kannada": k_norm, "devanagari": d_norm}

@router.delete("/{kannada_word}")
async def delete_override(kannada_word: str):
    """Delete an override rule by Kannada word key."""
    k_norm = normalize_nfc(kannada_word.strip())
    current = load_override_dictionary()
    
    if k_norm in current:
        del current[k_norm]
        save_override_dictionary(current)
        return {"message": "Override deleted successfully", "kannada": k_norm}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Override for '{k_norm}' not found."
        )
