export interface Toast {
  id: number
  text: string
  /** Raid announcements shout louder than tutorial hints. */
  alert?: boolean
}
