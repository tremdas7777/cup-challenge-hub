import { useEffect } from 'react';
import { MARKUP } from '@/quiz/markup';
import { mountQuiz } from '@/quiz/engine';
import '@/quiz/quiz.css';

export default function QuizPremiado() {
  useEffect(() => { mountQuiz(); }, []);
  return <div id="quiz-app" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}
