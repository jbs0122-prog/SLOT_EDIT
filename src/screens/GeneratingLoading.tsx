import { useEffect, useState } from 'react';

const MESSAGES = [
  'Reading the room...',
  'Pulling looks for your vibe...',
  'Checking NYC streets...',
  'Matching textures & tones...',
  'Almost ready...',
];

export default function GeneratingLoading() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex(prev => (prev + 1) % MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          )`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 px-8 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-black text-[10px] tracking-[0.4em] font-light uppercase opacity-50">
            SlotEdit
          </span>
          <div className="w-px h-8 bg-black opacity-20 mt-1" />
        </div>

        <div className="relative w-20 h-20">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="1"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="black"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="80 134"
              className="animate-[spin_2s_linear_infinite]"
              style={{ transformOrigin: '40px 40px' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 min-h-[56px]">
          <p
            className="text-black text-xl font-light tracking-tight transition-all duration-400"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {MESSAGES[msgIndex]}
          </p>
          <div className="flex gap-1.5">
            {MESSAGES.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === msgIndex ? '20px' : '4px',
                  height: '4px',
                  backgroundColor: i === msgIndex ? 'black' : 'rgba(0,0,0,0.25)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-8 mt-4">
          {['GENDER', 'FIT', 'VIBE'].map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-px bg-black"
                style={{
                  opacity: 0.15 + (i * 0.15),
                  animation: `pulse ${1.2 + i * 0.4}s ease-in-out infinite`,
                }}
              />
              <span className="text-black text-[9px] tracking-[0.3em] opacity-30 font-light">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex justify-center">
        <span className="text-black text-[10px] tracking-[0.35em] opacity-20 font-light uppercase">
          New York City
        </span>
      </div>
    </div>
  );
}
