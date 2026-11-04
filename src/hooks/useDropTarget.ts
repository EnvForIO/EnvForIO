/**
 * A place a dragged item can be dropped on (native drag and drop, as the
 * calendar and the project board use): `dropping` while something of
 * `type` hovers, and `onDrop` with the dragged item's id.
 */
import { useState } from 'react'

export function useDropTarget(type: string, onDrop: (id: number) => void) {
  const [dropping, setDropping] = useState(false)
  const handlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(type)) return
      e.preventDefault()
      setDropping(true)
    },
    onDragLeave: () => setDropping(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDropping(false)
      const id = Number(e.dataTransfer.getData(type))
      if (id) onDrop(id)
    },
  }
  return { dropping, handlers }
}
