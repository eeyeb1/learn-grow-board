import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface CertificateRecord {
  id: string;
  code: string;
  placement_id: string;
  seeker_name: string;
  company_name: string;
  role_title: string;
  start_date: string | null;
  end_date: string | null;
  approved_minutes: number;
  skills: string[];
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  verification_enabled: boolean;
  show_name: boolean;
  show_hours: boolean;
  show_skills: boolean;
}

export const CERT_DISCLAIMER =
  "This certificate confirms work experience recorded and approved on ExpBoard. It is not a formal qualification, accreditation or reference of employment.";

export const verifyUrl = (code: string) => `${window.location.origin}/verify/${code}`;

export const fmtDate = (d: string | null) =>
  d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not recorded";

export const fmtMinutes = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hours ${r} minutes` : `${h} hours`;
};

// Brand colours (match --primary / --secondary / --foreground in index.css)
const TEAL: [number, number, number] = [22, 161, 134];
const CORAL: [number, number, number] = [240, 120, 76];
const INK: [number, number, number] = [19, 24, 32];
const MUTED: [number, number, number] = [100, 108, 120];

/** Builds the PDF from the server-issued certificate record only. */
export async function buildCertificatePdf(c: CertificateRecord): Promise<Blob> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210, cx = W / 2;

  doc.setFillColor(252, 250, 246); doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(...TEAL); doc.setLineWidth(1.6); doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.3); doc.rect(14, 14, W - 28, H - 28);
  doc.setFillColor(...TEAL); doc.rect(14, 14, W - 28, 4, "F");
  doc.setFillColor(...CORAL); doc.rect(14, 18, 40, 1.2, "F");

  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...TEAL);
  doc.text("ExpBoard", 24, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(`Certificate ID: ${c.code}`, W - 24, 32, { align: "right" });

  doc.setFontSize(11); doc.setCharSpace(1.5); doc.setTextColor(...MUTED);
  doc.text("CERTIFICATE OF WORK EXPERIENCE", cx, 50, { align: "center" });
  doc.setCharSpace(0);

  doc.setFontSize(11); doc.text("This certifies that", cx, 62, { align: "center" });
  doc.setFont("times", "bold"); doc.setFontSize(30); doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(c.seeker_name, 220)[0], cx, 77, { align: "center" });
  doc.setDrawColor(...CORAL); doc.setLineWidth(0.6); doc.line(cx - 50, 81, cx + 50, 81);

  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED);
  doc.text("completed a work experience placement as", cx, 91, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(c.role_title, 220)[0], cx, 101, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED);
  doc.text("at", cx, 109, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...TEAL);
  doc.text(doc.splitTextToSize(c.company_name, 220)[0], cx, 118, { align: "center" });

  // Facts row
  const facts: [string, string][] = [
    ["Dates", `${fmtDate(c.start_date)} – ${fmtDate(c.end_date)}`],
    ["Employer-approved hours", fmtMinutes(c.approved_minutes)],
    ["Issued", fmtDate(c.issued_at)],
  ];
  const colW = 76, startX = cx - (colW * 3) / 2;
  facts.forEach(([k, v], i) => {
    const x = startX + colW * i + colW / 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), x, 131, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.text(v, x, 137, { align: "center" });
  });

  let y = 149;
  if (c.skills.length) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text("EMPLOYER-CONFIRMED SKILLS", cx, y, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(c.skills.join("  ·  "), 200).slice(0, 2);
    doc.text(lines, cx, y + 6, { align: "center" });
    y += 6 + lines.length * 5;
  }

  // QR + verification
  const url = verifyUrl(c.code);
  const qr = await QRCode.toDataURL(url, { margin: 0, width: 300, color: { dark: "#131820", light: "#FCFAF6" } });
  doc.addImage(qr, "PNG", W - 52, H - 56, 28, 28);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text("Scan or visit to verify", W - 38, H - 25, { align: "center" });

  doc.setFontSize(8.5);
  doc.text(`Verify at: ${url}`, 24, H - 36);
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize(CERT_DISCLAIMER + " Hours and skills are taken from records approved by the employer at the time of issue.", 200), 24, H - 30);

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
