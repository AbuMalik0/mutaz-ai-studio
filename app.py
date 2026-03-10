import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import cv2
import numpy as np
from PIL import Image
import torch
from transparent_background import Remover
import base64
import io
import asyncio

# Create an async lock to prevent memory exhaustion from concurrent ML inferences
inference_lock = asyncio.Lock()

# ==========================================
# 1. تهيئة النماذج للذكاء الاصطناعي (InSPyReNet)
# ==========================================
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading InSPyReNet Model on {device}...")
remover = Remover(mode='base', device=device)

# ==========================================
# FastAPI Setup
# ==========================================
app = FastAPI(title="Mutaz AI Studio APIs")

class ImageProcessRequest(BaseModel):
    image: str # Base64 encoded string

class ManualProcessRequest(BaseModel):
    image: str # Base64 encoded string
    colors: list[str] # List of hex strings like ["#ffffff", "#000000"]
    tolerance: int

def base64_to_pil(base64_str: str) -> Image.Image:
    """Convert base64 string to PIL Image"""
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
        image_data = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_data))
    except Exception as e:
        print(f"Error decoding image: {e}")
        raise ValueError("Invalid image format")

def pil_to_base64(img: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_str}"

@app.post("/api/remove-auto")
async def api_process_auto(request: ImageProcessRequest):
    """API endpoint for automatic background removal"""
    try:
        image = base64_to_pil(request.image)
        
        print("Processing Auto AI Image via API...")
        # Use a lock to ensure only one heavy inference happens at a time to prevent OOM crashes
        async with inference_lock:
            raw_mask_pil = remover.process(image, type='map').convert("L")
            
        mask_array = np.array(raw_mask_pil)
        
        img_rgba = image.convert("RGBA")
        img_array = np.array(img_rgba)
        
        soft_rgba = img_array.copy()
        soft_rgba[:, :, 3] = mask_array
        out_soft = Image.fromarray(soft_rgba)
        
        return {"result": pil_to_base64(out_soft)}
    except Exception as e:
        print(f"API Error Auto Remove: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/remove-manual")
async def api_process_manual(request: ManualProcessRequest):
    """API endpoint for manual color removal"""
    try:
        image = base64_to_pil(request.image)
        colors_state = request.colors
        tolerance = request.tolerance
        
        if not colors_state:
            return {"result": request.image}
            
        print(f"Processing Manual Mode via API: Removing {len(colors_state)} colors with Tolerance {tolerance}")
        
        # Use local lock for image processing array steps to prevent memory fragmentation on High Concurrency
        async with inference_lock:
            img_rgba = image.convert("RGBA")
            img_array = np.array(img_rgba)
        r, g, b, a = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2], img_array[:,:,3]
        
        final_mask = np.zeros_like(a, dtype=bool)
        
        for color_hex in colors_state:
            color_hex = color_hex.lstrip('#')
            target_rgb = (int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16))
            
            diff = np.sqrt((r.astype(int) - target_rgb[0])**2 + 
                           (g.astype(int) - target_rgb[1])**2 + 
                           (b.astype(int) - target_rgb[2])**2)
                           
            mask = diff < tolerance
            final_mask = final_mask | mask
        
        a[final_mask] = 0
        img_array[:,:,3] = a
        out_img = Image.fromarray(img_array)
        
        return {"result": pil_to_base64(out_img)}
    except Exception as e:
        print(f"API Error Manual Remove: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# Serve React Frontend
# ==========================================
# Mount the static directory from the React build
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/")
def serve_react_app():
    return FileResponse("static/index.html")
    
@app.get("/{catchall:path}")
def serve_react_app_catchall(catchall: str):
    # Pass all unknown routes to React router if needed
    if catchall not in ["favicon.ico", "logo.png"]:
        return FileResponse("static/index.html")
    return FileResponse(f"static/{catchall}")

if __name__ == "__main__":
    print("Starting Mutaz AI Studio with React UI on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
