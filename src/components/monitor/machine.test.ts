import { describe, expect, it } from 'vitest'
import type { GpuSample, Sample } from '@/lib/tauri-bindings'
import { heat } from './format'
import { gpuSummary, hottest, status, targetId } from './machine'

const gpu = (name: string, usage: number, temperature: number): GpuSample => ({
  index: 0,
  name,
  usage,
  memoryUsed: 1,
  memoryTotal: 10,
  temperature,
  powerWatts: null,
  powerLimitWatts: null,
  fanPercent: null,
  clockMhz: null,
})

const sample = (cpu: number, gpus: GpuSample[]): Sample => ({
  atMs: 1,
  cpu: { usage: cpu, cores: [], frequencyMhz: 0 },
  memory: { used: 1, total: 10, swapUsed: 0, swapTotal: 0 },
  gpus,
  disk: { read: 0, written: 0 },
  drives: [],
  error: null,
})

describe('monitor machine facts', () => {
  it('status is the worst reading, or why there is none', () => {
    expect(status(undefined, undefined)).toBe('connecting')
    expect(status(sample(10, []), 'Permission denied')).toBe('unreachable')
    expect(status(sample(10, [gpu('A', 20, 50)]), undefined)).toBe('normal')
    expect(status(sample(10, [gpu('A', 75, 50)]), undefined)).toBe('busy')
    expect(status(sample(10, [gpu('A', 20, 86)]), undefined)).toBe('attention')
  })

  it('summarises GPUs by model and finds the hottest', () => {
    const s = sample(0, [
      gpu('NVIDIA A100-SXM4-80GB', 0, 40),
      gpu('NVIDIA A100-SXM4-80GB', 0, 61),
      gpu('NVIDIA GeForce RTX 3090', 0, 55),
    ])
    expect(gpuSummary(s.gpus)).toBe('2 × A100-SXM4-80GB + RTX 3090')
    expect(hottest(s)).toBe(61)
    expect(hottest(sample(0, []))).toBeNull()
  })

  it('ids and heat colours', () => {
    expect(targetId({ kind: 'ssh', host: 'gpu1' })).toBe('ssh:gpu1')
    expect(heat(0)).toBe('rgb(232, 246, 236)')
    expect(heat(100)).toBe('rgb(255, 59, 48)')
    expect(heat(150)).toBe(heat(100))
  })
})
