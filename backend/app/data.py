"""
Data helpers for P2P SaaS Platform - supplier, budget, and approval logic.
"""
from typing import Optional, Dict, Any, List


# ============= Supplier Data =============
SUPPLIERS_DATABASE = {
    "Apple Store": {
        "risk_score": 15,
        "status": "approved",
        "spend_type": "CAPEX",
        "contract_end_date": "2027-12-31",
    },
    "Dell Technologies": {
        "risk_score": 20,
        "status": "approved",
        "spend_type": "CAPEX",
        "contract_end_date": "2027-06-30",
    },
    "Microsoft Corporation": {
        "risk_score": 10,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2028-12-31",
    },
    "Staples Inc": {
        "risk_score": 25,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2027-03-31",
    },
    "Accenture": {
        "risk_score": 30,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2027-12-31",
    },
    "RR Donnelley": {
        "risk_score": 35,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2026-12-31",
    },
    "Amazon Web Services": {
        "risk_score": 15,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2028-12-31",
    },
    "CBRE Group": {
        "risk_score": 40,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2027-12-31",
    },
    "LinkedIn Learning": {
        "risk_score": 20,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2026-06-30",
    },
    "Deloitte": {
        "risk_score": 25,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2027-12-31",
    },
    "ABM Industries": {
        "risk_score": 45,
        "status": "approved",
        "spend_type": "OPEX",
        "contract_end_date": "2027-03-31",
    },
}

# ============= Department Cost Centers =============
COST_CENTERS = {
    "MARKETING": "CC-4001",
    "FINANCE": "CC-1001",
    "OPERATIONS": "CC-2001",
    "HR": "CC-3001",
    "IT": "CC-5001",
    "LEGAL": "CC-6001",
    "PROCUREMENT": "CC-7001",
    "SALES": "CC-8001",
}

# ============= GL Accounts =============
GL_ACCOUNTS = {
    "MARKETING": {
        "IT Equipment": "GL-4101",
        "Software": "GL-4102",
        "Office Supplies": "GL-4103",
        "Professional Services": "GL-4104",
        "Marketing Materials": "GL-4105",
        "Cloud Services": "GL-4106",
        "Facilities": "GL-4107",
        "Training": "GL-4108",
        "Consulting": "GL-4109",
        "Maintenance": "GL-4110",
    },
    "FINANCE": {
        "IT Equipment": "GL-1101",
        "Software": "GL-1102",
        "Professional Services": "GL-1104",
        "Consulting": "GL-1109",
    },
    "OPERATIONS": {
        "IT Equipment": "GL-2101",
        "Software": "GL-2102",
        "Facilities": "GL-2107",
        "Maintenance": "GL-2110",
    },
    "HR": {
        "Training": "GL-3108",
        "Professional Services": "GL-3104",
        "Office Supplies": "GL-3103",
    },
    "IT": {
        "IT Equipment": "GL-5101",
        "Software": "GL-5102",
        "Cloud Services": "GL-5106",
        "Maintenance": "GL-5110",
    },
}

# ============= Department Budgets =============
DEPARTMENT_BUDGETS = {
    "MARKETING": {
        "Q1": {"allocated": 250000, "spent": 45000, "remaining": 205000},
        "Q2": {"allocated": 250000, "spent": 0, "remaining": 250000},
        "Q3": {"allocated": 250000, "spent": 0, "remaining": 250000},
        "Q4": {"allocated": 250000, "spent": 0, "remaining": 250000},
    },
    "FINANCE": {
        "Q1": {"allocated": 150000, "spent": 20000, "remaining": 130000},
        "Q2": {"allocated": 150000, "spent": 0, "remaining": 150000},
        "Q3": {"allocated": 150000, "spent": 0, "remaining": 150000},
        "Q4": {"allocated": 150000, "spent": 0, "remaining": 150000},
    },
    "OPERATIONS": {
        "Q1": {"allocated": 300000, "spent": 60000, "remaining": 240000},
        "Q2": {"allocated": 300000, "spent": 0, "remaining": 300000},
        "Q3": {"allocated": 300000, "spent": 0, "remaining": 300000},
        "Q4": {"allocated": 300000, "spent": 0, "remaining": 300000},
    },
    "HR": {
        "Q1": {"allocated": 100000, "spent": 15000, "remaining": 85000},
        "Q2": {"allocated": 100000, "spent": 0, "remaining": 100000},
        "Q3": {"allocated": 100000, "spent": 0, "remaining": 100000},
        "Q4": {"allocated": 100000, "spent": 0, "remaining": 100000},
    },
    "IT": {
        "Q1": {"allocated": 400000, "spent": 80000, "remaining": 320000},
        "Q2": {"allocated": 400000, "spent": 0, "remaining": 400000},
        "Q3": {"allocated": 400000, "spent": 0, "remaining": 400000},
        "Q4": {"allocated": 400000, "spent": 0, "remaining": 400000},
    },
}


def get_supplier_by_name(supplier_name: str) -> Optional[Dict[str, Any]]:
    """Get supplier info from database."""
    for name, info in SUPPLIERS_DATABASE.items():
        if name.lower() == supplier_name.lower():
            return info
    return None


def get_cost_center(department: str) -> str:
    """Get cost center for department."""
    return COST_CENTERS.get(department.upper(), "CC-9999")


def get_gl_account(department: str, category: str) -> str:
    """Get GL account for department and category."""
    dept_accounts = GL_ACCOUNTS.get(department.upper(), {})
    return dept_accounts.get(category, "GL-9999")


def get_department_budget(department: str, quarter: str) -> Dict[str, Any]:
    """Get budget info for department and quarter."""
    dept_budgets = DEPARTMENT_BUDGETS.get(department.upper(), {})
    return dept_budgets.get(quarter, {"allocated": 0, "spent": 0, "remaining": 0})


def evaluate_flag_rules(
    amount: float,
    department: str,
    supplier_name: str,
    urgency: str,
) -> List[Dict[str, Any]]:
    """Evaluate flag rules based on request parameters."""
    flags = []
    
    # Flag: High amount
    if amount > 100000:
        flags.append({
            "rule_id": "HIGH_AMOUNT",
            "rule_name": "High Amount Purchase",
            "reason": f"Purchase amount ${amount:,.0f} exceeds $100,000 threshold",
            "priority": "high",
        })
    
    # Flag: Rush/urgent
    if urgency.upper() == "URGENT":
        flags.append({
            "rule_id": "URGENT_REQUEST",
            "rule_name": "Urgent Request",
            "reason": "Urgent purchases require expedited approval",
            "priority": "medium",
        })
    
    # Flag: New supplier
    supplier = get_supplier_by_name(supplier_name)
    if not supplier:
        flags.append({
            "rule_id": "NEW_SUPPLIER",
            "rule_name": "New Supplier",
            "reason": f"Supplier '{supplier_name}' not in approved list",
            "priority": "medium",
        })
    
    return flags


def check_auto_approve(
    amount: float,
    supplier_name: str,
    department: str,
) -> tuple[bool, str]:
    """Check if purchase can be auto-approved."""
    # Auto-approve for small amounts with approved suppliers
    supplier = get_supplier_by_name(supplier_name)
    
    if amount <= 5000 and supplier and supplier.get("status") == "approved":
        return True, "Small amount with approved supplier"
    
    return False, "Requires manual approval"


def get_suppliers_by_department(department: str) -> List[Dict[str, Any]]:
    """Get list of suppliers for a department."""
    # For now, return all suppliers
    return [
        {"name": name, **info}
        for name, info in SUPPLIERS_DATABASE.items()
    ]


def get_suppliers_by_category(category: str) -> List[Dict[str, Any]]:
    """Get list of suppliers for a category."""
    # For now, return all suppliers
    return [
        {"name": name, **info}
        for name, info in SUPPLIERS_DATABASE.items()
    ]


def get_categories_for_department(department: str) -> List[str]:
    """Get available categories for a department."""
    dept_accounts = GL_ACCOUNTS.get(department.upper(), {})
    return list(dept_accounts.keys())
