// State Management
let currentView = 'oem-parts';
let oemParts = [];
let wheels = [];
let wheelTemplates = [];
let currentEditId = null;
let selectedImages = [];
let oemSortField = null;
let oemSortDirection = 'asc';
let csvData = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await loadOEMParts();
    await loadWheels();
    await loadWheelTemplates();
    updateStats();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Search
    document.getElementById('oem-search').addEventListener('input', (e) => {
        filterOEMParts(e.target.value);
    });

    document.getElementById('wheels-search').addEventListener('input', (e) => {
        filterWheels(e.target.value);
    });

    // Forms
    document.getElementById('part-form').addEventListener('submit', handlePartSubmit);
    document.getElementById('wheel-form').addEventListener('submit', handleWheelSubmit);

    // File input
    document.getElementById('wheel-images').addEventListener('change', handleImageSelect);

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
}

// View Switching
function switchView(view) {
    currentView = view;
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });
}

// OEM Parts Functions
async function loadOEMParts() {
    try {
        const response = await fetch('/api/oem-parts');
        oemParts = await response.json();
        renderOEMParts();
        updateStats();
    } catch (error) {
        console.error('Error loading OEM parts:', error);
    }
}

function renderOEMParts(filteredParts = null) {
    const tbody = document.getElementById('oem-parts-tbody');
    const parts = filteredParts || oemParts;
    
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
        } else if (quantity <= 5) {
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
                        <button class="btn btn-sm btn-secondary" onclick="editPart('${part.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deletePart('${part.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOEMParts(searchTerm) {
    const filtered = oemParts.filter(part => {
        const search = searchTerm.toLowerCase();
        return (
            part.partNumber.toLowerCase().includes(search) ||
            part.partName.toLowerCase().includes(search) ||
            (part.category && part.category.toLowerCase().includes(search))
        );
    });
    renderOEMParts(filtered);
}

function openAddPartModal() {
    currentEditId = null;
    document.getElementById('part-modal-title').textContent = 'Add OEM Part';
    document.getElementById('part-form').reset();
    document.getElementById('part-id').value = '';
    document.getElementById('part-modal').classList.add('active');
}

function editPart(id) {
    const part = oemParts.find(p => p.id === id);
    if (!part) return;

    currentEditId = id;
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
        const url = currentEditId ? `/api/oem-parts/${currentEditId}` : '/api/oem-parts';
        const method = currentEditId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadOEMParts();
            closePartModal();
        }
    } catch (error) {
        console.error('Error saving part:', error);
        alert('Error saving part. Please try again.');
    }
}

async function deletePart(id) {
    if (!confirm('Are you sure you want to delete this part?')) return;
    
    try {
        const response = await fetch(`/api/oem-parts/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadOEMParts();
        }
    } catch (error) {
        console.error('Error deleting part:', error);
        alert('Error deleting part. Please try again.');
    }
}

function closePartModal() {
    document.getElementById('part-modal').classList.remove('active');
    currentEditId = null;
}

// Wheels Functions
async function loadWheels() {
    try {
        const response = await fetch('/api/wheels');
        wheels = await response.json();
        renderWheels();
        updateStats();
    } catch (error) {
        console.error('Error loading wheels:', error);
    }
}

function renderWheels(filteredWheels = null) {
    const tbody = document.getElementById('wheels-tbody');
    const wheelsToRender = filteredWheels || wheels;
    
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
        const mainImage = wheel.images && wheel.images.length > 0 
            ? wheel.images[0] 
            : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"%3E%3Crect fill="%23f1f5f9" width="60" height="60"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
        
        // Build display name: Year Make Model Trim
        let displayName = '';
        if (wheel.year) displayName += wheel.year + ' ';
        if (wheel.make) displayName += wheel.make + ' ';
        if (wheel.model) displayName += wheel.model;
        if (wheel.trim) displayName += ' ' + wheel.trim;
        displayName = displayName.trim() || 'Wheel';
        
        // Condition badge
        let conditionClass = 'status-in-stock';
        if (wheel.condition === 'Excellent') conditionClass = 'status-in-stock';
        else if (wheel.condition === 'Good') conditionClass = 'status-available';
        else if (wheel.condition === 'Fair') conditionClass = 'status-reserved';
        else if (wheel.condition === 'Poor') conditionClass = 'status-sold';
        
        // Status badge
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
                        <button class="btn btn-sm btn-secondary" onclick="viewWheelDetails('${wheel.id}')">View</button>
                        <button class="btn btn-sm btn-primary" onclick="markAsSold('${wheel.id}')">Sold</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterWheels(searchTerm) {
    const filtered = wheels.filter(wheel => {
        const search = searchTerm.toLowerCase();
        return (
            wheel.sku.toLowerCase().includes(search) ||
            wheel.model.toLowerCase().includes(search) ||
            (wheel.size && wheel.size.toLowerCase().includes(search)) ||
            (wheel.style && wheel.style.toLowerCase().includes(search))
        );
    });
    renderWheels(filtered);
}

function openAddWheelModal() {
    currentEditId = null;
    selectedImages = [];
    document.getElementById('wheel-modal-title').textContent = 'Add Wheel';
    document.getElementById('wheel-form').reset();
    document.getElementById('wheel-id').value = '';
    document.getElementById('wheel-sku').value = '';
    document.getElementById('wheel-make').value = 'Subaru';
    document.getElementById('wheel-status').value = 'Available';
    document.getElementById('wheel-quantity').value = '1';
    document.getElementById('wheel-quantity').parentElement.style.display = 'block';
    document.getElementById('wheel-make-other-group').style.display = 'none';
    document.getElementById('wheel-model-other-group').style.display = 'none';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('delete-wheel-btn').style.display = 'none';
    document.getElementById('wheel-modal').classList.add('active');
}

function editWheel(id) {
    const wheel = wheels.find(w => w.id === id);
    if (!wheel) return;
    
    currentEditId = id;
    selectedImages = [];
    document.getElementById('wheel-modal-title').textContent = 'Edit Wheel';
    document.getElementById('wheel-id').value = id;
    document.getElementById('wheel-sku').value = wheel.sku;
    
    // Set year, make, model fields
    document.getElementById('wheel-year').value = wheel.year || '';
    document.getElementById('wheel-make').value = wheel.make || 'Subaru';
    
    // Handle "Other" make
    if (wheel.make && wheel.make !== 'Subaru') {
        document.getElementById('wheel-make').value = 'Other';
        document.getElementById('wheel-make-other-group').style.display = 'block';
        document.getElementById('wheel-make-other').value = wheel.make;
    } else {
        document.getElementById('wheel-make-other-group').style.display = 'none';
    }
    
    document.getElementById('wheel-model').value = wheel.model || '';
    
    // Handle "Other" model
    const modelOptions = ['Outback', 'Forester', 'Ascent', 'Crosstrek', 'WRX', 'BRZ', 'Other'];
    if (wheel.model && !modelOptions.includes(wheel.model)) {
        document.getElementById('wheel-model').value = 'Other';
        document.getElementById('wheel-model-other-group').style.display = 'block';
        document.getElementById('wheel-model-other').value = wheel.model;
    } else {
        document.getElementById('wheel-model-other-group').style.display = 'none';
    }
    
    document.getElementById('wheel-trim').value = wheel.trim || '';
    document.getElementById('wheel-size').value = wheel.size;
    document.getElementById('wheel-offset').value = wheel.offset || '';
    document.getElementById('wheel-oem-part').value = wheel.oemPart || '';
    document.getElementById('wheel-bolt-pattern').value = wheel.boltPattern;
    document.getElementById('wheel-condition').value = wheel.condition || 'Good';
    document.getElementById('wheel-price').value = wheel.price || '';
    document.getElementById('wheel-status').value = wheel.status || 'Available';
    document.getElementById('wheel-notes').value = wheel.notes || '';
    
    // Show existing images
    const preview = document.getElementById('image-preview');
    preview.innerHTML = (wheel.images || []).map(img => `
        <div class="image-preview-item">
            <img src="${img}" alt="Wheel image">
        </div>
    `).join('');

    // Show delete button in edit mode
    document.getElementById('delete-wheel-btn').style.display = 'block';

    // Hide quantity field in edit mode
    document.getElementById('wheel-quantity').parentElement.style.display = 'none';

    document.getElementById('wheel-modal').classList.add('active');
}

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    selectedImages = files;
    
    const preview = document.getElementById('image-preview');
    preview.innerHTML = files.map((file, index) => {
        const url = URL.createObjectURL(file);
        return `
            <div class="image-preview-item">
                <img src="${url}" alt="Preview ${index + 1}">
                <button type="button" class="image-preview-remove" onclick="removeImage(${index})">&times;</button>
            </div>
        `;
    }).join('');
}

function removeImage(index) {
    selectedImages.splice(index, 1);
    const dt = new DataTransfer();
    selectedImages.forEach(file => dt.items.add(file));
    document.getElementById('wheel-images').files = dt.files;
    
    const preview = document.getElementById('image-preview');
    preview.innerHTML = selectedImages.map((file, i) => {
        const url = URL.createObjectURL(file);
        return `
            <div class="image-preview-item">
                <img src="${url}" alt="Preview ${i + 1}">
                <button type="button" class="image-preview-remove" onclick="removeImage(${i})">&times;</button>
            </div>
        `;
    }).join('');
}

async function handleWheelSubmit(e) {
    e.preventDefault();

    // Get make and model values (handle "Other" options)
    const make = document.getElementById('wheel-make').value;
    const actualMake = make === 'Other' ? document.getElementById('wheel-make-other').value : make;

    const model = document.getElementById('wheel-model').value;
    const actualModel = model === 'Other' ? document.getElementById('wheel-model-other').value : model;

    // Get quantity (only for new wheels, not edits)
    const quantity = currentEditId ? 1 : parseInt(document.getElementById('wheel-quantity').value) || 1;

    // Get all form data
    const wheelData = {
        year: document.getElementById('wheel-year').value,
        make: actualMake,
        model: actualModel,
        trim: document.getElementById('wheel-trim').value,
        size: document.getElementById('wheel-size').value,
        offset: document.getElementById('wheel-offset').value,
        oemPart: document.getElementById('wheel-oem-part').value,
        boltPattern: document.getElementById('wheel-bolt-pattern').value,
        condition: document.getElementById('wheel-condition').value,
        price: document.getElementById('wheel-price').value,
        status: document.getElementById('wheel-status').value,
        notes: document.getElementById('wheel-notes').value
    };

    const imageInput = document.getElementById('wheel-images');
    const images = Array.from(imageInput.files);

    try {
        // If editing, just update the single wheel
        if (currentEditId) {
            const formData = new FormData();

            let sku = document.getElementById('wheel-sku').value;
            if (!sku) {
                generateWheelSKU();
                sku = document.getElementById('wheel-sku').value;
            }

            formData.append('sku', sku);
            Object.keys(wheelData).forEach(key => {
                formData.append(key, wheelData[key]);
            });

            images.forEach(file => {
                formData.append('images', file);
            });

            const response = await fetch(`/api/wheels/${currentEditId}`, {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                await loadWheels();
                closeWheelModal();
            }
        } else {
            // Create multiple wheels with unique SKUs
            for (let i = 0; i < quantity; i++) {
                const formData = new FormData();

                // Generate a unique SKU for each wheel
                generateWheelSKU();
                const sku = document.getElementById('wheel-sku').value;

                formData.append('sku', sku);
                Object.keys(wheelData).forEach(key => {
                    formData.append(key, wheelData[key]);
                });

                // Add images to each wheel
                images.forEach(file => {
                    formData.append('images', file);
                });

                const response = await fetch('/api/wheels', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to create wheel ${i + 1} of ${quantity}`);
                }
            }

            await loadWheels();
            closeWheelModal();
        }
    } catch (error) {
        console.error('Error saving wheel:', error);
        alert('Error saving wheel. Please try again.');
    }
}

async function deleteWheel(id) {
    if (!confirm('Are you sure you want to delete this wheel? All associated images will be removed.')) return;

    try {
        const response = await fetch(`/api/wheels/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadWheels();
        }
    } catch (error) {
        console.error('Error deleting wheel:', error);
        alert('Error deleting wheel. Please try again.');
    }
}

async function deleteWheelFromEdit() {
    const wheelId = document.getElementById('wheel-id').value;
    if (!wheelId) return;

    if (!confirm('Are you sure you want to delete this wheel? All associated images will be removed.')) return;

    try {
        const response = await fetch(`/api/wheels/${wheelId}`, { method: 'DELETE' });
        if (response.ok) {
            closeWheelModal();
            await loadWheels();
        }
    } catch (error) {
        console.error('Error deleting wheel:', error);
        alert('Error deleting wheel. Please try again.');
    }
}

async function markAsSold(id) {
    if (!confirm('Mark this wheel as sold?')) return;

    try {
        const wheel = wheels.find(w => w.id === id);
        if (!wheel) return;

        const formData = new FormData();
        Object.keys(wheel).forEach(key => {
            if (key !== 'images') {
                formData.append(key, wheel[key]);
            }
        });
        formData.set('status', 'Sold');

        const response = await fetch(`/api/wheels/${id}`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            await loadWheels();
        }
    } catch (error) {
        console.error('Error marking wheel as sold:', error);
        alert('Error updating wheel status. Please try again.');
    }
}

function closeWheelModal() {
    document.getElementById('wheel-modal').classList.remove('active');
    currentEditId = null;
    selectedImages = [];
}

function viewWheelDetails(id) {
    const wheel = wheels.find(w => w.id === id);
    if (!wheel) return;
    
    const content = document.getElementById('wheel-details-content');
    const images = wheel.images && wheel.images.length > 0 
        ? wheel.images 
        : ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f1f5f9" width="400" height="400"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="48" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'];
    
    const conditionClass = wheel.condition ? wheel.condition.toLowerCase() : 'good';
    
    // Build display name
    let displayName = '';
    if (wheel.year) displayName += wheel.year + ' ';
    if (wheel.make) displayName += wheel.make + ' ';
    if (wheel.model) displayName += wheel.model;
    if (wheel.trim) displayName += ' ' + wheel.trim;
    displayName = displayName.trim() || 'Wheel';
    
    content.innerHTML = `
        <div class="wheel-details-grid">
            <div class="wheel-details-images">
                <img src="${images[0]}" alt="${escapeHtml(displayName)}" class="wheel-details-main-image" id="main-image">
                ${images.length > 1 ? `
                    <div class="wheel-details-thumbnails">
                        ${images.map((img, index) => `
                            <img src="${img}" alt="View ${index + 1}" class="wheel-details-thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="wheel-details-info">
                <div class="wheel-header" style="margin-bottom: 1rem;">
                    <span class="wheel-sku">${escapeHtml(wheel.sku)}</span>
                    <span class="wheel-price">$${parseFloat(wheel.price || 0).toFixed(2)}</span>
                </div>
                <h3>${escapeHtml(displayName)}</h3>
                <div class="wheel-condition ${conditionClass}" style="margin-bottom: 2rem;">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <circle cx="6" cy="6" r="6"/>
                    </svg>
                    ${escapeHtml(wheel.condition || 'Good')} Condition
                </div>
                
                <div class="wheel-details-specs">
                    ${wheel.year ? `
                        <div class="wheel-detail-row">
                            <span class="wheel-detail-label">Year</span>
                            <span class="wheel-detail-value">${escapeHtml(wheel.year)}</span>
                        </div>
                    ` : ''}
                    ${wheel.make ? `
                        <div class="wheel-detail-row">
                            <span class="wheel-detail-label">Make</span>
                            <span class="wheel-detail-value">${escapeHtml(wheel.make)}</span>
                        </div>
                    ` : ''}
                    ${wheel.model ? `
                        <div class="wheel-detail-row">
                            <span class="wheel-detail-label">Model</span>
                            <span class="wheel-detail-value">${escapeHtml(wheel.model)}</span>
                        </div>
                    ` : ''}
                    ${wheel.trim ? `
                        <div class="wheel-detail-row">
                            <span class="wheel-detail-label">Trim</span>
                            <span class="wheel-detail-value">${escapeHtml(wheel.trim)}</span>
                        </div>
                    ` : ''}
                    <div class="wheel-detail-row">
                        <span class="wheel-detail-label">Size</span>
                        <span class="wheel-detail-value">${escapeHtml(wheel.size)}</span>
                    </div>
                    <div class="wheel-detail-row">
                        <span class="wheel-detail-label">Bolt Pattern</span>
                        <span class="wheel-detail-value">${escapeHtml(wheel.boltPattern)}</span>
                    </div>
                    ${wheel.offset ? `
                        <div class="wheel-detail-row">
                            <span class="wheel-detail-label">Offset</span>
                            <span class="wheel-detail-value">${escapeHtml(wheel.offset)}</span>
                        </div>
                    ` : ''}
                    ${wheel.oemPart ? `
                        <div class="wheel-detail-row">
                            <span class="wheel-detail-label">OEM Part Number</span>
                            <span class="wheel-detail-value">${escapeHtml(wheel.oemPart)}</span>
                        </div>
                    ` : ''}
                    <div class="wheel-detail-row">
                        <span class="wheel-detail-label">Status</span>
                        <span class="wheel-detail-value">${escapeHtml(wheel.status || 'Available')}</span>
                    </div>
                </div>
                
                ${wheel.notes ? `
                    <div class="wheel-details-notes">
                        <h4>Condition Notes</h4>
                        <p>${escapeHtml(wheel.notes)}</p>
                    </div>
                ` : ''}
                
                <div class="wheel-details-actions">
                    <button class="btn btn-secondary" onclick="printQRLabel('${wheel.id}')" title="Print QR Label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 0.5rem;">
                            <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
                            <rect x="14" y="6" width="4" height="4" fill="currentColor"/>
                            <rect x="6" y="14" width="4" height="4" fill="currentColor"/>
                            <path d="M14 14h1m0 0h1m-1 0v1m0-1v-1m2 0h1m0 2h-1m1 2h-1m-1 0h-1m0-2h1" stroke="currentColor" stroke-width="1"/>
                        </svg>
                        Print QR Label
                    </button>
                    <button class="btn btn-secondary" onclick="closeWheelDetailsModal(); editWheel('${wheel.id}')">Edit</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('wheel-details-modal').classList.add('active');
}

function changeMainImage(src, thumbnail) {
    document.getElementById('main-image').src = src;
    document.querySelectorAll('.wheel-details-thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
}

function closeWheelDetailsModal() {
    document.getElementById('wheel-details-modal').classList.remove('active');
}

// QR Label Printing
function printQRLabel(id) {
    // Open the QR label in a new window for printing
    const labelWindow = window.open(`/api/wheels/${id}/qr-label`, '_blank', 'width=576,height=576');
    
    // Auto-print when loaded
    if (labelWindow) {
        labelWindow.onload = function() {
            labelWindow.print();
        };
    }
}

// Stats Functions
function updateStats() {
    // OEM Parts Stats
    const totalParts = oemParts.length;
    const inStock = oemParts.filter(p => parseInt(p.quantity) > 0).length;
    const lowStock = oemParts.filter(p => {
        const qty = parseInt(p.quantity);
        return qty > 0 && qty <= 5;
    }).length;
    
    document.getElementById('oem-total').textContent = totalParts;
    document.getElementById('oem-in-stock').textContent = inStock;
    document.getElementById('oem-low-stock').textContent = lowStock;
    
    // Wheels Stats
    const totalValue = wheels.reduce((sum, wheel) => {
        return sum + (parseFloat(wheel.price) || 0);
    }, 0);
    
    const notSold = wheels.filter(w => w.status !== 'Sold').length;
    const soldWheels = wheels.filter(w => w.status === 'Sold').length;
    
    document.getElementById('wheels-total-value').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('wheels-not-sold').textContent = notSold;
    document.getElementById('wheels-sold').textContent = soldWheels;
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateRandomSKU() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateWheelSKU() {
    // Get values from form
    const year = document.getElementById('wheel-year').value;
    const make = document.getElementById('wheel-make').value;
    const makeOther = document.getElementById('wheel-make-other').value;
    const model = document.getElementById('wheel-model').value;
    const modelOther = document.getElementById('wheel-model-other').value;
    const size = document.getElementById('wheel-size').value;
    const boltPattern = document.getElementById('wheel-bolt-pattern').value;
    
    // Don't generate if required fields are missing
    if (!year || !model || !size || !boltPattern) {
        document.getElementById('wheel-sku').value = '';
        return;
    }
    
    // Use actual make/model or "other" values
    const actualMake = make === 'Other' ? makeOther : make;
    const actualModel = model === 'Other' ? modelOther : model;
    
    if (!actualMake || !actualModel) {
        document.getElementById('wheel-sku').value = '';
        return;
    }
    
    // Format: SPP-[YEAR][MAKE_ABBR][MODEL_ABBR]-[SIZE]-[BOLT]-[RANDOM]
    const makeAbbr = actualMake.substring(0, 3).toUpperCase();
    const modelAbbr = actualModel.substring(0, 3).toUpperCase();
    const sizeClean = size.replace(/[^0-9x.]/gi, ''); // Remove non-alphanumeric except x and .
    const boltClean = boltPattern.replace(/[^0-9x.]/gi, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const sku = `SPP-${year}${makeAbbr}${modelAbbr}-${sizeClean}-${boltClean}-${random}`;
    document.getElementById('wheel-sku').value = sku;
}

function handleMakeChange() {
    const make = document.getElementById('wheel-make').value;
    const otherGroup = document.getElementById('wheel-make-other-group');
    
    if (make === 'Other') {
        otherGroup.style.display = 'block';
        document.getElementById('wheel-make-other').required = true;
    } else {
        otherGroup.style.display = 'none';
        document.getElementById('wheel-make-other').required = false;
        document.getElementById('wheel-make-other').value = '';
    }
    
    generateWheelSKU();
}

function handleModelChange() {
    const model = document.getElementById('wheel-model').value;
    const otherGroup = document.getElementById('wheel-model-other-group');
    
    if (model === 'Other') {
        otherGroup.style.display = 'block';
        document.getElementById('wheel-model-other').required = true;
    } else {
        otherGroup.style.display = 'none';
        document.getElementById('wheel-model-other').required = false;
        document.getElementById('wheel-model-other').value = '';
    }
    
    generateWheelSKU();
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// OEM Parts Sorting
function sortOEMParts(field) {
    // Toggle sort direction if clicking the same field
    if (oemSortField === field) {
        oemSortDirection = oemSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        oemSortField = field;
        oemSortDirection = 'asc';
    }

    // Sort the parts
    oemParts.sort((a, b) => {
        let aVal = a[field] || '';
        let bVal = b[field] || '';

        // Handle numeric fields
        if (field === 'quantity' || field === 'price') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else {
            // String comparison (case insensitive)
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }

        if (aVal < bVal) return oemSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return oemSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Update sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.className = 'sort-indicator';
    });

    const indicatorId = `sort-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
        indicator.className = `sort-indicator ${oemSortDirection}`;
    }

    // Re-render
    renderOEMParts();
}

// Wheel Templates Functions
async function loadWheelTemplates() {
    try {
        const response = await fetch('/api/wheel-templates');
        wheelTemplates = await response.json();
        renderWheelTemplates();
    } catch (error) {
        console.error('Error loading wheel templates:', error);
    }
}

function renderWheelTemplates() {
    const grid = document.getElementById('templates-grid');

    if (wheelTemplates.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h3>No templates found</h3>
                <p>Create your first quick add template</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = wheelTemplates.map(template => `
        <div class="template-card">
            <div class="template-card-header">
                <div>
                    <div class="template-card-title">${escapeHtml(template.name)}</div>
                    <div class="template-card-subtitle">${escapeHtml(template.year)} ${escapeHtml(template.make)} ${escapeHtml(template.model)}</div>
                </div>
            </div>
            <div class="template-card-specs">
                ${template.trim ? `
                    <div class="template-card-spec">
                        <span class="template-card-spec-label">Trim</span>
                        <span class="template-card-spec-value">${escapeHtml(template.trim)}</span>
                    </div>
                ` : ''}
                <div class="template-card-spec">
                    <span class="template-card-spec-label">Size</span>
                    <span class="template-card-spec-value">${escapeHtml(template.size)}</span>
                </div>
                <div class="template-card-spec">
                    <span class="template-card-spec-label">Bolt Pattern</span>
                    <span class="template-card-spec-value">${escapeHtml(template.boltPattern)}</span>
                </div>
                ${template.offset ? `
                    <div class="template-card-spec">
                        <span class="template-card-spec-label">Offset</span>
                        <span class="template-card-spec-value">${escapeHtml(template.offset)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="template-card-actions">
                <button class="btn btn-sm btn-primary" onclick="useTemplate('${template.id}')" style="flex: 1;">Use Template</button>
                <button class="btn btn-sm btn-secondary" onclick="editTemplate('${template.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${template.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function openAddTemplateModal() {
    currentEditId = null;
    document.getElementById('template-modal-title').textContent = 'Add Wheel Template';
    document.getElementById('template-form').reset();
    document.getElementById('template-id').value = '';
    document.getElementById('template-make').value = 'Subaru';
    document.getElementById('template-make-other-group').style.display = 'none';
    document.getElementById('template-model-other-group').style.display = 'none';
    document.getElementById('template-modal').classList.add('active');
}

function editTemplate(id) {
    const template = wheelTemplates.find(t => t.id === id);
    if (!template) return;

    currentEditId = id;
    document.getElementById('template-modal-title').textContent = 'Edit Wheel Template';
    document.getElementById('template-id').value = id;
    document.getElementById('template-name').value = template.name;
    document.getElementById('template-year').value = template.year;
    document.getElementById('template-make').value = template.make === 'Subaru' ? 'Subaru' : 'Other';

    if (template.make !== 'Subaru') {
        document.getElementById('template-make-other-group').style.display = 'block';
        document.getElementById('template-make-other').value = template.make;
    }

    document.getElementById('template-model').value = template.model;
    const modelOptions = ['Outback', 'Forester', 'Ascent', 'Crosstrek', 'WRX', 'BRZ'];
    if (!modelOptions.includes(template.model)) {
        document.getElementById('template-model').value = 'Other';
        document.getElementById('template-model-other-group').style.display = 'block';
        document.getElementById('template-model-other').value = template.model;
    }

    document.getElementById('template-trim').value = template.trim || '';
    document.getElementById('template-size').value = template.size;
    document.getElementById('template-bolt-pattern').value = template.boltPattern;
    document.getElementById('template-offset').value = template.offset || '';
    document.getElementById('template-oem-part').value = template.oemPart || '';

    document.getElementById('template-modal').classList.add('active');
}

async function deleteTemplate(id) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
        const response = await fetch(`/api/wheel-templates/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadWheelTemplates();
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        alert('Error deleting template. Please try again.');
    }
}

function toggleTemplatesSection() {
    const section = document.getElementById('templates-section');
    if (section.style.display === 'none') {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function useTemplate(id) {
    const template = wheelTemplates.find(t => t.id === id);
    if (!template) return;

    // Open wheel modal with template data pre-filled
    openAddWheelModal();
    document.getElementById('wheel-year').value = template.year;
    document.getElementById('wheel-make').value = template.make === 'Subaru' ? 'Subaru' : 'Other';

    if (template.make !== 'Subaru') {
        document.getElementById('wheel-make-other-group').style.display = 'block';
        document.getElementById('wheel-make-other').value = template.make;
    }

    document.getElementById('wheel-model').value = template.model;
    const modelOptions = ['Outback', 'Forester', 'Ascent', 'Crosstrek', 'WRX', 'BRZ'];
    if (!modelOptions.includes(template.model)) {
        document.getElementById('wheel-model').value = 'Other';
        document.getElementById('wheel-model-other-group').style.display = 'block';
        document.getElementById('wheel-model-other').value = template.model;
    }

    document.getElementById('wheel-trim').value = template.trim || '';
    document.getElementById('wheel-size').value = template.size;
    document.getElementById('wheel-bolt-pattern').value = template.boltPattern;
    document.getElementById('wheel-offset').value = template.offset || '';
    document.getElementById('wheel-oem-part').value = template.oemPart || '';

    // Generate SKU with template data
    generateWheelSKU();
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.remove('active');
    currentEditId = null;
}

function handleTemplateMakeChange() {
    const make = document.getElementById('template-make').value;
    const otherGroup = document.getElementById('template-make-other-group');

    if (make === 'Other') {
        otherGroup.style.display = 'block';
        document.getElementById('template-make-other').required = true;
    } else {
        otherGroup.style.display = 'none';
        document.getElementById('template-make-other').required = false;
        document.getElementById('template-make-other').value = '';
    }
}

function handleTemplateModelChange() {
    const model = document.getElementById('template-model').value;
    const otherGroup = document.getElementById('template-model-other-group');

    if (model === 'Other') {
        otherGroup.style.display = 'block';
        document.getElementById('template-model-other').required = true;
    } else {
        otherGroup.style.display = 'none';
        document.getElementById('template-model-other').required = false;
        document.getElementById('template-model-other').value = '';
    }
}

// Setup template form submission
document.addEventListener('DOMContentLoaded', () => {
    const templateForm = document.getElementById('template-form');
    if (templateForm) {
        templateForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const make = document.getElementById('template-make').value;
            const actualMake = make === 'Other' ? document.getElementById('template-make-other').value : make;

            const model = document.getElementById('template-model').value;
            const actualModel = model === 'Other' ? document.getElementById('template-model-other').value : model;

            const data = {
                name: document.getElementById('template-name').value,
                year: document.getElementById('template-year').value,
                make: actualMake,
                model: actualModel,
                trim: document.getElementById('template-trim').value,
                size: document.getElementById('template-size').value,
                boltPattern: document.getElementById('template-bolt-pattern').value,
                offset: document.getElementById('template-offset').value,
                oemPart: document.getElementById('template-oem-part').value
            };

            try {
                const url = currentEditId ? `/api/wheel-templates/${currentEditId}` : '/api/wheel-templates';
                const method = currentEditId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    await loadWheelTemplates();
                    closeTemplateModal();
                }
            } catch (error) {
                console.error('Error saving template:', error);
                alert('Error saving template. Please try again.');
            }
        });
    }
});

// CSV Import Functions
function downloadCSVTemplate() {
    const headers = ['year', 'make', 'model', 'trim', 'size', 'boltPattern', 'offset', 'oemPart', 'condition', 'price', 'status', 'notes'];
    const exampleRow = ['2024', 'Subaru', 'Outback', 'Limited', '18x7.5', '5x114.3', '+55mm', '28111FL01A', 'Good', '450.00', 'Available', 'Light curb rash on one wheel'];

    const csvContent = [
        headers.join(','),
        exampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'wheel_inventory_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openCSVImportModal() {
    csvData = null;
    document.getElementById('csv-file-input').value = '';
    document.getElementById('csv-preview').style.display = 'none';
    document.getElementById('csv-import-btn').disabled = true;
    document.getElementById('csv-import-modal').classList.add('active');
}

function closeCSVImportModal() {
    document.getElementById('csv-import-modal').classList.remove('active');
    csvData = null;
}

function handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }

    csvData = rows;
    displayCSVPreview(headers, rows);
}

function displayCSVPreview(headers, rows) {
    const preview = document.getElementById('csv-preview-content');
    const previewRows = rows.slice(0, 5);

    let tableHTML = '<table class="inventory-table" style="min-width: 100%;"><thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${escapeHtml(header)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    previewRows.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${escapeHtml(row[header] || '-')}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    preview.innerHTML = tableHTML;

    document.getElementById('csv-row-count').textContent = `Total rows to import: ${rows.length}`;
    document.getElementById('csv-preview').style.display = 'block';
    document.getElementById('csv-import-btn').disabled = false;
}

async function processCSVImport() {
    if (!csvData || csvData.length === 0) {
        alert('No data to import');
        return;
    }

    const importBtn = document.getElementById('csv-import-btn');
    importBtn.disabled = true;
    importBtn.textContent = 'Importing...';

    try {
        const response = await fetch('/api/wheels/import-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wheels: csvData })
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Successfully imported ${result.imported} wheels!`);
            await loadWheels();
            closeCSVImportModal();
            switchView('wheels');
        } else {
            const error = await response.json();
            alert(`Error importing wheels: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Error importing wheels. Please try again.');
    } finally {
        importBtn.disabled = false;
        importBtn.textContent = 'Import Wheels';
    }
}
