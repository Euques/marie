/**
 * Utility functions for clean event title and date display without repeating couple names
 */

export function formatEventDate(dateStr?: string): string {
  if (!dateStr) return 'A definir';
  const clean = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return clean;
}

export function getCleanEventDisplayTitle(
  eventTitle?: string,
  brideName?: string,
  groomName?: string
): string {
  const bride = (brideName || '').trim();
  const groom = (groomName || '').trim();
  const couple = groom ? `${bride} & ${groom}` : bride;
  const title = (eventTitle || 'Chá de Panela').trim();

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const titleNorm = normalize(title);
  const brideNorm = normalize(bride);
  const groomNorm = normalize(groom);

  const hasBride = brideNorm.length >= 2 && titleNorm.includes(brideNorm);
  const hasGroom = groomNorm.length >= 2 && titleNorm.includes(groomNorm);

  if (hasBride || hasGroom || !couple) {
    return title;
  }
  return `${title} de ${couple}`;
}

export function formatPhoneDigits(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}
