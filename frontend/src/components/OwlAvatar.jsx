export default function OwlAvatar({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="14" cy="16" rx="4.5" ry="6" fill="#6C5CE7" transform="rotate(-25 14 16)" />
      <ellipse cx="34" cy="16" rx="4.5" ry="6" fill="#6C5CE7" transform="rotate(25 34 16)" />
      <ellipse cx="24" cy="26" rx="15" ry="16" fill="#6C5CE7" />
      <ellipse cx="24" cy="29" rx="8.5" ry="9.5" fill="#A78BFA" />
      <circle cx="17" cy="23" r="6.5" fill="white" stroke="#241B45" strokeWidth="2" />
      <circle cx="31" cy="23" r="6.5" fill="white" stroke="#241B45" strokeWidth="2" />
      <line x1="23.2" y1="23" x2="24.8" y2="23" stroke="#241B45" strokeWidth="2" />
      <circle cx="17" cy="23" r="2.3" fill="#241B45" />
      <circle cx="31" cy="23" r="2.3" fill="#241B45" />
      <path d="M21.5 29 L26.5 29 L24 33.5 Z" fill="#F5A623" />
    </svg>
  );
}
