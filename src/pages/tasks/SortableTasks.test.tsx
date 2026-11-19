import { describe, expect, it, vi } from 'vitest'
import { commands, type Task } from '@/lib/tauri-bindings'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { SortableTasks } from './SortableTasks'

const task = (id: number, title: string, parentId: number | null) =>
  ({
    id,
    title,
    parentId,
    parentTitle: parentId === null ? null : 'paper',
    note: '',
    isImportant: false,
    isPinned: false,
    dueDate: null,
    doneAt: null,
    sortOrder: id,
    projectId: null,
    moduleId: null,
    estimateMinutes: null,
    actualMinutes: null,
    scheduledDate: null,
    startTime: null,
    endTime: null,
    subtaskCount: parentId === null ? 2 : 0,
    subtasksDone: 0,
    createdAt: '2026-11-21T00:00:00Z',
    ideaId: null,
    startedAt: null,
  }) as Task

/** A drag carrying whatever types were set on it, as the browser does. */
function dataTransfer() {
  const data = new Map<string, string>()
  return {
    setData: (type: string, value: string) => data.set(type, value),
    get types() {
      return [...data.keys()]
    },
    effectAllowed: 'move',
  }
}

describe('SortableTasks', () => {
  it('drags a subtask among its siblings without moving its parent', async () => {
    const reorder = vi.fn().mockResolvedValue({ status: 'ok', data: null })
    Object.assign(commands, { reorderTasks: reorder })
    render(
      <SortableTasks
        tasks={[
          task(1, 'paper', null),
          task(2, 'intro', 1),
          task(3, 'method', 1),
        ]}
        view="Tasks"
      />
    )
    const row = (title: string) =>
      screen.getByText(title).closest('[draggable]') as HTMLElement

    const drag = dataTransfer()
    fireEvent.dragStart(row('method'), { dataTransfer: drag })
    fireEvent.dragOver(row('intro'), { dataTransfer: drag, clientY: -1 })
    fireEvent.drop(row('intro'), { dataTransfer: drag })

    await waitFor(() => expect(reorder).toHaveBeenCalledWith([3, 2]))
    expect(reorder).toHaveBeenCalledTimes(1)
  })
})
