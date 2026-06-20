import { vi } from 'vitest'

export const map = vi.fn(() => ({
  setView: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  invalidateSize: vi.fn(),
}))

export const tileLayer = vi.fn(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
}))

export const marker = vi.fn(() => ({
  addTo: vi.fn(),
  bindPopup: vi.fn(),
  openPopup: vi.fn(),
  remove: vi.fn(),
  setLatLng: vi.fn(),
}))

export const icon = vi.fn(() => ({}))
export const latLng = vi.fn(() => ({ lat: 0, lng: 0 }))
export const circle = vi.fn(() => ({
  addTo: vi.fn(),
  setRadius: vi.fn(),
  remove: vi.fn(),
}))

export const polygon = vi.fn(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
}))

export const polyline = vi.fn(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
}))

export const GeoJSON = vi.fn(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
}))

export const control = {
  scale: vi.fn(() => ({ addTo: vi.fn() })),
  zoom: vi.fn(() => ({ addTo: vi.fn() })),
  layers: vi.fn(() => ({ addTo: vi.fn() })),
}

export default {
  map,
  tileLayer,
  marker,
  icon,
  latLng,
  circle,
  polygon,
  polyline,
  GeoJSON,
  control,
}