import React from 'react';

interface FlagProps {
  className?: string;
}

/**
 * Quốc kỳ Việt Nam (Cờ đỏ sao vàng) - SVG chuẩn tỉ lệ 3:2
 */
export const VietnamFlag: React.FC<FlagProps> = ({ className = 'w-5 h-3.5' }) => {
  return (
    <svg
      viewBox="0 0 30 20"
      className={`${className} shrink-0 inline-block align-middle overflow-hidden`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quốc kỳ Việt Nam"
    >
      {/* Nền đỏ tươi */}
      <rect width="30" height="20" fill="#da251d" rx="2" />
      {/* Ngôi sao vàng năm cánh chính tâm */}
      <polygon
        points="15.00,4.00 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15.00,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15"
        fill="#ffff00"
      />
    </svg>
  );
};

/**
 * Quốc kỳ Hoa Kỳ (US Flag) - SVG chuẩn tỉ lệ 3:2
 */
export const UsFlag: React.FC<FlagProps> = ({ className = 'w-5 h-3.5' }) => {
  return (
    <svg
      viewBox="0 0 30 20"
      className={`${className} shrink-0 inline-block align-middle overflow-hidden`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Flag of the United States"
    >
      <clipPath id="us-flag-rounded-clip">
        <rect width="30" height="20" rx="2" />
      </clipPath>
      <g clipPath="url(#us-flag-rounded-clip)">
        {/* Nền trắng và các sọc đỏ */}
        <rect width="30" height="20" fill="#ffffff" />
        <rect y="0" width="30" height="1.54" fill="#bf0a30" />
        <rect y="3.08" width="30" height="1.54" fill="#bf0a30" />
        <rect y="6.15" width="30" height="1.54" fill="#bf0a30" />
        <rect y="9.23" width="30" height="1.54" fill="#bf0a30" />
        <rect y="12.31" width="30" height="1.54" fill="#bf0a30" />
        <rect y="15.38" width="30" height="1.54" fill="#bf0a30" />
        <rect y="18.46" width="30" height="1.54" fill="#bf0a30" />
        {/* Góc xanh biển */}
        <rect width="13" height="10.77" fill="#002868" />
        {/* Điểm sao trắng */}
        <circle cx="3.5" cy="2.5" r="0.8" fill="#ffffff" />
        <circle cx="6.5" cy="2.5" r="0.8" fill="#ffffff" />
        <circle cx="9.5" cy="2.5" r="0.8" fill="#ffffff" />
        <circle cx="5.0" cy="5.4" r="0.8" fill="#ffffff" />
        <circle cx="8.0" cy="5.4" r="0.8" fill="#ffffff" />
        <circle cx="3.5" cy="8.3" r="0.8" fill="#ffffff" />
        <circle cx="6.5" cy="8.3" r="0.8" fill="#ffffff" />
        <circle cx="9.5" cy="8.3" r="0.8" fill="#ffffff" />
      </g>
    </svg>
  );
};
