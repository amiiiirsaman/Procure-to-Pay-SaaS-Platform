"""
Requisition Agent - Assists users in creating and validating requisitions.
"""

import re
from typing import Any, Optional

from .base_agent import BedrockAgent


class RequisitionAgent(BedrockAgent):
    """
    Agent responsible for:
    - Validating requisition data
    - Suggesting products and vendors
    - Checking budget availability
    - Identifying duplicate requests
    """

    def __init__(self, region: str = None, model_id: str = None, use_mock: bool = False):
        super().__init__(
            agent_name="RequisitionAgent",
            role="Requisition Specialist",
            region=region,
            model_id=model_id,
            use_mock=use_mock,
        )

    def get_system_prompt(self) -> str:
        return """You are a Requisition Specialist AI agent in a Procure-to-Pay system.

Your responsibilities:
1. Validate requisition data for completeness and accuracy
2. Suggest appropriate products from the catalog based on descriptions
3. Recommend preferred vendors based on product category and past performance
4. Check for potential duplicate requisitions
5. Ensure proper categorization and GL account assignment
6. Flag any policy violations or unusual requests

When analyzing a requisition, consider:
- Is the description clear and specific?
- Is the quantity reasonable for the product type?
- Does the unit price align with catalog pricing?
- Is the urgency level justified?
- Are there any red flags (unusually high quantity, suspicious vendor, etc.)?

Always respond with a JSON object containing:
{
    "status": "valid" | "invalid" | "needs_review",
    "validation_errors": [...],  // List of specific issues
    "suggestions": {
        "products": [...],  // Suggested product IDs with match confidence
        "vendors": [...],   // Recommended vendor IDs with reasons
        "gl_account": "...",  // Suggested GL account
        "cost_center": "..."  // Suggested cost center
    },
    "duplicate_check": {
        "is_potential_duplicate": true | false,
        "similar_requisitions": [...]  // IDs of similar recent requisitions
    },
    "risk_flags": [...],  // Any policy or risk concerns
    "recommendation": "...",  // Summary recommendation
    "confidence": 0.0-1.0  // Confidence in the analysis
}"""

    def get_responsibilities(self) -> list[str]:
        return [
            "Validate requisition data completeness",
            "Suggest products from catalog",
            "Recommend vendors based on category",
            "Check for duplicate requisitions",
            "Assign GL accounts and cost centers",
            "Flag policy violations",
        ]

    def validate_requisition(
        self,
        requisition: dict[str, Any],
        catalog: Optional[list[dict]] = None,
        recent_requisitions: Optional[list[dict]] = None,
    ) -> dict[str, Any]:
        """
        Validate a requisition and provide suggestions.

        Args:
            requisition: Requisition data dict
            catalog: Optional product catalog for suggestions
            recent_requisitions: Recent requisitions for duplicate check

        Returns:
            Validation result with suggestions
        """
        context = {
            "requisition": requisition,
            "catalog_items": catalog[:50] if catalog else [],  # Limit for context
            "recent_requisitions": recent_requisitions[:20] if recent_requisitions else [],
        }

        prompt = """Analyze this requisition request and provide:
1. Validation of all required fields
2. Product suggestions from the catalog if applicable
3. Vendor recommendations
4. Duplicate check against recent requisitions
5. Any risk flags or policy concerns

Be thorough but practical - flag real issues, not minor style concerns."""

        return self.invoke(prompt, context)

    def suggest_products(
        self,
        description: str,
        category: Optional[str] = None,
        catalog: list[dict] = None,
    ) -> dict[str, Any]:
        """
        Suggest products based on description.

        Args:
            description: Item description from requisition
            category: Optional category filter
            catalog: Product catalog to search

        Returns:
            Product suggestions with confidence scores
        """
        context = {
            "search_description": description,
            "category_filter": category,
            "catalog": catalog[:100] if catalog else [],
        }

        prompt = """Find the best matching products from the catalog for this description.
Return top 5 matches with confidence scores (0.0-1.0).
Consider exact matches, partial matches, and category relevance."""

        return self.invoke(prompt, context)

    def check_duplicates(
        self,
        requisition: dict[str, Any],
        recent_requisitions: list[dict],
    ) -> dict[str, Any]:
        """
        Check for potential duplicate requisitions.

        Args:
            requisition: New requisition to check
            recent_requisitions: Recent requisitions to compare against

        Returns:
            Duplicate check results
        """
        context = {
            "new_requisition": requisition,
            "recent_requisitions": recent_requisitions,
        }

        prompt = """Check if this new requisition might be a duplicate of any recent ones.
Consider:
- Same requestor + same product within 30 days
- Very similar descriptions
- Same vendor + similar amounts
Return potential duplicates with similarity scores."""

        return self.invoke(prompt, context)

    # ==================== Flagging Methods ====================

    def should_flag_for_review(
        self,
        requisition: dict[str, Any],
        validation_result: dict[str, Any],
    ) -> tuple[bool, str, str]:
        """
        Determine if requisition should be flagged for human review.

        Args:
            requisition: Requisition data
            validation_result: Result from validate_requisition

        Returns:
            Tuple of (should_flag, reason, severity)
        """
        total_amount = requisition.get("total_amount", 0)
        
        # High-value threshold
        if total_amount > 10000:
            return (
                True,
                f"High-value requisition: ${total_amount:,.2f} exceeds $10,000 threshold",
                "high",
            )
        
        # Potential duplicate
        if validation_result.get("duplicate_check", {}).get("is_potential_duplicate"):
            similar = validation_result.get("duplicate_check", {}).get("similar_requisitions", [])
            return (
                True,
                f"Potential duplicate of {len(similar)} recent requisition(s)",
                "medium",
            )
        
        # Non-preferred supplier
        suggestions = validation_result.get("suggestions", {})
        if suggestions.get("non_preferred_vendor"):
            return (
                True,
                "Non-preferred supplier selected - requires justification",
                "medium",
            )
        
        # Risk flags from validation
        risk_flags = validation_result.get("risk_flags", [])
        if risk_flags:
            return (
                True,
                f"Risk concerns: {', '.join(risk_flags[:3])}",
                "medium",
            )
        
        return (False, "", "")

    # ==================== Natural Language Parsing ====================

    def parse_user_input(self, user_input: str) -> dict[str, Any]:
        """
        Parse natural language requisition request using Bedrock LLM.

        Args:
            user_input: Natural language description of what the user needs

        Returns:
            Parsed data including title, amount, supplier, category, etc.
        """
        context = {
            "user_input": user_input,
        }

        prompt = """You are a procurement assistant parsing natural language requisition requests.

Analyze this user input and extract ALL relevant information for a purchase requisition:

USER INPUT: {user_input}

Extract the following fields. For each field, if you can't find a value, return null:

1. title: A concise title for this requisition (generate from the items/category mentioned)
2. description: The full original user input (copy exactly as-is)
3. department: The department making the request (IT, Marketing, Finance, Operations, HR, Legal, Sales, etc.)
4. category: Product/service category (IT Equipment, Software, Office Supplies, Marketing, Professional Services, Travel, Cloud Services, etc.)
5. amount: The estimated budget/amount as a NUMBER ONLY (no currency symbols). Look for:
   - Numbers with $ sign: "$5000" → 5000
   - Budget mentions: "budget of 20000" → 20000
   - Cost mentions: "costing 15k" → 15000
   - Price mentions: "around $500" → 500
6. priority: Urgency level (Low, Medium, High, Urgent, Critical). Look for:
   - "urgent", "urgently", "asap", "immediately" → Urgent
   - "high priority" → High
   - "critical" → Critical
   - Default to Medium if not specified
7. supplier: The preferred vendor/supplier/agency name. Look for:
   - "from [Company]", "vendor: [Company]", "supplier is [Company]"
   - "Preferred agency is [Company]", "[Company] agency"
   - Just company names mentioned as suppliers
8. justification: Business reason for the purchase. Look for:
   - "need this for...", "required for...", "to support..."
   - "for [project/purpose]", "reason:..."
   - Any explanation of why this is needed

IMPORTANT:
- Extract amounts even without $ sign (e.g., "budget of 20000" = 20000)
- Detect supplier names even with variations like "agency", "vendor", "from"
- Be thorough in extracting justification/reason

Return ONLY a valid JSON object with these exact keys:
{{
    "title": "string or null",
    "description": "string",
    "department": "string or null",
    "category": "string or null",
    "amount": number or null,
    "priority": "string or null",
    "supplier": "string or null",
    "justification": "string or null"
}}"""

        # Format prompt with user input
        formatted_prompt = prompt.format(user_input=user_input)

        result = self.invoke(formatted_prompt, context)
        
        # If mock mode or LLM fails, use regex fallback
        if not result or result.get("error"):
            return self._parse_with_regex(user_input)
        
        # Extract the parsed fields - they may be nested in various structures
        # The LLM response might have the fields at top level, or nested under
        # 'extracted_data', 'data', 'parsed', etc.
        extracted = result
        
        # Check for nested structures from LLM response
        for key in ['extracted_data', 'data', 'parsed', 'fields', 'result']:
            if key in result and isinstance(result[key], dict):
                extracted = result[key]
                break
        
        # Build final result with expected fields
        parsed_result = {
            "title": extracted.get("title"),
            "description": user_input,  # Always use original input
            "department": extracted.get("department"),
            "category": extracted.get("category"),
            "amount": extracted.get("amount"),
            "priority": extracted.get("priority"),
            "supplier": extracted.get("supplier"),
            "justification": extracted.get("justification"),
        }
        
        return parsed_result

    def _parse_with_regex(self, user_input: str) -> dict[str, Any]:
        """
        Fallback regex-based parsing when LLM is unavailable.
        """
        lowered = user_input.lower()
        parsed = {
            "title": None,
            "description": user_input,
            "department": None,
            "category": None,
            "amount": None,
            "priority": None,
            "supplier": None,
            "justification": None,
        }

        # Extract amount - multiple patterns
        amount_patterns = [
            r'\$\s*(\d+[,\d]*\.?\d*)',           # $5000, $ 5,000
            r'budget\s*(?:of|:)?\s*\$?\s*(\d+[,\d]*\.?\d*)',  # budget of 20000
            r'(\d+[,\d]*\.?\d*)\s*(?:dollars?|usd)',  # 5000 dollars
            r'cost(?:ing|s)?\s*(?:around|about)?\s*\$?\s*(\d+[,\d]*\.?\d*)',  # costing 5000
            r'price\s*(?:of|:)?\s*\$?\s*(\d+[,\d]*\.?\d*)',  # price of 5000
            r'(\d+)k\b',  # 15k → 15000
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, lowered)
            if match:
                amount_str = match.group(1).replace(',', '')
                if pattern.endswith(r'k\b'):
                    parsed["amount"] = float(amount_str) * 1000
                else:
                    parsed["amount"] = float(amount_str)
                break

        # Extract department
        dept_patterns = {
            'IT': r'\b(it|information technology)\s*(?:department|dept)?',
            'Marketing': r'\bmarketing\s*(?:department|dept)?',
            'Finance': r'\bfinance\s*(?:department|dept)?',
            'Operations': r'\boperations?\s*(?:department|dept)?',
            'HR': r'\b(hr|human resources)\s*(?:department|dept)?',
            'Legal': r'\blegal\s*(?:department|dept)?',
            'Sales': r'\bsales\s*(?:department|dept)?',
        }
        for dept, pattern in dept_patterns.items():
            if re.search(pattern, lowered):
                parsed["department"] = dept
                break

        # Extract category
        category_keywords = {
            'IT Equipment': ['laptop', 'computer', 'monitor', 'keyboard', 'mouse', 'hardware'],
            'Software': ['software', 'license', 'subscription', 'saas'],
            'Office Supplies': ['office supplies', 'stationery', 'paper', 'pens'],
            'Marketing': ['marketing', 'advertising', 'campaign', 'promotion'],
            'Professional Services': ['consulting', 'consultant', 'contractor', 'services'],
            'Travel': ['travel', 'flight', 'hotel', 'transportation'],
            'Cloud Services': ['cloud', 'aws', 'azure', 'hosting'],
        }
        for category, keywords in category_keywords.items():
            if any(kw in lowered for kw in keywords):
                parsed["category"] = category
                break

        # Extract supplier - multiple patterns
        supplier_patterns = [
            r'(?:preferred\s+)?(?:supplier|vendor|agency)\s+(?:is|:)?\s*([A-Za-z0-9][A-Za-z0-9\s&.]+?)(?:\s+agency|\s+vendor|\s*[-,.]|$)',
            r'from\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+agency|\s+vendor|\s*[-,.]|$)',
            r'through\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s*[-,.]|$)',
        ]
        for pattern in supplier_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                parsed["supplier"] = match.group(1).strip()
                break

        # Extract priority
        priority_patterns = {
            'Urgent': r'\b(urgent(?:ly)?|asap|immediately|right away)\b',
            'Critical': r'\bcritical\b',
            'High': r'\bhigh\s*priority\b',
            'Low': r'\blow\s*priority\b',
        }
        for priority, pattern in priority_patterns.items():
            if re.search(pattern, lowered):
                parsed["priority"] = priority
                break
        if not parsed["priority"]:
            parsed["priority"] = "Medium"

        # Extract justification
        justification_patterns = [
            r'need(?:ed)?\s+(?:this\s+)?(?:for|to)\s+(.+?)(?:\s*[-.]|$)',
            r'required?\s+(?:for|to)\s+(.+?)(?:\s*[-.]|$)',
            r'to\s+(?:support|help|enable)\s+(.+?)(?:\s*[-.]|$)',
            r'for\s+(new hires?|the team|our team|project|expansion|upgrade)(.+?)?(?:\s*[-.]|$)',
        ]
        for pattern in justification_patterns:
            match = re.search(pattern, lowered)
            if match:
                reason = match.group(1).strip()
                if match.lastindex > 1 and match.group(2):
                    reason += match.group(2).strip()
                parsed["justification"] = f"Required {reason}"
                break

        # Generate title
        if parsed["category"]:
            parsed["title"] = parsed["category"]
        else:
            # Extract key items mentioned
            items = re.findall(r'\b(laptop|computer|software|equipment|supplies|services?|marketing|assistance)\b', lowered)
            if items:
                parsed["title"] = items[0].capitalize()
            else:
                parsed["title"] = "Procurement Request"

        return parsed
    
    def _generate_mock_response(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Generate concise mock requisition validation with ✓/✗/! symbols.
        """
        context = context or {}
        req = context.get("requisition", {})
        
        # Extract requisition details
        amount = req.get("total_amount", 0)
        supplier_name = req.get("supplier_name", "Not specified")
        category = req.get("category", "General")
        description = req.get("description", "")
        department = req.get("department", "Unknown")
        
        # Build concise reasoning bullets (6-8 items)
        reasoning_bullets = []
        validation_errors = []
        flagged = False
        
        # 1. Supplier validation
        if supplier_name and supplier_name != "Not specified" and supplier_name.strip():
            reasoning_bullets.append(f"✓ Supplier: {supplier_name} verified in approved vendor database")
        else:
            reasoning_bullets.append("! Supplier: Not specified - will be selected during PO generation")
        
        # 2. Budget check
        if amount > 0 and amount <= 100000:
            reasoning_bullets.append(f"✓ Budget: ${amount:,.2f} within {department} department limits")
        elif amount > 100000:
            reasoning_bullets.append(f"! Budget: ${amount:,.2f} exceeds $100K - additional review recommended")
        else:
            reasoning_bullets.append("✗ Budget: Invalid amount - must be greater than zero")
            validation_errors.append("Amount must be greater than zero")
            flagged = True
        
        # 3. Description validation
        if description and len(description) > 15:
            reasoning_bullets.append(f"✓ Description: Adequate detail provided ({len(description)} chars)")
        elif description:
            reasoning_bullets.append(f"! Description: Brief - consider adding detail")
        else:
            reasoning_bullets.append("✗ Description: Missing - required for processing")
            validation_errors.append("Description is required")
            flagged = True
        
        # 4. Category classification
        reasoning_bullets.append(f"✓ Category: {category} - appropriate classification")
        
        # 5. Delivery timeline
        needed_by = req.get("needed_by_date")
        if needed_by:
            reasoning_bullets.append(f"✓ Timeline: Target date {needed_by} is achievable")
        else:
            reasoning_bullets.append("! Timeline: No delivery date specified")
        
        # 6. Justification
        justification = req.get("justification", "")
        if justification and len(justification) > 20:
            reasoning_bullets.append("✓ Justification: Detailed rationale provided")
        else:
            reasoning_bullets.append("! Justification: Brief or missing - recommend detail")
        
        # 7. Duplicate check
        reasoning_bullets.append("✓ Duplicate check: No matching requisitions in past 90 days")
        
        # 8. Pricing validation (if not flagged for other reasons)
        if not flagged:
            reasoning_bullets.append("✓ Pricing: Costs align with standard market rates")
        
        # Determine verdict
        if flagged:
            verdict = "HITL_FLAG"
            verdict_reason = "; ".join(validation_errors)
            status = "invalid"
        else:
            verdict = "AUTO_APPROVE"
            verdict_reason = "All validation checks passed"
            status = "valid"
        
        return {
            "status": status,
            "verdict": verdict,
            "verdict_reason": verdict_reason,
            "reasoning_bullets": reasoning_bullets,
            "validation_errors": validation_errors,
            "duplicate_check": {
                "is_potential_duplicate": False,
                "similar_requisitions": [],
            },
            "budget_pre_check": {
                "status": "passed",
                "estimated_tier": 2 if amount < 5000 else 3 if amount < 25000 else 4,
            },
            "confidence": 0.95 if not flagged else 0.75,
        }
