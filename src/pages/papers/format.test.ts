import { describe, expect, it } from 'vitest'
import type { Paper } from '@/lib/tauri-bindings'
import { authorsShort, paperByline } from './format'

describe('authorsShort', () => {
  it('uses family names and et al.', () => {
    expect(authorsShort([])).toBe('')
    expect(authorsShort(['Ashish Vaswani'])).toBe('Vaswani')
    expect(authorsShort(['Ashish Vaswani', 'Noam Shazeer'])).toBe(
      'Vaswani & Shazeer'
    )
    expect(authorsShort(['A Vaswani', 'N Shazeer', 'N Parmar'])).toBe(
      'Vaswani et al.'
    )
  })
})

describe('paperByline', () => {
  it('skips what is missing', () => {
    const paper = {
      authors: ['Ada Lovelace'],
      year: null,
      venue: 'arXiv',
    } as Paper
    expect(paperByline(paper)).toBe('Lovelace · arXiv')
    expect(paperByline({ ...paper, authors: [], year: 1843 })).toBe(
      '1843 · arXiv'
    )
  })
})
