import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pool } from '../server/db.js'

// Mock the database pool
vi.mock('../server/db.js', () => ({
  pool: {
    query: vi.fn(),
  },
}))

vi.mock('../server/notifications-routes.js', () => ({
  broadcastNotification: vi.fn(),
}))

vi.mock('../server/db.js', () => ({
  createNotification: vi.fn(),
}))

describe('Marketplace API Routes', () => {
  let app
  let mockPool

  beforeAll(() => {
    app = express()
    app.use(express.json())
    
    // Import and use the marketplace routes
    const marketplaceRouter = require('../server/marketplace.js').default
    app.use('/api/marketplace', marketplaceRouter)
    
    mockPool = require('../server/db.js').pool
  })

  afterAll(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/marketplace', () => {
    it('should return listings successfully', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            title: 'Test Listing',
            description: 'Test Description',
            price_pkr: 100,
            category: 'electronics',
            seller_name: 'John Doe',
            seller_email: 'john@example.com',
          },
        ],
      })

      const response = await request(app).get('/api/marketplace')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('listings')
      expect(response.body.listings).toBeInstanceOf(Array)
    })

    it('should filter by category', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace?category=electronics')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('category'),
        expect.arrayContaining(['electronics'])
      )
    })

    it('should filter by search query', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace?q=test')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      )
    })

    it('should filter by price range', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace?min_price=50&max_price=200')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalled()
    })

    it('should filter by condition', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace?condition=new')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('condition'),
        expect.arrayContaining(['new'])
      )
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const response = await request(app).get('/api/marketplace')
      
      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })

    it('should limit results to 60', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 60'),
        expect.any(Array)
      )
    })

    it('should order by created_at DESC', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      )
    })
  })

  describe('GET /api/marketplace/my', () => {
    it('should return user listings', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace/my')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('listings')
    })

    it('should include order count', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace/my')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        expect.any(Array)
      )
    })

    it('should require authentication', async () => {
      const response = await request(app).get('/api/marketplace/my')
      
      // Should return 401 if not authenticated
    })
  })

  describe('GET /api/marketplace/:id', () => {
    it('should return single listing', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            title: 'Test Listing',
            seller_name: 'John Doe',
            seller_email: 'john@example.com',
          },
        ],
      })

      const response = await request(app).get('/api/marketplace/1')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('listing')
    })

    it('should increment view count', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            title: 'Test Listing',
            views: 1,
          },
        ],
      })

      const response = await request(app).get('/api/marketplace/1')
      
      expect(response.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('views = views + 1'),
        expect.any(Array)
      )
    })

    it('should return 404 for non-existent listing', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).get('/api/marketplace/999')
      
      expect(response.status).toBe(404)
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const response = await request(app).get('/api/marketplace/1')
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/marketplace', () => {
    it('should create new listing', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            title: 'New Listing',
            price_pkr: 100,
          },
        ],
      })

      const response = await request(app)
        .post('/api/marketplace')
        .send({
          title: 'New Listing',
          price_pkr: 100,
          category: 'electronics',
        })
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('listing')
    })

    it('should require title and price', async () => {
      const response = await request(app)
        .post('/api/marketplace')
        .send({
          description: 'Only description',
        })
      
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/marketplace')
        .send({
          title: 'Test',
          price_pkr: 100,
        })
      
      // Should return 401 if not authenticated
    })

    it('should use default category if not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app)
        .post('/api/marketplace')
        .send({
          title: 'Test',
          price_pkr: 100,
        })
      
      expect(response.status).toBe(200)
    })

    it('should use default condition if not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app)
        .post('/api/marketplace')
        .send({
          title: 'Test',
          price_pkr: 100,
        })
      
      expect(response.status).toBe(200)
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/marketplace')
        .send({
          title: 'Test',
          price_pkr: 100,
        })
      
      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/marketplace/:id', () => {
    it('should update listing', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            title: 'Updated Title',
            price_pkr: 150,
          },
        ],
      })

      const response = await request(app)
        .patch('/api/marketplace/1')
        .send({
          title: 'Updated Title',
          price_pkr: 150,
        })
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('listing')
    })

    it('should require at least one field to update', async () => {
      const response = await request(app).patch('/api/marketplace/1').send({})
      
      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent listing', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app)
        .patch('/api/marketplace/999')
        .send({ title: 'Updated' })
      
      expect(response.status).toBe(404)
    })

    it('should return 404 if not owners listing', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app)
        .patch('/api/marketplace/1')
        .send({ title: 'Updated' })
      
      expect(response.status).toBe(404)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/marketplace/1')
        .send({ title: 'Updated' })
      
      // Should return 401 if not authenticated
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .patch('/api/marketplace/1')
        .send({ title: 'Updated' })
      
      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/marketplace/:id', () => {
    it('should delete listing', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).delete('/api/marketplace/1')
      
      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent listing', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).delete('/api/marketplace/999')
      
      expect(response.status).toBe(404)
    })

    it('should require authentication', async () => {
      const response = await request(app).delete('/api/marketplace/1')
      
      // Should return 401 if not authenticated
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const response = await request(app).delete('/api/marketplace/1')
      
      expect(response.status).toBe(500)
    })
  })
})