import { AppData, Gift } from '../types';

export const TEMPLATE_GIFTS: Omit<Gift, 'id' | 'isClaimed'>[] = [
  {
    name: "Jogo de Panelas Antiaderente (5 Peças)",
    category: "Cozinha",
    description: "Cor sugerida: Vermelho ou Inox. Preferência Tramontina.",
    priceRange: "R$ 180 - R$ 280"
  },
  {
    name: "Kit Utensílios de Silicone com Cabo de Madeira (12 Peças)",
    category: "Cozinha",
    description: "Cor sugerida: Preto ou Cinza.",
    priceRange: "R$ 70 - R$ 120"
  },
  {
    name: "Tábua de Corte de Bambu com Cabos em Inox",
    category: "Cozinha",
    description: "Tamanho médio/grande para carnes e vegetais.",
    priceRange: "R$ 50 - R$ 90"
  },
  {
    name: "Jogo de Assadeiras de Vidro Refratário (3 Peças)",
    category: "Cozinha",
    description: "Marca Pyrex ou Marinex com tampa.",
    priceRange: "R$ 80 - R$ 140"
  },
  {
    name: "Escorredor de Louça em Aço Inox de 2 Andares",
    category: "Cozinha",
    description: "Capacidade para 16 pratos.",
    priceRange: "R$ 90 - R$ 150"
  },
  {
    name: "Conjunto de Medidores e Colheres Graduadas",
    category: "Cozinha",
    description: "Inox ou silicone colorido.",
    priceRange: "R$ 35 - R$ 60"
  },
  {
    name: "Air Fryer / Fritadeira Sem Óleo 4L",
    category: "Eletrodomésticos",
    description: "Cor: Preta ou Inox. Marca Mondial, Britânia ou Philips Walita.",
    priceRange: "R$ 250 - R$ 380"
  },
  {
    name: "Liquidificador de Alta Potência com Copo de Vidro",
    category: "Eletrodomésticos",
    description: "Mínimo 1000W.",
    priceRange: "R$ 130 - R$ 220"
  },
  {
    name: "Cafeteira Elétrica Programável",
    category: "Eletrodomésticos",
    description: "Com jarra de inox ou vidro para 30 xícaras.",
    priceRange: "R$ 110 - R$ 190"
  },
  {
    name: "Mixer de Mão 3 em 1 (Batedor + Processador)",
    category: "Eletrodomésticos",
    description: "Inox, 110V.",
    priceRange: "R$ 120 - R$ 180"
  },
  {
    name: "Sanduicheira e Grill Antiaderente Inox",
    category: "Eletrodomésticos",
    description: "Marca Oster, Cadence ou Britânia.",
    priceRange: "R$ 80 - R$ 130"
  },
  {
    name: "Chaleira Elétrica Inox 1.8L",
    category: "Eletrodomésticos",
    description: "Desligamento automático, 110V.",
    priceRange: "R$ 70 - R$ 120"
  },
  {
    name: "Aparelho de Jantar de Porcelana (20 Peças - 4 Pessoas)",
    category: "Mesa e Banho",
    description: "Estampa neutra / branca ou borda dourada.",
    priceRange: "R$ 200 - R$ 320"
  },
  {
    name: "Jogo de Toalhas de Banho Gigante (4 Peças)",
    category: "Mesa e Banho",
    description: "Cores suaves (Branco, Bege ou Rosa Quartzo). Gramatura alta.",
    priceRange: "R$ 120 - R$ 200"
  },
  {
    name: "Jogo de Taças para Água/Vinho de Cristal (6 Peças)",
    category: "Mesa e Banho",
    description: "Modelo transparente com relevo ou liso elegante.",
    priceRange: "R$ 100 - R$ 170"
  },
  {
    name: "Conjunto de Lugar Americano com Guardanapos de Tecido (6 Lugares)",
    category: "Mesa e Banho",
    description: "Estampa floral delicada ou linho bege.",
    priceRange: "R$ 80 - R$ 140"
  },
  {
    name: "Petisqueira de Cerâmica com Base Giratória de Bambu",
    category: "Servir e Decoração",
    description: "Perfeito para noites de petiscos e queijos.",
    priceRange: "R$ 70 - R$ 110"
  },
  {
    name: "Jarra de Vidro Lapidado para Sucos/Água 1.5L",
    category: "Servir e Decoração",
    description: "Com detalhe trabalhado.",
    priceRange: "R$ 50 - R$ 90"
  },
  {
    name: "Saladeira de Vidro Refratário com Talheres de Servir em Bambu",
    category: "Servir e Decoração",
    description: "Ideal para saladas e sobremesas.",
    priceRange: "R$ 60 - R$ 100"
  },
  {
    name: "Boleira de Vidro com Tampa Domo e Pé",
    category: "Servir e Decoração",
    description: "Para bolos, tortas e doces de festa.",
    priceRange: "R$ 70 - R$ 120"
  },
  {
    name: "Conjunto de Potes Herméticos de Vidro com Tampa de Bambu (5 Peças)",
    category: "Organização e Limpeza",
    description: "Para mantimentos (arroz, feijão, açúcar, café, macarrão).",
    priceRange: "R$ 110 - R$ 180"
  },
  {
    name: "Organizador Galheteiro de Temperos Giratório (12 Potes)",
    category: "Organização e Limpeza",
    description: "Aço Inox e Vidro.",
    priceRange: "R$ 80 - R$ 130"
  },
  {
    name: "Kit Fruteira de Mesa em Aço Carbono / Bambu",
    category: "Organização e Limpeza",
    description: "Design moderno de 2 andares.",
    priceRange: "R$ 65 - R$ 110"
  },
  {
    name: "Mimo em Dinheiro via PIX",
    category: "Mimos e Outros",
    description: "Qualquer valor é muito bem-vindo para nos ajudar na lua de mel ou na decoração da casa nova!",
    priceRange: "Valor livre"
  }
];

export const initialData: AppData = {
  eventInfo: {
    brideName: "Mariana",
    groomName: "Lucas",
    eventTitle: "Chá de Panela de Mariana & Lucas",
    date: "2026-10-15",
    time: "15:30",
    location: "Espaço Jardim das Flores - Rua das Roseiras, 142 - São Paulo/SP",
    googleMapsUrl: "https://maps.google.com/?q=Rua+das+Roseiras+142+Sao+Paulo",
    pixKey: "11987654321",
    pixName: "Mariana Silva",
    pixCity: "São Paulo",
    welcomeMessage: "Sejam bem-vindos ao nosso Chá de Panela! Escolha um presente da nossa lista ou confirme sua presença.",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    adminPassword: "1234"
  },
  guests: [],
  gifts: TEMPLATE_GIFTS.map((g, idx) => ({
    ...g,
    id: `p${idx + 1}`,
    isClaimed: false
  }))
};
