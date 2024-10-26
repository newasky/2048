export function handleTouchStart(event: TouchEvent) {
  return {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  };
}

export function handleTouchMove(start: { x: number, y: number }, event: TouchEvent) {
  const SWIPE_THRESHOLD = 50;
  const xDiff = start.x - event.touches[0].clientX;
  const yDiff = start.y - event.touches[0].clientY;

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    return Math.abs(xDiff) > SWIPE_THRESHOLD
      ? xDiff > 0 ? 'left' : 'right'
      : null;
  } else {
    return Math.abs(yDiff) > SWIPE_THRESHOLD
      ? yDiff > 0 ? 'up' : 'down'
      : null;
  }
}
