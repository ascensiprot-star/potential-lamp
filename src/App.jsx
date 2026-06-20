import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SimonProvider } from '@/lib/SimonContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { AuthModalProvider } from '@/lib/AuthModalContext';
import AuthModal from '@/components/AuthModal';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SplashScreen from './components/SplashScreen';
import IntroFlow from './components/IntroFlow';
import CustomerLayout from './components/CustomerLayout';
import ProviderLayout from './components/ProviderLayout';
import AdminLayout from './components/AdminLayout';
import AdminGuard from './components/AdminGuard';
import Home from './pages/Home';
import Services from './pages/Services';
import NearbyProviders from './pages/NearbyProviders';
import ProviderDetail from './pages/ProviderDetail';
import BookService from './pages/BookService';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerProfile from './pages/CustomerProfile';
import ProviderDashboardPage from './pages/provider/Dashboard';
import ManageServices from './pages/provider/ManageServices';
import ProviderBookings from './pages/provider/Bookings';
import ProviderAvailability from './pages/provider/Availability';
import ProviderEarnings from './pages/provider/Earnings';
import ProviderProfile from './pages/provider/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import UsersAdmin from './pages/admin/UsersAdmin';
import ProvidersAdmin from './pages/admin/ProvidersAdmin';
import BookingsAdmin from './pages/admin/BookingsAdmin';
import ServicesAdmin from './pages/admin/ServicesAdmin';
import Analytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';
import Reports from './pages/admin/Reports';
import AIControl from './pages/admin/AIControl';
import PlatformConfig from './pages/admin/PlatformConfig';
import CategoryProviders from './pages/CategoryProviders';
import OwnerAdmin from './pages/OwnerAdmin';
import NotificationCenter from './pages/NotificationCenter';
import ServiceVariants from './pages/provider/ServiceVariants';
import NeighborhoodDashboard from './pages/NeighborhoodDashboard';
import ServiceBundles from './pages/ServiceBundles';
import AIAssistant from './pages/AIAssistant';
import SmartRecommendations from './pages/SmartRecommendations';
import ProviderCopilot from './pages/provider/ProviderCopilot';
import AIInsights from './pages/provider/AIInsights';
import CustomerInsights from './pages/provider/CustomerInsights';
import WishlistFavorites from './pages/customer/WishlistFavorites';
import SpendingAnalytics from './pages/customer/SpendingAnalytics';
import Chat from './pages/Chat';
import LoyaltyProgram from './pages/customer/LoyaltyProgram';
import ReferralProgram from './pages/customer/ReferralProgram';
import BookingHistory from './pages/customer/BookingHistory';
import SavedAddresses from './pages/customer/SavedAddresses';
import ServiceHistory from './pages/customer/ServiceHistory';
import ProviderReviews from './pages/customer/ProviderReviews';
import HelpCenter from './pages/customer/HelpCenter';
import SupportTickets from './pages/customer/SupportTickets';
import NotificationSettings from './pages/customer/NotificationSettings';
import PaymentMethods from './pages/customer/PaymentMethods';
import PrivacySettings from './pages/customer/PrivacySettings';
import TrackService from './pages/customer/TrackService';
import Invoices from './pages/customer/Invoices';
import RecurringServices from './pages/customer/RecurringServices';
import EmergencyServices from './pages/customer/EmergencyServices';
import GiftCards from './pages/customer/GiftCards';
import FinancialDashboard from './pages/admin/FinancialDashboard';
import CustomerManagement from './pages/admin/CustomerManagement';
import InvoiceManagement from './pages/admin/InvoiceManagement';
import ReviewModeration from './pages/admin/ReviewModeration';
import AdminNotificationCenter from './pages/admin/NotificationCenter';
import AuditLogs from './pages/admin/AuditLogs';
import CategoryManagement from './pages/admin/CategoryManagement';
import ProviderPayouts from './pages/admin/ProviderPayouts';
import SystemHealth from './pages/admin/SystemHealth';
import ContentManagement from './pages/admin/ContentManagement';
import Events from './pages/Events';
import Transport from './pages/Transport';
import Community from './pages/Community';
import EmergencyRequest from './pages/neighborhood/EmergencyRequest';
import GroupBuy from './pages/neighborhood/GroupBuy';
import SkillSwap from './pages/neighborhood/SkillSwap';
import Jury from './pages/neighborhood/Jury';
import TrustPassport from './pages/TrustPassport';
import LabView from './pages/admin/LabView';
import SimonOversight from './pages/admin/SimonOversight';
import EconomicIdentity from './pages/EconomicIdentity';
import ZoneEconomy from './pages/ZoneEconomy';
import CareBridge from './pages/CareBridge';
import Wallet from './pages/Wallet';
import Marketplace from './pages/Marketplace';
import Committee from './pages/Committee';


const AuthenticatedApp = () => {
    const { isLoadingAuth, authError, user } = useAuth();
    const location = useLocation();

    if (isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg)' }}>
                <div className="text-center">
                    <div className="h-10 w-10 rounded-full animate-spin mx-auto mb-4"
                        style={{ border: '2px solid var(--color-border-strong)', borderTopColor: 'var(--color-primary)' }} />
                    <p className="text-xs tracking-widest uppercase"
                        style={{ color: 'var(--color-text-subtle)' }}>
                        Loading Truvornex
                    </p>
                </div>
            </div>
        );
    }

    if (authError && authError.type === 'user_not_registered') {
        return <UserNotRegisteredError />;
    }

    return (
        <Routes>
            <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/nearby" element={<NearbyProviders />} />
                <Route path="/providers/:providerId" element={<ProviderDetail />} />
                <Route path="/book/:providerId/:serviceId" element={<BookService />} />
                <Route path="/category/:slug" element={<CategoryProviders />} />
                <Route path="/dashboard" element={<CustomerDashboard />} />
                <Route path="/profile" element={<CustomerProfile />} />
                <Route path="/notifications" element={<NotificationCenter />} />
                <Route path="/neighborhood" element={<NeighborhoodDashboard />} />
                <Route path="/neighborhood/emergency" element={<EmergencyRequest />} />
                <Route path="/neighborhood/group-buy" element={<GroupBuy />} />
                <Route path="/neighborhood/skill-swap" element={<SkillSwap />} />
                <Route path="/neighborhood/jury" element={<Jury />} />
                <Route path="/bundles" element={<ServiceBundles />} />
                <Route path="/ai" element={<AIAssistant />} />
                <Route path="/recommendations" element={<SmartRecommendations />} />
                <Route path="/favorites" element={<WishlistFavorites />} />
                <Route path="/spending" element={<SpendingAnalytics />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/loyalty" element={<LoyaltyProgram />} />
                <Route path="/referral" element={<ReferralProgram />} />
                <Route path="/booking-history" element={<BookingHistory />} />
                <Route path="/saved-addresses" element={<SavedAddresses />} />
                <Route path="/service-history" element={<ServiceHistory />} />
                <Route path="/reviews" element={<ProviderReviews />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/support" element={<SupportTickets />} />
                <Route path="/notification-settings" element={<NotificationSettings />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/privacy" element={<PrivacySettings />} />
                <Route path="/track" element={<TrackService />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/recurring" element={<RecurringServices />} />
                <Route path="/emergency" element={<EmergencyServices />} />
                <Route path="/gift-cards" element={<GiftCards />} />
                <Route path="/events" element={<Events />} />
                <Route path="/transport" element={<Transport />} />
                <Route path="/community" element={<Community />} />
                <Route path="/care-bridge" element={<CareBridge />} />
                <Route path="/zone-economy" element={<ZoneEconomy />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/committee" element={<Committee />} />
            </Route>
            <Route element={<ProviderLayout />}>
                <Route path="/provider/identity" element={<EconomicIdentity />} />
                <Route path="/provider" element={<ProviderDashboardPage />} />
                <Route path="/provider/services" element={<ManageServices />} />
                <Route path="/provider/bookings" element={<ProviderBookings />} />
                <Route path="/provider/availability" element={<ProviderAvailability />} />
                <Route path="/provider/earnings" element={<ProviderEarnings />} />
                <Route path="/provider/services/:serviceId/variants" element={<ServiceVariants />} />
                <Route path="/provider/profile" element={<ProviderProfile />} />
                <Route path="/provider/copilot" element={<ProviderCopilot />} />
                <Route path="/provider/ai-insights" element={<AIInsights />} />
                <Route path="/provider/customers" element={<CustomerInsights />} />
                <Route path="/provider/chat" element={<Chat />} />
            </Route>
            <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin" element={<AdminDashboard />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/users" element={<UsersAdmin />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/providers" element={<ProvidersAdmin />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/bookings" element={<BookingsAdmin />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/services" element={<ServicesAdmin />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/analytics" element={<Analytics />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/settings" element={<AdminSettings />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/reports" element={<Reports />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/ai-control" element={<AIControl />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/simon-oversight" element={<SimonOversight />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/platform-config" element={<PlatformConfig />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/financial" element={<FinancialDashboard />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/customers" element={<CustomerManagement />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/invoices" element={<InvoiceManagement />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/reviews" element={<ReviewModeration />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/notifications" element={<AdminNotificationCenter />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/categories" element={<CategoryManagement />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/payouts" element={<ProviderPayouts />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/system-health" element={<SystemHealth />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/content" element={<ContentManagement />} />
                <Route path="/x7k9m2q4p8w1n5v3r6t0y/admin/lab" element={<LabView />} />
            </Route>
            <Route path="/admin" element={<AdminGuard><div /></AdminGuard>} />
            <Route path="/admin/*" element={<AdminGuard><div /></AdminGuard>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login />} />
            <Route path="/x7k9m2q4p8w1n5v3r6t0y/owner" element={<OwnerAdmin />} />
            <Route path="/trust/:providerId" element={<TrustPassport />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

function App() {
    const [splashDone, setSplashDone] = useState(() => !!localStorage.getItem('truvornex-splash-v2'));
    const [introDone,  setIntroDone]  = useState(() => !!localStorage.getItem('truvornex-intro-v2'));

    const handleSplashComplete = () => {
        localStorage.setItem('truvornex-splash-v2', '1');
        setSplashDone(true);
    };

    const handleIntroComplete = () => {
        localStorage.setItem('truvornex-intro-v2', '1');
        setIntroDone(true);
    };

    return (
        <ThemeProvider>
            <AuthProvider>
                <AuthModalProvider>
                    <QueryClientProvider client={queryClientInstance}>
                        <SimonProvider>
                            {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
                            {splashDone && !introDone && <IntroFlow onComplete={handleIntroComplete} />}
                            <Router>
                                <AuthenticatedApp />
                                <AuthModal />
                            </Router>
                            <Toaster />
                        </SimonProvider>
                    </QueryClientProvider>
                </AuthModalProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
