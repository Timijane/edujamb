import mammoth from "mammoth";

export type ParsedAcademicDocument = {
  fileName: string;
  contentType: string;
  text: string;
};

export async function parseAcademicDocument(
  file: File,
): Promise<ParsedAcademicDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    const { PDFParse } = await import("pdf-parse");

    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (
    file.type === "text/plain" ||
    file.name.toLowerCase().endsWith(".txt")
  ) {
    text = buffer.toString("utf8");
  } else {
    throw new Error("Unsupported academic document format.");
  }

  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    throw new Error(
      "No readable text was found in this document. If it is a scanned PDF, OCR will be required.",
    );
  }

  if (text.length > 500000) {
    throw new Error(
      "Document is too large to process. Maximum extracted text is 500,000 characters.",
    );
  }

  return {
    fileName: file.name,
    contentType: file.type,
    text,
  };
}
