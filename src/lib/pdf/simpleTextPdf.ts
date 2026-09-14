// Minimal single-page PDF generator for plain-text reports.
// No external dependency: builds a valid PDF file byte-for-byte from a list of lines.

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) wrapped.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) wrapped.push(current);
  return wrapped;
}

export function generateSimpleTextPdf(title: string, lines: string[]): Blob {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 56;
  const fontSize = 11;
  const titleFontSize = 16;
  const lineHeight = 16;
  const maxChars = 92;

  const bodyLines = lines.flatMap((l) => wrapLine(l, maxChars));

  let y = pageHeight - margin;
  const streamParts: string[] = [];
  streamParts.push("BT");
  streamParts.push(`/F2 ${titleFontSize} Tf`);
  streamParts.push(`${margin} ${y} Td`);
  streamParts.push(`(${escapePdfText(title)}) Tj`);
  y -= titleFontSize + 10;
  streamParts.push(`/F1 ${fontSize} Tf`);
  streamParts.push(`0 -${titleFontSize + 10} Td`);

  bodyLines.forEach((line, i) => {
    if (i > 0) streamParts.push(`0 -${lineHeight} Td`);
    streamParts.push(`(${escapePdfText(line)}) Tj`);
  });
  streamParts.push("ET");

  const contentStream = streamParts.join("\n");

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`
  );
  objects.push(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
