import { useEffect, useRef } from 'react';

/**
 * Semnalul audio din fundalul hero-ului: câteva linii de undă care curg încet
 * și se aprind (și cresc) acolo unde e cursorul. Singura animație decorativă
 * de pe site.
 *
 * Se oprește când hero-ul iese din ecran și desenează un singur cadru static
 * pentru cine are „reduce motion” activat.
 */
const ACCENT: [number, number, number] = [124, 92, 255];
const SIGNAL: [number, number, number] = [45, 212, 238];

export function HeroSignal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = true;
    let pointer = -1; // 0..1 pe orizontală, -1 = fără cursor
    let focus = 0.68; // poziția netezită a „luminii”

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (ts: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const t = ts / 1000;
      ctx.clearRect(0, 0, w, h);
      focus += ((pointer < 0 ? 0.68 : pointer) - focus) * 0.06;

      for (let line = 0; line < 6; line++) {
        ctx.beginPath();
        const amp = h * 0.075 * (1 - line * 0.13);
        const base = h * 0.6 + line * 9;
        for (let x = 0; x <= w; x += 3) {
          const p = x / w;
          const env = Math.sin(p * Math.PI);
          const boost = 1 + 1.4 * Math.exp(-Math.pow((p - focus) * 6, 2));
          const y =
            base +
            (Math.sin(p * 14 + t * 1.4 + line * 0.7) * amp + Math.sin(p * 37 - t * 2.1 + line) * amp * 0.35) *
              env *
              boost;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const dim = `rgba(${ACCENT.join(',')},${0.42 - line * 0.06})`;
        const lit = `rgba(${SIGNAL.join(',')},${0.85 - line * 0.11})`;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, dim);
        grad.addColorStop(Math.max(0, focus - 0.16), dim);
        grad.addColorStop(focus, lit);
        grad.addColorStop(Math.min(1, focus + 0.16), dim);
        grad.addColorStop(1, dim);
        ctx.strokeStyle = grad;
        ctx.lineWidth = line === 0 ? 2 : 1;
        ctx.stroke();
      }

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer = (e.clientX - r.left) / r.width;
    };
    const onLeave = () => {
      pointer = -1;
    };

    const observer = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible && !wasVisible && !reduced) raf = requestAnimationFrame(draw);
    });

    resize();
    observer.observe(host);
    window.addEventListener('resize', resize);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-signal" aria-hidden />;
}
