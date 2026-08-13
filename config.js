/**
 * Travel SIM Commerce Intelligence — Master Configuration
 */

window.CONFIG = {
    APP_NAME: "Travel SIM Commerce Intelligence",
    APP_CODE: "SI / 01",
    CURRENCY: "₹",
    DEFAULT_AS_OF_DATE: "2026-05-20",
    DEFAULT_THEME: "cream",
    
    // User Provided Supabase Credentials
    SUPABASE: {
        URL: "https://qjnqbkcvfowgylhnnrja.supabase.co",
        ANON_KEY: "sb_publishable_jHBClLfFjDc8nmZXT58tkg_rnfaWWxs"
    },

    // RPC API Endpoints
    ENDPOINTS: {
        DASHBOARD: "/rest/v1/rpc/get_sales_dashboard",
        DESTINATIONS: "/rest/v1/rpc/get_destination_sales",
        PRODUCTS: "/rest/v1/rpc/get_product_sales"
    },

    USE_DEMO_MODE: false,
    DEBUG_MODE: false,

    // High-Fidelity Fallback Demo Data
    DEMO_CONFIG: {
        KPI_METRIC_CARD: [{
            today_sales: 34,
            today_revenue: 29006.40,
            mtd_sales: 594,
            mtd_revenue: 472087.00,
            previous_same_day: 25,
            previous_same_day_revenue: 17002.50,
            previous_mtd_sales: 375,
            previous_mtd_revenue: 263736.00
        }],
        daily_summary: [
            { DATE: "2026-05-01", no_of_order: 18 },
            { DATE: "2026-05-02", no_of_order: 22 },
            { DATE: "2026-05-03", no_of_order: 25 },
            { DATE: "2026-05-04", no_of_order: 19 },
            { DATE: "2026-05-05", no_of_order: 31 },
            { DATE: "2026-05-06", no_of_order: 28 },
            { DATE: "2026-05-07", no_of_order: 35 },
            { DATE: "2026-05-08", no_of_order: 40 },
            { DATE: "2026-05-09", no_of_order: 38 },
            { DATE: "2026-05-10", no_of_order: 42 },
            { DATE: "2026-05-11", no_of_order: 29 },
            { DATE: "2026-05-12", no_of_order: 33 },
            { DATE: "2026-05-13", no_of_order: 36 },
            { DATE: "2026-05-14", no_of_order: 45 },
            { DATE: "2026-05-15", no_of_order: 50 },
            { DATE: "2026-05-16", no_of_order: 48 },
            { DATE: "2026-05-17", no_of_order: 52 },
            { DATE: "2026-05-18", no_of_order: 41 },
            { DATE: "2026-05-19", no_of_order: 39 },
            { DATE: "2026-05-20", no_of_order: 34 }
        ],
        monthly_summary: [
            { month_: 1, no_of_order: 310 },
            { month_: 2, no_of_order: 380 },
            { month_: 3, no_of_order: 420 },
            { month_: 4, no_of_order: 510 },
            { month_: 5, no_of_order: 594 }
        ],
        employee_table: [
            { staff_name: "Rahul Sharma", monthly_sales: 142, monthly_revenue: 118420.00, today_sales: 8, today_revenue: 6840.00 },
            { staff_name: "Priya Patel", monthly_sales: 128, monthly_revenue: 104500.00, today_sales: 7, today_revenue: 5920.00 },
            { staff_name: "Amit Kumar", monthly_sales: 115, monthly_revenue: 89340.00, today_sales: 6, today_revenue: 4850.00 },
            { staff_name: "Sneha Reddy", monthly_sales: 98, monthly_revenue: 76210.00, today_sales: 5, today_revenue: 4100.00 },
            { staff_name: "Vikram Singh", monthly_sales: 75, monthly_revenue: 58617.00, today_sales: 4, today_revenue: 3500.00 },
            { staff_name: "Ananya Gupta", monthly_sales: 36, monthly_revenue: 25000.00, today_sales: 4, today_revenue: 3796.40 }
        ],
        destination_sales: [
            { destination_name: "Thailand", flag_path: "https://flagcdn.com/w320/th.png", orders: 142, revenue: 112800.00, revenue_share: 23.8, order_share: 23.9 },
            { destination_name: "United Kingdom", flag_path: "https://flagcdn.com/w320/gb.png", orders: 98, revenue: 89400.00, revenue_share: 18.9, order_share: 16.5 },
            { destination_name: "United States", flag_path: "https://flagcdn.com/w320/us.png", orders: 85, revenue: 76500.00, revenue_share: 16.2, order_share: 14.3 },
            { destination_name: "Europe eSIM (33 Countries)", flag_path: "https://flagcdn.com/w320/eu.png", orders: 74, revenue: 68900.00, revenue_share: 14.5, order_share: 12.4 },
            { destination_name: "Dubai (UAE)", flag_path: "https://flagcdn.com/w320/ae.png", orders: 62, revenue: 49600.00, revenue_share: 10.5, order_share: 10.4 },
            { destination_name: "Singapore", flag_path: "https://flagcdn.com/w320/sg.png", orders: 51, revenue: 38200.00, revenue_share: 8.0, order_share: 8.5 },
            { destination_name: "Japan", flag_path: "https://flagcdn.com/w320/jp.png", orders: 45, revenue: 36687.00, revenue_share: 7.7, order_share: 7.5 }
        ],
        product_sales: [
            { product_name: "Thailand Unlimited 5G SIM", data_limit: "50 GB / 30 Days", validity: "30 Days", orders: 110, revenue: 88000.00, aov: 800.00, revenue_share: 18.6 },
            { product_name: "UK 10GB Data Pass", data_limit: "10 GB / 15 Days", validity: "15 Days", orders: 82, revenue: 73800.00, aov: 900.00, revenue_share: 15.6 },
            { product_name: "USA 20GB High-Speed", data_limit: "20 GB / 30 Days", validity: "30 Days", orders: 70, revenue: 63000.00, aov: 900.00, revenue_share: 13.3 },
            { product_name: "Europe Regional Unlimited", data_limit: "Unlimited / 14 Days", validity: "14 Days", orders: 65, revenue: 58500.00, aov: 900.00, revenue_share: 12.3 },
            { product_name: "Dubai 5GB QuickSIM", data_limit: "5 GB / 7 Days", validity: "7 Days", orders: 55, revenue: 44000.00, aov: 800.00, revenue_share: 9.3 },
            { product_name: "Japan 10GB 5G eSIM", data_limit: "10 GB / 15 Days", validity: "15 Days", orders: 40, revenue: 36000.00, aov: 900.00, revenue_share: 7.6 }
        ]
    }
};
