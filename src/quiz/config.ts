import sandalia from '@/assets/moleca/sandalia.jpg.asset.json';
import tenis from '@/assets/moleca/tenis.jpg.asset.json';
import bota from '@/assets/moleca/bota.jpg.asset.json';
import sapatilha from '@/assets/moleca/sapatilha.jpg.asset.json';
import tamanco from '@/assets/moleca/tamanco.jpg.asset.json';
import bolsa from '@/assets/moleca/bolsa.jpg.asset.json';
import logo from '@/assets/moleca/logo.png.asset.json';

export interface Prize { id: string; name: string; image: string; path: string }
export interface Question { text: string; answers: string[]; correct: number }
export const STORE_URL = 'https://molecaoficial.lovable.app';
export const LOGO = logo.url;
export const PRIZES: Prize[] = [
  { id: 'sandalia', name: 'Sandália Moleca', image: sandalia.url, path: '/colecao?cat=sandalias' },
  { id: 'tenis', name: 'Tênis Moleca', image: tenis.url, path: '/produto/m5796-118' },
  { id: 'bota', name: 'Bota Moleca', image: bota.url, path: '/produto/m5352-100' },
  { id: 'sapatilha', name: 'Sapatilha Moleca', image: sapatilha.url, path: '/colecao?cat=sapatilhas' },
  { id: 'tamanco', name: 'Tamanco Moleca', image: tamanco.url, path: '/colecao?cat=tamancos' },
  { id: 'bolsa', name: 'Bolsa Moleca', image: bolsa.url, path: '/colecao?cat=bolsas' },
];
export const QUESTIONS: Question[] = [
  { text: 'Qual calçado é um clássico do dia a dia?', answers: ['Sapatilha', 'Patins', 'Chuteira', 'Bota de esqui'], correct: 0 },
  { text: 'Qual modelo combina com um passeio em dias quentes?', answers: ['Bota de neve', 'Sandália', 'Galocha', 'Chuteira'], correct: 1 },
  { text: 'O que mais importa ao escolher seu tamanho?', answers: ['Só a cor', 'O modelo mais apertado', 'O conforto e o ajuste', 'Só a embalagem'], correct: 2 },
  { text: 'Como cuidar dos seus calçados no dia a dia?', answers: ['Usar produtos abrasivos', 'Deixar de molho sempre', 'Secar no forno', 'Seguir as instruções de cuidado'], correct: 3 },
  { text: 'Qual acessório ajuda a completar o look?', answers: ['Bolsa', 'Travesseiro', 'Toalha', 'Cobertor'], correct: 0 },
  { text: 'Qual modelo é uma boa opção para um look casual?', answers: ['Nadadeira', 'Tênis', 'Patins', 'Bota de esqui'], correct: 1 },
  { text: 'Onde é melhor guardar os calçados?', answers: ['Em local úmido', 'Ao sol o dia inteiro', 'Em local seco e arejado', 'Dentro de um balde'], correct: 2 },
  { text: 'Qual destas categorias você encontra na Moleca?', answers: ['Ferramentas', 'Eletrônicos', 'Eletrodomésticos', 'Calçados e bolsas'], correct: 3 },
];

export function makeGrid(prize: Prize, winning: boolean): Prize[] {
  const others = PRIZES.filter(item => item.id !== prize.id);
  const grid = winning ? [prize, prize, prize, ...others, others[0]] : [...PRIZES, ...PRIZES.slice(0, 3)];
  return grid.sort(() => Math.random() - 0.5);
}
export function prizeDestination(prize: Prize): string {
  return new URL(prize.path, STORE_URL).toString();
}