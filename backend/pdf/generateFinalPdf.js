const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const crypto = require('crypto');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * generateFinalPdf(contractId, signers)
 * - Reads base PDF from contracts.base_pdf_path
 * - Embeds each signer signature at bottom of last page (simple layout)
 * - Appends an Audit Trail page using audit table
 * - Writes {contractId}_FINAL.pdf into your data dir
 * - Returns { filePath, sha256 }
 */
async function generateFinalPdf(contractId, signers, opts = {}) {
  const DATA_DIR = opts.dataDir || path.join(__dirname, '..', 'data');
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!opts.basePdfPath) throw new Error('Missing basePdfPath');
  const baseBytes = fs.readFileSync(opts.basePdfPath);
  const pdf = await PDFDocument.load(baseBytes);

  // Place signatures along bottom of last page
  const pages = pdf.getPages();
  const last = pages[pages.length - 1];
  const sigWidth = 180, sigHeight = 60;
  let x = 60, y = 70;

  for (const s of signers) {
    if (!s.signature_path) continue;
    const abs = path.isAbsolute(s.signature_path)
      ? s.signature_path
      : path.join(process.cwd(), 'public', s.signature_path);
    if (!fs.existsSync(abs)) continue;
    const png = await pdf.embedPng(fs.readFileSync(abs));
    last.drawImage(png, { x, y, width: sigWidth, height: sigHeight });
    last.drawText(s.name || 'Signer', { x, y: y + sigHeight + 6, size: 10, color: rgb(0.2,0.2,0.2) });
    x += sigWidth + 40;
    if (x + sigWidth > last.getWidth() - 60) { x = 60; y += sigHeight + 40; }
  }

  // Audit Trail page
  const auditRows = opts.auditRows || [];
  const trail = pdf.addPage();
  let ty = trail.getHeight() - 40;
  trail.drawText('Audit Trail', { x: 40, y: ty, size: 18 }); ty -= 24;
  const lineSize = 10;
  for (const row of auditRows) {
    const text = (row || '').toString().slice(0, 140);
    trail.drawText(text, { x: 40, y: ty, size: lineSize, color: rgb(0.15,0.15,0.15) });
    ty -= 14;
    if (ty < 40) break;
  }

  const finalBytes = await pdf.save();
  const hash = sha256(finalBytes);

  const filePath = path.join(DATA_DIR, `${contractId}_FINAL.pdf`);
  fs.writeFileSync(filePath, finalBytes);
  return { filePath, sha256: hash };
}

module.exports = { generateFinalPdf };
