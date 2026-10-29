export interface CompanyPageData {
  company_id: string; company_name: string; company_description: string | null; company_website: string | null; industry: string | null;
  verified: boolean; general_location: string; work_environment: string; learning_opportunities: string; accessibility_information: string;
  public_contact_email: string; public_contact_url: string; logo_path: string | null;
  opportunities: { id: string; title: string; location: string | null; location_type: string; duration: string | null; skills: string[] | null }[];
  impact: { completed_experiences: number; approved_minutes: number } | null;
}

export async function prepareCompanyLogo(file: File): Promise<Blob> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP logo up to 2 MB.');
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); throw new Error('Unable to prepare this logo.'); }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to prepare this logo.')), 'image/png'));
}