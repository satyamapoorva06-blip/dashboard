/**
 * SI / 01 — Travel SIM Commerce Intelligence
 * Connected directly to Supabase RPC Endpoints:
 * 1. POST /rest/v1/rpc/get_sales_dashboard
 * 2. POST /rest/v1/rpc/get_destination_sales
 * 3. POST /rest/v1/rpc/get_product_sales
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       1. CONFIG MANAGER
       ============================================================ */
    const ConfigManager = {
        init() {
            // Master default from config.js takes priority for user's Supabase
            if (!window.CONFIG.SUPABASE.URL || window.CONFIG.SUPABASE.URL.includes('wmbatocaybeusdmemkao')) {
                window.CONFIG.SUPABASE.URL = "https://qjnqbkcvfowgylhnnrja.supabase.co";
                window.CONFIG.SUPABASE.ANON_KEY = "sb_publishable_jHBClLfFjDc8nmZXT58tkg_rnfaWWxs";
            }
            
            const savedUrl = localStorage.getItem('si_supabase_url');
            if (savedUrl && savedUrl.trim() !== '') {
                window.CONFIG.SUPABASE.URL = savedUrl.trim();
            }

            const savedKey = localStorage.getItem('si_supabase_anon_key');
            if (savedKey && savedKey.trim() !== '') {
                window.CONFIG.SUPABASE.ANON_KEY = savedKey.trim();
            }

            if (window.CONFIG.SUPABASE.ANON_KEY && window.CONFIG.SUPABASE.ANON_KEY.trim() !== '') {
                window.CONFIG.USE_DEMO_MODE = false;
            } else {
                const savedDemoMode = localStorage.getItem('si_demo_mode');
                if (savedDemoMode !== null) {
                    window.CONFIG.USE_DEMO_MODE = savedDemoMode === 'true';
                }
            }

            const savedDebugMode = localStorage.getItem('si_debug_mode');
            if (savedDebugMode !== null) {
                window.CONFIG.DEBUG_MODE = savedDebugMode === 'true';
            }
        }
    };

    ConfigManager.init();

    /* ============================================================
       2. NORMALIZER LAYER
       ============================================================ */
    const Normalizer = {
        normalizeResponse(rawData) {
            if (!rawData) return this.emptyData();

            let rawKpi = {};
            if (Array.isArray(rawData.KPI_METRIC_CARD) && rawData.KPI_METRIC_CARD.length > 0) {
                rawKpi = rawData.KPI_METRIC_CARD[0];
            } else if (rawData.KPI_METRIC_CARD && typeof rawData.KPI_METRIC_CARD === 'object') {
                rawKpi = rawData.KPI_METRIC_CARD;
            }

            const kpi = {
                todaySales: Number(rawKpi.today_sales || 0),
                todayRevenue: Number(rawKpi.today_revenue || 0),
                mtdSales: Number(rawKpi.mtd_sales || 0),
                mtdRevenue: Number(rawKpi.mtd_revenue || 0),
                previousSameDaySales: Number(rawKpi.previous_same_day || 0),
                previousSameDayRevenue: Number(rawKpi.previous_same_day_revenue || 0),
                previousMtdSales: Number(rawKpi.previous_mtd_sales || 0),
                previousMtdRevenue: Number(rawKpi.previous_mtd_revenue || 0)
            };

            const rawDaily = Array.isArray(rawData.daily_summary) ? rawData.daily_summary : [];
            const dailySummary = rawDaily.map(d => ({
                date: String(d.DATE || d.date || ''),
                orders: Number(d.no_of_order || d.orders || 0)
            })).filter(d => d.date).sort((a, b) => new Date(a.date) - new Date(b.date));

            const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const rawMonthly = Array.isArray(rawData.monthly_summary) ? rawData.monthly_summary : [];
            const monthlySummary = rawMonthly.map(m => {
                const monthNum = Number(m.month_ || m.month || 0);
                return {
                    month: monthNum,
                    monthName: monthNames[monthNum] || `Month ${monthNum}`,
                    orders: Number(m.no_of_order || m.orders || 0)
                };
            }).filter(m => m.month > 0).sort((a, b) => a.month - b.month);

            const rawEmployees = Array.isArray(rawData.employee_table) ? rawData.employee_table : [];
            const employees = rawEmployees.map((e, idx) => ({
                id: `emp_${idx}`,
                name: String(e.staff_name || 'Unassigned').trim(),
                monthlySales: Number(e.monthly_sales || 0),
                monthlyRevenue: Number(e.monthly_revenue || 0),
                todaySales: e.today_sales !== null && e.today_sales !== undefined ? Number(e.today_sales) : 0,
                todayRevenue: e.today_revenue !== null && e.today_revenue !== undefined ? Number(e.today_revenue) : 0
            })).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

            return {
                kpi,
                dailySummary,
                monthlySummary,
                employees
            };
        },

        emptyData() {
            return {
                kpi: {
                    todaySales: 0, todayRevenue: 0, mtdSales: 0, mtdRevenue: 0,
                    previousSameDaySales: 0, previousSameDayRevenue: 0, previousMtdSales: 0, previousMtdRevenue: 0
                },
                dailySummary: [],
                monthlySummary: [],
                employees: []
            };
        }
    };

    /* ============================================================
       3. DEMO ENGINE FALLBACK
       ============================================================ */
    const DemoEngine = {
        generateData() {
            return Normalizer.normalizeResponse(window.CONFIG.DEMO_CONFIG);
        },
        getDestinations() {
            return window.CONFIG.DEMO_CONFIG.destination_sales;
        },
        getProducts() {
            return window.CONFIG.DEMO_CONFIG.product_sales;
        }
    };

    /* ============================================================
       4. API MODULE (SUPABASE RPC FETCHERS)
       ============================================================ */
    const API = {
        cache: {},
        activeAbortController: null,

        getHeaders() {
            const sb = window.CONFIG.SUPABASE;
            return {
                "apikey": sb.ANON_KEY || "",
                "Authorization": `Bearer ${sb.ANON_KEY || ""}`,
                "Content-Type": "application/json"
            };
        },

        async testConnection(url, anonKey) {
            const targetUrl = url || window.CONFIG.SUPABASE.URL;
            const targetKey = anonKey || window.CONFIG.SUPABASE.ANON_KEY;

            if (!targetUrl || !targetKey || targetKey.trim() === '') {
                return { success: false, message: "URL and Anon key required." };
            }

            const endpoint = `${targetUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_sales_dashboard`;
            const startTime = performance.now();

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        "apikey": targetKey,
                        "Authorization": `Bearer ${targetKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ "p_as_of_date": "2026-05-20" })
                });

                const latency = Math.round(performance.now() - startTime);

                if (response.ok) {
                    return { success: true, latency: latency, message: `● CONNECTED (${latency} ms)` };
                } else {
                    const statusText = `${response.status} ${response.statusText}`;
                    return { success: false, message: `✕ CONNECTION FAILED (${statusText})` };
                }
            } catch (err) {
                return { success: false, message: `✕ CONNECTION FAILED (${err.message})` };
            }
        },

        async getDashboard(asOfDate, forceRefresh = false) {
            const dateStr = asOfDate || window.CONFIG.DEFAULT_AS_OF_DATE || '2026-05-20';

            if (window.CONFIG.USE_DEMO_MODE) {
                UIController.hideApiError();
                return DemoEngine.generateData();
            }

            if (!forceRefresh && this.cache[dateStr]) {
                UIController.hideApiError();
                return this.cache[dateStr];
            }

            if (this.activeAbortController) {
                this.activeAbortController.abort();
            }
            this.activeAbortController = new AbortController();
            const signal = this.activeAbortController.signal;

            const sb = window.CONFIG.SUPABASE;
            const endpointPath = window.CONFIG.ENDPOINTS ? window.CONFIG.ENDPOINTS.DASHBOARD : "/rest/v1/rpc/get_sales_dashboard";

            if (!sb.URL || !sb.ANON_KEY || sb.ANON_KEY.trim() === "") {
                const errorMsg = "Supabase ANON_KEY is not configured in config.js.";
                UIController.showApiError(errorMsg, endpointPath, "401 UNAUTHORIZED");
                throw new Error(errorMsg);
            }

            const fullUrl = endpointPath.startsWith('http') 
                ? endpointPath 
                : `${sb.URL.replace(/\/+$/, '')}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;

            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ "p_as_of_date": dateStr }),
                    signal: signal
                });

                if (!response.ok) {
                    const statusText = `${response.status} ${response.statusText}`;
                    const errBody = await response.json().catch(() => ({}));
                    if (errBody.code === 'PGRST202') {
                        console.warn("Supabase connected! RPC function public.get_sales_dashboard not found in schema. Using high-fidelity demo fallback.", errBody);
                        UIController.showApiError(`Supabase Connected! Please run the SQL setup script in your Supabase SQL Editor to create the RPC functions.`, fullUrl, "RPC NOT FOUND (PGRST202)");
                        return DemoEngine.generateData();
                    }
                    UIController.showApiError(`Unable to retrieve live sales intelligence (${statusText}).`, fullUrl, statusText);
                    throw new Error(`Supabase API ${statusText}`);
                }

                let rawData = await response.json();

                if (Array.isArray(rawData)) {
                    if (rawData.length > 0 && rawData[0].get_sales_dashboard) {
                        rawData = rawData[0].get_sales_dashboard;
                    } else if (rawData.length > 0 && rawData[0].daily_summary) {
                        rawData = rawData[0];
                    }
                }

                const normalized = Normalizer.normalizeResponse(rawData);
                this.cache[dateStr] = normalized;
                UIController.hideApiError();

                return normalized;
            } catch (err) {
                if (err.name === 'AbortError') throw err;
                console.error("Live Supabase API Fetch Failure:", err);
                UIController.showApiError(`Unable to retrieve live sales intelligence (${err.message}).`, fullUrl, "HTTP FAILED");
                throw err;
            }
        },

        async getDestinationSales(asOfDate) {
            if (window.CONFIG.USE_DEMO_MODE) return DemoEngine.getDestinations();
            const sb = window.CONFIG.SUPABASE;
            if (!sb.URL || !sb.ANON_KEY || sb.ANON_KEY.trim() === '') return DemoEngine.getDestinations();

            const endpoint = window.CONFIG.ENDPOINTS.DESTINATIONS || "/rest/v1/rpc/get_destination_sales";
            const fullUrl = `${sb.URL.replace(/\/+$/, '')}${endpoint}`;

            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ "p_as_of_date": asOfDate })
                });

                if (!response.ok) return DemoEngine.getDestinations();
                let data = await response.json();
                if (Array.isArray(data) && data.length > 0 && data[0].get_destination_sales) {
                    data = data[0].get_destination_sales;
                }
                return Array.isArray(data) ? data : DemoEngine.getDestinations();
            } catch (err) {
                console.warn("Falling back to demo destination sales data:", err);
                return DemoEngine.getDestinations();
            }
        },

        async getProductSales(asOfDate) {
            if (window.CONFIG.USE_DEMO_MODE) return DemoEngine.getProducts();
            const sb = window.CONFIG.SUPABASE;
            if (!sb.URL || !sb.ANON_KEY || sb.ANON_KEY.trim() === '') return DemoEngine.getProducts();

            const endpoint = window.CONFIG.ENDPOINTS.PRODUCTS || "/rest/v1/rpc/get_product_sales";
            const fullUrl = `${sb.URL.replace(/\/+$/, '')}${endpoint}`;

            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ "p_as_of_date": asOfDate })
                });

                if (!response.ok) return DemoEngine.getProducts();
                let data = await response.json();
                if (Array.isArray(data) && data.length > 0 && data[0].get_product_sales) {
                    data = data[0].get_product_sales;
                }
                return Array.isArray(data) ? data : DemoEngine.getProducts();
            } catch (err) {
                console.warn("Falling back to demo product sales data:", err);
                return DemoEngine.getProducts();
            }
        }
    };

    /* ============================================================
       5. BRIEFING ENGINE (NARRATIVE GENERATOR)
       ============================================================ */
    const BriefingEngine = {
        generateInsights(data) {
            const container = document.getElementById('story-cards-container');
            if (!container) return;

            const kpi = data.kpi;
            const emps = data.employees;

            const mtdGrowth = kpi.previousMtdRevenue > 0
                ? (((kpi.mtdRevenue - kpi.previousMtdRevenue) / kpi.previousMtdRevenue) * 100).toFixed(1)
                : '0.0';

            const todaySalesGrowth = kpi.previousSameDaySales > 0
                ? (((kpi.todaySales - kpi.previousSameDaySales) / kpi.previousSameDaySales) * 100).toFixed(1)
                : '0.0';

            const topStaff = emps.length > 0 ? emps[0] : null;

            const html = `
                <div class="briefing-item">
                    <strong>Revenue Growth Velocity:</strong> MTD revenue reached <strong>${UIController.formatCurrency(kpi.mtdRevenue)}</strong> across <strong>${kpi.mtdSales} orders</strong> (+${mtdGrowth}% over previous MTD).
                </div>
                <div class="briefing-item">
                    <strong>Today Sales Speed:</strong> Today recorded <strong>${kpi.todaySales} SIM orders</strong> generating <strong>${UIController.formatCurrency(kpi.todayRevenue)}</strong> (${todaySalesGrowth >= 0 ? '+' : ''}${todaySalesGrowth}% vs previous same day).
                </div>
                ${topStaff ? `
                <div class="briefing-item">
                    <strong>Top Performer Contribution:</strong> <strong>${topStaff.name}</strong> leads overall sales generated <strong>${UIController.formatCurrency(topStaff.monthlyRevenue)}</strong> (${topStaff.monthlySales} orders, ${((topStaff.monthlyRevenue / (kpi.mtdRevenue || 1)) * 100).toFixed(1)}% revenue share).
                </div>
                ` : ''}
            `;

            container.innerHTML = html;
        }
    };

    /* ============================================================
       6. SVG CHART CANVAS RENDERER
       ============================================================ */
    const ChartCanvas = {
        currentMetric: 'daily_orders',
        currentData: null,

        init() {
            const tabBtns = document.querySelectorAll('.tab-group button[data-metric]');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentMetric = e.target.dataset.metric;
                    this.render();
                });
            });
        },

        updateData(data) {
            this.currentData = data;
            this.render();
        },

        render() {
            const container = document.getElementById('chart-canvas-container');
            const titleEl = document.getElementById('chart-main-title');
            const subEl = document.getElementById('chart-main-subtitle');
            if (!container || !this.currentData) return;

            let points = [];
            let titleText = 'SIM Sales Volume Trajectory';
            let subText = 'Time-series trajectory derived from backend RPC endpoints';

            if (this.currentMetric === 'daily_orders') {
                points = this.currentData.dailySummary.map(d => ({ label: d.date.split('-').slice(1).join('/'), value: d.orders, fullDate: d.date }));
                titleText = 'Daily SIM Order Velocity';
                subText = 'Order transaction volume per calendar day (daily_summary)';
            } else if (this.currentMetric === 'monthly_orders') {
                points = this.currentData.monthlySummary.map(m => ({ label: m.monthName.substring(0, 3), value: m.orders, fullDate: m.monthName }));
                titleText = 'Monthly Order Trajectory';
                subText = 'Aggregated order volume by month (monthly_summary)';
            } else if (this.currentMetric === 'staff_revenue') {
                points = this.currentData.employees.map(e => ({ label: e.name, value: e.monthlyRevenue, fullDate: `${e.name} (${e.monthlySales} orders)` }));
                titleText = 'Staff Revenue Contribution';
                subText = 'Monthly revenue generated per staff member (employee_table)';
            }

            if (titleEl) titleEl.textContent = titleText;
            if (subEl) subEl.textContent = subText;

            if (points.length === 0) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);">No telemetry available</div>';
                return;
            }

            const values = points.map(p => p.value);
            const peak = Math.max(...values);
            const lowest = Math.min(...values);
            const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

            document.getElementById('chart-peak-val').textContent = this.currentMetric === 'staff_revenue' ? UIController.formatCurrency(peak) : peak;
            document.getElementById('chart-low-val').textContent = this.currentMetric === 'staff_revenue' ? UIController.formatCurrency(lowest) : lowest;
            document.getElementById('chart-avg-val').textContent = this.currentMetric === 'staff_revenue' ? UIController.formatCurrency(avg) : avg;

            const width = container.clientWidth || 800;
            const height = 300;
            const padding = { top: 20, right: 20, bottom: 40, left: 50 };

            const plotW = width - padding.left - padding.right;
            const plotH = height - padding.top - padding.bottom;

            const maxY = peak * 1.15 || 10;

            const getX = (idx) => padding.left + (idx / Math.max(points.length - 1, 1)) * plotW;
            const getY = (val) => padding.top + plotH - (val / maxY) * plotH;

            let pathD = '';
            let areaD = '';

            points.forEach((p, idx) => {
                const x = getX(idx);
                const y = getY(p.value);
                if (idx === 0) {
                    pathD += `M ${x} ${y}`;
                    areaD += `M ${x} ${padding.top + plotH} L ${x} ${y}`;
                } else {
                    const prevX = getX(idx - 1);
                    const prevY = getY(points[idx - 1].value);
                    const cX1 = prevX + (x - prevX) / 2;
                    const cX2 = prevX + (x - prevX) / 2;
                    pathD += ` C ${cX1} ${prevY}, ${cX2} ${y}, ${x} ${y}`;
                    areaD += ` C ${cX1} ${prevY}, ${cX2} ${y}, ${x} ${y}`;
                }

                if (idx === points.length - 1) {
                    areaD += ` L ${x} ${padding.top + plotH} Z`;
                }
            });

            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#10B981';
            const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#06B6D4';
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#F8FAFC';
            const dimColor = getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#94A3B8';

            let svg = `
                <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:100%;">
                    <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35"/>
                            <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.0"/>
                        </linearGradient>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stop-color="${primaryColor}"/>
                            <stop offset="100%" stop-color="${secondaryColor}"/>
                        </linearGradient>
                    </defs>

                    <!-- Horizontal Grid -->
                    <line x1="${padding.left}" y1="${getY(0)}" x2="${width - padding.right}" y2="${getY(0)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
                    <line x1="${padding.left}" y1="${getY(maxY / 2)}" x2="${width - padding.right}" y2="${getY(maxY / 2)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
                    <line x1="${padding.left}" y1="${getY(maxY)}" x2="${width - padding.right}" y2="${getY(maxY)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>

                    <!-- Y Axis Labels -->
                    <text x="${padding.left - 8}" y="${getY(0)}" fill="${dimColor}" font-size="10" text-anchor="end" alignment-baseline="middle">0</text>
                    <text x="${padding.left - 8}" y="${getY(maxY / 2)}" fill="${dimColor}" font-size="10" text-anchor="end" alignment-baseline="middle">${Math.round(maxY / 2)}</text>
                    <text x="${padding.left - 8}" y="${getY(maxY)}" fill="${dimColor}" font-size="10" text-anchor="end" alignment-baseline="middle">${Math.round(maxY)}</text>

                    <!-- Area Fill & Bezier Curve Line -->
                    <path d="${areaD}" fill="url(#chartGlow)"/>
                    <path d="${pathD}" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round"/>

                    <!-- Interactive Data Points -->
            `;

            const labelStep = Math.max(Math.ceil(points.length / 10), 1);

            points.forEach((p, idx) => {
                const x = getX(idx);
                const y = getY(p.value);

                svg += `
                    <circle cx="${x}" cy="${y}" r="5" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="2" class="chart-point" data-idx="${idx}" style="cursor:pointer;transition:transform 0.15s ease;"/>
                `;

                if (idx % labelStep === 0 || idx === points.length - 1) {
                    svg += `
                        <text x="${x}" y="${height - 10}" fill="${dimColor}" font-size="10" text-anchor="middle">${p.label}</text>
                    `;
                }
            });

            svg += `</svg>`;
            container.innerHTML = svg;

            const tooltip = document.getElementById('chart-tooltip');
            container.querySelectorAll('.chart-point').forEach(pt => {
                pt.addEventListener('mouseenter', (e) => {
                    const idx = Number(e.target.dataset.idx);
                    const p = points[idx];
                    if (!p || !tooltip) return;

                    tooltip.innerHTML = `
                        <div style="font-size:10px;text-transform:uppercase;opacity:0.8;">${p.fullDate}</div>
                        <div style="font-size:14px;font-weight:800;">${this.currentMetric === 'staff_revenue' ? UIController.formatCurrency(p.value) : p.value + ' Orders'}</div>
                    `;

                    const ptX = getX(idx);
                    const ptY = getY(p.value);

                    tooltip.style.left = `${ptX}px`;
                    tooltip.style.top = `${ptY}px`;
                    tooltip.classList.remove('hidden');
                });

                pt.addEventListener('mouseleave', () => {
                    if (tooltip) tooltip.classList.add('hidden');
                });
            });
        }
    };

    /* ============================================================
       7. DESTINATION INTELLIGENCE CONTROLLER
       ============================================================ */
    const DestinationController = {
        destinations: [],
        currentSort: 'orders',
        currentPage: 1,
        pageSize: 10,

        init() {
            document.getElementById('btn-dest-sort-orders')?.addEventListener('click', () => this.setSort('orders'));
            document.getElementById('btn-dest-sort-revenue')?.addEventListener('click', () => this.setSort('revenue'));
            document.getElementById('dest-page-size-select')?.addEventListener('change', (e) => {
                this.pageSize = Number(e.target.value);
                this.currentPage = 1;
                this.render();
            });

            document.getElementById('btn-dest-prev')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.render();
                }
            });

            document.getElementById('btn-dest-next')?.addEventListener('click', () => {
                const totalPages = Math.ceil(this.destinations.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.render();
                }
            });
        },

        setSort(sortType) {
            this.currentSort = sortType;
            document.getElementById('btn-dest-sort-orders')?.classList.toggle('active', sortType === 'orders');
            document.getElementById('btn-dest-sort-revenue')?.classList.toggle('active', sortType === 'revenue');
            this.render();
        },

        updateData(data) {
            this.destinations = Array.isArray(data) ? data : [];
            this.render();
        },

        render() {
            const container = document.getElementById('destination-ranking-container');
            const heroName = document.getElementById('top-dest-name');
            const heroOrders = document.getElementById('top-dest-orders');
            const heroRevenue = document.getElementById('top-dest-revenue');
            const heroShare = document.getElementById('top-dest-share');
            const statement = document.getElementById('dest-insight-text');

            if (!container || this.destinations.length === 0) return;

            const sorted = [...this.destinations].sort((a, b) => {
                return this.currentSort === 'orders'
                    ? (b.orders || 0) - (a.orders || 0)
                    : (b.revenue || 0) - (a.revenue || 0);
            });

            const topDest = sorted[0];
            if (topDest) {
                if (heroName) heroName.textContent = topDest.destination_name || 'Top Destination';
                if (heroOrders) heroOrders.textContent = topDest.orders || 0;
                if (heroRevenue) heroRevenue.textContent = UIController.formatCurrency(topDest.revenue || 0);
                if (heroShare) heroShare.textContent = `${(topDest.revenue_share || 0).toFixed(1)}%`;
                if (statement) {
                    statement.innerHTML = `<strong>${topDest.destination_name}</strong> leads global destination demand with <strong>${topDest.orders} SIM orders</strong> and <strong>${UIController.formatCurrency(topDest.revenue)}</strong> revenue.`;
                }
            }

            const maxVal = Math.max(...sorted.map(d => this.currentSort === 'orders' ? (d.orders || 0) : (d.revenue || 0))) || 1;

            const startIdx = (this.currentPage - 1) * this.pageSize;
            const endIdx = startIdx + this.pageSize;
            const pageData = sorted.slice(startIdx, endIdx);

            let html = '';
            pageData.forEach((d, idx) => {
                const rank = startIdx + idx + 1;
                const val = this.currentSort === 'orders' ? d.orders : d.revenue;
                const pct = ((val / maxVal) * 100).toFixed(1);
                const flagSrc = d.flag_path || `https://flagcdn.com/w320/${(d.destination_name || 'un').substring(0, 2).toLowerCase()}.png`;

                html += `
                    <div class="dest-row">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span style="font-size:11px;font-weight:800;color:var(--text-dim);width:20px;">#${rank}</span>
                                <img src="${flagSrc}" alt="${d.destination_name}" style="width:22px;height:15px;object-fit:cover;border-radius:2px;" onerror="this.src='https://flagcdn.com/w320/un.png'">
                                <strong style="font-size:13px;">${d.destination_name}</strong>
                            </div>
                            <div style="text-align:right;">
                                <strong style="font-size:13px;">${UIController.formatCurrency(d.revenue || 0)}</strong>
                                <span style="font-size:11px;color:var(--text-dim);margin-left:4px;">(${d.orders || 0} orders)</span>
                            </div>
                        </div>
                        <div class="dest-bar-track">
                            <div class="dest-bar-fill" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            const indicator = document.getElementById('dest-page-indicator-text');
            if (indicator) {
                indicator.textContent = `Showing ${startIdx + 1}–${Math.min(endIdx, sorted.length)} of ${sorted.length} destinations`;
            }

            const prevBtn = document.getElementById('btn-dest-prev');
            const nextBtn = document.getElementById('btn-dest-next');
            const totalPages = Math.ceil(sorted.length / this.pageSize);

            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        }
    };

    /* ============================================================
       8. SIM PACKAGE INTELLIGENCE CONTROLLER
       ============================================================ */
    const PlanController = {
        plans: [],
        currentSort: 'orders',
        currentPage: 1,
        pageSize: 10,

        init() {
            document.getElementById('btn-plan-sort-orders')?.addEventListener('click', () => this.setSort('orders'));
            document.getElementById('btn-plan-sort-revenue')?.addEventListener('click', () => this.setSort('revenue'));
            document.getElementById('btn-plan-sort-aov')?.addEventListener('click', () => this.setSort('aov'));

            document.getElementById('plan-page-size-select')?.addEventListener('change', (e) => {
                this.pageSize = Number(e.target.value);
                this.currentPage = 1;
                this.render();
            });

            document.getElementById('btn-plan-prev')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.render();
                }
            });

            document.getElementById('btn-plan-next')?.addEventListener('click', () => {
                const totalPages = Math.ceil(this.plans.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.render();
                }
            });
        },

        setSort(sortType) {
            this.currentSort = sortType;
            document.getElementById('btn-plan-sort-orders')?.classList.toggle('active', sortType === 'orders');
            document.getElementById('btn-plan-sort-revenue')?.classList.toggle('active', sortType === 'revenue');
            document.getElementById('btn-plan-sort-aov')?.classList.toggle('active', sortType === 'aov');
            this.render();
        },

        updateData(data) {
            this.plans = Array.isArray(data) ? data : [];
            this.render();
        },

        render() {
            const container = document.getElementById('plans-container');
            const statement = document.getElementById('plan-insight-text');
            if (!container || this.plans.length === 0) return;

            const sorted = [...this.plans].sort((a, b) => {
                if (this.currentSort === 'orders') return (b.orders || 0) - (a.orders || 0);
                if (this.currentSort === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
                return (b.aov || 0) - (a.aov || 0);
            });

            const topPlan = sorted[0];
            if (topPlan && statement) {
                statement.innerHTML = `Top volume SIM package: <strong>${topPlan.product_name}</strong> with <strong>${topPlan.orders} orders</strong> and <strong>${UIController.formatCurrency(topPlan.revenue)}</strong>.`;
            }

            const startIdx = (this.currentPage - 1) * this.pageSize;
            const endIdx = startIdx + this.pageSize;
            const pageData = sorted.slice(startIdx, endIdx);

            let html = '';
            pageData.forEach((p, idx) => {
                const rank = startIdx + idx + 1;
                html += `
                    <div class="plan-card">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:11px;font-weight:800;color:var(--text-dim);width:20px;">#${rank}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;">${p.product_name}</div>
                                <div style="font-size:11px;color:var(--text-dim);">${p.data_limit || 'Standard'} • ${p.validity || 'Pass'}</div>
                            </div>
                        </div>
                        <div style="display:flex;gap:20px;text-align:right;">
                            <div>
                                <div style="font-size:10px;font-weight:800;color:var(--text-dim);">ORDERS</div>
                                <div style="font-size:13px;font-weight:800;">${p.orders || 0}</div>
                            </div>
                            <div>
                                <div style="font-size:10px;font-weight:800;color:var(--text-dim);">REVENUE</div>
                                <div style="font-size:13px;font-weight:800;">${UIController.formatCurrency(p.revenue || 0)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            const indicator = document.getElementById('plan-page-indicator-text');
            if (indicator) {
                indicator.textContent = `Showing ${startIdx + 1}–${Math.min(endIdx, sorted.length)} of ${sorted.length} packages`;
            }

            const prevBtn = document.getElementById('btn-plan-prev');
            const nextBtn = document.getElementById('btn-plan-next');
            const totalPages = Math.ceil(sorted.length / this.pageSize);

            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        }
    };

    /* ============================================================
       9. EMPLOYEE AUDIT TABLE CONTROLLER
       ============================================================ */
    const TableController = {
        employees: [],
        filteredEmployees: [],
        sortKey: 'monthlyRevenue',
        sortOrder: 'desc',
        currentPage: 1,
        pageSize: 10,
        density: 'comfortable',

        init() {
            const searchInput = document.getElementById('table-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    this.filteredEmployees = this.employees.filter(emp => emp.name.toLowerCase().includes(query));
                    this.currentPage = 1;
                    this.render();
                });
            }

            const headers = document.querySelectorAll('.data-table th.sortable');
            headers.forEach(h => {
                h.addEventListener('click', () => {
                    const key = h.dataset.sort;
                    if (this.sortKey === key) {
                        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortKey = key;
                        this.sortOrder = 'desc';
                    }

                    headers.forEach(hdr => {
                        hdr.classList.remove('active-sort');
                        hdr.querySelector('.sort-indicator').textContent = '';
                    });

                    h.classList.add('active-sort');
                    h.querySelector('.sort-indicator').textContent = this.sortOrder === 'asc' ? '↑' : '↓';

                    this.sortData();
                    this.render();
                });
            });

            document.getElementById('btn-density-toggle')?.addEventListener('click', () => {
                this.density = this.density === 'comfortable' ? 'compact' : 'comfortable';
                document.getElementById('density-state-lbl').textContent = this.density.charAt(0).toUpperCase() + this.density.slice(1);
                document.getElementById('main-data-table')?.classList.toggle('compact', this.density === 'compact');
            });

            document.getElementById('table-page-size-select')?.addEventListener('change', (e) => {
                this.pageSize = Number(e.target.value);
                this.currentPage = 1;
                this.render();
            });

            document.getElementById('btn-prev-page')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.render();
                }
            });

            document.getElementById('btn-next-page')?.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredEmployees.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.render();
                }
            });
        },

        updateData(employees) {
            this.employees = Array.isArray(employees) ? employees : [];
            this.filteredEmployees = [...this.employees];
            this.sortData();
            this.render();
        },

        sortData() {
            this.filteredEmployees.sort((a, b) => {
                let valA = a[this.sortKey];
                let valB = b[this.sortKey];

                if (typeof valA === 'string') {
                    return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    return this.sortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
                }
            });
        },

        render() {
            const tbody = document.getElementById('table-tbody');
            const infoEl = document.getElementById('pagination-info');
            const pageIndicator = document.getElementById('page-indicator');
            const prevBtn = document.getElementById('btn-prev-page');
            const nextBtn = document.getElementById('btn-next-page');

            if (!tbody) return;

            if (this.filteredEmployees.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-dim);">No staff records found matching filter criteria</td></tr>`;
                if (infoEl) infoEl.textContent = 'Showing 0 of 0 staff members';
                if (pageIndicator) pageIndicator.textContent = 'Page 0 of 0';
                if (prevBtn) prevBtn.disabled = true;
                if (nextBtn) nextBtn.disabled = true;
                return;
            }

            const startIdx = (this.currentPage - 1) * this.pageSize;
            const endIdx = startIdx + this.pageSize;
            const pageData = this.filteredEmployees.slice(startIdx, endIdx);

            let html = '';
            pageData.forEach((emp, idx) => {
                const rank = startIdx + idx + 1;
                html += `
                    <tr>
                        <td>#${rank}</td>
                        <td><strong>${emp.name}</strong></td>
                        <td class="text-right">${UIController.formatCurrency(emp.monthlyRevenue)}</td>
                        <td class="text-right">${emp.monthlySales}</td>
                        <td class="text-right">${UIController.formatCurrency(emp.todayRevenue)}</td>
                        <td class="text-right">${emp.todaySales}</td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

            const totalPages = Math.ceil(this.filteredEmployees.length / this.pageSize) || 1;
            if (infoEl) infoEl.textContent = `Showing ${startIdx + 1}–${Math.min(endIdx, this.filteredEmployees.length)} of ${this.filteredEmployees.length} staff members`;
            if (pageIndicator) pageIndicator.textContent = `Page ${this.currentPage} of ${totalPages}`;
            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        }
    };

    /* ============================================================
       10. MAIN UI CONTROLLER
       ============================================================ */
    const UIController = {
        asOfDate: '2026-05-20',

        init() {
            this.initDate();
            this.initSettingsModal();

            document.getElementById('btn-refresh')?.addEventListener('click', () => this.refreshData(true));
            document.getElementById('as-of-date-picker')?.addEventListener('change', (e) => {
                this.asOfDate = e.target.value;
                this.refreshData();
            });

            document.getElementById('btn-export-main')?.addEventListener('click', () => this.exportCSV());
        },

        initDate() {
            const dateEl = document.getElementById('current-date');
            if (dateEl) {
                const now = new Date();
                dateEl.textContent = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
            }
        },

        formatCurrency(amt) {
            return `${window.CONFIG.CURRENCY}${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },

        async refreshData(force = false) {
            const refreshBtn = document.getElementById('btn-refresh');
            if (refreshBtn) refreshBtn.querySelector('svg')?.classList.add('spinning');

            try {
                const [dashboardData, destData, planData] = await Promise.all([
                    API.getDashboard(this.asOfDate, force),
                    API.getDestinationSales(this.asOfDate),
                    API.getProductSales(this.asOfDate)
                ]);

                this.renderDashboard(dashboardData);
                DestinationController.updateData(destData);
                PlanController.updateData(planData);

                this.showToast("Telemetry successfully synchronized.");
            } catch (err) {
                console.error("Dashboard sync error:", err);
                this.showToast("Error synchronizing telemetry.", true);
            } finally {
                if (refreshBtn) refreshBtn.querySelector('svg')?.classList.remove('spinning');
            }
        },

        renderDashboard(data) {
            const kpi = data.kpi;
            const emps = data.employees;

            document.getElementById('hero-mtd-revenue').textContent = this.formatCurrency(kpi.mtdRevenue);
            document.getElementById('hero-mtd-sales').textContent = kpi.mtdSales;
            document.getElementById('hero-prev-mtd-sales').textContent = kpi.previousMtdSales;
            document.getElementById('hero-prev-mtd-rev-badge').textContent = Number(kpi.previousMtdRevenue).toLocaleString('en-IN');

            const mtdGrowth = kpi.previousMtdRevenue > 0
                ? (((kpi.mtdRevenue - kpi.previousMtdRevenue) / kpi.previousMtdRevenue) * 100).toFixed(1)
                : '0.0';
            const trendPct = document.getElementById('hero-trend-pct');
            if (trendPct) {
                trendPct.textContent = `${mtdGrowth >= 0 ? '+' : ''}${mtdGrowth}%`;
                trendPct.className = `badge ${mtdGrowth >= 0 ? 'positive' : 'negative'}`;
            }

            document.getElementById('today-revenue').textContent = this.formatCurrency(kpi.todayRevenue);
            document.getElementById('today-sales').textContent = kpi.todaySales;
            document.getElementById('prev-sameday-rev').textContent = Number(kpi.previousSameDayRevenue).toLocaleString('en-IN');
            document.getElementById('prev-sameday-sales').textContent = kpi.previousSameDaySales;

            const todayRevPct = kpi.previousSameDayRevenue > 0
                ? (((kpi.todayRevenue - kpi.previousSameDayRevenue) / kpi.previousSameDayRevenue) * 100).toFixed(1)
                : '0.0';
            const todaySalesPct = kpi.previousSameDaySales > 0
                ? (((kpi.todaySales - kpi.previousSameDaySales) / kpi.previousSameDaySales) * 100).toFixed(1)
                : '0.0';

            const todayRevBadge = document.getElementById('today-rev-pct');
            if (todayRevBadge) {
                todayRevBadge.textContent = `${todayRevPct >= 0 ? '+' : ''}${todayRevPct}%`;
                todayRevBadge.className = `badge ${todayRevPct >= 0 ? 'positive' : 'negative'}`;
            }

            const todaySalesBadge = document.getElementById('today-sales-pct');
            if (todaySalesBadge) {
                todaySalesBadge.textContent = `${todaySalesPct >= 0 ? '+' : ''}${todaySalesPct}%`;
                todaySalesBadge.className = `badge ${todaySalesPct >= 0 ? 'positive' : 'negative'}`;
            }

            BriefingEngine.generateInsights(data);
            ChartCanvas.updateData(data);

            this.renderStaffMatrix(emps, kpi.mtdRevenue);
            this.renderLeaderboard(emps, kpi.mtdRevenue);
            TableController.updateData(emps);
        },

        renderStaffMatrix(emps, totalRev) {
            const container = document.getElementById('matrix-container');
            if (!container) return;

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Staff Member</th>
                            <th style="text-align:right;">Monthly Sales</th>
                            <th style="text-align:right;">Monthly Revenue</th>
                            <th style="text-align:right;">Today Sales</th>
                            <th style="text-align:right;">Today Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            emps.forEach(e => {
                const pct = totalRev > 0 ? ((e.monthlyRevenue / totalRev) * 100).toFixed(1) : '0';
                html += `
                    <tr>
                        <td>
                            <strong>${e.name}</strong>
                            <div class="dest-bar-track" style="margin-top:4px;"><div class="dest-bar-fill" style="width: ${pct}%;"></div></div>
                        </td>
                        <td style="text-align:right;">${e.monthlySales}</td>
                        <td style="text-align:right;">${this.formatCurrency(e.monthlyRevenue)}</td>
                        <td style="text-align:right;">${e.todaySales}</td>
                        <td style="text-align:right;">${this.formatCurrency(e.todayRevenue)}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
        },

        renderLeaderboard(emps, totalRev) {
            const listContainer = document.getElementById('leaderboard-list');
            const distContainer = document.getElementById('distribution-bars');
            if (!listContainer || !distContainer) return;

            const top5 = emps.slice(0, 5);

            let listHtml = '';
            top5.forEach((e, idx) => {
                const rank = idx + 1;
                const pct = totalRev > 0 ? ((e.monthlyRevenue / totalRev) * 100).toFixed(1) : '0';
                listHtml += `
                    <div class="lb-row">
                        <div style="display:flex;align-items:center;">
                            <span style="font-size:12px;font-weight:800;color:var(--text-dim);width:24px;">#${rank}</span>
                            <span style="font-size:13px;font-weight:700;">${e.name}</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:13px;font-weight:800;">${this.formatCurrency(e.monthlyRevenue)}</div>
                            <div style="font-size:11px;color:var(--text-dim);">${e.monthlySales} orders (${pct}%)</div>
                        </div>
                    </div>
                `;
            });
            listContainer.innerHTML = listHtml;

            let distHtml = '';
            top5.forEach(e => {
                const pct = totalRev > 0 ? ((e.monthlyRevenue / totalRev) * 100).toFixed(1) : '0';
                distHtml += `
                    <div>
                        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                            <span style="font-weight:700;">${e.name}</span>
                            <span style="color:var(--text-dim);">${pct}%</span>
                        </div>
                        <div class="dist-track"><div class="dist-fill" style="width: ${pct}%;"></div></div>
                    </div>
                `;
            });
            distContainer.innerHTML = distHtml;
        },

        initSettingsModal() {
            const modal = document.getElementById('settings-modal');
            const openBtn = document.getElementById('btn-open-settings');
            const closeBtn = document.getElementById('btn-close-settings');
            const urlInput = document.getElementById('settings-url-input');
            const keyInput = document.getElementById('settings-key-input');

            const toggleModal = (show) => {
                if (show) {
                    if (urlInput) urlInput.value = window.CONFIG.SUPABASE.URL || '';
                    if (keyInput) keyInput.value = window.CONFIG.SUPABASE.ANON_KEY || '';
                    this.updateSettingsModeButtons();
                }
                modal?.classList.toggle('hidden', !show);
            };

            openBtn?.addEventListener('click', () => toggleModal(true));
            closeBtn?.addEventListener('click', () => toggleModal(false));

            document.getElementById('btn-settings-mode-live')?.addEventListener('click', () => {
                window.CONFIG.USE_DEMO_MODE = false;
                localStorage.setItem('si_demo_mode', 'false');
                this.updateSettingsModeButtons();
            });

            document.getElementById('btn-settings-mode-demo')?.addEventListener('click', () => {
                window.CONFIG.USE_DEMO_MODE = true;
                localStorage.setItem('si_demo_mode', 'true');
                this.updateSettingsModeButtons();
            });

            document.getElementById('btn-test-connection')?.addEventListener('click', async () => {
                const url = document.getElementById('settings-url-input').value;
                const key = document.getElementById('settings-key-input').value;
                const statusEl = document.getElementById('settings-conn-status');
                if (statusEl) statusEl.textContent = '● Testing connection...';

                const res = await API.testConnection(url, key);
                if (statusEl) {
                    statusEl.textContent = res.message;
                    statusEl.style.color = res.success ? 'var(--success)' : 'var(--danger)';
                }
            });

            document.getElementById('btn-save-settings')?.addEventListener('click', () => {
                const url = document.getElementById('settings-url-input').value.trim();
                const key = document.getElementById('settings-key-input').value.trim();

                if (url) {
                    window.CONFIG.SUPABASE.URL = url;
                    localStorage.setItem('si_supabase_url', url);
                }
                if (key) {
                    window.CONFIG.SUPABASE.ANON_KEY = key;
                    localStorage.setItem('si_supabase_anon_key', key);
                }

                toggleModal(false);
                this.refreshData(true);
            });

            document.getElementById('btn-error-demo-mode')?.addEventListener('click', () => {
                window.CONFIG.USE_DEMO_MODE = true;
                localStorage.setItem('si_demo_mode', 'true');
                this.hideApiError();
                this.refreshData(true);
            });

            document.getElementById('btn-error-retry')?.addEventListener('click', () => this.refreshData(true));
        },

        updateSettingsModeButtons() {
            const isDemo = window.CONFIG.USE_DEMO_MODE;
            document.getElementById('btn-settings-mode-live')?.classList.toggle('active', !isDemo);
            document.getElementById('btn-settings-mode-demo')?.classList.toggle('active', isDemo);
            document.getElementById('live-status-text').textContent = isDemo ? '● DEMO MODE' : '● LIVE SUPABASE';
        },

        showApiError(msg, endpoint, status) {
            const card = document.getElementById('api-error-card');
            const msgEl = document.getElementById('api-error-message');
            if (card && msgEl) {
                msgEl.textContent = `${msg} [Endpoint: ${endpoint}] (${status})`;
                card.classList.remove('hidden');
            }
        },

        hideApiError() {
            const card = document.getElementById('api-error-card');
            if (card) card.classList.add('hidden');
        },

        exportCSV() {
            if (!API.cache[this.asOfDate]) return;
            const emps = API.cache[this.asOfDate].employees;

            let csv = 'Rank,Staff Name,Monthly Revenue (INR),Monthly Sales,Today Revenue (INR),Today Sales\n';
            emps.forEach((e, idx) => {
                csv += `${idx + 1},"${e.name}",${e.monthlyRevenue},${e.monthlySales},${e.todayRevenue},${e.todaySales}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', `Travel_SIM_Staff_Sales_${this.asOfDate}.csv`);
            a.click();

            this.showToast("Exported Employee Audit Log CSV.");
        },

        showToast(msg, isError = false) {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = 'toast-item show';
            if (isError) toast.style.backgroundColor = 'var(--danger)';
            toast.textContent = msg;

            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    /* ============================================================
       11. INITIALIZATION ENTRY POINT
       ============================================================ */
    ChartCanvas.init();
    DestinationController.init();
    PlanController.init();
    TableController.init();
    UIController.init();
    UIController.refreshData();
});
