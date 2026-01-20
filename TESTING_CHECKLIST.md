# P2P Dashboard - Visual Testing Checklist

## 🎨 Header & Branding
- [ ] AArete logo appears in top left (gradient arc with "AArete" text)
- [ ] User profile shows "James Wilson" with "JW" initials
- [ ] Subtitle shows "Procurement Manager"
- [ ] Dropdown menu appears on click with 4 options:
  - [ ] My Profile
  - [ ] Settings
  - [ ] Help
  - [ ] Log out (red text)
- [ ] Three navigation tabs: Dashboard, Automation, Procurement Graph
- [ ] Tabs are wider (min 160px) with rounded corners
- [ ] Active tab has AArete Sunrise background

## 📊 Dashboard View
### KPI Cards
- [ ] 4 KPI cards displayed
- [ ] Total Requisitions shows 18
- [ ] Pending Approvals shows 5
- [ ] Total Spend MTD shows sum of all amounts
- [ ] Compliance Rate shows percentage
- [ ] Each card has icon, value, and trend indicator

### Requisitions Table
- [ ] Table displays with proper column headers
- [ ] Column order: Req Number, Department, Category, Amount, Status, Priority, Created, Requestor
- [ ] Requisition numbers are blue underlined (clickable)
- [ ] 10 requisitions on page 1
- [ ] Pagination controls at bottom show "Previous" and "Next"
- [ ] Page numbers (1, 2) are clickable
- [ ] "Showing 1 to 10 of 18 requisitions" text appears
- [ ] Status badges have correct colors (amber for pending, green for approved, etc.)
- [ ] Priority badges have correct colors (red for urgent, orange for high, etc.)

### Navigation to Page 2
- [ ] Click page 2 or "Next"
- [ ] 8 requisitions appear on page 2
- [ ] "Showing 11 to 18 of 18 requisitions" text appears
- [ ] "Previous" button works to return to page 1

## 📋 Detail Drawer
### Opening Drawer
- [ ] Click any requisition number (blue link)
- [ ] Drawer slides in from right side (520px wide)
- [ ] Requisition ID appears in header
- [ ] Close button (X) in top right

### Drawer Content
- [ ] Title and status badges display
- [ ] 6-column grid shows: Requestor, Department, Amount, Supplier, Category, Created
- [ ] Workflow progress bar shows 7 steps
- [ ] Current step indicator ("Step X of 7")

### View Details Button
- [ ] "View Details" button appears at bottom
- [ ] Click to expand description and justification sections
- [ ] Description shows under "DESCRIPTION" header
- [ ] Business Justification shows under "BUSINESS JUSTIFICATION" header
- [ ] Button text changes to "Hide Details"

### Edit Button (Conditional)
**Test with James Wilson's Requisition (e.g., REQ-2024-001)**:
- [ ] "Edit Requisition" button appears
- [ ] Button has border style, not filled

**Test with other user's requisition (e.g., REQ-2024-002)**:
- [ ] "Edit Requisition" button does NOT appear

**Test with completed requisition**:
- [ ] "Edit Requisition" button does NOT appear

### Kick Off P2P Engine Button (Conditional)
**Test with pending/draft requisition (e.g., REQ-2024-001)**:
- [ ] "Kick Off P2P Engine" button appears at bottom
- [ ] Button has orange background (AArete Sunrise)
- [ ] Button has arrow icon
- [ ] Button has shadow effect

**Click the button**:
- [ ] Drawer closes
- [ ] Tab switches to "Automation"
- [ ] Automation view displays

## 🤖 AI Chat (Create Requisition Modal)
### Opening Modal
- [ ] Click "Create Requisition" button
- [ ] Modal appears centered (900px wide)
- [ ] Modal has two columns: AI chat (500px) and form (400px)

### AI Chat Panel
- [ ] Chat panel is 500px wide (left side)
- [ ] Header shows "AI Assistant" with "Nova Pro" badge
- [ ] Messages area has light gray background (bg-gray-50)
- [ ] Chat input at bottom with send button

### AI Parsing Tests
**Test 1: Dollar Amount Extraction**
- [ ] Type: "I need 5 laptops for $25,000"
- [ ] AI response shows: "Estimated Amount: $25,000"
- [ ] Form pre-fills amount field with "25000"

**Test 2: Category Detection**
- [ ] Type: "Need new laptops"
- [ ] AI response shows: "Category: IT Equipment"
- [ ] Form pre-fills category dropdown

**Test 3: Supplier Recognition**
- [ ] Type: "Order from Dell"
- [ ] AI response shows: "Supplier: Dell"
- [ ] Form pre-fills supplier field

**Test 4: Priority Detection**
- [ ] Type: "urgent request"
- [ ] AI response shows: "Priority: Urgent"
- [ ] AI shows warning: "⚠️ Note: Urgent requests may require additional approval levels"
- [ ] Form pre-fills priority dropdown

**Test 5: Quantity Extraction**
- [ ] Type: "Need 10 monitors"
- [ ] AI response shows: "Quantity: 10 monitor(s)"
- [ ] Form title includes "10 monitor(s)"

### Form Validation
- [ ] Try to submit without title → Alert: "Please fill in all required fields (*)"
- [ ] Try to submit without department → Alert appears
- [ ] Try to submit without category → Alert appears
- [ ] Try to submit without amount → Alert appears
- [ ] Submit button is disabled when required fields empty
- [ ] Submit button enables when all required fields filled

### Form Submission
- [ ] Fill all required fields
- [ ] Click "Submit for Approval"
- [ ] Check console: requestor should be "James Wilson"
- [ ] Check console: status should be "pending"
- [ ] Modal closes

## 🔄 Automation Tab Integration
### Without Requisition Context
- [ ] Navigate to Automation tab
- [ ] No requisition panel appears at top
- [ ] "Pause/Resume Pipeline" button visible
- [ ] Workflow visualization shows 7 steps

### With Requisition Context
**From Dashboard**:
- [ ] Open any pending requisition detail drawer
- [ ] Click "Kick Off P2P Engine"
- [ ] Automation tab loads

**Requisition Context Panel**:
- [ ] Orange gradient header appears at top
- [ ] Requisition ID and title displayed
- [ ] 4 info boxes show: Amount, Department, Supplier, Priority
- [ ] "Kick Off P2P Engine for this Requisition" button appears (orange with lightning icon)
- [ ] Close button (X) in top right of panel

**Click "Kick Off P2P Engine"**:
- [ ] Button changes to "P2P Engine is processing..."
- [ ] Green checkmark icon with animation
- [ ] Workflow steps start progressing

**Close Requisition Context**:
- [ ] Click X button in context panel
- [ ] Panel disappears
- [ ] "Pause/Resume Pipeline" buttons reappear

## 🎨 Visual Design Quality
- [ ] AArete orange colors (#E8601A) used consistently
- [ ] Rounded corners (rounded-xl) on cards and buttons
- [ ] Proper spacing and padding throughout
- [ ] Hover effects work on interactive elements
- [ ] Transitions are smooth (not jarring)
- [ ] Text is readable (good contrast)
- [ ] Icons align properly with text
- [ ] No layout shift or jumping elements

## 🔍 Search & Filters
- [ ] Search box filters requisitions by any field
- [ ] Status filter dropdown works (All, Draft, Pending, etc.)
- [ ] Department filter dropdown works
- [ ] Filters can be combined
- [ ] Empty state shows when no results

## 📱 Responsive Behavior
- [ ] Wide screen (1920px): All elements visible
- [ ] Medium screen (1440px): Layout adjusts properly
- [ ] Drawer doesn't overflow screen
- [ ] Modal is centered

## ✅ Final Verification
- [ ] No console errors
- [ ] No TypeScript compilation errors (only warnings for unused vars)
- [ ] All buttons clickable
- [ ] All links work
- [ ] Animations are smooth
- [ ] Data displays correctly
- [ ] Navigation works between tabs

---

## 🐛 Known Issues (Acceptable)
- Unused import warnings in dev console (AlertTriangle, Filter, MessageSquare, Package)
- KPI_DATA constant defined but unused (kept for reference)
- autoFillForm function unused (legacy code, can be removed)

---

**Testing Date**: January 2025
**Tested By**: _______________
**Browser**: _______________
**Screen Resolution**: _______________

**Overall Status**: [ ] PASS  [ ] FAIL

**Notes**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
