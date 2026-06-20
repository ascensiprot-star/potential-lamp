import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Cpu } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-zinc-950 border-t border-white/8 text-white/40 mt-20">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                    {/* Brand */}
                    <div className="sm:col-span-2 md:col-span-1">
                        <Link to="/" className="font-display font-bold text-xl text-white mb-3 block">
                            Truvornex
                        </Link>
                        <p className="text-sm leading-relaxed text-white/30 mb-4">
                            Your trusted platform for booking local services. Fast, easy, and reliable.
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="#" className="h-8 w-8 rounded-lg bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors text-white/50 hover:text-white"><Facebook className="h-4 w-4" /></a>
                            <a href="#" className="h-8 w-8 rounded-lg bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors text-white/50 hover:text-white"><Twitter className="h-4 w-4" /></a>
                            <a href="#" className="h-8 w-8 rounded-lg bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors text-white/50 hover:text-white"><Instagram className="h-4 w-4" /></a>
                        </div>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="text-white/80 font-bold text-sm mb-4">Services</h3>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/services" className="hover:text-white transition-colors">Browse Services</Link></li>
                            <li><Link to="/nearby" className="hover:text-white transition-colors">Near Me</Link></li>
                            <li><Link to="/dashboard" className="hover:text-white transition-colors">My Bookings</Link></li>
                            <li><Link to="/profile" className="hover:text-white transition-colors">My Profile</Link></li>
                        </ul>
                    </div>

                    {/* For Providers */}
                    <div>
                        <h3 className="text-white/80 font-bold text-sm mb-4">For Providers</h3>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/provider" className="hover:text-white transition-colors">Provider Dashboard</Link></li>
                            <li><Link to="/provider/services" className="hover:text-white transition-colors">Manage Services</Link></li>
                            <li><Link to="/provider/bookings" className="hover:text-white transition-colors">Bookings</Link></li>
                            <li><Link to="/provider/profile" className="hover:text-white transition-colors">Business Profile</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white/80 font-bold text-sm mb-4">Contact Us</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-zinc-600" />
                                <span>123 Service Street, New York, NY 10001</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-zinc-600" />
                                <a href="tel:+15551234567" className="hover:text-white transition-colors">+1 (555) 123-4567</a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0 text-zinc-600" />
                                <a href="mailto:hello@truvornex.app" className="hover:text-white transition-colors">hello@truvornex.app</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
                    <p className="flex items-center gap-2">© {new Date().getFullYear()} Truvornex. <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Powered by Simon AI</span></p>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-zinc-400 transition-colors">Support</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}