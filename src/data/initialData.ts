import { AppData } from '../types';

export const initialData: AppData = {
  eventInfo: {
    brideName: "Mariana",
    groomName: "Lucas",
    eventTitle: "Chá de Panela da Mari",
    date: "2026-09-19",
    time: "15:30",
    location: "Espaço Jardim das Flores - Rua das Roseiras, 142, Vila Madalena - São Paulo/SP",
    googleMapsUrl: "https://maps.google.com/?q=Rua+das+Roseiras+142+Sao+Paulo",
    pixKey: "11987654321",
    pixName: "Mariana Silva Santos",
    pixCity: "São Paulo",
    welcomeMessage: "Queridos amigos e familiares! Estamos preparando nossa casa com muito carinho e será uma alegria imensa comemorar essa fase especial com vocês no nosso Chá de Panela. Escolham um presente na lista ou deixem uma mensagem carinhosa!",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    adminPassword: "1234"
  },
  guests: [
    {
      id: "g1",
      name: "Camila Rodrigues",
      email: "camila.rodrigues@email.com",
      phone: "11988881111",
      companions: 1,
      status: "confirmed",
      message: "Mari! Estou super ansiosa para o chá! Parabéns ao casal lindo! ❤️",
      updatedAt: "2026-07-20T14:30:00.000Z"
    },
    {
      id: "g2",
      name: "Tia Regina Silva",
      email: "regina.silva@email.com",
      phone: "11988882222",
      companions: 0,
      status: "confirmed",
      message: "Minha sobrinha querida, vai ser uma festa maravilhosa!",
      updatedAt: "2026-07-21T10:15:00.000Z"
    },
    {
      id: "g3",
      name: "Beatriz e Gabriel",
      email: "bia.gabriel@email.com",
      phone: "11988883333",
      companions: 1,
      status: "confirmed",
      message: "Estaremos lá com certeza para comemorar com vocês!",
      updatedAt: "2026-07-22T18:45:00.000Z"
    },
    {
      id: "g4",
      name: "Juliana Mendes",
      phone: "11988884444",
      companions: 0,
      status: "pending",
      updatedAt: "2026-07-25T09:00:00.000Z"
    },
    {
      id: "g5",
      name: "Fernanda Alcantara",
      phone: "11988885555",
      companions: 0,
      status: "declined",
      message: "Infelizmente estarei viajando nessa data, mas mando meu carinho imenso!",
      updatedAt: "2026-07-24T11:20:00.000Z"
    }
  ],
  gifts: [
    // Cozinha
    {
      id: "p1",
      name: "Jogo de Panelas Antiaderente (5 Peças)",
      category: "Cozinha",
      description: "Cor sugerida: Vermelho ou Inox. Preferência Tramontina ou Brastemp.",
      priceRange: "R$ 180 - R$ 280",
      isClaimed: true,
      claimedByGuestName: "Camila Rodrigues",
      claimedByGuestEmail: "camila.rodrigues@email.com",
      claimedByGuestPhone: "11988881111",
      claimedAt: "2026-07-20T14:32:00.000Z"
    },
    {
      id: "p2",
      name: "Kit Utensílios de Silicone com Cabo de Madeira (12 Peças)",
      category: "Cozinha",
      description: "Cor sugerida: Preto ou Cinza.",
      priceRange: "R$ 70 - R$ 120",
      isClaimed: false
    },
    {
      id: "p3",
      name: "Tábua de Corte de Bambu com Cabos em Inox",
      category: "Cozinha",
      description: "Tamanho médio/grande para carnes e vegetais.",
      priceRange: "R$ 50 - R$ 90",
      isClaimed: true,
      claimedByGuestName: "Tia Regina Silva",
      claimedByGuestEmail: "regina.silva@email.com",
      claimedByGuestPhone: "11988882222",
      claimedAt: "2026-07-21T10:20:00.000Z"
    },
    {
      id: "p4",
      name: "Jogo de Assadeiras de Vidro Refratário (3 Peças)",
      category: "Cozinha",
      description: "Marca Pyrex ou Marinex com tampa.",
      priceRange: "R$ 80 - R$ 140",
      isClaimed: false
    },
    {
      id: "p5",
      name: "Escorredor de Louça em Aço Inox de 2 Andares",
      category: "Cozinha",
      description: "Capacidade para 16 pratos.",
      priceRange: "R$ 90 - R$ 150",
      isClaimed: false
    },

    // Eletrodomésticos
    {
      id: "p6",
      name: "Air Fryer / Fritadeira Sem Óleo 4L",
      category: "Eletrodomésticos",
      description: "Cor: Preta ou Inox. Marca Mondial, Britânia ou Philips Walita.",
      priceRange: "R$ 250 - R$ 380",
      isClaimed: true,
      claimedByGuestName: "Beatriz e Gabriel",
      claimedByGuestEmail: "bia.gabriel@email.com",
      claimedByGuestPhone: "11988883333",
      claimedAt: "2026-07-22T18:50:00.000Z"
    },
    {
      id: "p7",
      name: "Liquidificador de Alta Potência com Copo de Vidro",
      category: "Eletrodomésticos",
      description: "Mínimo 1000W.",
      priceRange: "R$ 130 - R$ 220",
      isClaimed: false
    },
    {
      id: "p8",
      name: "Cafeteira Elétrica Programável",
      category: "Eletrodomésticos",
      description: "Com jarra de inox ou vidro para 30 xícaras.",
      priceRange: "R$ 110 - R$ 190",
      isClaimed: false
    },
    {
      id: "p9",
      name: "Mixer de Mão 3 em 1 (Batedor + Processador)",
      category: "Eletrodomésticos",
      description: "Inox, 110V.",
      priceRange: "R$ 120 - R$ 180",
      isClaimed: false
    },
    {
      id: "p10",
      name: "Sanduicheira e Grill Antiaderente Inox",
      category: "Eletrodomésticos",
      description: "Marca Oster, Cadence ou Britânia.",
      priceRange: "R$ 80 - R$ 130",
      isClaimed: false
    },

    // Mesa e Banho
    {
      id: "p11",
      name: "Aparelho de Jantar de Porcelana (20 Peças - 4 Pessoas)",
      category: "Mesa e Banho",
      description: "Estampa neutra / branca ou borda dourada.",
      priceRange: "R$ 200 - R$ 320",
      isClaimed: false
    },
    {
      id: "p12",
      name: "Jogo de Toalhas de Banho Gigante (4 Peças)",
      category: "Mesa e Banho",
      description: "Cores suaves (Branco, Bege ou Rosa Quartzo). Gramatura alta.",
      priceRange: "R$ 120 - R$ 200",
      isClaimed: false
    },
    {
      id: "p13",
      name: "Jogo de Taças para Água/Vinho de Cristal (6 Peças)",
      category: "Mesa e Banho",
      description: "Modelo transparente com relevo ou liso elegante.",
      priceRange: "R$ 100 - R$ 170",
      isClaimed: false
    },
    {
      id: "p14",
      name: "Conjunto de Lugar Americano com Guardanapos de Tecido (6 Lugares)",
      category: "Mesa e Banho",
      description: "Estampa floral delicada ou linho bege.",
      priceRange: "R$ 80 - R$ 140",
      isClaimed: false
    },

    // Servir e Decoração
    {
      id: "p15",
      name: "Petisqueira de Cerâmica com Base Giratória de Bambu",
      category: "Servir e Decoração",
      description: "Perfeito para noites de petiscos e queijos.",
      priceRange: "R$ 70 - R$ 110",
      isClaimed: false
    },
    {
      id: "p16",
      name: "Jarra de Vidro Lapidado para Sucos/Água 1.5L",
      category: "Servir e Decoração",
      description: "Com detalhe trabalhado.",
      priceRange: "R$ 50 - R$ 90",
      isClaimed: false
    },
    {
      id: "p17",
      name: "Saladeira de Vidro Refratário com Talheres de Servir em Bambu",
      category: "Servir e Decoração",
      description: "Ideal para saladas e sobremesas.",
      priceRange: "R$ 60 - R$ 100",
      isClaimed: false
    },

    // Organização e Limpeza
    {
      id: "p18",
      name: "Conjunto de Potes Herméticos de Vidro com Tampa de Bambu (5 Peças)",
      category: "Organização e Limpeza",
      description: "Para mantimentos (arroz, feijão, açúcar, café, macarrão).",
      priceRange: "R$ 110 - R$ 180",
      isClaimed: false
    },
    {
      id: "p19",
      name: "Organizador Galheteiro de Temperos Giratório (12 Potes)",
      category: "Organização e Limpeza",
      description: "Aço Inox e Vidro.",
      priceRange: "R$ 80 - R$ 130",
      isClaimed: false
    },
    {
      id: "p20",
      name: "Mimo em Dinheiro via PIX",
      category: "Mimos e Outros",
      description: "Qualquer valor é muito bem-vindo para nos ajudar na lua de mel ou na decoração da casa nova!",
      priceRange: "Valor livre",
      isClaimed: false
    }
  ]
};
