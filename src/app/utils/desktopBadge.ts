// Electron resamples every Windows overlay to 16x16, regardless of display DPI.
// Draw at that size to avoid shrinking and blurring already-antialiased text.
const OVERLAY_SIZE = 16;

// A white unread dot, or a red count for mentions and direct messages.
export const renderBadgeOverlay = (count: number): string | undefined => {
  const canvas = document.createElement('canvas');
  canvas.width = OVERLAY_SIZE;
  canvas.height = OVERLAY_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  const label = count > 99 ? '99+' : String(count);
  const radius = 7;
  const centerX = OVERLAY_SIZE - radius;
  const centerY = radius;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = count > 0 ? '#f23f43' : '#ffffff';
  ctx.fill();

  if (count === 0) return canvas.toDataURL('image/png');

  ctx.fillStyle = '#ffffff';
  const fontSize = [0, 12, 10, 8][label.length];
  ctx.font = `600 ${fontSize}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(label);
  const textX = Math.round(centerX - metrics.width / 2);
  const textY = Math.round(
    centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2
  );
  ctx.fillText(label, textX, textY);

  return canvas.toDataURL('image/png');
};
