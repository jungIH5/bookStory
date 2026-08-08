export const stripHtml = (str) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371;
  const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
  const dLon = (parseFloat(lon2) - parseFloat(lon1)) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(parseFloat(lat1) * Math.PI / 180) *
    Math.cos(parseFloat(lat2) * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

export const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const formatTimer = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export const formatReadingTime = (seconds) => {
  if (!seconds || seconds < 60) return seconds > 0 ? `${seconds}초` : '-';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
};

export const renderMarkdown = (text) => {
  if (!text) return '';
  if (/<[a-z][\s\S]*?>/i.test(text)) return text;
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^## (.+)$/gm, '<span style="font-size:0.9375rem;font-weight:900;color:#4A2F17;display:block;margin:6px 0 2px">$1</span>')
    .replace(/\n/g, '<br>');
};

export const getValidUserId = (user) => {
  if (!user?.id) return null;
  const n = parseInt(user.id);
  return !isNaN(n) && n > 0 ? n : null;
};

export const searchKakaoLocation = (keyword, onResults, onLoading) => {
  if (!keyword.trim()) { onResults([]); return; }
  if (!window.kakao?.maps?.services) return;
  onLoading(true);
  const ps = new window.kakao.maps.services.Places();
  ps.keywordSearch(keyword, (data, status) => {
    onResults(status === window.kakao.maps.services.Status.OK ? data : []);
    onLoading(false);
  });
};
