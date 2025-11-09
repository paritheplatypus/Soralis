// src/data/orbits.ts
export type Orbit = { periodDays: number; radius: number; tilt?: number }

export const ORBITS: Record<string, Orbit> = {
  mercury: { periodDays: 88,    radius: 8  },
  venus:   { periodDays: 225,   radius: 11 },
  earth:   { periodDays: 365,   radius: 14, tilt: 0.41 }, // tilt optional
  moon:    { periodDays: 27.3,  radius: 1.2 },
  mars:    { periodDays: 687,   radius: 17 },
  jupiter: { periodDays: 4333,  radius: 24 },
  saturn:  { periodDays: 10759, radius: 31 },
  uranus:  { periodDays: 30687, radius: 38 },
  neptune: { periodDays: 60190, radius: 44 },
}