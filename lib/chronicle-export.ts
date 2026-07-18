import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

export type ExportType = "note" | "observation" | "appointment";
export type ExportFormat = "pdf" | "csv";

export type FlatEntry = {
  date: string;
  type: "Note" | "Observation" | "Appointment";
  category: string;
  body: string;
  author: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  gp_note: "GP Note",
  specialist: "Specialist",
  hospital: "Hospital",
  test_result: "Test Result",
  observation: "Observation",
  other: "Other",
};

export function prettifyCategory(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function buildApptBody(a: { title: string; specialist: string | null; location: string | null; appointment_time: string | null }): string {
  const parts: string[] = [a.title];
  if (a.specialist) parts.push(`Specialist: ${a.specialist}`);
  if (a.location) parts.push(`Location: ${a.location}`);
  if (a.appointment_time) parts.push(`Time: ${a.appointment_time}`);
  return parts.join("\n");
}

function csvCell(value: string): string {
  const str = (value ?? "").toString();
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(entries: FlatEntry[]): string {
  const header = ["date", "type", "category", "body", "author"];
  const rows = entries.map((e) => [e.date, e.type, e.category, e.body, e.author].map(csvCell).join(","));
  return [header.join(","), ...rows].join("\r\n");
}

export async function buildPdf(entries: FlatEntry[], from: string, to: string, exportDate: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 48;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LINE_H = 14;
  const PARA_GAP = 8;

  const TYPE_COLOURS: Record<string, [number, number, number]> = {
    Note: [0.42, 0.35, 0.65],
    Observation: [0.27, 0.55, 0.45],
    Appointment: [0.82, 0.42, 0.3],
  };

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) newPage();
  }

  function drawText(
    text: string,
    opts: { font?: PDFFont; size?: number; color?: [number, number, number]; indent?: number; maxWidth?: number } = {},
  ): void {
    const font = opts.font ?? fontRegular;
    const size = opts.size ?? 9;
    const color = opts.color ?? [0.15, 0.15, 0.15];
    const x = MARGIN + (opts.indent ?? 0);
    const maxWidth = opts.maxWidth ?? CONTENT_W - (opts.indent ?? 0);

    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(candidate, size);
      if (w > maxWidth && line) {
        ensureSpace(LINE_H);
        page.drawText(line, { x, y, size, font, color: rgb(...color) });
        y -= LINE_H;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      ensureSpace(LINE_H);
      page.drawText(line, { x, y, size, font, color: rgb(...color) });
      y -= LINE_H;
    }
  }

  page.drawRectangle({ x: 0, y: PAGE_H - 100, width: PAGE_W, height: 100, color: rgb(0.42, 0.35, 0.65) });
  page.drawText("GP Export — Care Chronicle", { x: MARGIN, y: PAGE_H - 45, size: 18, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Exported on ${exportDate}`, { x: MARGIN, y: PAGE_H - 65, size: 9, font: fontRegular, color: rgb(0.9, 0.9, 0.95) });
  page.drawText(`Date range: ${from}  –  ${to}`, { x: MARGIN, y: PAGE_H - 80, size: 9, font: fontRegular, color: rgb(0.9, 0.9, 0.95) });

  y = PAGE_H - 115;

  if (entries.length === 0) {
    drawText("No entries found for the selected date range and filters.", { size: 10, color: [0.4, 0.4, 0.4] });
    return doc.save();
  }

  const sections: { label: string; key: FlatEntry["type"] }[] = [
    { label: "Medical Notes", key: "Note" },
    { label: "Observations", key: "Observation" },
    { label: "Appointments", key: "Appointment" },
  ];

  for (const section of sections) {
    const sectionEntries = entries.filter((e) => e.type === section.key);
    if (sectionEntries.length === 0) continue;

    ensureSpace(40);

    const [r, g, b] = TYPE_COLOURS[section.key] ?? [0.3, 0.3, 0.3];
    page.drawRectangle({ x: MARGIN, y: y - 4, width: CONTENT_W, height: 20, color: rgb(r, g, b) });
    page.drawText(section.label, { x: MARGIN + 6, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    y -= 26;

    for (const entry of sectionEntries) {
      ensureSpace(50);

      const metaLine = `${entry.date}  ·  ${entry.category}${entry.author && entry.author !== "—" ? `  ·  ${entry.author}` : ""}`;
      drawText(metaLine, { font: fontBold, size: 8, color: [0.4, 0.4, 0.4] });

      for (const bl of entry.body.split("\n")) {
        if (bl.trim() === "") { y -= 4; continue; }
        drawText(bl, { size: 9, color: [0.12, 0.12, 0.12] });
      }

      ensureSpace(8);
      page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: MARGIN + CONTENT_W, y: y + 2 }, thickness: 0.4, color: rgb(0.85, 0.85, 0.88) });
      y -= PARA_GAP + 2;
    }

    y -= 8;
  }

  const pageCount = doc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pg = doc.getPage(i);
    pg.drawText(`Page ${i + 1} of ${pageCount}`, { x: PAGE_W - MARGIN - 60, y: 20, size: 7, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
  }

  return doc.save();
}
