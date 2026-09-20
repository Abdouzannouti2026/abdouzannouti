import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Printer, Receipt, Store, Smartphone, Sliders, 
  Check, Info, Eye, ShieldCheck, Barcode as BarcodeIcon, 
  RotateCcw, Sparkles
} from 'lucide-react';
import { CompanySettings, Client, Supplier } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  printThermalTicket, 
  generateThermalTicketHtml, 
  ThermalTicketOptions,
  DocumentData 
} from '../services/pdfService';

interface ThermalTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentData | null;
  settings: CompanySettings | null;
  recipient?: Client | Supplier;
  onSaveSettings?: (settings: CompanySettings) => Promise<void>;
}

export const ThermalTicketModal: React.FC<ThermalTicketModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  settings,
  recipient,
  onSaveSettings
}) => {
  const { language, isRTL } = useLanguage();

  // Load saved preference or fallback to settings/80mm
  const savedWidth = (localStorage.getItem('facturago_preferred_thermal_width') as '80mm' | '58mm' | 'custom') 
    || settings?.defaultThermalTicketWidth 
    || '80mm';

  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm' | 'custom'>(
    savedWidth === '58mm' ? '58mm' : savedWidth === 'custom' ? 'custom' : '80mm'
  );
  const [customWidthMm, setCustomWidthMm] = useState<number>(76);
  const [fontStyle, setFontStyle] = useState<'modern' | 'mono'>('modern');
  const [logoSize, setLogoSize] = useState<'small' | 'medium'>('small');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showCompanyInfo, setShowCompanyInfo] = useState<boolean>(true);
  const [showIce, setShowIce] = useState<boolean>(true);
  const [showCustomer, setShowCustomer] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [footerNotes, setFooterNotes] = useState<string>(
    settings?.footerNotes || (language === 'ar' ? 'شكراً لزيارتكم ونتمنى رؤيتكم قريباً !' : 'Merci pour votre visite et à très bientôt !')
  );
  const [rememberPreference, setRememberPreference] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<'preview' | 'options'>('preview');

  useEffect(() => {
    if (settings?.footerNotes) {
      setFooterNotes(settings.footerNotes);
    }
  }, [settings?.footerNotes]);

  if (!isOpen || !doc) return null;

  const currentOptions: ThermalTicketOptions = {
    width: ticketWidth === 'custom' ? `${customWidthMm}mm` : ticketWidth,
    customWidthMm: ticketWidth === 'custom' ? customWidthMm : (ticketWidth === '58mm' ? 58 : 80),
    fontStyle,
    logoSize: !showLogo ? 'none' : logoSize,
    showLogo,
    showCompanyInfo,
    showIce,
    showCustomer,
    showBarcode,
    footerNotes,
    isPrintMode: false
  };

  const handlePrint = () => {
    if (rememberPreference) {
      localStorage.setItem('facturago_preferred_thermal_width', ticketWidth);
      if (onSaveSettings && settings && (ticketWidth === '80mm' || ticketWidth === '58mm')) {
        onSaveSettings({
          ...settings,
          defaultThermalTicketWidth: ticketWidth
        }).catch(() => {});
      }
    }
    printThermalTicket(doc, settings, recipient, {
      ...currentOptions,
      isPrintMode: true
    });
  };

  const previewHtml = generateThermalTicketHtml(doc, settings, recipient, {
    ...currentOptions,
    isPrintMode: false
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Dialog Box */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-white sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-slate-100 overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {language === 'ar' ? 'طباعة تذكرة الصندوق (حرارية)' : 'Imprimer Ticket de Caisse'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {ticketWidth === '58mm' ? '58 mm' : ticketWidth === 'custom' ? `${customWidthMm} mm` : '80 mm'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                {language === 'ar' ? 'تخصيص الحجم وإعدادات الطابعة الحرارية' : 'Format adapté aux imprimantes de caisse & rouleaux thermiques'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Navigation Tabs (visible only on mobile/tablet < lg) */}
        <div className="lg:hidden flex border-b border-slate-200 bg-slate-100/90 p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
              mobileTab === 'preview'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye size={15} />
            <span>{language === 'ar' ? 'معاينة التذكرة' : 'Aperçu du ticket'}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
              {ticketWidth === '58mm' ? '58mm' : ticketWidth === 'custom' ? `${customWidthMm}mm` : '80mm'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('options')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
              mobileTab === 'options'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders size={15} />
            <span>{language === 'ar' ? 'الإعدادات والخيارات' : 'Options & Style'}</span>
          </button>
        </div>

        {/* Modal Body: Split view on desktop, tabbed on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* Left Panel: Options & Controls */}
          <div className={`${mobileTab === 'options' ? 'block' : 'hidden'} lg:block lg:col-span-7 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto`}>
            
            {/* Format Selector Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-emerald-600" />
                  {language === 'ar' ? 'اختر مقاس الطابعة الحرارية' : 'Taille de l\'imprimante thermique'}
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {language === 'ar' ? 'حسب نوع الطابعة' : 'Selon votre matériel'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {/* 80mm Card */}
                <button
                  type="button"
                  onClick={() => setTicketWidth('80mm')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[44px] ${
                    ticketWidth === '80mm'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {ticketWidth === '80mm' && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-2 rounded-xl ${ticketWidth === '80mm' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Store size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">80 mm (Standard)</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">Rouleau caisse 3"</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {language === 'ar'
                      ? 'لطابعات الكاشيه الثابتة (Epson TM, Xprinter 80, Bixolon, Sunmi)'
                      : 'Pour imprimantes de caisse fixes de magasin (Epson TM-T20, Xprinter 80, etc.)'}
                  </p>
                </button>

                {/* 58mm Card */}
                <button
                  type="button"
                  onClick={() => setTicketWidth('58mm')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[44px] ${
                    ticketWidth === '58mm'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {ticketWidth === '58mm' && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-2 rounded-xl ${ticketWidth === '58mm' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">58 mm (Compact)</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">Rouleau portable 2"</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {language === 'ar'
                      ? 'للطابعات المحمولة والبلوتوث (POS-58, Goojprt, MPT-II)'
                      : 'Pour mini imprimantes de poche, livreurs et Bluetooth (POS-58, Goojprt...)'}
                  </p>
                </button>
              </div>

              {/* Custom Width Toggle */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTicketWidth(ticketWidth === 'custom' ? '80mm' : 'custom')}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-600 flex items-center gap-1.5 transition-colors min-h-[40px]"
                >
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${ticketWidth === 'custom' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                    {ticketWidth === 'custom' && <Check size={10} />}
                  </span>
                  {language === 'ar' ? 'تخصيص عرض آخر (ملم)' : 'Définir une largeur personnalisée'}
                </button>

                {ticketWidth === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="40" 
                      max="120" 
                      value={customWidthMm} 
                      onChange={(e) => setCustomWidthMm(Math.max(40, Math.min(120, Number(e.target.value) || 80)))}
                      className="w-16 px-2 py-1 text-xs text-center font-bold border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">mm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Display Toggles */}
            <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-3.5">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {language === 'ar' ? 'خيارات المحتوى ومظهر التذكرة' : 'Éléments & style du ticket'}
              </div>

              {/* Style & Font Selector */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{language === 'ar' ? 'نمط الخط (Typographie)' : 'Style de police (Typographie)'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {fontStyle === 'modern' ? 'Sans-serif POS' : 'Monospace ESC/POS'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFontStyle('modern')}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all text-center min-h-[40px] ${
                      fontStyle === 'modern'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'عصري ونظيف (Moderne)' : 'Moderne (Nette & dense)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontStyle('mono')}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all text-center font-mono min-h-[40px] ${
                      fontStyle === 'mono'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'كلاسيكي (Monospace)' : 'Classique (Caisse Mono)'}
                  </button>
                </div>
              </div>

              {/* Logo Size Selector if Logo is available */}
              {settings?.logo && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700">
                      {language === 'ar' ? 'حجم الشعار (Logo)' : 'Taille du Logo'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {logoSize === 'small' ? 'Discret (Recommandé)' : logoSize === 'medium' ? 'Moyen' : 'Désactivé'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setShowLogo(true); setLogoSize('small'); }}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all text-center min-h-[38px] ${
                        showLogo && logoSize === 'small'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'ar' ? 'صغير' : 'Discret (Petit)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowLogo(true); setLogoSize('medium'); }}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all text-center min-h-[38px] ${
                        showLogo && logoSize === 'medium'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'ar' ? 'متوسط' : 'Moyen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLogo(false)}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all text-center min-h-[38px] ${
                        !showLogo
                          ? 'bg-slate-200 border-slate-400 text-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'ar' ? 'بدون شعار' : 'Masqué'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer text-xs font-medium text-slate-700 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={showCompanyInfo}
                    onChange={(e) => setShowCompanyInfo(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>{language === 'ar' ? 'العنوان والهاتف' : 'Adresse & Téléphone'}</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer text-xs font-medium text-slate-700 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={showIce}
                    onChange={(e) => setShowIce(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>{language === 'ar' ? 'رقم التعريف الموحد (ICE)' : 'Identifiant ICE & RC'}</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer text-xs font-medium text-slate-700 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={showCustomer}
                    onChange={(e) => setShowCustomer(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>{language === 'ar' ? 'اسم الزبون' : 'Nom du client'}</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer text-xs font-medium text-slate-700 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="flex items-center gap-1.5">
                    <BarcodeIcon size={14} className="text-slate-500" />
                    <span>{language === 'ar' ? 'باركود التذكرة' : 'Code-barres'}</span>
                  </span>
                </label>
              </div>

              {/* Footer Note */}
              <div className="pt-2 border-t border-slate-200/60">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'ar' ? 'رسالة نهاية التذكرة' : 'Message de pied de ticket'}
                </label>
                <input
                  type="text"
                  value={footerNotes}
                  onChange={(e) => setFooterNotes(e.target.value)}
                  placeholder="Merci pour votre visite !"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[40px]"
                />
              </div>
            </div>

            {/* Remember Preference Checkbox */}
            <div className="flex items-center gap-2 px-1 min-h-[40px]">
              <input
                type="checkbox"
                id="remember_thermal"
                checked={rememberPreference}
                onChange={(e) => setRememberPreference(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <label htmlFor="remember_thermal" className="text-xs text-slate-600 font-medium cursor-pointer">
                {language === 'ar' ? 'حفظ هذا المقاس كخيار افتراضي دائماً' : 'Mémoriser ce format pour mes prochaines impressions'}
              </label>
            </div>

            {/* Crucial Instructions Banner */}
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/70 flex gap-3 text-amber-900">
              <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="font-bold block text-amber-950 mb-0.5">
                  {language === 'ar' ? 'نصيحة لتفادي خروج الصفحة بحجم A4:' : 'Conseil pour éviter la feuille A4 :'}
                </strong>
                {language === 'ar' ? (
                  <span>
                    في نافذة الطباعة الخاصة بالمتصفح، حدد <strong>طابعتك الحرارية</strong> في خانة <strong>Destination</strong>، وفي قسم <strong>مزيد من الإعدادات (Plus de paramètres)</strong>، اختر <strong>الهوامش: لا شيء (Marges: Aucune)</strong>.
                  </span>
                ) : (
                  <span>
                    Dans la fenêtre d'impression, choisissez votre <strong>imprimante thermique</strong> comme <strong>Destination</strong>. Sous <strong>Plus de paramètres</strong>, réglez <strong>Marges : Aucune</strong>.
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Live Receipt Preview */}
          <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 bg-slate-100/70 p-3 sm:p-5 flex-col items-center justify-start overflow-y-auto`}>
            
            {/* Quick Size Switcher on Top of Preview (Convenient for mobile & desktop) */}
            <div className="w-full flex items-center justify-between gap-2 mb-2.5 bg-white/95 px-3 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-600" />
                <span>{language === 'ar' ? 'مقاس الورق:' : 'Format :'}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTicketWidth('80mm')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                    ticketWidth === '80mm'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  80 mm
                </button>
                <button
                  type="button"
                  onClick={() => setTicketWidth('58mm')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                    ticketWidth === '58mm'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  58 mm
                </button>
                {ticketWidth === 'custom' && (
                  <span className="px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg">
                    {customWidthMm} mm
                  </span>
                )}
              </div>
            </div>

            {/* Authentic Thermal Paper Roll Look */}
            <div className="w-full flex justify-center py-2 overflow-x-auto max-w-full">
              <div 
                className="bg-white text-black shadow-xl rounded-sm border border-slate-200 relative transition-all duration-300 max-w-full"
                style={{
                  width: ticketWidth === '58mm' ? '240px' : ticketWidth === 'custom' ? `${Math.min(300, Math.max(190, customWidthMm * 3.6))}px` : '290px',
                  minHeight: '340px'
                }}
              >
                {/* Sawtooth top edge (jagged paper tear) */}
                <div 
                  className="h-2 w-full opacity-60"
                  style={{
                    backgroundImage: 'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                    backgroundSize: '8px 8px'
                  }}
                />

                <div className="p-1">
                  <iframe
                    title="Receipt Preview"
                    srcDoc={previewHtml}
                    className="w-full border-0 pointer-events-none"
                    style={{
                      height: '460px',
                      overflow: 'hidden'
                    }}
                  />
                </div>

                {/* Sawtooth bottom edge */}
                <div 
                  className="h-2.5 w-full bg-slate-200/40 relative overflow-hidden"
                  style={{
                    clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'
                  }}
                />
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center mt-3">
              {language === 'ar' ? 'العرض الفعلي سيتطابق مع قياس رول الورق الخاص بطابعتك' : 'La hauteur du rouleau sera découpée automatiquement au bas du ticket'}
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors min-h-[44px]"
          >
            {language === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            {mobileTab === 'options' && (
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 text-xs font-bold rounded-xl transition-all min-h-[44px]"
              >
                <Eye size={15} />
                <span>{language === 'ar' ? 'معاينة' : 'Aperçu'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] min-h-[44px]"
            >
              <Printer size={16} />
              <span>{language === 'ar' ? 'طباعة التذكرة' : 'Imprimer le ticket'}</span>
              <span className="opacity-80 font-normal text-[11px] px-1.5 py-0.5 bg-white/20 rounded-md">
                {ticketWidth === '58mm' ? '58mm' : ticketWidth === 'custom' ? `${customWidthMm}mm` : '80mm'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ThermalTicketModal;
