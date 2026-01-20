#!/usr/bin/env python
"""Test AI Wizard endpoint."""
import json
import sys
sys.path.insert(0, r"D:\ai_projects\Procure_to_Pay_(P2P)_SaaS_Platform\backend")

from app.data import (
    get_supplier_by_name,
    get_cost_center,
    get_gl_account,
    get_department_budget,
    evaluate_flag_rules,
    check_auto_approve,
)

# Test the Mac laptops request
print("Testing AI Wizard with Mac laptops request...")
print("-" * 60)

# Parse request data
department = "MARKETING"
category = "IT Equipment"
supplier_name = "Apple Store"
amount = 15000
urgency = "STANDARD"

# Get cost center and GL account
cost_center = get_cost_center(department)
gl_account = get_gl_account(department, category)
print(f"Cost Center: {cost_center}")
print(f"GL Account: {gl_account}")

# Lookup supplier info
supplier = get_supplier_by_name(supplier_name)
print(f"Supplier: {supplier_name}")
print(f"Supplier Info: {supplier}")

if supplier:
    risk_score = supplier.get("risk_score", 50)
    vendor_status = supplier.get("status", "new")
    spend_type = supplier.get("spend_type", "OPEX")
else:
    risk_score = 25
    vendor_status = "approved"
    spend_type = "OPEX"

print(f"Risk Score: {risk_score}")
print(f"Vendor Status: {vendor_status}")
print(f"Spend Type: {spend_type}")

# Get budget info
budget_data = get_department_budget(department, "Q1")
print(f"Budget Info: {budget_data}")

# Calculate budget impact
budget_remaining = budget_data.get("remaining", 0)
over_budget = max(0, amount - budget_remaining)
if over_budget > 0:
    budget_impact = f"Exceeds budget by ${over_budget:,.0f}"
    within_budget = False
else:
    budget_impact = f"Within budget (${budget_remaining - amount:,.0f} remaining)"
    within_budget = True

print(f"Amount Requested: ${amount:,.0f}")
print(f"Budget Impact: {budget_impact}")
print(f"Within Budget: {within_budget}")

# Evaluate flag rules
triggered_flags = evaluate_flag_rules(
    amount=amount,
    department=department,
    supplier_name=supplier_name,
    urgency=urgency,
)
print(f"Triggered Flags: {len(triggered_flags)}")
for flag in triggered_flags:
    print(f"  - {flag['rule_name']}: {flag['reason']}")

# Check auto-approve
can_auto_approve, auto_approve_reason = check_auto_approve(
    amount=amount,
    supplier_name=supplier_name,
    department=department,
)
print(f"Can Auto-Approve: {can_auto_approve}")
print(f"Reason: {auto_approve_reason}")

# Determine approval tier
if can_auto_approve:
    approval_tier = "auto"
elif amount <= 10000:
    approval_tier = "manager"
elif amount <= 50000:
    approval_tier = "director"
elif amount <= 100000:
    approval_tier = "vp"
elif amount <= 500000:
    approval_tier = "cfo"
else:
    approval_tier = "ceo"

print(f"Approval Tier: {approval_tier}")
print("-" * 60)
print("✓ AI Wizard test completed successfully!")
