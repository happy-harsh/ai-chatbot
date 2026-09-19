const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");
const officeparser = require("officeparser");

/**
 * Universal PDF parser supporting function & class export signatures
 */
async function parsePdfText(buffer: Buffer): Promise<string> {
  try {
    if (typeof pdfParseModule === "function") {
      const data = await pdfParseModule(buffer);
      return data?.text || "";
    }

    if (pdfParseModule && pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const data = await parser.getText();
      return data?.text || (typeof data === "string" ? data : "");
    }

    if (pdfParseModule && typeof pdfParseModule.default === "function") {
      const data = await pdfParseModule.default(buffer);
      return data?.text || "";
    }
  } catch (err) {
    console.warn("pdfParseText internal error:", err);
  }
  return "";
}

/**
 * Filter out non-printable ASCII/control binary artifacts from PDF stream parsing
 */
function sanitizeText(rawText: string): string {
  if (!rawText) return "";
  return rawText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
    .replace(/<<\/Type\/XObject[\s\S]*?stream/gi, " ")
    .replace(/\b(endobj|endstream|obj|xref|trailer)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verify if text is readable human text (not binary noise)
 */
function isReadableText(text: string): boolean {
  if (!text || text.trim().length < 10) return false;
  if (text.startsWith("%PDF-")) return false;
  const nonAsciiCount = (text.match(/[^\x20-\x7E\s]/g) || []).length;
  return nonAsciiCount / text.length < 0.3;
}

/**
 * Extract clean text from uploaded document buffer (.pdf, .docx, .txt, .md, .pptx, etc.)
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  // 1. Plain text formats (.txt, .md, .json, .csv)
  if (["txt", "md", "json", "csv"].includes(ext)) {
    const text = sanitizeText(buffer.toString("utf-8"));
    if (isReadableText(text)) return text;
  }

  // 2. PDF Documents (.pdf) -> Use parsePdfText
  if (ext === "pdf") {
    try {
      const rawText = await parsePdfText(buffer);
      if (rawText && rawText.trim().length > 0) {
        const cleaned = sanitizeText(rawText);
        if (isReadableText(cleaned)) {
          console.log(`📄 Successfully extracted ${cleaned.length} clean chars from PDF (${filename})`);
          return cleaned;
        }
      }
    } catch (err) {
      console.warn(`pdf-parse failed for ${filename}:`, err);
    }
  }

  // 3. Word Documents (.docx, .doc) -> Use mammoth
  if (ext === "docx" || ext === "doc") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result && result.value) {
        const cleaned = sanitizeText(result.value);
        if (isReadableText(cleaned)) {
          console.log(`📝 Successfully extracted ${cleaned.length} clean chars from Word doc (${filename})`);
          return cleaned;
        }
      }
    } catch (err) {
      console.warn(`mammoth failed for ${filename}:`, err);
    }
  }

  // 4. Office & Presentation Documents (.pptx, .xlsx, etc.) -> Use officeparser
  try {
    const parseFn = officeparser.parseOffice || officeparser.parseOfficeAsync || officeparser;
    const parsedText = await parseFn(buffer);
    if (typeof parsedText === "string") {
      const cleaned = sanitizeText(parsedText);
      if (isReadableText(cleaned)) {
        console.log(`📊 Successfully extracted ${cleaned.length} clean chars from Office doc (${filename})`);
        return cleaned;
      }
    }
  } catch (error) {
    console.warn(`officeparser warning for ${filename}:`, error);
  }

  throw new Error(`Could not extract readable text from "${filename}". Please ensure it contains selectable text.`);
}
