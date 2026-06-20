/**
 * ServiceFlow Platform — Unified Export
 * 
 * This is the single entry point for all platform services.
 * Import from here to access any platform capability.
 * 
 * Architecture overview:
 * 
 *   ┌─────────────────────────────────────────────────────┐
 *   │                   Platform Layer                     │
 *   │                                                     │
 *   │  eventBus          → typed domain event system      │
 *   │  auditLogger       → immutable audit trail          │
 *   │  workflowEngine    → booking state machine          │
 *   │  automationEngine  → rule-based automation          │
 *   │  notificationService → in-app + email alerts        │
 *   │  invoiceService    → financial document lifecycle   │
 *   │  analyticsEngine   → metrics, forecasting, KPIs     │
 *   │  customerMemoryService → customer intelligence      │
 *   └─────────────────────────────────────────────────────┘
 * 
 * Domain Entities:
 *   Booking, Provider, Service, ServiceCategory, Review
 *   AuditLog, AutomationRule, Notification, Invoice
 *   CustomerMemory, WorkflowEvent, ProviderMetrics
 */

export { eventBus } from './eventBus';
export { auditLogger } from './auditLogger';
export { workflowEngine } from './workflowEngine';
export { automationEngine } from './automationEngine';
export { notificationService } from './notificationService';
export { invoiceService } from './invoiceService';
export { customerMemoryService } from './customerMemoryService';

// ─── Feature #1: Neighborhood OS Engine ───────────────────────────────────────
export {
    computeNeighborhoodTrustGraph,
    findNeighborhoodServiceGaps,
    computeZoneHealthScore,
    computeZoneSummary,
} from './neighborhoodOSEngine';

// ─── Feature #2: Portable Reputation Export ───────────────────────────────────
export {
    generateReputationCredential,
    generateCredentialURL,
    verifyCredentialFromURL,
    generateReputationSummary,
    compareCredentials,
} from './reputationExport';

// ─── Feature #4: Financial Engine (BNPL / Instant Payout / Savings) ──────────
export {
    computeBNPLEligibility,
    computeInstantPayoutEligibility,
    computeProviderSavingsRecommendation,
    computeProviderWalletSummary,
    computeCustomerSpendingIntelligence,
} from './financialEngine';

// ─── Feature #5: Diaspora / Cross-Border Service ─────────────────────────────
export {
    createDiasporaBookingRequest,
    detectDiasporaPatterns,
    computeDiasporaRouting,
    buildCarePackage,
    getDiasporaMarketInsights,
    SUPPORTED_MARKETS,
} from './diasporaService';

// ─── Feature #6: Community Trust Engine ──────────────────────────────────────
export {
    vouchForProvider,
    getProviderVouches,
    computeVouchWeight,
    computeCommunityTrustBoost,
    computeDisputeNeighborhoodVisibility,
    computeNeighborhoodVerificationStatus,
    getProviderCommunityEngagement,
    computeZoneDisputeHealth,
} from './communityTrustEngine';

export {
    computePlatformKPIs,
    computeMonthlyRevenue,
    computeBookingsByDayOfWeek,
    computeTopProviders,
    computeStatusDistribution,
    computeRevenueByCategory,
    computeCustomerRetention,
    forecastNextMonthRevenue,
    snapshotProviderMetrics,
} from './analyticsEngine';

export {
    isValidBookingTransition,
    bookingStatusToEvent,
    computeLoyaltyTier,
    computeRiskScore,
    generateInvoiceNumber,
    generateCorrelationId,
    BOOKING_TRANSITIONS,
} from './utils';