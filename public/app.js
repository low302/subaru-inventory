// State Management
const APP_STATE = {
    currentView: 'wheels',
    oemParts: [],
    wheels: [],
    wheelTemplates: [],
    currentEditId: null,
    selectedImages: [],
    oemSortField: null,
    oemSortDirection: 'asc',
    csvData: null,
    user: null,
    token: null,
    wheelsById: new Map(),
    imageUrlCache: new Map(),
    // NEW: Category filtering
    activeCategory: 'ALL',
    activeStatus: 'ALL',
    showSoldArchive: false,
    categoryStats: null
};

// Constants
const LOW_STOCK_THRESHOLD = 5;
const QR_SCANNER_STATES = {
    NOT_STARTED: 0,
    SCANNING: 1,
    PAUSED: 2
};

// NEW: Wheel Categories
const WHEEL_CATEGORIES = {
    OEM: {
        label: "OEM Wheels",
        description: "Original Equipment Manufacturer wheels",
        color: "#0066cc",
        icon: "🏭",
        subcategories: ["Stock", "Limited Edition", "Sport Package"]
    },
    AFTERMARKET: {
        label: "Aftermarket",
        description: "Third-party manufactured wheels",
        color: "#ff6600",
        icon: "🔧",
        subcategories: ["Performance", "Luxury", "Off-Road", "Custom"]
    },
    WINTER: {
        label: "Winter/Steel",
        description: "Winter or steel wheels",
        color: "#00aaff",
        icon: "❄️",
        subcategories: ["Steel", "Alloy Winter"]
    },
    REPLICA: {
        label: "Replica/OEM-Style",
        description: "Aftermarket wheels styled like OEM",
        color: "#9933cc",
        icon: "🔄",
        subcategories: ["OEM-Style", "Reproduction"]
    },
    CUSTOM: {
        label: "Custom/Modified",
        description: "Modified or custom-built wheels",
        color: "#cc0000",
        icon: "⚡",
        subcategories: ["Powder Coated", "Refinished", "Restored"]
    },
    UNKNOWN: {
        label: "Uncategorized",
        description: "Not yet categorized",
        color: "#666666",
        icon: "❓",
        subcategories: []
    }
};

// NEW: Wheel Statuses
const WHEEL_STATUSES = {
    AVAILABLE: {
        label: "Available",
        color: "#28a745",
        icon: "✓",
        showInMain: true
    },
    RESERVED: {
        label: "Reserved",
        color: "#ffc107",
        icon: "⏳",
        showInMain: true
    },
    SOLD: {
        label: "Sold",
        color: "#6c757d",
        icon: "💰",
        showInMain: false
    },
    DAMAGED: {
        label: "Damaged",
        color: "#dc3545",
        icon: "⚠️",
        showInMain: false
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
});

async function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginForm();
        return;
    }

    try {
        const response = await fetchWithAuth('/api/auth/me');
        if (response.ok) {
            const { data } = await response.json();
            APP_STATE.user = data;
            APP_STATE.token = token;
            await initializeApp();
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        showLoginForm();
    }
}

function showLoginForm() {
    document.body.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" fill="url(#logo-gradient)"/>
                        <path d="M24 12L30 24L24 36L18 24L24 12Z" fill="white"/>
                        <defs>
                            <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48">
                                <stop offset="0%" stop-color="#0066CC"/>
                                <stop offset="100%" stop-color="#003D7A"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    <h1>Subaru Inventory</h1>
                    <p>Alia Fabrication</p>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" required autofocus autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required autocomplete="current-password">
                    </div>
                    <div id="login-error" class="error-message" style="display: none;"></div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Sign In
                    </button>
                </form>
                <div class="login-footer">
                    <p>Default credentials: admin / admin123</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('token', result.data.token);
            APP_STATE.user = result.data.user;
            APP_STATE.token = result.data.token;
            location.reload();
        } else {
            errorEl.textContent = result.error || 'Login failed';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function handleLogout() {
    try {
        await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        APP_STATE.user = null;
        APP_STATE.token = null;
        location.reload();
    }
}

// Fetch wrapper with authentication
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(url, { ...options, headers });
}

// Handle API errors consistently
async function handleApiResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

async function initializeApp() {
    try {
        showLoadingState();
        await Promise.all([
            loadOEMParts(),
            loadWheels(),
            loadWheelTemplates(),
            loadCategoryStats()  // NEW: Load category statistics
        ]);
        updateStats();
        hideLoadingState();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load data. Please refresh the page.');
    }
}

function showLoadingState() {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'global-loading';
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
    document.body.appendChild(loadingEl);
}

function hideLoadingState() {
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
        loadingEl.remove();
    }
}

function showError(message, duration = 5000) {
    const errorEl = document.createElement('div');
    errorEl.className = 'toast-notification error';
    errorEl.textContent = message;
    document.body.appendChild(errorEl);

    setTimeout(() => errorEl.classList.add('show'), 10);
    setTimeout(() => {
        errorEl.classList.remove('show');
        setTimeout(() => errorEl.remove(), 300);
    }, duration);
}

function showSuccess(message, duration = 3000) {
    const successEl = document.createElement('div');
    successEl.className = 'toast-notification success';
    successEl.textContent = message;
    document.body.appendChild(successEl);

    setTimeout(() => successEl.classList.add('show'), 10);
    setTimeout(() => {
        successEl.classList.remove('show');
        setTimeout(() => successEl.remove(), 300);
    }, duration);
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Search
    const oemSearch = document.getElementById('oem-search');
    if (oemSearch) {
        oemSearch.addEventListener('input', debounce((e) => {
            filterOEMParts(e.target.value);
        }, 300));
    }

    const wheelsSearch = document.getElementById('wheels-search');
    if (wheelsSearch) {
        wheelsSearch.addEventListener('input', debounce((e) => {
            filterWheels(e.target.value);
        }, 300));
    }

    // Forms
    document.getElementById('part-form')?.addEventListener('submit', handlePartSubmit);
    document.getElementById('wheel-form')?.addEventListener('submit', handleWheelSubmit);
    document.getElementById('mark-sold-form')?.addEventListener('submit', handleMarkAsSold);  // NEW

    // File input
    document.getElementById('wheel-images')?.addEventListener('change', handleImageSelect);

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Add logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-secondary logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.onclick = handleLogout;
    document.querySelector('.sidebar-header')?.appendChild(logoutBtn);
}

// View Switching
function switchView(view) {
    APP_STATE.currentView = view;

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });
}

// OEM Parts Functions
async function loadOEMParts() {
    try {
        const response = await fetchWithAuth('/api/oem-parts');
        const { data } = await handleApiResponse(response);
        APP_STATE.oemParts = data;
        renderOEMParts();
        updateStats();
    } catch (error) {
        console.error('Error loading OEM parts:', error);
        showError('Failed to load OEM parts');
    }
}

function renderOEMParts(filteredParts = null) {
    const tbody = document.getElementById('oem-parts-tbody');
    if (!tbody) return;

    const parts = filteredParts || APP_STATE.oemParts;

    if (parts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <h3>No parts found</h3>
                        <p>Add your first OEM part to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = parts.map(part => {
        const quantity = parseInt(part.quantity) || 0;
        let statusClass = 'status-in-stock';
        let statusText = 'In Stock';

        if (quantity === 0) {
            statusClass = 'status-out-of-stock';
            statusText = 'Out of Stock';
        } else if (quantity <= LOW_STOCK_THRESHOLD) {
            statusClass = 'status-low-stock';
            statusText = 'Low Stock';
        }

        return `
            <tr>
                <td><strong>${escapeHtml(part.partNumber)}</strong></td>
                <td>${escapeHtml(part.oemPartNumber || '-')}</td>
                <td>${escapeHtml(part.partName)}</td>
                <td>${escapeHtml(part.category || '-')}</td>
                <td><span class="status-badge ${statusClass}">${quantity} ${statusText}</span></td>
                <td>${escapeHtml(part.location || '-')}</td>
                <td><strong>$${parseFloat(part.price || 0).toFixed(2)}</strong></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editPart('${part.id}')" aria-label="Edit part ${escapeHtml(part.partNumber)}">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deletePart('${part.id}')" aria-label="Delete part ${escapeHtml(part.partNumber)}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOEMParts(searchTerm) {
    const filtered = APP_STATE.oemParts.filter(part => {
        const search = searchTerm.toLowerCase();
        return (
            part.partNumber.toLowerCase().includes(search) ||
            part.partName.toLowerCase().includes(search) ||
            (part.category && part.category.toLowerCase().includes(search)) ||
            (part.oemPartNumber && part.oemPartNumber.toLowerCase().includes(search))
        );
    });
    renderOEMParts(filtered);
}

function openAddPartModal() {
    APP_STATE.currentEditId = null;
    document.getElementById('part-modal-title').textContent = 'Add OEM Part';
    document.getElementById('part-form').reset();
    document.getElementById('part-id').value = '';
    document.getElementById('part-modal').classList.add('active');
    document.getElementById('part-number')?.focus();
}

function editPart(id) {
    const part = APP_STATE.oemParts.find(p => p.id === id);
    if (!part) return;

    APP_STATE.currentEditId = id;
    document.getElementById('part-modal-title').textContent = 'Edit OEM Part';
    document.getElementById('part-id').value = id;
    document.getElementById('part-number').value = part.partNumber;
    document.getElementById('part-oem-number').value = part.oemPartNumber || '';
    document.getElementById('part-name').value = part.partName;
    document.getElementById('part-category').value = part.category || '';
    document.getElementById('part-quantity').value = part.quantity;
    document.getElementById('part-location').value = part.location || '';
    document.getElementById('part-price').value = part.price || '';
    document.getElementById('part-notes').value = part.notes || '';

    document.getElementById('part-modal').classList.add('active');
}

async function handlePartSubmit(e) {
    e.preventDefault();

    const data = {
        partNumber: document.getElementById('part-number').value,
        oemPartNumber: document.getElementById('part-oem-number').value,
        partName: document.getElementById('part-name').value,
        category: document.getElementById('part-category').value,
        quantity: document.getElementById('part-quantity').value,
        location: document.getElementById('part-location').value,
        price: document.getElementById('part-price').value,
        notes: document.getElementById('part-notes').value
    };

    try {
        const url = APP_STATE.currentEditId
            ? `/api/oem-parts/${APP_STATE.currentEditId}`
            : '/api/oem-parts';
        const method = APP_STATE.currentEditId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(data)
        });

        await handleApiResponse(response);
        await loadOEMParts();
        closePartModal();
        showSuccess(APP_STATE.currentEditId ? 'Part updated successfully' : 'Part added successfully');
    } catch (error) {
        console.error('Error saving part:', error);
        showError(error.message || 'Failed to save part');
    }
}

async function deletePart(id) {
    if (!confirm('Are you sure you want to delete this part?')) return;

    try {
        const response = await fetchWithAuth(`/api/oem-parts/${id}`, { method: 'DELETE' });
        await handleApiResponse(response);
        await loadOEMParts();
        showSuccess('Part deleted successfully');
    } catch (error) {
        console.error('Error deleting part:', error);
        showError(error.message || 'Failed to delete part');
    }
}

function closePartModal() {
    document.getElementById('part-modal').classList.remove('active');
    APP_STATE.currentEditId = null;
}

// Wheels Functions
async function loadWheels() {
    try {
        const response = await fetchWithAuth('/api/wheels');
        const { data } = await handleApiResponse(response);
        APP_STATE.wheels = data;

        // Build index for fast lookups
        APP_STATE.wheelsById.clear();
        data.forEach(wheel => APP_STATE.wheelsById.set(wheel.id, wheel));

        // Use new category-aware rendering
        if (APP_STATE.showSoldArchive) {
            renderSoldArchive();
        } else {
            renderWheelsView();
        }
        updateStats();
    } catch (error) {
        console.error('Error loading wheels:', error);
        showError('Failed to load wheels');
    }
}

function renderWheels(filteredWheels = null) {
    const tbody = document.getElementById('wheels-tbody');
    if (!tbody) return;

    const wheelsToRender = filteredWheels || APP_STATE.wheels;

    if (wheelsToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 3V7M12 17V21M3 12H7M17 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>No wheels found</h3>
                        <p>Add your first wheel to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = wheelsToRender.map(wheel => {
        let displayName = '';
        if (wheel.year) displayName += wheel.year + ' ';
        if (wheel.make) displayName += wheel.make + ' ';
        if (wheel.model) displayName += wheel.model;
        if (wheel.trim) displayName += ' ' + wheel.trim;
        displayName = displayName.trim() || 'Wheel';

        let conditionClass = 'status-in-stock';
        if (wheel.condition === 'Excellent') conditionClass = 'status-in-stock';
        else if (wheel.condition === 'Good') conditionClass = 'status-available';
        else if (wheel.condition === 'Fair') conditionClass = 'status-reserved';
        else if (wheel.condition === 'Poor') conditionClass = 'status-sold';

        let statusClass = 'status-available';
        if (wheel.status === 'Sold') statusClass = 'status-sold';
        else if (wheel.status === 'Reserved') statusClass = 'status-reserved';
        else statusClass = 'status-in-stock';

        return `
            <tr>
                <td><strong>${escapeHtml(wheel.sku)}</strong></td>
                <td>${escapeHtml(displayName)}</td>
                <td>${escapeHtml(wheel.size)}</td>
                <td>${escapeHtml(wheel.boltPattern)}</td>
                <td><span class="status-badge ${conditionClass}">${escapeHtml(wheel.condition || 'Good')}</span></td>
                <td><strong>$${parseFloat(wheel.price || 0).toFixed(2)}</strong></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(wheel.status || 'Available')}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="viewWheelDetails('${wheel.id}')" aria-label="View wheel ${escapeHtml(wheel.sku)}">View</button>
                        <button class="btn btn-sm btn-primary" onclick="markAsSold('${wheel.id}')" aria-label="Mark wheel ${escapeHtml(wheel.sku)} as sold">Sold</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterWheels(searchTerm) {
    const filtered = APP_STATE.wheels.filter(wheel => {
        const search = searchTerm.toLowerCase();
        return (
            wheel.sku.toLowerCase().includes(search) ||
            (wheel.model && wheel.model.toLowerCase().includes(search)) ||
            (wheel.make && wheel.make.toLowerCase().includes(search)) ||
            (wheel.size && wheel.size.toLowerCase().includes(search))
        );
    });
    renderWheels(filtered);
}

// Utility Functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update Statistics
function updateStats() {
    // OEM Parts Stats
    const oemTotal = APP_STATE.oemParts.length;
    const oemInStock = APP_STATE.oemParts.filter(p => p.quantity > 0).length;
    const oemLowStock = APP_STATE.oemParts.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD).length;

    document.getElementById('oem-total').textContent = oemTotal;
    document.getElementById('oem-in-stock').textContent = oemInStock;
    document.getElementById('oem-low-stock').textContent = oemLowStock;

    // Wheels Stats
    const notSold = APP_STATE.wheels.filter(w => w.status !== 'Sold').length;
    const sold = APP_STATE.wheels.filter(w => w.status === 'Sold').length;
    const totalValue = APP_STATE.wheels
        .filter(w => w.status !== 'Sold')
        .reduce((sum, w) => sum + parseFloat(w.price || 0), 0);

    document.getElementById('wheels-not-sold').textContent = notSold;
    document.getElementById('wheels-sold').textContent = sold;
    document.getElementById('wheels-total-value').textContent = `$${totalValue.toFixed(2)}`;
}

// Load Wheel Templates
async function loadWheelTemplates() {
    try {
        const response = await fetchWithAuth('/api/wheel-templates');
        const { data } = await response.json();
        APP_STATE.wheelTemplates = data || [];
        updateQuickAddDropdown();
    } catch (error) {
        console.error('Error loading wheel templates:', error);
        APP_STATE.wheelTemplates = [];
    }
}

function updateQuickAddDropdown() {
    const selector = document.getElementById('quick-add-selector');
    if (!selector) return;

    // Clear existing options except first two
    while (selector.options.length > 2) {
        selector.remove(2);
    }

    // Add templates
    APP_STATE.wheelTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        selector.appendChild(option);
    });
}

// Handle Wheel Form Submit
async function handleWheelSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    const wheelId = document.getElementById('wheel-id').value;

    // Collect form data
    formData.append('sku', document.getElementById('wheel-sku').value || '');
    formData.append('year', document.getElementById('wheel-year').value);
    formData.append('make', document.getElementById('wheel-make').value === 'Other'
        ? document.getElementById('wheel-make-other').value
        : document.getElementById('wheel-make').value);
    formData.append('model', document.getElementById('wheel-model').value === 'Other'
        ? document.getElementById('wheel-model-other').value
        : document.getElementById('wheel-model').value);
    formData.append('trim', document.getElementById('wheel-trim').value);
    formData.append('size', document.getElementById('wheel-size').value);
    formData.append('boltPattern', document.getElementById('wheel-bolt-pattern').value);
    formData.append('offset', document.getElementById('wheel-offset').value);
    formData.append('oemPart', document.getElementById('wheel-oem-part').value);
    formData.append('category', document.getElementById('wheel-category').value || 'UNKNOWN');  // NEW
    formData.append('subcategory', document.getElementById('wheel-subcategory').value || '');   // NEW
    formData.append('condition', document.getElementById('wheel-condition').value);
    formData.append('price', document.getElementById('wheel-price').value);
    formData.append('status', document.getElementById('wheel-status').value);
    formData.append('notes', document.getElementById('wheel-notes').value);
    formData.append('quantity', document.getElementById('wheel-quantity').value || '1');

    // Add images
    const imageInput = document.getElementById('wheel-images');
    if (imageInput && imageInput.files) {
        for (let i = 0; i < imageInput.files.length; i++) {
            formData.append('images', imageInput.files[i]);
        }
    }

    try {
        const url = wheelId ? `/api/wheels/${wheelId}` : '/api/wheels';
        const method = wheelId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method: method,
            body: formData
        });

        if (response.ok) {
            showSuccess(wheelId ? 'Wheel updated successfully' : 'Wheel added successfully');
            closeWheelModal();
            await loadWheels();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save wheel');
        }
    } catch (error) {
        console.error('Error saving wheel:', error);
        showError('Failed to save wheel: ' + error.message);
    }
}

// Handle Image Selection with validation
function handleImageSelect(e) {
    const files = e.target.files;
    const preview = document.getElementById('image-preview');
    if (!preview) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 10;

    preview.innerHTML = '';

    if (files.length > maxFiles) {
        showError(`Maximum ${maxFiles} images allowed`);
        e.target.value = '';
        return;
    }

    let validFiles = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!allowedTypes.includes(file.type)) {
            showError(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP images are allowed.`);
            continue;
        }

        // Validate file size
        if (file.size > maxSize) {
            showError(`File too large: ${file.name}. Maximum size is 10MB.`);
            continue;
        }

        validFiles++;
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.className = 'preview-image';
            img.style.maxWidth = '150px';
            img.style.maxHeight = '150px';
            img.style.objectFit = 'cover';
            img.style.margin = '5px';
            img.style.borderRadius = '4px';
            preview.appendChild(img);
        };

        reader.readAsDataURL(file);
    }

    if (validFiles === 0 && files.length > 0) {
        e.target.value = '';
    }
}

// Modal Control Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function openAddWheelModal() {
    document.getElementById('wheel-modal-title').textContent = 'Add Wheel';
    document.getElementById('wheel-form').reset();
    document.getElementById('wheel-id').value = '';
    document.getElementById('wheel-sku').value = '';
    document.getElementById('delete-wheel-btn').style.display = 'none';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('wheel-modal').classList.add('active');
}

function closeWheelModal() {
    document.getElementById('wheel-modal').classList.remove('active');
    document.getElementById('wheel-form').reset();
}

function closeWheelDetailsModal() {
    document.getElementById('wheel-details-modal').classList.remove('active');
}

function openTemplateModal() {
    document.getElementById('template-modal-title').textContent = 'Add Wheel Template';
    document.getElementById('template-form').reset();
    document.getElementById('template-id').value = '';
    document.getElementById('template-modal').classList.add('active');
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.remove('active');
}

function openCSVImportModal() {
    document.getElementById('csv-import-modal').classList.add('active');
    document.getElementById('csv-preview').style.display = 'none';
    document.getElementById('csv-import-btn').disabled = true;
    APP_STATE.csvData = null;
}

function closeCSVImportModal() {
    document.getElementById('csv-import-modal').classList.remove('active');
    document.getElementById('csv-file-input').value = '';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Wheel Management Functions
async function viewWheelDetails(wheelId) {
    const wheel = APP_STATE.wheels.find(w => w.id === wheelId);
    if (!wheel) return;

    const content = document.getElementById('wheel-details-content');
    const displayName = `${wheel.year || ''} ${wheel.make || ''} ${wheel.model || ''} ${wheel.trim || ''}`.trim();

    const imagesHtml = wheel.images && wheel.images.length > 0
        ? wheel.images.map(img => `<img src="${img}" alt="Wheel image" style="max-width: 200px; margin: 5px;">`).join('')
        : '<p>No images available</p>';

    content.innerHTML = `
        <div style="padding: 1.25rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div><strong>SKU:</strong> ${escapeHtml(wheel.sku)}</div>
                <div><strong>Vehicle:</strong> ${escapeHtml(displayName)}</div>
                <div><strong>Size:</strong> ${escapeHtml(wheel.size)}</div>
                <div><strong>Bolt Pattern:</strong> ${escapeHtml(wheel.boltPattern)}</div>
                <div><strong>Offset:</strong> ${escapeHtml(wheel.offset || 'N/A')}</div>
                <div><strong>OEM Part:</strong> ${escapeHtml(wheel.oemPart || 'N/A')}</div>
                <div><strong>Condition:</strong> ${escapeHtml(wheel.condition)}</div>
                <div><strong>Price:</strong> $${parseFloat(wheel.price || 0).toFixed(2)}</div>
                <div><strong>Status:</strong> ${escapeHtml(wheel.status)}</div>
            </div>
            ${wheel.notes ? `<div style="margin-bottom: 1rem;"><strong>Notes:</strong><br>${escapeHtml(wheel.notes)}</div>` : ''}
            <div><strong>Images:</strong><br>${imagesHtml}</div>
            <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary" onclick="editWheel('${wheel.id}')">Edit</button>
                <button class="btn btn-primary" onclick="printQRLabel('${wheel.id}')">Print QR Label</button>
                <button class="btn btn-danger" onclick="deleteWheel('${wheel.id}')">Delete</button>
            </div>
        </div>
    `;

    document.getElementById('wheel-details-modal').classList.add('active');
}

function editWheel(wheelId) {
    const wheel = APP_STATE.wheels.find(w => w.id === wheelId);
    if (!wheel) return;

    closeWheelDetailsModal();

    document.getElementById('wheel-modal-title').textContent = 'Edit Wheel';
    document.getElementById('wheel-id').value = wheel.id;
    document.getElementById('wheel-sku').value = wheel.sku || '';
    document.getElementById('wheel-year').value = wheel.year || '';

    // Handle make
    if (wheel.make === 'Subaru' || !wheel.make) {
        document.getElementById('wheel-make').value = 'Subaru';
    } else {
        document.getElementById('wheel-make').value = 'Other';
        document.getElementById('wheel-make-other-group').style.display = 'block';
        document.getElementById('wheel-make-other').value = wheel.make;
    }

    // Handle model
    const modelSelect = document.getElementById('wheel-model');
    const modelExists = Array.from(modelSelect.options).some(opt => opt.value === wheel.model);
    if (modelExists) {
        modelSelect.value = wheel.model;
    } else {
        modelSelect.value = 'Other';
        document.getElementById('wheel-model-other-group').style.display = 'block';
        document.getElementById('wheel-model-other').value = wheel.model;
    }

    document.getElementById('wheel-trim').value = wheel.trim || '';
    document.getElementById('wheel-size').value = wheel.size || '';
    document.getElementById('wheel-bolt-pattern').value = wheel.boltPattern || '';
    document.getElementById('wheel-offset').value = wheel.offset || '';
    document.getElementById('wheel-oem-part').value = wheel.oemPart || '';
    document.getElementById('wheel-category').value = wheel.category || 'UNKNOWN';  // NEW
    document.getElementById('wheel-subcategory').value = wheel.subcategory || '';   // NEW
    document.getElementById('wheel-condition').value = wheel.condition || '';
    document.getElementById('wheel-price').value = wheel.price || '';
    document.getElementById('wheel-status').value = wheel.status || '';
    document.getElementById('wheel-notes').value = wheel.notes || '';
    document.getElementById('wheel-quantity').value = '1';

    document.getElementById('delete-wheel-btn').style.display = 'block';
    document.getElementById('image-preview').innerHTML = '';

    document.getElementById('wheel-modal').classList.add('active');
}

async function deleteWheel(wheelId) {
    if (!confirm('Are you sure you want to delete this wheel?')) return;

    try {
        const response = await fetchWithAuth(`/api/wheels/${wheelId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Wheel deleted successfully');
            closeWheelDetailsModal();
            await loadWheels();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete wheel');
        }
    } catch (error) {
        console.error('Error deleting wheel:', error);
        showError('Failed to delete wheel: ' + error.message);
    }
}

async function deleteWheelFromEdit() {
    const wheelId = document.getElementById('wheel-id').value;
    if (!wheelId) return;

    closeWheelModal();
    await deleteWheel(wheelId);
}

async function markAsSold(wheelId) {
    try {
        const response = await fetchWithAuth(`/api/wheels/${wheelId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Sold' })
        });

        if (response.ok) {
            showSuccess('Wheel marked as sold');
            await loadWheels();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update wheel');
        }
    } catch (error) {
        console.error('Error marking wheel as sold:', error);
        showError('Failed to update wheel: ' + error.message);
    }
}

async function printQRLabel(wheelId) {
    try {
        const wheel = APP_STATE.wheels.find(w => w.id === wheelId);
        if (!wheel) return;

        // Fetch the QR label HTML with authentication
        const response = await fetchWithAuth(`/api/wheels/${wheelId}/qr-label`);
        if (!response.ok) {
            throw new Error('Failed to fetch QR label');
        }

        const html = await response.text();

        // Create a blob URL from the HTML
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        // Open in new window and print
        const labelWindow = window.open(blobUrl, '_blank');
        if (!labelWindow) {
            showError('Popup blocked. Please allow popups for this site.');
            URL.revokeObjectURL(blobUrl);
            return;
        }

        labelWindow.addEventListener('load', () => {
            setTimeout(() => {
                labelWindow.print();
                // Clean up blob URL after printing
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                }, 1000);
            }, 500);
        });
    } catch (error) {
        console.error('Error printing QR label:', error);
        showError('Failed to print QR label: ' + error.message);
    }
}

// SKU Generation
function generateWheelSKU() {
    const year = document.getElementById('wheel-year').value;
    const make = document.getElementById('wheel-make').value === 'Other'
        ? document.getElementById('wheel-make-other').value
        : document.getElementById('wheel-make').value;
    const model = document.getElementById('wheel-model').value === 'Other'
        ? document.getElementById('wheel-model-other').value
        : document.getElementById('wheel-model').value;
    const size = document.getElementById('wheel-size').value;
    const bolt = document.getElementById('wheel-bolt-pattern').value;

    if (!year || !make || !model || !size || !bolt) return;

    const makeCode = make.substring(0, 3).toUpperCase();
    const modelCode = model.substring(0, 3).toUpperCase();
    const sizeCode = size.replace(/[^0-9x.]/gi, '');
    const boltCode = bolt.replace(/[^0-9x.]/gi, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    const sku = `SPP-${year}${makeCode}${modelCode}-${sizeCode}-${boltCode}-${random}`;
    document.getElementById('wheel-sku').value = sku;
}

function handleMakeChange() {
    const makeSelect = document.getElementById('wheel-make');
    const otherGroup = document.getElementById('wheel-make-other-group');

    if (makeSelect.value === 'Other') {
        otherGroup.style.display = 'block';
    } else {
        otherGroup.style.display = 'none';
    }
    generateWheelSKU();
}

function handleModelChange() {
    const modelSelect = document.getElementById('wheel-model');
    const otherGroup = document.getElementById('wheel-model-other-group');

    if (modelSelect.value === 'Other') {
        otherGroup.style.display = 'block';
    } else {
        otherGroup.style.display = 'none';
    }
    generateWheelSKU();
}

function handleTemplateMakeChange() {
    const makeSelect = document.getElementById('template-make');
    const otherGroup = document.getElementById('template-make-other-group');

    if (makeSelect.value === 'Other') {
        otherGroup.style.display = 'block';
    } else {
        otherGroup.style.display = 'none';
    }
}

function handleTemplateModelChange() {
    const modelSelect = document.getElementById('template-model');
    const otherGroup = document.getElementById('template-model-other-group');

    if (modelSelect.value === 'Other') {
        otherGroup.style.display = 'block';
    } else {
        otherGroup.style.display = 'none';
    }
}

// Quick Add and Templates
function handleQuickAddSelect(select) {
    const value = select.value;

    if (value === 'manage') {
        openTemplatesManageModal();
        select.value = '';
    } else if (value) {
        const template = APP_STATE.wheelTemplates.find(t => t.id === value);
        if (template) {
            fillWheelFormFromTemplate(template);
            select.value = '';
        }
    }
}

function fillWheelFormFromTemplate(template) {
    document.getElementById('wheel-year').value = template.year || '';
    document.getElementById('wheel-make').value = template.make || 'Subaru';
    document.getElementById('wheel-model').value = template.model || '';
    document.getElementById('wheel-trim').value = template.trim || '';
    document.getElementById('wheel-size').value = template.size || '';
    document.getElementById('wheel-bolt-pattern').value = template.boltPattern || '';
    document.getElementById('wheel-offset').value = template.offset || '';
    document.getElementById('wheel-oem-part').value = template.oemPart || '';

    generateWheelSKU();
    openAddWheelModal();
}

function openTemplatesManageModal() {
    openTemplateModal();
}

// OEM Parts Sorting
function sortOEMParts(field) {
    if (APP_STATE.oemSortField === field) {
        APP_STATE.oemSortDirection = APP_STATE.oemSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        APP_STATE.oemSortField = field;
        APP_STATE.oemSortDirection = 'asc';
    }

    const sorted = [...APP_STATE.oemParts].sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        if (field === 'quantity' || field === 'price') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else {
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) return APP_STATE.oemSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return APP_STATE.oemSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderOEMParts(sorted);
    updateSortIndicators(field);
}

function updateSortIndicators(field) {
    document.querySelectorAll('.sort-indicator').forEach(el => el.textContent = '');

    const indicator = document.getElementById(`sort-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    if (indicator) {
        indicator.textContent = APP_STATE.oemSortDirection === 'asc' ? ' ↑' : ' ↓';
    }
}

// CSV Import Functions with proper quoted field handling
function handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                showError('CSV file is empty or invalid');
                return;
            }

            // Use proper CSV parser for headers
            const headers = parseCSVLine(lines[0]);
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                // Use proper CSV parser for each line
                const values = parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }

            APP_STATE.csvData = data;
            displayCSVPreview(data, headers);
            const importBtn = document.getElementById('csv-import-btn');
            if (importBtn) importBtn.disabled = false;
        } catch (error) {
            console.error('Error parsing CSV:', error);
            showError('Failed to parse CSV file: ' + error.message);
        }
    };

    reader.readAsText(file);
}

function displayCSVPreview(data, headers) {
    const preview = document.getElementById('csv-preview-content');
    const previewData = data.slice(0, 5);

    let html = '<table class="inventory-table"><thead><tr>';
    headers.forEach(h => {
        html += `<th>${escapeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    previewData.forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
            html += `<td>${escapeHtml(row[h] || '')}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    preview.innerHTML = html;

    document.getElementById('csv-row-count').textContent = `Total rows to import: ${data.length}`;
    document.getElementById('csv-preview').style.display = 'block';
}

async function processCSVImport() {
    if (!APP_STATE.csvData || APP_STATE.csvData.length === 0) {
        showError('No data to import');
        return;
    }

    try {
        const response = await fetchWithAuth('/api/wheels/import-csv', {
            method: 'POST',
            body: JSON.stringify({ wheels: APP_STATE.csvData })
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess(`Successfully imported ${result.imported} wheels`);
            closeCSVImportModal();
            await loadWheels();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to import CSV');
        }
    } catch (error) {
        console.error('Error importing CSV:', error);
        showError('Failed to import CSV: ' + error.message);
    }
}

function downloadCSVTemplate() {
    const headers = ['year', 'make', 'model', 'trim', 'size', 'boltPattern', 'offset', 'oemPart', 'condition', 'price', 'status', 'notes'];
    const sampleData = [
        ['2024', 'Subaru', 'Outback', 'Premium', '18x7.5', '5x114.3', '+55mm', '28111FL01A', 'Excellent', '250', 'Available', 'Like new condition']
    ];

    let csv = headers.join(',') + '\n';
    sampleData.forEach(row => {
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wheel_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// QR Scanner Functions
let html5QrCode = null;

function openQRScanner() {
    document.getElementById('qr-scanner-modal').classList.add('active');
    startQRScanner();
}

function closeQRScanner() {
    stopQRScanner();
    document.getElementById('qr-scanner-modal').classList.remove('active');
}

async function startQRScanner() {
    try {
        if (!window.Html5Qrcode) {
            showError('QR Scanner library not loaded');
            return;
        }

        html5QrCode = new Html5Qrcode("qr-reader");

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                onScanSuccess(decodedText);
            },
            (errorMessage) => {
                // Ignore scan errors
            }
        );

        document.getElementById('qr-status').textContent = 'Scanning... Point camera at QR code';
    } catch (error) {
        console.error('QR Scanner error:', error);
        document.getElementById('qr-status').textContent = 'Failed to start camera. Please check permissions.';
    }
}

function stopQRScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
}

function onScanSuccess(decodedText) {
    stopQRScanner();
    closeQRScanner();

    // Find wheel by SKU
    const wheel = APP_STATE.wheels.find(w => w.sku === decodedText);

    if (wheel) {
        viewWheelDetails(wheel.id);
    } else {
        showError(`No wheel found with SKU: ${decodedText}`);
    }
}

// Template CRUD Functions
async function handleTemplateSubmit(e) {
    e.preventDefault();

    const templateId = document.getElementById('template-id')?.value;
    const make = document.getElementById('template-make')?.value;
    const makeOther = document.getElementById('template-make-other')?.value;
    const model = document.getElementById('template-model')?.value;
    const modelOther = document.getElementById('template-model-other')?.value;

    const templateData = {
        name: document.getElementById('template-name')?.value,
        year: document.getElementById('template-year')?.value,
        make: make === 'Other' ? makeOther : make,
        model: model === 'Other' ? modelOther : model,
        trim: document.getElementById('template-trim')?.value || '',
        size: document.getElementById('template-size')?.value,
        boltPattern: document.getElementById('template-bolt-pattern')?.value,
        offset: document.getElementById('template-offset')?.value || '',
        oemPart: document.getElementById('template-oem-part')?.value || ''
    };

    try {
        const url = templateId ? `/api/wheel-templates/${templateId}` : '/api/wheel-templates';
        const method = templateId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(templateData)
        });

        if (response.ok) {
            showSuccess(templateId ? 'Template updated successfully' : 'Template added successfully');
            closeTemplateModal();
            await loadWheelTemplates();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save template');
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showError('Failed to save template: ' + error.message);
    }
}

async function editTemplate(templateId) {
    const template = APP_STATE.wheelTemplates.find(t => t.id === templateId);
    if (!template) return;

    const modal = document.getElementById('template-modal');
    if (!modal) return;

    document.getElementById('template-modal-title').textContent = 'Edit Template';
    document.getElementById('template-id').value = template.id;
    document.getElementById('template-name').value = template.name || '';
    document.getElementById('template-year').value = template.year || '';

    // Handle make
    const makeSelect = document.getElementById('template-make');
    const makeOtherGroup = document.getElementById('template-make-other-group');
    if (template.make === 'Subaru') {
        makeSelect.value = 'Subaru';
        makeOtherGroup.style.display = 'none';
    } else {
        makeSelect.value = 'Other';
        makeOtherGroup.style.display = 'block';
        document.getElementById('template-make-other').value = template.make;
    }

    // Handle model
    const modelSelect = document.getElementById('template-model');
    const modelOtherGroup = document.getElementById('template-model-other-group');
    const modelExists = Array.from(modelSelect.options).some(opt => opt.value === template.model);
    if (modelExists) {
        modelSelect.value = template.model;
        modelOtherGroup.style.display = 'none';
    } else {
        modelSelect.value = 'Other';
        modelOtherGroup.style.display = 'block';
        document.getElementById('template-model-other').value = template.model;
    }

    document.getElementById('template-trim').value = template.trim || '';
    document.getElementById('template-size').value = template.size || '';
    document.getElementById('template-bolt-pattern').value = template.boltPattern || '';
    document.getElementById('template-offset').value = template.offset || '';
    document.getElementById('template-oem-part').value = template.oemPart || '';

    modal.classList.add('active');
}

async function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
        const response = await fetchWithAuth(`/api/wheel-templates/${templateId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Template deleted successfully');
            await loadWheelTemplates();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete template');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showError('Failed to delete template: ' + error.message);
    }
}

// Enhanced CSV Parser with proper quoted field handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // Add last field
    result.push(current.trim());

    return result;
}

// Add event listener setup for template form
document.addEventListener('DOMContentLoaded', () => {
    const templateForm = document.getElementById('template-form');
    if (templateForm) {
        templateForm.addEventListener('submit', handleTemplateSubmit);
    }
});

// Add empty state rendering for tables
function renderEmptyState(message, tableName) {
    return `
        <tr>
            <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom: 1rem; opacity: 0.3;">
                    <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3.89543 3 5 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">${message}</p>
                <p style="font-size: 0.875rem;">Click the button above to add your first ${tableName}</p>
            </td>
        </tr>
    `;
}

// Add unsaved changes warning
let formIsDirty = false;

function markFormDirty() {
    formIsDirty = true;
}

function markFormClean() {
    formIsDirty = false;
}

function checkUnsavedChanges() {
    if (formIsDirty) {
        return confirm('You have unsaved changes. Are you sure you want to close?');
    }
    return true;
}

// Override close functions to check for unsaved changes
const originalCloseWheelModal = closeWheelModal;
const originalClosePartModal = closePartModal;
const originalCloseTemplateModal = closeTemplateModal;

function closeWheelModal() {
    if (checkUnsavedChanges()) {
        originalCloseWheelModal();
        markFormClean();
    }
}

function closePartModal() {
    if (checkUnsavedChanges()) {
        originalClosePartModal();
        markFormClean();
    }
}

function closeTemplateModal() {
    if (checkUnsavedChanges()) {
        originalCloseTemplateModal();
        markFormClean();
    }
}

// Add form change listeners
document.addEventListener('DOMContentLoaded', () => {
    const forms = ['wheel-form', 'part-form', 'template-form'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('input', markFormDirty);
            form.addEventListener('submit', markFormClean);
        }
    });
});
// ============================================================================
// CATEGORY MANAGEMENT FUNCTIONS
// ============================================================================

// Load category statistics
async function loadCategoryStats() {
    try {
        const response = await fetchWithAuth('/api/wheels/stats/categories');
        const { data } = await handleApiResponse(response);
        APP_STATE.categoryStats = data;
    } catch (error) {
        console.error('Error loading category stats:', error);
        // Non-critical, don't show error to user
    }
}

// Filter wheels by category
function filterWheelsByCategory(category) {
    APP_STATE.activeCategory = category;
    renderWheelsView();
}

// Filter wheels by status
function filterWheelsByStatus(status) {
    APP_STATE.activeStatus = status;
    renderWheelsView();
}

// Toggle sold archive view
function toggleSoldArchive() {
    APP_STATE.showSoldArchive = !APP_STATE.showSoldArchive;
    APP_STATE.activeCategory = 'ALL';
    APP_STATE.activeStatus = 'ALL';

    if (APP_STATE.showSoldArchive) {
        renderSoldArchive();
    } else {
        renderWheelsView();
    }
}

// Get filtered wheels based on current state
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
        filtered = filtered.filter(w => (w.category || 'UNKNOWN') === APP_STATE.activeCategory);
    }

    // Filter by status (for active inventory only)
    if (!APP_STATE.showSoldArchive && APP_STATE.activeStatus !== 'ALL') {
        filtered = filtered.filter(w => w.status === APP_STATE.activeStatus);
    }

    return filtered;
}

// Render category badge
function renderCategoryBadge(category, subcategory) {
    const cat = WHEEL_CATEGORIES[category] || WHEEL_CATEGORIES.UNKNOWN;
    const subText = subcategory ? ` / ${escapeHtml(subcategory)}` : '';
    return `<span class="badge category-badge" style="background-color: ${cat.color}">
        ${cat.icon} ${escapeHtml(cat.label)}${subText}
    </span>`;
}

// Render status badge
function renderStatusBadge(status) {
    const statusKey = status.toUpperCase();
    const statusConfig = WHEEL_STATUSES[statusKey] || WHEEL_STATUSES.AVAILABLE;
    return `<span class="badge status-badge" style="background-color: ${statusConfig.color}">
        ${statusConfig.icon} ${escapeHtml(statusConfig.label)}
    </span>`;
}

// Render category tabs
function renderCategoryTabs() {
    const stats = APP_STATE.categoryStats || {};
    const categories = Object.keys(WHEEL_CATEGORIES);

    // Count wheels excluding sold
    const availableWheels = APP_STATE.wheels.filter(w => w.status !== 'Sold');

    let html = '<div class="category-tabs">';

    // All tab
    html += `
        <button class="category-tab ${APP_STATE.activeCategory === 'ALL' ? 'active' : ''}"
                onclick="filterWheelsByCategory('ALL')">
            📊 All (${availableWheels.length})
        </button>
    `;

    // Category tabs
    categories.forEach(catKey => {
        const cat = WHEEL_CATEGORIES[catKey];
        const count = stats.byCategory?.[catKey]?.count || 0;
        html += `
            <button class="category-tab ${APP_STATE.activeCategory === catKey ? 'active' : ''}"
                    onclick="filterWheelsByCategory('${catKey}')">
                ${cat.icon} ${cat.label} (${count})
            </button>
        `;
    });

    html += '</div>';
    return html;
}

// Render status badges
function renderStatusBadges() {
    const stats = APP_STATE.categoryStats || {};

    let html = '<div class="status-badges">';

    // All inventory
    html += `
        <button class="status-badge ${APP_STATE.activeStatus === 'ALL' ? 'active' : ''}"
                onclick="filterWheelsByStatus('ALL')">
            All Inventory
        </button>
    `;

    // Status badges (only those that show in main)
    Object.keys(WHEEL_STATUSES).forEach(statusKey => {
        const statusConfig = WHEEL_STATUSES[statusKey];
        if (statusConfig.showInMain) {
            const count = stats.byStatus?.[statusConfig.label]?.count || 0;
            html += `
                <button class="status-badge ${APP_STATE.activeStatus === statusConfig.label ? 'active' : ''}"
                        onclick="filterWheelsByStatus('${statusConfig.label}')">
                    ${statusConfig.icon} ${statusConfig.label} (${count})
                </button>
            `;
        }
    });

    html += '</div>';
    return html;
}

// Render complete wheels view with filters
function renderWheelsView() {
    const container = document.getElementById('wheels-container');
    if (!container) return;

    const wheels = getFilteredWheels();

    let html = '';

    // Show category and status filters
    html += renderCategoryTabs();
    html += renderStatusBadges();

    // Show wheel count
    html += `<div class="results-count">Showing ${wheels.length} wheel${wheels.length !== 1 ? 's' : ''}</div>`;

    if (wheels.length === 0) {
        html += renderEmptyState('No wheels found with current filters.');
    } else {
        html += `
            <table class="table wheels-table">
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
                        <tr onclick="showWheelDetails('${wheel.id}')" style="cursor: pointer;">
                            <td><strong>${escapeHtml(wheel.sku)}</strong></td>
                            <td>${renderCategoryBadge(wheel.category, wheel.subcategory)}</td>
                            <td>${escapeHtml(wheel.year || 'N/A')}</td>
                            <td>${escapeHtml(wheel.make || '')} ${escapeHtml(wheel.model || '')}</td>
                            <td>${escapeHtml(wheel.size || 'N/A')}</td>
                            <td>${escapeHtml(wheel.condition || 'N/A')}</td>
                            <td>$${parseFloat(wheel.price || 0).toFixed(2)}</td>
                            <td>${renderStatusBadge(wheel.status)}</td>
                            <td onclick="event.stopPropagation();">
                                ${wheel.status !== 'Sold' ? `
                                    <button class="btn btn-sm btn-success" onclick="openMarkAsSoldModal('${wheel.id}')">
                                        Sell
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    container.innerHTML = html;
}

// Render sold archive view
function renderSoldArchive() {
    const container = document.getElementById('wheels-container');
    if (!container) return;

    const soldWheels = APP_STATE.wheels.filter(w => w.status === 'Sold');

    if (soldWheels.length === 0) {
        container.innerHTML = `
            <div class="sold-archive-header">
                <h2>💰 Sold Wheels Archive</h2>
            </div>
            ${renderEmptyState('No sold wheels yet.')}
        `;
        return;
    }

    // Calculate statistics
    const totalRevenue = soldWheels.reduce((sum, w) => sum + parseFloat(w.soldPrice || w.price || 0), 0);
    const avgPrice = totalRevenue / soldWheels.length;

    const html = `
        <div class="sold-archive-header">
            <h2>💰 Sold Wheels Archive</h2>
            <div class="sold-archive-actions">
                <button class="btn btn-secondary" onclick="exportSoldWheelsCSV()">Export CSV</button>
                <button class="btn btn-secondary" onclick="toggleSoldArchive()">Back to Inventory</button>
            </div>
        </div>

        <div class="sold-stats">
            <div class="stat-card stat-card-revenue">
                <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card stat-card-count">
                <div class="stat-value">${soldWheels.length}</div>
                <div class="stat-label">Units Sold</div>
            </div>
            <div class="stat-card stat-card-average">
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
                    <tr onclick="showWheelDetails('${wheel.id}')" style="cursor: pointer;">
                        <td><strong>${escapeHtml(wheel.sku)}</strong></td>
                        <td>
                            ${escapeHtml(wheel.year || '')} ${escapeHtml(wheel.make || '')} ${escapeHtml(wheel.model || '')}<br>
                            <small>${escapeHtml(wheel.size || 'N/A')}</small>
                        </td>
                        <td>${renderCategoryBadge(wheel.category, wheel.subcategory)}</td>
                        <td>${wheel.soldAt ? new Date(wheel.soldAt).toLocaleDateString() : 'N/A'}</td>
                        <td>$${parseFloat(wheel.price || 0).toFixed(2)}</td>
                        <td><strong>$${parseFloat(wheel.soldPrice || wheel.price || 0).toFixed(2)}</strong></td>
                        <td>${escapeHtml(wheel.soldTo || 'N/A')}</td>
                        <td onclick="event.stopPropagation();">
                            <button class="btn btn-sm btn-secondary" onclick="printReceipt('${wheel.id}')">
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

// Open mark as sold modal
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
    markFormClean();
}

// Close mark as sold modal
function closeMarkAsSoldModal() {
    if (!checkUnsavedChanges()) return;

    const modal = document.getElementById('mark-sold-modal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('mark-sold-form')?.reset();
        markFormClean();
    }
}

// Handle mark as sold form submission
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
            renderWheelsView();
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

// Export sold wheels to CSV
function exportSoldWheelsCSV() {
    const soldWheels = APP_STATE.wheels.filter(w => w.status === 'Sold');

    if (soldWheels.length === 0) {
        showError('No sold wheels to export');
        return;
    }

    const headers = [
        'SKU', 'Year', 'Make', 'Model', 'Trim', 'Size', 'Bolt Pattern', 'Offset',
        'OEM Part', 'Condition', 'Category', 'Subcategory',
        'Listed Price', 'Sale Price', 'Sale Date', 'Customer', 'Notes'
    ];

    const rows = soldWheels.map(wheel => [
        wheel.sku,
        wheel.year || '',
        wheel.make || '',
        wheel.model || '',
        wheel.trim || '',
        wheel.size || '',
        wheel.boltPattern || '',
        wheel.offset || '',
        wheel.oemPart || '',
        wheel.condition || '',
        wheel.category || '',
        wheel.subcategory || '',
        wheel.price || '0',
        wheel.soldPrice || wheel.price || '0',
        wheel.soldAt ? new Date(wheel.soldAt).toLocaleDateString() : '',
        wheel.soldTo || '',
        wheel.soldNotes || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sold-wheels-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess('Sold wheels exported successfully!');
}

// Print receipt for sold wheel
function printReceipt(wheelId) {
    const wheel = APP_STATE.wheels.find(w => w.id === wheelId);
    if (!wheel || wheel.status !== 'Sold') return;

    const receiptWindow = window.open('', '_blank', 'width=800,height=600');
    if (!receiptWindow) {
        showError('Popup blocked. Please allow popups for this site.');
        return;
    }

    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sale Receipt - ${escapeHtml(wheel.sku)}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                .receipt-info { margin: 20px 0; }
                .receipt-info div { margin: 10px 0; }
                .receipt-total { font-size: 1.5em; font-weight: bold; margin-top: 20px; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>Subaru Parts Plus - Sale Receipt</h1>
            <div class="receipt-info">
                <div><strong>Date:</strong> ${wheel.soldAt ? new Date(wheel.soldAt).toLocaleDateString() : 'N/A'}</div>
                <div><strong>Customer:</strong> ${escapeHtml(wheel.soldTo || 'N/A')}</div>
                <div><strong>SKU:</strong> ${escapeHtml(wheel.sku)}</div>
                <div><strong>Description:</strong> ${escapeHtml(wheel.year || '')} ${escapeHtml(wheel.make || '')} ${escapeHtml(wheel.model || '')} ${escapeHtml(wheel.trim || '')}</div>
                <div><strong>Size:</strong> ${escapeHtml(wheel.size || 'N/A')}</div>
                <div><strong>Bolt Pattern:</strong> ${escapeHtml(wheel.boltPattern || 'N/A')}</div>
                <div><strong>Offset:</strong> ${escapeHtml(wheel.offset || 'N/A')}</div>
                <div><strong>OEM Part:</strong> ${escapeHtml(wheel.oemPart || 'N/A')}</div>
                <div><strong>Condition:</strong> ${escapeHtml(wheel.condition || 'N/A')}</div>
                ${wheel.soldNotes ? `<div><strong>Notes:</strong> ${escapeHtml(wheel.soldNotes)}</div>` : ''}
                <div class="receipt-total">Total: $${parseFloat(wheel.soldPrice || wheel.price || 0).toFixed(2)}</div>
            </div>
            <button onclick="window.print()">Print Receipt</button>
            <button onclick="window.close()">Close</button>
        </body>
        </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
}
