import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Prize } from './config';

export interface ScratchBoardProps { grid: Prize[]; onComplete: () => void }
export function ScratchBoard({ grid, onComplete }: ScratchBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const completed = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const size = 600;
    canvas.width = size; canvas.height = size;
    const tokens = getComputedStyle(document.documentElement);
    ctx.fillStyle = `hsl(${tokens.getPropertyValue('--primary')})`;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = `hsl(${tokens.getPropertyValue('--primary-foreground')} / .25)`;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 200, 0); ctx.lineTo(i * 200, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 200); ctx.lineTo(size, i * 200); ctx.stroke();
    }
    ctx.fillStyle = `hsl(${tokens.getPropertyValue('--accent')})`;
    ctx.textAlign = 'center'; ctx.font = 'bold 62px sans-serif';
    ctx.fillText('moleca', 300, 278);
    ctx.fillStyle = `hsl(${tokens.getPropertyValue('--primary-foreground')})`;
    ctx.font = 'bold 28px sans-serif'; ctx.fillText('RASPE AQUI', 300, 332);
    completed.current = false;
  }, []);
  function reveal() {
    if (completed.current) return;
    completed.current = true; setProgress(100); onComplete();
  }
  function scratch(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || completed.current) return;
    const canvas = event.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * 600 / rect.width, y: (event.clientY - rect.top) * 600 / rect.height };
    ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 65; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lastPoint.current?.x ?? point.x, lastPoint.current?.y ?? point.y);
    ctx.lineTo(point.x, point.y); ctx.stroke(); lastPoint.current = point;
    const pixels = ctx.getImageData(0, 0, 600, 600).data;
    let clear = 0;
    for (let i = 3; i < pixels.length; i += 64) if (pixels[i] < 50) clear++;
    const percent = Math.round(clear / (pixels.length / 64) * 100);
    setProgress(percent);
    if (percent >= 65) reveal();
  }
  return <>
    <div className="scratch-progress"><span>Seu momento de sorte</span><span>{progress}%</span></div>
    <div className="scratch-board">
      <div className="scratch-cells">{grid.map((item, index) => <div className="scratch-cell" key={`${item.id}-${index}`}><img src={item.image} alt={item.name} draggable={false} /></div>)}</div>
      <canvas ref={canvasRef} aria-label="Raspadinha Moleca" onPointerDown={event => { drawing.current = true; lastPoint.current = null; event.currentTarget.setPointerCapture(event.pointerId); scratch(event); }} onPointerMove={scratch} onPointerUp={() => { drawing.current = false; lastPoint.current = null; }} onPointerCancel={() => { drawing.current = false; }} />
    </div>
    <Button variant="ghost" className="reveal-button" onClick={reveal}>Revelar resultado</Button>
  </>;
}