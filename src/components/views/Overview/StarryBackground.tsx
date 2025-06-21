import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface StarryBackgroundProps {
  blur?: boolean;
}

const StarryBackground: React.FC<StarryBackgroundProps> = ({ blur = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<any[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars
    class Star {
      x: number;
      y: number;
      originalX: number;
      originalY: number;
      size: number;
      brightness: number;
      baseBrightness: number;
      twinkleSpeed: number;
      twinklePhase: number;
      driftSpeed: number;
      driftPhase: number;
      driftRadius: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.originalX = this.x;
        this.originalY = this.y;
        this.size = Math.random() * 0.8 + 0.2; // Much smaller: 0.2-1px
        this.baseBrightness = Math.random() * 0.4 + 0.1; // More subtle: 0.1-0.5
        this.brightness = this.baseBrightness;
        this.twinkleSpeed = Math.random() * 0.015 + 0.003; // Slower, more subtle twinkle
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.driftSpeed = Math.random() * 0.008 + 0.002; // Very slow drift
        this.driftPhase = Math.random() * Math.PI * 2;
        this.driftRadius = Math.random() * 1.5 + 0.5; // Small drift radius
      }

      update() {
        // Subtle twinkling
        this.twinklePhase += this.twinkleSpeed;
        this.brightness = this.baseBrightness + Math.sin(this.twinklePhase) * this.baseBrightness * 0.4;
        
        // Subtle drift movement
        this.driftPhase += this.driftSpeed;
        this.x = this.originalX + Math.sin(this.driftPhase) * this.driftRadius;
        this.y = this.originalY + Math.cos(this.driftPhase * 1.3) * this.driftRadius * 0.6;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.fill();

        // Very subtle glow for only the brightest stars
        if (this.brightness > 0.35 && this.size > 0.6) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 1.5
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brightness * 0.15})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }
    }

    // Much more stars - denser starfield
    const starCount = Math.floor((canvas.width * canvas.height) / 800);
    for (let i = 0; i < starCount; i++) {
      starsRef.current.push(new Star());
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update stars
      starsRef.current.forEach(star => {
        star.update();
        star.draw(ctx);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Near-Black Gradient Background with Subtle Purple Hues */}
      <div className="fixed inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-black" />
      
      {/* Subtle Purple Accent Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-purple-900/10 to-transparent" />
      
      {/* Very Subtle Ambient Light Effects */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-400/3 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Stars Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
      />

      {/* Blur Overlay */}
      <motion.div
        initial={{ backdropFilter: 'blur(0px)' }}
        animate={{ backdropFilter: blur ? 'blur(8px)' : 'blur(0px)' }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 pointer-events-none"
      />
    </>
  );
};

export default StarryBackground;