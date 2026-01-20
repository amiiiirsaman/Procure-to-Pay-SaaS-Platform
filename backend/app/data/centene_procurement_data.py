"""
Centene Procurement Dataset
===========================
Master data for enterprise procurement simulation including:
- Approved vendors/suppliers with risk scores
- Department budgets for FY2026
- Cost center and GL account mappings
- Approval flag rules
"""

from enum import Enum
from typing import Dict, List, Any, Optional


# =============================================================================
# ENUMS
# =============================================================================

class VendorStatus(str, Enum):
    PREFERRED = "preferred"
    KNOWN = "known"
    NEW = "new"


class SpendType(str, Enum):
    OPEX = "OPEX"
    CAPEX = "CAPEX"
    INVENTORY = "INVENTORY"


# =============================================================================
# DEPARTMENT BUDGETS - FY2026
# =============================================================================

DEPARTMENT_BUDGETS: Dict[str, Dict[str, Any]] = {
    "IT": {
        "Q1": {"allocated": 500000, "spent": 125000, "remaining": 375000},
        "Q2": {"allocated": 450000, "spent": 0, "remaining": 450000},
        "Q3": {"allocated": 400000, "spent": 0, "remaining": 400000},
        "Q4": {"allocated": 650000, "spent": 0, "remaining": 650000},
        "annual_total": 2000000,
    },
    "Finance": {
        "Q1": {"allocated": 250000, "spent": 75000, "remaining": 175000},
        "Q2": {"allocated": 200000, "spent": 0, "remaining": 200000},
        "Q3": {"allocated": 200000, "spent": 0, "remaining": 200000},
        "Q4": {"allocated": 350000, "spent": 0, "remaining": 350000},
        "annual_total": 1000000,
    },
    "Operations": {
        "Q1": {"allocated": 400000, "spent": 95000, "remaining": 305000},
        "Q2": {"allocated": 350000, "spent": 0, "remaining": 350000},
        "Q3": {"allocated": 350000, "spent": 0, "remaining": 350000},
        "Q4": {"allocated": 400000, "spent": 0, "remaining": 400000},
        "annual_total": 1500000,
    },
    "HR": {
        "Q1": {"allocated": 150000, "spent": 35000, "remaining": 115000},
        "Q2": {"allocated": 125000, "spent": 0, "remaining": 125000},
        "Q3": {"allocated": 125000, "spent": 0, "remaining": 125000},
        "Q4": {"allocated": 200000, "spent": 0, "remaining": 200000},
        "annual_total": 600000,
    },
    "Marketing": {
        "Q1": {"allocated": 300000, "spent": 85000, "remaining": 215000},
        "Q2": {"allocated": 250000, "spent": 0, "remaining": 250000},
        "Q3": {"allocated": 200000, "spent": 0, "remaining": 200000},
        "Q4": {"allocated": 250000, "spent": 0, "remaining": 250000},
        "annual_total": 1000000,
    },
    "Facilities": {
        "Q1": {"allocated": 200000, "spent": 45000, "remaining": 155000},
        "Q2": {"allocated": 175000, "spent": 0, "remaining": 175000},
        "Q3": {"allocated": 175000, "spent": 0, "remaining": 175000},
        "Q4": {"allocated": 250000, "spent": 0, "remaining": 250000},
        "annual_total": 800000,
    },
}


# =============================================================================
# SUPPLIERS/VENDORS MASTER LIST
# =============================================================================

SUPPLIERS: List[Dict[str, Any]] = [
    # =========================================================================
    # IT DEPARTMENT
    # =========================================================================
    # Software
    {"name": "Microsoft", "department": "IT", "category": "Software", "risk_score": 15, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "OPEX"},
    {"name": "ServiceNow", "department": "IT", "category": "Software", "risk_score": 35, "status": "known", "contract_active": True, "contract_end_date": "2026-09-30", "spend_type": "OPEX"},
    {"name": "Freshworks", "department": "IT", "category": "Software", "risk_score": 72, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Hardware
    {"name": "Dell Technologies", "department": "IT", "category": "Hardware", "risk_score": 18, "status": "preferred", "contract_active": True, "contract_end_date": "2027-06-30", "spend_type": "CAPEX"},
    {"name": "Lenovo", "department": "IT", "category": "Hardware", "risk_score": 40, "status": "known", "contract_active": True, "contract_end_date": "2026-12-31", "spend_type": "CAPEX"},
    {"name": "Framework Computer", "department": "IT", "category": "Hardware", "risk_score": 78, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "CAPEX"},
    # Cloud Services
    {"name": "Amazon Web Services", "department": "IT", "category": "Cloud Services", "risk_score": 12, "status": "preferred", "contract_active": True, "contract_end_date": "2028-03-31", "spend_type": "OPEX"},
    {"name": "Google Cloud", "department": "IT", "category": "Cloud Services", "risk_score": 28, "status": "known", "contract_active": True, "contract_end_date": "2026-11-30", "spend_type": "OPEX"},
    {"name": "DigitalOcean", "department": "IT", "category": "Cloud Services", "risk_score": 65, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Security
    {"name": "CrowdStrike", "department": "IT", "category": "Security", "risk_score": 20, "status": "preferred", "contract_active": True, "contract_end_date": "2027-03-31", "spend_type": "OPEX"},
    {"name": "Palo Alto Networks", "department": "IT", "category": "Security", "risk_score": 32, "status": "known", "contract_active": True, "contract_end_date": "2026-08-31", "spend_type": "OPEX"},
    {"name": "SentinelOne", "department": "IT", "category": "Security", "risk_score": 58, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Professional Services
    {"name": "Accenture", "department": "IT", "category": "Professional Services", "risk_score": 15, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "OPEX"},
    {"name": "Deloitte Digital", "department": "IT", "category": "Professional Services", "risk_score": 30, "status": "known", "contract_active": True, "contract_end_date": "2026-10-31", "spend_type": "OPEX"},
    {"name": "Slalom Consulting", "department": "IT", "category": "Professional Services", "risk_score": 55, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},

    # =========================================================================
    # FINANCE DEPARTMENT
    # =========================================================================
    # Software
    {"name": "SAP", "department": "Finance", "category": "Software", "risk_score": 14, "status": "preferred", "contract_active": True, "contract_end_date": "2028-06-30", "spend_type": "OPEX"},
    {"name": "Oracle NetSuite", "department": "Finance", "category": "Software", "risk_score": 32, "status": "known", "contract_active": True, "contract_end_date": "2026-12-31", "spend_type": "OPEX"},
    {"name": "Sage Intacct", "department": "Finance", "category": "Software", "risk_score": 62, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Professional Services
    {"name": "KPMG", "department": "Finance", "category": "Professional Services", "risk_score": 12, "status": "preferred", "contract_active": True, "contract_end_date": "2027-09-30", "spend_type": "OPEX"},
    {"name": "EY", "department": "Finance", "category": "Professional Services", "risk_score": 25, "status": "known", "contract_active": True, "contract_end_date": "2026-06-30", "spend_type": "OPEX"},
    {"name": "BDO USA", "department": "Finance", "category": "Professional Services", "risk_score": 55, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Audit Services
    {"name": "Deloitte", "department": "Finance", "category": "Audit Services", "risk_score": 10, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "OPEX"},
    {"name": "PwC", "department": "Finance", "category": "Audit Services", "risk_score": 22, "status": "known", "contract_active": True, "contract_end_date": "2026-09-30", "spend_type": "OPEX"},
    {"name": "Grant Thornton", "department": "Finance", "category": "Audit Services", "risk_score": 48, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Tax Services
    {"name": "KPMG Tax", "department": "Finance", "category": "Tax Services", "risk_score": 15, "status": "preferred", "contract_active": True, "contract_end_date": "2027-06-30", "spend_type": "OPEX"},
    {"name": "RSM US", "department": "Finance", "category": "Tax Services", "risk_score": 38, "status": "known", "contract_active": True, "contract_end_date": "2026-11-30", "spend_type": "OPEX"},
    {"name": "Moss Adams", "department": "Finance", "category": "Tax Services", "risk_score": 60, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},

    # =========================================================================
    # OPERATIONS DEPARTMENT
    # =========================================================================
    # Equipment
    {"name": "Caterpillar", "department": "Operations", "category": "Equipment", "risk_score": 18, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "CAPEX"},
    {"name": "Toyota Material Handling", "department": "Operations", "category": "Equipment", "risk_score": 35, "status": "known", "contract_active": True, "contract_end_date": "2026-08-31", "spend_type": "CAPEX"},
    {"name": "Hyster-Yale", "department": "Operations", "category": "Equipment", "risk_score": 68, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "CAPEX"},
    # Logistics
    {"name": "FedEx", "department": "Operations", "category": "Logistics", "risk_score": 12, "status": "preferred", "contract_active": True, "contract_end_date": "2028-03-31", "spend_type": "OPEX"},
    {"name": "UPS", "department": "Operations", "category": "Logistics", "risk_score": 25, "status": "known", "contract_active": True, "contract_end_date": "2026-12-31", "spend_type": "OPEX"},
    {"name": "DHL Supply Chain", "department": "Operations", "category": "Logistics", "risk_score": 52, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Supplies
    {"name": "Grainger", "department": "Operations", "category": "Supplies", "risk_score": 15, "status": "preferred", "contract_active": True, "contract_end_date": "2027-06-30", "spend_type": "INVENTORY"},
    {"name": "Fastenal", "department": "Operations", "category": "Supplies", "risk_score": 30, "status": "known", "contract_active": True, "contract_end_date": "2026-10-31", "spend_type": "INVENTORY"},
    {"name": "Uline", "department": "Operations", "category": "Supplies", "risk_score": 45, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "INVENTORY"},
    # Warehouse Systems
    {"name": "Manhattan Associates", "department": "Operations", "category": "Warehouse Systems", "risk_score": 20, "status": "preferred", "contract_active": True, "contract_end_date": "2027-09-30", "spend_type": "OPEX"},
    {"name": "Blue Yonder", "department": "Operations", "category": "Warehouse Systems", "risk_score": 38, "status": "known", "contract_active": True, "contract_end_date": "2026-07-31", "spend_type": "OPEX"},
    {"name": "Korber", "department": "Operations", "category": "Warehouse Systems", "risk_score": 70, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},

    # =========================================================================
    # HR DEPARTMENT
    # =========================================================================
    # Software
    {"name": "Workday", "department": "HR", "category": "Software", "risk_score": 12, "status": "preferred", "contract_active": True, "contract_end_date": "2028-03-31", "spend_type": "OPEX"},
    {"name": "ADP", "department": "HR", "category": "Software", "risk_score": 28, "status": "known", "contract_active": True, "contract_end_date": "2026-12-31", "spend_type": "OPEX"},
    {"name": "Paylocity", "department": "HR", "category": "Software", "risk_score": 55, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Training
    {"name": "LinkedIn Learning", "department": "HR", "category": "Training", "risk_score": 18, "status": "preferred", "contract_active": True, "contract_end_date": "2027-06-30", "spend_type": "OPEX"},
    {"name": "Coursera for Business", "department": "HR", "category": "Training", "risk_score": 35, "status": "known", "contract_active": True, "contract_end_date": "2026-09-30", "spend_type": "OPEX"},
    {"name": "Udemy Business", "department": "HR", "category": "Training", "risk_score": 58, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Recruiting
    {"name": "Indeed", "department": "HR", "category": "Recruiting", "risk_score": 20, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "OPEX"},
    {"name": "LinkedIn Talent", "department": "HR", "category": "Recruiting", "risk_score": 30, "status": "known", "contract_active": True, "contract_end_date": "2026-11-30", "spend_type": "OPEX"},
    {"name": "ZipRecruiter", "department": "HR", "category": "Recruiting", "risk_score": 62, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Benefits
    {"name": "Mercer", "department": "HR", "category": "Benefits", "risk_score": 15, "status": "preferred", "contract_active": True, "contract_end_date": "2027-09-30", "spend_type": "OPEX"},
    {"name": "Willis Towers Watson", "department": "HR", "category": "Benefits", "risk_score": 32, "status": "known", "contract_active": True, "contract_end_date": "2026-08-31", "spend_type": "OPEX"},
    {"name": "Benefitfocus", "department": "HR", "category": "Benefits", "risk_score": 65, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},

    # =========================================================================
    # MARKETING DEPARTMENT
    # =========================================================================
    # Software
    {"name": "Salesforce Marketing Cloud", "department": "Marketing", "category": "Software", "risk_score": 14, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "OPEX"},
    {"name": "HubSpot", "department": "Marketing", "category": "Software", "risk_score": 30, "status": "known", "contract_active": True, "contract_end_date": "2026-10-31", "spend_type": "OPEX"},
    {"name": "Mailchimp", "department": "Marketing", "category": "Software", "risk_score": 52, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Advertising
    {"name": "Google Ads", "department": "Marketing", "category": "Advertising", "risk_score": 10, "status": "preferred", "contract_active": True, "contract_end_date": "2028-12-31", "spend_type": "OPEX"},
    {"name": "Meta Ads", "department": "Marketing", "category": "Advertising", "risk_score": 25, "status": "known", "contract_active": True, "contract_end_date": "2026-12-31", "spend_type": "OPEX"},
    {"name": "TikTok for Business", "department": "Marketing", "category": "Advertising", "risk_score": 68, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Creative Services
    {"name": "WPP", "department": "Marketing", "category": "Creative Services", "risk_score": 18, "status": "preferred", "contract_active": True, "contract_end_date": "2027-06-30", "spend_type": "OPEX"},
    {"name": "Omnicom Group", "department": "Marketing", "category": "Creative Services", "risk_score": 35, "status": "known", "contract_active": True, "contract_end_date": "2026-09-30", "spend_type": "OPEX"},
    {"name": "Dentsu Creative", "department": "Marketing", "category": "Creative Services", "risk_score": 58, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Events
    {"name": "Freeman", "department": "Marketing", "category": "Events", "risk_score": 22, "status": "preferred", "contract_active": True, "contract_end_date": "2027-03-31", "spend_type": "OPEX"},
    {"name": "Cvent", "department": "Marketing", "category": "Events", "risk_score": 38, "status": "known", "contract_active": True, "contract_end_date": "2026-08-31", "spend_type": "OPEX"},
    {"name": "Bizzabo", "department": "Marketing", "category": "Events", "risk_score": 72, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},

    # =========================================================================
    # FACILITIES DEPARTMENT
    # =========================================================================
    # Equipment
    {"name": "Johnson Controls", "department": "Facilities", "category": "Equipment", "risk_score": 15, "status": "preferred", "contract_active": True, "contract_end_date": "2027-12-31", "spend_type": "CAPEX"},
    {"name": "Carrier", "department": "Facilities", "category": "Equipment", "risk_score": 32, "status": "known", "contract_active": True, "contract_end_date": "2026-11-30", "spend_type": "CAPEX"},
    {"name": "Trane Technologies", "department": "Facilities", "category": "Equipment", "risk_score": 55, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "CAPEX"},
    # Maintenance
    {"name": "ABM Industries", "department": "Facilities", "category": "Maintenance", "risk_score": 18, "status": "preferred", "contract_active": True, "contract_end_date": "2027-06-30", "spend_type": "OPEX"},
    {"name": "CBRE", "department": "Facilities", "category": "Maintenance", "risk_score": 30, "status": "known", "contract_active": True, "contract_end_date": "2026-09-30", "spend_type": "OPEX"},
    {"name": "Cushman & Wakefield", "department": "Facilities", "category": "Maintenance", "risk_score": 48, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
    # Construction
    {"name": "Turner Construction", "department": "Facilities", "category": "Construction", "risk_score": 12, "status": "preferred", "contract_active": True, "contract_end_date": "2028-03-31", "spend_type": "CAPEX"},
    {"name": "AECOM", "department": "Facilities", "category": "Construction", "risk_score": 28, "status": "known", "contract_active": True, "contract_end_date": "2026-12-31", "spend_type": "CAPEX"},
    {"name": "Skanska USA", "department": "Facilities", "category": "Construction", "risk_score": 52, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "CAPEX"},
    # Security Services
    {"name": "Allied Universal", "department": "Facilities", "category": "Security Services", "risk_score": 20, "status": "preferred", "contract_active": True, "contract_end_date": "2027-09-30", "spend_type": "OPEX"},
    {"name": "Securitas", "department": "Facilities", "category": "Security Services", "risk_score": 35, "status": "known", "contract_active": True, "contract_end_date": "2026-10-31", "spend_type": "OPEX"},
    {"name": "Prosegur", "department": "Facilities", "category": "Security Services", "risk_score": 65, "status": "new", "contract_active": False, "contract_end_date": None, "spend_type": "OPEX"},
]


# =============================================================================
# COST CENTER & GL ACCOUNT MAPPINGS
# =============================================================================

COST_CENTER_MAPPING: Dict[str, str] = {
    "IT": "CC-1000-IT",
    "Finance": "CC-2000-FIN",
    "Operations": "CC-3000-OPS",
    "HR": "CC-4000-HR",
    "Marketing": "CC-5000-MKT",
    "Facilities": "CC-6000-FAC",
    "Legal": "CC-7000-LEG",
    "Engineering": "CC-8000-ENG",
    "Sales": "CC-9000-SAL",
    "R&D": "CC-8500-RND",
}

GL_ACCOUNT_MAPPING: Dict[str, Dict[str, str]] = {
    "IT": {
        "Software": "6100-SW",
        "Hardware": "6200-HW",
        "Cloud Services": "6350-CLD",
        "Security": "6150-SEC",
        "Professional Services": "6300-PRO",
    },
    "Finance": {
        "Software": "6100-SW",
        "Professional Services": "6300-PRO",
        "Audit Services": "6310-AUD",
        "Tax Services": "6320-TAX",
    },
    "Operations": {
        "Equipment": "6400-EQP",
        "Logistics": "6500-LOG",
        "Supplies": "6450-SUP",
        "Warehouse Systems": "6100-SW",
    },
    "HR": {
        "Software": "6100-SW",
        "Training": "6600-TRN",
        "Recruiting": "6650-REC",
        "Benefits": "6700-BEN",
    },
    "Marketing": {
        "Software": "6100-SW",
        "Advertising": "6800-ADV",
        "Creative Services": "6850-CRE",
        "Events": "6900-EVT",
    },
    "Facilities": {
        "Equipment": "6400-EQP",
        "Maintenance": "7000-MNT",
        "Construction": "7100-CON",
        "Security Services": "7200-SEC",
    },
    "Legal": {
        "Software": "6100-SW",
        "Professional Services": "6300-PRO",
        "Compliance": "7300-CMP",
        "Contract Management": "7350-CTR",
    },
    "Engineering": {
        "Software": "6100-SW",
        "Hardware": "6200-HW",
        "Equipment": "6400-EQP",
        "Professional Services": "6300-PRO",
    },
    "Sales": {
        "Software": "6100-SW",
        "CRM Tools": "6180-CRM",
        "Marketing Materials": "6850-MKT",
        "Travel & Entertainment": "7400-TRV",
    },
    "R&D": {
        "Software": "6100-SW",
        "Equipment": "6400-EQP",
        "Research Materials": "7500-RES",
        "Professional Services": "6300-PRO",
    },
}


# =============================================================================
# DEPARTMENT CATEGORIES
# =============================================================================

DEPARTMENT_CATEGORIES: Dict[str, List[str]] = {
    "IT": ["Software", "Hardware", "Cloud Services", "Security", "Professional Services"],
    "Finance": ["Software", "Professional Services", "Audit Services", "Tax Services"],
    "Operations": ["Equipment", "Logistics", "Supplies", "Warehouse Systems"],
    "HR": ["Software", "Training", "Recruiting", "Benefits"],
    "Marketing": ["Software", "Advertising", "Creative Services", "Events"],
    "Facilities": ["Equipment", "Maintenance", "Construction", "Security Services"],
    "Legal": ["Software", "Professional Services", "Compliance", "Contract Management"],
    "Engineering": ["Software", "Hardware", "Equipment", "Professional Services"],
    "Sales": ["Software", "CRM Tools", "Marketing Materials", "Travel & Entertainment"],
    "R&D": ["Software", "Equipment", "Research Materials", "Professional Services"],
}


# =============================================================================
# APPROVAL FLAG RULES
# =============================================================================

FLAG_RULES: List[Dict[str, Any]] = [
    {
        "id": "high_amount",
        "name": "High-Value Requisition",
        "condition": "amount > 10000",
        "threshold": 10000,
        "flag_reason": "High-value requisition (>${amount:,.0f}) requires director review",
        "priority": "medium",
    },
    {
        "id": "executive_amount",
        "name": "Executive Approval Required",
        "condition": "amount > 50000",
        "threshold": 50000,
        "flag_reason": "Executive approval required (VP/CFO) for ${amount:,.0f}",
        "priority": "high",
    },
    {
        "id": "budget_exceeded",
        "name": "Budget Exceeded",
        "condition": "amount > remaining_budget",
        "flag_reason": "Exceeds Q1 budget by ${over_amount:,.0f}",
        "priority": "critical",
    },
    {
        "id": "high_risk_vendor",
        "name": "High-Risk Vendor",
        "condition": "risk_score > 70",
        "threshold": 70,
        "flag_reason": "New/high-risk vendor (score: {risk_score}) requires procurement review",
        "priority": "high",
    },
    {
        "id": "non_preferred_high_value",
        "name": "Non-Preferred Vendor Significant Purchase",
        "condition": "status != 'preferred' and amount > 5000",
        "flag_reason": "Non-preferred vendor for significant purchase (${amount:,.0f})",
        "priority": "medium",
    },
    {
        "id": "no_contract_high_value",
        "name": "No MSA on File",
        "condition": "not contract_active and amount > 25000",
        "threshold": 25000,
        "flag_reason": "No MSA on file for ${amount:,.0f} purchase - legal review required",
        "priority": "high",
    },
    {
        "id": "capex_high_value",
        "name": "CAPEX Finance Approval",
        "condition": "spend_type == 'CAPEX' and amount > 25000",
        "threshold": 25000,
        "flag_reason": "Capital expenditure (${amount:,.0f}) requires Finance approval",
        "priority": "medium",
    },
    {
        "id": "emergency_request",
        "name": "Emergency Request",
        "condition": "urgency == 'EMERGENCY'",
        "flag_reason": "Emergency request - expedited review needed",
        "priority": "high",
    },
    {
        "id": "new_vendor",
        "name": "New Vendor First Purchase",
        "condition": "status == 'new'",
        "flag_reason": "First-time purchase from new vendor '{supplier_name}' requires procurement approval",
        "priority": "medium",
    },
]


# =============================================================================
# APPROVAL THRESHOLDS
# =============================================================================

APPROVAL_THRESHOLDS = {
    "auto_approve": {
        "max_amount": 1000,
        "requires_preferred_vendor": False,
        "requires_contract": False,
        "max_risk_score": 100,  # No restriction for auto-approve amount
    },
    "auto_approve_preferred": {
        "max_amount": 5000,
        "requires_preferred_vendor": True,
        "requires_contract": True,
        "max_risk_score": 40,
    },
    "manager": {
        "min_amount": 1000,
        "max_amount": 10000,
    },
    "director": {
        "min_amount": 10000,
        "max_amount": 50000,
    },
    "vp": {
        "min_amount": 50000,
        "max_amount": 100000,
    },
    "cfo": {
        "min_amount": 100000,
        "max_amount": 500000,
    },
    "ceo": {
        "min_amount": 500000,
        "max_amount": float("inf"),
    },
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def normalize_department(department: str) -> str:
    """Normalize department name to match Centene data format."""
    dept_map = {
        'it': 'IT',
        'hr': 'HR',
        'finance': 'Finance',
        'operations': 'Operations',
        'marketing': 'Marketing',
        'facilities': 'Facilities',
        'legal': 'Legal',
        'engineering': 'Engineering',
        'sales': 'Sales',
        'r&d': 'R&D',
        'rd': 'R&D',
    }
    return dept_map.get(department.lower(), department)


def get_suppliers_by_department(department: str) -> List[Dict[str, Any]]:
    """Get all suppliers for a specific department."""
    normalized_dept = normalize_department(department)
    return [s for s in SUPPLIERS if s["department"] == normalized_dept]


def get_suppliers_by_category(department: str, category: str) -> List[Dict[str, Any]]:
    """Get suppliers for a specific department and category."""
    normalized_dept = normalize_department(department)
    return [
        s for s in SUPPLIERS
        if s["department"] == normalized_dept and s["category"] == category
    ]


def get_supplier_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Get supplier details by name with partial matching and aliases."""
    if not name:
        return None
    name_lower = name.lower().strip()
    
    # Alias mapping for common variations
    aliases = {
        'dell': 'dell technologies',
        'aws': 'amazon web services',
        'hp': 'hp inc',
        'microsoft': 'microsoft',
        'google': 'google cloud',
        'lenovo': 'lenovo',
        'servicenow': 'servicenow',
        'staples': 'staples business advantage',
        'office depot': 'office depot',
    }
    name_lower = aliases.get(name_lower, name_lower)
    
    # First try exact match
    for supplier in SUPPLIERS:
        if supplier["name"].lower() == name_lower:
            return supplier
    
    # Then try partial match (supplier name contains search term)
    for supplier in SUPPLIERS:
        if name_lower in supplier["name"].lower():
            return supplier
    
    return None


def get_cost_center(department: str) -> str:
    """Get cost center for a department."""
    normalized_dept = normalize_department(department)
    return COST_CENTER_MAPPING.get(normalized_dept, "CC-9999-UNK")


def get_gl_account(department: str, category: str) -> str:
    """Get GL account for department and category."""
    normalized_dept = normalize_department(department)
    dept_accounts = GL_ACCOUNT_MAPPING.get(normalized_dept, {})
    return dept_accounts.get(category, "9999-UNK")


def get_department_budget(department: str, quarter: str = "Q1") -> Dict[str, Any]:
    """Get budget info for a department and quarter."""
    normalized_dept = normalize_department(department)
    dept_budget = DEPARTMENT_BUDGETS.get(normalized_dept, {})
    return dept_budget.get(quarter, {"allocated": 0, "spent": 0, "remaining": 0})


def get_categories_for_department(department: str) -> List[str]:
    """Get available categories for a department."""
    normalized_dept = normalize_department(department)
    return DEPARTMENT_CATEGORIES.get(normalized_dept, [])


def evaluate_flag_rules(
    amount: float,
    department: str,
    supplier_name: str,
    urgency: str = "STANDARD",
) -> List[Dict[str, Any]]:
    """
    Evaluate all flag rules for a requisition and return triggered flags.
    """
    triggered_flags = []
    
    # Get supplier info
    supplier = get_supplier_by_name(supplier_name)
    if supplier is None:
        # Unknown vendor - treat as high risk
        supplier = {
            "risk_score": 80,
            "status": "new",
            "contract_active": False,
            "spend_type": "OPEX",
        }
    
    # Get budget info
    budget = get_department_budget(department, "Q1")
    remaining_budget = budget.get("remaining", 0)
    
    risk_score = supplier.get("risk_score", 75)
    status = supplier.get("status", "new")
    contract_active = supplier.get("contract_active", False)
    spend_type = supplier.get("spend_type", "OPEX")
    
    # Check each rule
    for rule in FLAG_RULES:
        rule_id = rule["id"]
        triggered = False
        
        if rule_id == "high_amount" and amount > 10000:
            triggered = True
        elif rule_id == "executive_amount" and amount > 50000:
            triggered = True
        elif rule_id == "budget_exceeded" and amount > remaining_budget:
            triggered = True
        elif rule_id == "high_risk_vendor" and risk_score > 70:
            triggered = True
        elif rule_id == "non_preferred_high_value" and status != "preferred" and amount > 5000:
            triggered = True
        elif rule_id == "no_contract_high_value" and not contract_active and amount > 25000:
            triggered = True
        elif rule_id == "capex_high_value" and spend_type == "CAPEX" and amount > 25000:
            triggered = True
        elif rule_id == "emergency_request" and urgency.upper() == "EMERGENCY":
            triggered = True
        elif rule_id == "new_vendor" and status == "new":
            triggered = True
        
        if triggered:
            # Format the flag reason
            over_amount = max(0, amount - remaining_budget)
            reason = rule["flag_reason"].format(
                amount=amount,
                over_amount=over_amount,
                risk_score=risk_score,
                supplier_name=supplier_name,
            )
            triggered_flags.append({
                "rule_id": rule_id,
                "rule_name": rule["name"],
                "reason": reason,
                "priority": rule["priority"],
            })
    
    return triggered_flags


def check_auto_approve(
    amount: float,
    supplier_name: str,
    department: str,
) -> tuple[bool, str]:
    """
    Check if a requisition can be auto-approved.
    Returns (can_auto_approve, reason)
    """
    # Get supplier info
    supplier = get_supplier_by_name(supplier_name)
    
    # Unknown vendor cannot be auto-approved
    if supplier is None:
        return False, "Unknown vendor requires procurement review"
    
    # Get budget info
    budget = get_department_budget(department, "Q1")
    remaining_budget = budget.get("remaining", 0)
    
    # Check budget
    if amount > remaining_budget:
        return False, f"Exceeds remaining budget (${remaining_budget:,.0f})"
    
    risk_score = supplier.get("risk_score", 75)
    status = supplier.get("status", "new")
    contract_active = supplier.get("contract_active", False)
    
    # Tier 1: Any vendor, amount <= $1,000
    if amount <= 1000:
        return True, "Auto-approved: Amount under $1,000 threshold"
    
    # Tier 2: Preferred vendor with contract, amount <= $5,000, low risk
    if (
        amount <= 5000
        and status == "preferred"
        and contract_active
        and risk_score <= 40
    ):
        return True, "Auto-approved: Preferred vendor with active contract"
    
    # Cannot auto-approve
    if status == "new":
        return False, "New vendor requires procurement approval"
    if risk_score > 40:
        return False, f"Vendor risk score ({risk_score}) requires review"
    if not contract_active and amount > 2500:
        return False, "No active contract for significant purchase"
    
    return False, f"Amount (${amount:,.0f}) exceeds auto-approval threshold"
