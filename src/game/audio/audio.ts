import { wingTheme } from '../data/wings'
import type { WingId } from '../data/types'

/**
 * Audio, generated rather than downloaded.
 *
 * The brief calls for Howler plus per-wing stems. Stems do not exist yet, and a
 * PWA that must run with the radio off cannot fetch them later — so this is a
 * small WebAudio synth instead: a per-wing drone and a handful of short
 * one-shots, built from oscillators at runtime. Nothing to precache, nothing to
 * load, and it swaps out cleanly for real stems when there are any.
 *
 * Everything is lazy: no AudioContext exists until the player has interacted,
 * because browsers will not allow one before that anyway.
 */

export type Sfx = 'dig' | 'build' | 'hit' | 'alert' | 'win' | 'lose' | 'select'

/** Root note per wing, in Hz. Low, slow and unbothered. */
const WING_ROOT: Record<WingId, number> = {
  core: 55,
  punk: 61.7,
  metal: 49,
  shoegaze: 65.4,
  hiphop: 58.3,
  electronic: 73.4,
  folk: 69.3,
  finale: 51.9,
}

export class AudioBus {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private droneNodes: OscillatorNode[] = []
  private wing: WingId = 'core'
  enabled = true

  /** Called from a real user gesture; before that browsers refuse to start. */
  private ensure(): AudioContext | null {
    if (!this.enabled) return null
    if (typeof window === 'undefined') return null
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.5
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    if (!on) this.stopDrone()
    else if (this.wing) this.startDrone(this.wing)
  }

  /** Per-wing ambience: two detuned saws through a low filter, and a fifth. */
  startDrone(wing: WingId): void {
    this.wing = wing
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    this.stopDrone()

    const root = WING_ROOT[wing] ?? 55
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 4)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    // Brighter wings get a more open filter; metal and the finale stay murky.
    filter.frequency.value = wing === 'electronic' ? 900 : wing === 'shoegaze' ? 600 : 380
    filter.Q.value = 0.6

    for (const [ratio, detune] of [
      [1, -7],
      [1, 6],
      [1.5, 3],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = wing === 'electronic' ? 'sawtooth' : 'triangle'
      osc.frequency.value = root * ratio
      osc.detune.value = detune
      osc.connect(filter)
      osc.start()
      this.droneNodes.push(osc)
    }

    filter.connect(gain)
    gain.connect(this.master)
    this.droneGain = gain
  }

  stopDrone(): void {
    const ctx = this.ctx
    if (ctx && this.droneGain) {
      this.droneGain.gain.cancelScheduledValues(ctx.currentTime)
      this.droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    }
    const nodes = this.droneNodes
    this.droneNodes = []
    window.setTimeout(() => {
      for (const osc of nodes) {
        try {
          osc.stop()
          osc.disconnect()
        } catch {
          /* already stopped */
        }
      }
    }, 600)
    this.droneGain = null
  }

  /** Short one-shots. Deliberately blunt: this is a basement, not a cathedral. */
  play(sfx: Sfx): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const now = ctx.currentTime

    // type, start Hz, end Hz, seconds, gain
    const table: Record<Sfx, [OscillatorType, number, number, number, number]> = {
      dig: ['square', 90, 55, 0.09, 0.16],
      build: ['triangle', 320, 520, 0.16, 0.16],
      hit: ['square', 200, 70, 0.11, 0.2],
      alert: ['sawtooth', 440, 180, 0.5, 0.18],
      win: ['triangle', 330, 660, 0.7, 0.2],
      lose: ['sawtooth', 220, 70, 0.9, 0.2],
      select: ['sine', 620, 620, 0.05, 0.1],
    }
    const [type, from, to, secs, level] = table[sfx]

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + secs)
    gain.gain.setValueAtTime(level, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + secs)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + secs + 0.02)
  }

  destroy(): void {
    this.stopDrone()
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }

  /** Accent colour of the current wing, so the UI and the drone agree. */
  get themeName(): string {
    return wingTheme(this.wing).name
  }
}

export const audio = new AudioBus()
