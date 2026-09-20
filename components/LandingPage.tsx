import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Files, CheckCircle2, Shield, Zap, ArrowRight, 
    BarChart3, Users, ChevronRight, TrendingUp, Menu, X, 
    Layers, Clock, FileText, Package, AlertTriangle, 
    CreditCard, Truck, Search, Check, Smartphone, 
    ArrowUpRight, Plus, HelpCircle, Lock, ChevronDown, 
    RefreshCw, Sparkles, Filter, Building2, ShoppingCart, 
    Receipt, FileCheck, ArrowDownRight, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- DATA STRUCTURES & ACCORDION ITEMS ---
const FAQ_ITEMS = [
    {
        question: "Qu'est-ce que FacturaGo ?",
        answer: "FacturaGo est une plateforme SaaS moderne de gestion commerciale et de facturation conçue pour simplifier le quotidien des indépendants, TPE et PME. Elle regroupe dans une interface unique la création de devis, factures, bons de livraison, le suivi des paiements, la gestion des clients et le contrôle des stocks."
    },
    {
        question: "À qui s'adresse FacturaGo ?",
        answer: "FacturaGo s'adresse aux entrepreneurs, prestataires de services, commerçants, artisans, consultants, agences et PME qui souhaitent professionnaliser leurs documents commerciaux, gagner du temps et éliminer les erreurs liées aux fichiers Excel ou papier."
    },
    {
        question: "Puis-je gérer mes clients et mes produits ?",
        answer: "Oui, FacturaGo intègre un répertoire complet de vos clients avec historique de facturation, coordonnées complètes et suivi des soldes dus, ainsi qu'un catalogue de produits et services avec prix HT/TTC, gestion des taux de TVA et marges."
    },
    {
        question: "Puis-je créer des factures et des devis facilement ?",
        answer: "Absolument. Vous pouvez créer un devis ou une facture en moins d'une minute grâce à la complétion automatique des données clients et produits, le calcul automatique de la TVA et la numérotation séquentielle conforme. En un clic, un devis accepté se convertit en bon de livraison ou en facture."
    },
    {
        question: "Puis-je gérer mon stock avec FacturaGo ?",
        answer: "Oui. FacturaGo dispose d'un module de stock en temps réel qui suit vos entrées et sorties, met à jour vos niveaux d'inventaire automatiquement lors des ventes et vous alerte dès qu'un article passe sous le seuil critique pour éviter les ruptures."
    },
    {
        question: "Mes données sont-elles sécurisées et sauvegardées ?",
        answer: "Toutes vos données sont stockées de façon sécurisée et isolée sur des serveurs cloud haute disponibilité avec sauvegardes automatiques continues et chiffrement des flux de connexion."
    },
    {
        question: "Puis-je utiliser FacturaGo depuis mon téléphone ?",
        answer: "Oui. FacturaGo est 100% responsive et fonctionne parfaitement sur tous les smartphones, tablettes et ordinateurs, sans avoir besoin d'installer une application lourde depuis un store."
    },
    {
        question: "Quel est le prix de FacturaGo ?",
        answer: "Nous avons simplifié notre offre au maximum : un pack unique à 300 MAD par an pour tout illimité. Pas de frais cachés, pas de limites sur le nombre de documents ou de clients, et toutes les fonctionnalités incluses nativement."
    },
    {
        question: "Comment créer mon compte ?",
        answer: "Il vous suffit de cliquer sur 'Commencer maintenant' ou 'Créer mon compte'. Vous aurez un accès immédiat à votre espace de gestion en moins de 2 minutes pour configurer votre entreprise et démarrer votre facturation."
    }
];

const WORKFLOW_STEPS = [
    {
        id: 'client',
        step: '01',
        title: 'Fiche Client',
        subtitle: 'Ajout ou sélection du contact',
        desc: 'Sélectionnez un client existant ou ajoutez un nouveau profil avec toutes ses informations légales.',
        icon: Users,
        color: 'from-blue-500 to-indigo-600',
        badge: 'Contact'
    },
    {
        id: 'quote',
        step: '02',
        title: 'Devis Rapide',
        subtitle: 'Proposition commerciale claire',
        desc: 'Sélectionnez vos articles avec prix et remises. Le devis est calculé et prêt à être envoyé au client.',
        icon: FileText,
        color: 'from-emerald-500 to-teal-600',
        badge: 'Proposition'
    },
    {
        id: 'delivery',
        step: '03',
        title: 'Bon de Livraison',
        subtitle: 'Déstockage et expédition',
        desc: 'Convertissez le devis validé en bon de livraison avec décrémentation automatique de l’inventaire.',
        icon: Truck,
        color: 'from-amber-500 to-orange-600',
        badge: 'Logistique'
    },
    {
        id: 'invoice',
        step: '04',
        title: 'Facture Finale',
        subtitle: 'Numérotation automatique',
        desc: 'Génération instantanée de la facture officielle avec toutes les mentions obligatoires et QR code.',
        icon: Receipt,
        color: 'from-emerald-600 to-emerald-700',
        badge: 'Facturation'
    },
    {
        id: 'payment',
        step: '05',
        title: 'Encaissement',
        subtitle: 'Clôture et mise à jour du solde',
        desc: 'Enregistrez le règlement (virement, chèque, espèces) et suivez votre trésorerie en temps réel.',
        icon: CreditCard,
        color: 'from-purple-500 to-indigo-600',
        badge: 'Trésorerie'
    }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [activeWorkflow, setActiveWorkflow] = useState<number>(3); // Invoice by default
    const [activeStockTab, setActiveStockTab] = useState<'all' | 'alert' | 'ok'>('all');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white antialiased overflow-x-hidden">
            
            {/* ========================================================================= */}
            {/* 1. NAVBAR                                                                 */}
            {/* ========================================================================= */}
            <header 
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                    scrolled 
                    ? 'bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-xs py-3.5' 
                    : 'bg-transparent py-5'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        {/* Brand Logo */}
                        <div 
                            className="flex items-center gap-3 cursor-pointer group select-none" 
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            id="landing-logo-btn"
                        >
                            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 group-hover:bg-emerald-500 transition-colors">
                                <Files size={22} className="transform -rotate-6" />
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    FacturaGo
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md hidden sm:inline-block">
                                    SaaS
                                </span>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="hidden lg:flex items-center gap-8">
                            <button 
                                onClick={() => scrollToSection('product')} 
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                Produit
                            </button>
                            <button 
                                onClick={() => scrollToSection('features')} 
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                Fonctionnalités
                            </button>
                            <button 
                                onClick={() => scrollToSection('workflow')} 
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                Solutions
                            </button>
                            <button 
                                onClick={() => scrollToSection('pricing')} 
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                Tarifs
                            </button>
                            <button 
                                onClick={() => scrollToSection('faq')} 
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                FAQ
                            </button>
                        </nav>

                        {/* CTA Buttons */}
                        <div className="hidden sm:flex items-center gap-3">
                            <button 
                                onClick={() => navigate('/login')} 
                                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer"
                                id="nav-login-btn"
                            >
                                Connexion
                            </button>
                            <button 
                                onClick={() => navigate('/login')} 
                                className="group relative inline-flex items-center gap-2 bg-slate-900 text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/15 active:scale-[0.98] cursor-pointer"
                                id="nav-signup-btn"
                            >
                                <span>Créer mon compte</span>
                                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform text-emerald-400" />
                            </button>
                        </div>

                        {/* Mobile Menu Trigger */}
                        <button 
                            className="lg:hidden p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                            id="nav-mobile-toggle"
                        >
                            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden bg-white border-b border-slate-200 px-6 py-5 shadow-xl space-y-4"
                        >
                            <nav className="flex flex-col gap-3">
                                <button onClick={() => scrollToSection('product')} className="text-left py-2 font-medium text-slate-700 hover:text-emerald-600">Produit</button>
                                <button onClick={() => scrollToSection('features')} className="text-left py-2 font-medium text-slate-700 hover:text-emerald-600">Fonctionnalités</button>
                                <button onClick={() => scrollToSection('workflow')} className="text-left py-2 font-medium text-slate-700 hover:text-emerald-600">Solutions</button>
                                <button onClick={() => scrollToSection('pricing')} className="text-left py-2 font-medium text-slate-700 hover:text-emerald-600">Tarifs</button>
                                <button onClick={() => scrollToSection('faq')} className="text-left py-2 font-medium text-slate-700 hover:text-emerald-600">FAQ</button>
                            </nav>
                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                                <button 
                                    onClick={() => navigate('/login')} 
                                    className="w-full py-3 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
                                >
                                    Connexion
                                </button>
                                <button 
                                    onClick={() => navigate('/login')} 
                                    className="w-full py-3 text-center text-sm font-semibold text-white bg-emerald-600 rounded-xl shadow-md shadow-emerald-600/20"
                                >
                                    Créer mon compte
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ========================================================================= */}
            {/* 2. HERO SECTION                                                           */}
            {/* ========================================================================= */}
            <section className="relative pt-32 sm:pt-40 pb-20 lg:pb-32 overflow-hidden" id="hero">
                {/* Background Subtle Gradient Mesh */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-60">
                    <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl" />
                    <div className="absolute top-20 right-1/4 w-[28rem] h-[28rem] bg-teal-200/20 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-xs mb-6 sm:mb-8 animate-fadeIn">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs sm:text-sm font-semibold text-slate-800">
                            Gestion commerciale simplifiée
                        </span>
                        <ChevronRight size={14} className="text-slate-400" />
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-[1.08] max-w-5xl mx-auto">
                        Toute votre gestion commerciale. <br className="hidden sm:inline" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900">
                            Enfin, au même endroit.
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mt-6 sm:mt-8 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
                        Devis, factures, clients, produits, stocks et paiements : FacturaGo centralise votre activité pour vous faire gagner du temps et garder le contrôle.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
                        <button 
                            onClick={() => navigate('/login')} 
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-600 text-white px-7 py-3.5 rounded-xl font-bold text-base shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
                            id="hero-cta-primary"
                        >
                            <span>Démarrer maintenant</span>
                            <ArrowRight size={18} />
                        </button>
                        <button 
                            onClick={() => scrollToSection('product')} 
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-800 border border-slate-200/90 px-6 py-3.5 rounded-xl font-semibold text-base shadow-xs hover:bg-slate-50 hover:text-slate-950 transition-all cursor-pointer"
                            id="hero-cta-secondary"
                        >
                            <span>Voir comment ça marche</span>
                        </button>
                    </div>

                    {/* Social Proof Checklist */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Simple à utiliser
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Rapide à prendre en main
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Accessible partout
                        </span>
                    </div>

                    {/* ========================================================================= */}
                    {/* 3. HERO PRODUCT VISUAL COMPOSITION (REAL DASHBOARD)                      */}
                    {/* ========================================================================= */}
                    <div className="mt-14 sm:mt-18 relative mx-auto max-w-6xl" id="product">
                        
                        {/* Floating Micro-Card: Invoice Paid (Top-Left) */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="hidden lg:flex absolute -top-8 -left-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200/80 items-center gap-3.5 max-w-xs text-left"
                        >
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                                <Receipt size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">#FAC-2026-0128</span>
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">Payée</span>
                                </div>
                                <div className="text-sm font-black text-emerald-700 mt-0.5">+ 4 850,00 MAD</div>
                            </div>
                        </motion.div>

                        {/* Floating Micro-Card: Revenue Growth (Bottom-Right) */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="hidden lg:flex absolute -bottom-6 -right-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200/80 items-center gap-3.5 max-w-xs text-left"
                        >
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <div className="text-xs font-medium text-slate-500">Chiffre d'affaires</div>
                                <div className="text-base font-black text-slate-900">124 580,00 MAD</div>
                                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                                    <ArrowUpRight size={13} /> +18.4% ce mois
                                </div>
                            </div>
                        </motion.div>

                        {/* Main Product Screen Container */}
                        <div className="relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-900/10 via-slate-900/5 to-slate-900/20 shadow-2xl border border-slate-200/80">
                            
                            {/* Window Header */}
                            <div className="bg-slate-900 rounded-t-xl sm:rounded-t-2xl px-4 py-3 flex items-center justify-between text-slate-400 text-xs border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                                </div>
                                <div className="bg-slate-800/90 text-slate-300 font-mono text-[11px] px-4 py-1 rounded-lg border border-slate-700 flex items-center gap-2">
                                    <Lock size={11} className="text-emerald-400" />
                                    <span>app.facturago.online/dashboard</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                                        En direct
                                    </span>
                                </div>
                            </div>

                            {/* Actual Dashboard UI Mockup */}
                            <div className="bg-white rounded-b-xl sm:rounded-b-2xl p-4 sm:p-6 lg:p-8 text-left space-y-6">
                                
                                {/* App Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <span>Tableau de bord</span>
                                            <span>•</span>
                                            <span className="text-emerald-600">Société Atlas SARL</span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                                            Vue d'ensemble de l'activité
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                                            <Clock size={14} className="text-slate-400" />
                                            <span>Aujourd'hui, 24 Août 2026</span>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/login')}
                                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                                        >
                                            <Plus size={14} />
                                            <span>Nouvelle facture</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 4 Key Stat Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-medium text-slate-500">Chiffre d'affaires</span>
                                        <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">124 580 MAD</div>
                                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                                            <TrendingUp size={12} /> +18.4% ce mois
                                        </span>
                                    </div>

                                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-medium text-slate-500">Factures encaissées</span>
                                        <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">89 420 MAD</div>
                                        <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                                            78% du total facturé
                                        </span>
                                    </div>

                                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-medium text-slate-500">En attente / Relances</span>
                                        <div className="text-lg sm:text-xl font-black text-amber-700 mt-1">35 160 MAD</div>
                                        <span className="text-[11px] font-bold text-amber-600 mt-1 block">
                                            4 factures ouvertes
                                        </span>
                                    </div>

                                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-medium text-slate-500">État des stocks</span>
                                        <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">142 Références</div>
                                        <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
                                            Inventaire synchronisé
                                        </span>
                                    </div>
                                </div>

                                {/* Table & Micro Chart Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                                    
                                    {/* Recent Invoices Table (2 cols) */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-900">Dernières factures</h3>
                                            <span className="text-xs font-semibold text-emerald-600 cursor-pointer hover:underline">
                                                Voir tout
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                                                        <th className="pb-2.5">Numéro</th>
                                                        <th className="pb-2.5">Client</th>
                                                        <th className="pb-2.5">Montant TTC</th>
                                                        <th className="pb-2.5">Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                    <tr>
                                                        <td className="py-3 font-bold text-slate-900">#FAC-2026-0128</td>
                                                        <td className="py-3">Société Atlas SARL</td>
                                                        <td className="py-3 font-bold">4 850,00 MAD</td>
                                                        <td className="py-3">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Payée
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 font-bold text-slate-900">#FAC-2026-0127</td>
                                                        <td className="py-3">TechMaroc Consulting</td>
                                                        <td className="py-3 font-bold">12 300,00 MAD</td>
                                                        <td className="py-3">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                En attente
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 font-bold text-slate-900">#FAC-2026-0126</td>
                                                        <td className="py-3">K-Tech Solutions</td>
                                                        <td className="py-3 font-bold">8 900,00 MAD</td>
                                                        <td className="py-3">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Payée
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Monthly Evolution Widget (1 col) */}
                                    <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-500">Évolution du CA</span>
                                            <div className="text-lg font-black text-slate-900 mt-1">6 derniers mois</div>
                                        </div>

                                        {/* Stylized Bar Chart */}
                                        <div className="flex items-end justify-between gap-2 h-28 pt-4">
                                            {[
                                                { m: 'Mar', h: '45%' },
                                                { m: 'Avr', h: '60%' },
                                                { m: 'Mai', h: '75%' },
                                                { m: 'Jui', h: '55%' },
                                                { m: 'Juil', h: '85%' },
                                                { m: 'Aoû', h: '100%', active: true }
                                            ].map((bar, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                                                    <div 
                                                        style={{ height: bar.h }} 
                                                        className={`w-full rounded-t-lg transition-all ${
                                                            bar.active ? 'bg-emerald-600 shadow-sm' : 'bg-slate-200 hover:bg-slate-300'
                                                        }`}
                                                    />
                                                    <span className="text-[10px] font-semibold text-slate-400">{bar.m}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                                            <span>Croissance continue</span>
                                            <span className="font-bold text-emerald-600">+24% vs 2025</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 4. SECTION TRUST (QUALITATIVE & MINIMALIST)                              */}
            {/* ========================================================================= */}
            <section className="py-16 bg-white border-y border-slate-200/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">
                            Fiabilité & Sérénité
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                            Pensé pour les entreprises qui veulent travailler plus simplement.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Conforme & Structuré</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Devis, bons de livraison et factures générés avec mentions légales exactes (ICE, IF, RC, Patente).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Suivi en Temps Réel</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Visualisez votre chiffre d'affaires, vos encaissements et les factures en attente en un coup d'œil.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">100% Cloud & Sécurisé</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Vos données restent organisées, accessibles et sécurisées en permanence depuis tous vos appareils.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 5. SECTION PROBLEM (CHAOS EXCEL VS FACTURAGO SERENITY)                   */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-[#FAFAFC] overflow-hidden" id="problem">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200/60 px-3 py-1 rounded-full">
                            Fin du désordre
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-4">
                            Votre entreprise ne devrait pas être gérée dans 5 fichiers Excel.
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">
                            Fini les formules cassées, les devis perdus sur WhatsApp et les relances oubliées.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
                        
                        {/* The Old Way: Chaotic Excel & Paper */}
                        <div className="bg-white rounded-3xl p-8 border border-rose-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                        <X size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">L'ancienne méthode</h3>
                                        <p className="text-xs text-rose-600 font-semibold">Désorganisation & perte de temps</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 flex items-center justify-between">
                                        <span className="font-mono text-rose-900 font-semibold">Facture_Finale_v3_rectifiee(1).xlsx</span>
                                        <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">Erreur formule</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 flex items-center justify-between">
                                        <span>Devis envoyé par WhatsApp</span>
                                        <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">Introuvable</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 flex items-center justify-between">
                                        <span>Inventaire papier & stock théorique</span>
                                        <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">Désynchronisé</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 flex items-center justify-between">
                                        <span>Relances clients manuelles</span>
                                        <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">Retards de paiement</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 font-medium mt-6 pt-4 border-t border-slate-100">
                                ⚠️ Risque constant d'erreurs comptables et d'oubli de créances clients.
                            </p>
                        </div>

                        {/* The FacturaGo Way: Centralized & Fast */}
                        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/30">
                                        <Check size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Avec FacturaGo</h3>
                                        <p className="text-xs text-emerald-400 font-semibold">Centralisation & Maîtrise totale</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
                                        <span className="font-semibold">Devis converti en Facture en 1 clic</span>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Automatique</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
                                        <span className="font-semibold">Mise à jour instantanée du stock</span>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">En temps réel</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
                                        <span className="font-semibold">PDF haute définition conforme aux normes</span>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Professionnel</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
                                        <span className="font-semibold">Tableau de bord des impayés & alertes</span>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Zéro oubli</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                                <span className="text-xs text-emerald-400 font-semibold">Prêt en 2 minutes</span>
                                <button 
                                    onClick={() => navigate('/login')}
                                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                    Démarrer maintenant
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 6. SECTION "ONE PLATFORM" (ASYMMETRIC BENTO GRID)                         */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-white border-y border-slate-200/70" id="features">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Plateforme Complète
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Tout ce dont vous avez besoin pour piloter votre activité.
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">
                            Chaque module est pensé pour éliminer les frictions et vous faire gagner un temps précieux.
                        </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        
                        {/* Bloc 1 (Grand - 2 cols) : Facturation */}
                        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
                                    <Receipt size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">Facturation & Devis</h3>
                                <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-lg">
                                    Créez des factures élégantes avec numérotation personnalisée, calculs automatiques de la TVA et conversion de devis en un clic.
                                </p>
                            </div>

                            {/* UI Snippet Inside Bento */}
                            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3 font-mono text-xs">
                                <div className="flex justify-between items-center text-slate-300 pb-2 border-b border-slate-700">
                                    <span className="font-bold text-emerald-400">FACTURE #FAC-2026-0042</span>
                                    <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-sans font-bold">Conforme</span>
                                </div>
                                <div className="flex justify-between text-slate-400 text-[11px]">
                                    <span>Prestation Conseil & Audit</span>
                                    <span className="text-white font-bold">15 000,00 MAD</span>
                                </div>
                                <div className="flex justify-between text-slate-400 text-[11px]">
                                    <span>TVA (20%)</span>
                                    <span className="text-white font-bold">3 000,00 MAD</span>
                                </div>
                                <div className="flex justify-between text-slate-200 text-xs font-bold pt-2 border-t border-slate-700">
                                    <span>Total TTC</span>
                                    <span className="text-emerald-400 font-black">18 000,00 MAD</span>
                                </div>
                            </div>
                        </div>

                        {/* Bloc 2 (Medium - 1 col) : Clients CRM */}
                        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold mb-4">
                                    <Users size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Répertoire Clients</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Coordonnées complètes, ICE, historique des documents et solde des impayés.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900">Société Atlas SARL</span>
                                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">Actif</span>
                                </div>
                                <div className="text-slate-500 text-[11px]">ICE: 002391028300041</div>
                                <div className="text-[11px] font-bold text-emerald-600">Solde à jour : 0,00 MAD</div>
                            </div>
                        </div>

                        {/* Bloc 3 (Medium - 1 col) : Catalogue Produits */}
                        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold mb-4">
                                    <Package size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Catalogue Articles</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Gestion des références, prix d'achat, prix de vente et calcul des marges brutes.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900">Pack Serveur Cloud Pro</span>
                                    <span className="font-bold text-slate-900">4 200 MAD</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                    <span>Marge estimée</span>
                                    <span className="text-emerald-600 font-bold">+38%</span>
                                </div>
                            </div>
                        </div>

                        {/* Bloc 4 (Grand - 2 cols) : Stock & Alertes */}
                        <div className="md:col-span-2 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold mb-4">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Contrôle du Stock en Temps Réel</h3>
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-lg">
                                    Suivi automatique des entrées et sorties. Notifications visuelles dès qu'un produit passe sous le seuil d'alerte pour éviter toute rupture.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="bg-white p-4 rounded-xl border border-amber-200/80 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-900">Câble Fibre Optique 100m</div>
                                        <div className="text-slate-500 text-[11px] mt-0.5">Seuil min : 10 unités</div>
                                    </div>
                                    <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                        3 restants
                                    </span>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-900">Routeur Wi-Fi 6 Pro</div>
                                        <div className="text-slate-500 text-[11px] mt-0.5">Stock optimal</div>
                                    </div>
                                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                        45 en stock
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bloc 5 (1 col) : Bons de livraison */}
                        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold mb-4">
                                    <Truck size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Bons de Livraison</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Génération immédiate, bon de décharge et validation des réceptions.
                                </p>
                            </div>
                            <div className="text-xs font-bold text-teal-700 bg-teal-50 p-3 rounded-xl border border-teal-200 flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <span>Déstockage automatique</span>
                            </div>
                        </div>

                        {/* Bloc 6 (1 col) : Suivi des Paiements */}
                        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold mb-4">
                                    <CreditCard size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Règlements & Trésorerie</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Enregistrez les paiements partiels ou complets (virement, chèque, espèces).
                                </p>
                            </div>
                            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                                <TrendingUp size={16} />
                                <span>Zéro retard de paiement</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 7. SECTION FACTURATION (DEEP DIVE REALISTIC INVOICE)                     */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-[#FAFAFC] overflow-hidden" id="invoices">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Left Column: Copy & Checklist */}
                        <div className="lg:col-span-5 space-y-6">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                                Factures Professionnelles
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                                Créez des factures professionnelles en quelques secondes.
                            </h2>
                            <p className="text-base text-slate-600 leading-relaxed">
                                Donnez une image irréprochable à vos clients avec des documents personnalisés à votre charte graphique et strictement conformes aux exigences réglementaires.
                            </p>

                            <div className="space-y-3.5 pt-2">
                                {[
                                    "Création ultra-rapide en moins d'une minute",
                                    "Numérotation séquentielle et personnalisable automatique",
                                    "Liaison directe avec vos fiches clients et catalogue",
                                    "Export PDF haute fidélité prêt à l'impression ou l'envoi",
                                    "Suivi des règlements et détection des retards"
                                ].map((bullet, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <Check size={13} />
                                        </div>
                                        <span>{bullet}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={() => navigate('/login')}
                                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-slate-900/10 hover:bg-slate-800 transition-all cursor-pointer"
                                >
                                    <span>Créer une facture test</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Right Column: High-Fidelity Invoice Document Preview */}
                        <div className="lg:col-span-7">
                            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl border border-slate-200/90 text-slate-900 relative">
                                
                                {/* Stamp: PAYÉE */}
                                <div className="absolute top-8 right-8 rotate-12 border-2 border-emerald-600 text-emerald-700 px-4 py-1 rounded-lg text-sm font-black tracking-widest uppercase bg-emerald-50/80 shadow-xs">
                                    PAYÉE
                                </div>

                                {/* Invoice Header */}
                                <div className="flex justify-between items-start pb-6 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                                <Files size={18} />
                                            </div>
                                            <span className="text-xl font-black tracking-tight text-slate-950">Atlas Solutions SARL</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            128 Boulevard d'Anfa, Casablanca, Maroc <br />
                                            ICE: 002847192000032 • IF: 4920194 • RC: 84920
                                        </p>
                                    </div>
                                    <div className="text-right pr-20">
                                        <span className="text-xs font-bold text-slate-400 uppercase">FACTURE</span>
                                        <div className="text-lg font-black text-slate-900">#FAC-2026-0128</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Date : 24/08/2026</div>
                                    </div>
                                </div>

                                {/* Client Box */}
                                <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Facturé à :</span>
                                        <div className="text-sm font-bold text-slate-900 mt-0.5">K-Tech Solutions SARL AU</div>
                                        <div className="text-slate-500">ICE : 001928475000094 • contact@k-tech.ma</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Échéance :</span>
                                        <div className="font-semibold text-slate-700">Comptant à réception</div>
                                    </div>
                                </div>

                                {/* Line Items Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                                                <th className="py-2.5">Désignation</th>
                                                <th className="py-2.5 text-center">Qté</th>
                                                <th className="py-2.5 text-right">Prix Unitaire HT</th>
                                                <th className="py-2.5 text-right">Total HT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            <tr>
                                                <td className="py-3 font-semibold text-slate-900">Développement Module Sur-Mesure</td>
                                                <td className="py-3 text-center">1</td>
                                                <td className="py-3 text-right">3 500,00 MAD</td>
                                                <td className="py-3 text-right font-bold">3 500,00 MAD</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 font-semibold text-slate-900">Maintenance & Support Mensuel</td>
                                                <td className="py-3 text-center">1</td>
                                                <td className="py-3 text-right">1 350,00 MAD</td>
                                                <td className="py-3 text-right font-bold">1 350,00 MAD</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals Breakdown */}
                                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                                    <div className="w-64 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Total HT :</span>
                                            <span className="font-bold text-slate-800">4 850,00 MAD</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                            <span>TVA (20%) :</span>
                                            <span className="font-bold text-slate-800">970,00 MAD</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-200">
                                            <span>Total TTC :</span>
                                            <span className="text-emerald-700 text-base">5 820,00 MAD</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 8. SECTION CLIENTS + PRODUITS (SPLIT SCREEN)                             */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-white border-y border-slate-200/70" id="management">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Organisation Parfaite
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Votre activité, parfaitement organisée.
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">
                            Une base de données centrale pour vos contacts et vos produits. Fini les ressaisies manuelles et les erreurs de prix.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Split Left: Clients CRM */}
                        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Gestion des Clients</h3>
                                        <p className="text-xs text-slate-500">Recherche rapide et historique complet</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                    CRM Intégré
                                </span>
                            </div>

                            {/* Search Mock */}
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                                <input 
                                    type="text" 
                                    readOnly 
                                    value="Rechercher par nom, téléphone, ICE..." 
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-400 shadow-xs cursor-default"
                                />
                            </div>

                            {/* Client Cards List */}
                            <div className="space-y-3">
                                {[
                                    { name: "Société Atlas SARL", city: "Casablanca", balance: "0,00 MAD", status: "À jour", count: "12 factures" },
                                    { name: "TechMaroc Consulting", city: "Rabat", balance: "12 300,00 MAD", status: "1 facture due", count: "8 factures" },
                                    { name: "Atlas Déco & Design", city: "Marrakech", balance: "0,00 MAD", status: "À jour", count: "5 factures" }
                                ].map((cli, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-slate-900">{cli.name}</div>
                                            <div className="text-slate-400 text-[11px] mt-0.5">{cli.city} • {cli.count}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{cli.balance}</div>
                                            <span className={`text-[10px] font-bold ${cli.balance === "0,00 MAD" ? "text-emerald-600" : "text-amber-600"}`}>
                                                {cli.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Split Right: Product Catalog */}
                        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Catalogue Produits & Services</h3>
                                        <p className="text-xs text-slate-500">Tarification, TVA et marges en temps réel</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                                    Catalogue
                                </span>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                                <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold">Tous</span>
                                <span className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">Services</span>
                                <span className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">Matériel</span>
                                <span className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">Licences</span>
                            </div>

                            {/* Products List */}
                            <div className="space-y-3">
                                {[
                                    { name: "Abonnement Cloud Annuel", sku: "SRV-001", price: "2 400 MAD", stock: "Service", margin: "+65%" },
                                    { name: "Terminal Point de Vente TPV", sku: "MAT-089", price: "3 800 MAD", stock: "14 en stock", margin: "+32%" },
                                    { name: "Formation & Accompagnement", sku: "SRV-004", price: "1 500 MAD", stock: "Service", margin: "+80%" }
                                ].map((prd, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-slate-900">{prd.name}</div>
                                            <div className="text-slate-400 text-[11px] mt-0.5">Réf : {prd.sku} • Marge {prd.margin}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{prd.price}</div>
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                {prd.stock}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 9. SECTION STOCK                                                          */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-[#FAFAFC]" id="stock">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Inventaire Intelligent
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Gardez le contrôle sur votre stock.
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">
                            Suivez chaque entrée et sortie en temps réel. Anticipez les ruptures avant qu'elles n'impactent vos ventes.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl max-w-5xl mx-auto space-y-6">
                        
                        {/* Control Tabs */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setActiveStockTab('all')}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeStockTab === 'all' 
                                        ? 'bg-slate-900 text-white shadow-xs' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Tous les articles (142)
                                </button>
                                <button 
                                    onClick={() => setActiveStockTab('alert')}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeStockTab === 'alert' 
                                        ? 'bg-amber-600 text-white shadow-xs' 
                                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                    }`}
                                >
                                    Stock faible & alertes (3)
                                </button>
                                <button 
                                    onClick={() => setActiveStockTab('ok')}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeStockTab === 'ok' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                >
                                    Disponibles (139)
                                </button>
                            </div>

                            <div className="text-xs font-semibold text-slate-500">
                                🔄 Déstockage automatique sur Bon de livraison
                            </div>
                        </div>

                        {/* Stock Inventory Items */}
                        <div className="space-y-3">
                            {[
                                { name: "Bobine Papier Thermique 80mm", sku: "PAP-001", current: 4, min: 20, status: "Critique", badgeClass: "bg-rose-50 text-rose-700 border-rose-200", barColor: "bg-rose-500", barW: "20%" },
                                { name: "Câble Réseau RJ45 Cat6 50m", sku: "CAB-012", current: 8, min: 15, status: "Stock faible", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", barColor: "bg-amber-500", barW: "53%" },
                                { name: "Imprimante Ticket USB & LAN", sku: "IMP-003", current: 24, min: 10, status: "Disponible", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", barColor: "bg-emerald-500", barW: "85%" },
                                { name: "Lecteur Code-barres 2D Sans fil", sku: "SCAN-008", current: 18, min: 8, status: "Disponible", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", barColor: "bg-emerald-500", barW: "90%" }
                            ].filter(item => {
                                if (activeStockTab === 'alert') return item.status === 'Critique' || item.status === 'Stock faible';
                                if (activeStockTab === 'ok') return item.status === 'Disponible';
                                return true;
                            }).map((st, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.badgeClass}`}>
                                                {st.status}
                                            </span>
                                        </div>
                                        <div className="text-slate-500">Réf : {st.sku} • Seuil critique : {st.min} unités</div>
                                    </div>

                                    <div className="flex items-center gap-4 sm:w-64">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                                                <span>Quantité : <strong className="text-slate-900">{st.current}</strong></span>
                                                <span className="text-slate-400">Min {st.min}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div style={{ width: st.barW }} className={`h-full rounded-full ${st.barColor}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 10. SECTION WORKFLOW (STEP-BY-STEP INTERCONNECTED PIPELINE)               */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-white border-y border-slate-200/70" id="workflow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Flux de Travail Fluide
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Du premier contact jusqu'au paiement encaissé.
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">
                            Découvrez comment vos données transitent d'une étape à l'autre sans jamais devoir être retapées.
                        </p>
                    </div>

                    {/* Interactive Stepper Navigation */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-5xl mx-auto mb-10">
                        {WORKFLOW_STEPS.map((wf, idx) => {
                            const Icon = wf.icon;
                            const isActive = activeWorkflow === idx;
                            return (
                                <button
                                    key={wf.id}
                                    onClick={() => setActiveWorkflow(idx)}
                                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                        isActive 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/15 scale-[1.02]' 
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {wf.step}
                                        </span>
                                        <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                                    </div>
                                    <div className="font-bold text-sm leading-tight">{wf.title}</div>
                                    <div className={`text-[11px] mt-1 ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {wf.badge}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Step Showcase Card */}
                    <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-3 py-1 rounded-full text-xs font-bold">
                                    <span>Étape {WORKFLOW_STEPS[activeWorkflow].step}</span>
                                    <span>•</span>
                                    <span>{WORKFLOW_STEPS[activeWorkflow].badge}</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    {WORKFLOW_STEPS[activeWorkflow].title}
                                </h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {WORKFLOW_STEPS[activeWorkflow].desc}
                                </p>
                                <div className="pt-2">
                                    <button 
                                        onClick={() => navigate('/login')}
                                        className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        <span>Tester cette étape dans FacturaGo</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Stage Mockup Container */}
                            <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 font-mono text-xs space-y-3">
                                <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-700">
                                    <span className="text-emerald-400 font-bold">MODULE FACTURAGO</span>
                                    <span>SYNC CLOUD</span>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-xl space-y-1.5 text-slate-300">
                                    <div className="text-[11px] text-slate-400 font-sans">Opération en cours :</div>
                                    <div className="font-bold text-white font-sans text-sm">{WORKFLOW_STEPS[activeWorkflow].subtitle}</div>
                                    <div className="text-emerald-400 text-[11px]">✓ Données enregistrées & prêtes pour l'étape suivante</div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </section>

            {/* ========================================================================= */}
            {/* 11. SECTION BENEFITS (EDITORIAL 4 PILLARS)                                */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-[#FAFAFC]" id="benefits">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Bénéfices Majeurs
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Moins d'administratif, plus de croissance.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                num: '01',
                                title: 'Gagnez du temps',
                                desc: 'Automatisez la numérotation, les calculs de taxes et la conversion de devis.',
                                icon: Zap
                            },
                            {
                                num: '02',
                                title: 'Réduisez les erreurs',
                                desc: 'Centralisez vos prix et vos coordonnées au même endroit pour zéro doublon.',
                                icon: CheckCircle2
                            },
                            {
                                num: '03',
                                title: 'Suivez votre activité',
                                desc: 'Visualisez vos marges, votre chiffre d\'affaires et vos relances en direct.',
                                icon: BarChart3
                            },
                            {
                                num: '04',
                                title: 'Travaillez partout',
                                desc: 'Accédez à votre espace depuis votre ordinateur, tablette ou smartphone en toute sécurité.',
                                icon: Smartphone
                            }
                        ].map((b, idx) => {
                            const Icon = b.icon;
                            return (
                                <div key={idx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                {b.num}
                                            </span>
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                                                <Icon size={20} />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{b.title}</h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </section>

            {/* ========================================================================= */}
            {/* 12. SECTION MOBILE                                                        */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-white border-y border-slate-200/70" id="mobile">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                                Mobilité Totale
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                                Votre activité vous accompagne partout.
                            </h2>
                            <p className="text-base text-slate-600 leading-relaxed">
                                Créez une facture chez un client, vérifiez un stock dans votre entrepôt ou suivez vos encaissements lors de vos déplacements. FacturaGo est 100% optimisé pour mobile.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <div className="font-bold text-slate-900 text-sm">Zéro application à installer</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Directement depuis votre navigateur</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <div className="font-bold text-slate-900 text-sm">Synchronisation Cloud</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Mises à jour instantanées</div>
                                </div>
                            </div>
                        </div>

                        {/* High-End Smartphone Frame Mockup */}
                        <div className="lg:col-span-6 flex justify-center">
                            <div className="w-full max-w-[320px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 relative">
                                
                                {/* Notch */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20" />

                                {/* Screen Content */}
                                <div className="bg-white rounded-[32px] overflow-hidden text-left p-4 pt-8 space-y-4">
                                    
                                    {/* Mobile Top Bar */}
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                                                <Files size={15} />
                                            </div>
                                            <span className="font-bold text-slate-900 text-xs">FacturaGo</span>
                                        </div>
                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                            En ligne
                                        </span>
                                    </div>

                                    {/* Mobile Stat Card */}
                                    <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1">
                                        <div className="text-[10px] text-slate-400">Chiffre d'affaires (Août)</div>
                                        <div className="text-lg font-black text-emerald-400">124 580 MAD</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <TrendingUp size={11} className="text-emerald-400" /> +18.4% ce mois
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
                                            + Facture
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
                                            + Devis
                                        </div>
                                    </div>

                                    {/* Recent Mobile Invoices */}
                                    <div className="space-y-2 pt-1">
                                        <div className="text-[10px] font-bold uppercase text-slate-400">Factures récentes</div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-bold text-slate-900">#FAC-0128</div>
                                                <div className="text-[10px] text-slate-400">Atlas SARL</div>
                                            </div>
                                            <span className="font-bold text-emerald-600">4 850 MAD</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 13. SECTION SECURITY & CLOUD                                              */}
            {/* ========================================================================= */}
            <section className="py-20 bg-[#FAFAFC]" id="security">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Sécurité & Contrôle
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Vos données. Votre activité. Votre contrôle.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <Lock size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Accès Sécurisé</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Authentification chiffrée avec gestion robuste des sessions et mots de passe.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <RefreshCw size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Synchronisation Cloud</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Vos enregistrements sont actualisés instantanément sur tous vos terminaux.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                <Building2 size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Isolation des Données</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Les données de chaque entreprise sont strictement isolées et protégées.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                <Shield size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Haute Disponibilité</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Accessible 24/7 avec infrastructure cloud haute tolérance aux pannes.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 14. PRICING SECTION                                                       */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-white border-y border-slate-200/70" id="pricing">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Tarification Unique & Simple
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Un seul pack. <br className="sm:hidden" /> Tout illimité.
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">
                            Pas de calculs complexes, pas de limites cachées. Profitez de toute la puissance de FacturaGo sans compromis.
                        </p>
                    </div>

                    {/* Single Pricing Card */}
                    <div className="max-w-xl mx-auto">
                        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border-2 border-emerald-500 shadow-2xl relative flex flex-col justify-between space-y-8 transform hover:scale-[1.01] transition-all">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-xs font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                Meilleure Offre
                            </div>

                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Pack Annuel Illimité</div>
                                    <h3 className="text-4xl font-black text-white">Tout-en-Un</h3>
                                </div>

                                <div className="text-center py-6 border-y border-slate-800">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-6xl font-black text-white tracking-tighter">300</span>
                                        <div className="text-left">
                                            <div className="text-xl font-bold text-emerald-400">MAD</div>
                                            <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">/ an</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-4 max-w-xs mx-auto">
                                        Accès complet à toutes les fonctionnalités actuelles et futures sans frais supplémentaires.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                            <Check size={14} />
                                        </div>
                                        <span className="text-sm text-slate-200">Factures & Devis <strong>illimités</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                            <Check size={14} />
                                        </div>
                                        <span className="text-sm text-slate-200">Clients & Produits <strong>illimités</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                            <Check size={14} />
                                        </div>
                                        <span className="text-sm text-slate-200">Gestion de stock complète</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                            <Check size={14} />
                                        </div>
                                        <span className="text-sm text-slate-200">Suivi trésorerie en direct</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                            <Check size={14} />
                                        </div>
                                        <span className="text-sm text-slate-200">Personnalisation (Logo, ICE)</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                            <Check size={14} />
                                        </div>
                                        <span className="text-sm text-slate-200">Support prioritaire 7j/7</span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate('/login')}
                                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition-all cursor-pointer active:scale-[0.98]"
                            >
                                Créer mon compte illimité
                            </button>
                            
                            <div className="text-center">
                                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Zéro frais d'activation • Résiliation à tout moment</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 15. SECTION "POURQUOI FACTURAGO ?"                                        */}
            {/* ========================================================================= */}
            <section className="py-20 bg-[#FAFAFC]" id="why">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="max-w-3xl mx-auto mb-12">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Avantage Compétitif
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-2">
                            Pourquoi choisir FacturaGo ?
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                            <h3 className="font-bold text-slate-900 text-base">Spécificités Locales</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Formats MAD, mentions ICE, IF, RC, Patente et taux de TVA 20% intégrés nativement.
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                            <h3 className="font-bold text-slate-900 text-base">Zéro Installation</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Accessible instantanément sur n'importe quel navigateur sans configuration technique.
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                            <h3 className="font-bold text-slate-900 text-base">Prise en Main en 2 Min</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Une interface épurée sans jargon complexe que toute votre équipe comprend immédiatement.
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                            <h3 className="font-bold text-slate-900 text-base">Support Réactif</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Une équipe disponible pour vous assister et répondre à toutes vos questions d'utilisation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 16. FAQ SECTION (ACCORDION)                                               */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-white border-y border-slate-200/70" id="faq">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                            Questions Fréquentes
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight mt-3">
                            Tout ce que vous devez savoir.
                        </h2>
                        <p className="mt-4 text-base text-slate-600">
                            Une question sur l'utilisation de FacturaGo ? Voici les réponses aux questions les plus courantes.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {FAQ_ITEMS.map((item, idx) => {
                            const isOpen = openFaq === idx;
                            return (
                                <div 
                                    key={idx} 
                                    className={`rounded-2xl border transition-all ${
                                        isOpen ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <button
                                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                                        className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-base cursor-pointer"
                                    >
                                        <span>{item.question}</span>
                                        <ChevronDown 
                                            size={20} 
                                            className={`text-slate-400 shrink-0 transition-transform duration-300 ${
                                                isOpen ? 'rotate-180 text-emerald-600' : ''
                                            }`} 
                                        />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed pt-1">
                                                    {item.answer}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </section>

            {/* ========================================================================= */}
            {/* 17. FINAL CTA SCENE                                                       */}
            {/* ========================================================================= */}
            <section className="py-20 lg:py-28 bg-[#FAFAFC] relative overflow-hidden" id="cta">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-8 sm:p-14 lg:p-20 shadow-2xl border border-slate-800 text-center overflow-hidden">
                        
                        {/* Subtle background glowing elements */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-1.5 rounded-full inline-block">
                                Prise en main immédiate
                            </span>

                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                                Prêt à simplifier votre gestion ?
                            </h2>

                            <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-normal">
                                Passez moins de temps à gérer vos documents et plus de temps à développer votre activité.
                            </p>

                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button 
                                    onClick={() => navigate('/login')} 
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-500 text-slate-950 px-8 py-4 rounded-xl font-black text-base shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer"
                                    id="final-cta-btn"
                                >
                                    <span>Accéder à l'illimité</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 font-medium">
                                Sans engagement • Configuration en 2 minutes • Accessible immédiatement
                            </p>
                        </div>

                    </div>

                </div>
            </section>

            {/* ========================================================================= */}
            {/* 18. FOOTER                                                                */}
            {/* ========================================================================= */}
            <footer className="bg-white border-t border-slate-200/80 pt-16 pb-12 text-slate-600 text-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-200/80">
                        
                        {/* Brand Column */}
                        <div className="col-span-2 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                                    <Files size={18} />
                                </div>
                                <span className="text-xl font-black text-slate-900 tracking-tight">FacturaGo</span>
                            </div>
                            <p className="text-slate-500 leading-relaxed max-w-sm text-xs">
                                Plateforme SaaS de gestion commerciale et de facturation conçue pour simplifier le quotidien des entreprises.
                            </p>
                            <div className="text-slate-400 text-[11px]">
                                © 2026 FacturaGo. Tous droits réservés.
                            </div>
                        </div>

                        {/* Col 1: Produit */}
                        <div className="space-y-3">
                            <div className="font-bold text-slate-900 text-sm">Produit</div>
                            <ul className="space-y-2">
                                <li><button onClick={() => scrollToSection('features')} className="hover:text-slate-900">Facturation</button></li>
                                <li><button onClick={() => scrollToSection('features')} className="hover:text-slate-900">Gestion des devis</button></li>
                                <li><button onClick={() => scrollToSection('stock')} className="hover:text-slate-900">Contrôle de stock</button></li>
                                <li><button onClick={() => scrollToSection('management')} className="hover:text-slate-900">Clients & Catalogue</button></li>
                            </ul>
                        </div>

                        {/* Col 2: Solutions */}
                        <div className="space-y-3">
                            <div className="font-bold text-slate-900 text-sm">Solutions</div>
                            <ul className="space-y-2">
                                <li><button onClick={() => scrollToSection('workflow')} className="hover:text-slate-900">Indépendants & Freelances</button></li>
                                <li><button onClick={() => scrollToSection('workflow')} className="hover:text-slate-900">Commerçants & Boutiques</button></li>
                                <li><button onClick={() => scrollToSection('workflow')} className="hover:text-slate-900">PME & Entreprises</button></li>
                                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-slate-900">Tarification</button></li>
                            </ul>
                        </div>

                        {/* Col 3: Support & Légal */}
                        <div className="space-y-3">
                            <div className="font-bold text-slate-900 text-sm">Compte & Légal</div>
                            <ul className="space-y-2">
                                <li><button onClick={() => navigate('/login')} className="hover:text-slate-900">Se connecter</button></li>
                                <li><button onClick={() => navigate('/login')} className="hover:text-slate-900">Créer un compte</button></li>
                                <li><button onClick={() => scrollToSection('faq')} className="hover:text-slate-900">FAQ & Aide</button></li>
                                <li><span className="text-slate-400">Confidentialité</span></li>
                            </ul>
                        </div>

                    </div>

                    {/* Bottom Credit */}
                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-4 text-[11px]">
                        <div>FacturaGo • Gestion commerciale simplifiée • https://facturago.online/</div>
                        <div>Conçu avec rigueur et précision.</div>
                    </div>

                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
