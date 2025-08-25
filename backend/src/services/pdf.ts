import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, rgb } from 'pdf-lib';
import { CONFIG } from '../config/config.js';

export interface SignerInfo {
  name: string;
  signature_path?: string | null;
  position?: {
    x: number;
    y: number;
    page: number;
  };
}

export async function generateFinalPdf(opts: {
  contractId: string;
  basePdfPath: string;
  signers: SignerInfo[];
  auditLines: string[];
}): Promise<{ filePath: string; sha256: string }> {
  // Read the base PDF
  const baseBuf = fs.readFileSync(opts.basePdfPath);
  const pdf = await PDFDocument.load(baseBuf);
  const pages = pdf.getPages();
  
  // Add signatures to the last page
  const lastPage = pages[pages.length - 1];
  let x = 60;
  let y = 70;
  const signatureWidth = 180;
  const signatureHeight = 60;
  const padding = 40;

  // Add each signature image
  for (const signer of opts.signers) {
    if (!signer.signature_path) continue;
    
    // Get absolute path to signature
    const signaturePath = path.isAbsolute(signer.signature_path)
      ? signer.signature_path
      : path.join(CONFIG.PUBLIC_DIR, signer.signature_path);
    
    if (!fs.existsSync(signaturePath)) continue;
    
    try {
      // Embed the signature image
      const signatureBytes = fs.readFileSync(signaturePath);
      const signatureImage = await pdf.embedPng(signatureBytes);
      
      // Position the signature
      const position = signer.position || { x, y, page: pages.length - 1 };
      const targetPage = pages[position.page] || lastPage;
      
      targetPage.drawImage(signatureImage, {
        x: position.x || x,
        y: position.y || y,
        width: signatureWidth,
        height: signatureHeight,
      });
      
      // Add signer name below signature
      if (signer.name) {
        targetPage.drawText(signer.name, {
          x: position.x || x,
          y: (position.y || y) - 20,
          size: 10,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
      
      // Update position for next signature
      x += signatureWidth + padding;
      if (x + signatureWidth > targetPage.getWidth() - 60) {
        x = 60;
        y += signatureHeight + 20;
      }
    } catch (error) {
      console.error(`Error processing signature for ${signer.name}:`, error);
    }
  }
  
  // Add audit trail page if there are audit lines
  if (opts.auditLines.length > 0) {
    // Add audit page
    let currentAuditPage = pdf.addPage([600, 800]);
    let currentY = 750;
    
    // Add title
    currentAuditPage.drawText('Audit Log', {
      x: 50,
      y: currentY,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    currentY -= 40;
    
    // Add audit entries
    for (const line of opts.auditLines) {
      if (currentY < 50) {
        // Add new page if we run out of space
        currentAuditPage = pdf.addPage([600, 800]);
        currentY = 750;
      }
      
      currentAuditPage.drawText(line, {
        x: 50,
        y: currentY,
        size: 10,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      currentY -= 15;
    }
  }
  
  // Save the final PDF
  const pdfBytes = await pdf.save();
  const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
  const fileName = `${opts.contractId}_FINAL_${Date.now()}.pdf`;
  const filePath = path.join(CONFIG.DATA_DIR, fileName);
  
  // Ensure directory exists
  if (!fs.existsSync(CONFIG.DATA_DIR)) {
    fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(filePath, pdfBytes);
  
  return {
    filePath,
    sha256,
  };
}
