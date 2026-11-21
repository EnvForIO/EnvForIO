import { beforeAll, describe, expect, it, vi } from 'vitest'
import { disableBrowserMenu, onEditMenu } from './browser-menu'

function rightClick(el: Element): boolean {
  const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  el.dispatchEvent(e)
  return e.defaultPrevented
}

describe('browser menu', () => {
  beforeAll(() => disableBrowserMenu())

  it('is turned off on ordinary page content, with no edit menu', () => {
    const open = vi.fn()
    onEditMenu(open)
    const div = document.createElement('div')
    document.body.append(div)
    expect(rightClick(div)).toBe(true)
    expect(open).not.toHaveBeenCalled()
  })

  it('opens the edit menu in text fields instead', () => {
    const open = vi.fn()
    onEditMenu(open)
    const input = document.createElement('input')
    const area = document.createElement('textarea')
    document.body.append(input, area)
    expect(rightClick(input)).toBe(true)
    expect(rightClick(area)).toBe(true)
    expect(open).toHaveBeenCalledTimes(2)
    expect(open.mock.calls[0]?.[0]).toMatchObject({ field: input })
  })

  it('leaves alone a right-click an app menu already took', () => {
    const open = vi.fn()
    onEditMenu(open)
    const input = document.createElement('input')
    input.addEventListener('contextmenu', e => e.preventDefault())
    document.body.append(input)
    rightClick(input)
    expect(open).not.toHaveBeenCalled()
  })
})
