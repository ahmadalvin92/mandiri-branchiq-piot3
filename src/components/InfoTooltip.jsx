import React, { useState, useRef, useEffect } from 'react';
import { Info, X, ExternalLink, Lightbulb, Sparkles, BookOpen } from 'lucide-react';
import { getMetricKnowledge, getCategoryKnowledge, getGlossaryTerm } from '../utils/knowledgeBase';

/**
 * Reusable Info Tooltip & Popover
 * Supports Hover (Desktop) and Click / Tap (Mobile & Touch)
 */
export function InfoTooltip({
  type = 'custom', // 'metric' | 'category' | 'term' | 'custom'
  item = null,     // Metric row object when type='metric'
  id = null,       // Category ID when type='category' (e.g. 'DPK', 'Kredit')
  term = null,     // Term key when type='term' (e.g. 'HK', 'Bobot', 'Acv')
  title = null,
  description = null,
  badge = null,
  tips = null,
  align = 'center', // 'left' | 'right' | 'center'
  trigger = null,   // Custom trigger element or null for default icon
  iconSize = 'w-3.5 h-3.5',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Resolve content based on type
  let resolvedTitle = title;
  let resolvedSubtitle = null;
  let resolvedBadge = badge;
  let resolvedDesc = description;
  let resolvedImportance = tips;
  let resolvedUnit = null;
  let isZeroWeight = false;

  if (type === 'metric' && item) {
    const k = getMetricKnowledge(item);
    resolvedTitle = item.subMetric && item.subMetric !== item.metric
      ? `${item.metric} — ${item.subMetric}`
      : (item.metric || item.name);
    resolvedSubtitle = `Kategori: ${item.category}`;
    resolvedUnit = item.unit || (item.isPct ? '%' : null);
    resolvedDesc = k.definition || `Metrik kinerja ${resolvedTitle} pada kategori ${item.category}.`;
    resolvedImportance = k.importance || null;
    isZeroWeight = !item.used || item.bobot === 0;
    resolvedBadge = isZeroWeight
      ? 'Bobot 0% (Hanya Monitoring)'
      : `Bobot ${(item.bobot * 100).toFixed(1).replace('.0', '')}% (${item.maxScore} Poin)`;
  } else if (type === 'category') {
    const catKey = id || item?.category;
    const cat = getCategoryKnowledge(catKey);
    if (cat) {
      resolvedTitle = `${cat.shortName} — ${cat.name}`;
      resolvedBadge = `Nilai Maksimal: ${cat.maxScore} Poin`;
      resolvedDesc = cat.definition;
      resolvedImportance = `${cat.importance} ${cat.tacticalTip ? `Tips: ${cat.tacticalTip}` : ''}`;
    } else {
      resolvedTitle = `Kategori ${catKey}`;
      resolvedDesc = `Rincian metrik dan penilaian kinerja pada kategori ${catKey}.`;
    }
  } else if (type === 'term') {
    const termKey = term || id;
    const t = getGlossaryTerm(termKey);
    if (t) {
      resolvedTitle = t.title;
      resolvedDesc = t.definition;
      resolvedImportance = t.purpose ? `Fungsi: ${t.purpose}` : null;
      resolvedBadge = 'Istilah Scorecard';
    } else {
      resolvedTitle = termKey;
      resolvedDesc = description || `Penjelasan istilah ${termKey} pada scorecard Bank Mandiri.`;
    }
  }

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  // Alignment classes for floating popup
  const alignClass =
    align === 'left'
      ? 'left-0 origin-top-left'
      : align === 'right'
        ? 'right-0 origin-top-right'
        : 'left-1/2 -translate-x-1/2 origin-top';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger: Either custom element or standard Info icon button */}
      {trigger ? (
        <div
          onClick={handleClick}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
        >
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="p-0.5 rounded-full text-slate-400 hover:text-[#003D79] hover:bg-blue-50/80 transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#003D79]/40"
          title={`Lihat penjelasan: ${resolvedTitle || 'Informasi'}`}
          aria-label={`Info ${resolvedTitle || ''}`}
        >
          <Info className={iconSize} />
        </button>
      )}

      {/* Floating Tooltip / Popover Bubble */}
      {isOpen && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-50 w-72 sm:w-80 p-3.5 bg-white text-slate-800 rounded-xl shadow-2xl border-2 border-[#003D79] text-left animate-in fade-in zoom-in-95 duration-150 ${alignClass}`}
          style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 37, 77, 0.15))' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="min-w-0">
              {resolvedBadge && (
                <span
                  className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded mb-1 uppercase tracking-wider ${
                    isZeroWeight
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-blue-100 text-[#003D79]'
                  }`}
                >
                  {resolvedBadge}
                </span>
              )}
              <h5 className="font-extrabold text-xs sm:text-sm text-[#00254D] leading-snug">
                {resolvedTitle}
              </h5>
              {resolvedSubtitle && (
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {resolvedSubtitle} {resolvedUnit ? `• Satuan: ${resolvedUnit}` : ''}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Definition Body */}
          <div className="py-2.5 text-[11px] leading-relaxed text-slate-600 font-medium">
            <p>{resolvedDesc}</p>
          </div>

          {/* Importance & Practical Tip */}
          {resolvedImportance && (
            <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[10px] text-[#003D79] leading-relaxed flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#FFB81C] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Kenapa Penting: </strong>
                <span>{resolvedImportance}</span>
              </div>
            </div>
          )}

          {/* Zero Weight Guidance */}
          {isZeroWeight && (
            <div className="mt-2 p-1.5 rounded-lg bg-amber-50 text-[10px] text-amber-900 font-bold leading-tight">
              ⚠️ Metrik ini tidak dihitung ke skor total cabang (hanya monitoring kuota operasional).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
