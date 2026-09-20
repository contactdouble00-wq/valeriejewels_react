import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  FileText,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Flame,
  Menu,
  X,
  Sliders,
  Scale,
  HelpCircle,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { adminApi } from './adminApi';
import AdminLogin from './AdminLogin';
import AdminDashboardView from './AdminDashboardView';
import AdminHomepageView from './AdminHomepageView';
import AdminCustomerCareView from './AdminCustomerCareView';
import AdminProductsView from './AdminProductsView';
import AdminOrdersView from './AdminOrdersView';
import AdminCustomersView from './AdminCustomersView';
import AdminCouponsView from './AdminCouponsView';
import AdminActivityLogView from './AdminActivityLogView';
import AdminCategoriesView from './AdminCategoriesView';
import AdminPoliciesView from './AdminPoliciesView';
import AdminFaqsView from './AdminFaqsView';
import AdminPaymentSettingsView from './AdminPaymentSettingsView';


export default function AdminPortal({ onReturnToStore }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderIdForInspect, setSelectedOrderIdForInspect] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const user = adminApi.getCurrentUser();
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = () => {
    adminApi.logout();
    setCurrentUser(null);
  };

  // If not authenticated, render Login
  if (!currentUser) {
    return <AdminLogin onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const isStaff = currentUser.role === 'staff';

  const navItems = [
    { id: 'dashboard', label: 'Executive Telemetry', icon: LayoutDashboard, badge: 'Ad Spotlight' },
    { id: 'homepage', label: 'Homepage & Banners', icon: Sliders, badge: 'Live UI' },
    { id: 'customercare', label: 'Customer Care & WhatsApp', icon: MessageCircle, badge: 'Support' },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'categories', label: 'Category Manager', icon: Tag },
    { id: 'orders', label: 'Orders & Dispatch', icon: ShoppingBag },
    { id: 'payments', label: 'Fastrr & Payments', icon: Zap, badge: '1-Click' },
    { id: 'customers', label: 'Customers & RTO', icon: Users },
    { id: 'coupons', label: 'Promotions & Vouchers', icon: Tag },
    { id: 'policies', label: 'Legal & Policies', icon: Scale, badge: 'DPDP / Legal' },
    { id: 'faqs', label: 'Customer FAQs', icon: HelpCircle, badge: 'Live FAQs' },
    { id: 'activity', label: 'Security Audit Trail', icon: FileText },
  ];


  return (
    <div className="min-h-screen flex bg-[#F6F4F9] text-brand-tertiary antialiased">
      {/* Desktop Sidebar (Fixed Left) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-brand-border flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div className="p-6 border-b border-brand-border/60">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center group">
              <img src="/valerie.png" alt="VALERIÉ" className="h-7 w-auto object-contain" />
            </a>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-brand-muted hover:text-brand-tertiary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-brand-primary" />
            <span>OPERATIONAL ATELIER</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-brand-tertiary/80 hover:bg-[#FAF8FC] hover:text-brand-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-brand-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account & Bottom Actions */}
        <div className="p-4 border-t border-brand-border/60 bg-[#FAF8FC] space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-brand-tertiary truncate">{currentUser.name}</div>
              <div className="text-[10px] text-brand-muted truncate">{currentUser.email}</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                isStaff ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isStaff ? 'Staff Role' : 'Owner Admin'}
            </span>
          </div>

          <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs">
            <a
              href="/"
              onClick={(e) => {
                if (onReturnToStore) {
                  e.preventDefault();
                  onReturnToStore();
                }
              }}
              className="text-brand-muted hover:text-brand-primary flex items-center space-x-1 font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </a>

            <button
              onClick={handleLogout}
              className="text-rose-600 hover:text-rose-700 flex items-center space-x-1 font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Offset for Desktop Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Operational Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-brand-border px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-brand-tertiary hover:text-brand-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs font-caps tracking-wider text-brand-muted">
              <span>Valerie Operational Portal</span>
              <span>•</span>
              <span className="capitalize text-brand-primary font-bold">{activeTab}</span>
            </div>
          </div>

          {/* System Status Pill */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-[11px]">Hostinger API Online</span>
            </div>

            <a
              href="/"
              onClick={(e) => {
                if (onReturnToStore) {
                  e.preventDefault();
                  onReturnToStore();
                }
              }}
              className="px-3 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <span>View Storefront</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Tab View Container */}
        <main className="flex-1 pb-16">
          {activeTab === 'dashboard' && (
            <AdminDashboardView
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectOrder={(ordId) => {
                setSelectedOrderIdForInspect(ordId);
                setActiveTab('orders');
              }}
            />
          )}

          {activeTab === 'homepage' && <AdminHomepageView />}

          {activeTab === 'customercare' && <AdminCustomerCareView />}

          {activeTab === 'products' && <AdminProductsView currentUser={currentUser} />}

          {activeTab === 'orders' && (
            <AdminOrdersView
              currentUser={currentUser}
              initialSelectedOrderId={selectedOrderIdForInspect}
            />
          )}

          {activeTab === 'customers' && <AdminCustomersView />}

          {activeTab === 'categories' && (
            <AdminCategoriesView
              currentUser={currentUser}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'coupons' && <AdminCouponsView currentUser={currentUser} />}

          {activeTab === 'policies' && <AdminPoliciesView currentUser={currentUser} />}

          {activeTab === 'payments' && <AdminPaymentSettingsView />}

          {activeTab === 'faqs' && <AdminFaqsView currentUser={currentUser} />}

          {activeTab === 'activity' && <AdminActivityLogView />}
        </main>
      </div>
    </div>
  );
}
