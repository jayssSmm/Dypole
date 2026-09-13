import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Sliders,
  Check,
  Zap,
  Shield,
  Compass,
  Sun,
  Layers,
  Eye,
  Trash2,
  Paintbrush,
  Palette
} from 'lucide-react';
import {
  AppearanceSettings,
  BG_PRESETS,
  UI_THEME_PRESETS
} from '../hooks/useAppearance';
import { processImageFile } from '../utils/imageUtils';
import { THEME_COLOR_PALETTES, ACCENT_COLOR_PRESETS } from '../utils/colorUtils';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appearance: AppearanceSettings;
  onUpdateAppearance: (updates: Partial<AppearanceSettings>) => void;
  onReset: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  appearance,
  onUpdateAppearance,
  onReset,
}) => {
  const [activeSection, setActiveSection] = useState<'background' | 'logo' | 'style'>('background');
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBgDragging, setIsBgDragging] = useState(false);
  const [isLogoDragging, setIsLogoDragging] = useState(false);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Background File Upload Handler
  const handleBgFileChange = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessingBg(true);
    try {
      // Process & optimize background (max 1920x1080)
      const dataUrl = await processImageFile(file, 1920, 1080, 0.85);
      onUpdateAppearance({ customBg: dataUrl });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process background image');
    } finally {
      setIsProcessingBg(false);
    }
  };

  // Logo File Upload Handler
  const handleLogoFileChange = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessingLogo(true);
    try {
      // Process & optimize logo (max 256x256)
      const dataUrl = await processImageFile(file, 256, 256, 0.9);
      onUpdateAppearance({ customLogo: dataUrl });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process logo image');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#181818] border border-white/15 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                Customization &amp; Theme Studio
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-normal border border-cyan-400/30">
                  LIVE SCADA
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Customize wallpaper, logo, tile/header opacity, fill colors &amp; glass accents
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/10"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-black/20 px-5 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSection('background')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 font-bold tracking-wider rounded-t-lg transition-all text-[11px] border-t border-x shrink-0 ${
              activeSection === 'background'
                ? 'bg-[#181818] text-cyan-400 border-cyan-400/40 border-b-transparent shadow-[0_-2px_8px_rgba(0,240,255,0.15)]'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>BACKGROUND</span>
            {appearance.customBg && (
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('logo')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 font-bold tracking-wider rounded-t-lg transition-all text-[11px] border-t border-x shrink-0 ${
              activeSection === 'logo'
                ? 'bg-[#181818] text-cyan-400 border-cyan-400/40 border-b-transparent shadow-[0_-2px_8px_rgba(0,240,255,0.15)]'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>LOGO &amp; BRANDING</span>
            {appearance.customLogo && (
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('style')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 font-bold tracking-wider rounded-t-lg transition-all text-[11px] border-t border-x shrink-0 ${
              activeSection === 'style'
                ? 'bg-[#181818] text-cyan-400 border-cyan-400/40 border-b-transparent shadow-[0_-2px_8px_rgba(0,240,255,0.15)]'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>TILES &amp; ELEMENT STYLING</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 text-[11px] flex items-center justify-between">
            <span>{errorMessage}</span>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-red-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeSection === 'background' && (
            <div className="space-y-5">
              {/* 1. Background Upload Section */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Custom JPG/JPEG Wallpaper</span>
                  {appearance.customBg && (
                    <span className="text-cyan-400 text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> CUSTOM BACKGROUND ACTIVE
                    </span>
                  )}
                </label>

                {/* Drag and drop upload box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsBgDragging(true);
                  }}
                  onDragLeave={() => setIsBgDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsBgDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleBgFileChange(file);
                  }}
                  onClick={() => bgInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isBgDragging
                      ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                      : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/60 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    ref={bgInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBgFileChange(file);
                    }}
                  />

                  <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                    <Upload className={`w-6 h-6 ${isProcessingBg ? 'animate-bounce' : ''}`} />
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-200 text-xs">
                      {isProcessingBg
                        ? 'Optimizing and loading image...'
                        : 'Click to select or drag & drop custom JPG / JPEG wallpaper'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Supports high-res JPG, JPEG, PNG, WEBP files (auto-optimized for ultra fast rendering)
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Live Preview and Controls */}
              {appearance.customBg && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Live Wallpaper Preview &amp; Readability Tuning
                    </span>
                    <button
                      onClick={() => onUpdateAppearance({ customBg: null })}
                      className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Custom Wallpaper
                    </button>
                  </div>

                  {/* Visual Preview Box */}
                  <div className="relative h-32 rounded-lg overflow-hidden border border-white/15 flex items-center justify-center">
                    <div
                      className="absolute inset-0 bg-no-repeat transition-all"
                      style={{
                        backgroundImage: `url(${appearance.customBg})`,
                        backgroundSize: appearance.bgFit,
                        backgroundPosition: 'center',
                        filter: `blur(${appearance.bgBlur}px)`,
                      }}
                    />
                    {/* Overlay darkness layer */}
                    <div
                      className="absolute inset-0 bg-black transition-opacity"
                      style={{ opacity: appearance.bgOverlayOpacity / 100 }}
                    />
                    {/* Simulated HUD Card on top */}
                    <div className="relative z-10 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-cyan-400/40 text-center shadow-lg">
                      <span className="text-cyan-300 font-bold tracking-wider">HUD TEXT READABILITY TEST</span>
                      <p className="text-[10px] text-slate-200">50.02 Hz | 280 kW Nominal</p>
                    </div>
                  </div>

                  {/* Sliders Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Dark Overlay Opacity */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Dark Dimming Overlay:</span>
                        <span className="text-cyan-400 font-bold">{appearance.bgOverlayOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="95"
                        step="5"
                        value={appearance.bgOverlayOpacity}
                        onChange={(e) =>
                          onUpdateAppearance({ bgOverlayOpacity: Number(e.target.value) })
                        }
                        className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-500">
                        Higher values dim the wallpaper so SCADA meters stay crisp.
                      </p>
                    </div>

                    {/* Background Blur */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Wallpaper Blur Effect:</span>
                        <span className="text-cyan-400 font-bold">{appearance.bgBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={appearance.bgBlur}
                        onChange={(e) =>
                          onUpdateAppearance({ bgBlur: Number(e.target.value) })
                        }
                        className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-500">
                        Softens intricate background textures behind charts.
                      </p>
                    </div>
                  </div>

                  {/* Background Fit Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-slate-300 text-[11px]">Background Scaling Mode:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['cover', 'contain', 'tile', 'center'] as const).map((fit) => (
                        <button
                          key={fit}
                          onClick={() => onUpdateAppearance({ bgFit: fit })}
                          className={`py-1.5 px-2 rounded-lg border text-center uppercase tracking-wider text-[10px] transition-all ${
                            appearance.bgFit === fit
                              ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                              : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Preset Background Themes */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Or Choose from Curated Polar Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {BG_PRESETS.map((preset) => {
                    const isSelected =
                      (preset.url === null && appearance.customBg === null) ||
                      appearance.customBg === preset.url;

                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onUpdateAppearance({ customBg: preset.url });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative overflow-hidden group ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                            : 'bg-white/[0.03] border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div
                          className="h-12 w-full rounded-lg relative overflow-hidden border border-white/10"
                          style={{
                            backgroundImage: preset.url
                              ? `url(${preset.url})`
                              : preset.previewGradient,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </div>
                          )}
                        </div>

                        <div className="leading-tight">
                          <p className="font-bold text-slate-200 text-[11px]">{preset.name}</p>
                          <p className="text-[9px] text-slate-400 line-clamp-1">{preset.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'logo' && (
            <div className="space-y-5">
              {/* Logo Section */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Custom Station Logo (JPG/JPEG/PNG)</span>
                  {appearance.customLogo && (
                    <span className="text-cyan-400 text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> CUSTOM LOGO ACTIVE
                    </span>
                  )}
                </label>

                {/* Drag & drop upload box for Logo */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsLogoDragging(true);
                  }}
                  onDragLeave={() => setIsLogoDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsLogoDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleLogoFileChange(file);
                  }}
                  onClick={() => logoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isLogoDragging
                      ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                      : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/60 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFileChange(file);
                    }}
                  />

                  <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                    <Upload className={`w-6 h-6 ${isProcessingLogo ? 'animate-bounce' : ''}`} />
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-200 text-xs">
                      {isProcessingLogo
                        ? 'Processing logo...'
                        : 'Click to select or drag & drop custom JPG / JPEG / PNG logo'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Recommended square ratio (e.g. 256x256 or 512x512)
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Header Simulation Preview */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    Header Branding Preview
                  </span>
                  {appearance.customLogo && (
                    <button
                      onClick={() => onUpdateAppearance({ customLogo: null })}
                      className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Reset to DyPole Logo
                    </button>
                  )}
                </div>

                {/* Simulated Header Bar */}
                <div className="p-3 bg-[#1e1e1e] rounded-lg border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.45)] overflow-hidden">
                      {appearance.customLogo ? (
                        <img
                          src={appearance.customLogo}
                          alt="Custom Logo Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white font-extrabold text-sm tracking-wider">
                        {appearance.stationName || 'DyPole'}
                      </span>
                      <span className="text-cyan-400 font-semibold text-xs tracking-widest">
                        {appearance.stationSubtitle || 'POWER CONTROL'}
                      </span>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/50 text-[10px] text-emerald-400 font-bold">
                    SYSTEM ARMED
                  </div>
                </div>
              </div>

              {/* Station Name & Subtitle customization inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 text-[11px] font-bold">Station / System Name:</label>
                  <input
                    type="text"
                    value={appearance.stationName}
                    onChange={(e) => onUpdateAppearance({ stationName: e.target.value })}
                    placeholder="e.g. DyPole or Maitri SCADA"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/15 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 text-[11px] font-bold">Subtitle / Tagline:</label>
                  <input
                    type="text"
                    value={appearance.stationSubtitle}
                    onChange={(e) => onUpdateAppearance({ stationSubtitle: e.target.value })}
                    placeholder="e.g. POWER CONTROL"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/15 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              {/* Quick Sample Logo Presets */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  Preset Tactical Badges
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'DyPole Default', icon: Zap, logo: null },
                    { 
                      name: 'Polar Compass', 
                      icon: Compass, 
                      logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2300f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>' 
                    },
                    { 
                      name: 'Antarctic Shield', 
                      icon: Shield, 
                      logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2338bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' 
                    },
                    { 
                      name: 'Solar Helios', 
                      icon: Sun, 
                      logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' 
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => onUpdateAppearance({ customLogo: preset.logo })}
                      className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] flex items-center gap-2 text-slate-300 hover:text-white transition-all text-[10px]"
                    >
                      <preset.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'style' && (
            <div className="space-y-5">
              {/* 1. Quick UI Theme Presets */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  One-Click Glass Theme Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {UI_THEME_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onUpdateAppearance({
                          cardBgColor: t.cardBgColor,
                          cardOpacity: t.cardOpacity,
                          cardBlur: t.cardBlur,
                          cardBorderOpacity: t.cardBorderOpacity,
                          headerBgColor: t.headerBgColor,
                          headerOpacity: t.headerOpacity,
                          accentColor: t.accentColor,
                        });
                      }}
                      className="p-2.5 rounded-xl border border-white/10 hover:border-cyan-400/60 bg-white/[0.03] hover:bg-white/[0.06] text-left transition-all flex items-center gap-2.5"
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: t.accentColor }}
                      />
                      <div className="truncate">
                        <p className="font-bold text-slate-200 text-[11px] truncate">{t.name}</p>
                        <p className="text-[9px] text-slate-400">{t.cardOpacity}% Opacity</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Live Interactive HUD Card & Header Preview */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    Live Tile &amp; Glass Transparency Preview
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Live updates in real-time
                  </span>
                </div>

                {/* Interactive Simulated Tile and Header */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/20 via-black/40 to-slate-900/40 border border-white/10 space-y-3">
                  {/* Simulated Header */}
                  <div
                    className="px-3 py-2 rounded-lg border border-white/10 flex items-center justify-between text-[11px]"
                    style={{
                      backgroundColor: appearance.headerBgColor,
                      opacity: appearance.headerOpacity / 100,
                    }}
                  >
                    <span className="font-bold text-white">SIMULATED HEADER BAR</span>
                    <span style={{ color: appearance.accentColor }}>{appearance.headerOpacity}% OPACITY</span>
                  </div>

                  {/* Simulated HUD Card */}
                  <div
                    className="p-3.5 rounded-xl border shadow-lg space-y-2 transition-all"
                    style={{
                      backgroundColor: appearance.cardBgColor,
                      opacity: Math.max(appearance.cardOpacity / 100, 0.2),
                      borderColor: `rgba(255,255,255,${appearance.cardBorderOpacity / 100})`,
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-white text-[11px]">HUD TILE / CARD SAMPLE</span>
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-bold"
                        style={{
                          backgroundColor: `${appearance.accentColor}20`,
                          color: appearance.accentColor,
                          borderColor: `${appearance.accentColor}50`,
                          borderWidth: '1px',
                        }}
                      >
                        ACTIVE TELEMETRY
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-[9px] text-slate-400">METRIC FLOW</span>
                        <p className="text-sm font-bold" style={{ color: appearance.accentColor }}>
                          280.0 kW
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white/5 border border-white/5">
                        <span className="text-[9px] text-slate-400">HEALTH SOH</span>
                        <p className="text-sm font-bold text-slate-200">96.4%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Detailed Tile / HUD Card Controls */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                  HUD Card / Tile Controls
                </div>

                {/* Card Fill Color Swatches & Picker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-[11px]">Card Fill Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={appearance.cardBgColor}
                        onChange={(e) => onUpdateAppearance({ cardBgColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-slate-400 font-mono text-[10px]">{appearance.cardBgColor}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {THEME_COLOR_PALETTES.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => onUpdateAppearance({ cardBgColor: c.hex })}
                        className={`h-7 rounded-lg border flex items-center justify-center transition-all ${
                          appearance.cardBgColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                            : 'border-white/15 hover:border-white/40'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        <span className="text-[9px] text-slate-300 font-bold drop-shadow">
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Sliders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Card Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Tile Opacity:</span>
                      <span className="text-cyan-400 font-bold">{appearance.cardOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={appearance.cardOpacity}
                      onChange={(e) =>
                        onUpdateAppearance({ cardOpacity: Number(e.target.value) })
                      }
                      className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-500">Backdrop fill transparency</p>
                  </div>

                  {/* Card Blur */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Glass Blur:</span>
                      <span className="text-cyan-400 font-bold">{appearance.cardBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="2"
                      value={appearance.cardBlur}
                      onChange={(e) =>
                        onUpdateAppearance({ cardBlur: Number(e.target.value) })
                      }
                      className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-500">Frosted glass blur intensity</p>
                  </div>

                  {/* Card Border Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Border Lightness:</span>
                      <span className="text-cyan-400 font-bold">{appearance.cardBorderOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="2"
                      value={appearance.cardBorderOpacity}
                      onChange={(e) =>
                        onUpdateAppearance({ cardBorderOpacity: Number(e.target.value) })
                      }
                      className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-500">Edge rim glass brightness</p>
                  </div>
                </div>
              </div>

              {/* 4. Header & Navigation Controls */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                  Header &amp; Subheader Glass Controls
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Header Fill Color */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 text-[11px]">Header Color:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={appearance.headerBgColor}
                          onChange={(e) => onUpdateAppearance({ headerBgColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-slate-400 font-mono text-[10px]">{appearance.headerBgColor}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {THEME_COLOR_PALETTES.slice(0, 4).map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => onUpdateAppearance({ headerBgColor: c.hex })}
                          className={`h-6 rounded-md border flex items-center justify-center text-[9px] font-bold ${
                            appearance.headerBgColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'border-cyan-400 ring-1 ring-cyan-400'
                              : 'border-white/15'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Header Opacity & Blur */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Header Opacity:</span>
                        <span className="text-cyan-400 font-bold">{appearance.headerOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={appearance.headerOpacity}
                        onChange={(e) =>
                          onUpdateAppearance({ headerOpacity: Number(e.target.value) })
                        }
                        className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Header Blur:</span>
                        <span className="text-cyan-400 font-bold">{appearance.headerBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="2"
                        value={appearance.headerBlur}
                        onChange={(e) =>
                          onUpdateAppearance({ headerBlur: Number(e.target.value) })
                        }
                        className="w-full accent-cyan-400 bg-white/10 rounded h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Accent & Glow Color */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                  Glow Accent &amp; UI Highlight Color
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {ACCENT_COLOR_PRESETS.map((a) => (
                    <button
                      key={a.hex}
                      onClick={() => onUpdateAppearance({ accentColor: a.hex })}
                      className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1.5 transition-all ${
                        appearance.accentColor.toLowerCase() === a.hex.toLowerCase()
                          ? 'border-white shadow-[0_0_12px_rgba(255,255,255,0.4)] bg-white/10'
                          : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: a.hex }}
                      />
                      <span className="text-[9px] text-slate-300 truncate w-full">{a.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-white/[0.04] border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-[11px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(0,240,255,0.4)] flex items-center gap-1.5 text-[11px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply &amp; Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
