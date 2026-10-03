window.HF = window.HF || {};
HF.computeCameraViewBox = function computeCameraViewBox({ imageWidth, imageHeight, viewportWidth, viewportHeight, focusBoxes, padding = .12, minWidthFraction = .30, overviewThreshold = .70 }) {
  const overview = { x: 0, y: 0, width: imageWidth, height: imageHeight, overview: true };
  if (![imageWidth, imageHeight, viewportWidth, viewportHeight].every((value) => Number.isFinite(value) && value > 0) || !focusBoxes?.length) return overview;
  const boxes = focusBoxes.filter((box) => box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width >= 0 && box.height >= 0);
  if (!boxes.length) return overview;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  const rawWidth = right - left, rawHeight = bottom - top;
  if (rawWidth > overviewThreshold * imageWidth) return overview;
  const aspect = viewportWidth / viewportHeight;
  let width = Math.max(imageWidth * minWidthFraction, rawWidth * (1 + 2 * padding), rawHeight * (1 + 2 * padding) * aspect);
  let height = width / aspect;
  if (height < rawHeight * (1 + 2 * padding)) { height = rawHeight * (1 + 2 * padding); width = height * aspect; }
  if (width >= imageWidth || height >= imageHeight) return overview;
  const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
  const x = Math.max(0, Math.min(imageWidth - width, centerX - width / 2));
  const y = Math.max(0, Math.min(imageHeight - height, centerY - height / 2));
  return { x, y, width, height, overview: false };
};
