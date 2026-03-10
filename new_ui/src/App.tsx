import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Eraser,
  Pipette,
  Settings,
  Download,
  RefreshCcw,
  Brain,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Check,
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { removeBackgroundAI, removeBackgroundManual } from './services/apiService';
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [pickedColors, setPickedColors] = useState<{ r: number, g: number, b: number, id: string }[]>([]);
  const [tolerance, setTolerance] = useState(30);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lastProcessingTime, setLastProcessingTime] = useState<string>('~2 min');
  const [lastRequestTimestamp, setLastRequestTimestamp] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImage(result);
        setOriginalImage(result);
        setPickedColors([]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
    multiple: false
  });

  const handleAutoRemove = async () => {
    if (!image) return;
    setIsProcessing(true);
    const t0 = Date.now();
    const result = await removeBackgroundAI(image);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    setLastProcessingTime(`${elapsed}s`);
    setLastRequestTimestamp(Date.now());
    if (result) {
      setImage(result);
    } else {
      alert(language === 'en' ? "AI background removal failed. Please try again." : "فشل حذف الخلفية بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
    }
    setIsProcessing(false);
  };

  const handleManualRemove = async () => {
    if (pickedColors.length === 0 || !originalImage) return;
    setIsProcessing(true);
    const t0 = Date.now();
    const result = await removeBackgroundManual(originalImage, pickedColors, tolerance);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    setLastProcessingTime(`${elapsed}s`);
    setLastRequestTimestamp(Date.now());
    if (result) {
      setImage(result);
    } else {
      alert(language === 'en' ? "Manual removal failed. Please try again." : "فشل عملية الحذف اليدوي. يرجى المحاولة مرة أخرى.");
    }
    setIsProcessing(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setPickedColors(prev => [...prev, {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      id: Math.random().toString(36).substring(2, 11)
    }]);
  };

  const removePickedColor = (id: string) => {
    setPickedColors(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = image;
    }
  }, [image]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const downloadImage = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = 'mutaz-ai-studio-removed-bg.png';
    link.click();
  };

  const resetImage = () => {
    setImage(originalImage);
    setPickedColors([]);
  };

  const clearImage = () => {
    setImage(null);
    setOriginalImage(null);
    setPickedColors([]);
  };

  const t = {
    en: {
      title: "MUTAZ AI STUDIO",
      slogan: "Intelligence in every pixel",
      drop: "Drop your image here",
      supports: "Supports PNG, JPG, WEBP.\nAI will handle the rest.",
      select: "Select File",
      auto: "AI Automatic",
      autoDesc: "One-click removal",
      manual: "Color Picker",
      manualDesc: "Manual selection",
      actions: "Actions",
      remove: "Remove Background",
      apply: "Apply Removal",
      selectedColors: "Selected Colors",
      tolerance: "Tolerance",
      toleranceDesc: "Tolerance determines how similar a color must be to the selected color to be removed. Higher values remove more colors.",
      status: "Status",
      ready: "SYSTEM READY",
      engine: "Engine",
      latency: "Est. Time",
      settings: "Settings",
      language: "Language",
      theme: "Theme",
      output: "Output Format",
      save: "Save Changes",
      dark: "Dark",
      light: "Light",
      builtBy: "was built by"
    },
    ar: {
      title: "استوديو معتز للذكاء الاصطناعي",
      slogan: "الذكاء في كل بكسل",
      drop: "ضع صورتك هنا",
      supports: "يدعم PNG, JPG, WEBP.\nالذكاء الاصطناعي سيتولى الباقي.",
      select: "اختر ملف",
      auto: "تلقائي بالذكاء الاصطناعي",
      autoDesc: "حذف بضغطة واحدة",
      manual: "ملتقط الألوان",
      manualDesc: "تحديد يدوي",
      actions: "الإجراءات",
      remove: "حذف الخلفية",
      apply: "تطبيق الحذف",
      selectedColors: "الألوان المختارة",
      tolerance: "درجة التسامح",
      toleranceDesc: "درجة التسامح تحدد مدى تشابه اللون مع اللون المختار ليتم حذفه. القيم الأعلى تحذف ألواناً أكثر.",
      status: "الحالة",
      ready: "النظام جاهز",
      engine: "المحرك",
      latency: "الوقت المتوقع",
      settings: "الإعدادات",
      language: "اللغة",
      theme: "المظهر",
      output: "صيغة الملف",
      save: "حفظ التغييرات",
      dark: "داكن",
      light: "فاتح",
      builtBy: "تم تطويره بواسطة"
    }
  }[language];

  return (
    <div className={cn(
      "min-h-screen relative flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden transition-colors duration-500",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050505] text-white",
      language === 'ar' && "font-sans"
    )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={cn("circuit-bg", theme === 'light' && "opacity-20")} />
      <div className={cn("circuit-lines", theme === 'light' && "opacity-5")} />

      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col items-center gap-6 mb-12 z-10">
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-orange rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
          <div className="relative w-40 h-40 rounded-full shadow-2xl glow-blue bg-black overflow-hidden">
            <div className="w-full h-full rounded-full flex items-center justify-center relative">
              <img
                src="/logo.png"
                alt="Mutaz AI Studio Logo"
                className="w-full h-full object-cover object-center rounded-full z-20 scale-[1.42] translate-y-[10px]"
              />
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-neon-blue via-neon-purple to-neon-orange bg-clip-text text-transparent">
              Artificial Intelligence
            </h1>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-neon-blue via-neon-purple to-neon-orange bg-clip-text text-transparent">
              In Every Pixel
            </h1>
          </div>
        </div>

        <div className="absolute top-8 right-8 md:right-12">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-xl glass-card transition-colors hover:bg-btn-bg"
          >
            <Settings className="w-5 h-5 text-muted" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl flex flex-col lg:flex-row gap-8 z-10">
        {/* Workspace */}
        <div className="flex-1 flex flex-col gap-4">
          <div
            className={cn(
              "relative flex-1 rounded-3xl border-2 transition-all duration-500 overflow-hidden min-h-[400px] flex items-center justify-center",
              !image ? "border-dashed" : "border-solid",
              !image
                ? (theme === 'light' ? "border-slate-300 bg-white" : "border-neon-blue/40 bg-neon-blue/5 hover:bg-neon-blue/10 hover:border-neon-blue/60")
                : (theme === 'light' ? "border-transparent bg-slate-200" : "border-border-subtle bg-btn-bg"),
              isDragActive && "border-neon-blue bg-neon-blue/10"
            )}
            {...(!image ? getRootProps() : {})}
          >
            {!image && <input {...getInputProps()} />}

            <AnimatePresence mode="wait">
              {!image ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center gap-4 text-center p-8"
                >
                  <div className="w-20 h-20 rounded-2xl bg-btn-bg flex items-center justify-center mb-2">
                    <Upload className="w-8 h-8 text-neon-blue animate-bounce" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{t.drop}</h2>
                  <p className="text-muted text-sm max-w-[280px] whitespace-pre-line">
                    {t.supports}
                  </p>
                  <button className="mt-4 px-8 py-3 rounded-full bg-btn-primary-bg text-btn-primary-text font-bold text-sm hover:scale-105 transition-transform">
                    {t.select}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group w-full h-full flex items-center justify-center p-4"
                >
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className={cn(
                      "max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-all",
                      mode === 'manual' && "cursor-crosshair"
                    )}
                  />

                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                      <Loader2 className="w-12 h-12 text-neon-blue animate-spin" />
                      <p className="text-neon-blue font-mono text-xs tracking-widest uppercase">Processing...</p>
                    </div>
                  )}

                  {/* Floating Controls */}
                  <div className={cn(
                    "absolute top-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity",
                    language === 'ar' ? 'left-6' : 'right-6'
                  )}>
                    <button
                      onClick={clearImage}
                      className="p-3 rounded-xl glass-card text-white hover:bg-red-500/20 hover:text-red-400 transition-all"
                      title={language === 'en' ? "Clear Image" : "حذف الصورة"}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={resetImage}
                      className="p-3 rounded-xl glass-card text-white hover:bg-neon-orange/20 hover:text-neon-orange transition-all"
                      title={language === 'en' ? "Reset Edits" : "إلغاء التعديلات"}
                    >
                      <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={downloadImage}
                      className="p-3 rounded-xl glass-card text-white hover:bg-neon-blue/20 hover:text-neon-blue transition-all"
                      title={language === 'en' ? "Download" : "تحميل"}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar / Controls */}
        <aside className="w-full lg:w-[22rem] flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-6 flex-1">
            {/* Mode Selector */}
            {image && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('auto')}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col items-center gap-3",
                    mode === 'auto'
                      ? "bg-neon-blue/10 border-neon-blue shadow-[0_0_20px_rgba(0,210,255,0.2)]"
                      : "bg-btn-bg border-border-subtle hover:bg-border-subtle"
                  )}
                >
                  <Brain className={cn("w-9 h-9", mode === 'auto' ? "text-neon-blue" : "text-muted")} />
                  <div className="text-center">
                    <p className="font-bold text-sm text-foreground">{t.auto}</p>
                    <p className="text-xs text-muted uppercase tracking-wider mt-0.5">{t.autoDesc}</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('manual')}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col items-center gap-3",
                    mode === 'manual'
                      ? "bg-neon-orange/10 border-neon-orange shadow-[0_0_20px_rgba(255,157,0,0.2)]"
                      : "bg-btn-bg border-border-subtle hover:bg-border-subtle"
                  )}
                >
                  <Pipette className={cn("w-9 h-9", mode === 'manual' ? "text-neon-orange" : "text-muted")} />
                  <div className="text-center">
                    <p className="font-bold text-sm text-foreground">{t.manual}</p>
                    <p className="text-xs text-muted uppercase tracking-wider mt-0.5">{t.manualDesc}</p>
                  </div>
                </button>
              </div>
            )}

            <div className="glass-card rounded-3xl p-6 flex flex-col gap-6 flex-1">
              <h3 className="text-base font-bold uppercase tracking-widest text-muted">{t.actions}</h3>

              <div className="flex flex-col gap-3 flex-1">
                {mode === 'auto' ? (
                  <button
                    disabled={!image || isProcessing}
                    onClick={handleAutoRemove}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    <Eraser className="w-5 h-5" />
                    {t.remove}
                  </button>
                ) : (
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="p-4 rounded-xl bg-btn-bg border border-border-subtle">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-3">{t.selectedColors}</p>
                      <div className="flex flex-wrap gap-2">
                        {pickedColors.map((color) => (
                          <div key={color.id} className="relative group">
                            <div
                              className="w-8 h-8 rounded-lg border border-border-subtle shadow-inner"
                              style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                            />
                            <button
                              onClick={() => removePickedColor(color.id)}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </div>
                        ))}
                        {pickedColors.length === 0 && (
                          <p className="text-[10px] text-muted italic">Click image to pick colors</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted">
                        <span>{t.tolerance}</span>
                        <span>{tolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="150"
                        value={tolerance}
                        onChange={(e) => setTolerance(parseInt(e.target.value))}
                        className="w-full h-1 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-neon-orange"
                      />
                      <p className="text-xs text-muted leading-relaxed mt-2">
                        {t.toleranceDesc}
                      </p>
                    </div>

                    <div className="mt-auto">
                      <button
                        disabled={pickedColors.length === 0 || isProcessing}
                        onClick={handleManualRemove}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-orange to-red-500 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        {t.apply}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats/Info */}
          <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t.status}</span>
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t.ready}
              </span>
            </div>
            <div className="h-[1px] bg-border-subtle" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted mb-1">{t.engine}</p>
                <p className="text-sm font-bold text-foreground">InSPyReNet Base</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted mb-1">{t.latency}</p>
                <p className="text-sm font-bold text-foreground">
                  {lastRequestTimestamp && (Date.now() - lastRequestTimestamp) < 5 * 60 * 1000
                    ? lastProcessingTime
                    : '~2 min'}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md glass-card rounded-3xl p-8 border-border-subtle"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-foreground">{t.settings}</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-btn-bg">
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted">{t.language}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLanguage('en')}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold transition-all",
                        language === 'en'
                          ? (theme === 'light' ? "bg-slate-800 border border-slate-900 text-white" : "bg-neon-blue/20 border border-neon-blue/50 text-neon-blue")
                          : (theme === 'light' ? "bg-slate-200 border border-slate-300 text-slate-600 hover:bg-slate-300" : "bg-btn-bg border border-border-subtle text-btn-text hover:bg-border-subtle")
                      )}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('ar')}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold transition-all",
                        language === 'ar'
                          ? (theme === 'light' ? "bg-slate-800 border border-slate-900 text-white" : "bg-neon-blue/20 border border-neon-blue/50 text-neon-blue")
                          : (theme === 'light' ? "bg-slate-200 border border-slate-300 text-slate-600 hover:bg-slate-300" : "bg-btn-bg border border-border-subtle text-btn-text hover:bg-border-subtle")
                      )}
                    >
                      العربية
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted">{t.theme}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold transition-all",
                        theme === 'dark'
                          ? "bg-neon-blue/20 border border-neon-blue/50 text-neon-blue"
                          : theme === 'light'
                            ? "bg-slate-200 border border-slate-300 text-slate-600 hover:bg-slate-300"
                            : "bg-btn-bg border border-border-subtle text-btn-text hover:bg-border-subtle"
                      )}
                    >
                      {t.dark}
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold transition-all",
                        theme === 'light'
                          ? "bg-slate-800 border border-slate-900 text-white"
                          : "bg-btn-bg border border-border-subtle text-btn-text hover:bg-border-subtle"
                      )}
                    >
                      {t.light}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted">{t.output}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={cn(
                      "py-3 rounded-xl text-xs font-bold transition-all",
                      theme === 'light' ? "bg-slate-800 border border-slate-900 text-white" : "bg-neon-blue/20 border border-neon-blue/50 text-neon-blue"
                    )}>
                      PNG (Transparent)
                    </button>
                    <button className={cn(
                      "py-3 rounded-xl text-xs font-bold transition-all",
                      theme === 'light'
                        ? "bg-slate-200 border border-slate-300 text-slate-600 cursor-not-allowed opacity-50"
                        : "bg-btn-bg border border-border-subtle text-btn-text cursor-not-allowed opacity-50"
                    )}>
                      JPG (White BG)
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full py-4 rounded-xl bg-btn-primary-bg text-btn-primary-text font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    {t.save}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-12 pt-8 border-t border-border-subtle flex flex-col items-center gap-6 relative z-20">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm md:text-base font-medium text-muted">
            {t.builtBy} <span className="text-foreground font-bold tracking-tight">MutazAIStudio</span>
          </p>
          <div className="flex items-center gap-4 relative z-30">
            <a href="https://www.instagram.com/mutazaistudio/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-btn-bg text-muted hover:text-neon-blue transition-all"><Instagram className="w-5 h-5" /></a>
            <a href="https://x.com/MutazAIStudio" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-btn-bg text-muted hover:text-foreground transition-all">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/mutaz-alamoudi-265a26159/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-btn-bg text-muted hover:text-neon-blue transition-all"><Linkedin className="w-5 h-5" /></a>
            <a href="https://www.youtube.com/@MutazAIStudio" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-btn-bg text-muted hover:text-red-500 transition-all"><Youtube className="w-5 h-5" /></a>
            <a href="https://www.tiktok.com/@mutazaistudio" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-btn-bg text-muted hover:text-[#00f2ea] transition-all">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 448 512">
                <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
              </svg>
            </a>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted uppercase tracking-[0.2em] font-mono mt-2">
          © 2026 MUTAZ AI STUDIO • ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
}
