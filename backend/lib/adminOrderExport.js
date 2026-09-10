const zlib = require("zlib");
const {
  paymentStatusLabel,
  paymentVerificationLabel,
  deliveryStatusLabel,
} = require("./adminOrderQuery");

const EXPORT_COLUMNS = Object.freeze([
  { key: "order_id", label: "Order ID" },
  { key: "created_at", label: "Order Date" },
  { key: "customer_name", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "amount", label: "Amount" },
  { key: "payment_status", label: "Payment Status" },
  { key: "delivery_status", label: "Delivery Status" },
  { key: "order_status", label: "Order Status" },
  { key: "shipping_address", label: "Shipping Address" },
  { key: "tracking_number", label: "Tracking Number" },
]);

const EXPORT_COLUMN_KEYS = EXPORT_COLUMNS.map((c) => c.key);
const EXPORT_FORMATS = Object.freeze(["csv", "xlsx", "pdf"]);
const EXPORT_SCOPES = Object.freeze(["view", "filtered", "all"]);

function normalizeExportColumns(input) {
  const requested = Array.isArray(input)
    ? input.map((k) => String(k))
    : typeof input === "string"
      ? input.split(",").map((k) => k.trim())
      : [];
  const selected = requested.filter((k) => EXPORT_COLUMN_KEYS.includes(k));
  if (selected.length === 0) return [...EXPORT_COLUMN_KEYS];
  return selected;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productLabel(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items
      .map((item) => {
        const name = [item.brand_name, item.model_name, item.product_name].filter(Boolean).join(" ");
        const qty = item.quantity || 1;
        return qty > 1 ? `${name} ×${qty}` : name;
      })
      .filter(Boolean)
      .join("; ");
  }
  return [order.brand_name, order.model_name, order.product_name].filter(Boolean).join(" ");
}

function quantityOf(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  }
  return 1;
}

function shippingAddressOf(order) {
  if (order.formatted_address) return String(order.formatted_address);
  return [
    order.house_no_flat,
    order.building_name,
    order.street,
    order.landmark,
    order.post_office,
    order.city_area,
    order.district,
    order.state,
    order.pincode,
    order.country,
    order.address,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(", ");
}

function orderStatusOf(order) {
  if (order.delivery_status === "cancelled") return "Cancelled";
  if (order.payment_status === "failed" || order.payment_status === "rejected") return "Payment Failed";
  if (order.payment_status !== "approved") {
    return order.payment_status === "submitted"
      ? "Payment Verification Required"
      : "Payment Pending";
  }
  return deliveryStatusLabel(order.delivery_status);
}

function cellValue(order, key) {
  switch (key) {
    case "order_id":
      return order.order_id || "";
    case "created_at":
      return formatDate(order.created_at);
    case "customer_name":
      return order.customer_name || "";
    case "phone":
      return order.phone || "";
    case "email":
      return order.email || "";
    case "product":
      return productLabel(order);
    case "quantity":
      return String(quantityOf(order));
    case "amount":
      return order.amount == null || order.amount === "" ? "" : String(order.amount);
    case "payment_status":
      return paymentStatusLabel(order.payment_status);
    case "delivery_status":
      return deliveryStatusLabel(order.delivery_status);
    case "order_status":
      return orderStatusOf(order);
    case "shipping_address":
      return shippingAddressOf(order);
    case "tracking_number":
      return order.tracking_number || "";
    default:
      return "";
  }
}

function rowsForExport(orders, columns) {
  const headers = columns.map((key) => EXPORT_COLUMNS.find((c) => c.key === key)?.label || key);
  const rows = orders.map((order) => columns.map((key) => cellValue(order, key)));
  return { headers, rows };
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return Buffer.from(`\uFEFF${lines.join("\r\n")}`, "utf8");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function crc32(buf) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buf) >>> 0;
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const localChunk = Buffer.concat([local, name, data]);
    localParts.push(localChunk);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(Buffer.concat([central, name]));
    offset += localChunk.length;
  }
  const locals = Buffer.concat(localParts);
  const centrals = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centrals.length, 12);
  end.writeUInt32LE(locals.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([locals, centrals, end]);
}

function buildXlsx(headers, rows) {
  const sheetRows = [headers, ...rows]
    .map((row, rIdx) => {
      const cells = row
        .map((value, cIdx) => {
          const ref = `${colLetter(cIdx)}${rIdx + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join("");

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Orders" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

  return zipStore([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/_rels/workbook.xml.rels", data: wbRels },
    { name: "xl/worksheets/sheet1.xml", data: sheet },
  ]);
}

function pdfEscape(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapCell(text, maxChars) {
  const raw = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return [""];
  const words = raw.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (word.length > maxChars) {
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
        current = "";
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function buildPdf(headers, rows, { title = "Orders export" } = {}) {
  const pageW = 842;
  const pageH = 595;
  const margin = 28;
  const usable = pageW - margin * 2;
  const colCount = Math.max(headers.length, 1);
  const colW = usable / colCount;
  const fontSize = colCount > 8 ? 6.5 : 7.5;
  const lineH = fontSize + 3;
  const maxChars = Math.max(8, Math.floor(colW / (fontSize * 0.48)));

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];
  const contentIds = [];

  const drawPage = (pageRows, pageNumber, isHeaderPage) => {
    const cmds = [];
    cmds.push("0.08 0.08 0.08 rg");
    cmds.push(`0 0 ${pageW} ${pageH} re f`);
    cmds.push("BT");
    cmds.push(`/F2 12 Tf 0.43 0.69 0.38 rg`);
    cmds.push(`1 0 0 1 ${margin} ${pageH - 24} Tm (${pdfEscape(title)}) Tj`);
    cmds.push(`/F1 8 Tf 0.7 0.7 0.7 rg`);
    cmds.push(`1 0 0 1 ${pageW - 140} ${pageH - 24} Tm (Page ${pageNumber}) Tj`);
    cmds.push("ET");

    let y = pageH - 42;
    const paintRow = (cells, header) => {
      const wrapped = cells.map((c) => wrapCell(c, maxChars));
      const height = Math.max(...wrapped.map((w) => w.length), 1) * lineH + 6;
      if (header) {
        cmds.push("0.16 0.42 0.22 rg");
        cmds.push(`${margin} ${y - height} ${usable} ${height} re f`);
      } else {
        cmds.push("0.12 0.12 0.12 rg");
        cmds.push(`${margin} ${y - height} ${usable} ${height} re f`);
      }
      cmds.push("0.27 0.45 0.24 RG");
      cmds.push("0.4 w");
      cmds.push(`${margin} ${y - height} ${usable} ${height} re S`);
      cmds.push("BT");
      wrapped.forEach((lines, i) => {
        lines.forEach((line, li) => {
          const x = margin + 3 + i * colW;
          const ty = y - 11 - li * lineH;
          cmds.push(header ? "/F2 7 Tf 1 1 1 rg" : `/F1 ${fontSize} Tf 0.92 0.92 0.92 rg`);
          cmds.push(`1 0 0 1 ${x.toFixed(2)} ${ty.toFixed(2)} Tm (${pdfEscape(line)}) Tj`);
        });
      });
      cmds.push("ET");
      y -= height;
      return height;
    };

    if (isHeaderPage || pageNumber === 1) paintRow(headers, true);
    for (const row of pageRows) {
      if (y < margin + 40) break;
      paintRow(row, false);
    }
    const stream = cmds.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    contentIds.push(contentId);
    return contentId;
  };

  const paginated = [];
  const rowsPerPage = 18;
  if (rows.length === 0) {
    paginated.push([]);
  } else {
    for (let i = 0; i < rows.length; i += rowsPerPage) {
      paginated.push(rows.slice(i, i + rowsPerPage));
    }
  }

  paginated.forEach((chunk, idx) => {
    drawPage(chunk, idx + 1, true);
  });

  paginated.forEach((_, idx) => {
    const pageId = add(null);
    pageIds.push(pageId);
    objects[pageId - 1] = `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[idx]} 0 R >>`;
  });

  const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  pageIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  });
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
  }
  const xrefPos = Buffer.byteLength(chunks.join(""), "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(xref);
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
  return Buffer.from(chunks.join(""), "utf8");
}

function exportFilename(scope, format, now = new Date()) {
  const stamp = ymdCompact(now);
  const scopePart = scope === "all" ? "all" : scope === "view" ? "current-view" : "filtered";
  return `orders-${scopePart}-${stamp}.${format}`;
}

function ymdCompact(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return `${pick("year")}${pick("month")}${pick("day")}`;
}

function contentTypeFor(format) {
  if (format === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (format === "pdf") return "application/pdf";
  return "text/csv; charset=utf-8";
}

function buildExportFile(orders, { columns, format, scope }) {
  const selected = normalizeExportColumns(columns);
  const { headers, rows } = rowsForExport(orders, selected);
  const title =
    scope === "all" ? "All orders" : scope === "view" ? "Current view" : "Filtered orders";
  let buffer;
  if (format === "xlsx") buffer = buildXlsx(headers, rows);
  else if (format === "pdf") buffer = buildPdf(headers, rows, { title: `CASEBOX ${title}` });
  else buffer = buildCsv(headers, rows);
  return {
    buffer,
    filename: exportFilename(scope, format),
    contentType: contentTypeFor(format),
    count: orders.length,
    columns: selected,
  };
}

module.exports = {
  EXPORT_COLUMNS,
  EXPORT_COLUMN_KEYS,
  EXPORT_FORMATS,
  EXPORT_SCOPES,
  normalizeExportColumns,
  productLabel,
  quantityOf,
  shippingAddressOf,
  cellValue,
  rowsForExport,
  buildCsv,
  buildXlsx,
  buildPdf,
  buildExportFile,
};
