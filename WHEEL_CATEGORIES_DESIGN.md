# Wheel Subcategory System Design
**Date**: December 26, 2025
**Feature**: Organize wheels by type and status

---

## 📋 Overview

This design adds a comprehensive category and subcategory system to organize wheels by:
1. **Wheel Type** (OEM, Aftermarket, Winter, etc.)
2. **Sales Status** (Available, Reserved, Sold, etc.)
3. **Combined filtering** for better inventory management

---

## 🎯 Design Goals

1. **Easy Navigation**: Quickly filter wheels by type and status
2. **Visual Organization**: Color-coded categories and badges
3. **Flexible Taxonomy**: Support both pre-defined and custom categories
4. **Sales Tracking**: Separate sold wheels for historical reference
5. **Statistics**: Show counts per category
6. **Backward Compatible**: Works with existing wheel data

---

## 📊 Data Model Changes

### New Fields Added to Wheel Object:

```javascript
{
    id: "uuid",
    sku: "SPP-2024-SUBARU-OUTBACK-18X7.5-5X114.3-ABC1",

    // Existing fields...
    year: "2024",
    make: "Subaru",
    model: "Outback",
    trim: "Limited",
    size: "18x7.5",
    boltPattern: "5x114.3",
    offset: "+55mm",
    oemPart: "28111FL01A",
    condition: "Excellent",
    price: "450.00",
    status: "Available",  // Available, Reserved, Sold
    notes: "Like new condition",
    images: ["/uploads/image1.jpg"],

    // NEW FIELDS:
    category: "OEM",           // Primary category
    subcategory: "Stock",      // Optional subcategory
    tags: ["18-inch", "5x114.3"], // Optional tags for filtering

    // Tracking fields:
    createdAt: "2025-12-26T10:00:00Z",
    createdBy: "admin",
    updatedAt: "2025-12-26T12:00:00Z",
    updatedBy: "admin",

    // NEW: Sales tracking (when status = "Sold")
    soldAt: "2025-12-26T15:30:00Z",
    soldPrice: "450.00",       // Actual sale price (may differ from listing)
    soldTo: "Customer Name",   // Optional customer reference
    soldNotes: "Sold via phone" // Optional sale notes
}
```

---

## 🏷️ Category Taxonomy

### Primary Categories (Pre-defined):

```javascript
const WHEEL_CATEGORIES = {
    OEM: {
        label: "OEM Wheels",
        description: "Original Equipment Manufacturer wheels",
        color: "#0066cc",      // Blue
        icon: "🏭",
        subcategories: ["Stock", "Limited Edition", "Sport Package"]
    },
    AFTERMARKET: {
        label: "Aftermarket",
        description: "Third-party manufactured wheels",
        color: "#ff6600",      // Orange
        icon: "🔧",
        subcategories: ["Performance", "Luxury", "Off-Road", "Custom"]
    },
    WINTER: {
        label: "Winter/Steel",
        description: "Winter or steel wheels",
        color: "#00aaff",      // Light Blue
        icon: "❄️",
        subcategories: ["Steel", "Alloy Winter"]
    },
    REPLICA: {
        label: "Replica/OEM-Style",
        description: "Aftermarket wheels styled like OEM",
        color: "#9933cc",      // Purple
        icon: "🔄",
        subcategories: ["OEM-Style", "Reproduction"]
    },
    CUSTOM: {
        label: "Custom/Modified",
        description: "Modified or custom-built wheels",
        color: "#cc0000",      // Red
        icon: "⚡",
        subcategories: ["Powder Coated", "Refinished", "Restored"]
    },
    UNKNOWN: {
        label: "Uncategorized",
        description: "Not yet categorized",
        color: "#666666",      // Gray
        icon: "❓",
        subcategories: []
    }
};
```

### Status-Based Organization:

```javascript
const WHEEL_STATUSES = {
    AVAILABLE: {
        label: "Available",
        color: "#28a745",      // Green
        icon: "✓",
        showInMain: true
    },
    RESERVED: {
        label: "Reserved/Pending",
        color: "#ffc107",      // Yellow/Orange
        icon: "⏳",
        showInMain: true
    },
    SOLD: {
        label: "Sold",
        color: "#6c757d",      // Gray
        icon: "💰",
        showInMain: false,     // Separate "Sold" archive
        requiresFields: ["soldAt", "soldPrice"]
    },
    DAMAGED: {
        label: "Damaged/Not For Sale",
        color: "#dc3545",      // Red
        icon: "⚠️",
        showInMain: false
    }
};
```

---

## 🎨 UI Design

### 1. Navigation Tabs Structure:

```
┌─────────────────────────────────────────────────────────────┐
│  OEM Parts  │  Wheels (Active)  │  Sold Archive  │  Settings │
└─────────────────────────────────────────────────────────────┘
```

### 2. Wheels View - Category Filter Tabs:

```
┌─────────────────────────────────────────────────────────────┐
│ Wheels Inventory                                    [+ Add]  │
├─────────────────────────────────────────────────────────────┤
│ 🏭 OEM (45)  🔧 Aftermarket (23)  ❄️ Winter (12)            │
│ 🔄 Replica (8)  ⚡ Custom (5)  ❓ Other (3)  📊 All (96)    │
├─────────────────────────────────────────────────────────────┤
│ Status: ✓ Available (78)  ⏳ Reserved (15)  ⚠️ Damaged (3) │
├─────────────────────────────────────────────────────────────┤
│ Search: [_______________]  Sort: [SKU ▼]    View: [Table ▼]│
└─────────────────────────────────────────────────────────────┘
```

### 3. Sold Archive View:

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Sold Wheels Archive                        [Export CSV]  │
├─────────────────────────────────────────────────────────────┤
│ Filter:  Last 30 Days ▼   Category: All ▼   Year: 2025 ▼   │
├─────────────────────────────────────────────────────────────┤
│ Total Revenue: $12,450.00  |  Units Sold: 28  |  Avg: $445  │
├─────────────────────────────────────────────────────────────┤
│ SKU          │ Details        │ Sold Date │ Price │ Customer│
│ SPP-2024-... │ 18" OEM Outback│ 12/20/25  │ $450  │ John D. │
│ SPP-2023-... │ 17" Forester   │ 12/18/25  │ $400  │ Sarah M.│
└─────────────────────────────────────────────────────────────┘
```

### 4. Wheel Detail Modal - Category Display:

```
┌─────────────────────────────────────────────────────────────┐
│ Wheel Details                                         [×]    │
├─────────────────────────────────────────────────────────────┤
│ SKU: SPP-2024-SUBARU-OUTBACK-18X7.5-5X114.3-ABC1           │
│                                                              │
│ Category:  [🏭 OEM]  Subcategory: [Stock]                  │
│ Status:    [✓ Available]                                    │
│                                                              │
│ 2024 Subaru Outback Limited                                 │
│ Size: 18x7.5  |  Bolt: 5x114.3  |  Offset: +55mm           │
│ OEM Part: 28111FL01A                                        │
│ Condition: Excellent  |  Price: $450.00                     │
│                                                              │
│ Tags: #18-inch #5x114.3 #premium                           │
│                                                              │
│ [Images...]                                                  │
│                                                              │
│ [Edit] [Mark as Sold] [Print QR] [Delete]                  │
└─────────────────────────────────────────────────────────────┘
```

### 5. Add/Edit Wheel Form - Category Section:

```
┌─────────────────────────────────────────────────────────────┐
│ Add New Wheel                                         [×]    │
├─────────────────────────────────────────────────────────────┤
│ BASIC INFORMATION                                           │
│ Year: [2024▼]  Make: [Subaru▼]  Model: [Outback▼]         │
│ Trim: [Limited________]                                     │
│                                                              │
│ WHEEL SPECIFICATIONS                                        │
│ Size: [18x7.5_]  Bolt Pattern: [5x114.3_]  Offset: [+55mm] │
│ OEM Part: [28111FL01A_____]                                 │
│                                                              │
│ CATEGORIZATION ⭐ NEW                                       │
│ Category:    [🏭 OEM        ▼]                             │
│ Subcategory: [Stock         ▼] (Optional)                  │
│ Tags:        [18-inch, 5x114.3, premium______] (Optional)  │
│                                                              │
│ PRICING & STATUS                                            │
│ Condition: [Excellent▼]  Price: [$450.00]  Status: [✓ Avail▼]│
│                                                              │
│ IMAGES                                                       │
│ [Upload Images] (10 max)                                    │
│                                                              │
│ NOTES                                                        │
│ [Like new condition, no curb rash___________________]       │
│                                                              │
│                              [Cancel] [Save Wheel]          │
└─────────────────────────────────────────────────────────────┘
```

### 6. Mark as Sold Modal:

```
┌─────────────────────────────────────────────────────────────┐
│ Mark Wheel as Sold                                    [×]    │
├─────────────────────────────────────────────────────────────┤
│ SKU: SPP-2024-SUBARU-OUTBACK-18X7.5-5X114.3-ABC1           │
│ Listed Price: $450.00                                       │
│                                                              │
│ Sale Date:     [12/26/2025___________] 📅                  │
│ Sale Price:    [$450.00_] (Actual price received)          │
│ Customer Name: [John Doe__________] (Optional)              │
│ Sale Notes:    [Sold via phone, paid cash_________]         │
│                [___________________________________]         │
│                                                              │
│ ⚠️ This will move the wheel to the Sold Archive            │
│                                                              │
│                              [Cancel] [Mark as Sold]        │
└─────────────────────────────────────────────────────────────┘
```

### 7. Category Management Modal:

```
┌─────────────────────────────────────────────────────────────┐
│ Manage Wheel Categories                               [×]    │
├─────────────────────────────────────────────────────────────┤
│ DEFAULT CATEGORIES                                          │
│                                                              │
│ 🏭 OEM Wheels                           (45 wheels) [Edit] │
│    Subcategories: Stock, Limited Edition, Sport Package     │
│                                                              │
│ 🔧 Aftermarket                          (23 wheels) [Edit] │
│    Subcategories: Performance, Luxury, Off-Road, Custom     │
│                                                              │
│ ❄️ Winter/Steel                        (12 wheels) [Edit] │
│    Subcategories: Steel, Alloy Winter                       │
│                                                              │
│ 🔄 Replica/OEM-Style                    (8 wheels) [Edit]  │
│    Subcategories: OEM-Style, Reproduction                   │
│                                                              │
│ ⚡ Custom/Modified                       (5 wheels) [Edit] │
│    Subcategories: Powder Coated, Refinished, Restored       │
│                                                              │
│ ❓ Uncategorized                        (3 wheels) [View]  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ CUSTOM CATEGORIES                             [+ Add Custom]│
│                                                              │
│ 🎨 Powder Coated Special                (2 wheels) [Edit]  │
│                                                              │
│                                         [Close]              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Implementation Plan

### Phase 1: Backend Changes (Server.js)

**1.1 Update Wheel Data Model:**
```javascript
// In POST /api/wheels endpoint (line 417)
const newWheel = {
    id: uuidv4(),
    sku: req.body.sku || generateSKU(),

    // ... existing fields ...

    // NEW FIELDS:
    category: req.body.category || 'UNKNOWN',
    subcategory: req.body.subcategory || '',
    tags: req.body.tags || [],

    // Sale tracking (empty until sold)
    soldAt: null,
    soldPrice: null,
    soldTo: null,
    soldNotes: null,

    createdAt: new Date().toISOString(),
    createdBy: req.user.username,
    updatedAt: null,
    updatedBy: null
};
```

**1.2 Add "Mark as Sold" Endpoint:**
```javascript
// New endpoint: PATCH /api/wheels/:id/mark-sold
app.patch('/api/wheels/:id/mark-sold', authenticate, [
    param('id').isUUID(),
    body('soldPrice').isFloat({ min: 0 }),
    body('soldAt').optional().isISO8601(),
    body('soldTo').optional().trim(),
    body('soldNotes').optional().trim()
], validate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);
    const index = wheels.findIndex(w => w.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Wheel not found' });
    }

    wheels[index] = {
        ...wheels[index],
        status: 'Sold',
        soldAt: req.body.soldAt || new Date().toISOString(),
        soldPrice: req.body.soldPrice,
        soldTo: req.body.soldTo || '',
        soldNotes: req.body.soldNotes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.username
    };

    await writeData(WHEELS_FILE, wheels);
    logger.info(`Wheel marked as sold: ${wheels[index].sku} by ${req.user.username}`);
    res.json({ success: true, data: wheels[index] });
}));
```

**1.3 Add Category Statistics Endpoint:**
```javascript
// New endpoint: GET /api/wheels/stats/categories
app.get('/api/wheels/stats/categories', authenticate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);

    const stats = {
        byCategory: {},
        byStatus: {},
        totalWheels: wheels.length,
        totalValue: 0,
        soldStats: {
            count: 0,
            totalRevenue: 0,
            averagePrice: 0
        }
    };

    wheels.forEach(wheel => {
        // Category stats
        const cat = wheel.category || 'UNKNOWN';
        if (!stats.byCategory[cat]) {
            stats.byCategory[cat] = { count: 0, value: 0 };
        }
        stats.byCategory[cat].count++;
        stats.byCategory[cat].value += parseFloat(wheel.price || 0);

        // Status stats
        const status = wheel.status || 'Available';
        if (!stats.byStatus[status]) {
            stats.byStatus[status] = { count: 0, value: 0 };
        }
        stats.byStatus[status].count++;
        stats.byStatus[status].value += parseFloat(wheel.price || 0);

        // Sold stats
        if (status === 'Sold' && wheel.soldPrice) {
            stats.soldStats.count++;
            stats.soldStats.totalRevenue += parseFloat(wheel.soldPrice);
        }

        // Total value (available only)
        if (status === 'Available') {
            stats.totalValue += parseFloat(wheel.price || 0);
        }
    });

    if (stats.soldStats.count > 0) {
        stats.soldStats.averagePrice = stats.soldStats.totalRevenue / stats.soldStats.count;
    }

    res.json({ success: true, data: stats });
}));
```

---

### Phase 2: Frontend Changes (app.js)

**2.1 Update APP_STATE:**
```javascript
const APP_STATE = {
    user: null,
    token: null,
    wheels: [],
    oemParts: [],
    templates: [],

    // NEW:
    categories: WHEEL_CATEGORIES,
    activeCategory: 'ALL',      // Current category filter
    activeStatus: 'ALL',        // Current status filter
    showSoldArchive: false,     // Toggle sold archive view
    categoryStats: null         // Category statistics
};
```

**2.2 Add Category Filtering Functions:**
```javascript
function filterWheelsByCategory(category) {
    APP_STATE.activeCategory = category;
    renderWheels();
}

function filterWheelsByStatus(status) {
    APP_STATE.activeStatus = status;
    renderWheels();
}

function toggleSoldArchive() {
    APP_STATE.showSoldArchive = !APP_STATE.showSoldArchive;
    if (APP_STATE.showSoldArchive) {
        renderSoldArchive();
    } else {
        renderWheels();
    }
}

function getFilteredWheels() {
    let filtered = APP_STATE.wheels;

    // Filter by sold archive mode
    if (APP_STATE.showSoldArchive) {
        filtered = filtered.filter(w => w.status === 'Sold');
    } else {
        filtered = filtered.filter(w => w.status !== 'Sold');
    }

    // Filter by category
    if (APP_STATE.activeCategory !== 'ALL') {
        filtered = filtered.filter(w => w.category === APP_STATE.activeCategory);
    }

    // Filter by status (for active inventory only)
    if (!APP_STATE.showSoldArchive && APP_STATE.activeStatus !== 'ALL') {
        filtered = filtered.filter(w => w.status === APP_STATE.activeStatus);
    }

    return filtered;
}
```

**2.3 Update renderWheels() Function:**
```javascript
function renderWheels(wheelsToRender = null) {
    const container = document.getElementById('wheels-container');
    if (!container) return;

    const wheels = wheelsToRender || getFilteredWheels();

    if (wheels.length === 0) {
        container.innerHTML = renderEmptyState('No wheels found with current filters.');
        return;
    }

    // Render category tabs
    const categoryTabs = renderCategoryTabs();

    // Render status badges
    const statusBadges = renderStatusBadges();

    // Render table
    const tableHtml = `
        ${categoryTabs}
        ${statusBadges}
        <table class="table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Year</th>
                    <th>Make/Model</th>
                    <th>Size</th>
                    <th>Condition</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${wheels.map(wheel => `
                    <tr onclick="showWheelDetails('${wheel.id}')">
                        <td><strong>${escapeHtml(wheel.sku)}</strong></td>
                        <td>${renderCategoryBadge(wheel.category, wheel.subcategory)}</td>
                        <td>${escapeHtml(wheel.year || 'N/A')}</td>
                        <td>${escapeHtml(wheel.make || '')} ${escapeHtml(wheel.model || '')}</td>
                        <td>${escapeHtml(wheel.size || 'N/A')}</td>
                        <td>${escapeHtml(wheel.condition || 'N/A')}</td>
                        <td>$${parseFloat(wheel.price || 0).toFixed(2)}</td>
                        <td>${renderStatusBadge(wheel.status)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); markAsSold('${wheel.id}')">
                                Sell
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHtml;
}

function renderCategoryBadge(category, subcategory) {
    const cat = APP_STATE.categories[category] || APP_STATE.categories.UNKNOWN;
    const subText = subcategory ? ` / ${escapeHtml(subcategory)}` : '';
    return `<span class="badge" style="background-color: ${cat.color}">
        ${cat.icon} ${escapeHtml(cat.label)}${subText}
    </span>`;
}

function renderStatusBadge(status) {
    const statusConfig = WHEEL_STATUSES[status.toUpperCase()] || WHEEL_STATUSES.AVAILABLE;
    return `<span class="badge" style="background-color: ${statusConfig.color}">
        ${statusConfig.icon} ${escapeHtml(statusConfig.label)}
    </span>`;
}

function renderCategoryTabs() {
    const stats = APP_STATE.categoryStats || {};
    const categories = Object.keys(APP_STATE.categories);

    return `
        <div class="category-tabs">
            <button class="category-tab ${APP_STATE.activeCategory === 'ALL' ? 'active' : ''}"
                    onclick="filterWheelsByCategory('ALL')">
                📊 All (${APP_STATE.wheels.filter(w => w.status !== 'Sold').length})
            </button>
            ${categories.map(catKey => {
                const cat = APP_STATE.categories[catKey];
                const count = stats.byCategory?.[catKey]?.count || 0;
                return `
                    <button class="category-tab ${APP_STATE.activeCategory === catKey ? 'active' : ''}"
                            onclick="filterWheelsByCategory('${catKey}')">
                        ${cat.icon} ${cat.label} (${count})
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function renderStatusBadges() {
    const stats = APP_STATE.categoryStats || {};
    const statuses = Object.keys(WHEEL_STATUSES).filter(s => WHEEL_STATUSES[s].showInMain);

    return `
        <div class="status-badges">
            <button class="status-badge ${APP_STATE.activeStatus === 'ALL' ? 'active' : ''}"
                    onclick="filterWheelsByStatus('ALL')">
                All Inventory
            </button>
            ${statuses.map(statusKey => {
                const statusConfig = WHEEL_STATUSES[statusKey];
                const count = stats.byStatus?.[statusConfig.label]?.count || 0;
                return `
                    <button class="status-badge ${APP_STATE.activeStatus === statusConfig.label ? 'active' : ''}"
                            onclick="filterWheelsByStatus('${statusConfig.label}')">
                        ${statusConfig.icon} ${statusConfig.label} (${count})
                    </button>
                `;
            }).join('')}
        </div>
    `;
}
```

**2.4 Add "Mark as Sold" Modal and Function:**
```javascript
function openMarkAsSoldModal(wheelId) {
    const wheel = APP_STATE.wheels.find(w => w.id === wheelId);
    if (!wheel) return;

    const modal = document.getElementById('mark-sold-modal');
    if (!modal) return;

    document.getElementById('sold-wheel-id').value = wheel.id;
    document.getElementById('sold-sku-display').textContent = wheel.sku;
    document.getElementById('sold-listed-price').textContent = `$${parseFloat(wheel.price || 0).toFixed(2)}`;
    document.getElementById('sold-price').value = wheel.price || '0';
    document.getElementById('sold-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('sold-customer').value = '';
    document.getElementById('sold-notes').value = '';

    modal.classList.add('active');
}

async function handleMarkAsSold(e) {
    e.preventDefault();

    const wheelId = document.getElementById('sold-wheel-id').value;
    const soldData = {
        soldPrice: parseFloat(document.getElementById('sold-price').value),
        soldAt: new Date(document.getElementById('sold-date').value).toISOString(),
        soldTo: document.getElementById('sold-customer').value,
        soldNotes: document.getElementById('sold-notes').value
    };

    try {
        const response = await fetchWithAuth(`/api/wheels/${wheelId}/mark-sold`, {
            method: 'PATCH',
            body: JSON.stringify(soldData)
        });

        if (response.ok) {
            const { data } = await response.json();
            const index = APP_STATE.wheels.findIndex(w => w.id === wheelId);
            if (index !== -1) {
                APP_STATE.wheels[index] = data;
            }

            closeMarkAsSoldModal();
            await loadCategoryStats();
            renderWheels();
            showSuccess('Wheel marked as sold successfully!');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to mark wheel as sold');
        }
    } catch (error) {
        console.error('Error marking wheel as sold:', error);
        showError('Failed to mark wheel as sold: ' + error.message);
    }
}
```

**2.5 Add Sold Archive View:**
```javascript
function renderSoldArchive() {
    const container = document.getElementById('wheels-container');
    if (!container) return;

    const soldWheels = APP_STATE.wheels.filter(w => w.status === 'Sold');

    if (soldWheels.length === 0) {
        container.innerHTML = renderEmptyState('No sold wheels yet.');
        return;
    }

    // Calculate statistics
    const totalRevenue = soldWheels.reduce((sum, w) => sum + parseFloat(w.soldPrice || 0), 0);
    const avgPrice = totalRevenue / soldWheels.length;

    const html = `
        <div class="sold-archive-header">
            <h2>💰 Sold Wheels Archive</h2>
            <button class="btn btn-secondary" onclick="exportSoldWheelsCSV()">Export CSV</button>
        </div>

        <div class="sold-stats">
            <div class="stat-card">
                <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${soldWheels.length}</div>
                <div class="stat-label">Units Sold</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${avgPrice.toFixed(2)}</div>
                <div class="stat-label">Average Price</div>
            </div>
        </div>

        <table class="table sold-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Details</th>
                    <th>Category</th>
                    <th>Sold Date</th>
                    <th>Listed Price</th>
                    <th>Sale Price</th>
                    <th>Customer</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${soldWheels.map(wheel => `
                    <tr onclick="showWheelDetails('${wheel.id}')">
                        <td><strong>${escapeHtml(wheel.sku)}</strong></td>
                        <td>${escapeHtml(wheel.year || '')} ${escapeHtml(wheel.make || '')} ${escapeHtml(wheel.model || '')}<br>
                            ${escapeHtml(wheel.size || 'N/A')}</td>
                        <td>${renderCategoryBadge(wheel.category, wheel.subcategory)}</td>
                        <td>${new Date(wheel.soldAt).toLocaleDateString()}</td>
                        <td>$${parseFloat(wheel.price || 0).toFixed(2)}</td>
                        <td><strong>$${parseFloat(wheel.soldPrice || 0).toFixed(2)}</strong></td>
                        <td>${escapeHtml(wheel.soldTo || 'N/A')}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); printReceipt('${wheel.id}')">
                                Receipt
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}
```

---

### Phase 3: UI/CSS Updates (styles.css)

**3.1 Category Tabs:**
```css
.category-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
}

.category-tab {
    padding: 0.5rem 1rem;
    border: 2px solid transparent;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.category-tab:hover {
    border-color: #0066cc;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.category-tab.active {
    background: #0066cc;
    color: white;
    font-weight: bold;
}

.status-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
}

.status-badge {
    padding: 0.375rem 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
}

.status-badge:hover {
    background: #e9ecef;
}

.status-badge.active {
    background: #28a745;
    color: white;
    border-color: #28a745;
}
```

**3.2 Badge Styles:**
```css
.badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
}
```

**3.3 Sold Archive Styles:**
```css
.sold-archive-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.sold-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: white;
    text-align: center;
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.stat-label {
    font-size: 0.9rem;
    opacity: 0.9;
}

.sold-table tbody tr {
    opacity: 0.85;
}

.sold-table tbody tr:hover {
    opacity: 1;
    background: #f8f9fa;
}
```

---

## 📝 Updated HTML Structure (index.html)

**Add Mark as Sold Modal:**
```html
<!-- Mark as Sold Modal -->
<div id="mark-sold-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Mark Wheel as Sold</h2>
            <button class="modal-close" onclick="closeMarkAsSoldModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="mark-sold-form">
                <input type="hidden" id="sold-wheel-id">

                <div class="form-info">
                    <p><strong>SKU:</strong> <span id="sold-sku-display"></span></p>
                    <p><strong>Listed Price:</strong> <span id="sold-listed-price"></span></p>
                </div>

                <div class="form-group">
                    <label for="sold-date">Sale Date *</label>
                    <input type="date" id="sold-date" required>
                </div>

                <div class="form-group">
                    <label for="sold-price">Sale Price * (Actual amount received)</label>
                    <input type="number" id="sold-price" step="0.01" min="0" required>
                </div>

                <div class="form-group">
                    <label for="sold-customer">Customer Name (Optional)</label>
                    <input type="text" id="sold-customer" placeholder="John Doe">
                </div>

                <div class="form-group">
                    <label for="sold-notes">Sale Notes (Optional)</label>
                    <textarea id="sold-notes" rows="3" placeholder="Payment method, delivery details, etc."></textarea>
                </div>

                <div class="form-warning">
                    <p>⚠️ This will move the wheel to the Sold Archive</p>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeMarkAsSoldModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Mark as Sold</button>
                </div>
            </form>
        </div>
    </div>
</div>
```

**Add Navigation for Sold Archive:**
```html
<!-- Update main navigation -->
<nav class="sidebar-nav">
    <button class="nav-item" onclick="showView('oem-parts')">
        <span class="nav-icon">🔧</span>
        OEM Parts
    </button>
    <button class="nav-item active" onclick="showView('wheels')">
        <span class="nav-icon">⚙️</span>
        Wheels
    </button>
    <!-- NEW -->
    <button class="nav-item" onclick="toggleSoldArchive()">
        <span class="nav-icon">💰</span>
        Sold Archive
    </button>
</nav>
```

---

## 🔄 Migration Strategy

**For Existing Wheels (Without Categories):**

```javascript
// Run once to add categories to existing wheels
async function migrateExistingWheels() {
    const wheels = await readData(WHEELS_FILE);
    let updated = 0;

    wheels.forEach(wheel => {
        if (!wheel.category) {
            // Auto-categorize based on notes/model
            wheel.category = 'UNKNOWN';
            wheel.subcategory = '';
            wheel.tags = [];
            wheel.soldAt = null;
            wheel.soldPrice = null;
            wheel.soldTo = null;
            wheel.soldNotes = null;
            updated++;
        }
    });

    if (updated > 0) {
        await writeData(WHEELS_FILE, wheels);
        console.log(`Migrated ${updated} wheels with default categories`);
    }
}
```

---

## ✅ Testing Checklist

- [ ] Add wheel with category selection
- [ ] Edit wheel category
- [ ] Filter by category tabs
- [ ] Filter by status badges
- [ ] Mark wheel as sold
- [ ] View sold archive
- [ ] Verify sold statistics
- [ ] Export sold wheels CSV
- [ ] Category badges display correctly
- [ ] Status badges display correctly
- [ ] Sold wheels don't appear in main inventory
- [ ] Available wheels don't appear in sold archive
- [ ] Category stats update correctly
- [ ] Mobile responsiveness
- [ ] Backward compatibility with existing wheels

---

## 📈 Future Enhancements

1. **Advanced Filtering**: Combine category + status + make/model
2. **Bulk Categorization**: Select multiple wheels and assign category
3. **Category Analytics**: Charts showing sales by category over time
4. **Custom Categories**: Allow users to define their own categories
5. **Inventory Alerts**: Notify when category stock is low
6. **Price Trends**: Track average prices by category over time
7. **Customer Database**: Link sold wheels to customer records
8. **Sales Reports**: Monthly/quarterly reports by category

---

## 📚 Documentation Updates Needed

1. Update README.md with category features
2. Update TESTING_GUIDE.md with category testing steps
3. Update QUICK_START.md with category usage examples
4. Create CATEGORIES_GUIDE.md for category management best practices

---

**End of Design Document**
