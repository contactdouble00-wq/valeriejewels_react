import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Flame,
  Package,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Star,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminDashboardView({ onNavigateTab, onSelectOrder }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await adminApi.getDashboard();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm text-rose-600">{error || 'Unable to load dashboard'}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { kpis, hero_jhumka_boxes = [], low_stock_alerts = [], recent_orders = [] } = data;

  return (
    <div className="p-6 sm:p-8 space-y-8 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Executive Operations Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Store Performance & Ad Campaigns
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-brand-border text-brand-tertiary text-xs font-semibold hover:border-brand-primary transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-editorial font-bold text-brand-tertiary">
            ₹{Number(kpis.total_revenue).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-700 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>AOV: ₹{Number(kpis.average_order_value).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Orders Processed
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-brand-primary">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-editorial font-bold text-brand-tertiary">
            {kpis.total_orders}
          </div>
          <div className="text-[11px] text-brand-muted">
            {kpis.payment_split?.prepaid || 0} Prepaid • {kpis.payment_split?.partial_cod || 0} Partial COD • {kpis.payment_split?.cod || 0} Full COD
          </div>
        </div>

        {/* Prepaid Share */}
        <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Prepaid / Token Rate
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-editorial font-bold text-brand-tertiary">
            {kpis.prepaid_share_percent}%
          </div>
          <div className="text-[11px] text-brand-muted">
            Minimizes return-to-origin loss upfront
          </div>
        </div>

        {/* RTO / Cancellation Rate */}
        <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Cancellation / RTO
            </span>
            <div className={`p-2 rounded-xl ${kpis.rto_cancellation_rate > 20 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-editorial font-bold text-brand-tertiary">
            {kpis.rto_cancellation_rate}%
          </div>
          <div className="text-[11px] text-brand-muted">
            Controlled via ₹199 token deposit model
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HERO AD CAMPAIGN SPOTLIGHT: THE 4 SIGNATURE JHUMKA BOXES */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-[#FAF6FD] via-[#F4EDFC] to-[#FAF7FD] rounded-3xl p-6 sm:p-8 border-2 border-brand-primary/30 shadow-luxury space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-caps uppercase tracking-wider font-bold">
              <Flame className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
              <span>Core Revenue Engine • Primary Ad Spend Target</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-brand-tertiary">
              4 Signature Jhumka Boxes — Live Inventory & Velocity
            </h2>
            <p className="text-xs text-brand-muted">
              Valerie Jewels' 4 top-selling advertisement heroes. Monitor stock depletion in real-time to prevent burning ad spend on out-of-stock boxes.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('products')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
          >
            <span>Manage All Products</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Jhumka Boxes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {hero_jhumka_boxes.map((box, idx) => {
            const isLow = Number(box.stock_quantity) <= 25;
            return (
              <div
                key={box.id}
                className="bg-white rounded-2xl p-4 border border-brand-border shadow-sm flex flex-col justify-between space-y-3 hover:border-brand-primary/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-caps font-bold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-full">
                      Box #{idx + 1}
                    </span>
                    {isLow ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center space-x-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Low Stock Alert</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Ad Campaign Healthy
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <img
                      src={box.primary_image || 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=400&q=80'}
                      alt={box.name}
                      className="w-14 h-14 rounded-xl object-cover border border-brand-border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-brand-muted font-mono">{box.sku}</div>
                      <h4 className="text-xs font-editorial font-bold text-brand-tertiary truncate" title={box.name}>
                        {box.name}
                      </h4>
                      <div className="text-xs font-semibold text-brand-primary mt-0.5">
                        ₹{Number(box.price).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-brand-muted line-through">
                          ₹{Number(box.mrp).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Level Bar */}
                <div className="pt-2 border-t border-brand-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-brand-muted">Units Available:</span>
                    <span className={`font-bold ${isLow ? 'text-rose-600 font-mono text-xs' : 'text-brand-tertiary'}`}>
                      {box.stock_quantity} in stock
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isLow ? 'bg-rose-500' : 'bg-brand-primary'}`}
                      style={{ width: `${Math.min(100, (Number(box.stock_quantity) / 200) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Split Section: Recent Orders Feed & Inventory Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Feed (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-brand-border shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                Recent Customer Orders
              </h3>
              <p className="text-xs text-brand-muted">
                Highlighted with priority tags for shipments containing the 4 Jhumka Boxes.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab && onNavigateTab('orders')}
              className="text-xs text-brand-primary hover:underline font-semibold"
            >
              View All Orders →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
                  <th className="py-2.5">Order</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Payment</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {recent_orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-brand-muted">
                      No customer orders yet.
                    </td>
                  </tr>
                ) : (
                  recent_orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="py-3 font-mono font-medium text-brand-tertiary">
                        <div>#{ord.order_number}</div>
                        {Number(ord.has_jhumka_box) > 0 && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 mt-0.5">
                            <span>📦 Jhumka Ad Order</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-brand-tertiary">{ord.customer_name}</div>
                        <div className="text-[10px] text-brand-muted">{ord.customer_phone}</div>
                      </td>
                      <td className="py-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                          {ord.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.order_status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.order_status === 'shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : ord.order_status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.order_status}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-brand-tertiary">
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            if (onSelectOrder) onSelectOrder(ord.id);
                            if (onNavigateTab) onNavigateTab('orders');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-[11px] font-medium transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts (1 Column) */}
        <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-editorial font-bold text-brand-tertiary">
              Inventory Restock Alerts
            </h3>
          </div>
          <p className="text-xs text-brand-muted">
            Pieces below safety buffer of 25 units.
          </p>

          <div className="space-y-3">
            {low_stock_alerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs text-center">
                All catalog inventory is above safe threshold.
              </div>
            ) : (
              low_stock_alerts.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-brand-border bg-[#FAF8FC] flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-semibold text-brand-tertiary truncate">{item.name}</div>
                    <div className="text-[10px] text-brand-muted font-mono">{item.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-rose-600 font-bold font-mono">
                      {item.stock_quantity} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
