import time
import logging
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

try:
    from services.transliterator import transliterate_kannada_to_devanagari
    from services.pdf_processor import (
        validate_pdf_file,
        process_pdf_bytes,
        generate_pdf_docx,
        pdf_jobs
    )
    from services.image_processor import validate_image_file, perform_ocr_on_bytes
except ModuleNotFoundError:
    from backend.services.transliterator import transliterate_kannada_to_devanagari
    from backend.services.pdf_processor import (
        validate_pdf_file,
        process_pdf_bytes,
        generate_pdf_docx,
        pdf_jobs
    )
    from backend.services.image_processor import validate_image_file, perform_ocr_on_bytes

logger = logging.getLogger("akshara.router.transliterate")

router = APIRouter(prefix="/api/transliterate", tags=["transliterate"])

class TextTransliterateRequest(BaseModel):
    text: str = Field(..., description="Kannada script input text to transliterate into Devanagari script")

class TransliterateStatistics(BaseModel):
    input_char_count: int
    input_word_count: int
    output_char_count: int
    output_word_count: int
    overrides_applied: list

class TextTransliterateResponse(BaseModel):
    result: str = Field(..., description="Transliterated Devanagari script output text")
    statistics: TransliterateStatistics
    execution_time_ms: float

class PdfPageResult(BaseModel):
    page: int
    original: str
    transliterated: str
    is_scanned: bool
    char_count: int
    overrides_applied: list

class ImageOcrResponse(BaseModel):
    extractedText: str = Field(..., description="Extracted Kannada text from OCR for user review")
    characterCount: int

@router.post("/text", response_model=TextTransliterateResponse)
async def transliterate_text(payload: TextTransliterateRequest):
    """
    Transliterate Kannada script text into Devanagari script.
    - Normalizes text to Unicode NFC form.
    - Applies override dictionary rules (longest-match first).
    - Processes remaining text deterministically using the Aksharamukha engine.
    """
    if payload.text is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input text field is required."
        )

    logger.info(f"Transliterating text ({len(payload.text)} chars)")
    start_time = time.perf_counter()
    result_text, stats = transliterate_kannada_to_devanagari(payload.text)
    end_time = time.perf_counter()

    execution_time_ms = round((end_time - start_time) * 1000, 2)

    return TextTransliterateResponse(
        result=result_text,
        statistics=TransliterateStatistics(**stats),
        execution_time_ms=execution_time_ms
    )

@router.post("/pdf", response_model=List[PdfPageResult])
async def transliterate_pdf_sync(file: UploadFile = File(...)):
    """
    Synchronous PDF transliteration endpoint.
    Parses PDF per page, detects scanned pages, and transliterates text to Devanagari.
    """
    try:
        contents = await file.read()
        validate_pdf_file(contents, file.filename)
        pages_result = process_pdf_bytes(contents)
        return pages_result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        logger.error(f"PDF processing error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"PDF processing failed: {e}")

@router.post("/pdf/async")
async def transliterate_pdf_async(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Asynchronous PDF background processing endpoint for multi-page documents.
    """
    try:
        contents = await file.read()
        validate_pdf_file(contents, file.filename)
        
        job_id = str(uuid.uuid4())
        pdf_jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "processed_pages": 0,
            "results": []
        }
        
        background_tasks.add_task(process_pdf_bytes, contents, job_id)
        return {"job_id": job_id, "status": "processing"}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

@router.get("/pdf/job/{job_id}")
async def get_pdf_job_status(job_id: str):
    """Retrieve async PDF processing job progress and results."""
    if job_id not in pdf_jobs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return pdf_jobs[job_id]

@router.post("/pdf/export-docx")
async def export_pdf_docx(pages: List[PdfPageResult]):
    """Export page transliterations to a Word .docx document."""
    try:
        pages_data = [p.dict() for p in pages]
        docx_bytes = generate_pdf_docx(pages_data)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=transliterated_document.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/image", response_model=ImageOcrResponse)
async def extract_image_text(file: UploadFile = File(...)):
    """
    Extract Kannada text from an image using OpenCV pre-processing & Tesseract OCR.
    MANDATORY REQUIREMENT: Returns extracted text for USER REVIEW before transliteration runs.
    """
    try:
        contents = await file.read()
        validate_image_file(contents, file.filename)
        
        extracted_text = perform_ocr_on_bytes(contents)
        return ImageOcrResponse(
            extractedText=extracted_text,
            characterCount=len(extracted_text)
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except RuntimeError as run_err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(run_err))
    except Exception as e:
        logger.error(f"Image processing error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Image processing failed: {e}")
