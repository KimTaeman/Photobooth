import React from 'react';
import type { RemoteConfig } from "../hooks/useSupabase";

const Stickers: React.FC<{ config: RemoteConfig }> = ({ config }) => {
  if (!config?.enableStickers) return null;
  return (
    <>
      {/* Water splash top-left */}
      <svg className="sticker sticker-tl" width="80" height="80" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="20" fill="#BAE6FD" />
        <ellipse cx="30" cy="30" rx="8" ry="12" transform="rotate(-30 30 30)" fill="#BAE6FD" />
        <ellipse cx="70" cy="25" rx="6" ry="10" transform="rotate(20 70 25)" fill="#BAE6FD" />
        <ellipse cx="75" cy="65" rx="7" ry="11" transform="rotate(40 75 65)" fill="#BAE6FD" />
        <ellipse cx="25" cy="70" rx="6" ry="9" transform="rotate(-20 25 70)" fill="#BAE6FD" />
        <circle cx="50" cy="15" r="5" fill="#60A5FA" />
        <circle cx="15" cy="50" r="4" fill="#60A5FA" />
        <circle cx="85" cy="45" r="4" fill="#60A5FA" />
      </svg>

      {/* Cat top-right */}
      <svg className="sticker sticker-tr" width="70" height="70" viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="58" rx="28" ry="24" fill="#FEF08A" />
        <polygon points="28,42 22,18 40,34" fill="#FEF08A" />
        <polygon points="72,42 78,18 60,34" fill="#FEF08A" />
        <polygon points="28,42 22,18 40,34" fill="none" stroke="#FACC15" strokeWidth="2" />
        <polygon points="72,42 78,18 60,34" fill="none" stroke="#FACC15" strokeWidth="2" />
        <circle cx="40" cy="52" r="4" fill="#1E3A5F" />
        <circle cx="60" cy="52" r="4" fill="#1E3A5F" />
        <ellipse cx="50" cy="60" rx="3" ry="2" fill="#F9A8D4" />
        <path d="M44 64 Q50 70 56 64" stroke="#1E3A5F" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="20" y1="55" x2="35" y2="58" stroke="#FACC15" strokeWidth="1.5" />
        <line x1="20" y1="60" x2="35" y2="60" stroke="#FACC15" strokeWidth="1.5" />
        <line x1="65" y1="58" x2="80" y2="55" stroke="#FACC15" strokeWidth="1.5" />
        <line x1="65" y1="60" x2="80" y2="60" stroke="#FACC15" strokeWidth="1.5" />
      </svg>

      {/* Water drop bottom-left */}
      <svg className="sticker sticker-bl" width="60" height="70" viewBox="0 0 60 80" fill="none">
        <path d="M30 5 Q30 5 10 45 Q10 65 30 75 Q50 65 50 45 Q30 5 30 5Z" fill="#BAE6FD" stroke="#60A5FA" strokeWidth="2" />
        <ellipse cx="24" cy="48" rx="6" ry="8" fill="rgba(255,255,255,0.5)" transform="rotate(-15 24 48)" />
      </svg>

      {/* Water gun bottom-right */}
      <svg className="sticker sticker-br" width="90" height="60" viewBox="0 0 120 80" fill="none">
        <rect x="10" y="30" width="60" height="20" rx="6" fill="#60A5FA" />
        <rect x="60" y="25" width="40" height="12" rx="4" fill="#3B82F6" />
        <rect x="95" y="22" width="20" height="18" rx="3" fill="#BAE6FD" stroke="#3B82F6" strokeWidth="2" />
        <rect x="30" y="48" width="14" height="22" rx="4" fill="#60A5FA" />
        <circle cx="22" cy="40" r="6" fill="#BAE6FD" />
        <line x1="115" y1="28" x2="118" y2="24" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
        <line x1="115" y1="31" x2="120" y2="31" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
        <line x1="115" y1="35" x2="118" y2="38" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Splash middle-left */}
      <svg className="sticker sticker-ml" width="50" height="50" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="12" fill="#FEF08A" />
        <circle cx="30" cy="10" r="5" fill="#FEF08A" />
        <circle cx="10" cy="30" r="5" fill="#FEF08A" />
        <circle cx="50" cy="30" r="5" fill="#FEF08A" />
        <circle cx="30" cy="50" r="5" fill="#FEF08A" />
        <circle cx="15" cy="15" r="4" fill="#FEF08A" />
        <circle cx="45" cy="15" r="4" fill="#FEF08A" />
        <circle cx="15" cy="45" r="4" fill="#FEF08A" />
        <circle cx="45" cy="45" r="4" fill="#FEF08A" />
      </svg>

      {/* Small drops middle-right */}
      <svg className="sticker sticker-mr" width="50" height="70" viewBox="0 0 50 70" fill="none">
        <path d="M15 10 Q15 10 8 25 Q6 33 15 37 Q24 33 22 25Z" fill="#BAE6FD" />
        <path d="M35 25 Q35 25 28 40 Q26 48 35 52 Q44 48 42 40Z" fill="#60A5FA" opacity="0.5" />
        <path d="M18 45 Q18 45 13 55 Q12 60 18 63 Q24 60 23 55Z" fill="#BAE6FD" opacity="0.7" />
      </svg>
    </>
  );
};

export default Stickers;
