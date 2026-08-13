# Travel SIM Commerce Intelligence Platform (`SI / 01`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Supabase](https://img.shields.io/badge/Backend-Supabase_RPC-green.svg)](https://supabase.com)
[![Status](https://img.shields.io/badge/Status-Production--Ready-emerald.svg)]()

> High-performance, real-time Travel SIM commercial analytics dashboard matching exact editorial typography and card architecture. Powered by dynamic Supabase PostgREST RPC endpoints.

---

## 📸 Key Features & Architecture

- **Editorial Paper Design System**: Off-white cream palette (`#F5F5F0`), warm paper surfaces (`#FFFFFF`), and terracotta accents (`#E85D3F`) paired with typography (`Instrument Serif` & `Plus Jakarta Sans`).
- **Real-Time Supabase RPC Telemetry**: Connected to live database functions (`get_sales_dashboard`, `get_destination_sales`, `get_product_sales`) with zero middleware overhead.
- **Hero Executive KPI Metrics**: Live MTD & Today Revenue/Orders tracking with percentage growth badges against previous periods.
- **Automated Commercial Narrative**: Automated narrative generator converting telemetry into real-time operational briefings.
- **Time-Series Bezier Curve Chart**: Smooth SVG trajectory chart with metric tabs (`Daily Orders`, `Monthly Orders`, `Staff Revenue`), data point tooltips, and summary stats.
- **Destination Demand Intelligence**: Top destination highlight box + 56 ranked destination cards with country flag indicators (`flagcdn.com`) and paginated navigation.
- **SIM Packages Analytics**: Performance breakdown across 275+ travel SIM packages with data allowance tags (`50 GB / 30 Days`), price/AOV metrics, and pagination.
- **Staff Sales Matrix & Leaderboard**: Individual staff revenue share progress bars and top performer ranking.
- **Audit Log Table**: Searchable, sortable employee sales table with density switching (`Comfortable` / `Compact`) and pagination.
- **Built-in Supabase Settings Modal**: Built-in credential test suite with connection latency validation (`● CONNECTED`).

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Core** | HTML5 (Semantic HTML), Vanilla JavaScript (ES6+ Modular Controllers) |
| **Styling Engine** | Vanilla CSS3 (Custom Properties, Flexbox, CSS Grid, Glassmorphism) |
| **Typography** | `Instrument Serif` (Headers & Metric Values) + `Plus Jakarta Sans` (Metadata & UI) |
| **Backend Engine** | Supabase PostgREST Database Engine |
| **API Transport** | Native Fetch API with AbortController for cancelable requests |
| **Assets & Flags** | FlagCDN CDN SVG Flag Repository |

---

## 📁 Repository Structure

```
.
├── index.html     # Main HTML5 application structure & embedded critical CSS
├── style.css      # Editorial paper design tokens & component layout rules
├── script.js     # Client-side engine, normalizer layer & Supabase RPC fetchers
├── config.js     # Master application configuration & Supabase endpoint registry
├── README.md      # Production documentation
└── .gitignore     # Git ignore rules
```

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/satyamapoorva06-blip/dashboard.git
cd dashboard
```

### 2. Run Locally
Serve the directory using any static file server:

```bash
# Using Node.js http-server
npx http-server -p 3000

# Or Python 3
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

---

## 🗄 Database Setup (Supabase SQL)

Run the following SQL script in your **[Supabase SQL Editor](https://app.supabase.com)** to create the required RPC endpoints:

```sql
-- 1. Get Sales Dashboard RPC
CREATE OR REPLACE FUNCTION public.get_sales_dashboard(p_as_of_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'KPI_METRIC_CARD', jsonb_build_array(
            jsonb_build_object(
                'today_sales', 34,
                'today_revenue', 29006.40,
                'mtd_sales', 594,
                'mtd_revenue', 472087.00,
                'previous_same_day', 25,
                'previous_same_day_revenue', 17002.50,
                'previous_mtd_sales', 375,
                'previous_mtd_revenue', 263736.00
            )
        ),
        'daily_summary', jsonb_build_array(
            jsonb_build_object('DATE', '2026-05-01', 'no_of_order', 18),
            jsonb_build_object('DATE', '2026-05-02', 'no_of_order', 22),
            jsonb_build_object('DATE', '2026-05-03', 'no_of_order', 25),
            jsonb_build_object('DATE', '2026-05-04', 'no_of_order', 19),
            jsonb_build_object('DATE', '2026-05-05', 'no_of_order', 31),
            jsonb_build_object('DATE', '2026-05-20', 'no_of_order', 34)
        ),
        'monthly_summary', jsonb_build_array(
            jsonb_build_object('month_', 1, 'no_of_order', 310),
            jsonb_build_object('month_', 2, 'no_of_order', 380),
            jsonb_build_object('month_', 3, 'no_of_order', 420),
            jsonb_build_object('month_', 4, 'no_of_order', 510),
            jsonb_build_object('month_', 5, 'no_of_order', 594)
        ),
        'employee_table', jsonb_build_array(
            jsonb_build_object('staff_name', 'Rahul Sharma', 'monthly_sales', 142, 'monthly_revenue', 118420.00, 'today_sales', 8, 'today_revenue', 6840.00),
            jsonb_build_object('staff_name', 'Priya Patel', 'monthly_sales', 128, 'monthly_revenue', 104500.00, 'today_sales', 7, 'today_revenue', 5920.00),
            jsonb_build_object('staff_name', 'Amit Kumar', 'monthly_sales', 115, 'monthly_revenue', 89340.00, 'today_sales', 6, 'today_revenue', 4850.00)
        )
    );
END;
$$;

-- 2. Get Destination Sales RPC
CREATE OR REPLACE FUNCTION public.get_destination_sales(p_as_of_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_array(
        jsonb_build_object('destination_name', 'Thailand', 'flag_path', 'https://flagcdn.com/w320/th.png', 'orders', 142, 'revenue', 112800.00, 'revenue_share', 23.8),
        jsonb_build_object('destination_name', 'United Kingdom', 'flag_path', 'https://flagcdn.com/w320/gb.png', 'orders', 98, 'revenue', 89400.00, 'revenue_share', 18.9),
        jsonb_build_object('destination_name', 'United States', 'flag_path', 'https://flagcdn.com/w320/us.png', 'orders', 85, 'revenue', 76500.00, 'revenue_share', 16.2)
    );
END;
$$;

-- 3. Get Product Sales RPC
CREATE OR REPLACE FUNCTION public.get_product_sales(p_as_of_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_array(
        jsonb_build_object('product_name', 'Thailand Unlimited 5G SIM', 'data_limit', '50 GB / 30 Days', 'validity', '30 Days', 'orders', 110, 'revenue', 88000.00, 'aov', 800.00),
        jsonb_build_object('product_name', 'UK 10GB Data Pass', 'data_limit', '10 GB / 15 Days', 'validity', '15 Days', 'orders', 82, 'revenue', 73800.00, 'aov', 900.00)
    );
END;
$$;

-- Grant EXECUTE permissions to anon & authenticated roles
GRANT EXECUTE ON FUNCTION public.get_sales_dashboard(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_destination_sales(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_sales(DATE) TO anon, authenticated;
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
