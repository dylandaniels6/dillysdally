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

    // Enhanced Star class with different behaviors
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
      
      // New twinkling properties
      isTwinkling: boolean;
      twinkleIntensity: number;
      flashSpeed: number;
      flashPhase: number;
      
      // Color properties for variety
      color: 'white' | 'purple' | 'blue';
      colorValue: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.originalX = this.x;
        this.originalY = this.y;
        this.size = Math.random() * 0.8 + 0.2; // 0.2-1px
        this.baseBrightness = Math.random() * 0.4 + 0.1; // 0.1-0.5
        this.brightness = this.baseBrightness;
        this.twinkleSpeed = Math.random() * 0.015 + 0.003; // Slow, subtle twinkle
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.driftSpeed = Math.random() * 0.008 + 0.002; // Very slow drift
        this.driftPhase = Math.random() * Math.PI * 2;
        this.driftRadius = Math.random() * 1.5 + 0.5; // Small drift radius
        
        // Enhanced twinkling - only some stars do this
        this.isTwinkling = Math.random() > 0.85; // 15% of stars twinkle dramatically
        this.twinkleIntensity = this.isTwinkling ? Math.random() * 0.8 + 0.5 : 0.3; // Stronger twinkle
        this.flashSpeed = Math.random() * 0.02 + 0.008; // Faster flash for twinkling stars
        this.flashPhase = Math.random() * Math.PI * 2;
        
        // Color variety - most white, some colored
        const colorRandom = Math.random();
        if (colorRandom > 0.92) {
          this.color = 'purple';
          this.colorValue = 'rgba(168, 85, 247, ';
        } else if (colorRandom > 0.88) {
          this.color = 'blue';
          this.colorValue = 'rgba(59, 130, 246, ';
        } else {
          this.color = 'white';
          this.colorValue = 'rgba(255, 255, 255, ';
        }
      }

      update() {
        // Regular subtle twinkling for all stars
        this.twinklePhase += this.twinkleSpeed;
        let baseFlicker = Math.sin(this.twinklePhase) * this.baseBrightness * 0.4;
        
        // Enhanced dramatic twinkling for special stars
        if (this.isTwinkling) {
          this.flashPhase += this.flashSpeed;
          let dramaticFlash = Math.sin(this.flashPhase) * this.twinkleIntensity;
          
          // Sometimes add a sharp flash
          if (Math.random() > 0.996) { // Rare sharp flash
            dramaticFlash += Math.random() * 0.8;
          }
          
          this.brightness = this.baseBrightness + baseFlicker + dramaticFlash;
        } else {
          this.brightness = this.baseBrightness + baseFlicker;
        }
        
        // Clamp brightness
        this.brightness = Math.max(0, Math.min(1, this.brightness));
        
        // Subtle drift movement
        this.driftPhase += this.driftSpeed;
        this.x = this.originalX + Math.sin(this.driftPhase) * this.driftRadius;
        this.y = this.originalY + Math.cos(this.driftPhase * 1.3) * this.driftRadius * 0.6;
      }

      draw(ctx: CanvasRenderingContext2D) {
        // Main star
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `${this.colorValue}${this.brightness})`;
        ctx.fill();

        // Enhanced glow for twinkling and bright stars
        const shouldGlow = this.isTwinkling || (this.brightness > 0.35 && this.size > 0.6);
        
        if (shouldGlow) {
          // Inner glow
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
          const innerGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 1.5
          );
          innerGradient.addColorStop(0, `${this.colorValue}${this.brightness * 0.2})`);
          innerGradient.addColorStop(1, `${this.colorValue}0)`);
          ctx.fillStyle = innerGradient;
          ctx.fill();
          
          // Outer glow for very bright twinkling stars
          if (this.isTwinkling && this.brightness > 0.7) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            const outerGradient = ctx.createRadialGradient(
              this.x, this.y, 0,
              this.x, this.y, this.size * 3
            );
            outerGradient.addColorStop(0, `${this.colorValue}${this.brightness * 0.1})`);
            outerGradient.addColorStop(0.3, `${this.colorValue}${this.brightness * 0.05})`);
            outerGradient.addColorStop(1, `${this.colorValue}0)`);
            ctx.fillStyle = outerGradient;
            ctx.fill();
          }
        }

        // Cross-shaped sparkle for the brightest twinkling stars
        if (this.isTwinkling && this.brightness > 0.8) {
          const sparkleLength = this.size * 4;
          const sparkleOpacity = (this.brightness - 0.8) * 2; // Only when very bright
          
          ctx.strokeStyle = `${this.colorValue}${sparkleOpacity * 0.6})`;
          ctx.lineWidth = 0.5;
          ctx.lineCap = 'round';
          
          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(this.x - sparkleLength, this.y);
          ctx.lineTo(this.x + sparkleLength, this.y);
          ctx.stroke();
          
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(this.x, this.y - sparkleLength);
          ctx.lineTo(this.x, this.y + sparkleLength);
          ctx.stroke();
        }
      }
    }

    // Create stars - more density for better effect
    const starCount = Math.floor((canvas.width * canvas.height) / 700); // Slightly denser
    starsRef.current = []; // Clear existing stars
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