// API Base URL
const API_URL = 'http://localhost:5000/api';

// Global Variables
let currentUser = null;
let authToken = null;
let currentComplaintId = null;

// Helper: fetch and safely parse JSON, attach diagnostics for non-JSON responses
async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    let data = null;
    if (contentType.includes('application/json')) {
        try {
            data = JSON.parse(text);
        } catch (err) {
            // invalid JSON
            throw new Error(`Invalid JSON response from ${url}: ${err.message} -- body: ${text}`);
        }
    }

    return {
        response,
        ok: response.ok,
        status: response.status,
        data,   // parsed JSON or null if not JSON
        text,   // raw text body
        contentType
    };
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCategories();
});

// ==================== AUTH FUNCTIONS ====================

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
        authToken = token;
        currentUser = user;
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('loginLink').classList.add('hidden');
    document.getElementById('registerLink').classList.add('hidden');
    document.getElementById('submitLink').classList.remove('hidden');
    document.getElementById('trackLink').classList.remove('hidden');
    document.getElementById('logoutLink').classList.remove('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;

    if (currentUser.role === 'admin') {
        document.getElementById('adminLink').classList.remove('hidden');
    }

    showPage('submit');
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginLink').classList.remove('hidden');
    document.getElementById('registerLink').classList.remove('hidden');
    document.getElementById('submitLink').classList.add('hidden');
    document.getElementById('trackLink').classList.add('hidden');
    document.getElementById('adminLink').classList.add('hidden');
    document.getElementById('logoutLink').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');

    showPage('login');
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showMessage('loginMessage', 'Please enter email and password', 'error');
        return;
    }

    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (ok && data) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            authToken = data.token;
            currentUser = data.user;

            showMessage('loginMessage', 'Login successful!', 'success');
            setTimeout(() => {
                updateUIForLoggedInUser();
            }, 1000);
        } else {
            showMessage('loginMessage', (data && (data.error || data.message)) || text || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginMessage', 'Network error. Please try again.', 'error');
    }
}

async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        showMessage('registerMessage', 'Please fill in all required fields', 'error');
        return;
    }

    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        if (ok && data) {
            showMessage('registerMessage', 'Registration successful! Please login.', 'success');
            setTimeout(() => {
                showPage('login');
            }, 2000);
        } else {
            showMessage('registerMessage', (data && (data.error || data.message)) || text || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('registerMessage', 'Network error. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    updateUIForLoggedOutUser();
    showMessage('loginMessage', 'Logged out successfully', 'success');
}

// ==================== CATEGORY FUNCTIONS ====================

async function loadCategories() {
    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/categories`);

        if (ok && Array.isArray(data)) {
            const categorySelect = document.getElementById('category');
            categorySelect.innerHTML = '<option value="">Select a category</option>';
            data.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_id;
                option.textContent = cat.category_name;
                categorySelect.appendChild(option);
            });
        } else {
            console.error('Failed to load categories:', text);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ==================== COMPLAINT FUNCTIONS ====================

async function submitComplaint() {
    const categoryId = document.getElementById('category').value;
    const subject = document.getElementById('subject').value.trim();
    const description = document.getElementById('description').value.trim();
    const priority = document.getElementById('priority').value;
    const attachments = document.getElementById('attachments').files;

    if (!categoryId || !subject || !description) {
        showMessage('submitMessage', 'Please fill in all required fields', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('category_id', categoryId);
    formData.append('subject', subject);
    formData.append('description', description);
    formData.append('priority', priority);

    for (let i = 0; i < attachments.length; i++) {
        formData.append('attachments', attachments[i]);
    }

    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (ok && data) {
            showMessage('submitMessage', `Complaint submitted successfully! ID: ${data.complaintNumber}`, 'success');

            // Clear form
            document.getElementById('category').value = '';
            document.getElementById('subject').value = '';
            document.getElementById('description').value = '';
            document.getElementById('priority').value = 'medium';
            document.getElementById('attachments').value = '';

            setTimeout(() => {
                showPage('track');
            }, 2000);
        } else {
            showMessage('submitMessage', (data && (data.error || data.message)) || text || 'Failed to submit complaint', 'error');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showMessage('submitMessage', 'Network error. Please try again.', 'error');
    }
}

async function loadMyComplaints() {
    const status = document.getElementById('statusFilter').value;
    const search = document.getElementById('searchBox').value.trim();

    let url = `${API_URL}/complaints/my-complaints?status=${status}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }

    try {
        const { ok, data, text } = await fetchJson(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (ok && Array.isArray(data)) {
            displayComplaints(data, 'complaintsList', false);
        } else {
            console.error('Failed to load my complaints:', text);
            document.getElementById('complaintsList').innerHTML = '<div class="loading">Error loading complaints</div>';
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        document.getElementById('complaintsList').innerHTML = 
            '<div class="loading">Error loading complaints</div>';
    }
}

async function loadAllComplaints() {
    const status = document.getElementById('adminStatusFilter').value;
    const priority = document.getElementById('adminPriorityFilter').value;
    const search = document.getElementById('adminSearchBox').value.trim();

    let url = `${API_URL}/complaints?status=${status}&priority=${priority}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }

    try {
        const { ok, data, text } = await fetchJson(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (ok && Array.isArray(data)) {
            displayComplaints(data, 'adminComplaintsList', true);
        } else {
            console.error('Failed to load all complaints:', text);
            document.getElementById('adminComplaintsList').innerHTML = '<div class="loading">Error loading complaints</div>';
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        document.getElementById('adminComplaintsList').innerHTML = 
            '<div class="loading">Error loading complaints</div>';
    }
}

function displayComplaints(complaints, containerId, isAdmin) {
    const container = document.getElementById(containerId);

    if (complaints.length === 0) {
        container.innerHTML = '<div class="loading">No complaints found</div>';
        return;
    }

    let html = '';
    complaints.forEach(complaint => {
        html += `
            <div class="complaint-card" onclick="viewComplaintDetail(${complaint.complaint_id})">
                <div class="complaint-header">
                    <div class="complaint-title">
                        <h3>${complaint.subject}</h3>
                        <p class="complaint-id">ID: ${complaint.complaint_number}</p>
                    </div>
                    <div class="complaint-badges">
                        <span class="badge priority-${complaint.priority}">${complaint.priority.toUpperCase()}</span>
                        <span class="badge status-${complaint.status}">${complaint.status.replace('-', ' ').toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="complaint-meta">
                    <div><strong>Category:</strong> ${complaint.category_name}</div>
                    ${isAdmin ? `<div><strong>User:</strong> ${complaint.user_name}</div>` : ''}
                    <div><strong>Submitted:</strong> ${formatDate(complaint.created_at)}</div>
                </div>
                
                <div class="complaint-description">
                    ${complaint.description.substring(0, 150)}${complaint.description.length > 150 ? '...' : ''}
                </div>
                
                ${isAdmin ? `
                <div class="complaint-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-primary" onclick="openUpdateModal(${complaint.complaint_id})">Update Status</button>
                </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

async function viewComplaintDetail(complaintId) {
    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/complaints/${complaintId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const complaint = ok ? data : null;

        let html = `
            <h2>${complaint.subject}</h2>
            <div class="complaint-badges">
                <span class="badge priority-${complaint.priority}">${complaint.priority.toUpperCase()}</span>
                <span class="badge status-${complaint.status}">${complaint.status.replace('-', ' ').toUpperCase()}</span>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <p><strong>Complaint ID:</strong> ${complaint.complaint_number}</p>
                <p><strong>Category:</strong> ${complaint.category_name}</p>
                <p><strong>Name:</strong> ${complaint.user_name}</p>
                <p><strong>Email:</strong> ${complaint.user_email}</p>
                ${complaint.user_phone ? `<p><strong>Phone:</strong> ${complaint.user_phone}</p>` : ''}
                <p><strong>Submitted:</strong> ${formatDate(complaint.created_at)}</p>
                ${complaint.resolved_at ? `<p><strong>Resolved:</strong> ${formatDate(complaint.resolved_at)}</p>` : ''}
            </div>
            
            <div style="margin-top: 1.5rem;">
                <h4>Description:</h4>
                <p>${complaint.description}</p>
            </div>
        `;

    if (complaint && complaint.attachments && complaint.attachments.length > 0) {
            html += `
                <div style="margin-top: 1.5rem;">
                    <h4>Attachments:</h4>
                    <ul>
                        ${complaint.attachments.map(att => `
                            <li><a href="${API_URL.replace('/api', '')}/${att.file_path}" target="_blank">${att.file_name}</a></li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

    if (complaint && complaint.updates && complaint.updates.length > 0) {
            html += `
                <div class="updates-timeline">
                    <h4>📝 Status Updates</h4>
                    ${complaint.updates.map(update => `
                        <div class="update-item">
                            <div class="update-header">
                                <span class="badge status-${update.new_status}">${update.new_status.replace('-', ' ').toUpperCase()}</span>
                                <span class="update-time">${formatDate(update.created_at)}</span>
                            </div>
                            ${update.note ? `<p class="update-note">${update.note}</p>` : ''}
                            <small>Updated by: ${update.updated_by_name}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (complaint) {
            document.getElementById('modalBody').innerHTML = html;
            document.getElementById('detailModal').classList.add('show');
        } else {
            console.error('Failed to load complaint detail:', text);
        }
    } catch (error) {
        console.error('Error loading complaint details:', error);
    }
}

function openUpdateModal(complaintId) {
    currentComplaintId = complaintId;
    document.getElementById('updateModal').classList.add('show');
}

async function confirmStatusUpdate() {
    const status = document.getElementById('newStatus').value;
    const note = document.getElementById('updateNote').value.trim();

    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/complaints/${currentComplaintId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, note })
        });

        if (ok) {
            closeUpdateModal();
            loadAllComplaints();
            loadStats();
            alert('Status updated successfully!');
        } else {
            alert((data && (data.error || data.message)) || text || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Network error. Please try again.');
    }
}

// ==================== ADMIN FUNCTIONS ====================

async function loadStats() {
    try {
        const { ok, data, text } = await fetchJson(`${API_URL}/complaints/stats/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const stats = ok ? data : null;

        const html = `
            <div class="stat-card">
                <h3>Total Complaints</h3>
                <p>${stats.summary.total}</p>
            </div>
            <div class="stat-card pending">
                <h3>Pending</h3>
                <p>${stats.summary.pending}</p>
            </div>
            <div class="stat-card in-progress">
                <h3>In Progress</h3>
                <p>${stats.summary.in_progress}</p>
            </div>
            <div class="stat-card resolved">
                <h3>Resolved</h3>
                <p>${stats.summary.resolved}</p>
            </div>
        `;
        if (stats) {
            document.getElementById('statsContainer').innerHTML = html;
        } else {
            console.error('Failed to load stats:', text);
            document.getElementById('statsContainer').innerHTML = '<div class="loading">Error loading statistics</div>';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('statsContainer').innerHTML = 
            '<div class="loading">Error loading statistics</div>';
    }
}

// ==================== UTILITY FUNCTIONS ====================

function showPage(pageName) {
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    document.getElementById(`${pageName}Page`).classList.add('active');

    // Load data when page is shown
    if (pageName === 'track' && authToken) {
        loadMyComplaints();
    } else if (pageName === 'admin' && authToken) {
        loadStats();
        loadAllComplaints();
    }
}

function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('show');
}

function closeUpdateModal() {
    document.getElementById('updateModal').classList.remove('show');
    document.getElementById('updateNote').value = '';
    currentComplaintId = null;
}

// Close modals when clicking outside
window.onclick = function(event) {
    const detailModal = document.getElementById('detailModal');
    const updateModal = document.getElementById('updateModal');
    
    if (event.target === detailModal) {
        closeModal();
    }
    if (event.target === updateModal) {
        closeUpdateModal();
    }
}