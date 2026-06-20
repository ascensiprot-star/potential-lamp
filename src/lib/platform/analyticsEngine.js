/**
 * ServiceFlow Analytics Engine
 * 
 * Pure computation functions over raw entity data.
 * No side effects. All functions are deterministic given the same inputs.
 * 
 * Designed to be called from dashboard components or background metric snapshotters.
 */


/**
 * Compute platform-wide KPIs from raw data.
 */
export function computePlatformKPIs({ bookings, providers, reviews }) {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

    const totalRevenue = completedBookings.reduce((s, b) => s + (b.price || 0), 0);
    const avgBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;
    const completionRate = bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0;
    const cancellationRate = bookings.length > 0 ? (cancelledBookings.length / bookings.length) * 100 : 0;
    const approvedProviders = providers.filter(p => p.status === 'approved').length;
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    return {
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        pendingBookings: pendingBookings.length,
        confirmedBookings: confirmedBookings.length,
        cancelledBookings: cancelledBookings.length,
        totalRevenue,
        avgBookingValue,
        completionRate,
        cancellationRate,
        totalProviders: providers.length,
        approvedProviders,
        pendingProviders: providers.filter(p => p.status === 'pending').length,
        totalReviews: reviews.length,
        avgRating,
    };
}

/**
 * Group bookings by month and compute monthly revenue trend.
 */
export function computeMonthlyRevenue(bookings) {
    const completed = bookings.filter(b => b.status === 'completed' && b.date);
    const map = {};
    for (const b of completed) {
        const month = b.date.slice(0, 7); // YYYY-MM
        if (!map[month]) map[month] = { month, revenue: 0, bookings: 0 };
        map[month].revenue += b.price || 0;
        map[month].bookings += 1;
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

/**
 * Compute bookings per day of week (0=Sun, 6=Sat).
 */
export function computeBookingsByDayOfWeek(bookings) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = Array(7).fill(0);
    for (const b of bookings) {
        if (b.date) {
            const dow = new Date(b.date).getDay();
            counts[dow]++;
        }
    }
    return days.map((label, i) => ({ day: label, bookings: counts[i] }));
}

/**
 * Compute top providers by revenue.
 */
export function computeTopProviders(bookings, providers, limit = 10) {
    const providerMap = Object.fromEntries(providers.map(p => [p.id, p]));
    const revenueByProvider = {};
    const bookingsByProvider = {};

    for (const b of bookings.filter(b => b.status === 'completed')) {
        revenueByProvider[b.provider_id] = (revenueByProvider[b.provider_id] || 0) + (b.price || 0);
        bookingsByProvider[b.provider_id] = (bookingsByProvider[b.provider_id] || 0) + 1;
    }

    return Object.entries(revenueByProvider)
        .map(([id, revenue]) => ({
            provider: providerMap[id],
            revenue,
            bookings: bookingsByProvider[id] || 0,
        }))
        .filter(x => x.provider)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
}

/**
 * Compute booking status distribution for pie chart.
 */
export function computeStatusDistribution(bookings) {
    const counts = {};
    for (const b of bookings) {
        counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/**
 * Compute revenue by service category.
 */
export function computeRevenueByCategory(bookings, services) {
    const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));
    const categoryRevenue = {};
    for (const b of bookings.filter(b => b.status === 'completed')) {
        const svc = serviceMap[b.service_id];
        const cat = svc?.category_slug || 'uncategorized';
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (b.price || 0);
    }
    return Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Compute customer retention — returning vs new customers per month.
 */
export function computeCustomerRetention(bookings) {
    const seen = new Set();
    const monthly = {};
    const sorted = [...bookings].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    for (const b of sorted) {
        if (!b.date || !b.customer_email) continue;
        const month = b.date.slice(0, 7);
        if (!monthly[month]) monthly[month] = { month, new: 0, returning: 0 };
        if (seen.has(b.customer_email)) {
            monthly[month].returning++;
        } else {
            monthly[month].new++;
            seen.add(b.customer_email);
        }
    }
    return Object.values(monthly).slice(-12);
}

/**
 * Forecast next month's revenue using simple linear regression on monthly data.
 */
export function forecastNextMonthRevenue(monthlyRevenue) {
    if (monthlyRevenue.length < 3) return null;
    const n = monthlyRevenue.length;
    const xs = monthlyRevenue.map((_, i) => i);
    const ys = monthlyRevenue.map(m => m.revenue);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const forecast = slope * n + intercept;
    return Math.max(0, Math.round(forecast));
}

/**
 * Snapshot provider metrics for the current month.
 * Call this periodically (e.g., on dashboard load) to keep ProviderMetrics up to date.
 */
export async function snapshotProviderMetrics(providerId) {
    const period = new Date().toISOString().slice(0, 7);
    const [bookings, reviews] = await Promise.all([
    ]);

    const thisMonth = bookings.filter(b => b.date?.startsWith(period));
    const completed = thisMonth.filter(b => b.status === 'completed');
    const cancelled = thisMonth.filter(b => b.status === 'cancelled');
    const noShow = thisMonth.filter(b => b.status === 'no_show');
    const revenue = completed.reduce((s, b) => s + (b.price || 0), 0);
    const allCustomers = new Set(bookings.map(b => b.customer_email));
    const thisMonthCustomers = new Set(thisMonth.map(b => b.customer_email));
    const newCustomers = [...thisMonthCustomers].filter(e => {
        const prior = bookings.filter(b => !b.date?.startsWith(period) && b.customer_email === e);
        return prior.length === 0;
    }).length;

    const metrics = {
        provider_id: providerId,
        period,
        total_bookings: thisMonth.length,
        completed_bookings: completed.length,
        cancelled_bookings: cancelled.length,
        no_show_bookings: noShow.length,
        total_revenue: revenue,
        average_booking_value: completed.length ? revenue / completed.length : 0,
        completion_rate: thisMonth.length ? completed.length / thisMonth.length : 0,
        cancellation_rate: thisMonth.length ? cancelled.length / thisMonth.length : 0,
        average_rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
        new_customers: newCustomers,
        returning_customers: thisMonthCustomers.size - newCustomers,
    };

    if (existing.length > 0) {
    }
}