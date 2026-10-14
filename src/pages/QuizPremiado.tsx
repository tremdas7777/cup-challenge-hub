import { useState } from 'react';
import { ArrowRight, Check, Gift, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOGO, PRIZES, QUESTIONS, STORE_URL, makeGrid, prizeDestination } from '@/quiz/config';
import type { Prize } from '@/quiz/config';
import { QuizQuestion } from '@/quiz/QuizQuestion';
import { ScratchBoard } from '@/quiz/ScratchBoard';
import '@/quiz/quiz.css';

type Stage = 'home' | 'quiz' | 'scratch' | 'between' | 'result';
export default function QuizPremiado() {
  const [stage, setStage] = useState<Stage>('home');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [prize] = useState<Prize>(() => PRIZES[Math.floor(Math.random() * PRIZES.length)]);
  const [grid, setGrid] = useState(() => makeGrid(prize, false));
  function navigate(next: Stage) { setStage(next); window.scrollTo(0, 0); }
  function choose(value: number) { if (answer !== null) return; setAnswer(value); if (value === QUESTIONS[index].correct) setScore(current => current + 1); }
  function next() { setAnswer(null); if (index < QUESTIONS.length - 1) setIndex(current => current + 1); else navigate('scratch'); }
  return <div className="moleca-app">
    <div className="announcement">CALÇADOS E BOLSAS PARA O SEU DIA A DIA</div>
    <header className="moleca-header"><a href={STORE_URL} aria-label="Loja Moleca"><img src={LOGO} alt="Moleca" /></a><span>QUIZ PREMIADO</span><a href={`${STORE_URL}/colecao`} aria-label="Ver coleção"><ShoppingBag /></a></header>
    <div className="collection-strip">SEU ESTILO. SEU CONFORTO. SUA MOLECA.</div>
    {stage === 'home' && <>
      <main className="moleca-hero"><img className="hero-product" src={PRIZES[0].image} alt="Sandália da coleção Moleca" fetchPriority="high" /><div className="hero-copy"><p className="eyebrow"><Sparkles size={16} /> UM TOQUE DE SORTE NO SEU DIA</p><h1>Quiz Moleca</h1><p className="hero-description">Seu estilo pode te surpreender.<br />Responda 8 perguntas e descubra<br className="desktop-break" /> o que a sua raspadinha revela.</p><Button size="lg" onClick={() => navigate('quiz')}>Começar meu quiz <ArrowRight /></Button><span className="hero-details">8 perguntas <i /> 2 chances <i /> Participação gratuita</span></div></main>
      <section className="prize-section"><div className="section-heading"><div><p className="eyebrow">ESCOLHIDOS PARA VOCÊ</p><h2>Estilo em cada surpresa</h2></div><Gift /></div><div className="product-row">{PRIZES.map(item => <article className="product-item" key={item.id}><img src={item.image} alt={item.name} loading="lazy" /><h3>{item.name}</h3></article>)}</div></section>
    </>}
    {stage === 'quiz' && <QuizQuestion index={index} score={score} answer={answer} onAnswer={choose} onNext={next} />}
    {stage === 'scratch' && <main className="scratch-wrap"><p className="eyebrow">QUIZ CONCLUÍDO · {score} DE 8 ACERTOS</p><div className="round-indicator"><span className={round === 0 ? 'current' : 'finished'}>{round === 0 ? '1' : <Check size={16} />}</span><i /><span className={round === 1 ? 'current' : ''}>2</span></div><h1>{round === 0 ? 'Seu estilo tem sorte!' : 'Mais uma chance de brilhar!'}</h1><p className="section-description">Raspe e encontre 3 produtos iguais.</p><ScratchBoard key={round} grid={grid} onComplete={() => navigate(round === 0 ? 'between' : 'result')} /></main>}
    {stage === 'between' && <main className="result-wrap"><Sparkles className="result-icon" /><p className="eyebrow">VOCÊ AINDA TEM UMA CHANCE</p><h1>A sorte merece<br />uma segunda chance.</h1><p>Não apareceram 3 produtos iguais desta vez.<br />Sua próxima raspadinha está esperando!</p><Button onClick={() => { setRound(1); setGrid(makeGrid(prize, true)); navigate('scratch'); }}>Jogar novamente <ArrowRight /></Button></main>}
    {stage === 'result' && <main className="result-wrap"><p className="eyebrow">3 PRODUTOS IGUAIS!</p><h1>Uma surpresa<br />com a sua cara.</h1><img className="result-product" src={prize.image} alt={prize.name} /><h2>{prize.name}</h2><p>Este é o produto revelado na sua raspadinha.<br />Consulte as condições de resgate na loja.</p><Button asChild size="lg"><a href={prizeDestination(prize)}>Ver meu produto na loja <ArrowRight /></a></Button><Button variant="ghost" onClick={() => { setIndex(0); setAnswer(null); setScore(0); setRound(0); setGrid(makeGrid(prize, false)); navigate('home'); }}>Voltar ao início</Button></main>}
    <footer className="moleca-footer"><img src={LOGO} alt="Moleca" /><span>Moda e conforto em cada passo.</span><a href={STORE_URL}>Visitar a loja <ArrowRight size={14} /></a></footer>
  </div>;
}