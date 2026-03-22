import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  orbitRadius: number;
  opacity: number;
  color: string;
  isBursting?: boolean;
  vx?: number;
  vy?: number;
}

const AuraCore: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const particles = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);

  const initParticles = (width: number, height: number) => {
    const p: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      const isOrb = Math.random() > 0.7;
      p.push({
        x: width / 2,
        y: height / 2,
        size: isOrb ? Math.random() * 4 + 2 : Math.random() * 2 + 1,
        speed: Math.random() * 0.02 + 0.005,
        angle: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * 100 + 160,
        opacity: Math.random() * 0.5 + 0.3,
        color: isOrb ? '#a855f7' : '#ffffff',
      });
    }
    particles.current = p;
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    particles.current.forEach((p) => {
      if (p.isBursting && p.vx !== undefined && p.vy !== undefined) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= 0.01;
        if (p.opacity <= 0) {
          // Reset particle after burst
          p.isBursting = false;
          p.opacity = Math.random() * 0.5 + 0.3;
          p.angle = Math.random() * Math.PI * 2;
        }
      } else {
        p.angle += p.speed;
        p.x = centerX + Math.cos(p.angle) * p.orbitRadius;
        p.y = centerY + Math.sin(p.angle) * p.orbitRadius;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      
      if (p.color === '#a855f7') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#a855f7';
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.fill();
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
        initParticles(canvasRef.current.width, canvasRef.current.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 20;
    const y = (e.clientY - rect.top - rect.height / 2) / 20;
    setTilt({ x: -y, y: x });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleBurst = () => {
    particles.current.forEach((p) => {
      p.isBursting = true;
      const angle = Math.random() * Math.PI * 2;
      const force = Math.random() * 10 + 5;
      p.vx = Math.cos(angle) * force;
      p.vy = Math.sin(angle) * force;
    });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] flex flex-col items-center justify-center bg-[#080410] overflow-hidden rounded-3xl border border-white/5"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,transparent_70%)]" />

      <canvas 
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* The Sphere */}
      <motion.div
        onClick={handleBurst}
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: [1, 1.04, 1],
        }}
        transition={{
          rotateX: { type: 'spring', stiffness: 100, damping: 20 },
          rotateY: { type: 'spring', stiffness: 100, damping: 20 },
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ perspective: '1000px' }}
        className="relative w-[300px] h-[300px] cursor-pointer group"
      >
        <div 
          className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-purple-600/20 to-indigo-900/40 backdrop-blur-xl border border-white/20 shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-morph"
          style={{
            boxShadow: 'inset 0 0 40px rgba(255,255,255,0.1), 0 0 60px rgba(168,85,247,0.2)',
          }}
        >
          {/* Glass Sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50 rounded-[inherit]" />
          
          {/* Lightning Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={80} className="text-white fill-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
          </div>
        </div>
      </motion.div>

      {/* Label */}
      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
          <span className="font-mono text-sm tracking-[0.3em] text-white/60 font-bold">AURA CORE</span>
        </div>
        <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest">Neural Synchronization Active</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes morph {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        .animate-morph {
          animation: morph 8s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default AuraCore;
