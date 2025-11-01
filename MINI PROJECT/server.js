const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'complaint_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promiseDb = db.promise();

// File Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, DOCX allowed.'));
    }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Generate unique complaint number
const generateComplaintNumber = () => {
    const prefix = 'CMP';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
};

// ================== AUTH ROUTES ==================

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const [existingUser] = await promiseDb.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await promiseDb.query(
            'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
            [name, email, phone, hashedPassword]
        );

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await promiseDb.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ================== CATEGORY ROUTES ==================

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await promiseDb.query(
            'SELECT * FROM categories ORDER BY category_name'
        );
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ================== COMPLAINT ROUTES ==================

// Submit new complaint
app.post('/api/complaints', authenticateToken, upload.array('attachments', 5), async (req, res) => {
    const connection = await promiseDb.getConnection();
    
    try {
        await connection.beginTransaction();

        const { category_id, subject, description, priority } = req.body;
        const userId = req.user.userId;

        if (!category_id || !subject || !description) {
            await connection.rollback();
            return res.status(400).json({ error: 'Category, subject, and description are required' });
        }

        const complaintNumber = generateComplaintNumber();

        const [result] = await connection.query(
            'INSERT INTO complaints (complaint_number, user_id, category_id, subject, description, priority) VALUES (?, ?, ?, ?, ?, ?)',
            [complaintNumber, userId, category_id, subject, description, priority || 'medium']
        );

        const complaintId = result.insertId;

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await connection.query(
                    'INSERT INTO attachments (complaint_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
                    [complaintId, file.originalname, file.path, file.mimetype, file.size]
                );
            }
        }

        await connection.query(
            'INSERT INTO complaint_updates (complaint_id, updated_by, new_status, note) VALUES (?, ?, ?, ?)',
            [complaintId, userId, 'pending', 'Complaint submitted']
        );

        await connection.commit();

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaintId: complaintId,
            complaintNumber: complaintNumber
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting complaint:', error);
        res.status(500).json({ error: 'Failed to submit complaint' });
    } finally {
        connection.release();
    }
});

// Get user's complaints
app.get('/api/complaints/my-complaints', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, search } = req.query;

        let query = `
            SELECT c.*, cat.category_name, u.name as user_name, u.email as user_email
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.category_id
            JOIN users u ON c.user_id = u.user_id
            WHERE c.user_id = ?
        `;
        const params = [userId];

        if (status && status !== 'all') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (c.complaint_number LIKE ? OR c.subject LIKE ? OR cat.category_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY c.created_at DESC';

        const [complaints] = await promiseDb.query(query, params);
        res.json(complaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// Get all complaints (Admin only)
app.get('/api/complaints', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { status, priority, search } = req.query;

        let query = `
            SELECT c.*, cat.category_name, u.name as user_name, u.email as user_email, u.phone as user_phone
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.category_id
            JOIN users u ON c.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        if (priority && priority !== 'all') {
            query += ' AND c.priority = ?';
            params.push(priority);
        }

        if (search) {
            query += ' AND (c.complaint_number LIKE ? OR c.subject LIKE ? OR cat.category_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY c.created_at DESC';

        const [complaints] = await promiseDb.query(query, params);
        res.json(complaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// Get complaint by ID with details
app.get('/api/complaints/:id', authenticateToken, async (req, res) => {
    try {
        const complaintId = req.params.id;

        const [complaints] = await promiseDb.query(
            `SELECT c.*, cat.category_name, u.name as user_name, u.email as user_email, u.phone as user_phone
             FROM complaints c
             JOIN categories cat ON c.category_id = cat.category_id
             JOIN users u ON c.user_id = u.user_id
             WHERE c.complaint_id = ?`,
            [complaintId]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        const complaint = complaints[0];

        if (req.user.role !== 'admin' && complaint.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [updates] = await promiseDb.query(
            `SELECT cu.*, u.name as updated_by_name
             FROM complaint_updates cu
             JOIN users u ON cu.updated_by = u.user_id
             WHERE cu.complaint_id = ?
             ORDER BY cu.created_at DESC`,
            [complaintId]
        );

        const [attachments] = await promiseDb.query(
            'SELECT * FROM attachments WHERE complaint_id = ?',
            [complaintId]
        );

        res.json({
            ...complaint,
            updates,
            attachments
        });
    } catch (error) {
        console.error('Error fetching complaint:', error);
        res.status(500).json({ error: 'Failed to fetch complaint details' });
    }
});

// Update complaint status (Admin only)
app.put('/api/complaints/:id/status', authenticateToken, async (req, res) => {
    const connection = await promiseDb.getConnection();
    
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        await connection.beginTransaction();

        const complaintId = req.params.id;
        const { status, note } = req.body;

        const [complaints] = await connection.query(
            'SELECT status FROM complaints WHERE complaint_id = ?',
            [complaintId]
        );

        if (complaints.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Complaint not found' });
        }

        const oldStatus = complaints[0].status;

        let updateQuery = 'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP';
        const updateParams = [status];

        if (status === 'resolved' || status === 'closed') {
            updateQuery += ', resolved_at = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE complaint_id = ?';
        updateParams.push(complaintId);

        await connection.query(updateQuery, updateParams);

        await connection.query(
            'INSERT INTO complaint_updates (complaint_id, updated_by, old_status, new_status, note) VALUES (?, ?, ?, ?, ?)',
            [complaintId, req.user.userId, oldStatus, status, note || `Status changed from ${oldStatus} to ${status}`]
        );

        await connection.commit();

        res.json({ message: 'Complaint status updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating complaint:', error);
        res.status(500).json({ error: 'Failed to update complaint status' });
    } finally {
        connection.release();
    }
});

// Get complaint statistics (Admin only)
app.get('/api/complaints/stats/dashboard', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const [stats] = await promiseDb.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
            FROM complaints
        `);

        const [categoryStats] = await promiseDb.query(`
            SELECT cat.category_name, COUNT(*) as count
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.category_id
            GROUP BY cat.category_id, cat.category_name
            ORDER BY count DESC
        `);

        res.json({
            summary: stats[0],
            by_category: categoryStats
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// ================== SERVER START ==================

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'complaint_system'}`);
});