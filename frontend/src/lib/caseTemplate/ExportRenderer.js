/**
 * Snapshot / export helpers for the case template canvas.
 * Print files must exclude overlay PNG and print guide.
 */
export class ExportRenderer {
  /**
   * Preview data URL for cart/checkout (includes overlay, hides guide).
   */
  static async toPreviewDataUrl(canvas, { guideLayer, multiplier = 1 } = {}) {
    if (!canvas) return null;
    const wasVisible = guideLayer?.object?.visible;
    if (guideLayer) guideLayer.setVisible(false);
    canvas.requestRenderAll();

    const dataUrl = canvas.toDataURL({
      format: "png",
      quality: 0.92,
      multiplier: Math.max(1, multiplier),
      enableRetinaScaling: false,
    });

    if (guideLayer) {
      guideLayer.setVisible(wasVisible !== false);
      canvas.requestRenderAll();
    }
    return dataUrl;
  }

  /**
   * Capture design transform for server-side 300 DPI composite.
   * Server applies print_area + masks; overlay/guide are never sent as print layers.
   */
  static capturePrintPayload({ artworkLayer, template, canvas, caseColor = null }) {
    const transform = artworkLayer?.getTransform() || null;
    if (transform && canvas) {
      // Store scene zoom for debugging only — composite uses template coords.
      transform.canvas_zoom = canvas.getZoom() || 1;
    }
    return {
      template_id: template?.id || null,
      design_transform: transform,
      case_color: caseColor || null,
      canvas_width: template?.canvas_width || null,
      canvas_height: template?.canvas_height || null,
      print_area: template?.print_area || null,
      // Explicit: print pipeline must not include these
      exclude_overlay: true,
      exclude_guide: true,
    };
  }
}
