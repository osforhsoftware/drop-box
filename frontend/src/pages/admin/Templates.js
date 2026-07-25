import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { api } from "../../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ZoneEditor from "../../components/ZoneEditor";
import { normalizeMaskZones, normalizePrintArea } from "../../lib/cameraZone";
import {
  TEMPLATE_MAX,
  TEMPLATE_MIN,
  TEMPLATE_PRINT_DPI,
  TEMPLATE_RECOMMENDED,
  getTemplateImageUrl,
  templatePrintSize,
  validateTemplatePng,
} from "../../lib/templateImage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CASE_BADGE_CLASS = {
  silicone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  glass: "bg-brand/20 text-brand-light border-brand/40",
  matte: "bg-brand-accent/20 text-brand-light border-brand-accent/40",
  transparent: "bg-teal-500/20 text-teal-300 border-teal-500/40",
};

function caseTypeLabel(caseTypes, slug) {
  return caseTypes.find((c) => c.slug === slug)?.name || slug;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function UploadModal({ open, onOpenChange, onSuccess, replaceTemplate }) {
  const locked = Boolean(replaceTemplate);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [caseType, setCaseType] = useState("");
  const [file, setFile] = useState(null);
  const [existingVersion, setExistingVersion] = useState(null);
  const [maskZones, setMaskZones] = useState([]);
  const [printArea, setPrintArea] = useState(null);
  const [canvasDims, setCanvasDims] = useState({ canvas_width: 0, canvas_height: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [fileWarnings, setFileWarnings] = useState([]);
  const [fileMeta, setFileMeta] = useState(null);
  const [validatingFile, setValidatingFile] = useState(false);

  const recommendedPrint = templatePrintSize(
    TEMPLATE_RECOMMENDED.width,
    TEMPLATE_RECOMMENDED.height
  );

  useEffect(() => {
    if (!open) return;
    api.get("/brands").then((r) => setBrands(r.data));
    if (replaceTemplate) {
      setBrandId(replaceTemplate.brand_id);
      setModelId(replaceTemplate.model_id);
      setCaseType(replaceTemplate.case_type_slug);
      setMaskZones(normalizeMaskZones(replaceTemplate));
      const existingPrint = normalizePrintArea(replaceTemplate);
      // Full-canvas print_area is the legacy fallback — treat as unset so admin redraws the phone body.
      const looksLikeFullCanvas =
        existingPrint &&
        existingPrint.x === 0 &&
        existingPrint.y === 0 &&
        existingPrint.width === replaceTemplate.canvas_width &&
        existingPrint.height === replaceTemplate.canvas_height;
      setPrintArea(looksLikeFullCanvas ? null : existingPrint);
      setCanvasDims({
        canvas_width: replaceTemplate.canvas_width,
        canvas_height: replaceTemplate.canvas_height,
      });
      setExistingVersion(replaceTemplate.version);
      setFile(null);
      setFileWarnings([]);
      setFileMeta(
        replaceTemplate.canvas_width && replaceTemplate.canvas_height
          ? {
              width: replaceTemplate.canvas_width,
              height: replaceTemplate.canvas_height,
              print: templatePrintSize(
                replaceTemplate.canvas_width,
                replaceTemplate.canvas_height
              ),
            }
          : null
      );
    } else {
      setBrandId("");
      setModelId("");
      setCaseType("");
      setFile(null);
      setExistingVersion(null);
      setMaskZones([]);
      setPrintArea(null);
      setCanvasDims({ canvas_width: 0, canvas_height: 0 });
      setFileWarnings([]);
      setFileMeta(null);
    }
  }, [open, replaceTemplate]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setCaseTypes([]);
      return;
    }
    api.get(`/models?brand_id=${brandId}`).then((modelResponse) => {
      setModels(modelResponse.data);
    });
  }, [brandId, locked]);

  useEffect(() => {
    if (!modelId) {
      setCaseTypes([]);
      if (!locked) setCaseType("");
      return;
    }
    api.get("/products", { params: { brand_id: brandId, model_id: modelId } })
      .then((productResponse) => {
        setCaseTypes(productResponse.data);
        if (!locked) {
          setCaseType((current) => (
            productResponse.data.some((product) => product.slug === current) ? current : ""
          ));
        }
      });
  }, [brandId, modelId, locked]);

  useEffect(() => {
    if (!modelId || !caseType || locked) {
      if (!locked) setExistingVersion(null);
      return;
    }
    api
      .get("/admin/templates")
      .then((r) => {
        const found = r.data.find(
          (t) => t.model_id === modelId && t.case_type_slug === caseType
        );
        setExistingVersion(found ? found.version : null);
      })
      .catch(() => setExistingVersion(null));
  }, [modelId, caseType, locked]);

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0];
    if (!f) return;
    setValidatingFile(true);
    setFileWarnings([]);
    setFileMeta(null);
    try {
      const result = await validateTemplatePng(f);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.warnings?.length) {
        setFileWarnings(result.warnings);
        result.warnings.forEach((w) => toast.warning(w));
      }
      setFileMeta({
        width: result.width,
        height: result.height,
        print: result.print,
      });
      setFile(f);
      setMaskZones([]);
      setPrintArea(null);
    } finally {
      setValidatingFile(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
    multiple: false,
  });

  const handleDimensions = useCallback((dims) => {
    setCanvasDims(dims);
  }, []);

  const needsNewFile = !locked;
  const printAreaOk =
    printArea &&
    printArea.width > 0 &&
    printArea.height > 0;
  const canSubmit =
    brandId &&
    modelId &&
    caseType &&
    printAreaOk &&
    maskZones.length > 0 &&
    maskZones.every((z) => z.type === "rect" && z.width > 0 && z.height > 0) &&
    canvasDims.canvas_width > 0 &&
    canvasDims.canvas_height > 0 &&
    (!needsNewFile || file) &&
    !submitting &&
    !validatingFile;

  const submitHint = !brandId || !modelId || !caseType
    ? "Select brand, model, and case type."
    : needsNewFile && !file
      ? "Upload a transparent frame PNG."
      : !printAreaOk
        ? "Draw the print area on the phone body (blue dashed box)."
        : maskZones.length === 0
          ? "Draw at least one mask zone (camera cutout) on the template."
          : validatingFile
            ? "Validating PNG…"
            : null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const form = new FormData();
    form.append("model_id", modelId);
    form.append("brand_id", brandId);
    form.append("case_type_slug", caseType);
    form.append("canvas_width", String(canvasDims.canvas_width));
    form.append("canvas_height", String(canvasDims.canvas_height));
    form.append(
      "print_area",
      JSON.stringify({
        x: printArea.x,
        y: printArea.y,
        width: printArea.width,
        height: printArea.height,
        rx: printArea.rx ?? printArea.ry ?? 0,
        ry: printArea.ry ?? printArea.rx ?? 0,
      })
    );
    form.append("mask_zones", JSON.stringify(maskZones));
    if (file) form.append("file", file);
    try {
      const r = await api.post("/admin/templates", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Template uploaded successfully (v${r.data.version})`);
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="upload-template-dialog"
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#09090B] border-white/10 text-white"
      >
        <DialogHeader>
          <DialogTitle>{locked ? "Replace Template" : "Upload Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <div className="label-eyebrow mb-3">Step A — Select target</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Brand</label>
                <Select
                  value={brandId}
                  onValueChange={(v) => {
                    if (!locked) {
                      setBrandId(v);
                      setModelId("");
                    }
                  }}
                  disabled={locked}
                >
                  <SelectTrigger data-testid="upload-brand-select">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`upload-brand-${b.id}`}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Model</label>
                <Select
                  value={modelId}
                  onValueChange={setModelId}
                  disabled={locked || !brandId}
                >
                  <SelectTrigger data-testid="upload-model-select">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id} data-testid={`upload-model-${m.id}`}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Case type</label>
                <Select value={caseType} onValueChange={setCaseType} disabled={locked}>
                  <SelectTrigger data-testid="upload-case-type-select">
                    <SelectValue placeholder="Case type" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseTypes.map((c) => (
                      <SelectItem key={c.slug} value={c.slug} data-testid={`upload-case-${c.slug}`}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {caseTypes.length === 0 && (
                      <div className="px-2 py-3 text-xs text-white/40">
                        No case types yet. Add them in Brands, Models &amp; Products.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <div className="label-eyebrow mb-3">Step B — Upload phone PNG</div>
            <div
              className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/65 space-y-1.5"
              data-testid="template-size-guide"
            >
              <div>
                <span className="text-white/40">Recommended size: </span>
                <span className="font-mono text-white/90">
                  {TEMPLATE_RECOMMENDED.width}×{TEMPLATE_RECOMMENDED.height} px
                </span>
                <span className="text-white/35"> · portrait ~9:19</span>
              </div>
              <div>
                <span className="text-white/40">Accepted range: </span>
                <span className="font-mono text-white/80">
                  {TEMPLATE_MIN.width}×{TEMPLATE_MIN.height}
                </span>
                <span className="text-white/35"> – </span>
                <span className="font-mono text-white/80">
                  {TEMPLATE_MAX.width}×{TEMPLATE_MAX.height}
                </span>
                <span className="text-white/35"> · max 12 MB · PNG only</span>
              </div>
              <div>
                <span className="text-white/40">Printable output @ {TEMPLATE_PRINT_DPI} DPI: </span>
                <span className="font-mono text-white/80">
                  {recommendedPrint.printW}×{recommendedPrint.printH} px
                </span>
                <span className="text-white/35">
                  {" "}(~{recommendedPrint.inchesW}×{recommendedPrint.inchesH} in canvas)
                </span>
              </div>
              <div className="text-white/40">
                Transparent background PNG — not a studio mockup photo.
              </div>
            </div>
            <div
              {...getRootProps()}
              data-testid="template-dropzone"
              className={`rounded-xl p-8 text-center cursor-pointer border border-dashed transition-colors ${
                isDragActive ? "border-brand bg-brand/10" : "border-white/15 hover:border-white/30"
              }`}
            >
              <input {...getInputProps()} data-testid="template-file-input" />
              <Upload className="w-6 h-6 mx-auto text-brand" />
              <div className="mt-2 text-sm">Drop plain phone PNG here or browse</div>
              <div className="text-xs text-white/40 mt-1">
                Best: {TEMPLATE_RECOMMENDED.width}×{TEMPLATE_RECOMMENDED.height} px PNG · transparent frame
              </div>
              {validatingFile && (
                <div className="text-xs text-white/50 mt-2">Checking size &amp; transparency…</div>
              )}
            </div>
            {file && (
              <div className="text-xs text-white/60 mt-2 space-y-1" data-testid="template-file-info">
                <div>
                  {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                  {(fileMeta || canvasDims.canvas_width > 0) && (
                    <span className="text-white/40">
                      {" "}· {(fileMeta?.width || canvasDims.canvas_width)}×
                      {(fileMeta?.height || canvasDims.canvas_height)} px
                    </span>
                  )}
                </div>
                {fileMeta?.print && (
                  <div className="text-white/45" data-testid="template-print-size">
                    Printable: {fileMeta.print.printW}×{fileMeta.print.printH} px @ {fileMeta.print.dpi} DPI
                    <span className="text-white/30">
                      {" "}(~{fileMeta.print.inchesW}×{fileMeta.print.inchesH} in)
                    </span>
                  </div>
                )}
              </div>
            )}
            {fileWarnings.length > 0 && (
              <div className="mt-2 text-xs text-brand-light/90 bg-brand/10 border border-brand/30 rounded-lg px-3 py-2">
                {fileWarnings.join(" ")}
              </div>
            )}
            {locked && !file && (
              <div className="text-xs text-white/50 mt-2">
                Replace mode: upload a new PNG or keep the existing frame and update the camera zone only.
              </div>
            )}
            {existingVersion != null && (
              <div
                className="mt-2 text-xs text-brand-light/90 bg-brand/10 border border-brand/30 rounded-lg px-3 py-2"
                data-testid="existing-template-warning"
              >
                This will archive the existing v{existingVersion} and create v{existingVersion + 1}.
              </div>
            )}
          </section>

          {(file || (locked && replaceTemplate)) && (
            <section>
              <div className="label-eyebrow mb-3">Step C — Print area &amp; mask zones</div>
              <p className="text-xs text-white/50 mb-3">
                Canvas size from PNG ({canvasDims.canvas_width || "…"}×
                {canvasDims.canvas_height || "…"} px). Draw the blue print area on the phone body,
                then add camera / flash cutouts. Customer artwork clips to print area minus those holes.
              </p>
              <ZoneEditor
                imageFile={file}
                imageUrl={!file && replaceTemplate ? getTemplateImageUrl(replaceTemplate.file_path) : null}
                zones={maskZones}
                onZonesChange={setMaskZones}
                printArea={printArea}
                onPrintAreaChange={setPrintArea}
                onDimensions={handleDimensions}
              />
            </section>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          {submitHint && (
            <p className="text-xs text-white/45 sm:mr-auto w-full sm:w-auto text-left">{submitHint}</p>
          )}
          <Button
            variant="outline"
            data-testid="upload-template-cancel"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="upload-template-submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {submitting ? "Uploading…" : "Upload template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloneModal({ open, onOpenChange, source, onSuccess, caseTypes = [] }) {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [caseSupported, setCaseSupported] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/brands").then((r) => setBrands(r.data));
    setBrandId("");
    setModelId("");
    setCaseSupported(true);
  }, [open]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setCaseSupported(true);
      return;
    }
    api.get(`/models?brand_id=${brandId}`).then((modelResponse) => {
      const filtered = source
        ? modelResponse.data.filter((m) => m.id !== source.model_id)
        : modelResponse.data;
      setModels(filtered);
    });
  }, [brandId, source]);

  useEffect(() => {
    if (!brandId || !modelId || !source) {
      setCaseSupported(true);
      return;
    }
    api.get("/products", { params: { brand_id: brandId, model_id: modelId } })
      .then((productResponse) => {
        setCaseSupported(
          productResponse.data.some((product) => product.slug === source.case_type_slug)
        );
      })
      .catch(() => setCaseSupported(false));
  }, [brandId, modelId, source]);

  const handleClone = async () => {
    if (!source || !modelId || !brandId) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/templates/${source.id}/clone`, {
        target_model_id: modelId,
        target_brand_id: brandId,
      });
      const targetName = models.find((m) => m.id === modelId)?.name || "target model";
      toast.success(`Template cloned to ${targetName}.`);
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Clone failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!source) return null;

  const caseLabel = caseTypeLabel(caseTypes, source.case_type_slug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="clone-template-dialog"
        className="bg-[#09090B] border-white/10 text-white"
      >
        <DialogHeader>
          <DialogTitle>Clone Template</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-white/70" data-testid="clone-source-label">
          Source: {source.brand_name} {source.model_name} — {caseLabel} (v{source.version})
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Target brand</label>
            <Select value={brandId} onValueChange={(v) => { setBrandId(v); setModelId(""); }}>
              <SelectTrigger data-testid="clone-brand-select">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id} data-testid={`clone-brand-${b.id}`}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Target model</label>
            <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
              <SelectTrigger data-testid="clone-model-select">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id} data-testid={`clone-model-${m.id}`}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!caseSupported && (
          <p className="text-sm text-amber-400">
            {caseLabel} is not active for this brand. Enable it in Catalog before cloning.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" data-testid="clone-template-cancel" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid="clone-template-confirm"
            disabled={!modelId || !brandId || !caseSupported || submitting}
            onClick={handleClone}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {submitting ? "Cloning…" : "Confirm clone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaseTypeBadge({ slug, caseTypes = [] }) {
  const label = caseTypeLabel(caseTypes, slug);
  return (
    <Badge
      variant="outline"
      className={CASE_BADGE_CLASS[slug] || "border-white/20 text-white/70"}
      data-testid={`case-badge-${slug}`}
    >
      {label}
    </Badge>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [cloneTarget, setCloneTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      setLoadError(null);
      const r = await api.get("/admin/templates");
      setTemplates(r.data);
    } catch (e) {
      const status = e.response?.status;
      const msg =
        status === 404
          ? "Templates API not found — restart the backend (npm start in backend/)."
          : e.response?.data?.detail || "Failed to load templates";
      setLoadError(msg);
      setTemplates([]);
      toast.error(msg);
    }
  };

  useEffect(() => {
    load();
    api.get("/admin/products").then((r) => setCaseTypes(r.data)).catch(() => {});
  }, []);

  const toggleEnabled = async (tpl, enabled) => {
    try {
      await api.patch(`/admin/templates/${tpl.id}`, { enabled });
      setTemplates((prev) =>
        prev.map((t) => (t.id === tpl.id ? { ...t, enabled } : t))
      );
    } catch {
      toast.error("Failed to update template");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/templates/${deleteTarget.id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Template deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  let lastBrand = "";
  let lastModel = "";

  return (
    <div data-testid="admin-templates">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="label-eyebrow">Catalog</div>
          <h1 className="font-display text-3xl mt-2">Phone Case Templates</h1>
        </div>
        <Button
          data-testid="upload-template-btn"
          onClick={() => {
            setReplaceTarget(null);
            setUploadOpen(true);
          }}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Upload Template
        </Button>
      </div>

      {loadError && (
        <div
          data-testid="templates-load-error"
          className="mb-4 text-sm text-brand-light bg-brand/10 border border-brand/30 rounded-lg px-4 py-3"
        >
          {loadError}
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/50">Preview</TableHead>
              <TableHead className="text-white/50">Model</TableHead>
              <TableHead className="text-white/50">Case type</TableHead>
              <TableHead className="text-white/50">Canvas</TableHead>
              <TableHead className="text-white/50">Mask zones</TableHead>
              <TableHead className="text-white/50">Version</TableHead>
              <TableHead className="text-white/50">Uploaded</TableHead>
              <TableHead className="w-20 text-center text-white/50">Active</TableHead>
              <TableHead className="text-white/50">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-white/40 py-10">
                  No templates yet. Upload your first frame overlay.
                </TableCell>
              </TableRow>
            )}
            {templates.map((tpl) => {
              const rows = [];
              if (tpl.brand_name !== lastBrand) {
                lastBrand = tpl.brand_name;
                lastModel = "";
                rows.push(
                  <TableRow key={`brand-${tpl.brand_id}`} className="bg-white/[0.03] hover:bg-white/[0.03]">
                    <TableCell colSpan={9} className="font-semibold text-white py-2">
                      {tpl.brand_name}
                    </TableCell>
                  </TableRow>
                );
              }
              if (tpl.model_name !== lastModel) {
                lastModel = tpl.model_name;
                rows.push(
                  <TableRow key={`model-${tpl.model_id}`} className="hover:bg-transparent">
                    <TableCell colSpan={9} className="text-sm text-white/70 pl-6 py-1.5">
                      {tpl.model_name}
                    </TableCell>
                  </TableRow>
                );
              }
              rows.push(
                <TableRow key={tpl.id} className="border-white/[0.04]">
                  <TableCell>
                    <img
                      src={getTemplateImageUrl(tpl.file_path)}
                      alt=""
                      className="w-10 h-10 object-contain rounded border border-white/10 bg-black/40"
                      data-testid={`template-thumb-${tpl.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-white/80 pl-8">{tpl.model_name}</TableCell>
                  <TableCell>
                    <CaseTypeBadge slug={tpl.case_type_slug} caseTypes={caseTypes} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/70">
                    {tpl.canvas_width}×{tpl.canvas_height}px
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/70 max-w-[160px] truncate">
                    {normalizeMaskZones(tpl).length} zone(s)
                  </TableCell>
                  <TableCell className="font-mono text-xs">v{tpl.version}</TableCell>
                  <TableCell className="text-xs text-white/50">
                    {formatDate(tpl.updated_at || tpl.created_at)}
                  </TableCell>
                  <TableCell className="w-20 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(tpl.enabled)}
                      aria-label={`${tpl.enabled ? "Disable" : "Enable"} ${tpl.model_name} ${caseTypeLabel(caseTypes, tpl.case_type_slug)} template`}
                      title={tpl.enabled ? "Click to disable template" : "Click to enable template"}
                      data-testid={`template-enabled-${tpl.id}`}
                      onClick={() => toggleEnabled(tpl, !tpl.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                        tpl.enabled
                          ? "border-emerald-400/50 bg-emerald-500 hover:bg-emerald-400"
                          : "border-white/15 bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          tpl.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                      <span className="sr-only">{tpl.enabled ? "Enabled" : "Disabled"}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        data-testid={`template-replace-${tpl.id}`}
                        className="text-xs text-brand hover:underline"
                        onClick={() => {
                          setReplaceTarget(tpl);
                          setUploadOpen(true);
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        data-testid={`template-clone-${tpl.id}`}
                        className="text-xs text-white/70 hover:text-white hover:underline"
                        onClick={() => setCloneTarget(tpl)}
                      >
                        Clone
                      </button>
                      <button
                        type="button"
                        data-testid={`template-delete-${tpl.id}`}
                        className="text-xs text-red-400 hover:underline"
                        onClick={() => setDeleteTarget(tpl)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              return rows;
            })}
          </TableBody>
        </Table>
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={(v) => {
          setUploadOpen(v);
          if (!v) setReplaceTarget(null);
        }}
        onSuccess={load}
        replaceTemplate={replaceTarget}
      />

      <CloneModal
        open={Boolean(cloneTarget)}
        onOpenChange={(v) => !v && setCloneTarget(null)}
        source={cloneTarget}
        onSuccess={load}
        caseTypes={caseTypes}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="delete-template-dialog" className="bg-[#09090B] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This removes the template record. PNG files are kept for existing order previews.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-template-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-template-confirm"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
