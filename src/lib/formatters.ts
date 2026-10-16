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

export function getCoupleSlug(brideName?: string, groomName?: string): string {
  const bride = (brideName || 'noiva').trim() || 'noiva';
  const groom = (groomName || 'noivo').trim() || 'noivo';
  return `${bride}-e-${groom}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getEventCategoryLabel(eventTitle?: string): string {
  if (!eventTitle) return 'Chá de Panela';
  const clean = eventTitle.trim();
  const match = clean.match(/^(Chá\s+de\s+Panela|Chá\s+Bar|Chá\s+de\s+Casa\s+Nova|Chá\s+de\s+Cozinha|Chá\s+de\s+Lingerie|Casamento|Noivado)/i);
  if (match) {
    return match[1];
  }
  const deIndex = clean.toLowerCase().indexOf(' de ');
  if (deIndex > 0) {
    return clean.substring(0, deIndex).trim();
  }
  const daIndex = clean.toLowerCase().indexOf(' da ');
  if (daIndex > 0) {
    return clean.substring(0, daIndex).trim();
  }
  const doIndex = clean.toLowerCase().indexOf(' do ');
  if (doIndex > 0) {
    return clean.substring(0, doIndex).trim();
  }
  return clean;
}
