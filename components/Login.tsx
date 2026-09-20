
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Files, Lock, Mail, Loader2, AlertCircle, CheckCircle, X, ArrowLeft } from 'lucide-react';

const getFriendlyErrorMessage = (errMsg: string, cooldown?: number) => {
    if (!errMsg) return '';
    const lower = errMsg.toLowerCase();
    
    if (lower.includes('rate limit exceeded') || lower.includes('email rate limit exceeded') || lower.includes('too many requests') || lower.includes('once every 60 seconds')) {
        if (cooldown && cooldown > 0) {
            return `Veuillez patienter encore ${cooldown} secondes avant de pouvoir envoyer une nouvelle demande.`;
        }
        return "Vous avez dépassé la limite d'envoi d'e-mails. Veuillez patienter une minute avant de réessayer.";
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        return "Adresse e-mail ou mot de passe incorrect.";
    }
    if (lower.includes('email not confirmed')) {
        return "Veuillez confirmer votre adresse e-mail avant de vous connecter.";
    }
    if (lower.includes('user not found') || lower.includes('email not found')) {
        return "Aucun utilisateur inscrit avec cette adresse e-mail.";
    }
    if (lower.includes('invalid email')) {
        return "L'adresse e-mail saisie n'est pas valide.";
    }
    return errMsg;
};

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'login' | 'forgot_password'>('login');
    const [resetSent, setResetSent] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('last_password_reset_sent');
            if (saved) {
                const diff = Math.floor((Date.now() - parseInt(saved, 10)) / 1000);
                if (diff < 60) {
                    return 60 - diff;
                }
            }
        } catch (e) {
            console.warn("localStorage error:", e);
        }
        return 0;
    });

    const navigate = useNavigate();

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    useEffect(() => {
        if (cooldown === 0 && error && (
            error.toLowerCase().includes('rate limit') || 
            error.toLowerCase().includes('too many requests') ||
            error.toLowerCase().includes('once every 60 seconds')
        )) {
            setError(null);
        }
    }, [cooldown, error]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            console.log("Attempting login for:", email);
            
            const loginPromise = supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            const timeoutPromise = new Promise<any>((_, reject) => 
                setTimeout(() => reject(new Error("La connexion prend plus de temps que prévu. Veuillez vérifier votre connexion internet.")), 30000)
            );

            const { error } = await Promise.race([loginPromise, timeoutPromise]);

            if (error) throw error;
            
            console.log("Login successful, relying on App's auth listener for navigation.");
        } catch (err: any) {
            if (err.message && err.message.toLowerCase().includes('invalid login credentials')) {
                console.warn("Login failed: Invalid credentials");
            } else {
                console.error("Login error:", err);
            }
            setError(err.message || 'Une erreur est survenue lors de la connexion.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cooldown > 0) {
            setError(`Veuillez patienter ${cooldown} secondes avant de pouvoir renvoyer un e-mail.`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log("Attempting password reset for:", email);
            
            const redirectUrl = `${window.location.origin}${window.location.pathname}`;
            console.log("Using redirect URL:", redirectUrl);

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: redirectUrl,
            });

            if (resetError) throw resetError;

            setResetSent(true);
            setSuccessMessage("Un e-mail de réinitialisation de mot de passe a été envoyé. Veuillez vérifier votre boîte de réception.");
            localStorage.setItem('last_password_reset_sent', Date.now().toString());
            setCooldown(60);
        } catch (err: any) {
            console.error("Forgot password error:", err);
            const errMsg = err.message || '';
            const isRateLimit = errMsg.toLowerCase().includes('rate limit exceeded') || 
                                errMsg.toLowerCase().includes('too many requests') ||
                                errMsg.toLowerCase().includes('once every 60 seconds');
            
            if (isRateLimit) {
                localStorage.setItem('last_password_reset_sent', Date.now().toString());
                setCooldown(60);
            }
            setError(err.message || 'Une erreur est survenue lors de la demande de réinitialisation.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                        <Files size={24} />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-neutral-900">
                    {view === 'login' ? 'Connexion Facturago' : 'Mot de passe oublié'}
                </h2>
                <p className="mt-2 text-center text-sm text-neutral-600">
                    {view === 'login' 
                        ? 'Accédez à votre espace de gestion et facturation.' 
                        : 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.'}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-md sm:rounded-xl sm:px-10 border border-neutral-200">
                    {error && (
                        <div className="mb-6 rounded-lg bg-red-50 p-4 relative border border-red-200">
                            <button 
                                type="button" 
                                onClick={() => setError(null)}
                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 focus:outline-none cursor-pointer"
                                title="Fermer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="flex pr-4">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        {view === 'login' ? 'Erreur de connexion' : 'Erreur'}
                                    </h3>
                                    <div className="mt-1 text-sm text-red-700">
                                        <p>{getFriendlyErrorMessage(error, cooldown)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 rounded-lg bg-emerald-50 p-4 border border-emerald-200">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <CheckCircle className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-emerald-800">Succès</h3>
                                    <div className="mt-1 text-sm text-emerald-700">
                                        <p>{successMessage}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'login' ? (
                        <form className="space-y-5" onSubmit={handleLogin}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                                    Adresse Email
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-3 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-neutral-900 shadow-sm"
                                        placeholder="vous@exemple.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                                        Mot de passe
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setView('forgot_password');
                                            setError(null);
                                            setSuccessMessage(null);
                                            setResetSent(false);
                                        }}
                                        className="font-medium text-emerald-600 hover:text-emerald-500 text-xs cursor-pointer"
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-3 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-neutral-900 shadow-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex w-full justify-center rounded-lg border border-transparent bg-emerald-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    id="login-submit-btn"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        <span>Se connecter</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="space-y-5" onSubmit={handleForgotPassword}>
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-700">
                                    Adresse Email
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="reset-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={resetSent}
                                        className="block w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-3 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-neutral-900 shadow-sm disabled:bg-neutral-50 disabled:text-neutral-500"
                                        placeholder="vous@exemple.com"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading || resetSent || cooldown > 0}
                                    className="flex w-full justify-center rounded-lg border border-transparent bg-emerald-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : cooldown > 0 ? (
                                        <span>Patienter {cooldown}s</span>
                                    ) : (
                                        <span>Envoyer le lien de réinitialisation</span>
                                    )}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => {
                                        setView('login');
                                        setError(null);
                                        setSuccessMessage(null);
                                        setResetSent(false);
                                    }}
                                    className="flex items-center justify-center gap-1.5 font-medium text-neutral-600 hover:text-neutral-900 text-xs py-2 cursor-pointer transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Retour à la connexion
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
