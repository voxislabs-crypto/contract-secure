const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const crypto = require('crypto');

async function finalizePdf(contractId, basePdfPath, signatures, outputPath) {
  // Read the base PDF
  const pdfBytes = await fs.readFile(basePdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  
  // Stamp each signature
  for (const sig of signatures) {
    if (sig.page >= 0 && sig.page < pages.length) {
      const page = pages[sig.page];
      const signatureImage = await pdfDoc.embedPng(await fs.readFile(sig.imagePath));
      
      // Scale the signature to the specified width while maintaining aspect ratio
      const signatureDims = signatureImage.scale(sig.width / signatureImage.width);
      
      page.drawImage(signatureImage, {
        x: sig.x,
        y: sig.y - signatureDims.height, // Adjust Y coordinate from top-left to bottom-left
        width: signatureDims.width,
        height: signatureDims.height,
      });
    }
  }
  
  // Add an audit page
  await addAuditPage(pdfDoc, contractId, signatures);
  
  // Save the PDF
  const finalPdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, finalPdfBytes);
  
  // Calculate the SHA-256 hash
  const hash = crypto.createHash('sha256').update(finalPdfBytes).digest('hex');
  
  return {
    filePath: outputPath,
    sha256: hash
  };
}

async function addAuditPage(pdfDoc, contractId, signatures) {
  const page = pdfDoc.addPage([595, 842]); // A4 size in points
  
  const { height } = page.getSize();
  const fontSize = 12;
  const lineHeight = fontSize * 1.2;
  let y = height - 72; // Start 1 inch from the top
  
  // Add title
  page.drawText('Audit Trail', {
    x: 72,
    y,
    size: 18,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 2;
  
  // Add contract info
  page.drawText(`Contract ID: ${contractId}`, {
    x: 72,
    y,
    size: fontSize,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  
  // Add signatures info
  page.drawText('Signatures:', {
    x: 72,
    y,
    size: fontSize,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  
  for (const sig of signatures) {
    page.drawText(`- ${sig.signerName} (${sig.signedAt})`, {
      x: 90,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
    
    if (y < 72) { // If we're too close to the bottom, add a new page
      page = pdfDoc.addPage([595, 842]);
      y = height - 72;
    }
  }
  
  // Add timestamp
  page.drawText(`Document finalized on: ${new Date().toISOString()}`, {
    x: 72,
    y,
    size: fontSize,
    color: rgb(0, 0, 0),
  });
}

module.exports = {
  finalizePdf
};
