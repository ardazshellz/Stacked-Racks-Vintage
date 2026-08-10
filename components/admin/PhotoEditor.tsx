"use client";

import Image from "next/image";
import { useState } from "react";

interface PhotoEditorProps {
  url: string;
  onClose: () => void;
  onSaved: (url: string) => void;
}

export default function PhotoEditor({ url, onClose, onSaved }: PhotoEditorProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, rotation, zoom, offsetX, offsetY }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save photo edit");
      onSaved(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save photo edit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Crop and rotate photo">
      <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto bg-[#101010] border border-white/15 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.2em] uppercase">Photo editor</p><h2 className="text-xl font-black">Crop, centre and rotate</h2></div>
          <button onClick={onClose} className="w-10 h-10 border border-white/15 text-xl" aria-label="Close photo editor">×</button>
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_260px] gap-5">
          <div className="relative mx-auto w-full max-w-[430px] aspect-[3/4] overflow-hidden bg-[#1a1a1a] border border-white/10">
            <Image src={url} alt="Photo crop preview" fill unoptimized className="object-cover transition-transform duration-150" style={{ transform: `translate(${offsetX / 2}%, ${offsetY / 2}%) scale(${zoom}) rotate(${rotation}deg)` }} />
            <div className="absolute inset-0 pointer-events-none border-[10px] border-black/10" />
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRotation((rotation + 270) % 360)} className="border border-white/15 px-3 py-3 text-xs font-black">↺ Rotate left</button>
              <button onClick={() => setRotation((rotation + 90) % 360)} className="border border-white/15 px-3 py-3 text-xs font-black">↻ Rotate right</button>
            </div>
            <Slider label="Zoom" min={1} max={3} step={0.05} value={zoom} onChange={setZoom} />
            <Slider label="Move left / right" min={-100} max={100} step={1} value={offsetX} onChange={setOffsetX} />
            <Slider label="Move up / down" min={-100} max={100} step={1} value={offsetY} onChange={setOffsetY} />
            <button onClick={() => { setRotation(0); setZoom(1); setOffsetX(0); setOffsetY(0); }} className="w-full border border-white/15 px-3 py-3 text-xs font-black">Reset framing</button>
            <p className="text-[#777] text-[10px] leading-relaxed">The saved image uses a consistent 3:4 product frame. Keep roughly equal space above and below the garment.</p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={() => void save()} disabled={saving} className="w-full bg-[#E8500A] disabled:opacity-50 px-4 py-4 text-white text-xs font-black tracking-[0.16em] uppercase">{saving ? "Saving edit…" : "Save crop and rotation"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="block text-[#888] text-[9px] font-black tracking-[0.16em] uppercase mb-2">{label}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#E8500A]" /></label>;
}
