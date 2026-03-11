class HubMsgAdmin {
    constructor() {
        this.config = null;
        this.pollTimer = null;
        this.translations = {};
        this.currentLang = 'az';
        this.loaderStartedAt = Date.now();
        this.loaderForceTimer = null;
        this.refreshTimer = null;
        this.refreshInFlight = false;
        this.refreshQueued = false;
        this.systemMonitorTimer = null;
        this.registrySearchTimer = null;
        localStorage.setItem('selectedLang', 'az');
        this.cacheDOM();
        this.setupLoaderGuards();
        this.bindEvents();
        this.init();
    }

    cacheDOM() {
        this.clientList = document.getElementById('wa-client-list');
        this.createBtn = document.getElementById('client-create-btn');
        this.deviceTableBody = document.getElementById('connected-device-table-body');
        this.deviceTableSearchInput = document.getElementById('connected-device-search');
        this.deviceTablePrevBtn = document.getElementById('device-table-prev');
        this.deviceTableNextBtn = document.getElementById('device-table-next');
        this.deviceTablePageInfo = document.getElementById('device-table-page-info');
        this.startupLoader = document.getElementById('startup-loader');
        this.recipientsArea = document.querySelector('textarea[name="recipients"]');
        this.load2faBtn = document.getElementById('load-2fa-users-btn');
        this.adminShortcuts = document.getElementById('admin-bulk-shortcuts');
        this.dealerForm = document.getElementById('dealer-form');
        this.activationForm = document.getElementById('activation-form');
        this.auditForm = document.getElementById('audit-form');
        this.activationResult = document.getElementById('activation-result');
        this.dealerTableBody = document.getElementById('dealer-table-body');
        this.messageLogFilterForm = document.getElementById('message-log-filter-form');
        this.messageLogsTableBody = document.getElementById('message-logs-table-body');
        this.messageLogSummary = document.getElementById('message-log-summary');
        this.messageLogSearch = document.getElementById('message-log-search');
        this.messageLogStatuses = document.getElementById('message-log-statuses');
        this.messageLogDevices = document.getElementById('message-log-devices');
        this.messageLogNodes = document.getElementById('message-log-nodes');
        this.messageLogOwners = document.getElementById('message-log-owners');
        this.messageLogFrom = document.getElementById('message-log-from');
        this.messageLogTo = document.getElementById('message-log-to');
        this.messageLogLimit = document.getElementById('message-log-limit');
        this.messageLogResetBtn = document.getElementById('message-log-reset-btn');
        this.messageLogRefreshBtn = document.getElementById('message-log-refresh-btn');
        this.blockedNumbersTableBody = document.getElementById('blocked-numbers-table-body');
        this.blockedNumbersSummary = document.getElementById('blocked-numbers-summary');
        this.detailedLogsFilterForm = document.getElementById('detailed-logs-filter-form');
        this.detailedLogsRefreshBtn = document.getElementById('detailed-logs-refresh-btn');
        this.detailedLogsResetBtn = document.getElementById('detailed-logs-reset-btn');
        this.detailedLogSearch = document.getElementById('detailed-log-search');
        this.detailedLogSources = document.getElementById('detailed-log-sources');
        this.detailedLogLevels = document.getElementById('detailed-log-levels');
        this.detailedLogOwners = document.getElementById('detailed-log-owners');
        this.detailedLogFrom = document.getElementById('detailed-log-from');
        this.detailedLogTo = document.getElementById('detailed-log-to');
        this.detailedLogLimit = document.getElementById('detailed-log-limit');
        this.detailedLogCriticalOnly = document.getElementById('detailed-log-critical-only');
        this.detailedLogAutoRefresh = document.getElementById('detailed-log-auto-refresh');
        this.detailedLogExportJsonBtn = document.getElementById('detailed-log-export-json');
        this.detailedLogExportCsvBtn = document.getElementById('detailed-log-export-csv');
        this.detailedLogsSummary = document.getElementById('detailed-logs-summary');
        this.detailedLogsTableBody = document.getElementById('detailed-logs-table-body');
        this.legalAgreementsTableBody = document.getElementById('legal-agreements-table-body');
        this.legalAgreementsSummary = document.getElementById('legal-agreements-summary');
        this.legalAgreementsRefreshBtn = document.getElementById('legal-agreements-refresh-btn');
        this.mobileAnnouncementForm = document.getElementById('mobile-announcement-form');
        this.mobileAnnouncementOwner = document.getElementById('mobile-announcement-owner');
        this.mobileAnnouncementType = document.getElementById('mobile-announcement-type');
        this.mobileAnnouncementTitle = document.getElementById('mobile-announcement-title');
        this.mobileAnnouncementBody = document.getElementById('mobile-announcement-body');
        this.mobileAnnouncementSendBtn = document.getElementById('mobile-announcement-send-btn');
        this.mobileAnnouncementsTableBody = document.getElementById('mobile-announcements-table-body');
        this.mobileAnnouncementsSummary = document.getElementById('mobile-announcements-summary');
        this.mobileAnnouncementsRefreshBtn = document.getElementById('mobile-announcements-refresh-btn');
        this.systemMonitorLastUpdated = document.getElementById('system-monitor-last-updated');
        this.systemMonitorRefreshBtn = document.getElementById('system-monitor-refresh-btn');
        this.systemMonitorAutoRefresh = document.getElementById('system-monitor-auto-refresh');
        this.systemMonitorLoopBody = document.getElementById('system-monitor-loop-body');
        this.systemMonitorLabelQueueBody = document.getElementById('system-monitor-label-queue-body');
        this.systemMonitorStuckBody = document.getElementById('system-monitor-stuck-body');
        this.systemMonitorBlockedBody = document.getElementById('system-monitor-blocked-body');
        this.systemMonitorOwnerBody = document.getElementById('system-monitor-owner-body');
        this.lookupForm = document.getElementById('lookup-form');
        this.lookupOwner = document.getElementById('lookup-owner');
        this.lookupNumbers = document.getElementById('lookup-numbers');
        this.lookupSubmitBtn = document.getElementById('lookup-submit-btn');
        this.lookupResultsBody = document.getElementById('lookup-results-body');
        this.lookupResultsSummary = document.getElementById('lookup-results-summary');
        this.recipientRegistryBody = document.getElementById('recipient-registry-body');
        this.recipientRegistrySummary = document.getElementById('recipient-registry-summary');
        this.recipientRegistrySearch = document.getElementById('recipient-registry-search');
        this.recipientRegistryRefreshBtn = document.getElementById('recipient-registry-refresh-btn');

        // Templates
        this.templateForm = document.getElementById('template-form');
        this.templateTableBody = document.getElementById('template-table-body');
        this.bulkTemplateSelect = document.getElementById('bulk-template-select');
        this.bulkMessageArea = document.getElementById('bulk-message-area');

        // Stats
        this.statSessions = document.getElementById('stat-sessions');
        this.statPending = document.getElementById('stat-pending');
        this.statDelivered = document.getElementById('stat-delivered');
        this.statFailed = document.getElementById('stat-failed');
        this.statSuccessRate24h = document.getElementById('stat-success-rate-24h');
        this.statBlocked24h = document.getElementById('stat-blocked-24h');
        this.statRiskyDevices = document.getElementById('stat-risky-devices');
        this.riskDeviceTableBody = document.getElementById('risk-device-table-body');
        this.riskDeviceSummary = document.getElementById('risk-device-summary');

        // User info
        this.userRoleLabel = document.getElementById('user-role-label');
        this.adminOnlyElements = document.querySelectorAll('.admin-only');
        this.clientOwnerSelect = document.getElementById('client-owner-select');

        // New Sidebar Elements
        this.sidebarUserName = document.getElementById('sidebar-user-name');
        this.sidebarUserEmail = document.getElementById('sidebar-user-email');
        this.sidebarMemberCount = document.getElementById('sidebar-member-count');
        this.sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
        this.sidebarSearchInput = document.getElementById('sidebar-search-input');

        // Forms
        this.bulkForm = document.querySelector('#bulk-section form');

        // AdminLTE specific
        this.sectionTitle = document.getElementById('section-title');
        this.sectionActions = document.getElementById('section-actions');

        // Pagination state
        this.loginLogsPage = 1;
        this.activityLogsPage = 1;
        this.logsPerPage = 20;
        this.allActivityLogs = [];

        // Profile
        this.profileForm = document.getElementById('profile-form');
        this.profileUsername = document.getElementById('profile-username');
        this.profileApiKey = document.getElementById('profile-apikey');
        this.profilePhone = document.getElementById('profile-phone');
        this.queueTableBody = document.querySelector('#message-status-table tbody');
        this.queueSearchInput = document.getElementById('queue-search-input');

        this.currentDevices = [];
        this.currentQueue = [];
        this.deviceTableData = [];
        this.deviceTablePage = 1;
        this.deviceTablePageSize = 12;
        this.lastDetailedLogs = [];
        this.detailedLogsAutoTimer = null;
        this.callingCodeToIso = {
            '1': 'us',
            '7': 'ru',
            '20': 'eg',
            '27': 'za',
            '30': 'gr',
            '31': 'nl',
            '32': 'be',
            '33': 'fr',
            '34': 'es',
            '36': 'hu',
            '39': 'it',
            '40': 'ro',
            '41': 'ch',
            '43': 'at',
            '44': 'gb',
            '45': 'dk',
            '46': 'se',
            '47': 'no',
            '48': 'pl',
            '49': 'de',
            '51': 'pe',
            '52': 'mx',
            '53': 'cu',
            '54': 'ar',
            '55': 'br',
            '56': 'cl',
            '57': 'co',
            '58': 've',
            '60': 'my',
            '61': 'au',
            '62': 'id',
            '63': 'ph',
            '64': 'nz',
            '65': 'sg',
            '66': 'th',
            '81': 'jp',
            '82': 'kr',
            '84': 'vn',
            '86': 'cn',
            '90': 'tr',
            '91': 'in',
            '92': 'pk',
            '93': 'af',
            '94': 'lk',
            '95': 'mm',
            '98': 'ir',
            '212': 'ma',
            '213': 'dz',
            '216': 'tn',
            '218': 'ly',
            '220': 'gm',
            '221': 'sn',
            '233': 'gh',
            '234': 'ng',
            '237': 'cm',
            '251': 'et',
            '254': 'ke',
            '255': 'tz',
            '256': 'ug',
            '259': 'zw',
            '380': 'ua',
            '385': 'hr',
            '387': 'ba',
            '420': 'cz',
            '421': 'sk',
            '971': 'ae',
            '972': 'il',
            '973': 'bh',
            '974': 'qa',
            '975': 'bt',
            '976': 'mn',
            '977': 'np',
            '994': 'az',
            '995': 'ge',
            '996': 'kg',
            '998': 'uz'
        };
    }

    renderProfile() {
        if (!this.config) return;

        document.getElementById('profile-username').value = this.config.username;
        document.getElementById('profile-apikey').value = this.config.apiKey;
        document.getElementById('profile-phone').value = this.config.phoneNumber || '';

        // Render Trusted Devices
        const tbody = document.getElementById('trusted-devices-body');
        if (tbody) {
            tbody.innerHTML = '';
            const devices = this.config.trustedDevices || [];
            if (devices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Etibarlı cihaz tapılmadı.</td></tr>';
            } else {
                devices.forEach(d => {
                    const row = document.createElement('tr');
                    const lastActive = d.lastActive ? new Date(d.lastActive).toLocaleString('az-AZ') : '-';

                    row.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-desktop mr-2 text-muted"></i>
                                <span class="text-truncate" style="max-width: 200px;" title="${d.ua}">${d.ua}</span>
                            </div>
                        </td>
                        <td>${d.ip}</td>
                        <td>${lastActive}</td>
                        <td>
                            <button class="btn btn-xs btn-outline-danger" onclick="revokeDevice('${d.id}')" title="Sil">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }
    }

    async revokeDevice(id) {
        if (!confirm('Bu cihazı etibarlı siyahıdan silmək istədiyinizə əminsiniz?')) return;

        try {
            const res = await fetch('/admin/security/revoke-device', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify({ deviceId: id })
            });

            if (res.ok) {
                this.showToast('Cihaz silindi', 'success');
                this.fetchProfile();
            } else {
                this.showToast('Silmə uğursuz oldu', 'error');
            }
        } catch (err) {
            console.error(err);
            this.showToast('Xəta baş verdi', 'error');
        }
    }

    bindEvents() {
        if (this.createBtn) {
            this.createBtn.addEventListener('click', () => this.handleCreateSession());
        }

        // Offcanvas: Add Device
        const addDeviceTrigger = document.getElementById('trigger-add-device');
        const addDeviceOffcanvas = document.getElementById('add-device-offcanvas');
        const addDeviceBackdrop = document.getElementById('add-device-backdrop');
        const addDeviceClose = document.getElementById('close-add-device');

        if (addDeviceTrigger && addDeviceOffcanvas && addDeviceBackdrop) {
            addDeviceTrigger.addEventListener('click', () => {
                addDeviceOffcanvas.classList.add('is-open');
                addDeviceBackdrop.classList.add('is-visible');

                const labelInput = document.getElementById('pairing-label-input');
                if (labelInput) setTimeout(() => labelInput.focus(), 300);

                this.fetchSessions();
                if (!this.pollTimer) {
                    this.pollTimer = setInterval(() => this.fetchSessions(), 3000);
                }
            });
        }

        if (addDeviceClose && addDeviceBackdrop && addDeviceOffcanvas) {
            [addDeviceClose, addDeviceBackdrop].forEach(el => {
                el.addEventListener('click', () => {
                    addDeviceOffcanvas.classList.remove('is-open');
                    addDeviceBackdrop.classList.remove('is-visible');

                    if (this.pollTimer) {
                        clearInterval(this.pollTimer);
                        this.pollTimer = null;
                    }
                });
            });
        }

        if (this.dealerForm) {
            this.dealerForm.addEventListener('submit', (e) => this.handleDealerSubmit(e));
        }

        if (this.load2faBtn) {
            this.load2faBtn.addEventListener('click', () => this.handleLoad2faUsers());
        }

        if (this.activationForm) {
            this.activationForm.addEventListener('submit', (e) => this.handleActivationSubmit(e));
        }

        if (this.auditForm) {
            this.auditForm.addEventListener('submit', (e) => this.handleAuditSubmit(e));
        }

        if (this.bulkForm) {
            this.bulkForm.addEventListener('submit', (e) => this.handleBulkSubmit(e));
        }

        if (this.messageLogFilterForm) {
            this.messageLogFilterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.refreshMessageLogViews();
            });
        }
        if (this.messageLogResetBtn) {
            this.messageLogResetBtn.addEventListener('click', () => this.resetMessageLogFilters());
        }
        if (this.messageLogRefreshBtn) {
            this.messageLogRefreshBtn.addEventListener('click', () => this.refreshMessageLogViews());
        }
        if (this.detailedLogsFilterForm) {
            this.detailedLogsFilterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.fetchDetailedLogs();
            });
        }
        if (this.detailedLogsRefreshBtn) {
            this.detailedLogsRefreshBtn.addEventListener('click', () => this.fetchDetailedLogs());
        }
        if (this.detailedLogsResetBtn) {
            this.detailedLogsResetBtn.addEventListener('click', () => this.resetDetailedLogFilters());
        }
        if (this.detailedLogCriticalOnly) {
            this.detailedLogCriticalOnly.addEventListener('change', () => this.fetchDetailedLogs());
        }
        if (this.detailedLogAutoRefresh) {
            this.detailedLogAutoRefresh.addEventListener('change', () => {
                this.setDetailedLogsAutoRefresh(this.detailedLogAutoRefresh.checked);
            });
        }
        if (this.detailedLogExportJsonBtn) {
            this.detailedLogExportJsonBtn.addEventListener('click', () => this.exportDetailedLogs('json'));
        }
        if (this.detailedLogExportCsvBtn) {
            this.detailedLogExportCsvBtn.addEventListener('click', () => this.exportDetailedLogs('csv'));
        }
        if (this.legalAgreementsRefreshBtn) {
            this.legalAgreementsRefreshBtn.addEventListener('click', () => this.fetchLegalAgreements());
        }
        if (this.mobileAnnouncementForm) {
            this.mobileAnnouncementForm.addEventListener('submit', (e) => this.handleMobileAnnouncementSubmit(e));
        }
        if (this.mobileAnnouncementsRefreshBtn) {
            this.mobileAnnouncementsRefreshBtn.addEventListener('click', () => this.fetchMobileAnnouncements());
        }
        if (this.systemMonitorRefreshBtn) {
            this.systemMonitorRefreshBtn.addEventListener('click', () => this.fetchSystemMonitor());
        }
        if (this.systemMonitorAutoRefresh) {
            this.systemMonitorAutoRefresh.addEventListener('change', () => {
                this.setSystemMonitorAutoRefresh(this.systemMonitorAutoRefresh.checked);
            });
        }
        if (this.lookupForm) {
            this.lookupForm.addEventListener('submit', (e) => this.handleLookupSubmit(e));
        }
        if (this.recipientRegistryRefreshBtn) {
            this.recipientRegistryRefreshBtn.addEventListener('click', () => this.fetchRecipientRegistry());
        }
        if (this.recipientRegistrySearch) {
            this.recipientRegistrySearch.addEventListener('input', () => {
                clearTimeout(this.registrySearchTimer);
                this.registrySearchTimer = setTimeout(() => this.fetchRecipientRegistry(), 350);
            });
        }

        if (this.templateForm) {
            this.templateForm.addEventListener('submit', (e) => this.handleTemplateSubmit(e));
        }

        if (this.bulkTemplateSelect) {
            this.bulkTemplateSelect.addEventListener('change', (e) => this.handleTemplateSelectChange(e));
        }

        if (this.profileForm) {
            this.profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        }

        // Global exposed functions
        window.copyToClipboard = (text) => this.copyToClipboard(text);
        window.delT = (id) => this.deleteTemplate(id);
        window.refQ = (id) => this.refreshSession(id);
        window.delS = (id) => this.deleteSession(id);
        window.delD = (id) => this.deleteDevice(id);
        window.setL = (u) => this.setDealerLimit(u);
        window.reactivateD = (u) => this.reactivateDealer(u);
        window.switchTab = (id) => this.switchTab(id);
        window.toggleModal = (id) => this.toggleModal(id);
        window.fetchLoginLogs = () => this.fetchLoginLogs();
        window.fetchDetailedLogs = () => this.fetchDetailedLogs();
        window.riskAct = (id, action) => this.handleRiskDeviceAction(id, action);
        window.fetchMessageLogs = () => this.fetchMessageLogs();
        window.revokeDevice = (id) => this.revokeDevice(id);
        window.changeLanguage = (lang) => this.setLanguage(lang);
        window.createBackup = () => this.createBackup();
        window.viewBackup = (id) => this.viewBackup(id);
        window.restoreBackup = (id) => this.restoreBackup(id);
        window.deleteBackup = (id) => this.deleteBackup(id);
        window.toggleBFC = (id, filename, element) => this.toggleBackupFileContent(id, filename, element);
        window.setLogPage = (type, page) => this.setLogPage(type, page);

        if (this.queueSearchInput) {
            this.queueSearchInput.addEventListener('input', () => this.updateQueueTable(this.currentQueue));
        }

        if (this.deviceTableSearchInput) {
            this.deviceTableSearchInput.addEventListener('input', () => {
                this.deviceTablePage = 1;
                this.renderDeviceTable();
            });
        }

        if (this.deviceTablePrevBtn) {
            this.deviceTablePrevBtn.addEventListener('click', () => {
                if (this.deviceTablePage > 1) {
                    this.deviceTablePage -= 1;
                    this.renderDeviceTable();
                }
            });
        }

        if (this.deviceTableNextBtn) {
            this.deviceTableNextBtn.addEventListener('click', () => {
                const totalPages = this.getDeviceTableTotalPages();
                if (this.deviceTablePage < totalPages) {
                    this.deviceTablePage += 1;
                    this.renderDeviceTable();
                }
            });
        }
    }

    async handleLoad2faUsers() {
        if (!confirm('Bütün 2FA aktiv nömrələr siyahıya əlavə edilsin?')) return;
        try {
            const res = await fetch('/admin/recipients/2fa');
            const data = await res.json();
            if (data.numbers && data.numbers.length > 0) {
                const current = this.recipientsArea.value.trim();
                const newNumbers = data.numbers.join('\n');
                this.recipientsArea.value = current ? (current + '\n' + newNumbers) : newNumbers;
                this.showToast(`${data.numbers.length} nömrə əlavə edildi.`);
            } else {
                this.showToast('Göndəriləcək nömrə tapılmadı.');
            }
        } catch (e) {
            console.error('2FA fetch error:', e);
            this.showToast('Xəta baş verdi.');
        }
    }

    async fetchBackups() {
        if (!this.config || !this.config.isAdminUser) return;

        const loader = document.getElementById('backups-loading');
        if (loader) loader.style.display = 'table-row-group';

        try {
            const res = await fetch('/admin/backups', {
                headers: { 'x-admin-api-key': this.config.apiKey }
            });
            if (res.ok) {
                const data = await res.json();
                this.renderBackups(data.backups || []);
            }
        } catch (error) {
            console.error('Backups fetch error:', error);
            this.showToast(this.t('toast.backups_load_error'));
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    renderBackups(backups) {
        const tbody = document.querySelector('#backups-table tbody');
        if (!tbody) return;

        this.lastBackups = backups;

        tbody.innerHTML = '';
        if (backups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Yədək tapılmadı.</td></tr>';
            return;
        }

        backups.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; font-size: 13px;">${b.date}</td>
                <td style="color: var(--text-dim); font-size: 13px;">${b.time}</td>
                <td><span style="font-size: 11px; color: var(--text-dim); background: var(--surface-2); padding: 2px 6px; border-radius: 4px;">${b.size}</span></td>
                <td class="text-right">
                    <button class="btn btn-xs btn-outline-info mr-1" onclick="viewBackup('${b.id}')" title="Bax"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-xs btn-outline-warning mr-1" onclick="restoreBackup('${b.id}')" title="Bərpa et"><i class="fas fa-history"></i></button>
                    <button class="btn btn-xs btn-outline-danger" onclick="deleteBackup('${b.id}')" title="Sil"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async createBackup() {
        const btn = document.getElementById('btn-create-backup');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Yədəklənir...';

        try {
            const res = await fetch('/admin/backups', {
                method: 'POST',
                headers: { 'x-admin-api-key': this.config.apiKey }
            });
            if (res.ok) {
                this.showToast(this.t('toast.backup_created'));
                this.fetchBackups();
            } else {
                const d = await res.json();
                this.showToast(d.error || this.t('toast.error'));
            }
        } catch (error) {
            this.showToast(this.t('toast.backup_error'));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    viewBackup(id) {
        const backup = this.lastBackups.find(b => b.id === id);
        if (!backup) return;

        const container = document.getElementById('backup-tree-view');
        let html = '<ul class="list-group list-group-flush list-group-tree">';
        backup.files.forEach(f => {
            const isJson = f.endsWith('.json');
            let icon = 'fa-file-code';
            if (f.endsWith('.tar.gz')) icon = 'fa-file-archive text-warning';
            else if (isJson) icon = 'fa-database text-info';

            const clickableStyle = isJson ? 'cursor: pointer;' : '';
            const onClickAttr = isJson ? `onclick="toggleBFC('${id}', '${f}', this)"` : '';

            html += `
                <li class="list-group-item py-2 px-0 border-0" style="background:transparent; border-bottom: 1px solid var(--border) !important;">
                    <div class="d-flex align-items-center" style="${clickableStyle}" ${onClickAttr}>
                        <i class="fas ${icon} mr-3" style="width:20px; text-align:center; font-size: 14px;"></i> 
                        <span style="font-size: 13px; color: var(--text); flex-grow: 1;">${f}</span>
                        ${isJson ? '<i class="fas fa-chevron-down small text-muted bfc-chevron"></i>' : ''}
                    </div>
                    ${isJson ? `<div class="bfc-container mt-2 d-none" id="bfc-${id.replace(/\//g, '-')}-${f.replace(/\./g, '-')}">
                        <pre style="background: var(--surface); color: var(--text); padding: 10px; border-radius: 6px; font-size: 11px; max-height: 200px; overflow-y: auto; border: 1px solid var(--border);"></pre>
                    </div>` : ''}
                </li>`;
        });
        html += '</ul>';

        container.innerHTML = html;

        // Setup Buttons in Modal
        document.getElementById('btn-delete-backup-modal').onclick = () => {
            $('#backupDetailModal').modal('hide');
            this.deleteBackup(id);
        };
        document.getElementById('btn-restore-backup-modal').onclick = () => {
            $('#backupDetailModal').modal('hide');
            this.restoreBackup(id);
        };

        $('#backupDetailModal').modal('show');
    }

    async toggleBackupFileContent(id, filename, element) {
        const targetId = `bfc-${id.replace(/\//g, '-')}-${filename.replace(/\./g, '-')}`;
        const container = document.getElementById(targetId);
        if (!container) return;

        const pre = container.querySelector('pre');
        const chevron = element.querySelector('.bfc-chevron');

        if (container.classList.contains('d-none')) {
            if (!pre.innerHTML) {
                pre.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin mr-2"></i> Yüklənir...</div>';
                try {
                    const res = await fetch(`/admin/backups/${id}/file/${filename}`, {
                        headers: { 'x-admin-api-key': this.config.apiKey }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        pre.innerHTML = this.renderJsonAsTable(data.content);
                    } else {
                        pre.innerHTML = '<div class="text-danger p-3">Xəta: Yüklənmədi.</div>';
                    }
                } catch (e) {
                    pre.innerHTML = `<div class="text-danger p-3">Xəta: ${e.message}</div>`;
                }
            }
            container.classList.remove('d-none');
            if (chevron) {
                chevron.classList.remove('fa-chevron-down');
                chevron.classList.add('fa-chevron-up');
            }
        } else {
            container.classList.add('d-none');
            if (chevron) {
                chevron.classList.remove('fa-chevron-up');
                chevron.classList.add('fa-chevron-down');
            }
        }
    }

    renderJsonAsTable(data) {
        if (!data) return '<div class="p-3 text-muted">Boş məlumat.</div>';

        let rows = [];
        if (Array.isArray(data)) {
            rows = data;
        } else if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length > 0 && typeof data[keys[0]] === 'object' && !Array.isArray(data[keys[0]])) {
                rows = keys.map(k => ({ id: k, ...data[k] }));
            } else {
                rows = [data];
            }
        }

        if (rows.length === 0) return '<div class="p-3 text-muted">Qeyd tapılmadı.</div>';

        const headers = new Set();
        rows.slice(0, 10).forEach(row => {
            Object.keys(row).forEach(k => {
                const val = row[k];
                if (val === null || (typeof val !== 'object' && typeof val !== 'function')) {
                    headers.add(k);
                }
            });
        });

        if (headers.size === 0) {
            return `<pre style="font-size:11px; margin:0; background:transparent;">${JSON.stringify(data, null, 2)}</pre>`;
        }

        const headerList = Array.from(headers);
        let html = '<div class="table-responsive" style="max-height: 300px;"><table class="table table-sm table-logs mb-0" style="font-size: 11px;"><thead><tr>';
        headerList.forEach(h => html += `<th>${h}</th>`);
        html += '</tr></thead><tbody>';

        rows.forEach(row => {
            html += '<tr>';
            headerList.forEach(h => {
                let val = row[h];
                if (val === undefined || val === null) val = '-';
                else if (typeof val === 'boolean') val = val ? 'Bəli' : 'Xeyr';
                else if (typeof val === 'string' && val.length > 50) val = val.substring(0, 47) + '...';
                html += `<td>${val}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    async deleteBackup(id) {
        if (!confirm('Bu yədəyi daimi silmək istədiyinizə əminsiniz?')) return;

        try {
            const [date, time] = id.split('/');
            const res = await fetch(`/admin/backups/${date}/${time}`, {
                method: 'DELETE',
                headers: { 'x-admin-api-key': this.config.apiKey }
            });
            if (res.ok) {
                this.showToast('Yədək silindi.');
                this.fetchBackups();
            } else {
                this.showToast('Silmək mümkün olmadı.');
            }
        } catch (error) {
            this.showToast(this.t('toast.backup_delete_error'));
        }
    }

    async restoreBackup(id) {
        if (!confirm('Sistem məlumatları bərpa ediləcək və server yenidən başladılacaq. Əminsiniz?')) return;

        this.showToast(this.t('toast.backup_restoring'));

        try {
            const res = await fetch('/admin/backups/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify({ id })
            });

            const d = await res.json();
            if (res.ok) {
                alert(d.message);
                // Reload page after a delay to allow restart
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                this.showToast(d.error || this.t('toast.restore_failed'));
            }
        } catch (error) {
            this.showToast(this.t('toast.server_unreachable'));
        }
    }

    async loadTemplates() {
        try {
            const res = await fetch('/admin/templates');
            if (res.ok) {
                const templates = await res.json();
                this.renderTemplates(templates);
                this.updateBulkTemplateDropdown(templates);
            }
        } catch (error) {
            console.error('Templates fetch error:', error);
        }
    }

    renderTemplates(templates) {
        if (!this.templateTableBody) return;

        if (templates.length === 0) {
            this.templateTableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4" data-i18n="templates.no_templates">${this.t('templates.no_templates')}</td></tr>`;
            return;
        }

        this.templateTableBody.innerHTML = templates.map(t => `
            <tr>
                <td>
                    <div class="font-weight-bold">${t.title}</div>
                    <div class="small text-muted text-truncate" style="max-width: 300px;">${t.content}</div>
                </td>
                <td class="text-right">
                    <button class="btn btn-sm btn-outline-danger" onclick="delT('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateBulkTemplateDropdown(templates) {
        if (!this.bulkTemplateSelect) return;

        const currentVal = this.bulkTemplateSelect.value;
        this.bulkTemplateSelect.innerHTML = `<option value="">-- ${this.t('bulk.select_template')} --</option>` +
            templates.map(t => `<option value="${t.id}">${t.title}</option>`).join('');

        this.bulkTemplateSelect.value = currentVal;
    }

    async handleTemplateSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('template-title').value;
        const content = document.getElementById('template-content').value;

        try {
            const res = await fetch('/admin/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });

            if (res.ok) {
                this.templateForm.reset();
                this.loadTemplates();
                this.showToast(this.t('toast.dealer_added')); // Reusing success toast
            }
        } catch (error) {
            console.error('Template save error:', error);
            this.showToast(this.t('toast.error'));
        }
    }

    async deleteTemplate(id) {
        if (!confirm(this.t('templates.delete_confirm'))) return;

        try {
            const res = await fetch(`/admin/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                this.loadTemplates();
                this.showToast(this.t('toast.backup_deleted')); // Reusing success toast
            }
        } catch (error) {
            console.error('Template delete error:', error);
            this.showToast(this.t('toast.error'));
        }
    }

    handleTemplateSelectChange(e) {
        const templateId = e.target.value;
        if (!templateId) return;

        fetch('/admin/templates')
            .then(res => res.json())
            .then(templates => {
                const selected = templates.find(t => t.id === templateId);
                if (selected && this.bulkMessageArea) {
                    this.bulkMessageArea.value = selected.content;
                }
            });
    }

    async init() {
        try {
            await this.setLanguage(this.currentLang);
            await this.loadTemplates();
            await this.fetchConfig();
            this.applyInitialSidebarState();
            this.initSidebarMenu();
            this.updateOpsMetrics({
                successRate: 0,
                blockedCount: 0,
                riskyDevices: []
            });
            await this.refresh();
            this.startRefreshLoop();

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('success')) this.showToast(urlParams.get('success'));
            if (urlParams.get('error')) this.showToast(urlParams.get('error'));
            if (urlParams.get('toast')) this.showToast(urlParams.get('toast'));

            const tab = urlParams.get('tab');
            if (tab) {
                this.switchTab(tab);
            } else {
                this.switchTab('devices-section');
            }
        } catch (error) {
            console.error('Init error:', error);
        } finally {
            this.hideStartupLoader();
        }
    }

    setupLoaderGuards() {
        // Failsafe: if anything stalls, hide loader after 12s
        this.loaderForceTimer = setTimeout(() => this.hideStartupLoader(), 12000);

        // Ensure loader is hidden after full window load as well
        window.addEventListener('load', () => this.hideStartupLoader(), { once: true });
    }

    startRefreshLoop() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        this.refreshTimer = setInterval(() => {
            if (document.hidden) return;
            this.refresh();
        }, 5000);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refresh();
            }
        });
    }

    hideStartupLoader() {
        if (!this.startupLoader) return;
        if (this.startupLoader.classList.contains('is-hidden')) return;

        const minVisibleMs = 350;
        const elapsed = Date.now() - (this.loaderStartedAt || Date.now());
        const delay = Math.max(0, minVisibleMs - elapsed);

        setTimeout(() => {
            if (!this.startupLoader || this.startupLoader.classList.contains('is-hidden')) return;
            this.startupLoader.classList.add('is-hidden');
            if (this.loaderForceTimer) {
                clearTimeout(this.loaderForceTimer);
                this.loaderForceTimer = null;
            }
            setTimeout(() => {
                if (this.startupLoader) this.startupLoader.remove();
            }, 240);
        }, delay);
    }

    applyInitialSidebarState() {
        // Sidebar katlanma özelliği kaldırıldı
    }

    initSidebarMenu() {
        // MetisMenu is disabled as per "always open" requirement.
        // Elements are now controlled via CSS (display: block !important).
    }

    switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-pane').forEach(el => {
            el.classList.remove('active');
        });

        // Show target tab
        const target = document.getElementById(tabId);
        if (target) {
            target.classList.add('active');
        }

        // Update nav state (Keep all treeviews open)
        let activeLink = null;
        document.querySelectorAll('.nav-link[data-target]').forEach(el => {
            el.classList.remove('active');
            if (el.getAttribute('data-target') === tabId) {
                el.classList.add('active');
                activeLink = el;

                // Update title & actions based on tab
                if (this.sectionTitle) {
                    const p = el.querySelector('p');
                    if (p) this.sectionTitle.textContent = p.textContent;
                }
                if (this.sectionActions) {
                    this.sectionActions.style.display = (tabId === 'devices-section') ? 'block' : 'none';
                }
            }
        });

        if (activeLink) {
            // Keep current link's treeview highlighted but don't close others
            const treeItem = activeLink.closest('.nav-item.has-treeview');
            if (treeItem) {
                const parentLink = treeItem.querySelector(':scope > .nav-link');
                if (parentLink) parentLink.classList.add('active');
            }
        }

        if (tabId === 'login-logs-section') {
            this.fetchLoginLogs();
            if (this.detailedLogAutoRefresh && this.detailedLogAutoRefresh.checked) {
                this.setDetailedLogsAutoRefresh(true);
            }
        } else {
            this.setDetailedLogsAutoRefresh(false);
        }

        // Close sidebar on small screens after clicking a link
        if (window.innerWidth < 992) {
            document.body.classList.remove('sidebar-open');
        }

        if (tabId === 'backups-section') {
            this.fetchBackups();
        }

        if (tabId === 'message-logs-section') {
            this.refreshMessageLogViews();
        }

        if (tabId === 'system-monitor-section') {
            this.fetchSystemMonitor();
            const autoEnabled = this.systemMonitorAutoRefresh ? this.systemMonitorAutoRefresh.checked : true;
            this.setSystemMonitorAutoRefresh(autoEnabled);
        } else {
            this.setSystemMonitorAutoRefresh(false);
        }

        if (tabId === 'lookup-section') {
            this.fetchRecipientRegistry();
        }

        if (tabId === 'legal-agreements-section') {
            this.fetchLegalAgreements();
        }
        if (tabId === 'mobile-announcements-section') {
            this.fetchMobileAnnouncements();
        }

        if (tabId === 'settings-section' || tabId === 'security-section') {
            this.fetchProfile();
        }

        if (tabId === 'add-device-section') {
            const labelInput = document.getElementById('pairing-label-input');
            if (labelInput) setTimeout(() => labelInput.focus(), 300);

            this.fetchSessions();
            if (!this.pollTimer) {
                this.pollTimer = setInterval(() => this.fetchSessions(), 5000);
            }
        } else {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        }

        // Auto close sidebar on mobile after clicking (Disabled for "normal" sidebar)
        /*
        if (window.innerWidth < 992) {
            $('body').removeClass('sidebar-open').addClass('sidebar-closed sidebar-collapse');
        }
        */
    }

    toggleModal(modalId) {
        $(`#${modalId}`).modal('toggle');
    }

    async fetchLoginLogs() {
        if (!this.config || !this.config.isAdminUser) return;
        try {
            const res = await fetch('/admin/login-logs', {
                headers: { 'x-admin-api-key': this.config.apiKey }
            });
            if (res.ok) {
                const data = await res.json();
                this.allLoginLogs = data.logins || [];
                this.allActivityLogs = data.activity || [];

                this.loginLogsPage = 1;
                this.activityLogsPage = 1;

                this.renderLoginLogs();
                this.renderActivityLogs();
                this.renderActiveSessions(data.activeSessions || []);
                this.fetchDetailedLogs();
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    }

    resetDetailedLogFilters() {
        if (this.detailedLogSearch) this.detailedLogSearch.value = '';
        if (this.detailedLogFrom) this.detailedLogFrom.value = '';
        if (this.detailedLogTo) this.detailedLogTo.value = '';
        if (this.detailedLogLimit) this.detailedLogLimit.value = 1000;
        if (this.detailedLogCriticalOnly) this.detailedLogCriticalOnly.checked = false;
        [this.detailedLogSources, this.detailedLogLevels, this.detailedLogOwners].forEach((el) => {
            if (!el) return;
            Array.from(el.options).forEach((opt) => {
                opt.selected = false;
            });
        });
        this.fetchDetailedLogs();
    }

    async fetchDetailedLogs() {
        if (!this.config || !this.config.isAdminUser || !this.detailedLogsTableBody) return;
        try {
            const params = new URLSearchParams();
            if (this.detailedLogSearch && this.detailedLogSearch.value.trim()) {
                params.set('q', this.detailedLogSearch.value.trim());
            }
            const sourceValues = this.getMultiSelectValues(this.detailedLogSources);
            const levelValues = this.getMultiSelectValues(this.detailedLogLevels);
            const ownerValues = this.getMultiSelectValues(this.detailedLogOwners);
            if (sourceValues.length) params.set('sources', sourceValues.join(','));
            if (levelValues.length) params.set('levels', levelValues.join(','));
            if (ownerValues.length) params.set('owners', ownerValues.join(','));
            if (this.detailedLogFrom && this.detailedLogFrom.value) params.set('from', this.detailedLogFrom.value);
            if (this.detailedLogTo && this.detailedLogTo.value) params.set('to', this.detailedLogTo.value);
            if (this.detailedLogLimit && this.detailedLogLimit.value) params.set('limit', this.detailedLogLimit.value);
            if (this.detailedLogCriticalOnly && this.detailedLogCriticalOnly.checked) params.set('critical', '1');

            const selectedSources = sourceValues.slice();
            const selectedLevels = levelValues.slice();
            const selectedOwners = ownerValues.slice();

            const res = await fetch(`/admin/detailed-logs?${params.toString()}`);
            if (!res.ok) throw new Error('Ətraflı jurnallar alına bilmədi');
            const data = await res.json();

            this.setMultiSelectOptions(this.detailedLogSources, data.filterOptions?.sources || [], selectedSources);
            this.setMultiSelectOptions(this.detailedLogLevels, data.filterOptions?.levels || [], selectedLevels);
            this.setMultiSelectOptions(this.detailedLogOwners, data.filterOptions?.owners || [], selectedOwners);

            this.renderDetailedLogs(data.logs || [], data.total || 0);
        } catch (error) {
            console.error('Detailed logs fetch error:', error);
            this.detailedLogsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Ətraflı jurnallar alınarkən xəta baş verdi.</td></tr>';
            if (this.detailedLogsSummary) this.detailedLogsSummary.textContent = '0 qeyd';
        }
    }

    renderDetailedLogs(logs, total) {
        if (!this.detailedLogsTableBody) return;
        this.detailedLogsTableBody.innerHTML = '';
        this.lastDetailedLogs = Array.isArray(logs) ? logs.slice() : [];
        if (this.detailedLogsSummary) this.detailedLogsSummary.textContent = `${total || 0} qeyd`;

        if (!logs || logs.length === 0) {
            this.detailedLogsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Qeyd tapılmadı.</td></tr>';
            return;
        }

        logs.forEach((log) => {
            const tr = document.createElement('tr');
            const atText = log.at ? new Date(log.at).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
            const rawText = JSON.stringify(log.raw || {}, null, 0);
            const compactRaw = rawText.length > 180 ? `${rawText.slice(0, 180)}...` : rawText;
            const msg = log.error ? `${log.message || '-'} | ${log.error}` : (log.message || '-');
            tr.innerHTML = `
                <td style="white-space: nowrap; font-size: 12px; color: var(--text-dim);">${atText}</td>
                <td style="font-size: 12px;">${this.escapeHtml(log.source || '-')}</td>
                <td style="font-size: 12px;">${this.escapeHtml(log.level || '-')}</td>
                <td style="font-size: 12px;">${this.escapeHtml(log.owner || '-')}</td>
                <td style="font-size: 12px;">${this.escapeHtml(log.type || '-')}</td>
                <td style="font-size: 12px;">${this.escapeHtml(log.status || '-')}</td>
                <td style="font-size: 12px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(msg)}">${this.escapeHtml(msg)}</td>
                <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(rawText)}"><code style="font-size: 10px;">${this.escapeHtml(compactRaw)}</code></td>
            `;
            this.detailedLogsTableBody.appendChild(tr);
        });
    }

    setLogPage(type, page) {
        if (type === 'login') {
            this.loginLogsPage = page;
            this.renderLoginLogs();
        } else if (type === 'activity') {
            this.activityLogsPage = page;
            this.renderActivityLogs();
        }
    }

    getMultiSelectValues(selectEl) {
        if (!selectEl) return [];
        return Array.from(selectEl.selectedOptions || []).map((opt) => opt.value).filter(Boolean);
    }

    setMultiSelectOptions(selectEl, values, previouslySelected = []) {
        if (!selectEl) return;
        const selectedSet = new Set(previouslySelected);
        selectEl.innerHTML = '';
        (values || []).forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = selectedSet.has(value);
            selectEl.appendChild(option);
        });
    }

    resetMessageLogFilters() {
        if (this.messageLogSearch) this.messageLogSearch.value = '';
        if (this.messageLogFrom) this.messageLogFrom.value = '';
        if (this.messageLogTo) this.messageLogTo.value = '';
        if (this.messageLogLimit) this.messageLogLimit.value = 500;
        [this.messageLogStatuses, this.messageLogDevices, this.messageLogNodes, this.messageLogOwners].forEach((el) => {
            if (!el) return;
            Array.from(el.options).forEach((opt) => {
                opt.selected = false;
            });
        });
        this.refreshMessageLogViews();
    }

    async refreshMessageLogViews() {
        await Promise.all([
            this.fetchMessageLogs(),
            this.fetchBlockedNumbers()
        ]);
    }

    async fetchMessageLogs() {
        if (!this.messageLogsTableBody) return;
        try {
            const params = new URLSearchParams();
            if (this.messageLogSearch && this.messageLogSearch.value.trim()) {
                params.set('q', this.messageLogSearch.value.trim());
            }
            const statusValues = this.getMultiSelectValues(this.messageLogStatuses);
            const deviceValues = this.getMultiSelectValues(this.messageLogDevices);
            const nodeValues = this.getMultiSelectValues(this.messageLogNodes);
            const ownerValues = this.getMultiSelectValues(this.messageLogOwners);
            if (statusValues.length) params.set('statuses', statusValues.join(','));
            if (deviceValues.length) params.set('devices', deviceValues.join(','));
            if (nodeValues.length) params.set('nodes', nodeValues.join(','));
            if (ownerValues.length && this.config && this.config.isAdminUser) {
                params.set('owners', ownerValues.join(','));
            }
            if (this.messageLogFrom && this.messageLogFrom.value) params.set('from', this.messageLogFrom.value);
            if (this.messageLogTo && this.messageLogTo.value) params.set('to', this.messageLogTo.value);
            if (this.messageLogLimit && this.messageLogLimit.value) params.set('limit', this.messageLogLimit.value);

            const selectedStatuses = statusValues.slice();
            const selectedDevices = deviceValues.slice();
            const selectedNodes = nodeValues.slice();
            const selectedOwners = ownerValues.slice();

            const res = await fetch(`/admin/message-logs?${params.toString()}`);
            if (!res.ok) throw new Error('Mesaj jurnalları alına bilmədi');
            const data = await res.json();

            this.setMultiSelectOptions(this.messageLogStatuses, data.filterOptions?.statuses || [], selectedStatuses);
            this.setMultiSelectOptions(this.messageLogDevices, data.filterOptions?.devices || [], selectedDevices);
            this.setMultiSelectOptions(this.messageLogNodes, data.filterOptions?.nodes || [], selectedNodes);
            if (this.config && this.config.isAdminUser) {
                this.setMultiSelectOptions(this.messageLogOwners, data.filterOptions?.owners || [], selectedOwners);
            }

            this.renderMessageLogs(data.logs || [], data.total || 0);
        } catch (error) {
            console.error('Message log fetch error:', error);
            this.messageLogsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Mesaj jurnalları alınarkən xəta baş verdi.</td></tr>`;
        }
    }

    async fetchBlockedNumbers() {
        if (!this.blockedNumbersTableBody) return;
        try {
            const params = new URLSearchParams();
            if (this.messageLogSearch && this.messageLogSearch.value.trim()) {
                params.set('q', this.messageLogSearch.value.trim());
            }
            params.set('limit', '500');

            const res = await fetch(`/admin/blocked-numbers?${params.toString()}`);
            if (!res.ok) throw new Error('Bloklanan nömrələr alına bilmədi');
            const data = await res.json();
            this.renderBlockedNumbers(data.rows || [], data.total || 0);
        } catch (error) {
            console.error('Blocked numbers fetch error:', error);
            this.blockedNumbersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Blok qeydləri alınarkən xəta baş verdi.</td></tr>`;
            if (this.blockedNumbersSummary) this.blockedNumbersSummary.textContent = '0 qeyd';
        }
    }

    renderBlockedNumbers(rows, total) {
        if (!this.blockedNumbersTableBody) return;
        this.blockedNumbersTableBody.innerHTML = '';
        if (this.blockedNumbersSummary) {
            this.blockedNumbersSummary.textContent = `${total || 0} qeyd`;
        }

        if (!rows || rows.length === 0) {
            this.blockedNumbersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Bloklanmış nömrə tapılmadı.</td></tr>`;
            return;
        }

        rows.forEach((row) => {
            const tr = document.createElement('tr');
            const lastBlockedText = row.lastBlockedAt
                ? new Date(row.lastBlockedAt).toLocaleString('az-AZ', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })
                : '-';
            const detailParts = [];
            if (row.deviceId) detailParts.push(row.deviceId);
            if (row.nodeLabel) detailParts.push(row.nodeLabel);
            if (row.lastError) detailParts.push(row.lastError);
            const detailText = detailParts.join(' · ') || '-';

            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text);">${this.escapeHtml(row.recipient || row.recipientDigits || '-')}</td>
                <td style="font-size: 12px; color: var(--text-dim);">${this.escapeHtml(row.owner || 'admin')}</td>
                <td><span class="badge badge-danger">${Number(row.blockedCount) || 0}</span></td>
                <td style="white-space: nowrap; color: var(--text-dim); font-size: 12px;">${lastBlockedText}</td>
                <td style="font-size: 12px; color: var(--text-dim); max-width: 460px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(detailText)}">${this.escapeHtml(detailText)}</td>
            `;
            this.blockedNumbersTableBody.appendChild(tr);
        });
    }

    renderMessageLogs(logs, total) {
        if (!this.messageLogsTableBody) return;
        this.messageLogsTableBody.innerHTML = '';

        if (this.messageLogSummary) {
            this.messageLogSummary.textContent = `${total || 0} qeyd`;
        }

        if (!logs || logs.length === 0) {
            this.messageLogsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Qeyd tapılmadı.</td></tr>`;
            return;
        }

        logs.forEach((log) => {
            const tr = document.createElement('tr');
            const status = log.status || 'queued';

            // Status dot color
            const dotColor = status === 'iletildi' ? 'var(--green)' : (status === 'hata' ? 'var(--red)' : 'var(--yellow)');

            const when = log.sentAt || log.lastAttempt || log.createdAt;
            const whenText = when ? new Date(when).toLocaleString('az-AZ', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            }) : '-';

            const snippet = (log.snippet || '').toString();
            const owner = log.owner || 'admin';
            const recipient = log.recipient || '-';
            const device = log.deviceId || log.clientId || '';
            const node = log.nodeLabel || log.nodeId || '-';
            const ref = log.refCode || '';
            const errorText = log.error || '';
            const statusText = status === 'iletildi' ? 'Uğurlu' : (status === 'hata' ? 'Uğursuz' : status);

            // Build detail line
            let detailParts = [];
            if (device) detailParts.push(device);
            if (log.deviceLabel && log.deviceLabel !== device) detailParts.push(log.deviceLabel);
            if (ref) detailParts.push(ref);
            const detailLine = detailParts.join(' · ');

            tr.innerHTML = `
                <td style="white-space: nowrap; color: var(--text-dim); font-size: 12px;">${whenText}</td>
                <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor}; margin-right:6px;" title="${status}"></span><span style="font-size:12px; color:var(--text-dim);">${statusText}</span></td>
                <td style="color: var(--text); font-size: 12px; white-space: nowrap;">${node}</td>
                <td>
                    <span class="log-from">${owner}</span>
                    <span class="log-arrow">→</span>
                    <span class="log-to">${recipient}</span>
                </td>
                <td style="color: var(--text); max-width: 250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${snippet.replace(/"/g, '&quot;')}">${snippet || '-'}</td>
                <td>
                    ${errorText ? `<div style="color: var(--red); font-size: 12px;">${errorText}</div>` : ''}
                    ${detailLine ? `<div class="log-detail-sub">${detailLine}</div>` : '<span style="color:var(--text-dim)">-</span>'}
                </td>
            `;
            this.messageLogsTableBody.appendChild(tr);
        });
    }

    renderActiveSessions(sessions) {
        const tbody = document.getElementById('active-sessions-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-3 text-center text-muted small">Aktiv sessiya yoxdur.</td></tr>';
            return;
        }

        sessions.forEach(s => {
            const tr = document.createElement('tr');
            const lastSeen = new Date(s.lastSeen);
            const timeStr = lastSeen.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });

            tr.innerHTML = `
                <td style="color: var(--text-dim); font-size: 12px; font-weight: 500;">
                    <span class="user-id-prefix">@</span>${s.username}
                </td>
                <td style="font-family: monospace; font-size: 11px;">${s.ip}</td>
                <td style="max-width: 250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: var(--text-dim); font-size: 11px;" title="${s.ua}">${s.ua}</td>
                <td>
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--green); margin-right:6px;" class="pulsate-dot"></span>
                    <span style="font-size: 12px;">${timeStr}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderLoginLogs() {
        const tbody = document.getElementById('login-logs-table-body');
        const paginationContainer = document.getElementById('login-logs-pagination');
        if (!tbody) return;
        tbody.innerHTML = '';

        const logs = this.allLoginLogs || [];
        const total = logs.length;
        const totalPages = Math.ceil(total / this.logsPerPage) || 1;
        const start = (this.loginLogsPage - 1) * this.logsPerPage;
        const end = start + this.logsPerPage;
        const pageLogs = logs.slice(start, end);

        if (pageLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-muted small">Qeyd tapılmadı.</td></tr>';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        pageLogs.forEach(log => {
            const tr = document.createElement('tr');
            const dotColor = log.success ? 'var(--green)' : 'var(--red)';
            const statusText = log.success ? 'Uğurlu' : 'Xəta';
            const countryText = this.normalizeCountryLabel(log.country || '?');

            const when = new Date(log.timestamp);
            const whenText = when.toLocaleString('az-AZ', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            tr.innerHTML = `
                <td style="white-space: nowrap; color: var(--text-dim); font-size: 12px;">${whenText}</td>
                <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor};" title="${statusText}"></span></td>
                <td style="font-weight: 500;">${log.username}</td>
                <td style="font-size: 12px;">
                    <span class="mr-1">${log.flag || '🌍'}</span> ${log.ip} <span class="text-muted" style="font-size: 10px;">(${countryText})</span>
                </td>
                <td style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: var(--text-dim); font-size: 11px;" title="${log.ua}">${log.ua}</td>
            `;
            tbody.appendChild(tr);
        });

        if (paginationContainer) {
            this.renderPagination(paginationContainer, 'login', this.loginLogsPage, totalPages, total);
        }
    }

    renderActivityLogs() {
        const tbody = document.getElementById('activity-logs-table-body');
        const paginationContainer = document.getElementById('activity-logs-pagination');
        if (!tbody) return;
        tbody.innerHTML = '';

        const activities = (this.allActivityLogs || []).slice().reverse();
        const total = activities.length;
        const totalPages = Math.ceil(total / this.logsPerPage) || 1;
        const start = (this.activityLogsPage - 1) * this.logsPerPage;
        const end = start + this.logsPerPage;
        const pageActivities = activities.slice(start, end);

        if (pageActivities.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-muted small">Qeyd tapılmadı.</td></tr>`;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        pageActivities.forEach(act => {
            const tr = document.createElement('tr');
            const when = new Date(act.at);
            const whenText = when.toLocaleString('az-AZ', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            let typeIcon = 'fa-info-circle text-muted';
            switch (act.type) {
                case 'message.sent': typeIcon = 'fa-check-circle text-success'; break;
                case 'message.error': typeIcon = 'fa-exclamation-circle text-danger'; break;
                case 'device.connected': typeIcon = 'fa-link text-primary'; break;
                case 'queue.enqueued': typeIcon = 'fa-clock text-info'; break;
                case 'auth.login': typeIcon = 'fa-user-check text-warning'; break;
            }

            const metaStr = act.meta ? `<code style="font-size: 10px; background: var(--surface); padding: 2px 4px; border-radius: 4px; border: 1px solid var(--border); color: var(--text-dim);">${JSON.stringify(act.meta)}</code>` : '-';

            tr.innerHTML = `
                <td style="white-space: nowrap; color: var(--text-dim); font-size: 12px;">${whenText}</td>
                <td title="${act.type}"><i class="fas ${typeIcon}" style="font-size: 14px;"></i></td>
                <td style="font-weight: 500; font-size: 13px;">${act.owner || 'Sistem'}</td>
                <td style="font-size: 13px; color: var(--text);">${act.message}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${metaStr}</td>
            `;
            tbody.appendChild(tr);
        });

        if (paginationContainer) {
            this.renderPagination(paginationContainer, 'activity', this.activityLogsPage, totalPages, total);
        }
    }

    renderPagination(container, type, currentPage, totalPages, totalItems) {
        if (!container) return;
        if (totalItems === 0) {
            container.innerHTML = '';
            return;
        }

        let html = `<div class="d-flex w-100 justify-content-between align-items-center">
            <span class="text-muted" style="font-size: 12px;">Cəmi ${totalItems} qeyd</span>
            <div class="d-flex align-items-center" style="gap: 15px;">
                <span class="text-muted" style="font-size: 12px;">Səhifə ${currentPage} / ${totalPages}</span>
                <div class="btn-group">
                    <button class="btn btn-xs btn-outline-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="setLogPage('${type}', ${currentPage - 1})" style="padding: 2px 8px;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="btn btn-xs btn-outline-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="setLogPage('${type}', ${currentPage + 1})" style="padding: 2px 8px;">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>`;

        container.innerHTML = html;
    }


    async fetchConfig() {
        try {
            const res = await fetch('/admin/config');
            if (!res.ok) throw new Error('Failed to fetch config');
            const context = await res.json();

            // Setup config object based on context
            this.config = {
                profileUser: context.profile.username,
                isAdminUser: context.isAdmin,
                apiKey: context.profile.apiKey
            };

            // Update UI with static user info
            if (this.userRoleLabel) {
                const label = this.config.isAdminUser ? 'ADMİN' : 'DİLER';
                this.userRoleLabel.innerHTML = `<i class="fas fa-shield-alt mr-1"></i> ${label}`;
            }

            const usernameText = this.config.profileUser || 'User';
            if (this.sidebarUserName) this.sidebarUserName.textContent = usernameText;
            if (this.sidebarUserEmail) this.sidebarUserEmail.textContent = this.config.isAdminUser ? 'Administrator' : 'Dealer';

            const avatarImg = document.getElementById('sidebar-user-avatar');
            if (avatarImg) {
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(usernameText)}&background=000&color=fff&rounded=true`;
                avatarImg.src = avatarUrl;
            }

            if (context.ownerOptions && this.sidebarMemberCount) {
                this.sidebarMemberCount.textContent = context.ownerOptions.length;
            }

            // Toggle admin sections
            if (this.config.isAdminUser) {
                // Remove the class that hides them by default from non-admins
                this.adminOnlyElements.forEach(el => el.classList.remove('admin-only'));
            }

            // Update API Key placeholders
            if (this.config.apiKey) {
                document.querySelectorAll('.user-api-key').forEach(el => {
                    el.textContent = this.config.apiKey;
                });
            }

            // Update API Endpoint URL to current origin
            document.querySelectorAll('.api-base-url').forEach(el => {
                el.textContent = window.location.origin;
            });
            const codeBlock = document.getElementById('api-usage-example');
            if (codeBlock) {
                codeBlock.innerHTML = codeBlock.innerHTML.replace('http://localhost:2004', window.location.origin);
            }

            // Update Device Limits and stats
            if (context.ownerSummaries && this.config) {
                const mySummary = context.ownerSummaries[this.config.profileUser];
                if (mySummary) {
                    const limitLabel = document.getElementById('device-limit-label');
                    if (limitLabel) limitLabel.textContent = mySummary.deviceLimit || '∞';
                }
            }

            if (context.clients) {
                const sessionCountEl = document.getElementById('device-session-count');
                if (sessionCountEl) sessionCountEl.textContent = context.clients.length;
            }

            // Populate initial data if provided in context
            if (context.stats) {
                const totalsFromStats = {
                    queued: Number(context.stats.pendingMessages) || 0,
                    iletildi: Number(context.stats.deliveredMessages) || 0,
                    hata: Number(context.stats.failedMessages) || 0
                };
                this.updateStats(context.connectedDevices || context.clients || [], context.queuedMessages || [], totalsFromStats);
            }
            if (context.clients) {
                this.updateDeviceTable(context.connectedDevices || []); // Use connectedDevices or clients?
            }
            if (context.ownerOptions && this.clientOwnerSelect) {
                this.clientOwnerSelect.innerHTML = context.ownerOptions.map(o =>
                    `<option value="${o.username}">${o.label}</option>`
                ).join('');
            }
            if (context.ownerOptions && this.lookupOwner) {
                const options = ['<option value="">Avtomatik seçim</option>']
                    .concat((context.ownerOptions || []).map((o) => `<option value="${this.escapeHtml(o.username)}">${this.escapeHtml(o.label || o.username)}</option>`));
                this.lookupOwner.innerHTML = options.join('');
            }
            this.renderMobileAnnouncementOwnerOptions(context.ownerOptions || []);
            if (context.audit && this.auditForm) {
                const jidInput = this.auditForm.querySelector('input[name="jid"]');
                const enabledCheck = document.getElementById('auditEnabled');
                if (jidInput) jidInput.value = context.audit.jid || '';
                if (enabledCheck) enabledCheck.checked = context.audit.enabled;
            }

            if (context.isAdmin && this.adminShortcuts) {
                this.adminShortcuts.classList.remove('d-none');
            }
            if (this.config.isAdminUser) {
                this.fetchLegalAgreements();
                this.fetchMobileAnnouncements();
            }

            if (context.showWelcome) {
                this.handleWelcome(context);
            }

            this.initSidebarSearch();
        } catch (e) {
            console.error('Config fetch failed', e);
            if (this.legalAgreementsTableBody) {
                this.legalAgreementsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Konfiqurasiya alına bilmədi. Səhifəni yeniləyin.</td></tr>';
            }
            if (this.mobileAnnouncementsTableBody) {
                this.mobileAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Konfiqurasiya alına bilmədi. Səhifəni yeniləyin.</td></tr>';
            }
            if (this.legalAgreementsSummary) {
                this.legalAgreementsSummary.textContent = 'Bağlantı xətası';
            }
            if (this.mobileAnnouncementsSummary) {
                this.mobileAnnouncementsSummary.textContent = 'Bağlantı xətası';
            }
            this.showToast(this.t('toast.config_load_error'));
        }
    }

    showToast(message) {
        const t = document.getElementById('wa-toast');
        if (!t) return;
        t.querySelector('.wa-toast__body').textContent = message;
        t.classList.remove('d-none');
        t.classList.add('animate__fadeInUp');
        setTimeout(() => {
            t.classList.remove('animate__fadeInUp');
            t.classList.add('animate__fadeOutDown');
            setTimeout(() => {
                t.classList.add('d-none');
                t.classList.remove('animate__fadeOutDown');
            }, 800);
        }, 4000);
    }

    handleWelcome(context) {
        const title = document.getElementById('welcome-title');
        const message = document.getElementById('welcome-message');
        const username = context.profile.username;

        if (username === 'FlyexKargo' || username === 'flyex') {
            title.textContent = 'Təbriklər, FLYEX!';
            message.innerHTML = `
                <p>FLYEX şirkəti olaraq sizi hər zaman aramızda görməkdən məmnunluq duyuruq.</p>
                <p>Sizin üçün nömrə limitini 3 ədəddən 5 ədədə qədər artırdıq.</p>
                <p>Fəaliyyətinizdə uğurlar və davamlı inkişaf arzulayırıq.</p>
            `;
        } else if (context.isAdmin) {
            title.textContent = 'Xoş gəldiniz, admin!';
            message.innerHTML = `
                <p>HubMSG idarəetmə panelinə xoş gəldiniz.</p>
                <p>Bütün sistem tənzimləmələrini və istifadəçi fəaliyyətlərini buradan idarə edə bilərsiniz.</p>
                <p>Uğurlu işlər arzulayırıq!</p>
            `;
        } else {
            title.textContent = 'Xoş Gəldiniz!';
            message.innerHTML = `<p>Hörmətli ${username}, HubMSG ailəsinə xoş gəldiniz!</p>`;
        }

        $('#welcomeModal').modal('show');
        this.triggerConfetti();
    }

    triggerConfetti() {
        if (typeof confetti !== 'function') return;

        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }

    showSuccessOverlay(label) {
        let overlay = document.getElementById('wa-success-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'wa-success-overlay';
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0', left: '0', width: '100vw', height: '100vh',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(8px)',
                zIndex: '99999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: '0',
                transition: 'opacity 0.3s ease-out',
                pointerEvents: 'none'
            });

            overlay.innerHTML = `
                <div id="wa-success-card" class="animate__animated" style="background: white; padding: 40px 60px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; transform: scale(0.8); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <div style="width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: white; font-size: 36px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);">
                        <i class="fas fa-check"></i>
                    </div>
                    <h3 style="margin: 0 0 10px; color: #0f172a; font-weight: 800;">Eşleşme Başarılı!</h3>
                    <p style="margin: 0; color: #64748b; font-size: 16px;" id="wa-success-text"></p>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        document.getElementById('wa-success-text').innerHTML = `<b>${label}</b> sistemə əlavə edildi.`;

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            const card = document.getElementById('wa-success-card');
            card.style.transform = 'scale(1)';
            card.classList.remove('animate__zoomOut');
            card.classList.add('animate__zoomIn');
        });

        setTimeout(() => {
            overlay.style.opacity = '0';
            const card = document.getElementById('wa-success-card');
            card.classList.remove('animate__zoomIn');
            card.classList.add('animate__zoomOut');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 500);
        }, 3000);
    }

    async fetchSessions() {
        try {
            const r = await fetch('/admin/clients');
            const d = await r.json();
            this.renderSessions(d.sessions || []);
        } catch (e) {
            console.error('Session fetch error:', e);
        }
    }

    renderSessions(sessions) {
        if (!this.clientList) return;

        const pendingSessions = sessions.filter(s => s.status !== 'ready');

        // Cihazın təsdiqlənib-təsdiqlənmədiyini (hazır olub-olmadığını) yoxlamaq üçün əvvəlki id-ləri saxlayırıq
        if (!this._previousPendingIds) {
            this._previousPendingIds = [];
        }

        const currentPendingIds = pendingSessions.map(s => s.id);

        // Əgər əvvəl (bundan qabaqkı render-də) pending-də olan cihaz indi pending-də yoxdursa və ümumi sessiyalarda ready-dirsə, deməli qoşulub!
        this._previousPendingIds.forEach(oldId => {
            if (!currentPendingIds.includes(oldId)) {
                const connectedSession = sessions.find(s => s.id === oldId && s.status === 'ready');
                if (connectedSession) {
                    this.triggerFireworks();

                    // Offcanvas-ı dərhal bağlayırıq
                    const addDeviceOffcanvas = document.getElementById('add-device-offcanvas');
                    const addDeviceBackdrop = document.getElementById('add-device-backdrop');
                    if (addDeviceOffcanvas) addDeviceOffcanvas.classList.remove('is-open');
                    if (addDeviceBackdrop) addDeviceBackdrop.classList.remove('is-visible');

                    // Ekranın ortasında uğur animasiyası göstəririk
                    this.showSuccessOverlay(connectedSession.label);
                }
            }
        });

        this._previousPendingIds = currentPendingIds;

        if (pendingSessions.length === 0) {
            this.clientList.innerHTML = `
                <div class="col-12 text-center py-5 animate__animated animate__fadeIn">
                    <div style="width: 80px; height: 80px; background: rgba(59, 130, 246, 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-qrcode text-primary fa-2x"></i>
                    </div>
                    <p class="text-muted text-sm font-weight-bold" data-i18n="add_device.qr_waiting">${this.t('add_device.qr_waiting')}</p>
                    <p class="text-xs text-muted">Sessiya başladıldıqda QR kod burada görünəcək.</p>
                </div>`;
            return;
        }

        // Təkrarlanan dom update ilə titrəmə olmasın deyə ancaq fərqləri update edirik
        const currentIds = Array.from(this.clientList.children).map(child => child.dataset.sessionId).filter(Boolean);
        const newIds = pendingSessions.map(s => s.id);

        // Remove old ones
        Array.from(this.clientList.children).forEach(child => {
            if (child.dataset.sessionId && !newIds.includes(child.dataset.sessionId)) {
                child.remove();
            }
        });

        // Remove the empty state if it exists
        if (this.clientList.querySelector('.fa-qrcode.fa-2x')) {
            this.clientList.innerHTML = '';
        }

        pendingSessions.forEach(s => {
            let div = this.clientList.querySelector(`div[data-session-id="${s.id}"]`);
            const isNew = !div;

            if (isNew) {
                div = document.createElement('div');
                div.className = 'col-12 mb-4 animate__animated animate__fadeIn';
                div.dataset.sessionId = s.id;
                this.clientList.appendChild(div);
            }

            const expectedHtml = `
                <div class="card border-0 shadow-sm" style="border-radius: 12px; background: #fbfcfe;">
                    <div class="card-body p-4 text-center">
                        <div class="mb-3 d-flex align-items-center justify-content-center" style="gap: 10px;">
                            <h6 class="mb-0 font-weight-bold" style="color: #0f172a;">${s.label}</h6>
                             <span class="badge badge-warning px-2 py-1" style="font-size: 10px;">${s.qr ? this.t('common.qr_pending') : this.t('common.initializing')}</span>
                        </div>
                        
                        ${s.qr
                    ? `<div class="p-3 rounded-lg bg-white shadow-sm d-inline-block mb-3" style="border: 1px solid rgba(0,0,0,0.05);">
                         <img src="${s.qr}" style="width: 220px; height: 220px; display: block; border-radius: 4px; animation: fadeIn 0.5s ease-in-out;">
                       </div>
                       <p class="text-xs text-muted mb-0"><i class="fas fa-camera mr-1"></i> ${this.t('add_device.step4')}</p>`
                    : `<div class="py-5">
                         <div class="spinner-border text-primary spinner-border-sm mb-3" role="status"></div>
                         <p class="text-xs text-muted">${this.t('common.initializing')}</p>
                       </div>`
                }
                        
                        <div class="mt-4 pt-3 border-top d-flex justify-content-center" style="gap:10px;">
                            <button class="btn btn-outline-secondary btn-xs px-3 rounded-pill" onclick="refQ('${s.id}')">
                                <i class="fas fa-sync-alt mr-1"></i> ${this.t('common.refresh')}
                            </button>
                            <button class="btn btn-outline-danger btn-xs px-3 rounded-pill" onclick="delS('${s.id}')">
                                <i class="fas fa-trash-alt mr-1"></i> Sil
                            </button>
                        </div>
                    </div>
                </div>
            `;

            if (isNew || div.dataset.qrState !== (s.qr ? 'has-qr' : 'no-qr')) {
                div.innerHTML = expectedHtml;
                div.dataset.qrState = s.qr ? 'has-qr' : 'no-qr';
            }
        });
    }

    async refreshSession(id) {
        await fetch(`/admin/clients/${id}/refresh`, { method: 'POST' });
        this.showToast(this.t('toast.refreshing'));
        this.fetchSessions();
    }

    async deleteSession(id) {
        if (!confirm('Bu sessiyanı silmək istədiyinizə əminsiniz?')) return;
        try {
            const r = await fetch(`/admin/clients/${id}`, { method: 'DELETE' });
            const d = await r.json();
            if (!r.ok) {
                throw new Error(d.error || this.t('toast.error'));
            }
            this.showToast('Sessiya silindi');
            this.fetchSessions();
            this.refresh();
        } catch (e) {
            this.showToast(e.message || this.t('toast.error'));
        }
    }

    async handleCreateSession() {
        const select = document.getElementById('client-owner-select');
        const labelInput = document.getElementById('pairing-label-input');
        const owner = select ? select.value : this.config.profileUser;
        const label = labelInput ? labelInput.value.trim() : 'Yeni cihaz';

        if (!label) {
            this.showToast(this.t('toast.enter_device_name'));
            if (labelInput) labelInput.focus();
            return;
        }

        const originalHtml = this.createBtn.innerHTML;
        this.createBtn.disabled = true;
        this.createBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> ${this.t('toast.starting')}`;

        try {
            const r = await fetch('/admin/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, label })
            });
            if (!r.ok) {
                const errData = await r.json();
                throw new Error(errData.error || this.t('toast.error'));
            }
            this.showToast(this.t('toast.session_started'));
            if (labelInput) labelInput.value = '';
            this.fetchSessions();
        } catch (e) {
            this.showToast(e.message);
        } finally {
            this.createBtn.disabled = false;
            this.createBtn.innerHTML = originalHtml;
        }
    }

    async refresh() {
        if (this.refreshInFlight) {
            this.refreshQueued = true;
            return;
        }

        this.refreshInFlight = true;
        try {
            const [devicesResult, queueResult, opsResult] = await Promise.all([
                this.safeFetchJson('/admin/devices'),
                this.safeFetchJson('/admin/queue'),
                this.safeFetchJson('/admin/ops-metrics?hours=24')
            ]);

            const dd = devicesResult.ok ? (devicesResult.data || {}) : {};
            const qd = queueResult.ok ? (queueResult.data || {}) : {};
            const od = opsResult.ok ? (opsResult.data || {}) : {
                successRate: 0,
                blockedCount: 0,
                riskyDevices: []
            };

            this.currentDevices = Array.isArray(dd.devices) ? dd.devices : [];
            this.currentQueue = Array.isArray(qd.queue) ? qd.queue : [];

            this.updateDeviceTable(this.currentDevices);
            this.updateQueueTable(this.currentQueue);
            this.updateStats(this.currentDevices, this.currentQueue, qd.totals || null);
            this.updateOpsMetrics(od);

            if (this.config && this.config.isAdminUser) {
                this.updateDealerTable();
                this.updateOwnerSummaries();
            }
            const messageLogsTab = document.getElementById('message-logs-section');
            if (messageLogsTab && messageLogsTab.classList.contains('active')) {
                this.fetchBlockedNumbers();
            }
            const legalTab = document.getElementById('legal-agreements-section');
            if (legalTab && legalTab.classList.contains('active')) {
                this.fetchLegalAgreements();
            }
            const mobileAnnouncementsTab = document.getElementById('mobile-announcements-section');
            if (mobileAnnouncementsTab && mobileAnnouncementsTab.classList.contains('active')) {
                this.fetchMobileAnnouncements();
            }
        } catch (e) {
            console.error('Refresh error:', e);
            this.updateOpsMetrics({
                successRate: 0,
                blockedCount: 0,
                riskyDevices: []
            });
        } finally {
            this.refreshInFlight = false;
            if (this.refreshQueued) {
                this.refreshQueued = false;
                this.refresh();
            }
        }
    }

    async safeFetchJson(url, timeoutMs = 6000) {
        let controller = null;
        let timer = null;
        try {
            controller = new AbortController();
            timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) {
                return {
                    ok: false,
                    status: res.status,
                    data: null
                };
            }
            const data = await res.json();
            return {
                ok: true,
                status: res.status,
                data
            };
        } catch (error) {
            console.error(`Fetch failed for ${url}:`, error);
            return {
                ok: false,
                status: 0,
                data: null
            };
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    updateDeviceTable(devices) {
        if (!this.deviceTableBody) return;

        if (!devices || devices.length === 0) {
            devices = [];
        }

        const tableElement = $(this.deviceTableBody).closest('table');
        const tableWrapper = tableElement.closest('.dataTables_wrapper');
        if (tableWrapper.length) {
            tableWrapper.replaceWith(tableElement);
        }
        tableElement.removeClass('dataTable no-footer').removeAttr('aria-describedby').css('width', '');
        tableElement.find('thead th').each(function () {
            this.removeAttribute('aria-label');
            this.removeAttribute('aria-sort');
            this.removeAttribute('tabindex');
            this.classList.remove('sorting', 'sorting_asc', 'sorting_desc', 'sorting_disabled');
        });

        this.deviceTableData = devices.map((d) => {
            const deviceId = (d && d.id != null) ? String(d.id) : '';
            const phone = (d && d.phone != null) ? String(d.phone) : '-';
            const resolvedIso = ((d && d.iso) || this.inferIsoFromPhone(phone || deviceId) || '').toLowerCase();
            return {
                ...d,
                id: deviceId,
                label: d && d.label ? d.label : '-',
                phone,
                platform: d && d.platform ? d.platform : '-',
                mobileOs: this.resolveMobileOs(d),
                owner: d && d.owner ? d.owner : '-',
                iso: resolvedIso
            };
        });

        const activeCountEl = document.getElementById('device-active-count');
        if (activeCountEl) activeCountEl.textContent = this.deviceTableData.length;

        this.deviceTablePage = 1;
        const geoCountEl = document.getElementById('device-geo-count');
        if (geoCountEl) {
            const geoSet = new Set(this.deviceTableData.map(d => d.iso).filter(Boolean));
            geoCountEl.textContent = geoSet.size || (this.deviceTableData.length ? 1 : 0);
        }

        this.renderDeviceTable();
    }

    getDeviceTableFilteredData() {
        const query = (this.deviceTableSearchInput && this.deviceTableSearchInput.value
            ? this.deviceTableSearchInput.value
            : '').trim().toLowerCase();

        if (!query) return this.deviceTableData;

        return this.deviceTableData.filter((d) => {
            const countryLabel = this.getCountryLabel(d.iso || '').toLowerCase();
            return [
                d.id,
                d.label,
                d.phone,
                d.platform,
                d.mobileOs,
                d.owner,
                countryLabel
            ].some((field) => String(field || '').toLowerCase().includes(query));
        });
    }

    getDeviceTableTotalPages() {
        const total = this.getDeviceTableFilteredData().length;
        return Math.max(1, Math.ceil(total / this.deviceTablePageSize));
    }

    isoToFlag(iso) {
        if (!iso || typeof iso !== 'string' || iso.length !== 2) return '🌍';
        return iso.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
    }

    renderDeviceTable() {
        if (!this.deviceTableBody) return;

        const filtered = this.getDeviceTableFilteredData();
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.deviceTablePageSize));

        if (this.deviceTablePage > totalPages) this.deviceTablePage = totalPages;
        if (this.deviceTablePage < 1) this.deviceTablePage = 1;

        const start = (this.deviceTablePage - 1) * this.deviceTablePageSize;
        const pageItems = filtered.slice(start, start + this.deviceTablePageSize);

        this.deviceTableBody.innerHTML = '';

        if (pageItems.length === 0) {
            this.deviceTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Cihaz tapılmadı</td></tr>';
        } else {
            pageItems.forEach(d => {
                const tr = document.createElement('tr');
                const iso = d.iso || this.inferIsoFromPhone(d.phone) || '';
                const flag = this.isoToFlag(iso);
                const countryLabel = this.getCountryLabel(iso);
                const platformIcon = d.platform === 'Baileys'
                    ? '<i class="fab fa-whatsapp text-success"></i>'
                    : '<i class="fas fa-mobile-alt text-muted"></i>';
                const osLabel = d.mobileOs || '-';
                const osIconHtml = this.getOsIconHtml(osLabel);
                const readyAt = d.readyAt ? this.timeSince(new Date(d.readyAt)) : '-';

                const adminActions = this.config && this.config.isAdminUser ? `
                    <button class="btn btn-sm btn-link device-delete-btn p-0" onclick="delD('${d.id}')" title="Cihazı sil">
                        <i class="fas fa-trash-alt text-danger"></i>
                    </button>
                ` : '';

                tr.innerHTML = `
                    <td><span class="text-xs text-muted font-weight-bold" style="font-family: monospace;">#${d.id ? d.id.slice(-6) : '-'}</span></td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="mr-2" style="font-size: 24px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1)); line-height: 1;">${flag}</div>
                            <div style="min-width: 0;">
                                <div class="font-weight-bold text-truncate" style="font-size:13.5px; color: #0f172a; max-width: 140px;">${d.label}</div>
                                <div class="text-muted" style="font-size:11.5px; margin-top: -2px;">+${d.phone}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="line-height: 1.2;">
                            <div class="font-weight-bold" style="font-size:12px; color: #0f172a;">${countryLabel}</div>
                            <div class="text-xs text-muted font-weight-bold" style="letter-spacing: 0.02em;">${iso ? iso.toUpperCase() : ''}</div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex flex-column" style="line-height: 1.3">
                            <div class="font-weight-bold" style="font-size:12.5px; color: #0f172a;">${platformIcon} <span class="ml-1">${d.platform}</span></div>
                            <div class="text-muted" style="font-size:10px">${osIconHtml} <span class="ml-1">${osLabel || ''}</span></div>
                        </div>
                    </td>
                    <td><span class="badge badge-light text-primary border" style="font-size:11px; font-weight: 800;">@${d.owner}</span></td>
                    <td>
                        <div class="text-muted small font-weight-bold d-flex align-items-center">
                            <i class="far fa-clock mr-1" style="font-size: 10px;"></i>
                            <span>${readyAt}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge badge-success px-2 py-1" style="font-size:10px; border-radius: 4px; font-weight: 700;">
                            AKTİV
                        </span>
                    </td>
                    <td class="text-right">
                        ${adminActions}
                    </td>
                `;
                this.deviceTableBody.appendChild(tr);
            });
        }

        if (this.deviceTablePageInfo) {
            this.deviceTablePageInfo.textContent = filtered.length === 0
                ? '0 / 0'
                : `${this.deviceTablePage} / ${totalPages}`;
        }

        if (this.deviceTablePrevBtn) {
            this.deviceTablePrevBtn.disabled = filtered.length === 0 || this.deviceTablePage <= 1;
        }
        if (this.deviceTableNextBtn) {
            this.deviceTableNextBtn.disabled = filtered.length === 0 || this.deviceTablePage >= totalPages;
        }
    }

    resolveMobileOs(device) {
        if (!device || typeof device !== 'object') return '-';

        const direct =
            device.mobileOs ||
            device.mobileOS ||
            device.mobile_os ||
            device.os ||
            device.osName ||
            (device.phoneInfo && (device.phoneInfo.os || device.phoneInfo.platform)) ||
            (device.meta && (device.meta.mobileOs || device.meta.os));

        if (direct) {
            return this.normalizeOsLabel(direct);
        }

        const platform = String(device.platform || '').toLowerCase();
        if (platform.includes('android')) return 'Android';
        if (platform.includes('ios') || platform.includes('iphone')) return 'iOS';
        if (platform.includes('windows')) return 'Windows';
        if (platform.includes('mac')) return 'macOS';
        if (platform.includes('linux')) return 'Linux';

        return '-';
    }

    normalizeOsLabel(value) {
        const raw = String(value).trim();
        if (!raw) return '-';
        const lowered = raw.toLowerCase();
        if (lowered === 'ios' || lowered === 'iphone' || lowered === 'ipad') return 'iOS';
        if (lowered === 'android') return 'Android';
        if (lowered === 'windows') return 'Windows';
        if (lowered === 'macos' || lowered === 'mac os' || lowered === 'darwin' || lowered === 'mac') return 'macOS';
        if (lowered === 'linux') return 'Linux';
        return raw;
    }

    getOsIconHtml(osLabel) {
        const normalized = String(osLabel || '').toLowerCase();
        if (normalized === 'android') {
            return '<i class="fab fa-android os-icon os-android" aria-hidden="true"></i>';
        }
        if (normalized === 'ios') {
            return '<i class="fab fa-apple os-icon os-ios" aria-hidden="true"></i>';
        }
        if (normalized === 'windows') {
            return '<i class="fab fa-windows os-icon os-windows" aria-hidden="true"></i>';
        }
        if (normalized === 'macos') {
            return '<i class="fab fa-apple os-icon os-macos" aria-hidden="true"></i>';
        }
        if (normalized === 'linux') {
            return '<i class="fab fa-linux os-icon os-linux" aria-hidden="true"></i>';
        }
        return '<i class="fas fa-question-circle os-icon os-unknown" aria-hidden="true"></i>';
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " " + this.t('time.year_ago');
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " " + this.t('time.month_ago');
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " " + this.t('time.day_ago');
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " " + this.t('time.hour_ago');
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " " + this.t('time.minute_ago');
        return this.t('time.just_now');
    }

    updateQueueTable(queue) {
        if (!this.queueTableBody) return;
        this.queueTableBody.innerHTML = '';

        const searchTerm = this.queueSearchInput ? this.queueSearchInput.value.toLowerCase().trim() : '';
        const monthsAz = ["Yan", "Fev", "Mar", "Apr", "May", "İyun", "İyul", "Avq", "Sen", "Okt", "Noy", "Dek"];

        // Map device info for faster lookup
        const deviceMap = {};
        if (Array.isArray(this.currentDevices)) {
            this.currentDevices.forEach(d => {
                deviceMap[d.id] = { label: d.label, phone: d.phone };
            });
        }

        // Filter queue
        let filteredQueue = queue || [];
        if (searchTerm) {
            filteredQueue = filteredQueue.filter(m => {
                const dev = deviceMap[m.deviceId] || {};
                const msg = (m.snippet || m.message || '').toLowerCase();
                const owner = (m.owner || '').toLowerCase();
                const recipient = (m.recipient || '').toLowerCase();
                return recipient.includes(searchTerm) ||
                    msg.includes(searchTerm) ||
                    owner.includes(searchTerm) ||
                    (dev.label && dev.label.toLowerCase().includes(searchTerm)) ||
                    (dev.phone && dev.phone.toLowerCase().includes(searchTerm));
            });
        }

        if (filteredQueue.length === 0) {
            this.queueTableBody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-muted">${searchTerm ? this.t('bulk.no_results') : this.t('bulk.no_messages')}</td></tr>`;
            return;
        }

        // Show latest 100 messages, newest first
        const displayQueue = filteredQueue.slice().reverse().slice(0, 100);

        displayQueue.forEach(m => {
            const tr = document.createElement('tr');
            const status = m.status || 'queued';
            const dotColor = status === 'iletildi' ? 'var(--green)' : (status === 'hata' ? 'var(--red)' : 'var(--yellow)');
            const statusLabel = status === 'iletildi' ? this.t('status.delivered') : (status === 'hata' ? this.t('status.failed') : this.t('status.queued'));

            const owner = m.owner || m.username || 'admin';
            const devInfo = deviceMap[m.deviceId];
            let deviceDisp = '';
            if (devInfo) {
                deviceDisp = `
            <div class="font-weight-bold" style="font-size: 11px; color: var(--text);">${devInfo.label}</div>
            <div class="text-muted" style="font-size: 10px;">+${devInfo.phone}</div>
                `;
            } else if (m.deviceId === 'automatic' || !m.deviceId) {
                deviceDisp = `<span class="badge badge-light text-xs font-weight-normal border" style="padding: 2px 6px; font-size: 10px; color: var(--text-dim);">Avtomatik</span>`;
            } else {
                deviceDisp = `<span class="text-muted" style="font-size: 11px;">${m.deviceId}</span>`;
            }

            const rawMsg = m.snippet || m.message || '-';
            const shortMsg = rawMsg.length > 120 ? rawMsg.slice(0, 120) + '...' : rawMsg;

            const when = m.sentAt || m.lastAttempt || m.createdAt;
            let dateStr = '-';
            if (when) {
                const d = new Date(when);
                const day = d.getDate().toString().padStart(2, '0');
                const month = monthsAz[d.getMonth()];
                const hour = d.getHours().toString().padStart(2, '0');
                const min = d.getMinutes().toString().padStart(2, '0');
                dateStr = `${day} ${month} ${hour}: ${min}`;
            }

            tr.innerHTML = `
            <td style="font-weight: 600; font-size: 13px; color: var(--text);">${m.recipient || '-'}</td>
                <td style="min-width: 100px;">${deviceDisp}</td>
                <td style="font-size: 12px; color: var(--text-dim); font-weight: 500;">${owner}</td>
                <td style="font-size: 11px; color: var(--text-dim); max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${rawMsg.replace(/"/g, '&quot;')}">${shortMsg}</td>
            <td style="white-space: nowrap;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor}; margin-right:6px; vertical-align: middle;"></span><span style="font-size: 12px; color: var(--text-dim);">${statusLabel}</span></td>
                <td style="font-size: 12px; color: var(--text-dim); white-space: nowrap;">${dateStr}</td>
        `;
            this.queueTableBody.appendChild(tr);
        });
    }


    updateStats(devices, queue, totals = null) {
        if (this.statSessions) this.statSessions.innerText = devices.length;
        const pending = totals && typeof totals.queued !== 'undefined'
            ? Number(totals.queued) || 0
            : (queue || []).filter(m => m.status === 'queued').length;
        const delivered = totals && typeof totals.iletildi !== 'undefined'
            ? Number(totals.iletildi) || 0
            : (queue || []).filter(m => m.status === 'iletildi').length;
        const failed = totals && typeof totals.hata !== 'undefined'
            ? Number(totals.hata) || 0
            : (queue || []).filter(m => m.status === 'hata').length;
        if (this.statPending) this.statPending.innerText = pending;
        if (this.statDelivered) this.statDelivered.innerText = delivered;
        if (this.statFailed) this.statFailed.innerText = failed;
    }

    updateOpsMetrics(metrics) {
        if (!metrics) return;
        if (this.statSuccessRate24h) this.statSuccessRate24h.innerText = `${Number(metrics.successRate || 0).toFixed(1)}% `;
        if (this.statBlocked24h) this.statBlocked24h.innerText = `${Number(metrics.blockedCount || 0)} `;
        if (this.statRiskyDevices) this.statRiskyDevices.innerText = `${Array.isArray(metrics.riskyDevices) ? metrics.riskyDevices.length : 0} `;
        if (!this.riskDeviceTableBody) return;

        const riskyDevices = Array.isArray(metrics.riskyDevices) ? metrics.riskyDevices : [];
        if (this.riskDeviceSummary) {
            this.riskDeviceSummary.textContent = `${riskyDevices.length} qeyd`;
        }

        this.riskDeviceTableBody.innerHTML = '';
        if (!riskyDevices.length) {
            this.riskDeviceTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Riskli cihaz yoxdur.</td></tr>';
            return;
        }

        riskyDevices.forEach((item) => {
            const tr = document.createElement('tr');
            const resolvedIso = (item.iso || this.inferIsoFromPhone(item.phone || item.id || '') || '').toLowerCase();
            const country = this.getCountryLabel(resolvedIso);
            const status = item.suspended
                ? `<span class="badge badge-danger">Dayandırılıb${item.suspendedReason ? ` · ${this.escapeHtml(item.suspendedReason)}` : ''}</span>`
                : '<span class="badge badge-warning">Yüksək risk</span>';
            const errorRatePct = `${(Number(item.errorRate || 0) * 100).toFixed(1)}%`;
            const lastErrorText = item.lastError || '-';
            const actions = item.suspended
                ? `<button class="btn btn-xs btn-outline-success" onclick="riskAct('${this.escapeHtml(item.id)}','resume')"><i class="fas fa-play"></i></button>`
                : `<button class="btn btn-xs btn-outline-warning" onclick="riskAct('${this.escapeHtml(item.id)}','suspend')"><i class="fas fa-pause"></i></button>`;
            tr.innerHTML = `
            <td style="font-weight: 600;">${this.escapeHtml(item.label || item.id || '-')}</td>
                <td style="font-size: 12px; color: var(--text-dim);">${this.escapeHtml(item.owner || 'admin')}</td>
                <td style="font-size: 12px;">${this.escapeHtml(country)}</td>
                <td>${status}</td>
                <td style="font-size: 12px;">${errorRatePct}</td>
                <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(lastErrorText)}">${this.escapeHtml(lastErrorText)}</td>
                <td style="white-space: nowrap;">
                    ${actions}
                    <button class="btn btn-xs btn-outline-secondary ml-1" onclick="riskAct('${this.escapeHtml(item.id)}','reset')"><i class="fas fa-undo"></i></button>
                </td>
        `;
            this.riskDeviceTableBody.appendChild(tr);
        });
    }

    async handleRiskDeviceAction(deviceId, action) {
        if (!deviceId || !action) return;
        try {
            const res = await fetch(`/ admin / devices / ${encodeURIComponent(deviceId)}/health-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (!res.ok) {
                this.showToast(data.error || 'Əməliyyat uğursuz oldu');
                return;
            }
            this.showToast(`Cihaz əməliyyatı tamamlandı: ${action}`);
            this.refresh();
        } catch (error) {
            console.error('Risk action error:', error);
            this.showToast('Əməliyyat zamanı xəta baş verdi');
        }
    }

    async fetchLegalAgreements() {
        if (!this.legalAgreementsTableBody) return;
        if (!this.config || !this.config.isAdminUser) {
            this.legalAgreementsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Bu bölməni görmək üçün admin səlahiyyəti tələb olunur.</td></tr>';
            if (this.legalAgreementsSummary) this.legalAgreementsSummary.textContent = 'Səlahiyyət yoxdur';
            return;
        }

        this.legalAgreementsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Yüklənir...</td></tr>';
        if (this.legalAgreementsSummary) this.legalAgreementsSummary.textContent = 'Yüklənir...';

        try {
            const result = await this.safeFetchJson('/admin/legal-agreements');
            if (!result.ok || !result.data) {
                throw new Error('Müqavilə imzaları alına bilmədi');
            }
            const data = result.data;
            this.renderLegalAgreements(data.rows || [], Number(data.signedCount) || 0, Number(data.total) || 0);
        } catch (error) {
            console.error('Legal agreements fetch error:', error);
            this.legalAgreementsTableBody.innerHTML = '<tr><td colspan=\"7\" class=\"text-center py-3 text-muted\">Müqavilə qeydləri alınarkən xəta baş verdi.</td></tr>';
            if (this.legalAgreementsSummary) this.legalAgreementsSummary.textContent = '0/0 imzalanıb';
        }
    }

    renderLegalAgreements(rows, signedCount, totalCount) {
        if (!this.legalAgreementsTableBody) return;
        this.legalAgreementsTableBody.innerHTML = '';
        if (this.legalAgreementsSummary) {
            this.legalAgreementsSummary.textContent = `${signedCount}/${totalCount} imzalanıb`;
        }

        if (!rows || !rows.length) {
            this.legalAgreementsTableBody.innerHTML = '<tr><td colspan=\"7\" class=\"text-center py-3 text-muted\">Qeyd tapılmadı.</td></tr>';
            return;
        }

        rows.forEach((row) => {
            const tr = document.createElement('tr');
            const signedAt = row.signedAt
                ? new Date(row.signedAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
            const fullName = row.fullName || '-';
            const idNumber = row.idNumberMasked || '-';
            const pdfButton = row.pdfUrl
                ? `<a href="${this.escapeHtml(row.pdfUrl)}" target="_blank" class="btn btn-xs btn-outline-primary"><i class="fas fa-file-pdf mr-1"></i> PDF</a>`
                : '<span class="text-muted">Yoxdur</span>';

            tr.innerHTML = `
                <td style="font-weight:600;">${this.escapeHtml(row.username || '-')}</td>
                <td style="font-size:12px;">${this.escapeHtml(row.role || '-')}</td>
                <td style="font-size:12px;">${this.escapeHtml(fullName)}</td>
                <td style="font-size:12px;">${this.escapeHtml(idNumber)}</td>
                <td style="font-size:12px; white-space:nowrap;">${this.escapeHtml(signedAt)}</td>
                <td style="font-size:12px;">${this.escapeHtml(row.ip || '-')}</td>
                <td class="text-right">${pdfButton}</td>
            `;
            this.legalAgreementsTableBody.appendChild(tr);
        });
    }

    renderMobileAnnouncementOwnerOptions(ownerOptions = []) {
        if (!this.mobileAnnouncementOwner) return;
        const previous = this.mobileAnnouncementOwner.value || 'all';
        const options = ['<option value="all">Bütün mobil istifadəçilər</option>'];
        (ownerOptions || []).forEach((item) => {
            if (!item || !item.username) return;
            const label = item.label || item.username;
            options.push(`<option value="${this.escapeHtml(item.username)}">${this.escapeHtml(label)}</option>`);
        });
        this.mobileAnnouncementOwner.innerHTML = options.join('');
        const exists = Array.from(this.mobileAnnouncementOwner.options).some((opt) => opt.value === previous);
        this.mobileAnnouncementOwner.value = exists ? previous : 'all';
    }

    async handleMobileAnnouncementSubmit(e) {
        e.preventDefault();
        if (!this.mobileAnnouncementForm) return;

        const owner = this.mobileAnnouncementOwner ? this.mobileAnnouncementOwner.value : 'all';
        const type = this.mobileAnnouncementType ? this.mobileAnnouncementType.value : 'campaign';
        const title = this.mobileAnnouncementTitle ? this.mobileAnnouncementTitle.value.trim() : '';
        const body = this.mobileAnnouncementBody ? this.mobileAnnouncementBody.value.trim() : '';

        if (!title && !body) {
            this.showToast('Bildiriş üçün başlıq və ya mesaj daxil edin.');
            return;
        }

        const submitBtn = this.mobileAnnouncementSendBtn || this.mobileAnnouncementForm.querySelector('button[type="submit"]');
        const originalHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Göndərilir';
        }

        try {
            const res = await fetch('/admin/mobile/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner,
                    type,
                    title,
                    body
                })
            });
            const data = await res.json();
            if (!res.ok) {
                this.showToast(data.error || 'Bildiriş göndərilə bilmədi');
                return;
            }

            this.showToast('Mobil bildiriş göndərildi.');
            if (this.mobileAnnouncementTitle) this.mobileAnnouncementTitle.value = '';
            if (this.mobileAnnouncementBody) this.mobileAnnouncementBody.value = '';
            this.fetchMobileAnnouncements();
        } catch (error) {
            console.error('Mobile announcement submit error:', error);
            this.showToast('Bildiriş göndərilərkən xəta baş verdi');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        }
    }

    async fetchMobileAnnouncements() {
        if (!this.mobileAnnouncementsTableBody) return;
        if (!this.config || !this.config.isAdminUser) {
            this.mobileAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Bu bölməni görmək üçün admin səlahiyyəti tələb olunur.</td></tr>';
            if (this.mobileAnnouncementsSummary) this.mobileAnnouncementsSummary.textContent = 'Səlahiyyət yoxdur';
            return;
        }

        this.mobileAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Yüklənir...</td></tr>';
        if (this.mobileAnnouncementsSummary) this.mobileAnnouncementsSummary.textContent = 'Yüklənir...';

        try {
            const result = await this.safeFetchJson('/admin/mobile/announcements?limit=200');
            if (!result.ok || !result.data) {
                throw new Error('Mobil bildiriş qeydləri alına bilmədi');
            }
            const data = result.data;
            this.renderMobileAnnouncements(data.announcements || []);
        } catch (error) {
            console.error('Mobile announcements fetch error:', error);
            this.mobileAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Mobil bildiriş qeydləri alına bilmədi.</td></tr>';
            if (this.mobileAnnouncementsSummary) this.mobileAnnouncementsSummary.textContent = '0 qeyd';
        }
    }

    renderMobileAnnouncements(rows = []) {
        if (!this.mobileAnnouncementsTableBody) return;
        this.mobileAnnouncementsTableBody.innerHTML = '';
        if (this.mobileAnnouncementsSummary) {
            this.mobileAnnouncementsSummary.textContent = `${rows.length} qeyd`;
        }

        if (!rows.length) {
            this.mobileAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Hələ bildiriş göndərilməyib.</td></tr>';
            return;
        }

        rows.forEach((row) => {
            const tr = document.createElement('tr');
            const eventAt = row.createdAt || row.at || row.updatedAt;
            const when = eventAt
                ? new Date(eventAt).toLocaleString('az-AZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : '-';
            const owner = row.owner || 'all';
            const ownerText = owner === 'all' ? 'Bütün istifadəçilər' : owner;
            const text = [row.title || '', row.body || ''].filter(Boolean).join(' · ') || '-';
            const type = row.type || 'campaign';
            const actor = row.createdBy || '-';

            tr.innerHTML = `
                <td style="white-space: nowrap; font-size: 12px; color: var(--text-dim);">${this.escapeHtml(when)}</td>
                <td><span class="badge badge-light">${this.escapeHtml(type)}</span></td>
                <td style="font-size: 12px;">${this.escapeHtml(ownerText)}</td>
                <td style="max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(text)}">${this.escapeHtml(text)}</td>
                <td style="font-size: 12px; color: var(--text-dim);">${this.escapeHtml(actor)}</td>
            `;
            this.mobileAnnouncementsTableBody.appendChild(tr);
        });
    }

    setSystemMonitorAutoRefresh(enabled) {
        if (this.systemMonitorTimer) {
            clearInterval(this.systemMonitorTimer);
            this.systemMonitorTimer = null;
        }
        if (!enabled) return;
        this.systemMonitorTimer = setInterval(() => {
            const tab = document.getElementById('system-monitor-section');
            if (tab && tab.classList.contains('active')) {
                this.fetchSystemMonitor();
            }
        }, 5000);
    }

    formatDuration(ms) {
        const n = Number(ms) || 0;
        if (n < 1000) return `${n} ms`;
        return `${(n / 1000).toFixed(1)} sn`;
    }

    formatAgeSeconds(sec) {
        const n = Math.max(0, Number(sec) || 0);
        if (n < 60) return `${n} sn`;
        if (n < 3600) return `${Math.floor(n / 60)} dq`;
        return `${Math.floor(n / 3600)} saat`;
    }

    async fetchSystemMonitor() {
        if (!this.config || !this.config.isAdminUser || !this.systemMonitorLoopBody) return;
        try {
            const res = await fetch('/admin/system-monitor');
            if (!res.ok) throw new Error('Sistem monitor məlumatı alınmadı');
            const data = await res.json();
            this.renderSystemMonitor(data);
        } catch (error) {
            console.error('System monitor fetch error:', error);
            if (this.systemMonitorLoopBody) {
                this.systemMonitorLoopBody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">Məlumat alınarkən xəta baş verdi.</td></tr>';
            }
        }
    }

    renderSystemMonitor(data) {
        const generatedAt = data && data.generatedAt
            ? new Date(data.generatedAt).toLocaleString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '-';
        if (this.systemMonitorLastUpdated) {
            this.systemMonitorLastUpdated.textContent = `Son yenilənmə: ${generatedAt}`;
        }

        const queue = data && data.queue ? data.queue : {};
        const devices = data && data.devices ? data.devices : {};
        const blockedTop = (data && Array.isArray(data.blockedTop)) ? data.blockedTop : [];
        const loops = (data && Array.isArray(data.loops)) ? data.loops : [];
        const ownerDispatch = data && data.owners && Array.isArray(data.owners.dispatch) ? data.owners.dispatch : [];
        const ownerSend = data && data.owners && Array.isArray(data.owners.send) ? data.owners.send : [];

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        setText('sm-queue-load', `${Number(queue.queueLoadPercent || 0)}%`);
        setText('sm-ready-devices', `${Number(devices.ready || 0)}`);
        setText('sm-suspended-devices', `${Number(devices.suspended || 0)}`);
        setText('sm-stuck-count', `${Number(queue.stuckSendingCount || 0)}`);
        setText('sm-deferred-count', `${Number(queue.deferredCount || 0)}`);
        setText('sm-locked-devices', `${Number(devices.locked || 0)}`);
        setText('sm-resting-devices', `${Number(devices.resting || 0)}`);

        if (this.systemMonitorLoopBody) {
            if (!loops.length) {
                this.systemMonitorLoopBody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">Loop məlumatı yoxdur.</td></tr>';
            } else {
                this.systemMonitorLoopBody.innerHTML = loops.map((loop) => {
                    const status = this.escapeHtml(loop.status || 'unknown');
                    const lastRun = loop.lastRunAt
                        ? new Date(loop.lastRunAt).toLocaleString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '-';
                    const lag = loop.lagMs == null ? '-' : this.formatDuration(loop.lagMs);
                    const err = loop.lastError ? this.escapeHtml(loop.lastError) : '-';
                    return `<tr>
                        <td style="font-size:12px; font-weight:600;">${this.escapeHtml(loop.label || loop.key || '-')}</td>
                        <td><span class="sm-status ${status}">${status}</span></td>
                        <td style="font-size:12px;">${this.formatDuration(loop.intervalMs)}</td>
                        <td style="font-size:12px;">${this.escapeHtml(lastRun)}</td>
                        <td style="font-size:12px;">${this.escapeHtml(lag)}</td>
                        <td style="font-size:12px;">${this.formatDuration(loop.lastDurationMs || 0)}</td>
                        <td style="font-size:12px;">${Number(loop.overlapCount || 0)}</td>
                        <td style="font-size:12px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${err}">${err}</td>
                    </tr>`;
                }).join('');
            }
        }

        if (this.systemMonitorLabelQueueBody) {
            const rows = Array.isArray(queue.pendingByLabel) ? queue.pendingByLabel : [];
            this.systemMonitorLabelQueueBody.innerHTML = rows.length
                ? rows.map((row) => `<tr>
                    <td style="font-size:12px; font-weight:600;">${this.escapeHtml(row.label || '-')}</td>
                    <td style="font-size:12px;">${Number(row.queuedCount || 0)}</td>
                    <td style="font-size:12px;">${Number(row.deferredCount || 0)}</td>
                    <td style="font-size:12px;">${Number(row.ownerCount || 0)}</td>
                    <td style="font-size:12px;">${this.formatAgeSeconds(row.oldestAgeSec || 0)}</td>
                </tr>`).join('')
                : '<tr><td colspan="5" class="text-center py-3 text-muted">Növbə boşdur.</td></tr>';
        }

        if (this.systemMonitorStuckBody) {
            const rows = Array.isArray(queue.stuckSending) ? queue.stuckSending : [];
            this.systemMonitorStuckBody.innerHTML = rows.length
                ? rows.map((row) => `<tr>
                    <td style="font-size:12px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(row.recipient || '-')}">${this.escapeHtml(row.recipient || '-')}</td>
                    <td style="font-size:12px;">${this.escapeHtml(row.owner || 'admin')}</td>
                    <td style="font-size:12px;">${this.formatAgeSeconds(row.ageSec || 0)}</td>
                    <td style="font-size:12px;">${Number(row.attempts || 0)}</td>
                    <td style="font-size:12px;">${this.escapeHtml(row.deviceId || '-')}</td>
                </tr>`).join('')
                : '<tr><td colspan="5" class="text-center py-3 text-muted">İlişən göndəriş yoxdur.</td></tr>';
        }

        if (this.systemMonitorBlockedBody) {
            this.systemMonitorBlockedBody.innerHTML = blockedTop.length
                ? blockedTop.map((row) => {
                    const when = row.lastBlockedAt
                        ? new Date(row.lastBlockedAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '-';
                    return `<tr>
                        <td style="font-size:12px; font-weight:600;">${this.escapeHtml(row.recipient || '-')}</td>
                        <td style="font-size:12px;">${this.escapeHtml(row.owner || 'admin')}</td>
                        <td style="font-size:12px;">${Number(row.blockedCount || 0)}</td>
                        <td style="font-size:12px;">${this.escapeHtml(when)}</td>
                        <td style="font-size:12px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(row.lastError || '-')}">${this.escapeHtml(row.lastError || '-')}</td>
                    </tr>`;
                }).join('')
                : '<tr><td colspan="5" class="text-center py-3 text-muted">Blok qeydi yoxdur.</td></tr>';
        }

        if (this.systemMonitorOwnerBody) {
            const sendMap = new Map();
            ownerSend.forEach((row) => sendMap.set(row.owner, row));
            const dispatchMap = new Map();
            ownerDispatch.forEach((row) => dispatchMap.set(row.owner, row));
            const ownerSet = new Set([...dispatchMap.keys(), ...sendMap.keys()]);
            const rows = Array.from(ownerSet).map((ownerName) => {
                const row = dispatchMap.get(ownerName) || {};
                const send = sendMap.get(ownerName) || {};
                return {
                    owner: ownerName,
                    pause: row.pausedUntil || send.burstPauseUntil || null,
                    failureRate: Number(row.failureRate || 0),
                    hourCount: Number(send.hourCount || 0),
                    dayCount: Number(send.dayCount || 0)
                };
            }).sort((a, b) => b.dayCount - a.dayCount);
            this.systemMonitorOwnerBody.innerHTML = rows.length
                ? rows.map((row) => {
                    const pauseText = row.pause
                        ? new Date(row.pause).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
                        : '-';
                    return `<tr>
                        <td style="font-size:12px; font-weight:600;">${this.escapeHtml(row.owner || 'admin')}</td>
                        <td style="font-size:12px;">${this.escapeHtml(pauseText)}</td>
                        <td style="font-size:12px;">${(row.failureRate * 100).toFixed(1)}%</td>
                        <td style="font-size:12px;">${row.hourCount}</td>
                        <td style="font-size:12px;">${row.dayCount}</td>
                    </tr>`;
                }).join('')
                : '<tr><td colspan="5" class="text-center py-3 text-muted">Owner monitor qeydi yoxdur.</td></tr>';
        }
    }

    renderLookupResults(rows = []) {
        if (!this.lookupResultsBody) return;
        if (this.lookupResultsSummary) this.lookupResultsSummary.textContent = `${rows.length} qeyd`;
        if (!rows.length) {
            this.lookupResultsBody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Qeyd tapılmadı.</td></tr>';
            return;
        }
        this.lookupResultsBody.innerHTML = rows.map((row) => {
            const exists = row.exists === true ? 'Bəli' : (row.exists === false ? 'Xeyr' : 'Naməlum');
            const profile = row.profilePictureUrl
                ? `<img src="${this.escapeHtml(row.profilePictureUrl)}" alt="pp" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">`
                : '<span class="text-muted">Yoxdur</span>';
            const statusText = row.statusText || '-';
            const estimated = row.estimatedCreatedAt
                ? new Date(row.estimatedCreatedAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '-';
            return `<tr>
                <td style="font-size:12px; font-weight:600;">${this.escapeHtml(row.recipient || row.recipientDigits || '-')}</td>
                <td style="font-size:12px;">${this.escapeHtml(exists)}</td>
                <td style="font-size:12px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(row.displayName || row.profileName || row.businessName || '-')}">${this.escapeHtml(row.displayName || row.profileName || row.businessName || '-')}</td>
                <td>${profile}</td>
                <td style="font-size:12px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(statusText)}">${this.escapeHtml(statusText)}</td>
                <td style="font-size:12px;">${this.escapeHtml(estimated)}</td>
            </tr>`;
        }).join('');
    }

    async handleLookupSubmit(e) {
        e.preventDefault();
        if (!this.lookupNumbers) return;
        const numbers = this.lookupNumbers.value.trim();
        if (!numbers) {
            this.showToast('Ən az bir nömrə daxil edin.');
            return;
        }

        if (this.lookupSubmitBtn) {
            this.lookupSubmitBtn.disabled = true;
            this.lookupSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Yoxlanır...';
        }
        try {
            const payload = {
                owner: this.lookupOwner ? this.lookupOwner.value : '',
                numbers
            };
            const endpointCandidates = [
                '/admin/whatsapp-lookup',
                '/api/admin/whatsapp-lookup',
                '/whatsapp-lookup'
            ];
            let res = null;
            let data = null;
            let lastError = null;

            for (let i = 0; i < endpointCandidates.length; i += 1) {
                const endpoint = endpointCandidates[i];
                try {
                    res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const responseText = await res.text();
                    try {
                        data = responseText ? JSON.parse(responseText) : {};
                    } catch (_) {
                        data = { error: responseText || 'Server cavabı oxunmadı.' };
                    }
                    if (res.status !== 404) break;
                    const maybeCannotPost = String(data && data.error ? data.error : responseText || '').toLowerCase();
                    if (!maybeCannotPost.includes('cannot post')) break;
                } catch (endpointErr) {
                    lastError = endpointErr;
                    continue;
                }
            }

            if (!res) {
                throw (lastError || new Error('Lookup endpointinə qoşulmaq olmadı.'));
            }
            if (!res.ok) {
                this.showToast(data.error || 'Lookup xətası');
                return;
            }
            this.renderLookupResults(data.rows || []);
            this.fetchRecipientRegistry();
            this.showToast(`${Number(data.checked || 0)} nömrə yoxlandı.`);
        } catch (error) {
            console.error('Lookup submit error:', error);
            this.showToast('Lookup sorğusu zamanı xəta baş verdi.');
        } finally {
            if (this.lookupSubmitBtn) {
                this.lookupSubmitBtn.disabled = false;
                this.lookupSubmitBtn.textContent = 'Yoxla';
            }
        }
    }

    async fetchRecipientRegistry() {
        if (!this.recipientRegistryBody) return;
        try {
            const params = new URLSearchParams();
            params.set('limit', '1000');
            if (this.lookupOwner && this.lookupOwner.value) params.set('owner', this.lookupOwner.value);
            if (this.recipientRegistrySearch && this.recipientRegistrySearch.value.trim()) {
                params.set('q', this.recipientRegistrySearch.value.trim());
            }
            const res = await fetch(`/admin/recipient-registry?${params.toString()}`);
            if (!res.ok) throw new Error('Registry alınmadı');
            const data = await res.json();

            if (this.lookupOwner && Array.isArray(data.ownerOptions) && this.lookupOwner.options.length <= 1) {
                const options = ['<option value="">Avtomatik seçim</option>']
                    .concat(data.ownerOptions.map((owner) => `<option value="${this.escapeHtml(owner)}">${this.escapeHtml(owner)}</option>`));
                this.lookupOwner.innerHTML = options.join('');
            }
            this.renderRecipientRegistry(data.rows || [], data.total || 0);
        } catch (error) {
            console.error('Recipient registry fetch error:', error);
            this.recipientRegistryBody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">Rehber alınarkən xəta baş verdi.</td></tr>';
            if (this.recipientRegistrySummary) this.recipientRegistrySummary.textContent = '0 qeyd';
        }
    }

    renderRecipientRegistry(rows = [], total = 0) {
        if (!this.recipientRegistryBody) return;
        if (this.recipientRegistrySummary) this.recipientRegistrySummary.textContent = `${total} qeyd`;
        if (!rows.length) {
            this.recipientRegistryBody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">Rehber boşdur.</td></tr>';
            return;
        }
        this.recipientRegistryBody.innerHTML = rows.map((row) => {
            const exists = row.exists === true ? 'Bəli' : (row.exists === false ? 'Xeyr' : 'Naməlum');
            const profile = row.profilePictureUrl
                ? `<img src="${this.escapeHtml(row.profilePictureUrl)}" alt="pp" style="width:26px;height:26px;border-radius:50%;object-fit:cover;">`
                : '<span class="text-muted">-</span>';
            const status = row.statusText || '-';
            const sentAt = row.lastSentAt
                ? new Date(row.lastSentAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : '-';
            return `<tr>
                <td style="font-size:12px;">${this.escapeHtml(row.owner || 'admin')}</td>
                <td style="font-size:12px; font-weight:600;">${this.escapeHtml(row.recipient || row.recipientDigits || '-')}</td>
                <td style="font-size:12px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(row.displayName || row.profileName || row.businessName || '-')}">${this.escapeHtml(row.displayName || row.profileName || row.businessName || '-')}</td>
                <td style="font-size:12px;">${this.escapeHtml(exists)}</td>
                <td style="font-size:12px;">${Number(row.messageCount || 0)} (${Number(row.successCount || 0)}/${Number(row.failedCount || 0)})</td>
                <td style="font-size:12px;">${this.escapeHtml(sentAt)}</td>
                <td>${profile}</td>
                <td style="font-size:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(status)}">${this.escapeHtml(status)}</td>
            </tr>`;
        }).join('');
    }

    setDetailedLogsAutoRefresh(enabled) {
        if (this.detailedLogsAutoTimer) {
            clearInterval(this.detailedLogsAutoTimer);
            this.detailedLogsAutoTimer = null;
        }
        if (enabled) {
            this.detailedLogsAutoTimer = setInterval(() => {
                const logsTab = document.getElementById('login-logs-section');
                if (logsTab && logsTab.classList.contains('active')) {
                    this.fetchDetailedLogs();
                }
            }, 5000);
        }
    }

    exportDetailedLogs(format = 'json') {
        const rows = Array.isArray(this.lastDetailedLogs) ? this.lastDetailedLogs : [];
        if (!rows.length) {
            this.showToast('Eksport üçün qeyd tapılmadı');
            return;
        }

        if (format === 'csv') {
            const headers = ['at', 'source', 'level', 'owner', 'type', 'status', 'message', 'error', 'recipient', 'deviceId', 'nodeId'];
            const csvLines = [headers.join(',')];
            rows.forEach((row) => {
                const values = headers.map((key) => {
                    const raw = row[key] == null ? '' : String(row[key]);
                    const escaped = raw.replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvLines.push(values.join(','));
            });
            const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            this.downloadBlob(blob, `detailed_logs_${Date.now()}.csv`);
            return;
        }

        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
        this.downloadBlob(blob, `detailed_logs_${Date.now()}.json`);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getCountryLabel(iso) {
        if (!iso) return 'Naməlum';
        const code = String(iso).toLowerCase();
        const countryNames = {
            az: 'Azərbaycan', tr: 'Türkiyə', us: 'ABŞ', gb: 'Birləşmiş Krallıq', de: 'Almaniya', fr: 'Fransa',
            nl: 'Niderland', be: 'Belçika', ru: 'Rusiya', ua: 'Ukrayna', ge: 'Gürcüstan', am: 'Ermənistan',
            kz: 'Qazaxıstan', uz: 'Özbəkistan', kg: 'Qırğızıstan', tj: 'Tacikistan', tm: 'Türkmənistan',
            ae: 'BƏƏ', sa: 'Səudiyyə Ərəbistanı', qa: 'Qətər', kw: 'Küveyt', bh: 'Bəhreyn', om: 'Oman',
            il: 'İsrail', iq: 'İraq', jo: 'İordaniya', lb: 'Livan', ir: 'İran', in: 'Hindistan', pk: 'Pakistan',
            id: 'İndoneziya', ph: 'Filipinlər', br: 'Braziliya'
        };
        const upper = code.toUpperCase();
        return countryNames[code] ? `${countryNames[code]} (${upper})` : upper;
    }

    normalizeCountryLabel(label) {
        const text = String(label || '').trim();
        if (!text) return 'Naməlum';
        if (/bilinm/i.test(text)) return 'Naməlum';
        return text;
    }

    inferIsoFromPhone(phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return '';
        for (let len = 4; len >= 1; len -= 1) {
            if (digits.length < len) continue;
            const prefix = digits.slice(0, len);
            if (this.callingCodeToIso[prefix]) {
                return this.callingCodeToIso[prefix];
            }
        }
        return '';
    }

    async updateDealerTable() {
        if (!this.config || !this.config.apiKey) return;
        try {
            const dr2 = await fetch('/admin/dealers', {
                headers: { 'x-admin-api-key': this.config.apiKey }
            });
            const d2 = await dr2.json();

            if (!this.dealerTableBody) return;
            this.dealerTableBody.innerHTML = '';

            d2.dealers.forEach(dl => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 transition-colors";

                const b = dl.billing || { suspended: false, lastPaidPeriod: '-' };
                const billingStatusHtml = b.suspended
                    ? '<span class="badge badge-danger"><i class="fas fa-pause-circle mr-1"></i> DONDURULUB</span>'
                    : '<span class="badge badge-success"><i class="fas fa-check-circle mr-1"></i> AKTİV</span>';

                const lastSeenMonth = b.lastPaidPeriod || '-';
                const reactivateBtn = b.suspended
                    ? `<button class="btn btn-xs btn-success mr-1" onclick="reactivateD('${dl.username}')">
                        <i class="fas fa-play mr-1"></i> Aktivləşdir
                       </button>`
                    : `<button class="btn btn-xs btn-outline-success mr-1" onclick="reactivateD('${dl.username}')">
                        <i class="fas fa-sync mr-1"></i> Ödəniş Alındı
                       </button>`;

                tr.innerHTML = `
                    <td class="font-weight-bold" style="color:#0f172a">${dl.username}</td>
                    <td><span class="badge badge-info">${dl.deviceCount}</span></td>
                    <td><span class="badge badge-secondary">${dl.deviceLimit || '∞'}</span></td>
                    <td><small class="font-weight-bold text-muted">${lastSeenMonth}</small></td>
                    <td>${billingStatusHtml}</td>
                    <td class="text-right">
                        ${reactivateBtn}
                        <button class="btn btn-xs btn-outline-primary" onclick="setL('${dl.username}')">
                            <i class="fas fa-edit mr-1"></i> Limit
                        </button>
                    </td>
                `;
                this.dealerTableBody.appendChild(tr);
            });
        } catch (e) {
            console.error('Dealer fetch error:', e);
        }
    }

    // New helper to update owner select list dynamically if needed
    async updateOwnerSummaries() {
        // This might be redundant if listDealers covers it, skipping for now to strict to previous logic
    }

    async deleteDevice(id) {
        if (confirm('Silinsin?')) {
            await fetch(`/admin/devices/${id}`, { method: 'DELETE' });
            this.refresh();
        }
    }

    async setDealerLimit(u) {
        const l = prompt('Limit:');
        if (l !== null) {
            await fetch(`/admin/dealers/${u}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify({ deviceLimit: l === '' ? null : parseInt(l) })
            });
            this.refresh();
        }
    }

    async reactivateDealer(u) {
        if (!confirm(`${u} adlı dilerin abunəliyini aktivləşdirmək istəyirsiniz?`)) return;
        try {
            const res = await fetch(`/admin/dealers/${u}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify({ paymentReceived: true })
            });
            if (res.ok) {
                toastr.success('Diler abunəliyi aktivləşdirildi');
                this.refresh();
            } else {
                const data = await res.json();
                toastr.error(data.error || 'Xəta baş verdi');
            }
        } catch (e) {
            toastr.error('Bağlantı xətası');
        }
    }

    async handleDealerSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Gözləyin...';

        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);

        try {
            const r = await fetch('/admin/dealers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify(data)
            });

            const res = await r.json();
            if (r.ok) {
                this.showToast(`${this.t('toast.dealer_added')} Şifrə: ${res.password}`);
                e.target.reset();
                this.refresh();
            } else {
                this.showToast(res.error || this.t('toast.error'));
            }
        } catch (err) {
            this.showToast(this.t('toast.connection_error'));
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async handleActivationSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>...';

        try {
            const r = await fetch('/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify({ username: e.target.username.value })
            });
            const d = await r.json();
            if (this.activationResult) {
                this.activationResult.classList.remove('d-none');
                this.activationResult.innerHTML = r.ok ? `<strong>API Key:</strong> <code class="text-primary">${d.apiKey}</code>` : `<span class="text-danger">${d.error}</span>`;
            }
        } catch (err) {
            this.showToast('Sorğu uğursuz oldu.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async handleAuditSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Yadda saxlanılır...';

        const jid = e.target.jid.value.trim();
        const enabled = document.getElementById('auditEnabled').checked;
        try {
            const r = await fetch('/admin/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': this.config.apiKey
                },
                body: JSON.stringify({ jid, enabled })
            });
            const d = await r.json();
            if (r.ok) this.showToast(this.t('toast.settings_saved'));
            else this.showToast(d.error || this.t('toast.error'));
        } catch (err) {
            this.showToast(this.t('toast.request_failed'));
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async handleBulkSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-paper-plane fa-spin mr-1"></i> Göndərilir...';

        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);

        try {
            const r = await fetch('/admin/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (r.redirected) {
                // In case server redirects, parse URL for info
                const url = new URL(r.url);
                const error = url.searchParams.get('error');
                const success = url.searchParams.get('success');
                if (error) this.showToast(error);
                if (success) {
                    this.showToast(success);
                    e.target.reset();
                }
            } else {
                const res = await r.json();
                if (r.ok) {
                    this.showToast(res.message || this.t('toast.messages_enqueued'));
                    e.target.reset();
                } else {
                    this.showToast(res.error || this.t('toast.send_error'));
                }
            }
            this.refresh();
        } catch (err) {
            this.showToast(this.t('toast.request_failed'));
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async setLanguage(lang) {
        try {


            // Initialize Select2 if exists
            if ($('.select2').length > 0) { /* Placeholder for Select2 init */ }
            const res = await fetch(`/langs/${lang}.json`);
            if (!res.ok) throw new Error('Language file not found');
            this.translations = await res.json();
            this.currentLang = lang;
            localStorage.setItem('selectedLang', lang);
            this.applyTranslations();
        } catch (err) {
            console.error('Localization Error:', err);
        }
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.getNestedValue(this.translations, key);
            if (translation) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translation;
                } else {
                    el.innerText = translation;
                }
            }
        });
    }

    getNestedValue(obj, key) {
        return key.split('.').reduce((prev, curr) => (prev ? prev[curr] : null), obj);
    }

    copyToClipboard(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Kopyalandı: ' + text);
        }).catch(err => {
            console.error('Copy failed', err);
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.showToast('Kopyalandı');
        });
    }

    async fetchProfile() {
        try {
            const res = await fetch('/admin/profile');
            if (res.ok) {
                const data = await res.json();
                this.config = { ...this.config, ...data }; // Update local config with fresh data
                this.renderProfile(); // Use the renderProfile method we defined earlier
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
        }
    }

    async handleProfileSubmit(e) {
        e.preventDefault();
        const phoneNumber = this.profilePhone.value.trim();

        try {
            const res = await fetch('/admin/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber })
            });

            if (res.ok) {
                this.showToast('Profil yeniləndi.');
            } else {
                const d = await res.json();
                this.showToast(d.error || 'Xəta baş verdi.');
            }
        } catch (error) {
            console.error('Profile save error:', error);
            this.showToast('Yadda saxlamaq mümkün olmadı.');
        }
    }

    updateLangSwitcherUI() {
        const flags = { az: '🇦🇿', tr: '🇹🇷', en: '🇺🇸', ru: '🇷🇺' };
        const names = { az: 'AZERBAYCAN', tr: 'TÜRKÇE', en: 'ENGLISH', ru: 'РУССКИЙ' };

        const flagEl = document.getElementById('current-lang-flag');
        const nameEl = document.getElementById('current-lang-name');

        if (flagEl) flagEl.textContent = flags[this.currentLang];
        if (nameEl) nameEl.textContent = names[this.currentLang];
    }

    t(key) {
        return this.getNestedValue(this.translations, key) || key;
    }

    initSidebarSearch() {
        if (!this.sidebarSearchInput) return;

        this.sidebarSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const navLinks = document.querySelectorAll('.sidebar .nav-link');
            const navHeaders = document.querySelectorAll('.sidebar .nav-header');

            navLinks.forEach(link => {
                const text = link.textContent.toLowerCase();
                const item = link.closest('.nav-item');
                if (text.includes(query)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide headers if no visible children follow them
            navHeaders.forEach(header => {
                let next = header.nextElementSibling;
                let hasVisibleChild = false;
                while (next && !next.classList.contains('nav-header')) {
                    if (next.style.display !== 'none') {
                        hasVisibleChild = true;
                        break;
                    }
                    next = next.nextElementSibling;
                }
                header.style.display = hasVisibleChild ? '' : 'none';
            });
        });

        // Add ⌘K global shortcut
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.sidebarSearchInput.focus();
            }
        });
    }

    escapeHtml(value) {
        return (value || '').toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new HubMsgAdmin();
});
