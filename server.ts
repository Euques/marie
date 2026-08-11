import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initialData } from './src/data/initialData.js';
import { AppData, Gift, Guest, EventInfo } from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.join(__dirname, 'data');
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

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
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
    const { name, category, description, priceRange, suggestedUrl, isCustom, claimedByGuestName } = req.body;
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

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
