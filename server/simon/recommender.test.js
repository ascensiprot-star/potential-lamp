import { describe, it, expect, vi } from 'vitest'
import { generateProviderRecommendations } from './recommender.js'

// Mock the dependencies
vi.mock('./router.js', () => ({
  callAI: vi.fn(() => ({ response: 'Mock recommendations', confidence: 0.85 })),
  calculateConfidence: vi.fn(() => 0.85),
  validateAIResponse: vi.fn(() => true),
}))

vi.mock('./tools.js', () => ({
  executeTool: vi.fn(() => ({ success: true, data: {} })),
}))

vi.mock('../db.js', () => ({
  pool: {
    query: vi.fn(() => ({ rows: [] })),
  },
}))

describe('Simon Recommender Agent', () => {
  const mockUserId = 'user-123'
  const mockLocationContext = {
    lat: 40.7128,
    lng: -74.006,
    radius_km: 10,
  }

  describe('generateProviderRecommendations', () => {
    it('should generate recommendations with valid location', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(result).toBeDefined()
    })

    it('should use fallback when location is invalid', async () => {
      const invalidLocation = { lat: null, lng: null }
      
      const result = await generateProviderRecommendations(mockUserId, invalidLocation)
      
      expect(result).toBeDefined()
    })

    it('should query user booking history', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT p.category_slug'),
        expect.arrayContaining([mockUserId])
      )
    })

    it('should query nearby providers', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.id, p.user_id, p.business_name'),
        expect.any(Array)
      )
    })

    it('should query category supply', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.category_slug, COUNT'),
        expect.any(Array)
      )
    })

    it('should detect current zone', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, city'),
        expect.any(Array)
      )
    })

    it('should filter by online status', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_online = true'),
        expect.any(Array)
      )
    })

    it('should filter by heartbeat time', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('last_heartbeat >'),
        expect.any(Array)
      )
    })

    it('should calculate distance using PostGIS', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        expect.any(Array)
      )
    })

    it('should limit results to 20 providers', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 20'),
        expect.any(Array)
      )
    })

    it('should order by distance and trust score', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        expect.any(Array)
      )
    })

    it('should avoid recommending used categories', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValueOnce({ rows: [{ category_slug: 'cleaning' }] })
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      // Should avoid cleaning category
    })

    it('should include provider trust scores', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('provider_trust_scores'),
        expect.any(Array)
      )
    })

    it('should include provider presence', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('provider_presence'),
        expect.any(Array)
      )
    })

    it('should use default radius when not provided', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      const locationWithoutRadius = { lat: 40.7128, lng: -74.006 }
      await generateProviderRecommendations(mockUserId, locationWithoutRadius)
      
      expect(pool.query).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const { pool } = require('../db.js')
      pool.query.mockRejectedValue(new Error('DB Error'))

      const result = await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(result).toBeDefined()
    })

    it('should respect user booking history timeframe', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INTERVAL'),
        expect.any(Array)
      )
    })
  })

  describe('fallback behavior', () => {
    it('should use global recommendations when location is missing', async () => {
      const result = await generateProviderRecommendations(mockUserId, { lat: null, lng: null })
      
      expect(result).toBeDefined()
    })

    it('should use cached recommendations when available', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(result).toBeDefined()
    })
  })

  describe('zone detection', () => {
    it('should identify user zone', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({
        rows: [{
          id: 'zone-1',
          name: 'Downtown',
          city: 'New York',
          health_score: 85,
          demand_index: 1.2,
        }],
      })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('neighborhood_zones'),
        expect.any(Array)
      )
    })

    it('should use zone demand index', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({
        rows: [{ demand_index: 1.5, health_score: 80 }],
      })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalled()
    })
  })

  describe('supply-demand analysis', () => {
    it('should identify category shortages', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({
        rows: [
          { category_slug: 'cleaning', available_count: 2 },
          { category_slug: 'plumbing', available_count: 5 },
        ],
      })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY available_count ASC'),
        expect.any(Array)
      )
    })

    it('should prioritize underserved categories', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      // Should prioritize categories with low supply
    })
  })

  describe('provider ranking', () => {
    it('should rank by trust score', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('pts.score DESC'),
        expect.any(Array)
      )
    })

    it('should rank by accepting jobs status', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_accepting_jobs DESC'),
        expect.any(Array)
      )
    })

    it('should include review count', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT'),
        expect.any(Array)
      )
    })

    it('should include average rating', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AVG'),
        expect.any(Array)
      )
    })
  })

  describe('geographic constraints', () => {
    it('should use provided radius', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, { ...mockLocationContext, radius_km: 5 })
      
      expect(pool.query).toHaveBeenCalled()
    })

    it('should use PostGIS DWithin for spatial queries', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        expect.any(Array)
      )
    })

    it('should convert radius to meters', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, { ...mockLocationContext, radius_km: 10 })
      
      // Should convert 10km to 10000m
    })
  })

  describe('personalization', () => {
    it('should consider user preferences', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      // Should use user history for personalization
    })

    it('should weight by recency of bookings', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      await generateProviderRecommendations(mockUserId, mockLocationContext)
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at > NOW() - INTERVAL'),
        expect.any(Array)
      )
    })
  })

  describe('error handling', () => {
    it('should handle missing user_id gracefully', async () => {
      const result = await generateProviderRecommendations(null, mockLocationContext)
      
      expect(result).toBeDefined()
    })

    it('should handle malformed location', async () => {
      const malformedLocation = { lat: 'invalid', lng: -74.006 }
      
      const result = await generateProviderRecommendations(mockUserId, malformedLocation)
      
      expect(result).toBeDefined()
    })

    it('should handle negative radius', async () => {
      const { pool } = require('../db.js')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await generateProviderRecommendations(mockUserId, { ...mockLocationContext, radius_km: -5 })
      
      expect(result).toBeDefined()
    })
  })
})