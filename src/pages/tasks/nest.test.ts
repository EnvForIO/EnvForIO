import { describe, expect, it } from 'vitest'
import type { Task } from '@/lib/tauri-bindings'
import { flatten, groupMinutes, nest } from './nest'

const task = (id: number, parentId: number | null, extra: Partial<Task> = {}) =>
  ({ id, parentId, sortOrder: id, doneAt: null, ...extra }) as Task

describe('nest', () => {
  it('puts subtasks under a listed parent, open first, and keeps the rest alone', () => {
    const tasks = [
      task(1, null),
      task(3, 1, { doneAt: 'x' }),
      task(9, null),
      task(4, 1),
      task(7, 5), // its parent is not in this list
    ]
    const groups = nest(tasks)
    expect(groups.map(g => g.task.id)).toEqual([1, 9, 7])
    expect(groups[0]?.subtasks.map(s => s.id)).toEqual([4, 3])
    expect(flatten(groups).map(t => t.id)).toEqual([1, 4, 3, 9, 7])
  })

  it("counts a parent's time as its budget or its subtasks' total", () => {
    const [group] = nest([
      task(1, null, { estimateMinutes: 60 }),
      task(2, 1, { estimateMinutes: 50 }),
      task(3, 1, { estimateMinutes: null }),
    ])
    expect(group && groupMinutes(group)).toBe(60)
    const [over] = nest([
      task(1, null, { estimateMinutes: 60 }),
      task(2, 1, { estimateMinutes: 90 }),
    ])
    expect(over && groupMinutes(over)).toBe(90)
  })
})
