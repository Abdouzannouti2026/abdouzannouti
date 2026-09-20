
import React, { useEffect, useState } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { CompanySettings } from '../types';
import { dbService } from '../db';
import { Building, Mail, ShieldCheck, UserCircle, Lock, User as UserIcon, Settings, ChevronRight, Key } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const UserProfile: React.FC = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Get Auth User
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                // Get Business Settings
                const settingsData = await dbService.settings.get();
                setSettings(settingsData);
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg(null);

        const minLen = language === 'es' ? 'La contraseña debe tener al menos 6 caracteres.' : 'Le mot de passe doit contenir au moins 6 caractères.';
        const matchError = language === 'es' ? 'Las contraseñas no coinciden.' : 'Les mots de passe ne correspondent pas.';
        const successMsg = language === 'es' ? 'Contraseña actualizada con éxito.' : 'Votre mot de passe a été mis à jour avec succès.';

        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: minLen });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: matchError });
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            
            setPasswordMsg({ type: 'success', text: successMsg });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPasswordMsg({ type: 'error', text: error.message || 'Error.' });
        } finally {
            setPasswordLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            <Header title={t('profile')} />

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-200 overflow-hidden mb-8">
                {/* Banner Header */}
                <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-8 py-10 text-white relative overflow-hidden">
                    {/* Decorative pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner border-2 border-white/30">
                            <UserCircle size={64} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold">{settings?.companyName || (language === 'es' ? "Usuario" : "Utilisateur")} Facturago</h2>
                            <p className="text-emerald-100 font-medium opacity-90 flex items-center gap-2 mt-1">
                                {user?.email}
                            </p>
                        </div>
                        <button 
                            onClick={() => navigate('/settings')}
                            className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20 text-sm font-medium"
                        >
                            <Settings size={16} /> {t('edit')}
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Colonne Gauche : Informations */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-6">
                                <UserIcon className="text-emerald-600" size={24}/> 
                                <h3 className="text-xl font-bold text-neutral-800">{language === 'es' ? 'Datos de la cuenta' : 'Informations du Compte'}</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Nom de l'entreprise */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 ml-1">{language === 'es' ? 'Empresa' : "Nom de l'entreprise"}</label>
                                    <div 
                                        onClick={() => navigate('/settings')}
                                        className="group cursor-pointer flex items-center justify-between gap-4 text-neutral-900 bg-neutral-50 p-4 rounded-xl border border-neutral-200 shadow-sm transition-all hover:border-emerald-300 hover:bg-white"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600 group-hover:text-emerald-700">
                                                <Building size={20}/>
                                            </div>
                                            <span className={`font-semibold text-lg ${!settings?.companyName ? 'text-neutral-400 italic' : ''}`}>
                                                {settings?.companyName || (language === 'es' ? "No configurado" : "Non configuré")}
                                            </span>
                                        </div>
                                        <ChevronRight size={20} className="text-neutral-300 group-hover:text-emerald-500 transition-colors"/>
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 ml-1">{language === 'es' ? 'Correo electrónico' : 'Email de connexion'}</label>
                                    <div className="flex items-center gap-4 text-neutral-900 bg-neutral-50 p-4 rounded-xl border border-neutral-200 shadow-sm">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                                            <Mail size={20}/>
                                        </div>
                                        <span className="font-semibold text-lg">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Colonne Droite : Sécurité & Mot de passe */}
                        <div>
                            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-6">
                                <ShieldCheck className="text-emerald-600" size={24}/> 
                                <h3 className="text-xl font-bold text-neutral-800">{language === 'es' ? 'Seguridad' : 'Sécurité & Mot de passe'}</h3>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                                <h4 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4">
                                    <Key size={18} className="text-emerald-600"/> {language === 'es' ? 'Cambiar contraseña' : 'Changer le mot de passe'}
                                </h4>
                                
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">{language === 'es' ? 'Nueva contraseña' : 'Nouveau mot de passe'}</label>
                                        <input 
                                            type="password" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">{language === 'es' ? 'Confirmar contraseña' : 'Confirmer le mot de passe'}</label>
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                        />
                                    </div>

                                    {passwordMsg && (
                                        <div className={`text-sm p-3 rounded-lg ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {passwordMsg.text}
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={passwordLoading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
                                    >
                                        {passwordLoading ? (
                                            <span>{language === 'es' ? 'Actualizando...' : 'Mise à jour...'}</span>
                                        ) : (
                                            <span>{language === 'es' ? 'Actualizar' : 'Mettre à jour'}</span>
                                        )}
                                    </button>
                                </form>
                            </div>
                            
                            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                                <Lock size={14} /> {language === 'es' ? 'Su cuenta es segura.' : 'Votre compte est sécurisé via Supabase Auth.'}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
