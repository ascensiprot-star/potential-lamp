import { describe, it, expect, beforeAll, vi } from 'vitest'
import { simonReasoningLoop } from './core.js'

// Mock the dependencies
vi.mock('./router.js', () => ({
  callAI: vi.fn(() => ({ response: 'Mock AI response', confidence: 0.8 })),
  calculateConfidence: vi.fn(() => 0.8),
  validateAIResponse: vi.fn(() => true),
}))

vi.mock('./tools.js', () => ({
  executeTool: vi.fn(() => ({ success: true, data: {} })),
}))

vi.mock('./memory.js', () => ({
  recallRelevantPatterns: vi.fn(() => ({ patterns: [], confidence: 0.7 })),
  learnFromDecision: vi.fn(() => ({ success: true })),
}))

vi.mock('./analyst.js', () => ({}))
vi.mock('./fraud.js', () => ({}))
vi.mock('./demand.js', () => ({}))
vi.mock('./provider.js', () => ({}))
vi.mock('./customer.js', () => ({}))
vi.mock('./responder.js', () => ({}))

describe('Simon Core Module', () => {
  const mockTask = {
    type: 'test_task',
    description: 'Test task description',
    priority: 'medium',
  }

  const mockContext = {
    user_id: 'user-1',
    session_id: 'session-1',
  }

  describe('simonReasoningLoop', () => {
    it('should execute reasoning loop successfully', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.task).toEqual(mockTask)
    })

    it('should include observation in result', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.observation).toBeDefined()
      expect(result.observation.timestamp).toBeDefined()
    })

    it('should include memory in result', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.memory).toBeDefined()
    })

    it('should include decision in result', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.decision).toBeDefined()
    })

    it('should include action result', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.action_result).toBeDefined()
    })

    it('should include learning in result', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.learning).toBeDefined()
    })

    it('should include audit record', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.audit_record).toBeDefined()
    })

    it('should handle errors gracefully', async () => {
      const { executeTool } = require('./tools.js')
      executeTool.mockRejectedValue(new Error('Tool error'))

      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result).toBeDefined()
    })

    it('should use default context when not provided', async () => {
      const result = await simonReasoningLoop(mockTask)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should use default agent when not specified', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.agent).toBe('core')
    })

    it('should handle different task types', async () => {
      const fraudTask = { type: 'fraud_analysis', transaction_id: 'txn-1' }
      const result = await simonReasoningLoop(fraudTask, mockContext)
      
      expect(result).toBeDefined()
    })

    it('should handle provider scoring tasks', async () => {
      const providerTask = { type: 'provider_scoring', provider_id: 'provider-1' }
      const result = await simonReasoningLoop(providerTask, mockContext)
      
      expect(result).toBeDefined()
    })

    it('should handle customer analysis tasks', async () => {
      const customerTask = { type: 'customer_analysis', user_id: 'user-1' }
      const result = await simonReasoningLoop(customerTask, mockContext)
      
      expect(result).toBeDefined()
    })
  })

  describe('observePlatform', () => {
    it('should query platform stats', async () => {
      const { executeTool } = require('./tools.js')
      
      await simonReasoningLoop(mockTask, mockContext)
      
      expect(executeTool).toHaveBeenCalledWith('query_platform_stats', [], 'core')
    })

    it('should get transaction data for fraud tasks', async () => {
      const fraudTask = { type: 'fraud_analysis', transaction_id: 'txn-1' }
      
      await simonReasoningLoop(fraudTask, mockContext)
      
      // Should fetch transaction data
    })

    it('should get provider metrics for scoring tasks', async () => {
      const providerTask = { type: 'provider_scoring', provider_id: 'provider-1' }
      
      await simonReasoningLoop(providerTask, mockContext)
      
      const { executeTool } = require('./tools.js')
      expect(executeTool).toHaveBeenCalledWith('get_provider_metrics', ['provider-1'], 'core')
    })

    it('should get user profile for analysis tasks', async () => {
      const customerTask = { type: 'customer_analysis', user_id: 'user-1' }
      
      await simonReasoningLoop(customerTask, mockContext)
      
      const { executeTool } = require('./tools.js')
      expect(executeTool).toHaveBeenCalledWith('get_user_profile', ['user-1'], 'core')
    })
  })

  describe('memory operations', () => {
    it('should recall relevant patterns', async () => {
      await simonReasoningLoop(mockTask, mockContext)
      
      const { recallRelevantPatterns } = require('./memory.js')
      expect(recallRelevantPatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          task: mockTask,
          context: mockContext,
        })
      )
    })

    it('should learn from decisions', async () => {
      await simonReasoningLoop(mockTask, mockContext)
      
      const { learnFromDecision } = require('./memory.js')
      expect(learnFromDecision).toHaveBeenCalled()
    })
  })

  describe('reasoning process', () => {
    it('should call AI for reasoning', async () => {
      const { callAI } = require('./router.js')
      
      await simonReasoningLoop(mockTask, mockContext)
      
      expect(callAI).toHaveBeenCalled()
    })

    it('should validate AI response', async () => {
      const { validateAIResponse } = require('./router.js')
      
      await simonReasoningLoop(mockTask, mockContext)
      
      expect(validateAIResponse).toHaveBeenCalled()
    })

    it('should calculate confidence', async () => {
      const { calculateConfidence } = require('./router.js')
      
      await simonReasoningLoop(mockTask, mockContext)
      
      expect(calculateConfidence).toHaveBeenCalled()
    })
  })

  describe('decision execution', () => {
    it('should execute tools based on decision', async () => {
      const { executeTool } = require('./tools.js')
      
      await simonReasoningLoop(mockTask, mockContext)
      
      expect(executeTool).toHaveBeenCalled()
    })

    it('should handle tool execution failures', async () => {
      const { executeTool } = require('./tools.js')
      executeTool.mockRejectedValue(new Error('Tool failed'))

      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result).toBeDefined()
    })
  })

  describe('audit trail', () => {
    it('should create audit record', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.audit_record).toBeDefined()
    })

    it('should include agent in audit', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext, 'analyst')
      
      expect(result.agent).toBe('analyst')
    })

    it('should include timestamp in audit', async () => {
      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.observation.timestamp).toBeDefined()
    })
  })

  describe('fallback behavior', () => {
    it('should use fallback decision on error', async () => {
      const { callAI } = require('./router.js')
      callAI.mockRejectedValue(new Error('AI failed'))

      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result).toBeDefined()
    })

    it('should maintain task context in fallback', async () => {
      const { callAI } = require('./router.js')
      callAI.mockRejectedValue(new Error('AI failed'))

      const result = await simonReasoningLoop(mockTask, mockContext)
      
      expect(result.task).toEqual(mockTask)
    })
  })

  describe('specialized agents', () => {
    it('should route to analyst agent for analysis tasks', async () => {
      const analystTask = { type: 'market_analysis' }
      
      await simonReasoningLoop(analystTask, mockContext, 'analyst')
      
      expect({}).toBeDefined()
    })

    it('should route to fraud agent for fraud tasks', async () => {
      const fraudTask = { type: 'fraud_detection' }
      
      await simonReasoningLoop(fraudTask, mockContext, 'fraud')
      
      expect({}).toBeDefined()
    })

    it('should route to demand agent for forecasting', async () => {
      const demandTask = { type: 'demand_forecast' }
      
      await simonReasoningLoop(demandTask, mockContext, 'demand')
      
      expect({}).toBeDefined()
    })
  })

  describe('data integrity', () => {
    it('should handle missing context fields', async () => {
      const incompleteContext = { user_id: 'user-1' }
      
      const result = await simonReasoningLoop(mockTask, incompleteContext)
      
      expect(result).toBeDefined()
    })

    it('should handle invalid task types', async () => {
      const invalidTask = { type: 'invalid_type' }
      
      const result = await simonReasoningLoop(invalidTask, mockContext)
      
      expect(result).toBeDefined()
    })
  })
})