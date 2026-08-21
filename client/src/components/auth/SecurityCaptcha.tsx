import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { RotateCw, Volume2, ShieldCheck, RefreshCw } from 'lucide-react';

export interface CaptchaRef {
  validate: (input: string) => boolean;
  refresh: () => void;
  getCode: () => string;
}

interface SecurityCaptchaProps {
  onCodeChange?: (code: string) => void;
  className?: string;
}

export const SecurityCaptcha = forwardRef<CaptchaRef, SecurityCaptchaProps>(({ onCodeChange, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captchaCode, setCaptchaCode] = useState<string>('');

  const generateRandomCode = (length = 6): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing 0, O, 1, I
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const drawCaptcha = (code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient with dark aesthetic
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#18181b');
    bgGradient.addColorStop(0.5, '#27272a');
    bgGradient.addColorStop(1, '#09090b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Add noise grid lines
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 150 + 100)}, ${Math.floor(
        Math.random() * 150 + 100
      )}, 255, ${Math.random() * 0.25 + 0.15})`;
      ctx.lineWidth = Math.random() * 1.5 + 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height
      );
      ctx.stroke();
    }

    // Add noise dots
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2 + 0.1})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw stylized, rotated characters
    const charList = code.split('');
    const charSpacing = width / (charList.length + 1);

    const colors = ['#818cf8', '#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#fbbf24'];

    charList.forEach((char, index) => {
      ctx.save();
      const x = charSpacing * (index + 0.7);
      const y = height / 2 + (Math.random() * 8 - 4);
      const angle = (Math.random() * 30 - 15) * (Math.PI / 180);

      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.font = `bold ${Math.floor(Math.random() * 6 + 22)}px "Courier New", monospace`;
      ctx.fillStyle = colors[index % colors.length];
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  };

  const refreshCaptcha = () => {
    const newCode = generateRandomCode(5);
    setCaptchaCode(newCode);
    if (onCodeChange) onCodeChange(newCode);
    setTimeout(() => drawCaptcha(newCode), 10);
  };

  useImperativeHandle(ref, () => ({
    validate: (input: string) => {
      if (!input) return false;
      return input.trim().toUpperCase() === captchaCode.toUpperCase();
    },
    refresh: () => {
      refreshCaptcha();
    },
    getCode: () => captchaCode,
  }));

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const handleSpeakCaptcha = () => {
    if ('speechSynthesis' in window) {
      const chars = captchaCode.split('').join(' ');
      const utterance = new SpeechSynthesisUtterance(`Security Code: ${chars}`);
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-inner ${className || ''}`}>
      {/* Canvas Display */}
      <div className="relative rounded-lg overflow-hidden border border-zinc-700/60 shadow-sm flex-shrink-0">
        <canvas
          ref={canvasRef}
          width={160}
          height={44}
          className="block cursor-pointer select-none"
          onClick={refreshCaptcha}
          title="Click to refresh CAPTCHA"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={refreshCaptcha}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer"
          title="Regenerate CAPTCHA"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleSpeakCaptcha}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer"
          title="Listen to CAPTCHA Code"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default SecurityCaptcha;
