import { Check, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QUESTIONS } from './config';

export interface QuizQuestionProps { index: number; score: number; answer: number | null; onAnswer: (answer: number) => void; onNext: () => void }
export function QuizQuestion({ index, score, answer, onAnswer, onNext }: QuizQuestionProps) {
  const question = QUESTIONS[index];
  return <main className="question-wrap">
    <div className="step-meta"><span>PERGUNTA {index + 1} / {QUESTIONS.length}</span><span>{score} acertos</span></div>
    <div className="question-steps">{QUESTIONS.map((item, i) => <i key={item.text} className={cn(i <= index && 'active')} />)}</div>
    <p className="eyebrow">MODA, CONFORTO E VOCÊ</p>
    <h1>{question.text}</h1>
    <div className="answer-list">{question.answers.map((option, i) => <Button key={option} variant="outline" disabled={answer !== null} onClick={() => onAnswer(i)} className={cn('answer-option', answer !== null && i === question.correct && 'correct', answer === i && i !== question.correct && 'incorrect')}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{answer !== null && i === question.correct && <Check />}</Button>)}</div>
    {answer !== null && <div className="answer-feedback" aria-live="polite"><p>{answer === question.correct ? <Check /> : <X />}{answer === question.correct ? 'Isso mesmo! Você arrasou.' : 'Tudo bem! Você continua no jogo.'}</p><Button onClick={onNext}>{index === QUESTIONS.length - 1 ? 'Ir para a raspadinha' : 'Próxima pergunta'}<ArrowRight /></Button></div>}
  </main>;
}