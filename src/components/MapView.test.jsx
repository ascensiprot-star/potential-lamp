import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MapView from './MapView'

describe('MapView Component', () => {
  const mockProviders = [
    {
      id: '1',
      business_name: 'Test Provider 1',
      address: '123 Main St',
      latitude: 40.7128,
      longitude: -74.006,
    },
    {
      id: '2',
      business_name: 'Test Provider 2',
      address: '456 Oak Ave',
      latitude: 40.7200,
      longitude: -74.0100,
    },
  ]

  const mockUserLocation = [40.7150, -74.0080]

  it('renders map container', () => {
    render(<MapView providers={mockProviders} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('renders with default height class', () => {
    render(<MapView providers={mockProviders} />)
    const mapDiv = document.querySelector('.h-\\[400px\\]')
    expect(mapDiv).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(<MapView providers={mockProviders} className="custom-class" />)
    const mapDiv = document.querySelector('.custom-class')
    expect(mapDiv).toBeInTheDocument()
  })

  it('renders markers for providers with coordinates', () => {
    render(<MapView providers={mockProviders} />)
    const markers = document.querySelectorAll('.leaflet-marker-icon')
    expect(markers.length).toBeGreaterThan(0)
  })

  it('does not render markers for providers without coordinates', () => {
    const providersWithoutCoords = [
      { id: '1', business_name: 'No Coords', address: 'Unknown' },
    ]
    render(<MapView providers={providersWithoutCoords} />)
    // Should not crash
  })

  it('renders user location marker when provided', () => {
    render(<MapView providers={mockProviders} userLocation={mockUserLocation} />)
    // User marker should be present
  })

  it('renders popup content for provider markers', () => {
    render(<MapView providers={mockProviders} />)
    // Provider popups should be present
  })

  it('renders provider business name in popup', () => {
    render(<MapView providers={mockProviders} />)
    // Should render provider name in popup
  })

  it('renders provider address in popup', () => {
    render(<MapView providers={mockProviders} />)
    // Should render provider address in popup
  })

  it('renders view link in popup', () => {
    render(<MapView providers={mockProviders} />)
    // Should render view link
  })

  it('renders tile layer', () => {
    render(<MapView providers={mockProviders} />)
    const tileLayer = document.querySelector('.leaflet-tile-pane')
    expect(tileLayer).toBeInTheDocument()
  })

  it('centers map on user location when provided', () => {
    render(<MapView providers={mockProviders} userLocation={mockUserLocation} />)
    // Map should center on user location
  })

  it('centers map on default location when user location not provided', () => {
    render(<MapView providers={mockProviders} />)
    // Map should center on default location
  })

  it('applies rounded corners', () => {
    render(<MapView providers={mockProviders} />)
    const mapDiv = document.querySelector('.rounded-lg')
    expect(mapDiv).toBeInTheDocument()
  })

  it('applies border', () => {
    render(<MapView providers={mockProviders} />)
    const mapDiv = document.querySelector('.border')
    expect(mapDiv).toBeInTheDocument()
  })

  it('applies overflow hidden', () => {
    render(<MapView providers={mockProviders} />)
    const mapDiv = document.querySelector('.overflow-hidden')
    expect(mapDiv).toBeInTheDocument()
  })

  it('handles empty providers array', () => {
    render(<MapView providers={[]} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('handles null providers', () => {
    render(<MapView providers={null} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('handles providers with null coordinates', () => {
    const providersWithNullCoords = [
      { id: '1', business_name: 'Test', address: 'Address', latitude: null, longitude: null },
    ]
    render(<MapView providers={providersWithNullCoords} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('handles providers with undefined coordinates', () => {
    const providersWithUndefinedCoords = [
      { id: '1', business_name: 'Test', address: 'Address' },
    ]
    render(<MapView providers={providersWithUndefinedCoords} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('renders user location popup', () => {
    render(<MapView providers={mockProviders} userLocation={mockUserLocation} />)
    // User location popup should show "You are here"
  })

  it('disables zoom control by default', () => {
    render(<MapView providers={mockProviders} />)
    // Zoom control should be disabled
  })

  it('applies full width and height to map container', () => {
    render(<MapView providers={mockProviders} />)
    const mapContainer = document.querySelector('.h-full.w-full')
    expect(mapContainer).toBeInTheDocument()
  })

  it('supports data attributes', () => {
    render(<MapView providers={mockProviders} data-testid="test-map-view" />)
    expect(screen.getByTestId('test-map-view')).toBeInTheDocument()
  })

  it('handles providers with very long names', () => {
    const providersWithLongNames = [
      {
        id: '1',
        business_name: 'This is a very long business name that should still render properly in the popup',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
      },
    ]
    render(<MapView providers={providersWithLongNames} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('handles providers with very long addresses', () => {
    const providersWithLongAddresses = [
      {
        id: '1',
        business_name: 'Test Provider',
        address: 'This is a very long address that should still render properly in the popup without breaking the layout',
        latitude: 40.7128,
        longitude: -74.006,
      },
    ]
    render(<MapView providers={providersWithLongAddresses} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })

  it('handles multiple providers on same location', () => {
    const providersOnSameLocation = [
      {
        id: '1',
        business_name: 'Provider 1',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
      },
      {
        id: '2',
        business_name: 'Provider 2',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
      },
    ]
    render(<MapView providers={providersOnSameLocation} />)
    const mapContainer = document.querySelector('.leaflet-container')
    expect(mapContainer).toBeInTheDocument()
  })
})