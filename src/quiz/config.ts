// =====================================================================
// CONFIGURAÇÃO DO QUIZ — edite só este arquivo
// =====================================================================
export const CONFIG = {
  loja: "SUA LOJA",
  logo: "",                          // URL da sua logo (PNG branco fica melhor). Vazio = mostra o nome.
  imagemHero: "",                    // foto de fundo da home (URL). Vazio = gradiente.
  corVerde: "#28A85A",               // botões
  corDestaque: "#FF8000",            // destaques / faixa
  urlLoja: "https://sualoja.com.br",
  parametroCupom: "coupon",          // Shopify/Nuvemshop: ?coupon=CODIGO
  validadeDias: 3,                   // validade REAL — configure igual na plataforma
  pedirLead: true,                   // pede nome + WhatsApp antes da raspadinha
  webhookLeads: "",                  // URL que recebe POST JSON com o lead (Make, Zapier, n8n...)
  metaPixelId: "",

  // textos da home
  titulo: "Teste seus conhecimentos e ganhe prêmios",
  subtitulo: "Responda 8 perguntas e <strong>garanta um desconto exclusivo</strong> na nossa loja",

  // rodapé (deixe vazio o que não quiser mostrar)
  contato: { email: "", whatsapp: "", cidade: "" },
  empresa: { razaoSocial: "", cnpj: "" },
  regras: "Cupom de uso único por cliente. Não cumulativo com outras promoções. Válido para compras no site oficial.",

  // perguntas: "certa" = índice da resposta correta (0 a 3). Errar não elimina.
  perguntas: [
    { p: "Qual é o material mais usado em chinelos de dedo?", r: ["Couro", "Borracha", "Madeira", "Tecido"], certa: 1 },
    { p: "Qual estação mais vende chinelos no Brasil?", r: ["Inverno", "Outono", "Verão", "Primavera"], certa: 2 },
    { p: "O que significa 'antiderrapante'?", r: ["Que não molha", "Que não escorrega", "Que não rasga", "Que não desbota"], certa: 1 },
    { p: "Como lavar seu chinelo corretamente?", r: ["Máquina com água quente", "Água e sabão neutro", "Água sanitária pura", "Não precisa lavar"], certa: 1 },
    { p: "Qual a melhor forma de secar o chinelo?", r: ["Sol forte o dia todo", "Secador de cabelo", "À sombra, ventilado", "No forno"], certa: 2 },
    { p: "Qual numeração é a mais vendida no Brasil?", r: ["33/34", "37/38", "45/46", "29/30"], certa: 1 },
    { p: "O que deixa o chinelo mais confortável?", r: ["Palmilha anatômica", "Ser mais pesado", "Solado liso", "Tira bem apertada"], certa: 0 },
    { p: "De quanto em quanto tempo é bom trocar de chinelo?", r: ["Nunca", "Quando a sola gasta", "Toda semana", "A cada 10 anos"], certa: 1 }
  ],

  // Prêmios REAIS — os códigos precisam existir na sua plataforma. "peso" = chance relativa.
  premios: [
    { id: "p10",   nome: "10% OFF",      emoji: "🏷️", codigo: "QUIZ10",    peso: 50 },
    { id: "p15",   nome: "15% OFF",      emoji: "💸", codigo: "QUIZ15",    peso: 30 },
    { id: "frete", nome: "Frete Grátis", emoji: "🚚", codigo: "QUIZFRETE", peso: 15 },
    { id: "p20",   nome: "20% OFF",      emoji: "💎", codigo: "QUIZ20",    peso: 5  }
  ],
  // símbolos extras que só aparecem para preencher a grade (não dão prêmio)
  simbolos: [
    { id: "s1", nome: "Estrela", emoji: "⭐" },
    { id: "s2", nome: "Trevo",   emoji: "🍀" },
    { id: "s3", nome: "Sol",     emoji: "☀️" }
  ],
  rodadas: 2   // 1ª rodada sem prêmio, última rodada revela o prêmio sorteado
};
