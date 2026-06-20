import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProviderCard from './ProviderCard'

describe('ProviderCard Component', () => {
  const mockProvider = {
    id: '1',
    business_name: 'Clean Pro Services',
    cover_image: 'https://example.com/image.jpg',
    verified: true,
    is_online: true,
    last_heartbeat: '2024-01-15T10:00:00Z',
    avg_rating: 4.5,
    review_count: 120,
    city: 'New York',
    address: '123 Main St, New York, NY',
    trust_score: 85,
  }

  it('renders provider business name', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('Clean Pro Services')).toBeInTheDocument()
  })

  it('renders cover image when provided', () => {
    render(<ProviderCard provider={mockProvider} />)
    const image = screen.getByAltText('')
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('renders fallback with first letter when no cover image', () => {
    const providerWithoutImage = { ...mockProvider, cover_image: null }
    render(<ProviderCard provider={providerWithoutImage} />)
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders online status indicator', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders offline status indicator', () => {
    const offlineProvider = { ...mockProvider, is_online: false }
    render(<ProviderCard provider={offlineProvider} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('renders verified badge', () => {
    render(<ProviderCard provider={mockProvider} />)
    const verifiedIcon = document.querySelector('.lucide-check-circle')
    expect(verifiedIcon).toBeInTheDocument()
  })

  it('does not render verified badge when not verified', () => {
    const unverifiedProvider = { ...mockProvider, verified: false }
    render(<ProviderCard provider={unverifiedProvider} />)
    const verifiedIcon = document.querySelector('.lucide-check-circle')
    expect(verifiedIcon).not.toBeInTheDocument()
  })

  it('renders distance badge when distance is provided', () => {
    render(<ProviderCard provider={mockProvider} distance={5.5} />)
    expect(screen.getByText('📍 5.5 km away')).toBeInTheDocument()
  })

  it('does not render distance badge when distance is null', () => {
    render(<ProviderCard provider={mockProvider} distance={null} />)
    expect(screen.queryByText(/km away/)).not.toBeInTheDocument()
  })

  it('does not render distance badge when distance is 9999+', () => {
    render(<ProviderCard provider={mockProvider} distance={10000} />)
    expect(screen.queryByText(/km away/)).not.toBeInTheDocument()
  })

  it('renders rating when avg_rating > 0', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('renders review count', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('(120)')).toBeInTheDocument()
  })

  it('renders no reviews message when avg_rating is 0', () => {
    const noReviewsProvider = { ...mockProvider, avg_rating: 0 }
    render(<ProviderCard provider={noReviewsProvider} />)
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
  })

  it('renders estimated response time when distance is provided', () => {
    render(<ProviderCard provider={mockProvider} distance={10} />)
    expect(screen.getByText('~20 min response')).toBeInTheDocument()
  })

  it('calculates response time correctly', () => {
    render(<ProviderCard provider={mockProvider} distance={5} />)
    expect(screen.getByText('~10 min response')).toBeInTheDocument()
  })

  it('renders location city', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('New York')).toBeInTheDocument()
  })

  it('renders location address when city is not available', () => {
    const providerWithoutCity = { ...mockProvider, city: null }
    render(<ProviderCard provider={providerWithoutCity} />)
    expect(screen.getByText('123 Main St, New York, NY')).toBeInTheDocument()
  })

  it('renders fallback location when neither city nor address available', () => {
    const providerWithoutLocation = { ...mockProvider, city: null, address: null }
    render(<ProviderCard provider={providerWithoutLocation} />)
    expect(screen.getByText('Location not specified')).toBeInTheDocument()
  })

  it('renders trust score badge', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('85% trusted')).toBeInTheDocument()
  })

  it('applies emerald color for trust score >= 80', () => {
    render(<ProviderCard provider={mockProvider} />)
    const trustBadge = screen.getByText('85% trusted')
    expect(trustBadge).toHaveClass('bg-emerald-100', 'text-emerald-700')
  })

  it('applies blue color for trust score >= 60', () => {
    const providerWith60Trust = { ...mockProvider, trust_score: 65 }
    render(<ProviderCard provider={providerWith60Trust} />)
    const trustBadge = screen.getByText('65% trusted')
    expect(trustBadge).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('applies yellow color for trust score >= 40', () => {
    const providerWith40Trust = { ...mockProvider, trust_score: 45 }
    render(<ProviderCard provider={providerWith40Trust} />)
    const trustBadge = screen.getByText('45% trusted')
    expect(trustBadge).toHaveClass('bg-yellow-100', 'text-yellow-700')
  })

  it('applies red color for trust score < 40', () => {
    const providerWithLowTrust = { ...mockProvider, trust_score: 35 }
    render(<ProviderCard provider={providerWithLowTrust} />)
    const trustBadge = screen.getByText('35% trusted')
    expect(trustBadge).toHaveClass('bg-red-100', 'text-red-700')
  })

  it('does not render trust score when 0', () => {
    const providerWithNoTrust = { ...mockProvider, trust_score: 0 }
    render(<ProviderCard provider={providerWithNoTrust} />)
    expect(screen.queryByText('% trusted')).not.toBeInTheDocument()
  })

  it('renders as link to provider page', () => {
    render(<ProviderCard provider={mockProvider} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/providers/1')
  })

  it('applies correct base classes', () => {
    render(<ProviderCard provider={mockProvider} />)
    const link = screen.getByRole('link')
    expect(link).toHaveClass('group', 'card-premium', 'block', 'overflow-hidden')
  })

  it('renders star icon for rating', () => {
    render(<ProviderCard provider={mockProvider} />)
    const starIcon = document.querySelector('.lucide-star')
    expect(starIcon).toBeInTheDocument()
  })

  it('renders wifi icon for online status', () => {
    render(<ProviderCard provider={mockProvider} />)
    const wifiIcon = document.querySelector('.lucide-wifi')
    expect(wifiIcon).toBeInTheDocument()
  })

  it('renders wifi off icon for offline status', () => {
    const offlineProvider = { ...mockProvider, is_online: false }
    render(<ProviderCard provider={offlineProvider} />)
    const wifiOffIcon = document.querySelector('.lucide-wifi-off')
    expect(wifiOffIcon).toBeInTheDocument()
  })

  it('renders clock icon for response time', () => {
    render(<ProviderCard provider={mockProvider} distance={10} />)
    const clockIcon = document.querySelector('.lucide-clock')
    expect(clockIcon).toBeInTheDocument()
  })

  it('renders map pin icon for location', () => {
    render(<ProviderCard provider={mockProvider} />)
    const mapPinIcon = document.querySelector('.lucide-map-pin')
    expect(mapPinIcon).toBeInTheDocument()
  })

  it('applies hover effect to image', () => {
    render(<ProviderCard provider={mockProvider} />)
    const image = screen.getByAltText('')
    expect(image).toHaveClass('group-hover:scale-105')
  })

  it('applies hover effect to business name', () => {
    render(<ProviderCard provider={mockProvider} />)
    const businessName = screen.getByText('Clean Pro Services')
    expect(businessName).toHaveClass('group-hover:text-black')
  })

  it('handles very long business names', () => {
    const longNameProvider = {
      ...mockProvider,
      business_name: 'This is a very long business name that should still render properly within the card component',
    }
    render(<ProviderCard provider={longNameProvider} />)
    expect(screen.getByText('This is a very long business name that should still render properly within the card component')).toBeInTheDocument()
  })

  it('handles provider without last_heartbeat', () => {
    const providerWithoutHeartbeat = { ...mockProvider, last_heartbeat: null }
    render(<ProviderCard provider={providerWithoutHeartbeat} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('handles decimal distance values', () => {
    render(<ProviderCard provider={mockProvider} distance={3.756} />)
    expect(screen.getByText('📍 3.8 km away')).toBeInTheDocument()
  })

  it('handles distance of 0', () => {
    render(<ProviderCard provider={mockProvider} distance={0} />)
    expect(screen.getByText('📍 0.0 km away')).toBeInTheDocument()
  })

  it('formats rating to one decimal place', () => {
    const providerWithDecimalRating = { ...mockProvider, avg_rating: 4.567 }
    render(<ProviderCard provider={providerWithDecimalRating} />)
    expect(screen.getByText('4.6')).toBeInTheDocument()
  })

  it('handles review count of 0', () => {
    const providerWithNoReviews = { ...mockProvider, review_count: 0, avg_rating: 4.5 }
    render(<ProviderCard provider={providerWithNoReviews} />)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('handles null review count', () => {
    const providerWithNullReviews = { ...mockProvider, review_count: null, avg_rating: 4.5 }
    render(<ProviderCard provider={providerWithNullReviews} />)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('applies glass effect to status indicator', () => {
    render(<ProviderCard provider={mockProvider} />)
    const statusIndicator = screen.getByText('Online').parentElement
    expect(statusIndicator).toHaveClass('glass')
  })

  it('applies glass effect to verified badge', () => {
    render(<ProviderCard provider={mockProvider} />)
    const verifiedBadge = document.querySelector('.lucide-check-circle').parentElement
    expect(verifiedBadge).toHaveClass('glass')
  })

  it('applies glass effect to distance badge', () => {
    render(<ProviderCard provider={mockProvider} distance={5} />)
    const distanceBadge = screen.getByText('📍 5.0 km away').parentElement
    expect(distanceBadge).toHaveClass('glass')
  })

  it('supports data attributes', () => {
    render(<ProviderCard provider={mockProvider} data-testid="test-provider-card" />)
    expect(screen.getByTestId('test-provider-card')).toBeInTheDocument()
  })

  it('renders with very high trust score', () => {
    const providerWithHighTrust = { ...mockProvider, trust_score: 95 }
    render(<ProviderCard provider={providerWithHighTrust} />)
    expect(screen.getByText('95% trusted')).toBeInTheDocument()
  })

  it('renders with very low trust score', () => {
    const providerWithLowTrust = { ...mockProvider, trust_score: 15 }
    render(<ProviderCard provider={providerWithLowTrust} />)
    expect(screen.getByText('15% trusted')).toBeInTheDocument()
  })
})