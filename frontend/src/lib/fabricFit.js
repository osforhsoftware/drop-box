/** Scale a Fabric canvas to fit its container while keeping scene coords at natural size. */
export function fitFabricCanvas(canvas, containerEl, naturalW, naturalH, maxHeight = 480) {
  if (!canvas || !containerEl || !naturalW || !naturalH) return 1;
  const pad = 8;
  const maxW = Math.max(80, containerEl.clientWidth - pad);
  const maxH = Math.max(80, Math.min(maxHeight, containerEl.clientHeight || maxHeight));
  const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
  const displayW = Math.round(naturalW * scale);
  const displayH = Math.round(naturalH * scale);
  canvas.setDimensions({ width: displayW, height: displayH });
  canvas.setZoom(scale);
  canvas.calcOffset();

  // Fabric wraps <canvas> in .canvas-container; constrain that so PNGs never spill outside.
  const wrapper = canvas.wrapperEl;
  if (wrapper) {
    wrapper.style.width = `${displayW}px`;
    wrapper.style.height = `${displayH}px`;
    wrapper.style.maxWidth = "100%";
    wrapper.style.margin = "0 auto";
    wrapper.style.overflow = "hidden";
  }
  return scale;
}
