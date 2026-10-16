import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initialData } from './src/data/initialData';
import { AppData, Gift, Guest, EventInfo } from './src/types';
import { getAllCouplesFromFirestore, getCoupleFromFirestore, subscribeToAllCouplesRealtime } from './src/lib/firebase';

const DEFAULT_COUPLE_PHOTO = 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80';

let cachedCouples: any[] = [];
getAllCouplesFromFirestore()
  .then((list) => {
    if (Array.isArray(list) && list.length > 0) {
      cachedCouples = list;
    }
  })
  .catch(() => {});

subscribeToAllCouplesRealtime((list) => {
  if (Array.isArray(list)) {
    cachedCouples = list;
  }
});

function buildSlug(brideName?: string, groomName?: string): string {
  const b = (brideName || 'noiva').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const g = (groomName || 'noivo').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${b}-e-${g}`;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDatePtBr(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return clean;
}

function getCleanEventDisplayTitle(eventTitle?: string, brideName?: string, groomName?: string): string {
  const bride = (brideName || '').trim();
  const groom = (groomName || '').trim();
  const couple = groom ? `${bride} & ${groom}` : bride;
  const title = (eventTitle || 'Chá de Panela').trim();

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

async function resolveCoupleForRequest(req: express.Request): Promise<any | null> {
  const queryCoupleId = (req.query.casal || req.query.couple || req.query.c) as string | undefined;
  const pathLower = (req.path || '').toLowerCase();
  const slugMatch = pathLower.match(/\/(?:casal|evento)\/([a-z0-9-]+)/);
  const pathSlug = slugMatch ? slugMatch[1] : null;

  if (!queryCoupleId && !pathSlug) {
    return null;
  }

  let list = cachedCouples;
  if (!list || list.length === 0) {
    try {
      list = await getAllCouplesFromFirestore();
      cachedCouples = list;
    } catch {
      list = [];
    }
  }

  if (queryCoupleId) {
    const cleanId = queryCoupleId.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    const found = list.find(
      (c: any) =>
        c.id === cleanId ||
        (Array.isArray(c.aliasIds) && c.aliasIds.includes(cleanId)) ||
        buildSlug(c.eventInfo?.brideName, c.eventInfo?.groomName) === cleanId.toLowerCase()
    );
    if (found) return found;

    try {
      const direct = await getCoupleFromFirestore(cleanId);
      if (direct && direct.eventInfo) return direct;
    } catch {
      // fallback
    }
  }

  if (pathSlug) {
    const foundBySlug = list.find(
      (c: any) =>
        buildSlug(c.eventInfo?.brideName, c.eventInfo?.groomName) === pathSlug ||
        c.id?.toLowerCase() === pathSlug
    );
    if (foundBySlug) return foundBySlug;
  }

  if (initialData && initialData.eventInfo) {
    const initSlug = buildSlug(initialData.eventInfo.brideName, initialData.eventInfo.groomName);
    if (pathSlug === initSlug || queryCoupleId === 'main') {
      return { id: 'main', eventInfo: initialData.eventInfo, gifts: initialData.gifts, guests: initialData.guests };
    }
  }

  return null;
}

function injectCoupleOgTags(html: string, req: express.Request, couple: any | null): string {
  if (!couple || !couple.eventInfo) return html;

  const info: EventInfo = couple.eventInfo;
  const protocol = ((req.headers['x-forwarded-proto'] as string) || req.protocol || 'https').split(',')[0].trim();
  const host = ((req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000').split(',')[0].trim();
  const origin = `${protocol}://${host}`;

  const bride = (info.brideName || 'Noiva').trim();
  const groom = (info.groomName || 'Noivo').trim();
  const rawTitle = (info.eventTitle || 'Chá de Panela').trim();
  const cleanTitle = getCleanEventDisplayTitle(rawTitle, bride, groom);
  const slug = buildSlug(bride, groom);
  const coupleId = couple.id || info.id || '';

  const pageTitle = `${cleanTitle} | Convite & Lista de Presentes`;
  const formattedDate = formatDatePtBr(info.date);
  const datePart = formattedDate ? ` 📅 Data: ${formattedDate}${info.time ? ` às ${info.time}` : ''}.` : '';
  const locationPart = info.location ? ` 📍 Local: ${info.location}.` : '';
  const welcomePart = info.welcomeMessage ? ` "${info.welcomeMessage.slice(0, 90)}"` : '';
  const description = `Você foi convidado(a) para o ${cleanTitle}!${datePart}${locationPart}${welcomePart} Acesse o perfil do casal, confirme sua presença e veja a lista de presentes.`;

  let ogImageUrl = `${origin}/api/og-image/${encodeURIComponent(coupleId || slug)}.jpg`;
  if (info.coverImage && (info.coverImage.startsWith('http://') || info.coverImage.startsWith('https://'))) {
    ogImageUrl = info.coverImage;
  } else if (info.coverImage && info.coverImage.startsWith('/uploads/')) {
    ogImageUrl = `${origin}${info.coverImage}`;
  }

  const canonicalUrl = coupleId
    ? `${origin}/casal/${slug}?casal=${encodeURIComponent(coupleId)}`
    : `${origin}/casal/${slug}`;

  const safeTitle = escapeHtml(pageTitle);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(ogImageUrl);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeSiteName = escapeHtml(cleanTitle);

  let updated = html;
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  updated = updated.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:site_name" content="${safeSiteName}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${safeImage}" />\n    <meta property="og:image:secure_url" content="${safeImage}" />\n    <meta property="og:url" content="${safeUrl}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${safeImage}" />`
  );

  return updated;
}

const getAppDir = () => {
  if (typeof __dirname !== 'undefined' && __dirname) {
    return __dirname;
  }
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
    try {
      return path.dirname(fileURLToPath(import.meta.url));
    } catch {
      // fallback
    }
  }
  return process.cwd();
};

const APP_DIR = getAppDir();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize DB
function loadData(): AppData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as AppData;
      if (parsed && parsed.eventInfo && Array.isArray(parsed.guests) && Array.isArray(parsed.gifts)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading database.json, re-initializing:', err);
  }

  // Fallback to initialData
  saveData(initialData);
  return initialData;
}

function saveData(data: AppData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database.json:', err);
  }
}

let db = loadData();

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded files statically
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Upload Photo API
  app.post('/api/upload', (req, res) => {
    try {
      const { image, fileName } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = 'jpg';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        ext = mime.split('/')[1] || 'jpg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      const extClean = ext.replace('+xml', '').replace('jpeg', 'jpg');
      const safeName = `couple_photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extClean}`;
      const filePath = path.join(UPLOADS_DIR, safeName);

      fs.writeFileSync(filePath, buffer);

      const photoUrl = `/uploads/${safeName}`;
      res.json({ success: true, url: photoUrl });
    } catch (err: any) {
      console.error('Erro no upload de foto:', err);
      res.status(500).json({ error: err.message || 'Erro ao salvar a imagem.' });
    }
  });

  // API Routes
  app.get('/api/data', (req, res) => {
    res.json(db);
  });

  // Update Event Info
  app.put('/api/event', (req, res) => {
    const updatedInfo = req.body as Partial<EventInfo>;
    db.eventInfo = { ...db.eventInfo, ...updatedInfo };
    saveData(db);
    res.json(db.eventInfo);
  });

  // Register New Couple (Clears previous guests and gifts so new account starts completely fresh with 0 items)
  app.post('/api/register-couple', (req, res) => {
    const updatedInfo = req.body as Partial<EventInfo>;
    db.eventInfo = { ...db.eventInfo, ...updatedInfo };
    db.guests = []; // Empty guest list for new couple
    db.gifts = [];  // Empty gift list so new couple starts with 0 gifts
    saveData(db);
    res.json({ success: true, eventInfo: db.eventInfo });
  });

  // Clear Guests only
  app.post('/api/clear-guests', (req, res) => {
    db.guests = [];
    saveData(db);
    res.json({ success: true, message: 'Lista de convidados zerada com sucesso.' });
  });

  // Clear Gifts only (Zerar lista de presentes)
  app.post('/api/clear-gifts', (req, res) => {
    db.gifts = [];
    saveData(db);
    res.json({ success: true, message: 'Lista de presentes zerada com sucesso.' });
  });

  // Import Template Gifts (Carregar 20 sugestões padrão)
  app.post('/api/import-template-gifts', (req, res) => {
    db.gifts = JSON.parse(JSON.stringify(initialData.gifts));
    saveData(db);
    res.json({ success: true, gifts: db.gifts, message: '20 sugestões de presentes carregadas com sucesso.' });
  });

  // Guests Endpoints
  app.get('/api/guests', (req, res) => {
    res.json(db.guests);
  });

  app.post('/api/guests', (req, res) => {
    const { name, email, phone, companions, status, dietaryNotes, message } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nome do convidado é obrigatório' });
    }

    const newGuest: Guest = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: email ? email.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      companions: Number(companions) || 0,
      status: status || 'pending',
      dietaryNotes: dietaryNotes ? dietaryNotes.trim() : undefined,
      message: message ? message.trim() : undefined,
      updatedAt: new Date().toISOString()
    };

    db.guests.push(newGuest);
    saveData(db);
    res.status(201).json(newGuest);
  });

  app.put('/api/guests/:id', (req, res) => {
    const { id } = req.params;
    const index = db.guests.findIndex(g => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    const current = db.guests[index];
    const updated: Guest = {
      ...current,
      ...req.body,
      id: current.id,
      updatedAt: new Date().toISOString()
    };

    db.guests[index] = updated;
    saveData(db);
    res.json(updated);
  });

  app.delete('/api/guests/:id', (req, res) => {
    const { id } = req.params;
    db.guests = db.guests.filter(g => g.id !== id);
    saveData(db);
    res.json({ success: true, id });
  });

  // Guest RSVP submission endpoint
  app.post('/api/rsvp', (req, res) => {
    const { name, email, phone, companions, status, message } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Por favor, informe seu nome completo' });
    }

    const cleanName = name.trim();
    // Check if guest already exists by phone or exact name
    let guest = db.guests.find(g => 
      (phone && g.phone && g.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) ||
      g.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (guest) {
      guest.status = status || 'confirmed';
      if (companions !== undefined) guest.companions = Number(companions);
      if (email) guest.email = email.trim();
      if (phone) guest.phone = phone.trim();
      if (message) guest.message = message.trim();
      guest.updatedAt = new Date().toISOString();
    } else {
      guest = {
        id: 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: cleanName,
        email: email ? email.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        companions: Number(companions) || 0,
        status: status || 'confirmed',
        message: message ? message.trim() : undefined,
        updatedAt: new Date().toISOString()
      };
      db.guests.push(guest);
    }

    saveData(db);
    res.json({ success: true, guest });
  });

  // Gifts Endpoints
  app.get('/api/gifts', (req, res) => {
    res.json(db.gifts);
  });

  app.post('/api/gifts', (req, res) => {
    const { name, category, description, priceRange, suggestedUrl, imageUrl, isCustom, claimedByGuestName } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nome do presente é obrigatório' });
    }

    const newGift: Gift = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      category: category || 'Outros',
      description: description ? description.trim() : undefined,
      priceRange: priceRange ? priceRange.trim() : undefined,
      suggestedUrl: suggestedUrl ? suggestedUrl.trim() : undefined,
      imageUrl: imageUrl ? imageUrl.trim() : undefined,
      isClaimed: false,
      isCustom: Boolean(isCustom)
    };

    if (claimedByGuestName) {
      newGift.isClaimed = true;
      newGift.claimedByGuestName = claimedByGuestName.trim();
      newGift.claimedAt = new Date().toISOString();
    }

    db.gifts.push(newGift);
    saveData(db);
    res.status(201).json(newGift);
  });

  app.put('/api/gifts/:id', (req, res) => {
    const { id } = req.params;
    const index = db.gifts.findIndex(g => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Presente não encontrado' });
    }

    const current = db.gifts[index];
    const updated: Gift = {
      ...current,
      ...req.body,
      name: req.body.name !== undefined ? req.body.name.trim() : current.name,
      category: req.body.category !== undefined ? req.body.category : current.category,
      description: req.body.description !== undefined ? req.body.description.trim() : current.description,
      priceRange: req.body.priceRange !== undefined ? req.body.priceRange.trim() : current.priceRange,
      suggestedUrl: req.body.suggestedUrl !== undefined ? (req.body.suggestedUrl ? req.body.suggestedUrl.trim() : undefined) : current.suggestedUrl,
      imageUrl: req.body.imageUrl !== undefined ? (req.body.imageUrl ? req.body.imageUrl.trim() : undefined) : current.imageUrl,
      id: current.id
    };

    db.gifts[index] = updated;
    saveData(db);
    res.json(updated);
  });

  app.delete('/api/gifts/:id', (req, res) => {
    const { id } = req.params;
    db.gifts = db.gifts.filter(g => g.id !== id);
    saveData(db);
    res.json({ success: true, id });
  });

  // Claim Gift
  app.post('/api/gifts/:id/claim', (req, res) => {
    const { id } = req.params;
    const { guestName, guestEmail, guestPhone, notes } = req.body;

    if (!guestName || typeof guestName !== 'string') {
      return res.status(400).json({ error: 'Por favor, informe seu nome para escolher o presente.' });
    }

    const gift = db.gifts.find(g => g.id === id);
    if (!gift) {
      return res.status(404).json({ error: 'Presente não encontrado' });
    }

    if (gift.isClaimed) {
      return res.status(400).json({ error: 'Este presente já foi reservado por outro convidado.' });
    }

    gift.isClaimed = true;
    gift.claimedByGuestName = guestName.trim();
    if (guestEmail) gift.claimedByGuestEmail = guestEmail.trim();
    if (guestPhone) gift.claimedByGuestPhone = guestPhone.trim();
    if (notes) gift.notes = notes.trim();
    gift.claimedAt = new Date().toISOString();

    // Also auto-add guest to guest list if not present
    const cleanGuestName = guestName.trim();
    const existingGuest = db.guests.find(g => g.name.toLowerCase() === cleanGuestName.toLowerCase());
    if (!existingGuest) {
      db.guests.push({
        id: 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: cleanGuestName,
        email: guestEmail ? guestEmail.trim() : undefined,
        phone: guestPhone ? guestPhone.trim() : undefined,
        companions: 0,
        status: 'confirmed',
        updatedAt: new Date().toISOString()
      });
    }

    saveData(db);
    res.json({ success: true, gift });
  });

  // Unclaim Gift (Liberar presente)
  app.post('/api/gifts/:id/unclaim', (req, res) => {
    const { id } = req.params;
    const gift = db.gifts.find(g => g.id === id);
    if (!gift) {
      return res.status(404).json({ error: 'Presente não encontrado' });
    }

    gift.isClaimed = false;
    gift.claimedByGuestName = undefined;
    gift.claimedByGuestEmail = undefined;
    gift.claimedByGuestPhone = undefined;
    gift.claimedAt = undefined;
    gift.notes = undefined;

    saveData(db);
    res.json({ success: true, gift });
  });

  // Reset DB
  app.post('/api/reset', (req, res) => {
    db = JSON.parse(JSON.stringify(initialData));
    saveData(db);
    res.json({ success: true, message: 'Dados restaurados para o padrão original.' });
  });

  // Dynamic OpenGraph Thumbnail endpoint for couple invite links
  // Converts base64 data URLs, local /uploads files, or remote URLs into a direct HTTP image for WhatsApp/Social crawlers
  app.get('/api/og-image/:coupleParam', async (req, res) => {
    try {
      const rawParam = req.params.coupleParam || '';
      const cleanId = rawParam.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      req.query.casal = cleanId;
      const couple = await resolveCoupleForRequest(req);
      const coverImage: string = couple?.eventInfo?.coverImage || db?.eventInfo?.coverImage || '';

      if (coverImage.startsWith('data:image/')) {
        const matches = coverImage.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1] || 'image/jpeg';
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.send(buffer);
        }
      }

      if (coverImage.startsWith('/uploads/')) {
        const fileName = path.basename(coverImage);
        const localFile = path.join(UPLOADS_DIR, fileName);
        if (fs.existsSync(localFile)) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.sendFile(localFile);
        }
      }

      if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
        return res.redirect(302, coverImage);
      }

      return res.redirect(302, DEFAULT_COUPLE_PHOTO);
    } catch (err) {
      console.error('Error serving OG image:', err);
      return res.redirect(302, DEFAULT_COUPLE_PHOTO);
    }
  });

  // Favicon handler
  app.get(['/favicon.ico', '/favicon.svg'], (req, res) => {
    const faviconPath = path.join(process.cwd(), 'public', 'favicon.svg');
    if (fs.existsSync(faviconPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(faviconPath);
    }
    res.status(404).end();
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      if (req.method !== 'GET') return next();
      const p = req.path;
      if (
        p.startsWith('/api/') ||
        p.startsWith('/uploads/') ||
        p.startsWith('/src/') ||
        p.startsWith('/@') ||
        p.startsWith('/node_modules/') ||
        /\.(js|mjs|ts|tsx|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i.test(p)
      ) {
        return next();
      }

      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        if (!fs.existsSync(indexPath)) return next();
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const couple = await resolveCoupleForRequest(req);
        const finalHtml = injectCoupleOgTags(transformed, req, couple);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        index: false,
        setHeaders: (res, filepath) => {
          if (filepath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
          } else if (filepath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        }
      }));
    }
    app.get('*', async (req, res) => {
      const isAsset = req.path.startsWith('/assets/') || 
                      req.path.startsWith('/src/') || 
                      /\.(js|mjs|ts|tsx|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i.test(req.path);
      if (isAsset) {
        return res.status(404).type('text/plain').send('Asset not found');
      }

      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        try {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const couple = await resolveCoupleForRequest(req);
          const finalHtml = injectCoupleOgTags(rawHtml, req, couple);
          return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
        } catch {
          return res.sendFile(indexPath);
        }
      } else {
        res.status(404).send('Application build files not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
