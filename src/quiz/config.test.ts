import { describe, expect, it } from 'vitest';
import { PRIZES, QUESTIONS, makeGrid, prizeDestination } from './config';

describe('Moleca quiz rules', () => {
  it('contains eight questions', () => { expect(QUESTIONS).toHaveLength(8); });
  it('uses store products instead of coupons', () => {
    expect(PRIZES.map(prize => prize.id)).toEqual(['sandalia', 'tenis', 'bota', 'sapatilha', 'tamanco', 'bolsa']);
    expect(PRIZES.every(prize => prize.image.length > 0)).toBe(true);
  });
  it('reveals exactly three of the selected product on the winning board', () => {
    for (const prize of PRIZES) {
      const grid = makeGrid(prize, true);
      expect(grid).toHaveLength(9);
      expect(grid.filter(item => item.id === prize.id)).toHaveLength(3);
      for (const other of PRIZES.filter(item => item.id !== prize.id)) expect(grid.filter(item => item.id === other.id).length).toBeLessThan(3);
    }
  });
  it('has no three matching products on the first board', () => {
    const grid = makeGrid(PRIZES[0], false);
    expect(grid).toHaveLength(9);
    for (const item of PRIZES) expect(grid.filter(prize => prize.id === item.id).length).toBeLessThan(3);
  });
  it('takes every product to the requested Moleca store', () => {
    for (const prize of PRIZES) expect(new URL(prizeDestination(prize)).origin).toBe('https://molecaoficial.lovable.app');
  });
});