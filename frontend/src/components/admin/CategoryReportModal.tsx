import React, { useEffect, useMemo, useState } from 'react';
import AdminModal from '@/components/admin/AdminModal';
import {
  CATEGORY_REPORT_SECTIONS,
  type CategoryReportDatePreset,
  type CategoryReportOptions,
  type CategoryReportSection,
} from '@/utils/adminCategoryReport';

interface CategoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: CategoryReportOptions) => void;
  isGenerating?: boolean;
}

const defaultSections: CategoryReportSection[] = CATEGORY_REPORT_SECTIONS
  .filter((item) => item.primary)
  .map((item) => item.value);

const CategoryReportModal: React.FC<CategoryReportModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
}) => {
  const [selectedSections, setSelectedSections] = useState<CategoryReportSection[]>(defaultSections);
  const [datePreset, setDatePreset] = useState<CategoryReportDatePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSections(defaultSections);
    setDatePreset('30d');
    setCustomFrom('');
    setCustomTo('');
  }, [isOpen]);

  const canGenerate = useMemo(() => {
    if (selectedSections.length === 0) return false;
    if (datePreset !== 'custom') return true;
    return Boolean(customFrom && customTo);
  }, [customFrom, customTo, datePreset, selectedSections.length]);

  const toggleSection = (value: CategoryReportSection) => {
    setSelectedSections((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleGenerate = () => {
    if (!canGenerate || isGenerating) return;

    onGenerate({
      sections: selectedSections,
      datePreset,
      customFrom: datePreset === 'custom' ? customFrom : undefined,
      customTo: datePreset === 'custom' ? customTo : undefined,
    });
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Generate Categories PDF Report" size="lg">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-600">
            Generate a categories report with category and attribute information.
            Header and footer style follows the product PDF format.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-800">Report Sections</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {CATEGORY_REPORT_SECTIONS.map((item) => {
              const checked = selectedSections.includes(item.value);
              return (
                <label
                  key={item.value}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    checked ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(item.value)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-800">Date Range</h4>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <select
              value={datePreset}
              onChange={(event) => setDatePreset(event.target.value as CategoryReportDatePreset)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="this-month">This month</option>
              <option value="custom">Custom range</option>
            </select>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
};

export default CategoryReportModal;
