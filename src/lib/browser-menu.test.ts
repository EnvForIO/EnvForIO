import { beforeAll, describe, expect, it } from 'vitest'
import { disableBrowserMenu } from './browser-menu'

function rightClick(el: Element): boolean {
  const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  el.dispatchEvent(e)
  return e.defaultPrevented
}

describe('browser menu', () => {
  beforeAll(() => disableBrowserMenu())

  it('is turned off on ordinary page content', () => {
    const div = document.createElement('div')
    document.body.append(div)
    expect(rightClick(div)).toBe(true)
  })

  it('stays in text fields for cut, copy and paste', () => {
    const input = document.createElement('input')
    const area = document.createElement('textarea')
    document.body.append(input, area)
    expect(rightClick(input)).toBe(false)
    expect(rightClick(area)).toBe(false)
  })
})
