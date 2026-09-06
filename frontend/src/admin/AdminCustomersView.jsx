import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, ShieldCheck, User, Phone, Mail, ShoppingBag } from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCustomersView() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomers({ search });
      setCustomers(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleToggleBlock = async (user) => {
    const nextState = Number(user.is_blocked_rto) === 1 ? 0 : 1;
    const actionDesc = nextState === 1 ? 'BLOCK from COD (high RTO risk)' : 'UNBLOCK';
    if (!window.confirm(`Are you sure you want to ${actionDesc} for ${user.name}?`)) return;

    try {
      const res = await adminApi.toggleRtoBlock(user.id, nextState, `Manually toggled via Customer panel`);
      showToast(res.message);
      setCustomers((prev) =>
        prev.map((c) => (c.id === user.id ? { ...c, is_blocked_rto: nextState } : c))
      );
    } catch (err) {
      showToast(err.message || 'Failed to update RTO block status');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold">
          {toastMessage}
        </div>
      )}

      <div>
        <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
          Customer Intelligence & Risk Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
          Customer Database & RTO Protection
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
            placeholder="Search by customer name, phone, email..."
            className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
          />
          <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Phone & Email</th>
                <th className="py-3.5 px-4">Total Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">RTO / Cancel Incidents</th>
                <th className="py-3.5 px-4 text-right">RTO Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isBlocked = Number(c.is_blocked_rto) === 1;
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-brand-tertiary flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center font-bold text-[11px]">
                            {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-brand-tertiary">{c.phone || 'N/A'}</div>
                        <div className="text-[10px] text-brand-muted">{c.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-brand-tertiary">
                        {c.total_orders} orders
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-tertiary">
                        ₹{Number(c.total_spent).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-mono font-semibold ${
                            Number(c.rto_cancellations) > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {c.rto_cancellations} cancelled
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleBlock(c)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                            isBlocked
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {isBlocked ? 'Blocked (RTO Risk)' : 'Verified (COD Allowed)'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
