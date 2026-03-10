import modal
import os

# ===================================================================
# الخطوة 0: تعريف مجلد التخزين الدائم للأوزان (يبقى بين جميع الـ Runs)
# ===================================================================
model_volume = modal.Volume.from_name("transparent-bg-weights", create_if_missing=True)
MODEL_CACHE_DIR = "/model-weights"

def download_weights():
    """تحميل أوزان النموذج إلى الـ Volume أثناء البناء"""
    import os
    # نوجّه المكتبة لتحفظ الأوزان داخل مسار الـ Volume المُوصَل
    os.environ["HOME"] = MODEL_CACHE_DIR
    from transparent_background import Remover
    print("Downloading model weights (base mode)...")
    _ = Remover(mode='base', device='cpu')
    print(f"Weights saved to {MODEL_CACHE_DIR}/.transparent-background")

# ===================================================================
# الخطوة 1: تعريف بيئة النظام
# ===================================================================
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "fastapi",
        "pydantic",
        "numpy",
        "Pillow",
        "opencv-python-headless",
        "torch",
        "torchvision",
        "transparent-background"
    )
    # تحميل الأوزان مرة واحدة فقط وحفظها في الـ Volume
    .run_function(
        download_weights,
        volumes={MODEL_CACHE_DIR: model_volume},
    )
)

app = modal.App("mutaz-bg-removal")

# ===================================================================
# الخطوة 2: كلاس المعالجة — يربط الـ Volume ويحمّل الأوزان من القرص
# ===================================================================
@app.cls(
    image=image,
    gpu="T4",
    scaledown_window=300,
    volumes={MODEL_CACHE_DIR: model_volume}
)
class BgRemover:
    @modal.enter()
    def load_model(self):
        """تُستدعى مرة واحدة عند استيقاظ الخادم — الأوزان موجودة في الـ Volume"""
        import os
        import torch
        from transparent_background import Remover

        # نوجّه المكتبة إلى مسار الـ Volume حيث توجد الأوزان المحفوظة
        os.environ["HOME"] = MODEL_CACHE_DIR

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[BgRemover] Loading model on {self.device} (base mode)...")
        self.remover = Remover(mode='base', device=self.device)
        print("[BgRemover] Model loaded successfully ✓")

    @modal.method()
    def process_auto(self, image_b64: str) -> str:
        """دالة المعالجة التلقائية بالذكاء الاصطناعي"""
        import io, base64
        import numpy as np
        from PIL import Image

        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]

        image_b64 = image_b64.strip()
        padding = len(image_b64) % 4
        if padding > 0:
            image_b64 += "=" * (4 - padding)

        try:
            image_data = base64.b64decode(image_b64)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
        except Exception as e:
            raise ValueError(f"فشل في فك تشفير الصورة: {str(e)}")

        raw_mask_pil = self.remover.process(image, type='map').convert("L")
        mask_array = np.array(raw_mask_pil)

        img_rgba = image.convert("RGBA")
        img_array = np.array(img_rgba)

        soft_rgba = img_array.copy()
        soft_rgba[:, :, 3] = mask_array
        out_soft = Image.fromarray(soft_rgba)

        buffered = io.BytesIO()
        out_soft.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"

    @modal.method()
    def process_manual(self, image_b64: str, colors: list, tolerance: int) -> str:
        """دالة الإزالة اليدوية باللون"""
        import io, base64
        import numpy as np
        from PIL import Image

        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]

        image_b64 = image_b64.strip()
        padding = len(image_b64) % 4
        if padding > 0:
            image_b64 += "=" * (4 - padding)

        try:
            image_data = base64.b64decode(image_b64)
            image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            raise ValueError(f"فشل في فك تشفير الصورة: {str(e)}")

        img_rgba = image.convert("RGBA")
        img_array = np.array(img_rgba)
        r, g, b, a = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2], img_array[:,:,3]

        final_mask = np.zeros_like(a, dtype=bool)

        for color_hex in colors:
            color_hex = color_hex.lstrip('#')
            target_rgb = (int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16))

            diff = np.sqrt(
                (r.astype(int) - target_rgb[0])**2 +
                (g.astype(int) - target_rgb[1])**2 +
                (b.astype(int) - target_rgb[2])**2
            )

            final_mask = final_mask | (diff < tolerance)

        a[final_mask] = 0
        img_array[:,:,3] = a
        out_img = Image.fromarray(img_array)

        buffered = io.BytesIO()
        out_img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"


# ===================================================================
# الخطوة 3: خادم FastAPI الرئيسي
# ===================================================================
@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    web_app = FastAPI(title="Mutaz AI Studio - BG Removal API")

    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class ImageProcessRequest(BaseModel):
        image: str

    class ManualProcessRequest(BaseModel):
        image: str
        colors: list[str]
        tolerance: int

    @web_app.post("/api/remove-auto")
    async def api_process_auto(request: ImageProcessRequest):
        try:
            remover = BgRemover()
            result_b64 = remover.process_auto.remote(request.image)
            return {"result": result_b64}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @web_app.post("/api/remove-manual")
    async def api_process_manual(request: ManualProcessRequest):
        try:
            remover = BgRemover()
            result_b64 = remover.process_manual.remote(request.image, request.colors, request.tolerance)
            return {"result": result_b64}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return web_app
