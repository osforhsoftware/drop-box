/**
 * CASEBOX Client Operations Guide — Word document generator.
 * Run: node docs/generate-client-guide.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "./.guide-gen/node_modules/docx/dist/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "CASEBOX-Client-User-Guide.docx");
const LOGO = path.join(ROOT, "frontend", "public", "images", "case_box.png");

const C = {
  green: "6DB161",
  greenDark: "3F7A3C",
  dark: "111111",
  ink: "1A1A1A",
  muted: "52525B",
  line: "E4E4E7",
  light: "F4F7F3",
  alt: "F8FAF7",
  white: "FFFFFF",
  amberBg: "FFF7ED",
  amber: "9A3412",
  redBg: "FEF2F2",
  red: "991B1B",
  blueBg: "EFF6FF",
  blue: "1D4ED8",
};

const PAGE = { width: 11906, height: 16838 }; // A4 twips
const CONTENT_W = 9360; // usable width inside 0.9" margins

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none };
const thin = (color = C.line) => ({
  style: BorderStyle.SINGLE,
  size: 4,
  color,
});
const box = (color = C.line) => ({
  top: thin(color),
  bottom: thin(color),
  left: thin(color),
  right: thin(color),
});

function run(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ""),
    font: opts.font || "Calibri",
    size: opts.size || 22,
    bold: opts.bold || false,
    italics: opts.italics || false,
    color: opts.color || C.ink,
    underline: opts.underline ? {} : undefined,
  });
}

function p(text, opts = {}) {
  const children = Array.isArray(text)
    ? text
    : [run(text, opts)];
  return new Paragraph({
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0, line: opts.line || 276 },
    alignment: opts.align || AlignmentType.LEFT,
    keepNext: opts.keepNext,
    children,
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.green, space: 6 } },
    children: [run(text, { size: 36, bold: true, color: C.dark, font: "Calibri" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [run(text, { size: 26, bold: true, color: C.greenDark })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [run(text, { size: 22, bold: true, color: C.ink })],
  });
}

function cell(children, opts = {}) {
  const paras = Array.isArray(children)
    ? children
    : [p(children, { after: 0, size: opts.size || 18, bold: opts.bold, color: opts.color || (opts.header ? C.white : C.ink) })];
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: opts.fill || C.white },
    margins: { top: 70, bottom: 70, left: 90, right: 90 },
    borders: opts.borders || box(opts.borderColor || C.line),
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    columnSpan: opts.span,
    children: paras,
  });
}

function table(headers, rows, colWidths) {
  const widths = colWidths || headers.map(() => Math.floor(CONTENT_W / headers.length));
  const head = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, { fill: C.dark, header: true, width: widths[i], bold: true, size: 17, borderColor: C.dark })
    ),
  });
  const body = rows.map((row, ri) =>
    new TableRow({
      children: row.map((val, i) =>
        cell(
          Array.isArray(val) ? val : String(val),
          {
            fill: ri % 2 === 0 ? C.white : C.alt,
            width: widths[i],
            size: 18,
          }
        )
      ),
    })
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [head, ...body],
  });
}

function callout(title, body, kind = "tip") {
  const pal = {
    tip: { fill: C.light, bar: C.green, title: C.greenDark },
    note: { fill: C.blueBg, bar: C.blue, title: C.blue },
    warn: { fill: C.amberBg, bar: "F59E0B", title: C.amber },
    stop: { fill: C.redBg, bar: "EF4444", title: C.red },
  }[kind];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [140, CONTENT_W - 140],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 140, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: pal.bar },
            borders: noBorders,
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: CONTENT_W - 140, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: pal.fill },
            borders: noBorders,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              p(title, { bold: true, color: pal.title, size: 20, after: 40 }),
              p(body, { size: 20, color: C.ink, after: 0 }),
            ],
          }),
        ],
      }),
    ],
  });
}

function spacer(after = 160) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function bullets(items) {
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 60 },
        children: Array.isArray(item) ? item : [run(item, { size: 21 })],
      })
  );
}

function steps(items) {
  return items.map(
    (item, i) =>
      new Paragraph({
        numbering: { reference: "steps", level: 0 },
        spacing: { after: 80 },
        children: Array.isArray(item) ? item : [run(item, { size: 21 })],
      })
  );
}

function flow(text) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: C.dark },
            borders: noBorders,
            margins: { top: 140, bottom: 140, left: 200, right: 200 },
            children: [
              p(text, { color: C.white, size: 20, after: 0, align: AlignmentType.CENTER }),
            ],
          }),
        ],
      }),
    ],
  });
}

function tocItem(num, title, hint) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      run(`${num}   `, { bold: true, color: C.green, size: 22 }),
      run(title, { bold: true, size: 22 }),
      hint ? run(`  — ${hint}`, { color: C.muted, size: 20, italics: true }) : run(""),
    ],
  });
}

function fieldRow(name, required, example, meaning) {
  return [name, required, example, meaning];
}

async function build() {
  const logoBuf = fs.existsSync(LOGO) ? fs.readFileSync(LOGO) : null;

  const coverKids = [];
  if (logoBuf) {
    coverKids.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            type: "png",
            data: logoBuf,
            transformation: { width: 168, height: 56 },
          }),
        ],
      })
    );
  }

  const cover = [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: C.dark },
              borders: noBorders,
              margins: { top: 720, bottom: 720, left: 360, right: 360 },
              children: [
                ...coverKids,
                p("CASEBOX", {
                  align: AlignmentType.CENTER,
                  size: 56,
                  bold: true,
                  color: C.white,
                  after: 80,
                }),
                p("Client Operations & User Guide", {
                  align: AlignmentType.CENTER,
                  size: 32,
                  color: C.green,
                  after: 200,
                }),
                p("Product catalog · Overlay templates · Print values · Orders · Storefront", {
                  align: AlignmentType.CENTER,
                  size: 20,
                  color: "A1A1AA",
                  after: 320,
                }),
                new Table({
                  width: { size: 7200, type: WidthType.DXA },
                  columnWidths: [2400, 2400, 2400],
                  rows: [
                    new TableRow({
                      children: [
                        cell(["Version 1.0"], { fill: "1F1F23", color: C.white, width: 2400, borders: noBorders }),
                        cell(["September 2026"], { fill: "1F1F23", color: C.white, width: 2400, borders: noBorders }),
                        cell(["Confidential"], { fill: "1F1F23", color: C.green, width: 2400, borders: noBorders, bold: true }),
                      ],
                    }),
                  ],
                }),
                spacer(200),
                p("Prepared for CASEBOX operators, catalog managers, and fulfilment teams.", {
                  align: AlignmentType.CENTER,
                  size: 18,
                  color: "A1A1AA",
                  after: 0,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [], pageBreakBefore: true }),
  ];

  const children = [
    ...cover,
    h1("Contents"),
    tocItem("01", "About this guide", "who this document is for"),
    tocItem("02", "How CASEBOX works", "two catalog systems"),
    tocItem("03", "First-time setup order", "do this sequence first"),
    tocItem("04", "Admin login & dashboard", "menu map"),
    tocItem("05", "Settings", "payment, WhatsApp, default overlay"),
    tocItem("06", "Case Types / Categories", "shop tiles"),
    tocItem("07", "Brands, models & prices", "Customize catalog"),
    tocItem("08", "Case overlays", "PNG, print area, mask values"),
    tocItem("09", "Phone Cases", "adding shop products and all fields"),
    tocItem("10", "Orders & fulfilment", "payment and delivery values"),
    tocItem("11", "Users, enquiries & gallery"),
    tocItem("12", "Promo codes"),
    tocItem("13", "Popup offers"),
    tocItem("14", "Storefront pages"),
    tocItem("15", "Customize design step"),
    tocItem("16", "Checkout, payment & tracking"),
    tocItem("17", "Image size cheat sheet"),
    tocItem("18", "Troubleshooting"),
    tocItem("19", "Recommended production workflow"),
    tocItem("20", "Field & value quick reference"),
    tocItem("21", "Support & document control"),
    new Paragraph({ children: [], pageBreakBefore: true }),

    h1("1. About this guide"),
    p("This handbook is the client operating manual for CASEBOX — a custom phone-case store where shoppers either design their own case or buy a ready-made design. It explains every admin screen, every field you fill in, and how those values appear on the live website."),
    p("Use it when you add phones, upload overlay frames, publish shop products, or process orders. Keep it with the person who manages the catalog."),
    callout("Who this is for", "Store owners, catalog editors, and fulfilment staff. You do not need developer knowledge to follow these steps.", "note"),
    spacer(),

    h2("What you will learn"),
    ...bullets([
      "The two catalog systems (Customize overlays vs Shop products) and why they must not be mixed up.",
      "The exact order to add brands, models, case types, overlays, and shop listings.",
      "How to upload a transparent overlay PNG and set print-area and camera-cutout values.",
      "Every product field on Phone Cases (title, price, colours, tags, SEO, visibility).",
      "Orders, payments, promo codes, popup offers, gallery, users, and contact enquiries.",
      "What customers see on Home, Shop, Customize, Checkout, Payment, and Track Order.",
    ]),

    h1("2. How CASEBOX works"),
    p("CASEBOX has two separate selling paths. They look similar in admin, but they feed different pages."),

    table(
      ["System", "Admin menu", "What you upload", "Customer sees it on"],
      [
        ["Customize catalog", "Catalog → Brands & Products", "Brands, models, case types + prices", "/customize  steps 1–3"],
        ["Case overlay (frame)", "Catalog → Case Overlays", "Transparent PNG + print/mask values", "/customize  Design step"],
        ["Shop products", "Catalog → Phone Cases", "Title, photos, price, colours, tags", "/shop, Home, product page"],
        ["Shop categories", "Catalog → Case Types", "Category name, image, display order", "Home shop-by-category tiles"],
      ],
      [2100, 2400, 2600, 2260]
    ),
    spacer(),
    callout(
      "Critical rule",
      "Adding a phone model does not create a design frame. You must still upload a Case Overlay for that model + case type, or the Design step has no phone outline. Publishing a Phone Case does not affect Customize.",
      "warn"
    ),
    spacer(),
    h2("Customer journeys"),
    flow("Home  →  Shop (ready-made)  or  Customize (own art)  →  Cart  →  Checkout  →  Payment  →  Track order"),
    spacer(),
    p("Custom path: Brand → Model → Case type → Design canvas → Add to cart."),
    p("Shop path: Browse published cases → Product page → Pick colour / model notes → Add to cart."),
    p("Checkout requires a customer account. Shipping is a flat ₹80 across India. Payments are Manual UPI (screenshot + UTR) or Razorpay, depending on Settings."),

    h1("3. First-time setup order"),
    p("Do the catalog in this sequence. Skipping a step is the usual reason Customize or Shop looks empty."),
    ...steps([
      "Log in at /admin/login with the seeded admin email and password.",
      "Open Settings and save merchant name, UPI ID, WhatsApp number, currency, and payment method.",
      "Add Case Types / Categories (shop tiles) if you sell named styles such as Transparent or Glass.",
      "In Brands & Products: add brands, then models, then Customize case types. On each model, tick the case types it supports and enter the price in ₹.",
      "Upload Case Overlays: one PNG per model + case type, then draw print area and camera masks.",
      "Optional: add a Default overlay in Settings for phones that do not have their own frame yet.",
      "Create Phone Cases (shop listings), set status to Published, and star Featured items for the homepage slider.",
      "Add promo codes and popup offers if you run a campaign.",
      "Spot-check the live site: Customize for one model, Shop for one published product, then a test checkout.",
    ]),

    h1("4. Admin login & dashboard"),
    h2("Sign in"),
    ...bullets([
      "URL: /admin/login",
      "Use the admin account created from ADMIN_EMAIL and ADMIN_PASSWORD on the server.",
      "Only users with the admin role can open the dashboard. Everyone else is sent back to login.",
    ]),
    h2("Left menu"),
    table(
      ["Menu", "Purpose"],
      [
        ["Dashboard", "Order counts, pending payments, revenue, unread enquiries"],
        ["Orders", "Approve payments, move delivery stages, download design files"],
        ["Users", "Customer signups, order counts, contact details"],
        ["Enquiries", "Messages from the Contact form"],
        ["Catalog → Brands & Products", "Phones for the customizer"],
        ["Catalog → Case Types", "Shop category tiles"],
        ["Catalog → Case Overlays", "PNG frames + print/mask values"],
        ["Catalog → Phone Cases", "Ready-made products for Shop / Home"],
        ["Promo Codes", "Percentage discounts at checkout"],
        ["Popup Offers", "Homepage promotional image"],
        ["Customer Gallery", "Approve customer photos"],
        ["Settings", "Payments, WhatsApp, default overlay"],
      ],
      [3200, 6160]
    ),
    spacer(),
    h2("Dashboard tiles"),
    table(
      ["Tile", "Meaning"],
      [
        ["Total Orders", "All orders created"],
        ["Pending Review", "Payments waiting for you (status submitted)"],
        ["Approved", "Payments you have verified"],
        ["Shipped", "Orders marked shipped"],
        ["Approved revenue", "Sum of approved order amounts"],
        ["Contact enquiries / Unread", "Contact form volume"],
        ["Promo orders / Discounts given", "How often codes are used"],
      ],
      [2800, 6560]
    ),

    h1("5. Settings — payment, WhatsApp, default overlay"),
    p("Path: Admin → Settings. Save after every change. These values appear on checkout, payment, and the WhatsApp shortcut."),
    h2("Fields and values"),
    table(
      ["Field", "Required", "Example value", "What it does"],
      [
        fieldRow("Payment method", "Yes", "Manual UPI  or  Razorpay Checkout", "Chooses screenshot+UTR flow vs Razorpay"),
        fieldRow("Merchant Name", "Yes", "CASEBOX", "Shown on payment instructions"),
        fieldRow("UPI ID", "If Manual UPI", "casebox@upi", "QR and “copy UPI ID” on the payment page"),
        fieldRow("WhatsApp Number", "Recommended", "918137953532 (with country code)", "Floating chat and post-payment shortcut"),
        fieldRow("Currency", "Yes", "INR", "Price display"),
        fieldRow("Razorpay Key ID", "If Razorpay", "rzp_live_…", "Public key only. Secrets stay on the server."),
      ],
      [2000, 1600, 2600, 3160]
    ),
    spacer(),
    callout(
      "Razorpay secrets",
      "Never paste RAZORPAY_KEY_SECRET or webhook secret into Settings. Those belong only in backend environment variables.",
      "stop"
    ),
    spacer(),
    h2("Default case overlay"),
    p("At the bottom of Settings you can add a fallback PNG used when a phone model has no overlay of its own. After upload you still draw print area and camera cutouts — same editor as Case Overlays."),
    ...bullets([
      "Add default overlay — opens the upload dialog in default mode (no brand/model pickers).",
      "Edit print & camera — replace zones without changing which models it covers.",
      "Remove — models without their own template fall back to a built-in demo until you add another default.",
    ]),

    h1("6. Case Types / Categories (shop tiles)"),
    p("Path: Catalog → Case Types. These are homepage / shop category cards. They are not the same as Customize case types, though names often match (Transparent, Glass, Soft Case)."),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Name", "Yes", "Transparent", "Label customers see"),
        fieldRow("Slug", "No", "transparent", "Auto from name if empty. Used in URLs / filters."),
        fieldRow("Link", "No", "/shop?case_type=transparent", "Where the tile should send shoppers"),
        fieldRow("Display Order", "No", "0", "Lower numbers appear first"),
        fieldRow("Type Image", "Recommended", "400 × 400 px, max 4 MB", "Square photo or icon of that case style"),
      ],
      [1800, 1800, 2600, 3160]
    ),
    spacer(),
    p("Actions: Add Type, pencil to edit, trash to delete."),

    h1("7. Brands, models & customize prices"),
    p("Path: Catalog → Brands & Products. This three-column screen feeds Customize steps 1–3."),

    h2("7.1 Add a brand (Customize step 1)"),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Brand name", "Yes", "Apple", "Shown on the brand picker"),
        fieldRow("Brand logo", "No", "128 × 128 px, max 2 MB", "JPG / PNG / WEBP / GIF"),
      ],
      [2000, 1600, 2400, 3360]
    ),
    spacer(),
    p("Deleting a brand also deletes its models. Confirm before you proceed."),

    h2("7.2 Add a model (Customize step 2)"),
    p("Select the brand first, then Add model."),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Model name", "Yes", "iPhone 15 Pro", "Exact marketing name"),
        fieldRow("Model image", "No", "400 × 400 px, max 4 MB", "Card image in the model picker"),
        fieldRow("Supported case types and prices", "Yes (at least one)", "Glass — ₹499 ticked", "Only ticked types appear in Customize step 3"),
      ],
      [2400, 2000, 2400, 2560]
    ),
    spacer(),
    callout(
      "Price lives on the model",
      "The ₹ price the customer pays in Customize is the value you enter beside each case type on that model — not the shop product price.",
      "tip"
    ),

    h2("7.3 Customize case types (step 3 list)"),
    p("The third column, Case Types, is the master list of materials used in the customizer (Silicone, Transparent, Matte, Glass, and any you add)."),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Case type name", "Yes", "Clear Case", "Customer-facing name"),
        fieldRow("Description", "No", "Slim flexible TPU", "Optional helper text"),
        fieldRow("Active", "Yes", "On", "Inactive types are hidden even if a model had them enabled"),
        fieldRow("Case type image", "No", "400 × 400 px, max 4 MB", "Shown on the case-type cards"),
      ],
      [2200, 1600, 2400, 3160]
    ),
    spacer(),
    p("Use the green switch on each row to activate or deactivate without deleting."),

    h1("8. Case overlays — PNG, print area & values"),
    p("Path: Catalog → Case Overlays (page title: Phone Case Templates). This is the most important production step. The overlay is a transparent phone-frame PNG that sits on top of the customer’s artwork."),

    h2("8.1 What an overlay is"),
    ...bullets([
      "A hollow phone outline with a transparent centre, not a studio photograph of a case.",
      "Keyed to one Brand + Model + Case type (unless it is the Default overlay).",
      "Stores canvas size from the PNG pixels, plus print-area rectangle and mask holes.",
      "Customer art is clipped to: print area minus camera / flash / sensor holes.",
      "Print output is generated at 300 DPI from those values. The overlay itself is not printed.",
    ]),

    h2("8.2 PNG file rules (Step B)"),
    table(
      ["Rule", "Value"],
      [
        ["Format", "PNG only (transparent background). JPG / WebP are rejected."],
        ["Recommended size", "1024 × 1536 px  (portrait ≈ 9:19)"],
        ["Accepted range", "360 × 720 px  up to  1200 × 2400 px"],
        ["Maximum file size", "12 MB"],
        ["Must contain", "Real transparency (a solid photo mockup will fail validation)"],
        ["Printable output @ 300 DPI", "From a 1024×1536 canvas ≈ 3200 × 4800 px  (~10.67 × 16.00 in)"],
      ],
      [2800, 6560]
    ),
    spacer(),
    callout(
      "Export tip",
      "Export a clean outline from your design tool. Camera holes in the PNG should be transparent. Do not upload a lifestyle photo of a phone on a desk.",
      "tip"
    ),

    h2("8.3 How to upload (new overlay)"),
    p("Click Upload Template. Complete A → B → C. The Save button stays disabled until every required value is set."),
    h3("Step A — Select target"),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Brand", "Yes*", "Apple", "Locked when replacing an existing overlay"),
        fieldRow("Model", "Yes*", "iPhone 15 Pro", "Must already exist under that brand"),
        fieldRow("Case type", "Yes*", "glass", "Must be enabled for that model in Brands & Products"),
      ],
      [1800, 1400, 2200, 3960]
    ),
    p("* Default overlay skips these three fields and applies everywhere a model has no overlay of its own."),
    p("If the case-type list is empty: enable that type on the model first (Catalog → Brands & Products)."),
    p("If this model + case type already has an overlay, saving archives the old file and creates version + 1 (v2, v3, …)."),

    h3("Step B — Upload the PNG"),
    ...steps([
      "Drop or browse the transparent frame PNG.",
      "Wait for “Checking size & transparency…”.",
      "Confirm the filename, MB size, pixel size, and printable size shown under the dropzone.",
      "Fix any warning (too small, almost no transparency) before drawing zones.",
    ]),

    h3("Step C — Print area & mask zones (the values)"),
    p("This is the zone editor. Coordinates are in template pixels (the PNG’s own width × height), not screen pixels. They scale automatically on the customer canvas."),
    p("How to draw:"),
    ...steps([
      "Select Print area (blue dashed). Drag a rectangle over the printable phone body — not the whole canvas, and not past the side buttons.",
      "Drag the corner handles to match the case outline. You can set each corner radius independently (top-left, top-right, bottom-right, bottom-left).",
      "Select Camera (red) and draw a hole over the camera island. Add more holes as needed.",
      "Use Flash (amber), Sensor (purple), or Other (green) for extra cutouts.",
      "Check Placed regions: you need one print area with width & height > 0, and at least one mask zone.",
      "Click Upload template. Success toast shows the new version number.",
    ]),

    h2("8.4 Values stored on each overlay"),
    p("These are the numbers the print pipeline uses. You set them by drawing; you do not type coordinates unless you re-edit."),
    table(
      ["Value", "Meaning", "Good practice"],
      [
        ["canvas_width / canvas_height", "Native PNG pixels", "Match the file; do not crop after upload"],
        ["print_area.x / y", "Top-left of printable body", "Sit inside the plastic/glass, inset a few px"],
        ["print_area.width / height", "Printable rectangle size", "Must be > 0. Full-canvas size is treated as “not set”"],
        ["print_area.rtl, rtr, rbr, rbl", "Corner radii of the print box", "Follow the case corner curve"],
        ["mask_zones[]", "Holes where ink must not print", "At least one camera rectangle"],
        ["mask_zones[].kind", "camera | flash | sensor | other", "Pick the matching tool before drawing"],
        ["mask_zones[].x y width height", "Hole geometry in canvas pixels", "Cover the whole camera island"],
        ["version", "Increments on each replace", "Old PNG is archived"],
        ["enabled", "Active switch in the table", "Off = Customize will not use this overlay"],
        ["is_default", "Fallback overlay", "Managed from Settings"],
      ],
      [2800, 3200, 3360]
    ),
    spacer(),
    callout(
      "Why the customer outline looks wrong",
      "If print_area is missing or equals the full canvas, the Design step has no proper blue print guide and art may spill into bezels. Re-open Replace Template and redraw the body.",
      "warn"
    ),

    h2("8.5 Overlay list actions"),
    table(
      ["Action", "What it does"],
      [
        ["Active switch", "Enable or disable without deleting. Disabled overlays are skipped in Customize."],
        ["Replace", "Keep the same brand/model/case type. Upload a new PNG and/or redraw zones. Version + 1."],
        ["Clone", "Copy this overlay to another model. Target model must have the same case type enabled."],
        ["Delete", "Removes the overlay. Customize will then use Default (if any) or show no frame."],
      ],
      [2400, 6960]
    ),
    spacer(),
    p("The table is grouped by brand, then model. Columns: Preview, Model, Case type, Canvas (e.g. 1024×1536px), Mask zones count, Version, Uploaded date, Active, Actions."),

    h2("8.6 Checklist before you leave overlays"),
    ...bullets([
      "Every selling model × case type has an enabled overlay, or a tested Default overlay.",
      "Print area sits on the phone body (blue dashed box on Customize Design).",
      "Camera island is fully masked — artwork must not print on lenses.",
      "Cloned overlays were spot-checked; camera positions differ between models.",
    ]),

    h1("9. Phone Cases — adding shop products"),
    p("Path: Catalog → Phone Cases. These listings appear on /shop and, if Featured, on the homepage slider. Status must be Published and not in Trash."),

    h2("9.1 Create or edit"),
    p("Click Add (or edit a row). Fill the form sections below, then Save."),

    h3("Basic information"),
    table(
      ["Field", "Required", "Example / allowed values", "Notes"],
      [
        fieldRow("Product name", "Yes", "Midnight Marble Case", "Shown on cards and detail"),
        fieldRow("Slug", "No", "midnight-marble-case", "URL /template/{slug}. Auto if empty"),
        fieldRow("Description", "No", "Full paragraph", "Product page body"),
        fieldRow("Short description", "No", "One-line pitch", "Cards and quick view"),
        fieldRow("Phone case type", "Yes", "Customized Phone Case  or  Original Phone Case", "See note below"),
        fieldRow("Category", "Yes", "Anime, Gaming, Luxury, Minimal, Nature, Abstract, Sports, Travel, Cars, Quotes, Photography, Premium", "Shop filter"),
        fieldRow("Collection", "Yes", "Essentials, Limited Edition, Artist Series, Seasonal, Collab", "Shop filter"),
        fieldRow("Logo & case colours", "Recommended", "Orange, Black, White, Red, Blue, Green, Gold, Silver, Pink, Purple — or a custom hex", "Swatches on the product card"),
        fieldRow("Tags", "No", "Matte, New Arrival, or type your own", "Search / extra labels. Press Enter to add."),
      ],
      [2200, 1600, 2800, 2760]
    ),
    spacer(),
    callout(
      "Customized vs Original",
      "Customized Phone Case = pre-printed artwork (first shop row). Original Phone Case = blank / no print (second shop row and home slider originals). This is product_type, not the material case type.",
      "note"
    ),

    h3("Compatibility"),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Phone brand", "Yes", "Apple, Samsung, OnePlus, Vivo, Oppo, Xiaomi, Google", "Filter brand on Shop"),
        fieldRow("Phone models", "Recommended", "Type iPhone 15 Pro and press Enter", "Each model becomes a tag"),
        fieldRow("Case type", "Yes", "Slug from Case Types / Customize types, e.g. glass", "Must exist. Add types first if the list is empty."),
        fieldRow("Material", "No", "TPU / Glass / Metal", "Shown as extra spec"),
      ],
      [2000, 1800, 2600, 2960]
    ),

    h3("Pricing"),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Regular price", "Yes", "499", "₹, numbers only"),
        fieldRow("Sale price", "No", "399", "If set, this is what customers pay; regular shows struck-through"),
        fieldRow("Stock", "No", "10", "Default 10 on new products"),
        fieldRow("SKU", "No", "CB-GLASS-001", "Internal code"),
      ],
      [2000, 1400, 2000, 3960]
    ),

    h3("Media"),
    table(
      ["Field", "Required", "Spec", "Notes"],
      [
        ["Thumbnail", "Yes", "800 × 640 px (5:4) · JPG/PNG/WEBP · rec. max 2 MB", "Center the case. Dark #111 or transparent background."],
        ["Gallery images", "No", "Same 800 × 640 px", "Multiple files. Same crop as thumbnail."],
      ],
      [2000, 1400, 3600, 2360]
    ),

    h3("Visibility"),
    table(
      ["Flag / field", "Effect"],
      [
        ["Featured", "Appears on the homepage slider. Product should be Published."],
        ["Best Seller", "Badge / merchandising"],
        ["New Arrival", "Badge (on by default for new items)"],
        ["Status = Published", "Visible on Shop"],
        ["Status = Draft", "Hidden from customers; keep working"],
      ],
      [2800, 6560]
    ),

    h3("SEO"),
    table(
      ["Field", "Example"],
      [
        ["Meta title", "Midnight Marble Case | CASEBOX"],
        ["Meta description", "One or two sentences for search results"],
        ["Keywords", "marble, iphone case, custom"],
      ],
      [2800, 6560]
    ),

    h2("9.2 List actions"),
    ...bullets([
      "Search, filter by status, filter by Customized / Original, grid or table view.",
      "Star = Featured. Globe / eye = Publish or Unpublish.",
      "Duplicate creates a copy (title gets “Copy”).",
      "Trash hides the product; restore from the Trash tab. Permanent delete cannot be undone.",
      "Bulk actions: publish, draft, feature, trash.",
    ]),
    callout(
      "Shop looks empty?",
      "The product is still Draft, in Trash, or has no thumbnail. Only Published + not trashed items appear on /shop.",
      "warn"
    ),

    h1("10. Orders & fulfilment"),
    p("Path: Admin → Orders. Click a row to open the full ticket: customer, address, line items, design files, payment proof."),
    h2("Filters"),
    p("All · Pending (payment submitted) · Approved · plus delivery stages (printing, packed, shipped, delivered)."),
    h2("Payment statuses — set these values"),
    table(
      ["Value", "When to use"],
      [
        ["pending", "Order created; customer has not paid"],
        ["submitted", "Screenshot + UTR received — review now"],
        ["approved", "Money confirmed. Move delivery forward."],
        ["rejected", "Wrong amount, fake screenshot, or unpaid"],
        ["failed", "Gateway / technical failure (Razorpay)"],
      ],
      [2400, 6960]
    ),
    spacer(),
    h2("Delivery statuses — set these values"),
    table(
      ["Value", "When to use"],
      [
        ["pending_payment_verification", "Default until payment is approved"],
        ["payment_approved", "Paid — queue for print"],
        ["printing", "In production"],
        ["packed", "Packed, not yet handed to courier"],
        ["shipped", "With courier / out for delivery"],
        ["delivered", "Customer has the case"],
      ],
      [3200, 6160]
    ),
    spacer(),
    p("Change Payment and Delivery dropdowns, then save. Confirm the before → after values. Typical sequence after a good UPI screenshot: payment approved + delivery printing, then packed → shipped → delivered."),
    p("On the order you can view / download the customer design, canvas preview, and payment screenshot, and open WhatsApp using the number from Settings."),

    h1("11. Users, enquiries & gallery"),
    h2("Users (Signups)"),
    p("Path: Admin → Users. Search by name, email, phone, state, or pincode. Columns: Name, Email, Phone, Location, Orders, Joined. Tiles show total signups, customers with orders, and customers with none yet."),
    h2("Enquiries"),
    p("Path: Admin → Enquiries. Contact-form inbox. Filter All / Unread / Read. Opening a message marks it read. You can toggle read/unread. Reply outside the panel (email or WhatsApp)."),
    h2("Customer Gallery"),
    p("Path: Admin → Customer Gallery. Customers submit photos at /gallery/upload (login required). You moderate:"),
    table(
      ["Action", "Value / rule"],
      [
        ["Status tabs", "All, Pending, Approved, Rejected"],
        ["Approve", "Photo can appear on /gallery"],
        ["Reject", "Hidden from the public gallery"],
        ["Featured / star", "Highlight on gallery"],
        ["Admin add", "Upload JPG/PNG/WEBP, max 5 MB each, up to 10 images per entry"],
        ["Delete", "Removes the entry and its files"],
      ],
      [2400, 6960]
    ),

    h1("12. Promo codes"),
    p("Path: Admin → Promo Codes. Customers enter the code at Checkout."),
    table(
      ["Field", "Required", "Example", "Notes"],
      [
        fieldRow("Code", "Yes (or auto)", "SUMMER20", "Stored uppercase. Tick auto-generate to let the server create one."),
        fieldRow("Discount %", "Yes", "10", "1–100. Percentage off subtotal."),
        fieldRow("Minimum order (₹)", "No", "499", "Code refused below this amount"),
        fieldRow("Max uses", "No", "100", "Blank = unlimited"),
        fieldRow("Expiry date", "No", "2026-12-31", "Valid through end of that day"),
        fieldRow("Enabled", "Yes", "On", "Disabled codes cannot be applied"),
      ],
      [2200, 1600, 2000, 3560]
    ),
    spacer(),
    p("The table shows uses (used / max), min order, expiry, and Active / Disabled. Toggle status from the row. Shipping (₹80) is added after discount."),

    h1("13. Popup offers"),
    p("Path: Admin → Popup Offers. One promotional image on the homepage."),
    table(
      ["Field", "Required", "Value"],
      [
        ["Title", "Yes", "Internal name, e.g. Independence Day 10%"],
        ["Image", "Yes (on create)", "800 × 1000 px, 4:5 portrait"],
        ["Link URL", "No", "/shop or /customize"],
        ["Starts at / Ends at", "No", "Schedule. Empty = always (while enabled)"],
        ["Enabled", "Yes", "Off hides the popup even inside the date range"],
      ],
      [2400, 2000, 4960]
    ),

    h1("14. Storefront — what customers use"),
    table(
      ["Page", "Route", "Notes"],
      [
        ["Home", "/", "Hero, brands, featured cases, how-it-works, gallery teaser, popup"],
        ["Shop", "/shop", "Published phone cases, filters, sort (Newest, Popular, Best Selling, Price)"],
        ["Product detail", "/template/{slug}", "Gallery, colours, add to cart"],
        ["Customize", "/customize", "Four steps: Brand, Model, Case Type, Design"],
        ["Cart", "/cart", "Line items, shipping hint ₹80"],
        ["Wishlist", "/wishlist", "Saved products"],
        ["Checkout", "/checkout", "Login required. Address + promo."],
        ["Payment", "/payment/{orderId}", "UPI or Razorpay"],
        ["Track", "/track  and  /track/{id}", "Order ID format FRM-YYMMDD-XXXXXX"],
        ["Gallery", "/gallery", "Approved photos"],
        ["Account", "/login  /register  /profile", "Orders and details"],
        ["About / Contact / FAQ / Policies", "/about  /contact  /faq  /privacy  /terms  /returns  /shipping", "Company pages"],
      ],
      [2200, 2800, 4360]
    ),

    h2("Header and mobile bar"),
    p("Desktop: Home, About, Shop, Gallery, Customize, Contact. Mobile bottom bar: Home, Shop, Design, Contact, Account."),

    h1("15. Customize — customer design step"),
    p("After brand, model, and case type, the Design canvas loads the overlay you uploaded."),
    ...bullets([
      "Upload artwork: JPG, PNG, or WEBP, up to 12 MB. Recommend 2000 px+ on the long side for print.",
      "Drag to move, pinch or zoom buttons to scale, rotate in 15° steps, clear to start over.",
      "Case colour swatches: Black, White (default), Grey, Dark Grey, Red, Blue, Navy, Green, Yellow, Orange, Purple, Pink, Maroon, Teal, Cream.",
      "A blue dashed rectangle is the print area. Artwork is clipped so it cannot cover camera holes.",
      "Add to cart stores the overlay id + uploaded design (this is not a shop product id).",
      "Selections are remembered in the browser for the session if the shopper refreshes.",
    ]),
    callout(
      "No phone frame on Design",
      "There is no enabled overlay for that model + case type, and no Default overlay. Upload one under Case Overlays.",
      "warn"
    ),

    h1("16. Checkout, payment & tracking"),
    h2("Checkout fields"),
    table(
      ["Field", "Required", "Notes"],
      [
        ["Full name", "Yes", "Pre-filled from the account when available"],
        ["Phone number", "Yes", "Indian mobile"],
        ["Email", "Yes", "Order updates"],
        ["Address (state, district, city/area, post office, PIN)", "Yes", "PIN lookup fills locality when the postal service responds"],
        ["Order notes", "No", "Printed as a production comment"],
        ["Promo code", "No", "Apply before placing the order"],
      ],
      [3200, 1400, 4760]
    ),
    spacer(),
    p("Totals: Subtotal → Discount (if any) → Shipping ₹80 → Grand total. Order ID looks like FRM-250907-A1B2C3."),

    h2("Payment"),
    ...bullets([
      "Manual UPI: show QR, copy UPI ID, upload screenshot, enter UTR, submit.",
      "Razorpay: in-browser checkout when Settings + server keys are live.",
      "WhatsApp shortcut sends a pre-filled message to the merchant number.",
    ]),
    h2("Track order"),
    p("Anyone with the order ID can open /track/{orderId} and see the delivery timeline, amounts, and design preview. Status labels match the values you set in Admin → Orders."),

    h1("17. Image size cheat sheet"),
    table(
      ["Upload", "Who", "Size", "Max", "Format"],
      [
        ["Brand logo", "Admin", "128 × 128 px (1:1)", "2 MB", "JPG PNG WEBP GIF"],
        ["Model image", "Admin", "400 × 400 px (1:1)", "4 MB", "JPG PNG WEBP GIF"],
        ["Customize case type image", "Admin", "400 × 400 px (1:1)", "4 MB", "JPG PNG WEBP GIF"],
        ["Shop category image", "Admin", "400 × 400 px (1:1)", "4 MB", "JPG PNG WEBP GIF"],
        ["Overlay frame", "Admin", "1024 × 1536 px (rec.)", "12 MB", "PNG only"],
        ["Shop thumbnail / gallery", "Admin", "800 × 640 px (5:4)", "2 MB rec.", "JPG PNG WEBP"],
        ["Popup offer", "Admin", "800 × 1000 px (4:5)", "12 MB", "JPG PNG WEBP GIF"],
        ["Customer artwork", "Shopper", "2000+ px tall portrait", "12 MB", "JPG PNG WEBP"],
        ["Payment screenshot", "Shopper", "Readable phone capture", "12 MB", "JPG PNG WEBP GIF"],
        ["Gallery photo", "Shopper / Admin", "Clear product photo", "5 MB", "JPG PNG WEBP"],
      ],
      [2200, 1400, 2400, 1400, 1960]
    ),
    spacer(),
    p("Compress with TinyPNG or similar before upload. Shop cards crop to 5:4 — keep the case centred."),

    h1("18. Troubleshooting"),
    table(
      ["What you see", "Likely cause", "What to do"],
      [
        ["Customize has no brands", "Catalog empty or API down", "Add brands; confirm the site can reach the backend"],
        ["Step 3: no case types", "None enabled on that model, or type is Inactive", "Edit the model → tick types and prices"],
        ["Design: no phone frame", "No enabled overlay for model + case type", "Upload Case Overlay or set Default overlay"],
        ["Only a tiny blue corner on print guide", "Print area missing / zero size / full canvas", "Replace overlay and redraw print area on the body"],
        ["Art prints on the camera", "Mask zone too small or missing", "Draw a Camera hole covering the island"],
        ["Shop is empty", "Products are Draft or Trash", "Publish from Phone Cases"],
        ["Featured missing on Home", "Star off, or not Published", "Feature only published items"],
        ["Clone overlay blocked", "Target model does not have that case type", "Enable the case type on the target model first"],
        ["Promo will not apply", "Disabled, expired, below min, or max uses hit", "Check Promo Codes values"],
        ["Popup never shows", "Disabled, outside date range, or no image", "Enable and check starts/ends"],
      ],
      [2400, 3200, 3760]
    ),

    h1("19. Recommended production workflow"),
    p("For each new phone you want to sell as a custom design:"),
    ...steps([
      "Add or select the brand.",
      "Add the model with photo.",
      "Tick every case type you will print for that phone and enter ₹ prices.",
      "For each ticked case type, upload a matching overlay PNG and draw print + camera values.",
      "Open /customize, pick that phone, and confirm the frame, print box, and camera holes.",
      "Place a test order and inspect the print file (print area minus masks, no overlay chrome).",
    ]),
    p("For each new ready-made design:"),
    ...steps([
      "Prepare 800 × 640 thumbnail (and gallery) on a dark or transparent background.",
      "Add Phone Case with name, type (Customized or Original), category, colours, price, case type slug.",
      "Set Published. Star Featured only if it should lead the homepage.",
      "Open /shop and the product URL /template/{slug} to confirm.",
    ]),

    h1("20. Field & value quick reference"),
    h2("Overlay geometry (remember these names)"),
    p("canvas_width, canvas_height · print_area { x, y, width, height, rtl, rtr, rbr, rbl } · mask_zones[] { kind, x, y, width, height } · version · enabled · brand_id · model_id · case_type_slug · is_default"),
    h2("Shop product flags"),
    p("product_type: customized | original · status: published | draft · featured · best_seller · new_arrival · price · sale_price · stock · sku · tags (colours + labels) · case_type · phone_brand · phone_models[]"),
    h2("Payment method values"),
    p("manual_upi · razorpay"),
    h2("Currency"),
    p("INR (default). Shipping constant: ₹80 all-India."),
    h2("Order ID"),
    p("FRM-YYMMDD-XXXXXX  (example FRM-260907-K7P2QM)"),

    h1("21. Support & document control"),
    table(
      ["Item", "Detail"],
      [
        ["Product", "CASEBOX — premium custom phone cases"],
        ["Document", "Client Operations & User Guide"],
        ["Version", "1.0"],
        ["Date", "7 September 2026"],
        ["Audience", "Client operators and catalog staff"],
        ["Classification", "Confidential — for CASEBOX client use"],
      ],
      [2800, 6560]
    ),
    spacer(),
    p("When the software changes (new fields, new payment method, new overlay rules), update this guide in the same release so the client always has matching instructions."),
    spacer(400),
    p("CASEBOX · Sleek. Simple. Essential.", { align: AlignmentType.CENTER, color: C.muted, italics: true, after: 40 }),
    p("© CASEBOX. All rights reserved.", { align: AlignmentType.CENTER, color: C.muted, size: 18, after: 0 }),
  ];

  const doc = new Document({
    creator: "CASEBOX",
    title: "CASEBOX Client Operations & User Guide",
    description: "Complete client handbook for catalog, overlay templates, product values, orders, and storefront.",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: "bullet",
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 180 } } },
            },
          ],
        },
        {
          reference: "steps",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: {
              top: convertInchesToTwip(0.85),
              bottom: convertInchesToTwip(0.85),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.green, space: 8 } },
                spacing: { after: 80 },
                children: [
                  run("CASEBOX", { bold: true, color: C.green, size: 18 }),
                  run("   ·   Client Operations Guide", { color: C.muted, size: 18 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 8, color: C.line, space: 8 } },
                spacing: { before: 80 },
                children: [
                  run("Confidential  ·  CASEBOX  ·  ", { color: C.muted, size: 16 }),
                  run("Page ", { color: C.muted, size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: C.muted }),
                  run(" of ", { color: C.muted, size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 16, color: C.muted }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`Created ${OUT} (${kb} KB)`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
