/**
 * Diaspora Service — Feature #5
 *
 * Remote care-as-a-service for diaspora families.
 * Lets a user in Helsinki book and pay for services for their family
 * back home in Lahore — cross-border identity, not a cross-border app.
 */

// ─── Supported Cross-Border Markets ──────────────────────────────────────────

export const SUPPORTED_MARKETS = {
    PK: {
        name: 'Pakistan',
        currency: 'PKR',
        exchangeRateToUSD: 0.0036,
        supportedCities: ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan'],
        timezone: 'Asia/Karachi',
        languages: ['Urdu', 'English'],
    },
    FI: {
        name: 'Finland',
        currency: 'EUR',
        exchangeRateToUSD: 1.08,
        supportedCities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku'],
        timezone: 'Europe/Helsinki',
        languages: ['Finnish', 'Swedish', 'English'],
    },
};

// ─── Diaspora Booking ─────────────────────────────────────────────────────────

/**
 * Creates a diaspora (remote care) booking request.
 * The booker pays from their home country; the service is delivered
 * to a beneficiary in another country.
 */
export function createDiasporaBookingRequest({
    bookerEmail,
    bookerCountry,
    beneficiaryName,
    beneficiaryEmail,
    beneficiaryPhone,
    beneficiaryAddress,
    beneficiaryCity,
    beneficiaryCountry,
    serviceId,
    serviceName,
    providerId,
    providerName,
    requestedDate,
    requestedTimeSlot,
    notes,
    pricePKR,
    priceEUR,
}) {
    const bookerMarket = SUPPORTED_MARKETS[bookerCountry];
    const beneficiaryMarket = SUPPORTED_MARKETS[beneficiaryCountry];

    if (!bookerMarket || !beneficiaryMarket) {
        return {
            success: false,
            error: 'One or both countries are not yet supported for cross-border bookings.',
        };
    }

    const isCrossBorder = bookerCountry !== beneficiaryCountry;
    const servicePrice = beneficiaryCountry === 'PK' ? pricePKR : priceEUR;
    const paymentCurrency = bookerCountry === 'PK' ? 'PKR' : 'EUR';
    const serviceCurrency = beneficiaryCountry === 'PK' ? 'PKR' : 'EUR';

    const booking = {
        type: 'diaspora',
        isCrossBorder,
        booker: {
            email: bookerEmail,
            country: bookerCountry,
            market: bookerMarket.name,
            currency: paymentCurrency,
        },
        beneficiary: {
            name: beneficiaryName,
            email: beneficiaryEmail,
            phone: beneficiaryPhone,
            address: beneficiaryAddress,
            city: beneficiaryCity,
            country: beneficiaryCountry,
            market: beneficiaryMarket.name,
        },
        service: {
            id: serviceId,
            name: serviceName,
            providerId,
            providerName,
            price: servicePrice,
            currency: serviceCurrency,
            date: requestedDate,
            timeSlot: requestedTimeSlot,
        },
        notes,
        status: 'pending_confirmation',
        createdAt: new Date().toISOString(),
        metadata: {
            remindBookerOnDelivery: true,
            notifyBeneficiaryInLocal: beneficiaryMarket.languages[0],
            carePackageId: generateCarePackageId(bookerEmail, beneficiaryEmail),
        },
    };

    return { success: true, booking };
}

// ─── Diaspora Pattern Detection ───────────────────────────────────────────────

/**
 * Analyses booking history to identify diaspora patterns —
 * users booking from one country for delivery in another.
 * Returns potential diaspora users and their care package frequency.
 */
export function detectDiasporaPatterns(bookings) {
    const patterns = {};

    for (const b of bookings) {
        if (b.type !== 'diaspora' || !b.booker_email) continue;
        const key = b.booker_email;
        if (!patterns[key]) {
            patterns[key] = {
                bookerEmail: b.booker_email,
                bookerCountry: b.booker_country,
                beneficiaryCountries: new Set(),
                bookingCount: 0,
                totalSpent: 0,
                lastBooking: null,
                serviceTypes: new Set(),
            };
        }
        patterns[key].bookingCount++;
        patterns[key].totalSpent += b.price || 0;
        patterns[key].lastBooking = b.date;
        if (b.beneficiary_country) patterns[key].beneficiaryCountries.add(b.beneficiary_country);
        if (b.service_name) patterns[key].serviceTypes.add(b.service_name);
    }

    return Object.values(patterns).map(p => ({
        ...p,
        beneficiaryCountries: [...p.beneficiaryCountries],
        serviceTypes: [...p.serviceTypes],
        avgFrequencyDays: p.bookingCount > 1 ? Math.round(90 / p.bookingCount) : null,
    })).sort((a, b) => b.bookingCount - a.bookingCount);
}

// ─── Routing Helper ───────────────────────────────────────────────────────────

/**
 * Determines the routing, payment processing, and notification strategy
 * for a cross-border booking.
 */
export function computeDiasporaRouting(bookerCountry, beneficiaryCountry, servicePrice) {
    const bookerMarket = SUPPORTED_MARKETS[bookerCountry];
    const beneficiaryMarket = SUPPORTED_MARKETS[beneficiaryCountry];

    if (!bookerMarket || !beneficiaryMarket) {
        return { supported: false };
    }

    const isCrossBorder = bookerCountry !== beneficiaryCountry;
    const fxSpread = 0.02; // 2% FX spread if cross-border

    const usdAmount = servicePrice * (beneficiaryCountry === 'PK'
        ? SUPPORTED_MARKETS.PK.exchangeRateToUSD
        : SUPPORTED_MARKETS.FI.exchangeRateToUSD);

    const chargeInBookerCurrency = bookerCountry === 'PK'
        ? usdAmount / SUPPORTED_MARKETS.PK.exchangeRateToUSD
        : usdAmount / SUPPORTED_MARKETS.FI.exchangeRateToUSD;

    const fxFee = isCrossBorder ? Math.round(chargeInBookerCurrency * fxSpread * 100) / 100 : 0;

    return {
        supported: true,
        isCrossBorder,
        bookerMarket: bookerMarket.name,
        beneficiaryMarket: beneficiaryMarket.name,
        paymentCurrency: bookerMarket.currency,
        serviceCurrency: beneficiaryMarket.currency,
        chargeAmount: Math.round((chargeInBookerCurrency + fxFee) * 100) / 100,
        fxFee,
        providerSettlementCurrency: beneficiaryMarket.currency,
        providerSettlementAmount: servicePrice,
        estimatedSettlementHours: isCrossBorder ? 48 : 24,
        notificationLanguages: {
            booker: bookerMarket.languages[0],
            beneficiary: beneficiaryMarket.languages[0],
        },
    };
}

// ─── Care Package Builder ─────────────────────────────────────────────────────

/**
 * Bundles multiple services into a "care package" for a beneficiary —
 * e.g., "Monthly Care Package for Ammi" = cleaning + grocery + medical escort.
 */
export function buildCarePackage({ name, description, services, beneficiary, frequency }) {
    const totalPrice = services.reduce((s, svc) => s + (svc.price || 0), 0);
    const packageId = generateCarePackageId(beneficiary.email, name);

    return {
        id: packageId,
        name,
        description,
        beneficiary,
        services,
        frequency: frequency || 'monthly',
        totalPrice,
        currency: services[0]?.currency || 'PKR',
        status: 'draft',
        createdAt: new Date().toISOString(),
        nextDeliveryDate: computeNextDeliveryDate(frequency),
        estimatedAnnualCost: computeAnnualCost(totalPrice, frequency),
    };
}

function computeNextDeliveryDate(frequency) {
    const now = new Date();
    const next = new Date(now);
    if (frequency === 'weekly') next.setDate(now.getDate() + 7);
    else if (frequency === 'biweekly') next.setDate(now.getDate() + 14);
    else next.setMonth(now.getMonth() + 1);
    return next.toISOString().split('T')[0];
}

function computeAnnualCost(monthlyTotal, frequency) {
    const multipliers = { weekly: 52, biweekly: 26, monthly: 12 };
    return monthlyTotal * (multipliers[frequency] || 12);
}

function generateCarePackageId(bookerEmail, identifier) {
    const hash = btoa(`${bookerEmail}:${identifier}:${Date.now()}`).slice(0, 12).replace(/[+/=]/g, '');
    return `CP-${hash.toUpperCase()}`;
}

// ─── Diaspora Market Intelligence ─────────────────────────────────────────────

/**
 * Returns market-specific service recommendations for a beneficiary location.
 * Helps diaspora users understand what services are most needed/available.
 */
export function getDiasporaMarketInsights(beneficiaryCountry, providers, bookings) {
    const market = SUPPORTED_MARKETS[beneficiaryCountry];
    if (!market) return null;

    const marketProviders = providers.filter(p =>
        market.supportedCities.some(city =>
            p.city?.toLowerCase().includes(city.toLowerCase())
        )
    );

    const completedInMarket = bookings.filter(b =>
        b.status === 'completed' &&
        marketProviders.some(p => p.id === b.provider_id)
    );

    const popularServices = {};
    for (const b of completedInMarket) {
        const slug = b.category_slug || 'other';
        popularServices[slug] = (popularServices[slug] || 0) + 1;
    }

    const topServices = Object.entries(popularServices)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slug, count]) => ({ service: slug, bookings: count }));

    return {
        market: market.name,
        currency: market.currency,
        activeProviders: marketProviders.length,
        verifiedProviders: marketProviders.filter(p => p.verified).length,
        topServices,
        avgRating: marketProviders.length > 0
            ? Math.round((marketProviders.reduce((s, p) => s + (p.rating || 0), 0) / marketProviders.length) * 10) / 10
            : 0,
        supportedCities: market.supportedCities,
    };
}
