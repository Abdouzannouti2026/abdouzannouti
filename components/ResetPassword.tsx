import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Files, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResetPasswordProps {
    onClose: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Simple validation
        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setIsLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setSuccess(true);
            
            // Clean up url hashes/queries so the recovery tokens do not stay active in the browser history
            try {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch (historyErr) {
                console.warn('Failed to clear OAuth hash from URL:', historyErr);
            }
        } catch (err: any) {
            console.error('Password reset update error:', err);
            setError(err.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                        <Files size={24} />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-neutral-900">
                    Nouveau mot de passe
                </h2>
                <p className="mt-2 text-center text-sm text-neutral-600">
                    Définissez un mot de passe sécurisé pour votre compte Facturago.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-neutral-200">
                    {success ? (
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center space-y-4"
                        >
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-900">
                                Réinitialisation réussie
                            </h3>
                            <p className="text-sm text-neutral-600">
                                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant accéder à votre tableau de bord.
                            </p>
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                >
                                    Accéder au tableau de bord
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleResetPassword}>
                            {error && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">Erreur de réinitialisation</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <p>{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="password-reset" className="block text-sm font-medium text-neutral-700">
                                    Nouveau mot de passe
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="password-reset"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-md border-neutral-300 pl-10 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                        placeholder="Min. 6 caractères"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password-reset" className="block text-sm font-medium text-neutral-700">
                                    Confirmer le mot de passe
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="confirm-password-reset"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full rounded-md border-neutral-300 pl-10 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 rounded-md border border-slate-300 bg-white py-2 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 flex justify-center items-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-400 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        <span>Enregistrer</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
