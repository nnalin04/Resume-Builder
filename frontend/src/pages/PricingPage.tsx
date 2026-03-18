import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Plan } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    Cashfree: { checkout: (opts: { paymentSessionId: string; returnUrl: string }) => void };
  }
}

const PLAN_FEATURES: Record<string, string[]> = {
  one_time: ['1 PDF download', 'All 5 templates', 'ATS optimization'],
  basic: ['Unlimited downloads', 'All 5 templates', 'ATS optimization', 'Resume coaching'],
  pro: ['Everything in Basic', 'Priority AI model', 'Version history', 'LinkedIn PDF import guide'],
};

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.payments.getPlans()
      .then(d => setPlans(d.plans))
      .finally(() => setPlansLoading(false));
  }, []);

  const handleBuy = async (planId: string) => {
    if (!user) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }
    setError('');
    setLoading(planId);
    try {
      const returnUrl = `${window.location.origin}/payment/success`;
      const order = await api.payments.createOrder(planId, returnUrl);
      if (window.Cashfree) {
        window.Cashfree.checkout({
          paymentSessionId: order.payment_session_id,
          returnUrl: `${returnUrl}?order_id=${order.order_id}`,
        });
      } else {
        window.location.href = `https://payments.cashfree.com/forms/checkout?payment_session_id=${order.payment_session_id}`;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment initiation failed');
    } finally {
      setLoading(null);
    }
  };

  const isActive = user?.subscription_status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/editor')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to editor
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white font-outfit font-bold text-sm">R</div>
          <span className="font-outfit font-semibold text-slate-800 hidden sm:block">Resume Builder</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero text */}
        <div className="text-center mb-14 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold mb-4 uppercase tracking-widest">
            Simple Pricing
          </div>
          <h1 className="font-outfit text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">Choose your plan</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            {isActive
              ? `You're on the ${user?.subscription_plan} plan. Active until ${user?.subscription_expiry?.slice(0, 10)}.`
              : 'Start free. Download your first resume at no cost.'}
          </p>
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-8 bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="flex flex-wrap justify-center gap-6">
          {plansLoading
            ? [0, 1, 2].map(i => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-7 w-64 shadow-soft flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                  <div className="h-10 bg-slate-100 rounded-lg w-3/4 mt-1" />
                  <div className="h-3 bg-slate-100 rounded-lg" />
                  <div className="h-3 bg-slate-100 rounded-lg w-5/6" />
                  <div className="h-3 bg-slate-100 rounded-lg w-4/5" />
                  <div className="h-10 bg-slate-100 rounded-xl mt-4" />
                </div>
              ))
            : plans.map(plan => {
                const isPro = plan.id === 'pro';
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-2xl p-7 w-64 flex flex-col gap-3 transition-all duration-200 ${
                      isPro
                        ? 'border-2 border-brand-500 shadow-glow scale-[1.03]'
                        : 'border border-slate-200 shadow-soft hover:shadow-glow hover:scale-[1.01]'
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-glow">
                        Most Popular
                      </div>
                    )}
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-slate-700">₹</span>
                      <span className="font-outfit text-5xl font-extrabold text-slate-900 leading-none">{plan.amount}</span>
                      {plan.type === 'SUBSCRIPTION' && <span className="text-slate-400 text-sm">/mo</span>}
                    </div>
                    <ul className="flex flex-col gap-2 flex-1 mt-1">
                      {(PLAN_FEATURES[plan.id] ?? []).map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                          <svg className={`w-4 h-4 flex-shrink-0 ${isPro ? 'text-brand-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleBuy(plan.id)}
                      disabled={loading === plan.id || isActive}
                      className={`mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        isPro
                          ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-soft hover:shadow-glow'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {loading === plan.id
                        ? 'Processing…'
                        : isActive
                        ? 'Current plan'
                        : 'Get started'}
                    </button>
                  </div>
                );
              })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-14">
          Payments secured by Cashfree &middot; UPI, cards, net banking accepted &middot; All prices include GST
        </p>
      </div>
    </div>
  );
}
