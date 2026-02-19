'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   INSURANCE SAVINGS CALCULATORS
   Four calculator cards: Auto, Home, Life, Bundle
   All compute locally — no API calls needed
   ═══════════════════════════════════════════════════════════════════════════ */

interface CalcResult {
  lines: { label: string; value: string; highlight?: boolean }[];
  summary: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyDecimal(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ── Auto Insurance Calculator ───────────────────────────────────────────
function calcAuto(inputs: Record<string, number>): CalcResult {
  const { current_monthly, vehicles, drivers, coverage_type } = inputs;
  // coverage_type: 0=liability, 1=standard, 2=full
  const coverageMultiplier = [0.70, 0.82, 0.88][coverage_type] || 0.82;
  const multiVehicleDiscount = vehicles > 1 ? 0.92 : 1.0;
  const driverDiscount = drivers <= vehicles ? 1.0 : 1.0 + (drivers - vehicles) * 0.05;
  const estimatedMonthly = current_monthly * coverageMultiplier * multiVehicleDiscount * driverDiscount;
  const monthlySavings = current_monthly - estimatedMonthly;
  const annualSavings = monthlySavings * 12;
  const savingsPct = current_monthly > 0 ? ((monthlySavings / current_monthly) * 100) : 0;
  const coverageLabels = ['Liability Only', 'Standard', 'Full Coverage'];

  return {
    lines: [
      { label: 'Current Monthly', value: formatCurrencyDecimal(current_monthly) },
      { label: 'Estimated Monthly', value: formatCurrencyDecimal(Math.max(0, estimatedMonthly)), highlight: true },
      { label: 'Monthly Savings', value: formatCurrencyDecimal(Math.max(0, monthlySavings)), highlight: true },
      { label: 'Annual Savings', value: formatCurrency(Math.max(0, Math.round(annualSavings))), highlight: true },
      { label: 'Savings', value: `${Math.max(0, savingsPct).toFixed(1)}%` },
      { label: 'Coverage', value: coverageLabels[coverage_type] || 'Standard' },
    ],
    summary: `Auto Insurance: ${vehicles} vehicle(s), ${drivers} driver(s), ${coverageLabels[coverage_type] || 'Standard'} coverage. Estimated savings: ${formatCurrency(Math.max(0, Math.round(annualSavings)))}/year (${formatCurrencyDecimal(Math.max(0, monthlySavings))}/mo).`,
  };
}

// ── Home Insurance Calculator ───────────────────────────────────────────
function calcHome(inputs: Record<string, number>): CalcResult {
  const { home_value, current_premium, deductible, coverage_amount } = inputs;
  // Higher deductible = lower premium; coverage ratio affects premium
  const coverageRatio = coverage_amount > 0 && home_value > 0 ? coverage_amount / home_value : 1.0;
  const deductibleFactor = deductible >= 5000 ? 0.78 : deductible >= 2500 ? 0.84 : deductible >= 1000 ? 0.90 : 0.95;
  const ratePer1000 = 3.50 * deductibleFactor * Math.min(coverageRatio, 1.2);
  const estimatedPremium = (coverage_amount / 1000) * ratePer1000;
  const savings = current_premium - estimatedPremium;
  const savingsPct = current_premium > 0 ? ((savings / current_premium) * 100) : 0;

  return {
    lines: [
      { label: 'Home Value', value: formatCurrency(home_value) },
      { label: 'Current Annual Premium', value: formatCurrency(current_premium) },
      { label: 'Estimated Premium', value: formatCurrency(Math.max(0, Math.round(estimatedPremium))), highlight: true },
      { label: 'Estimated Savings', value: formatCurrency(Math.max(0, Math.round(savings))), highlight: true },
      { label: 'Savings', value: `${Math.max(0, savingsPct).toFixed(1)}%` },
      { label: 'Deductible', value: formatCurrency(deductible) },
    ],
    summary: `Home Insurance: ${formatCurrency(home_value)} home, ${formatCurrency(deductible)} deductible. Estimated savings: ${formatCurrency(Math.max(0, Math.round(savings)))}/year vs current ${formatCurrency(current_premium)}/year.`,
  };
}

// ── Life Insurance Needs Calculator ─────────────────────────────────────
function calcLife(inputs: Record<string, number>): CalcResult {
  const { age, income, dependents, debts, existing_coverage } = inputs;
  // DIME method simplified: Debts + Income replacement (10x-20x based on age) + dependents
  const incomeMultiplier = age < 35 ? 18 : age < 45 ? 14 : age < 55 ? 10 : 7;
  const dependentCost = dependents * 150000;
  const recommendedCoverage = (income * incomeMultiplier) + debts + dependentCost;
  const gap = Math.max(0, recommendedCoverage - existing_coverage);
  // Estimate monthly cost: age-based rate per $1000
  const ratePerThousand = age < 30 ? 0.55 : age < 40 ? 0.75 : age < 50 ? 1.20 : age < 60 ? 2.10 : 3.80;
  const estimatedMonthly = (gap / 1000) * ratePerThousand;

  return {
    lines: [
      { label: 'Recommended Coverage', value: formatCurrency(Math.round(recommendedCoverage)), highlight: true },
      { label: 'Existing Coverage', value: formatCurrency(existing_coverage) },
      { label: 'Coverage Gap', value: formatCurrency(Math.round(gap)), highlight: gap > 0 },
      { label: 'Estimated Monthly', value: formatCurrencyDecimal(Math.max(0, estimatedMonthly)), highlight: true },
      { label: 'Income Multiplier', value: `${incomeMultiplier}x` },
      { label: 'Dependents Cost', value: formatCurrency(dependentCost) },
    ],
    summary: `Life Insurance: Age ${age}, ${formatCurrency(income)} income, ${dependents} dependent(s). Recommended: ${formatCurrency(Math.round(recommendedCoverage))}. Gap: ${formatCurrency(Math.round(gap))}. Est. ${formatCurrencyDecimal(Math.max(0, estimatedMonthly))}/mo.`,
  };
}

// ── Bundle Discount Calculator ──────────────────────────────────────────
function calcBundle(inputs: Record<string, number>): CalcResult {
  const { policies_count, current_total } = inputs;
  // Bundle discount: 2 policies = 10%, 3 = 18%, 4+ = 24%
  const discountPct = policies_count >= 4 ? 24 : policies_count === 3 ? 18 : policies_count === 2 ? 10 : 0;
  const bundlePrice = current_total * (1 - discountPct / 100);
  const savings = current_total - bundlePrice;

  return {
    lines: [
      { label: 'Policies', value: `${policies_count}` },
      { label: 'Current Total', value: formatCurrencyDecimal(current_total) },
      { label: 'Bundle Discount', value: `${discountPct}%`, highlight: true },
      { label: 'Bundle Price', value: formatCurrencyDecimal(Math.max(0, bundlePrice)), highlight: true },
      { label: 'Monthly Savings', value: formatCurrencyDecimal(Math.max(0, savings)), highlight: true },
      { label: 'Annual Savings', value: formatCurrency(Math.max(0, Math.round(savings * 12))), highlight: true },
    ],
    summary: `Bundle Discount: ${policies_count} policies, ${discountPct}% discount. Bundle: ${formatCurrencyDecimal(Math.max(0, bundlePrice))}/mo (saves ${formatCurrencyDecimal(Math.max(0, savings))}/mo, ${formatCurrency(Math.max(0, Math.round(savings * 12)))}/yr).`,
  };
}

// ── Calculator Card Component ───────────────────────────────────────────
interface CalcField {
  key: string;
  label: string;
  placeholder: string;
  defaultValue: number;
  prefix?: string;
  suffix?: string;
  type?: 'number' | 'select';
  options?: { label: string; value: number }[];
}

interface CalculatorDef {
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  fields: CalcField[];
  compute: (inputs: Record<string, number>) => CalcResult;
}

const CALCULATORS: CalculatorDef[] = [
  {
    title: 'Auto Insurance Savings',
    description: 'Compare your current auto premium against estimated rates',
    icon: 'M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.368L21 11M3 11h18M3 11v6a1 1 0 001 1h1a2 2 0 002-2 2 2 0 012-2h8a2 2 0 012 2 2 2 0 002 2h1a1 1 0 001-1v-6',
    accentColor: '#3b82f6',
    fields: [
      { key: 'current_monthly', label: 'Current Monthly Premium', placeholder: '185', defaultValue: 185, prefix: '$' },
      { key: 'vehicles', label: 'Number of Vehicles', placeholder: '2', defaultValue: 2 },
      { key: 'drivers', label: 'Number of Drivers', placeholder: '2', defaultValue: 2 },
      { key: 'coverage_type', label: 'Coverage Type', placeholder: '', defaultValue: 1, type: 'select', options: [{ label: 'Liability Only', value: 0 }, { label: 'Standard', value: 1 }, { label: 'Full Coverage', value: 2 }] },
    ],
    compute: calcAuto,
  },
  {
    title: 'Home Insurance Savings',
    description: 'Estimate potential savings on your homeowners policy',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    accentColor: '#10b981',
    fields: [
      { key: 'home_value', label: 'Home Value', placeholder: '350000', defaultValue: 350000, prefix: '$' },
      { key: 'current_premium', label: 'Current Annual Premium', placeholder: '2400', defaultValue: 2400, prefix: '$' },
      { key: 'deductible', label: 'Deductible', placeholder: '2500', defaultValue: 2500, prefix: '$' },
      { key: 'coverage_amount', label: 'Coverage Amount', placeholder: '350000', defaultValue: 350000, prefix: '$' },
    ],
    compute: calcHome,
  },
  {
    title: 'Life Insurance Needs',
    description: 'Calculate recommended coverage based on your situation',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    accentColor: '#8b5cf6',
    fields: [
      { key: 'age', label: 'Age', placeholder: '35', defaultValue: 35 },
      { key: 'income', label: 'Annual Income', placeholder: '75000', defaultValue: 75000, prefix: '$' },
      { key: 'dependents', label: 'Number of Dependents', placeholder: '2', defaultValue: 2 },
      { key: 'debts', label: 'Total Debts (mortgage, loans)', placeholder: '250000', defaultValue: 250000, prefix: '$' },
      { key: 'existing_coverage', label: 'Existing Coverage', placeholder: '100000', defaultValue: 100000, prefix: '$' },
    ],
    compute: calcLife,
  },
  {
    title: 'Bundle Discount',
    description: 'See how much you save by bundling multiple policies',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    accentColor: '#f59e0b',
    fields: [
      { key: 'policies_count', label: 'Number of Policies', placeholder: '3', defaultValue: 3, type: 'select', options: [{ label: '1 Policy', value: 1 }, { label: '2 Policies', value: 2 }, { label: '3 Policies', value: 3 }, { label: '4+ Policies', value: 4 }] },
      { key: 'current_total', label: 'Current Monthly Total (all policies)', placeholder: '450', defaultValue: 450, prefix: '$' },
    ],
    compute: calcBundle,
  },
];

function CalculatorCard({ def }: { def: CalculatorDef }) {
  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const f of def.fields) init[f.key] = f.defaultValue;
    return init;
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (key: string, val: string) => {
    const num = parseFloat(val);
    setInputs(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
    setShowResult(false);
  };

  const calculate = () => {
    const res = def.compute(inputs);
    setResult(res);
    setShowResult(true);
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="glass-panel p-6 relative overflow-hidden">
      {/* Accent line */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px" style={{ background: `linear-gradient(90deg, transparent, ${def.accentColor}60, transparent)` }} />

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${def.accentColor}12`, border: `1px solid ${def.accentColor}30` }}>
          <svg className="w-5 h-5" style={{ color: def.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={def.icon} />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-100)' }}>{def.title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-24)' }}>{def.description}</p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-3 mb-5">
        {def.fields.map(field => (
          <div key={field.key}>
            <label className="text-[10px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-48)' }}>{field.label}</label>
            {field.type === 'select' && field.options ? (
              <select
                value={inputs[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                className="input-glass w-full px-4 py-2.5"
              >
                {field.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <div className="relative">
                {field.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-24)' }}>{field.prefix}</span>
                )}
                <input
                  type="number"
                  value={inputs[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`input-glass w-full ${field.prefix ? 'pl-8' : 'px-4'} pr-4 py-2.5`}
                />
                {field.suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-24)' }}>{field.suffix}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Calculate Button */}
      <button onClick={calculate} className="btn-primary w-full py-2.5 text-sm font-medium" style={{ background: `linear-gradient(135deg, ${def.accentColor} 0%, ${def.accentColor}cc 100%)`, boxShadow: `0 2px 8px -2px ${def.accentColor}66` }}>
        Calculate
      </button>

      {/* Results */}
      {showResult && result && (
        <div className="mt-5 pt-5 space-y-3 animate-fadeInUp" style={{ borderTop: '1px solid var(--border-base)' }}>
          {result.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-48)' }}>{line.label}</span>
              <span className={`text-sm font-medium ${line.highlight ? '' : ''}`} style={{ color: line.highlight ? def.accentColor : 'var(--text-100)' }}>
                {line.value}
              </span>
            </div>
          ))}

          {/* Use in Call button */}
          <button
            onClick={copyToClipboard}
            className="btn-ghost w-full py-2 text-xs flex items-center justify-center gap-2 mt-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {copied
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              }
            </svg>
            {copied ? 'Copied to clipboard' : 'Use in Call'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page Component ──────────────────────────────────────────────────────
export default function CalculatorsPage() {
  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>Calculators</h2>
        <p className="text-sm" style={{ color: 'var(--text-24)' }}>Insurance savings calculators for live calls and proposals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CALCULATORS.map((def, i) => (
          <div key={def.title} className={`stagger-${i + 1}`} style={{ animationFillMode: 'both' }}>
            <CalculatorCard def={def} />
          </div>
        ))}
      </div>
    </div>
  );
}
