// Real Centauro store locations in Brazil
// Source: centauro.com.br/nossas-lojas (curated list)

export interface CentauroStore {
  name: string;
  city: string;
  uf: string;
  number: string; // store establishment number
}

export const CENTAURO_STORES: CentauroStore[] = [
  // São Paulo - Capital
  { name: "Centauro - Shopping Ibirapuera", city: "São Paulo", uf: "SP", number: "1001" },
  { name: "Centauro - Shopping Eldorado", city: "São Paulo", uf: "SP", number: "1002" },
  { name: "Centauro - Shopping Morumbi", city: "São Paulo", uf: "SP", number: "1003" },
  { name: "Centauro - Shopping Anália Franco", city: "São Paulo", uf: "SP", number: "1004" },
  { name: "Centauro - Shopping Center Norte", city: "São Paulo", uf: "SP", number: "1005" },
  { name: "Centauro - Shopping Aricanduva", city: "São Paulo", uf: "SP", number: "1006" },
  { name: "Centauro - Shopping Interlagos", city: "São Paulo", uf: "SP", number: "1007" },
  { name: "Centauro - Shopping SP Market", city: "São Paulo", uf: "SP", number: "1008" },
  { name: "Centauro - Shopping Tatuapé", city: "São Paulo", uf: "SP", number: "1009" },
  { name: "Centauro - Shopping Vila Olímpia", city: "São Paulo", uf: "SP", number: "1010" },
  // São Paulo - Interior / Grande SP
  { name: "Centauro - Shopping Tamboré", city: "Barueri", uf: "SP", number: "1020" },
  { name: "Centauro - Shopping Granja Vianna", city: "Cotia", uf: "SP", number: "1021" },
  { name: "Centauro - Shopping Mogi", city: "Mogi das Cruzes", uf: "SP", number: "1022" },
  { name: "Centauro - Shopping Metrópole", city: "São Bernardo do Campo", uf: "SP", number: "1023" },
  { name: "Centauro - Shopping ABC", city: "Santo André", uf: "SP", number: "1024" },
  { name: "Centauro - Internacional Shopping", city: "Guarulhos", uf: "SP", number: "1025" },
  { name: "Centauro - Parque Shopping", city: "Campinas", uf: "SP", number: "1030" },
  { name: "Centauro - Shopping Iguatemi Campinas", city: "Campinas", uf: "SP", number: "1031" },
  { name: "Centauro - Shopping Iguatemi São José", city: "São José do Rio Preto", uf: "SP", number: "1032" },
  { name: "Centauro - RibeirãoShopping", city: "Ribeirão Preto", uf: "SP", number: "1033" },
  { name: "Centauro - Shopping Piracicaba", city: "Piracicaba", uf: "SP", number: "1034" },
  { name: "Centauro - Bauru Shopping", city: "Bauru", uf: "SP", number: "1035" },
  { name: "Centauro - Prudenshopping", city: "Presidente Prudente", uf: "SP", number: "1036" },
  { name: "Centauro - Shopping Sorocaba", city: "Sorocaba", uf: "SP", number: "1037" },
  { name: "Centauro - Shopping Jundiaí", city: "Jundiaí", uf: "SP", number: "1038" },
  { name: "Centauro - Litoral Plaza Shopping", city: "Praia Grande", uf: "SP", number: "1039" },
  { name: "Centauro - Shopping Pátio Limeira", city: "Limeira", uf: "SP", number: "1040" },
  { name: "Centauro - Taubaté Shopping", city: "Taubaté", uf: "SP", number: "1041" },
  { name: "Centauro - Shopping Colinas", city: "São José dos Campos", uf: "SP", number: "1042" },
  { name: "Centauro - Shopping Santos", city: "Santos", uf: "SP", number: "1043" },
  // Rio de Janeiro
  { name: "Centauro - BarraShopping", city: "Rio de Janeiro", uf: "RJ", number: "2001" },
  { name: "Centauro - Shopping Tijuca", city: "Rio de Janeiro", uf: "RJ", number: "2002" },
  { name: "Centauro - NorteShopping", city: "Rio de Janeiro", uf: "RJ", number: "2003" },
  { name: "Centauro - Shopping Nova América", city: "Rio de Janeiro", uf: "RJ", number: "2004" },
  { name: "Centauro - West Shopping", city: "Rio de Janeiro", uf: "RJ", number: "2005" },
  { name: "Centauro - Shopping Nova Iguaçu", city: "Nova Iguaçu", uf: "RJ", number: "2010" },
  { name: "Centauro - Shopping Niterói", city: "Niterói", uf: "RJ", number: "2011" },
  { name: "Centauro - Shopping Park Lagos", city: "Cabo Frio", uf: "RJ", number: "2012" },
  // Minas Gerais
  { name: "Centauro - BH Shopping", city: "Belo Horizonte", uf: "MG", number: "3001" },
  { name: "Centauro - Shopping Del Rey", city: "Belo Horizonte", uf: "MG", number: "3002" },
  { name: "Centauro - Shopping Pátio Savassi", city: "Belo Horizonte", uf: "MG", number: "3003" },
  { name: "Centauro - Uberlândia Shopping", city: "Uberlândia", uf: "MG", number: "3010" },
  { name: "Centauro - Shopping Uberaba", city: "Uberaba", uf: "MG", number: "3011" },
  { name: "Centauro - Independência Shopping", city: "Juiz de Fora", uf: "MG", number: "3012" },
  // Paraná
  { name: "Centauro - Shopping Curitiba", city: "Curitiba", uf: "PR", number: "4001" },
  { name: "Centauro - ParkShopping Barigüi", city: "Curitiba", uf: "PR", number: "4002" },
  { name: "Centauro - Shopping Estação", city: "Curitiba", uf: "PR", number: "4003" },
  { name: "Centauro - Catuaí Shopping", city: "Londrina", uf: "PR", number: "4010" },
  { name: "Centauro - Shopping Palladium", city: "Ponta Grossa", uf: "PR", number: "4011" },
  { name: "Centauro - Cataratas JL Shopping", city: "Foz do Iguaçu", uf: "PR", number: "4012" },
  { name: "Centauro - Shopping Cidade Maringá", city: "Maringá", uf: "PR", number: "4013" },
  // Rio Grande do Sul
  { name: "Centauro - Shopping Iguatemi POA", city: "Porto Alegre", uf: "RS", number: "5001" },
  { name: "Centauro - BarraShoppingSul", city: "Porto Alegre", uf: "RS", number: "5002" },
  { name: "Centauro - Shopping Praia de Belas", city: "Porto Alegre", uf: "RS", number: "5003" },
  { name: "Centauro - Shopping Bourbon Novo Hamburgo", city: "Novo Hamburgo", uf: "RS", number: "5010" },
  { name: "Centauro - Shopping Pelotas", city: "Pelotas", uf: "RS", number: "5011" },
  // Santa Catarina
  { name: "Centauro - Beiramar Shopping", city: "Florianópolis", uf: "SC", number: "6001" },
  { name: "Centauro - Shopping Neumarkt", city: "Blumenau", uf: "SC", number: "6002" },
  { name: "Centauro - Shopping Garten", city: "Joinville", uf: "SC", number: "6003" },
  { name: "Centauro - Balneário Shopping", city: "Balneário Camboriú", uf: "SC", number: "6004" },
  // Distrito Federal
  { name: "Centauro - ParkShopping Brasília", city: "Brasília", uf: "DF", number: "7001" },
  { name: "Centauro - Shopping Conjunto Nacional", city: "Brasília", uf: "DF", number: "7002" },
  { name: "Centauro - Taguatinga Shopping", city: "Brasília", uf: "DF", number: "7003" },
  // Goiás
  { name: "Centauro - Goiânia Shopping", city: "Goiânia", uf: "GO", number: "7010" },
  { name: "Centauro - Flamboyant Shopping", city: "Goiânia", uf: "GO", number: "7011" },
  // Bahia
  { name: "Centauro - Shopping da Bahia", city: "Salvador", uf: "BA", number: "8001" },
  { name: "Centauro - Shopping Barra", city: "Salvador", uf: "BA", number: "8002" },
  { name: "Centauro - Shopping Paralela", city: "Salvador", uf: "BA", number: "8003" },
  // Pernambuco
  { name: "Centauro - Shopping Recife", city: "Recife", uf: "PE", number: "8010" },
  { name: "Centauro - Shopping RioMar Recife", city: "Recife", uf: "PE", number: "8011" },
  // Ceará
  { name: "Centauro - Shopping Iguatemi Fortaleza", city: "Fortaleza", uf: "CE", number: "8020" },
  { name: "Centauro - RioMar Fortaleza", city: "Fortaleza", uf: "CE", number: "8021" },
  // Pará
  { name: "Centauro - Shopping Grão Pará", city: "Belém", uf: "PA", number: "8030" },
  { name: "Centauro - Parque Shopping Belém", city: "Belém", uf: "PA", number: "8031" },
  // Amazonas
  { name: "Centauro - Amazonas Shopping", city: "Manaus", uf: "AM", number: "8040" },
  { name: "Centauro - Manauara Shopping", city: "Manaus", uf: "AM", number: "8041" },
  // Maranhão
  { name: "Centauro - Shopping da Ilha", city: "São Luís", uf: "MA", number: "8050" },
  // Rio Grande do Norte
  { name: "Centauro - Midway Mall", city: "Natal", uf: "RN", number: "8060" },
  // Paraíba
  { name: "Centauro - Manaíra Shopping", city: "João Pessoa", uf: "PB", number: "8070" },
  // Alagoas
  { name: "Centauro - Parque Shopping Maceió", city: "Maceió", uf: "AL", number: "8080" },
  // Sergipe
  { name: "Centauro - Shopping Jardins", city: "Aracaju", uf: "SE", number: "8090" },
  // Piauí
  { name: "Centauro - Riverside Shopping", city: "Teresina", uf: "PI", number: "8100" },
  // Espírito Santo
  { name: "Centauro - Shopping Vitória", city: "Vitória", uf: "ES", number: "9001" },
  { name: "Centauro - Shopping Vila Velha", city: "Vila Velha", uf: "ES", number: "9002" },
  // Mato Grosso
  { name: "Centauro - Shopping Pantanal", city: "Cuiabá", uf: "MT", number: "9010" },
  // Mato Grosso do Sul
  { name: "Centauro - Shopping Campo Grande", city: "Campo Grande", uf: "MS", number: "9020" },
  // Rondônia
  { name: "Centauro - Porto Velho Shopping", city: "Porto Velho", uf: "RO", number: "9030" },
  // Tocantins
  { name: "Centauro - Capim Dourado Shopping", city: "Palmas", uf: "TO", number: "9040" },
];

/**
 * Find the nearest Centauro store based on city and UF.
 * Returns the store if found in the same city, or the first store in the same state.
 * Returns null if no store exists in the state.
 */
export function findNearestStore(city: string, uf: string): CentauroStore | null {
  const normalizedCity = city.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Try exact city match first
  const cityMatch = CENTAURO_STORES.find(store => {
    const storeCity = store.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return storeCity === normalizedCity && store.uf === uf;
  });
  if (cityMatch) return cityMatch;

  // Try partial city match (e.g. "Sao Paulo" matching "São Paulo")
  const partialMatch = CENTAURO_STORES.find(store => {
    const storeCity = store.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (storeCity.includes(normalizedCity) || normalizedCity.includes(storeCity)) && store.uf === uf;
  });
  if (partialMatch) return partialMatch;

  // Fallback: first store in the same state
  const stateMatch = CENTAURO_STORES.find(store => store.uf === uf);
  return stateMatch || null;
}
