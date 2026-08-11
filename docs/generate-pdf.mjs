/**
 * Generates FORM-CaseBox-Complete-Guide.pdf from the HTML source.
 * Uses installed Google Chrome in headless mode (no extra npm deps).
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "FORM-CaseBox-Complete-Guide.html");
const pdfPath = path.join(__dirname, "FORM-CaseBox-Complete-Guide.pdf");

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const chrome = chromePaths.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error("Chrome or Edge not found. Open FORM-CaseBox-Complete-Guide.html in a browser and Print → Save as PDF.");
  process.exit(1);
}

const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--run-all-compositor-stages-before-draw",
  "--virtual-time-budget=10000",
  `--print-to-pdf=${pdfPath}`,
  fileUrl,
];

console.log(`Generating PDF with: ${path.basename(chrome)}`);
const proc = spawn(chrome, args, { stdio: "inherit" });

proc.on("close", (code) => {
  if (code === 0 && fs.existsSync(pdfPath)) {
    const size = (fs.statSync(pdfPath).size / 1024).toFixed(1);
    console.log(`\nPDF created: ${pdfPath} (${size} KB)`);
  } else {
    console.error(`PDF generation failed (exit ${code}). Open the HTML file and use Print → Save as PDF.`);
    process.exit(code || 1);
  }
});
