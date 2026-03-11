const { useEffect, useMemo, useState } = React;
const { ConfigProvider, Menu } = antd;
const {
  LayoutDashboard,
  Smartphone,
  Tablet,
  Send,
  User,
  RotateCcw,
  LogOut,
  ChevronRight,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  Bug,
  Mail,
  Signal,
  PieChart,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight: ChevronRightIcon,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock
} = LucideReact;

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, hint: 'Gerçek zamanlı metrikler ve veri özeti' },
  { id: 'sessions', label: 'Müşteriler', icon: Smartphone, hint: 'Cihaz ve oturum yönetimi' },
  { id: 'devices', label: 'Numaralar', icon: Tablet, hint: 'Bağlı hatları görüntüleme' },
  { id: 'campaigns', label: 'Kampanyalar', icon: Send, hint: 'Mesaj gönderimi ve otomasyon' },
  { id: 'profile', label: 'Ayarlar', icon: User, hint: 'Hesap ve güvenlik yapılandırması' }
];

const SECTION_COPY = {
  overview: {
    title: 'Kontrol Paneli',
    description: 'Gönderim durumu, kuyruk yoğunluğu ve sistem risklerini tek ekranda izleyin.'
  },
  sessions: {
    title: 'Oturum Yönetimi',
    description: 'Yeni QR oturumu açın, mevcut istemcileri yenileyin veya kaldırın.'
  },
  devices: {
    title: 'Cihaz Listesi',
    description: 'Bağlı hatları, sahip bilgisini ve çalışma durumunu takip edin.'
  },
  campaigns: {
    title: 'Gönderim Merkezi',
    description: 'Toplu mesaj oluşturun, kuyruğu izleyin ve hazır şablonları yönetin.'
  },
  profile: {
    title: 'Profil ve Güvenlik',
    description: 'Telefon numarası, API bilgisi ve güvenilen cihazları yönetin.'
  }
};

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR');
}

function formatPercent(value) {
  const number = Number(value) || 0;
  return `${number.toFixed(1)}%`;
}

function truncate(value, size = 84) {
  if (!value) return '-';
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

function isoToFlag(iso) {
  if (!iso || typeof iso !== 'string' || iso.length !== 2) {
    return '🌐';
  }
  return iso
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === 'object' && payload.error
        ? payload.error
        : typeof payload === 'string' && payload
          ? payload
          : `İstek başarısız oldu (${response.status})`;
    throw new Error(errorMessage);
  }

  return payload;
}

function readInitialTab() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('tab');
  const map = {
    'devices-section': 'sessions',
    'bulk-section': 'campaigns',
    'statistics-section': 'overview',
    'issues-section': 'overview',
    'message-logs-section': 'overview',
    'lookup-section': 'overview'
  };
  return map[requested] || 'overview';
}

function readFlash() {
  const params = new URLSearchParams(window.location.search);
  const success = params.get('success') || params.get('toast') || '';
  const error = params.get('error') || '';
  if (success || error) {
    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
  return {
    type: error ? 'error' : success ? 'success' : null,
    text: error || success || ''
  };
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-subtitle">{description}</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(readInitialTab);
  const [flash, setFlash] = useState(readFlash);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  const [config, setConfig] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [queueData, setQueueData] = useState({ queue: [], totals: {}, total: 0 });
  const [templates, setTemplates] = useState([]);
  const [profile, setProfile] = useState({ username: '', apiKey: '', phoneNumber: '', trustedDevices: [] });

  const [messageForm, setMessageForm] = useState({
    label: 'Kampanya',
    recipients: '',
    message: ''
  });
  const [templateForm, setTemplateForm] = useState({
    id: '',
    title: '',
    content: ''
  });
  const [sessionForm, setSessionForm] = useState({
    label: 'Yeni Cihaz',
    owner: ''
  });
  const [profilePhone, setProfilePhone] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceView, setDeviceView] = useState('all');
  const [devicePage, setDevicePage] = useState(1);
  const devicePageSize = 8;

  const ownerOptions = config?.ownerOptions || [];
  const isAdmin = Boolean(config?.isAdmin);
  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const sectionCopy = SECTION_COPY[activeTab] || SECTION_COPY.overview;

  const overviewCards = useMemo(() => {
    const stats = config?.stats || {};
    return [
      {
        title: 'Bağlantılar',
        value: stats.sessions ? stats.sessions.length : 0,
        footnote: stats.connectionStatus || 'Sistem Aktif',
        icon: Signal,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50/50'
      },
      {
        title: 'Bekleyen Kuyruk',
        value: stats.queuedMessageCount || 0,
        footnote: `${stats.pendingMessages || 0} mesaj sırada`,
        icon: Mail,
        color: 'text-amber-600',
        bg: 'bg-amber-50/50'
      },
      {
        title: 'Başarı Oranı',
        value: formatPercent(metrics?.successRate || 0),
        footnote: `${metrics?.deliveredCount || 0} iletildi`,
        icon: PieChart,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50/50'
      },
      {
        title: 'Risk Skoru',
        value: metrics?.riskyDevices?.length || 0,
        footnote: `${metrics?.blockedCount || 0} engellendi`,
        icon: AlertTriangle,
        color: 'text-rose-600',
        bg: 'bg-rose-50/50'
      }
    ];
  }, [config, devices, metrics]);
  const filteredDevices = useMemo(() => {
    const search = deviceSearch.trim().toLowerCase();
    const results = devices.filter((device) => {
      if (deviceView === 'active' && !device.ready) return false;
      if (deviceView === 'issues' && !device.health?.suspended) return false;
      if (!search) return true;

      const haystack = [
        device.label,
        device.phone,
        device.id,
        device.owner || 'admin',
        device.platform,
        device.iso,
        device.health?.suspendedReason
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });

    return results.slice().sort((left, right) => {
      if (left.ready !== right.ready) {
        return left.ready ? -1 : 1;
      }
      return (left.label || left.phone || left.id || '').localeCompare(right.label || right.phone || right.id || '');
    });
  }, [devices, deviceSearch, deviceView]);
  const totalDevicePages = Math.max(1, Math.ceil(filteredDevices.length / devicePageSize));
  const pagedDevices = useMemo(() => {
    const start = (devicePage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, devicePage]);

  useEffect(() => {
    setDevicePage(1);
  }, [deviceSearch, deviceView]);

  useEffect(() => {
    if (devicePage > totalDevicePages) {
      setDevicePage(totalDevicePages);
    }
  }, [devicePage, totalDevicePages]);

  async function refreshData({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [nextConfig, nextMetrics, nextClients, nextDevices, nextQueue, nextTemplates, nextProfile] =
        await Promise.all([
          apiFetch('/admin/config'),
          apiFetch('/admin/ops-metrics'),
          apiFetch('/admin/clients'),
          apiFetch('/admin/devices'),
          apiFetch('/admin/queue'),
          apiFetch('/admin/templates'),
          apiFetch('/admin/profile')
        ]);

      setConfig(nextConfig);
      setMetrics(nextMetrics);
      setClients(nextClients.sessions || []);
      setDevices(nextDevices.devices || []);
      setQueueData(nextQueue || { queue: [], totals: {}, total: 0 });
      setTemplates(Array.isArray(nextTemplates) ? nextTemplates : []);
      setProfile(nextProfile || { username: '', apiKey: '', phoneNumber: '', trustedDevices: [] });
      if (!profileDirty || !silent) {
        setProfilePhone(nextProfile?.phoneNumber || '');
        setProfileDirty(false);
      }
      setSessionForm((current) => ({
        ...current,
        owner: current.owner || nextConfig?.ownerOptions?.[0]?.username || ''
      }));
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshData({ silent: true });
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleCreateSession(event) {
    event.preventDefault();
    setCreatingSession(true);
    try {
      await apiFetch('/admin/clients', {
        method: 'POST',
        body: JSON.stringify({
          label: sessionForm.label,
          owner: sessionForm.owner || undefined
        })
      });
      setFlash({ type: 'success', text: 'Yeni istemci oluşturuldu.' });
      setSessionForm((current) => ({ ...current, label: 'Yeni Cihaz' }));
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleSessionAction(id, action) {
    try {
      const url = action === 'refresh' ? `/admin/clients/${id}/refresh` : `/admin/clients/${id}`;
      await apiFetch(url, { method: action === 'refresh' ? 'POST' : 'DELETE' });
      setFlash({
        type: 'success',
        text: action === 'refresh' ? 'Oturum yenilendi.' : 'Oturum silindi.'
      });
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    }
  }

  async function handleDeleteDevice(id) {
    try {
      await apiFetch(`/admin/devices/${id}`, { method: 'DELETE' });
      setFlash({ type: 'success', text: 'Cihaz kaldırıldı.' });
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    }
  }

  async function handleSubmitMessage(event) {
    event.preventDefault();
    setSubmittingMessage(true);
    try {
      const result = await apiFetch('/api/admin/message', {
        method: 'POST',
        body: JSON.stringify(messageForm)
      });
      setFlash({ type: 'success', text: result.message || 'Mesajlar kuyruğa eklendi.' });
      setMessageForm((current) => ({ ...current, recipients: '' }));
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    } finally {
      setSubmittingMessage(false);
    }
  }

  async function handleSaveTemplate(event) {
    event.preventDefault();
    setSavingTemplate(true);
    try {
      await apiFetch('/admin/templates', {
        method: 'POST',
        body: JSON.stringify(templateForm)
      });
      setTemplateForm({ id: '', title: '', content: '' });
      setFlash({ type: 'success', text: 'Şablon kaydedildi.' });
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id) {
    try {
      await apiFetch(`/admin/templates/${id}`, { method: 'DELETE' });
      if (templateForm.id === id) {
        setTemplateForm({ id: '', title: '', content: '' });
      }
      setFlash({ type: 'success', text: 'Şablon silindi.' });
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/admin/profile', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: profilePhone })
      });
      setProfileDirty(false);
      setFlash({ type: 'success', text: 'Profil güncellendi.' });
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRevokeTrustedDevice(deviceId) {
    try {
      await apiFetch('/admin/security/revoke-device', {
        method: 'POST',
        body: JSON.stringify({ deviceId })
      });
      setFlash({ type: 'success', text: 'Güvenilen cihaz kaldırıldı.' });
      await refreshData({ silent: true });
    } catch (error) {
      setFlash({ type: 'error', text: error.message });
    }
  }

  function applyTemplate(template) {
    setTemplateForm({
      id: template.id,
      title: template.title || '',
      content: template.content || ''
    });
    setMessageForm((current) => ({
      ...current,
      message: template.content || '',
      label: template.title || current.label
    }));
  }

  const riskyDevices = metrics?.riskyDevices || [];

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={classNames(
          'fixed inset-y-0 left-0 bg-[#0f172a] w-72 transform transition-all duration-300 ease-in-out z-50 flex flex-col',
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group px-1">
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:rotate-6 transition-transform">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Hub<span className="text-indigo-400">MSG</span></h2>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1 opacity-80">Enterprise CRM</div>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-white transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={classNames(
                  'group flex items-center gap-3.5 px-5 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 outline-none select-none relative',
                  active
                    ? 'text-white bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon size={18} className={classNames(active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="text-sm font-bold tracking-wide leading-none">{item.label}</span>
                {active && <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
              </div>
            );
          })}
        </nav>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1 px-2.5 bg-indigo-500 text-white text-[10px] font-black rounded-lg uppercase tracking-tighter">Pro</div>
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Upgrade plan</div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-3 leading-relaxed">Sınırsız cihaz ve gelişmiş API desteği için üyeliğinizi yükseltin.</p>
            <button className="w-full py-2 bg-indigo-500 text-white text-xs font-black rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">Satın Al</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-72 min-h-screen relative overflow-hidden">
        {/* Glass Header */}
        <header className="sticky top-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-30 px-6 sm:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 bg-slate-100 rounded-xl text-slate-500 md:hidden hover:bg-slate-200 active:scale-95 transition-all"
            >
              <MoreVertical size={20} />
            </button>

            <div className="hidden lg:flex items-center bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-2 gap-3 w-80 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-500/20 transition-all group">
              <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500" />
              <input className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-400 w-full" placeholder="Müşteri, numara veya ID ara..." />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 group cursor-pointer hover:bg-slate-50 p-2 pr-4 rounded-2xl transition-all">
              <div className="h-9 w-9 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <User size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900 leading-none">{profile.username || 'HubUser'}</span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{isAdmin ? 'Admin' : 'Müşteri'}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
            <button
              onClick={() => refreshData({ silent: true })}
              className={classNames('p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all', refreshing && 'bg-indigo-50 text-indigo-600')}
            >
              <RefreshCw size={20} className={classNames(refreshing && 'animate-spin')} />
            </button>
            <a href="/logout" className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
              <LogOut size={20} />
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-10 pb-20 custom-scrollbar">
          {/* Section Header */}
          <div className="mb-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.25em]">
                <span className="hover:text-indigo-500 cursor-pointer transition-colors">Enterprise</span>
                <ChevronRightIcon size={10} className="text-slate-300" />
                <span className="text-slate-300">Hubmsg</span>
                <ChevronRightIcon size={10} className="text-slate-300" />
                <span className="text-indigo-600 font-black">{activeNav.label}</span>
              </nav>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{sectionCopy.title}</h1>
              <p className="text-sm font-bold text-slate-400 mt-2 max-w-xl italic">{sectionCopy.description}</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-6 py-3.5 bg-indigo-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all">
                <Plus size={16} /> Yeni İşlem Başlat
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto">
            {flash.type && flash.text ? (
              <div className={classNames(
                'mb-8 p-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 backdrop-blur-sm border',
                flash.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              )}>
                {flash.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <span className="text-sm font-bold">{flash.text}</span>
              </div>
            ) : null}

            {loading ? (
              <div className="py-40 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 border-8 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-black text-slate-900">Güvenli Bağlantı Kuruluyor...</h3>
                <p className="text-slate-400 font-bold mt-2">Enterprise API katmanı üzerinden veriler yükleniyor.</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {overviewCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group" key={card.title}>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{card.title}</span>
                              <div className={classNames('p-2.5 rounded-2xl transition-colors', card.bg, card.color)}>
                                <Icon size={18} />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{card.value}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{card.footnote}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <h3 className="text-xl font-extrabold text-[#0f172a]">Kuyruk Özeti</h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">Güncel iş yükü ve teslimat durumu</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Bekleyen</span>
                            <strong className="text-2xl font-extrabold text-slate-900">{queueData.totals?.queued || 0}</strong>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">İletiliyor</span>
                            <strong className="text-2xl font-extrabold text-slate-900">{queueData.totals?.iletiliyor || 0}</strong>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">İletildi</span>
                            <strong className="text-2xl font-extrabold text-emerald-600">{queueData.totals?.iletildi || 0}</strong>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Hata</span>
                            <strong className="text-2xl font-extrabold text-rose-600">{queueData.totals?.hata || 0}</strong>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>Kuyruk Limiti: {config?.queueLimit || '-'}</span>
                          <span>Toplam Kayıt: {queueData.total || 0}</span>
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <h3 className="text-xl font-extrabold text-[#0f172a]">Operasyon Riski</h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">24 saatlik veriler ve risk analizi</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                            <span className="text-sm font-bold text-slate-500">Başarı Oranı</span>
                            <strong className="text-sm font-extrabold text-slate-900">{formatPercent(metrics?.successRate || 0)}</strong>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                            <span className="text-sm font-bold text-slate-500">Benzersiz Alıcı</span>
                            <strong className="text-sm font-extrabold text-blue-600">{metrics?.uniqueRecipients || 0}</strong>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                            <span className="text-sm font-bold text-slate-500">Bloklu Gönderim</span>
                            <strong className="text-sm font-extrabold text-rose-600">{metrics?.blockedCount || 0}</strong>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                            <span className="text-sm font-bold text-slate-500">Askıya Alınan Cihaz</span>
                            <strong className="text-sm font-extrabold text-amber-600">{metrics?.suspendedCount || 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-black text-slate-900">Son Kuyruk Hareketleri</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem tarafından işlenen son mesajlar</p>
                          </div>
                          <button onClick={() => setActiveTab('campaigns')} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors">
                            <ExternalLink size={18} />
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Alıcı</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter text-center">Etiket</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter text-center">Durum</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter text-right">Zaman</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(queueData.queue || []).slice(0, 8).map((entry, index) => (
                                <tr key={`${entry.recipient}-${entry.createdAt}-${index}`} className="hover:bg-slate-50 transition-colors group">
                                  <td className="px-8 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-slate-900">{entry.recipient}</span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Cihaz: {entry.deviceId || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-4 text-center">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{entry.label || 'Genel'}</span>
                                  </td>
                                  <td className="px-8 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className={classNames(
                                        'h-1.5 w-1.5 rounded-full',
                                        entry.status === 'delivered' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'
                                      )} />
                                      <span className={classNames(
                                        'text-[10px] font-black uppercase tracking-tighter',
                                        entry.status === 'delivered' ? 'text-emerald-600' : 'text-amber-600'
                                      )}>{entry.status || 'Kuyrukta'}</span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-4 text-right text-[11px] font-bold text-slate-400 tabular-nums">
                                    {formatDate(entry.lastAttempt || entry.createdAt)}
                                  </td>
                                </tr>
                              ))}
                              {!(queueData.queue || []).length ? (
                                <tr>
                                  <td colSpan="4" className="px-8 py-12 text-center text-sm font-bold text-slate-400 italic">
                                    Kuyrukta bekleyen işlem bulunmuyor.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm flex flex-col">
                        <div className="p-8 border-b border-slate-100">
                          <h3 className="text-lg font-black text-slate-900">Risk Analizi</h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kritik seviyedeki cihazlar</p>
                        </div>
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                          {riskyDevices.slice(0, 6).map((device) => (
                            <div key={device.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-4 hover:border-indigo-200 transition-colors group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{device.label || device.id}</h4>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{device.phone || device.id}</div>
                                </div>
                                <div className={classNames(
                                  'px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter',
                                  device.suspended ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                )}>
                                  {device.suspended ? 'Bloklu' : 'Riskli'}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Hata Oranı</span>
                                  <span className="text-sm font-black text-rose-600">{formatPercent(device.errorRate * 100)}</span>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Art Arda Hata</span>
                                  <span className="text-sm font-black text-slate-900">{device.consecutiveFailures || 0}</span>
                                </div>
                              </div>
                              <div className="text-[11px] font-bold text-slate-400 italic line-clamp-2 leading-relaxed">
                                "{truncate(device.lastError || 'Henüz bir hata kaydı oluşmadı.', 80)}"
                              </div>
                            </div>
                          ))}
                          {!riskyDevices.length ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                              <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
                                <ShieldCheck size={24} />
                              </div>
                              <div className="text-sm font-black text-slate-900">Her Şey Yolunda</div>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Risk eşiğini aşan cihaz yok</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div >
                ) : null
                }

                {activeTab === 'sessions' ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <form className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm" onSubmit={handleCreateSession}>
                        <div className="flex items-start justify-between mb-10">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900">İstemci Merkezi</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Yeni bir QR yetkilendirmesi başlatın</p>
                          </div>
                          <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                            <Plus size={24} />
                          </div>
                        </div>
                        <div className="space-y-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="session-label">Oturum Etiketi</label>
                            <input
                              id="session-label"
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                              placeholder="Örn: Müşteri Destek Hattı"
                              value={sessionForm.label}
                              onChange={(event) => setSessionForm({ ...sessionForm, label: event.target.value })}
                            />
                          </div>
                          {isAdmin ? (
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="session-owner">Sistem Sahibi</label>
                              <div className="relative group">
                                <select
                                  id="session-owner"
                                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 text-sm font-bold text-slate-700 appearance-none cursor-pointer group-hover:bg-slate-100/50 transition-all uppercase tracking-tight"
                                  value={sessionForm.owner}
                                  onChange={(event) => setSessionForm({ ...sessionForm, owner: event.target.value })}
                                >
                                  {ownerOptions.map((option) => (
                                    <option key={option.username} value={option.username}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                              </div>
                            </div>
                          ) : null}
                          <button type="submit" className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50" disabled={creatingSession}>
                            {creatingSession ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                            {creatingSession ? 'HAZIRLANIYOR...' : 'YENİ İSTEMCİ OLUŞTUR'}
                          </button>
                        </div>
                      </form>

                      <div className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-start justify-between mb-10">
                          <div>
                            <h3 className="text-xl font-black text-slate-900">Sahiplik Özeti</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global kullanıcı performans metrikleri</p>
                          </div>
                          <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                            <Layout size={20} />
                          </div>
                        </div>
                        <div className="overflow-x-auto flex-1 h-full">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sahip</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cihaz / Limit</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Oturum</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Kuyruk</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(config?.ownerBreakdown || []).map((row) => (
                                <tr key={row.username} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-6 py-4">
                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">{row.username}</span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="text-sm font-black text-slate-700">{row.deviceCount}</span>
                                      {row.deviceLimit != null && (
                                        <>
                                          <span className="text-slate-300 text-[10px] font-bold">/</span>
                                          <span className="text-[11px] font-bold text-slate-400">{row.deviceLimit}</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="text-sm font-black text-slate-900">{row.sessionsReady}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hazır</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black tabular-nums">{row.queue?.queued || 0}</span>
                                  </td>
                                </tr>
                              ))}
                              {!(config?.ownerBreakdown || []).length && (
                                <tr>
                                  <td colSpan="4" className="px-6 py-12 text-center text-[11px] font-bold text-slate-400 italic">
                                    Henüz veri yüklenmedi.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {clients.map((session) => (
                        <div key={session.id} className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all duration-500 group">
                          <div className="flex items-start justify-between mb-8">
                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all shadow-inner">
                              <Smartphone size={24} />
                            </div>
                            <div className={classNames(
                              'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2',
                              session.ready ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            )}>
                              <span className={classNames('h-1.5 w-1.5 rounded-full', session.ready ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
                              {session.ready ? 'ONLINE' : (session.status || 'PENDING').toUpperCase()}
                            </div>
                          </div>

                          <div className="mb-6">
                            <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{session.label || 'Sistem İstemcisi'}</h4>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 tabular-nums transition-opacity duration-300 opacity-60 group-hover:opacity-100">ID: {session.id}</div>
                          </div>

                          <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sahip / Rol</span>
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tighter tabular-nums">{session.owner || 'admin'} / {isAdmin ? 'ADMIN' : 'USER'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QR Yetkisİ</span>
                              <div className="flex items-center gap-2">
                                <span className={classNames('text-[10px] font-black uppercase tracking-tighter', session.qr ? 'text-indigo-500' : 'text-slate-400')}>{session.qr ? 'AKTİF' : 'YOK'}</span>
                                <div className={classNames('h-1.5 w-1.5 rounded-full', session.qr ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-200')} />
                              </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50">
                              <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">
                                {session.statusMessage || 'İstemci bağlı ve komut bekliyor. İşlem kaydı bulunamadı.'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-10">
                            <button
                              onClick={() => handleSessionAction(session.id, 'refresh')}
                              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
                            >
                              <RefreshCw size={14} />
                              YENİLE
                            </button>
                            <button
                              onClick={() => handleSessionAction(session.id, 'delete')}
                              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-50/50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              <Trash2 size={14} />
                              KALDIR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!clients.length && (
                      <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[40px] border-4 border-dashed border-slate-50">
                        <div className="h-20 w-20 bg-indigo-50/50 text-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                          <Layout size={40} className="animate-pulse" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 italic">Oturum Kaydı Bulunamadı</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">QR işlemlerine başlamak için yeni bir istemci ekleyin</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'devices' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                          <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                              className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl w-full md:w-80 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 text-xs font-black text-slate-700 placeholder:text-slate-400 transition-all"
                              placeholder="Numara, etiket veya sahip ara..."
                              value={deviceSearch}
                              onChange={(event) => setDeviceSearch(event.target.value)}
                            />
                          </div>

                          <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                            {['all', 'active', 'issues'].map((view) => (
                              <button
                                key={view}
                                onClick={() => setDeviceView(view)}
                                className={classNames(
                                  'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                  deviceView === view ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                )}
                              >
                                {view === 'all' ? 'Tümü' : view === 'active' ? 'Aktif' : 'Sorunlu'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                          Toplam {filteredDevices.length} Kayıt
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cihaz / Ülke</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sahip</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Son Hareket</th>
                              {isAdmin && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Eylem</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pagedDevices.map((device) => (
                              <tr key={device.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-slate-100 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                                      {isoToFlag(device.iso)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-slate-900 leading-tight">{device.label || device.phone || 'İsimsiz Cihaz'}</span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter tabular-nums">{device.phone || 'No Info'} • {(device.iso || 'UN').toUpperCase()}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className={classNames(
                                      'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5',
                                      device.ready ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    )}>
                                      <span className={classNames('h-1.5 w-1.5 rounded-full', device.ready ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                                      {device.ready ? 'Online' : 'Offline'}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 italic">
                                      {device.health?.suspended ? (device.health?.suspendedReason || 'Kısıtlı') : 'Stabil'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <span className="inline-flex px-3 py-1 bg-indigo-50/50 border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                                    {device.owner || 'admin'}
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs font-black text-slate-700 tracking-tight">{formatDate(device.readyAt)}</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sistem ID: {device.id}</span>
                                  </div>
                                </td>
                                {isAdmin && (
                                  <td className="px-8 py-5 text-right">
                                    <button
                                      onClick={() => handleDeleteDevice(device.id)}
                                      className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                      title="Cihazı Kaldır"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                            {!pagedDevices.length && (
                              <tr>
                                <td colSpan={isAdmin ? 5 : 4} className="px-8 py-20 text-center">
                                  <div className="flex flex-col items-center opacity-40">
                                    <Smartphone size={40} className="mb-4 text-slate-300" />
                                    <h4 className="text-sm font-black text-slate-900">Sonuç Bulunamadı</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Arama kriterlerinize uygun cihaz yok</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Sayfa <span className="text-slate-900">{devicePage}</span> / {totalDevicePages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDevicePage(p => Math.max(1, p - 1))}
                            disabled={devicePage <= 1}
                            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            Geri
                          </button>
                          <button
                            onClick={() => setDevicePage(p => Math.min(totalDevicePages, p + 1))}
                            disabled={devicePage >= totalDevicePages}
                            className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                          >
                            İleri
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === 'campaigns' ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <form className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm" onSubmit={handleSubmitMessage}>
                        <div className="flex items-start justify-between mb-10">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900">Yeni Gönderim</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">SmartCampaign - Akıllı Mesajlaşma</p>
                          </div>
                          <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                            <Send size={24} />
                          </div>
                        </div>
                        <div className="space-y-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="message-label">Kampanya Başlığı</label>
                            <input
                              id="message-label"
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                              placeholder="Örn: Black Friday Duyurusu"
                              value={messageForm.label}
                              onChange={(event) => setMessageForm({ ...messageForm, label: event.target.value })}
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="message-recipients">Hedef Numaralar</label>
                            <textarea
                              id="message-recipients"
                              rows="4"
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all resize-none custom-scrollbar"
                              placeholder="905xxxxxxxxx formatında her satıra bir numara..."
                              value={messageForm.recipients}
                              onChange={(event) => setMessageForm({ ...messageForm, recipients: event.target.value })}
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="message-body">Mesaj İçeriği</label>
                              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md italic">SmartTag Destekli</span>
                            </div>
                            <textarea
                              id="message-body"
                              rows="6"
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all custom-scrollbar"
                              placeholder="Mesajınızı buraya yazın veya aşağıdan bir şablon seçin..."
                              value={messageForm.message}
                              onChange={(event) => setMessageForm({ ...messageForm, message: event.target.value })}
                            />
                          </div>
                          <button type="submit" className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50" disabled={submittingMessage}>
                            {submittingMessage ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                            {submittingMessage ? 'İŞLENİYOR...' : 'GÖNDERİMİ BAŞLAT'}
                          </button>
                        </div>
                      </form>

                      <div className="space-y-10">
                        <form className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm" onSubmit={handleSaveTemplate}>
                          <div className="flex items-start justify-between mb-8">
                            <div>
                              <h3 className="text-xl font-black text-slate-900">Şablon Merkezi</h3>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tekrarlayan içerikleri hızlandırın</p>
                            </div>
                            <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                              <RotateCcw size={20} />
                            </div>
                          </div>
                          <div className="space-y-5">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="template-title">Şablon İsmi</label>
                              <input
                                id="template-title"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500/20 text-sm font-bold text-slate-700 transition-all"
                                placeholder="Örn: Karşılama Mesajı"
                                value={templateForm.title}
                                onChange={(event) => setTemplateForm({ ...templateForm, title: event.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="template-content">İçerik</label>
                              <textarea
                                id="template-content"
                                rows="3"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500/20 text-sm font-bold text-slate-700 transition-all resize-none"
                                placeholder="Mesaj içeriği..."
                                value={templateForm.content}
                                onChange={(event) => setTemplateForm({ ...templateForm, content: event.target.value })}
                              />
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all disabled:opacity-50" disabled={savingTemplate}>
                                <Plus size={16} />
                                {savingTemplate ? 'Bekleyin...' : templateForm.id ? 'GÜNCELLE' : 'YENİ KAYDET'}
                              </button>
                              <button
                                type="button"
                                className="px-6 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                                onClick={() => setTemplateForm({ id: '', title: '', content: '' })}
                              >
                                TEMİZLE
                              </button>
                            </div>
                          </div>
                        </form>

                        <div className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-900">Son Gönderimler</h3>
                            <span className="text-[10px] font-black text-indigo-500 uppercase px-2.5 py-1 bg-indigo-50 rounded-lg">Kuyruk Özeti</span>
                          </div>
                          <div className="space-y-4">
                            {(queueData.queue || []).slice(0, 5).map((entry, index) => (
                              <div key={`${entry.recipient}-${entry.createdAt}-${index}`} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-slate-900 tabular-nums">{entry.recipient}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{entry.label || 'Direkt Mesaj'}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className={classNames(
                                    'px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter mb-1',
                                    entry.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                  )}>
                                    {entry.status === 'delivered' ? 'İletildi' : 'Beklemede'}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{formatDate(entry.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                            {!(queueData.queue || []).length && (
                              <div className="text-center py-6 text-[11px] font-bold text-slate-400 italic">No activity record.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates.map(t => (
                        <div key={t.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wide">{t.title}</h4>
                            <div className="text-slate-200 group-hover:text-primary transition-colors">
                              <ShieldCheck size={18} />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6 line-clamp-3 italic">"{t.content}"</p>
                          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                            <button
                              onClick={() => applyTemplate(t)}
                              className="text-xs font-bold text-primary hover:text-blue-700 transition-colors"
                            >
                              Şablonu Seç
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'profile' ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2">
                        <form className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm" onSubmit={handleSaveProfile}>
                          <div className="flex items-start justify-between mb-12">
                            <div>
                              <h3 className="text-2xl font-black text-slate-900">Profil & Ayarlar</h3>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hesap güvenliği ve API erişimi</p>
                            </div>
                            <div className="h-14 w-14 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center">
                              <User size={28} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="space-y-2 flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kullanıcı Tanımı</span>
                              <div className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-500 cursor-not-allowed uppercase text-xs tracking-tight">
                                {profile.username || 'hubmsg_user'}
                              </div>
                            </div>
                            <div className="space-y-2 flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hesap Tipi</span>
                              <div className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-500/80 cursor-not-allowed uppercase text-xs tracking-tight">
                                {isAdmin ? 'Enterprise Administrator' : 'Affiliate Partner Account'}
                              </div>
                            </div>
                            <div className="md:col-span-2 space-y-2 flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Erişim Anahtarı (API Key)</span>
                              <div className="px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-[11px] text-indigo-300 cursor-not-allowed break-all shadow-inner">
                                {profile.apiKey || 'key_****************'}
                              </div>
                            </div>
                            <div className="md:col-span-2 space-y-2 flex flex-col">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1" htmlFor="profile-phone">Kayıtlı İrtibat Numarası</label>
                              <input
                                id="profile-phone"
                                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-black text-lg text-slate-800 tabular-nums"
                                value={profilePhone}
                                placeholder="+90 5xx xxx xx xx"
                                onChange={(e) => { setProfilePhone(e.target.value); setProfileDirty(true); }}
                              />
                            </div>
                          </div>

                          <button type="submit" className="flex items-center gap-3 px-10 py-4 bs-gradient bg-indigo-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-500/20 hover:scale-[1.02] hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50" disabled={savingProfile}>
                            <ShieldCheck size={18} />
                            AYARLARI GÜNCELLE
                          </button>
                        </form>
                      </div>

                      <div className="space-y-10">
                        <div className="bg-slate-950 p-10 rounded-3xl shadow-2xl text-white overflow-hidden relative group">
                          <div className="absolute -right-10 -top-10 h-40 w-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-all duration-700" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-8 px-1">Hızlı Özet</h4>
                          <div className="space-y-8 relative">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kullanılan Kota</span>
                              <div className="flex items-end gap-2.5">
                                <span className="text-5xl font-black leading-none text-indigo-400 tabular-nums">{devices.length}</span>
                                <span className="text-sm font-bold text-slate-600 mb-1">/ {config?.profile?.deviceLimit || '∞'} Limit</span>
                              </div>
                              <div className="w-full h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (devices.length / (config?.profile?.deviceLimit || 100)) * 100)}%` }} />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Hizmet Sözleşmesi</span>
                              <div className="flex items-center gap-2.5">
                                <div className={classNames('h-2 w-2 rounded-full shadow-[0_0_8px]', config?.profile?.agreementSigned ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50')} />
                                <span className={classNames('text-sm font-black', config?.profile?.agreementSigned ? 'text-white' : 'text-amber-400')}>
                                  {config?.profile?.agreementSigned ? 'DOĞRULANDI' : 'İmza Bekleniyor'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Güvenli Oturumlar</h4>
                            <ShieldCheck size={16} className="text-indigo-500" />
                          </div>
                          <div className="space-y-4">
                            {(profile.trustedDevices || []).map(d => (
                              <div key={d.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm">
                                    <Smartphone size={20} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-slate-900 truncate max-w-[120px]">{d.ua || 'Unknown OS'}</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-0.5 tabular-nums">{d.ip}</span>
                                  </div>
                                </div>
                                <button onClick={() => handleRevokeTrustedDevice(d.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90">
                                  <XCircle size={16} />
                                </button>
                              </div>
                            ))}
                            {!(profile.trustedDevices || []).length && (
                              <div className="text-center py-6 border-2 border-dashed border-slate-50 rounded-2xl">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No trusted devices.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div >
    </div >
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
