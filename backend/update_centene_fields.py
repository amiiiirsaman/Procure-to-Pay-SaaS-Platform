#!/usr/bin/env python
"""Update requisitions with complete Centene enterprise procurement data."""
import os
import sys
import random

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.requisition import Requisition

# Centene department -> category -> (suppliers, cost_center, gl_account)
CENTENE_DATA = {
    "IT": {
        "Software": {
            "suppliers": ["Microsoft", "ServiceNow", "Freshworks"],
            "cost_center": "CC-1000-IT",
            "gl_accounts": ["6100-SW", "6110-SW", "6120-SW"],
            "spend_type": "OPEX"
        },
        "Hardware": {
            "suppliers": ["Dell Technologies", "Lenovo", "Framework Computer"],
            "cost_center": "CC-1000-IT", 
            "gl_accounts": ["6200-HW", "6210-HW", "6220-HW"],
            "spend_type": "CAPEX"
        },
        "Cloud Services": {
            "suppliers": ["Amazon Web Services", "Google Cloud", "DigitalOcean"],
            "cost_center": "CC-1010-CLOUD",
            "gl_accounts": ["6300-CLD", "6310-CLD", "6320-CLD"],
            "spend_type": "OPEX"
        },
        "Security": {
            "suppliers": ["CrowdStrike", "Palo Alto Networks", "SentinelOne"],
            "cost_center": "CC-1020-SEC",
            "gl_accounts": ["6400-SEC", "6410-SEC", "6420-SEC"],
            "spend_type": "OPEX"
        },
        "Consulting": {
            "suppliers": ["Accenture", "Deloitte Digital", "Slalom Consulting"],
            "cost_center": "CC-1030-CON",
            "gl_accounts": ["6500-CON", "6510-CON", "6520-CON"],
            "spend_type": "OPEX"
        }
    },
    "FINANCE": {
        "Accounting Software": {
            "suppliers": ["SAP", "Oracle NetSuite", "Sage Intacct"],
            "cost_center": "CC-2000-FIN",
            "gl_accounts": ["7100-ACC", "7110-ACC", "7120-ACC"],
            "spend_type": "OPEX"
        },
        "Audit Services": {
            "suppliers": ["KPMG", "EY", "BDO USA"],
            "cost_center": "CC-2010-AUD",
            "gl_accounts": ["7200-AUD", "7210-AUD", "7220-AUD"],
            "spend_type": "OPEX"
        },
        "Financial Consulting": {
            "suppliers": ["Deloitte", "PwC", "Grant Thornton"],
            "cost_center": "CC-2020-CON",
            "gl_accounts": ["7300-CON", "7310-CON", "7320-CON"],
            "spend_type": "OPEX"
        },
        "Tax Services": {
            "suppliers": ["KPMG Tax", "RSM US", "Moss Adams"],
            "cost_center": "CC-2030-TAX",
            "gl_accounts": ["7400-TAX", "7410-TAX", "7420-TAX"],
            "spend_type": "OPEX"
        }
    },
    "OPERATIONS": {
        "Equipment": {
            "suppliers": ["Caterpillar", "Toyota Material Handling", "Hyster-Yale"],
            "cost_center": "CC-3000-OPS",
            "gl_accounts": ["8100-EQP", "8110-EQP", "8120-EQP"],
            "spend_type": "CAPEX"
        },
        "Logistics": {
            "suppliers": ["FedEx", "UPS", "DHL Supply Chain"],
            "cost_center": "CC-3010-LOG",
            "gl_accounts": ["8200-LOG", "8210-LOG", "8220-LOG"],
            "spend_type": "OPEX"
        },
        "Supplies": {
            "suppliers": ["Grainger", "Fastenal", "Uline"],
            "cost_center": "CC-3020-SUP",
            "gl_accounts": ["8300-SUP", "8310-SUP", "8320-SUP"],
            "spend_type": "INVENTORY"
        },
        "Warehouse": {
            "suppliers": ["Manhattan Associates", "Blue Yonder", "Korber"],
            "cost_center": "CC-3030-WH",
            "gl_accounts": ["8400-WH", "8410-WH", "8420-WH"],
            "spend_type": "OPEX"
        }
    },
    "HR": {
        "HRIS": {
            "suppliers": ["Workday", "ADP", "Paylocity"],
            "cost_center": "CC-4000-HR",
            "gl_accounts": ["9100-HRS", "9110-HRS", "9120-HRS"],
            "spend_type": "OPEX"
        },
        "Training": {
            "suppliers": ["LinkedIn Learning", "Coursera for Business", "Udemy Business"],
            "cost_center": "CC-4010-TRN",
            "gl_accounts": ["9200-TRN", "9210-TRN", "9220-TRN"],
            "spend_type": "OPEX"
        },
        "Recruiting": {
            "suppliers": ["Indeed", "LinkedIn Talent", "ZipRecruiter"],
            "cost_center": "CC-4020-REC",
            "gl_accounts": ["9300-REC", "9310-REC", "9320-REC"],
            "spend_type": "OPEX"
        },
        "Benefits": {
            "suppliers": ["Mercer", "Willis Towers Watson", "Benefitfocus"],
            "cost_center": "CC-4030-BEN",
            "gl_accounts": ["9400-BEN", "9410-BEN", "9420-BEN"],
            "spend_type": "OPEX"
        }
    },
    "MARKETING": {
        "Digital Marketing": {
            "suppliers": ["Salesforce Marketing Cloud", "HubSpot", "Mailchimp"],
            "cost_center": "CC-5000-MKT",
            "gl_accounts": ["5100-DIG", "5110-DIG", "5120-DIG"],
            "spend_type": "OPEX"
        },
        "Advertising": {
            "suppliers": ["Google Ads", "Meta Ads", "TikTok for Business"],
            "cost_center": "CC-5010-ADV",
            "gl_accounts": ["5200-ADV", "5210-ADV", "5220-ADV"],
            "spend_type": "OPEX"
        },
        "Creative Services": {
            "suppliers": ["WPP", "Omnicom Group", "Dentsu Creative"],
            "cost_center": "CC-5020-CRE",
            "gl_accounts": ["5300-CRE", "5310-CRE", "5320-CRE"],
            "spend_type": "OPEX"
        },
        "Events": {
            "suppliers": ["Freeman", "Cvent", "Bizzabo"],
            "cost_center": "CC-5030-EVT",
            "gl_accounts": ["5400-EVT", "5410-EVT", "5420-EVT"],
            "spend_type": "OPEX"
        }
    },
    "FACILITIES": {
        "HVAC": {
            "suppliers": ["Johnson Controls", "Carrier", "Trane Technologies"],
            "cost_center": "CC-6000-FAC",
            "gl_accounts": ["4100-HVC", "4110-HVC", "4120-HVC"],
            "spend_type": "CAPEX"
        },
        "Maintenance": {
            "suppliers": ["ABM Industries", "CBRE", "Cushman & Wakefield"],
            "cost_center": "CC-6010-MNT",
            "gl_accounts": ["4200-MNT", "4210-MNT", "4220-MNT"],
            "spend_type": "OPEX"
        },
        "Construction": {
            "suppliers": ["Turner Construction", "AECOM", "Skanska USA"],
            "cost_center": "CC-6020-CON",
            "gl_accounts": ["4300-CON", "4310-CON", "4320-CON"],
            "spend_type": "CAPEX"
        },
        "Security": {
            "suppliers": ["Allied Universal", "Securitas", "Prosegur"],
            "cost_center": "CC-6030-SEC",
            "gl_accounts": ["4400-SEC", "4410-SEC", "4420-SEC"],
            "spend_type": "OPEX"
        }
    }
}

# Supplier risk scores
SUPPLIER_RISK = {
    "preferred": (10, 25),
    "known": (25, 45),
    "new": (45, 80)
}

db = SessionLocal()

print("=" * 60)
print("UPDATING REQUISITIONS WITH CENTENE DATA")
print("=" * 60)

requisitions = db.query(Requisition).all()
print(f"Found {len(requisitions)} requisitions to update\n")

for req in requisitions:
    dept_raw = req.department.value if hasattr(req.department, 'value') else str(req.department)
    # Normalize department name to match CENTENE_DATA keys
    dept = dept_raw.upper()
    
    # Get categories for this department
    if dept in CENTENE_DATA:
        categories = list(CENTENE_DATA[dept].keys())
        category = random.choice(categories)
        cat_data = CENTENE_DATA[dept][category]
        
        # Randomly select supplier (with status based on position in list)
        supplier_idx = random.randint(0, 2)
        supplier = cat_data["suppliers"][supplier_idx]
        
        # Determine supplier status based on index
        if supplier_idx == 0:
            supplier_status = "preferred"
        elif supplier_idx == 1:
            supplier_status = "known"
        else:
            supplier_status = "new"
        
        # Generate risk score based on status
        risk_min, risk_max = SUPPLIER_RISK[supplier_status]
        risk_score = random.randint(risk_min, risk_max)
        
        # Update requisition fields
        req.category = category
        req.supplier_name = supplier
        req.cost_center = cat_data["cost_center"]
        req.gl_account = random.choice(cat_data["gl_accounts"])
        req.spend_type = cat_data["spend_type"]
        req.supplier_risk_score = risk_score
        req.supplier_status = supplier_status
        req.contract_on_file = supplier_status in ["preferred", "known"]
        
        # Budget tracking
        budget_base = random.randint(100000, 500000)
        req.budget_available = float(budget_base)
        if req.total_amount and req.total_amount <= budget_base:
            req.budget_impact = f"Within budget (${budget_base - req.total_amount:,.0f} remaining)"
        else:
            req.budget_impact = f"Exceeds budget by ${(req.total_amount or 0) - budget_base:,.0f}"
        
        # Set workflow stage randomly
        stages = ["step_1", "step_2", "step_3", "step_4", "step_5", "step_6"]
        req.current_stage = random.choice(stages)
        
        print(f"  {req.number}: {dept}/{category} -> {supplier} ({supplier_status}, risk={risk_score})")
    else:
        print(f"  {req.number}: Unknown department {dept}, skipping")

db.commit()
db.close()

print("\n" + "=" * 60)
print("UPDATE COMPLETE!")
print("=" * 60)
