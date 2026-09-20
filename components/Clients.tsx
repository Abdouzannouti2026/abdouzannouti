
import React, { useState, useEffect } from 'react';
import Header from './Header';
import AddClientModal from './AddClientModal';
import ImportClientsModal from './ImportClientsModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, Users, Search, Building2, User, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Client } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ClientsProps {
    clients: Client[];
    onAddClient: (client: Omit<Client, 'id' | 'clientCode'>) => void;
    onUpdateClient: (client: Client) => void;
    onDeleteClient: (clientId: string) => void;
    onDeleteClients: (clientIds: string[]) => void;
}

const Clients: React.FC<ClientsProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient, onDeleteClients }) => {
    const { t, isRTL, language } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [clientIdToDelete, setClientIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredClients = clients.filter(client => {
        const term = searchTerm.toLowerCase();
        return (
            (client.name?.toLowerCase() || '').includes(term) ||
            (client.company?.toLowerCase() || '').includes(term) ||
            (client.email?.toLowerCase() || '').includes(term) ||
            (client.phone?.toLowerCase() || '').includes(term) ||
            (client.clientCode?.toLowerCase() || '').includes(term) ||
            (client.ice?.toLowerCase() || '').includes(term)
        );
    });

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    const handleAddClick = () => {
        setClientToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (client: Client) => {
        setClientToEdit(client);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (clientId: string) => {
        setClientIdToDelete(clientId);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = () => {
        if (clientIdToDelete) {
            onDeleteClient(clientIdToDelete);
        }
        setIsConfirmOpen(false);
        setClientIdToDelete(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedClientIds(filteredClients.map(c => c.id));
        } else {
            setSelectedClientIds([]);
        }
    };

    const handleSelectClient = (clientId: string) => {
        setSelectedClientIds(prev =>
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    const handleBulkDelete = () => {
        if (selectedClientIds.length > 0) {
            setIsBulkConfirmOpen(true);
        }
    };

    const confirmBulkDeletion = () => {
        onDeleteClients(selectedClientIds);
        setSelectedClientIds([]);
        setIsBulkConfirmOpen(false);
    };

    const handleSaveClient = (clientData: Omit<Client, 'id' | 'clientCode'>, id?: string) => {
        if (id) {
            const existingClient = clients.find(c => c.id === id);
            if (existingClient) {
                onUpdateClient({ ...existingClient, ...clientData });
            }
        } else {
            onAddClient(clientData);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <Header title={t('clients')}>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="btn-secondary px-3.5 py-2.5"
                    >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('import')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="btn-primary px-3.5 py-2.5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('addClient')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>

            <ImportClientsModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImport={(importedClients) => {
                    importedClients.forEach(client => onAddClient(client));
                }}
            />

            <AddClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveClient}
                clientToEdit={clientToEdit}
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeletion}
            />

            <ConfirmationModal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                onConfirm={confirmBulkDeletion}
                title={t('confirmBulkDelete')}
                message={t('confirmBulkDeleteMessage', { count: selectedClientIds.length })}
            />

            <div className="table-wrapper">
                 <div className="p-4 border-b border-slate-200/80 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-80">
                                <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                                   <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('search')}
                                    className={`block w-full rounded-xl border-slate-200 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                />
                            </div>
                            <div className="md:hidden flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-semibold text-slate-600">{t('selectAll')}</span>
                            </div>
                        </div>
                        {selectedClientIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition-all"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{t('deleteSelected')} ({selectedClientIds.length})</span>
                            </button>
                        )}
                    </div>
                 </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr>
                                <th scope="col" className="table-th px-6 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                </th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('code')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')} / {t('company')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('coordinates')}</th>
                                <th scope="col" className={`table-th px-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className="table-th px-6 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedClients.length > 0 ? (
                                paginatedClients.map((client) => {
                                    const isCompany = client.type === 'Entreprise' || (!client.type && client.company);
                                    
                                    return (
                                    <tr key={client.id} className={`hover:bg-slate-50/80 transition-colors duration-150 ${selectedClientIds.includes(client.id) ? 'bg-emerald-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedClientIds.includes(client.id)}
                                                onChange={() => handleSelectClient(client.id)}
                                                className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-mono text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{client.clientCode}</td>
                                        <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${isCompany ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {isCompany ? <Building2 size={16} /> : <User size={16} />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {isCompany ? client.company : client.name}
                                                    </div>
                                                    {isCompany && client.ice && (
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{t('ice')}: {client.ice}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {isCompany ? client.name : '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-sm text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div>{client.email}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{client.phone}</div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={isCompany ? 'badge-info' : 'badge-success'}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                            <div className={`flex items-center justify-end gap-1.5 ${isRTL ? 'space-x-reverse' : ''}`}>
                                                <button 
                                                    onClick={() => handleEditClick(client)} 
                                                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(client.id)} 
                                                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 px-6">
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3.5">
                                                <Users className="h-7 w-7" strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-800">
                                                {searchTerm ? t('noFinancialData') : t('noClients')}
                                            </h3>
                                            {!searchTerm && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {language === 'es' ? 'Comience añadiendo su premier cliente.' : 'Commencez par ajouter votre premier client.'}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {paginatedClients.length > 0 ? (
                        paginatedClients.map((client) => {
                            const isCompany = client.type === 'Entreprise' || (!client.type && client.company);
                            return (
                                <div key={client.id} className={`p-4 hover:bg-slate-50/80 transition-colors ${selectedClientIds.includes(client.id) ? 'bg-emerald-50/40' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClientIds.includes(client.id)}
                                                    onChange={() => handleSelectClient(client.id)}
                                                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${isCompany ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {isCompany ? <Building2 size={18} /> : <User size={18} />}
                                                </div>
                                            </div>
                                            <div className={`${isRTL ? 'mr-3' : 'ml-3'} min-w-0`}>
                                                <div className="text-sm font-bold text-slate-900 truncate">
                                                    {isCompany ? client.company : client.name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">{client.clientCode}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleEditClick(client)} 
                                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(client.id)} 
                                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 pt-1">
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-slate-500">{t('type')}</span>
                                            <span className={isCompany ? 'badge-info' : 'badge-success'}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </div>
                                        {client.email && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">{t('email')}</span>
                                                <span className="text-slate-800 font-medium truncate max-w-[180px]">{client.email}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">{t('phone')}</span>
                                                <span className="text-slate-800 font-medium">{client.phone}</span>
                                            </div>
                                        )}
                                        {isCompany && client.name && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">{t('contact')}</span>
                                                <span className="text-slate-800 font-medium">{client.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                            <h3 className="text-base font-bold text-slate-800">
                                {searchTerm ? t('noFinancialData') : t('noClients')}
                            </h3>
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-200/80">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary px-3 py-1.5 text-xs"
                            >
                                {isRTL ? 'التالي' : 'Précédent'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary px-3 py-1.5 text-xs"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Affichage de <span className="font-semibold text-slate-800">{startIndex + 1}</span> à <span className="font-semibold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredClients.length)}</span> sur <span className="font-semibold text-slate-800">{filteredClients.length}</span> clients
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {getPageNumbers().map((page, i) => (
                                    <React.Fragment key={i}>
                                        {page === '...' ? (
                                            <span className="px-3 py-1.5 text-xs text-slate-400 font-medium">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setCurrentPage(page as number)}
                                                className={`min-w-[34px] h-[34px] flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${currentPage === page ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {page}
                                            </button>
                                        )}
                                    </React.Fragment>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Clients;
