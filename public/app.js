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
    imageUrlCache: new Map()
};

// Constants
const LOW_STOCK_THRESHOLD = 5;
const QR_SCANNER_STATES = {
    NOT_STARTED: 0,
    SCANNING: 1,
    PAUSED: 2
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
            loadWheelTemplates()
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

// Debounce utility
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

        renderWheels();
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

// Handle Part Form Submit
async function handlePartSubmit(e) {
    e.preventDefault();

    const partId = document.getElementById('part-id').value;
    const partData = {
        partNumber: document.getElementById('part-number').value,
        oemPartNumber: document.getElementById('part-oem-number').value,
        partName: document.getElementById('part-name').value,
        category: document.getElementById('part-category').value,
        quantity: parseInt(document.getElementById('part-quantity').value),
        location: document.getElementById('part-location').value,
        price: document.getElementById('part-price').value,
        notes: document.getElementById('part-notes').value
    };

    try {
        const url = partId ? `/api/oem-parts/${partId}` : '/api/oem-parts';
        const method = partId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(partData)
        });

        if (response.ok) {
            showSuccess(partId ? 'Part updated successfully' : 'Part added successfully');
            closePartModal();
            await loadOEMParts();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save part');
        }
    } catch (error) {
        console.error('Error saving part:', error);
        showError('Failed to save part: ' + error.message);
    }
}

// Handle Image Selection
function handleImageSelect(e) {
    const files = e.target.files;
    const preview = document.getElementById('image-preview');
    if (!preview) return;

    preview.innerHTML = '';

    for (let i = 0; i < Math.min(files.length, 10); i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.className = 'preview-image';
            preview.appendChild(img);
        };

        reader.readAsDataURL(file);
    }
}
