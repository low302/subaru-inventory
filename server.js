require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult, param } = require('express-validator');
const sharp = require('sharp');

// Import utilities and middleware
const logger = require('./utils/logger');
const { asyncHandler } = require('./utils/asyncHandler');
const constants = require('./config/constants');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

async function ensureDirectories() {
    for (const dir of [dataDir, uploadsDir]) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
}

// Data files
const OEM_PARTS_FILE = path.join(dataDir, 'oem-parts.json');
const WHEELS_FILE = path.join(dataDir, 'wheels.json');
const TEMPLATES_FILE = path.join(dataDir, 'wheel-templates.json');
const USERS_FILE = path.join(dataDir, 'users.json');

// Initialize data files if they don't exist
async function initializeDataFiles() {
    const files = [
        { path: OEM_PARTS_FILE, data: [] },
        { path: WHEELS_FILE, data: [] },
        { path: TEMPLATES_FILE, data: [] },
        {
            path: USERS_FILE,
            data: [{
                id: uuidv4(),
                username: process.env.ADMIN_USERNAME || 'admin',
                password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
                role: 'admin',
                createdAt: new Date().toISOString()
            }]
        }
    ];

    for (const file of files) {
        try {
            await fs.access(file.path);
        } catch {
            await fs.writeFile(file.path, JSON.stringify(file.data, null, 2));
        }
    }
}

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: null
        }
    },
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: false
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Prevent HTTPS upgrade attempts and force HTTP
app.use((req, res, next) => {
    // Remove any HSTS headers
    res.removeHeader('Strict-Transport-Security');
    // Ensure no upgrade-insecure-requests
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "script-src 'self' 'unsafe-inline' https://unpkg.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self'");
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true
});

app.use('/api/', limiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// Configure multer for secure file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate safe filename with whitelisted extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
        const safeExt = allowedExts.includes(ext) ? ext : '.jpg';
        const uniqueName = `${uuidv4()}${safeExt}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
        files: parseInt(process.env.MAX_FILES) || 10
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
});

// Helper functions with async support
async function readData(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Error reading ${file}:`, error);
        return [];
    }
}

async function writeData(file, data) {
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 2));
    } catch (error) {
        logger.error(`Error writing ${file}:`, error);
        throw error;
    }
}

// Input sanitization
function sanitizeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Validate file path to prevent directory traversal
function isPathSafe(filePath, baseDir) {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedPath.startsWith(resolvedBase);
}

// Authentication middleware
const authenticate = asyncHandler(async (req, res, next) => {
    const token = req.session.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
        req.user = decoded;
        next();
    } catch (error) {
        logger.warn('Invalid token attempt');
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
});

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

// Auth Routes
app.post('/api/auth/login', authLimiter, [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], validate, asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const users = await readData(USERS_FILE);
    const user = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        logger.warn(`Failed login attempt for username: ${username}`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'dev-jwt-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    req.session.token = token;
    logger.info(`User logged in: ${username}`);

    res.json({
        success: true,
        data: {
            token,
            user: { id: user.id, username: user.username, role: user.role }
        }
    });
}));

app.post('/api/auth/logout', authenticate, asyncHandler(async (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
    res.json({ success: true, data: req.user });
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// OEM Parts Routes with validation
app.get('/api/oem-parts', authenticate, asyncHandler(async (req, res) => {
    const parts = await readData(OEM_PARTS_FILE);
    res.json({ success: true, data: parts });
}));

app.post('/api/oem-parts', authenticate, [
    body('partNumber').trim().notEmpty().isLength({ max: 50 }).withMessage('Part number is required (max 50 chars)'),
    body('oemPartNumber').optional().trim().isLength({ max: 50 }),
    body('partName').trim().notEmpty().isLength({ max: 100 }).withMessage('Part name is required (max 100 chars)'),
    body('category').optional().trim().isLength({ max: 50 }),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('location').optional().trim().isLength({ max: 100 }),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('notes').optional().trim().isLength({ max: 500 })
], validate, asyncHandler(async (req, res) => {
    const parts = await readData(OEM_PARTS_FILE);
    const newPart = {
        id: uuidv4(),
        partNumber: req.body.partNumber,
        oemPartNumber: req.body.oemPartNumber || '',
        partName: req.body.partName,
        category: req.body.category || '',
        quantity: parseInt(req.body.quantity),
        location: req.body.location || '',
        price: req.body.price || '0',
        notes: req.body.notes || '',
        createdAt: new Date().toISOString(),
        createdBy: req.user.username
    };
    parts.push(newPart);
    await writeData(OEM_PARTS_FILE, parts);
    logger.info(`OEM part created: ${newPart.partNumber} by ${req.user.username}`);
    res.status(201).json({ success: true, data: newPart });
}));

app.put('/api/oem-parts/:id', authenticate, [
    param('id').isUUID().withMessage('Invalid part ID'),
    body('partNumber').optional().trim().isLength({ max: 50 }),
    body('quantity').optional().isInt({ min: 0 }),
    body('price').optional().isFloat({ min: 0 })
], validate, asyncHandler(async (req, res) => {
    const parts = await readData(OEM_PARTS_FILE);
    const index = parts.findIndex(p => p.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Part not found' });
    }

    parts[index] = {
        ...parts[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.username
    };

    await writeData(OEM_PARTS_FILE, parts);
    logger.info(`OEM part updated: ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, data: parts[index] });
}));

app.delete('/api/oem-parts/:id', authenticate, [
    param('id').isUUID().withMessage('Invalid part ID')
], validate, asyncHandler(async (req, res) => {
    let parts = await readData(OEM_PARTS_FILE);
    const part = parts.find(p => p.id === req.params.id);

    if (!part) {
        return res.status(404).json({ success: false, error: 'Part not found' });
    }

    parts = parts.filter(p => p.id !== req.params.id);
    await writeData(OEM_PARTS_FILE, parts);
    logger.info(`OEM part deleted: ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, message: 'Part deleted successfully' });
}));

// Wheels Routes with validation
app.get('/api/wheels', authenticate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);
    res.json({ success: true, data: wheels });
}));

app.post('/api/wheels', authenticate, upload.array('images', 10), asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);

    // Process and optimize images
    const imagePaths = [];
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            try {
                // Optimize image using sharp
                const optimizedPath = path.join(uploadsDir, `opt-${file.filename}`);
                await sharp(file.path)
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toFile(optimizedPath);

                // Remove original, use optimized
                await fs.unlink(file.path);
                await fs.rename(optimizedPath, file.path);

                imagePaths.push(`/uploads/${file.filename}`);
            } catch (error) {
                logger.error('Error optimizing image:', error);
                imagePaths.push(`/uploads/${file.filename}`);
            }
        }
    }

    const newWheel = {
        id: uuidv4(),
        sku: req.body.sku || `WHEEL-${uuidv4().substring(0, 8).toUpperCase()}`,
        year: req.body.year || '',
        make: req.body.make || '',
        model: req.body.model || '',
        trim: req.body.trim || '',
        size: req.body.size || '',
        boltPattern: req.body.boltPattern || '',
        offset: req.body.offset || '',
        oemPart: req.body.oemPart || '',
        condition: req.body.condition || 'Good',
        price: req.body.price || '0',
        status: req.body.status || 'Available',
        notes: req.body.notes || '',
        images: imagePaths,
        // NEW: Category fields
        category: req.body.category || 'UNKNOWN',
        subcategory: req.body.subcategory || '',
        tags: req.body.tags || [],
        // NEW: Sale tracking (empty until sold)
        soldAt: null,
        soldPrice: null,
        soldTo: null,
        soldNotes: null,
        createdAt: new Date().toISOString(),
        createdBy: req.user.username,
        updatedAt: null,
        updatedBy: null
    };

    wheels.push(newWheel);
    await writeData(WHEELS_FILE, wheels);
    logger.info(`Wheel created: ${newWheel.sku} by ${req.user.username}`);
    res.status(201).json({ success: true, data: newWheel });
}));

app.put('/api/wheels/:id', authenticate, upload.array('images', 10), [
    param('id').isUUID().withMessage('Invalid wheel ID')
], validate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);
    const index = wheels.findIndex(w => w.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Wheel not found' });
    }

    const existingImages = wheels[index].images || [];
    const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    wheels[index] = {
        ...wheels[index],
        ...req.body,
        images: [...existingImages, ...newImages],
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.username
    };

    await writeData(WHEELS_FILE, wheels);
    logger.info(`Wheel updated: ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, data: wheels[index] });
}));

app.delete('/api/wheels/:id', authenticate, [
    param('id').isUUID().withMessage('Invalid wheel ID')
], validate, asyncHandler(async (req, res) => {
    let wheels = await readData(WHEELS_FILE);
    const wheel = wheels.find(w => w.id === req.params.id);

    if (!wheel) {
        return res.status(404).json({ success: false, error: 'Wheel not found' });
    }

    // Delete associated images with error handling
    if (wheel.images && wheel.images.length > 0) {
        for (const imagePath of wheel.images) {
            try {
                const fullPath = path.join(__dirname, imagePath);

                // Validate path safety
                if (!isPathSafe(fullPath, uploadsDir)) {
                    logger.warn(`Attempted unsafe path deletion: ${imagePath}`);
                    continue;
                }

                await fs.unlink(fullPath);
            } catch (error) {
                logger.error(`Error deleting image ${imagePath}:`, error);
            }
        }
    }

    wheels = wheels.filter(w => w.id !== req.params.id);
    await writeData(WHEELS_FILE, wheels);
    logger.info(`Wheel deleted: ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, message: 'Wheel deleted successfully' });
}));

app.delete('/api/wheels/:id/image', authenticate, [
    param('id').isUUID().withMessage('Invalid wheel ID'),
    body('imagePath').notEmpty().withMessage('Image path is required')
], validate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);
    const wheel = wheels.find(w => w.id === req.params.id);

    if (!wheel) {
        return res.status(404).json({ success: false, error: 'Wheel not found' });
    }

    const imagePath = req.body.imagePath;
    const fullPath = path.join(__dirname, imagePath);

    // CRITICAL: Validate path to prevent directory traversal
    if (!isPathSafe(fullPath, uploadsDir)) {
        logger.warn(`Path traversal attempt blocked: ${imagePath} by ${req.user.username}`);
        return res.status(400).json({ success: false, error: 'Invalid image path' });
    }

    try {
        await fs.unlink(fullPath);
    } catch (error) {
        logger.error(`Error deleting image ${imagePath}:`, error);
    }

    wheel.images = wheel.images.filter(img => img !== imagePath);
    await writeData(WHEELS_FILE, wheels);
    logger.info(`Image deleted from wheel ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, data: wheel });
}));

// NEW: Mark wheel as sold
app.patch('/api/wheels/:id/mark-sold', authenticate, [
    param('id').isUUID().withMessage('Invalid wheel ID'),
    body('soldPrice').isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
    body('soldAt').optional().isISO8601().withMessage('Invalid date format'),
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
        soldPrice: req.body.soldPrice.toString(),
        soldTo: req.body.soldTo || '',
        soldNotes: req.body.soldNotes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.username
    };

    await writeData(WHEELS_FILE, wheels);
    logger.info(`Wheel marked as sold: ${wheels[index].sku} for $${req.body.soldPrice} by ${req.user.username}`);
    res.json({ success: true, data: wheels[index] });
}));

// NEW: Get category statistics
app.get('/api/wheels/stats/categories', authenticate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);

    const stats = {
        byCategory: {},
        byStatus: {},
        totalWheels: wheels.length,
        totalValue: 0,
        availableCount: 0,
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
            stats.availableCount++;
        }
    });

    if (stats.soldStats.count > 0) {
        stats.soldStats.averagePrice = stats.soldStats.totalRevenue / stats.soldStats.count;
    }

    res.json({ success: true, data: stats });
}));

// QR Code Label Generation with XSS protection
app.get('/api/wheels/:id/qr-label', authenticate, [
    param('id').isUUID().withMessage('Invalid wheel ID')
], validate, asyncHandler(async (req, res) => {
    const wheels = await readData(WHEELS_FILE);
    const wheel = wheels.find(w => w.id === req.params.id);

    if (!wheel) {
        return res.status(404).json({ success: false, error: 'Wheel not found' });
    }

    try {
        // Generate QR code as data URL
        const qrData = wheel.sku;
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 400,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Sanitize SKU to prevent XSS
        const safeSku = sanitizeHtml(wheel.sku);

        const labelHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: 2in 2in;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            width: 2in;
            height: 2in;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            padding: 0.1in;
            background: white;
        }
        .qr-code {
            width: 1.5in;
            height: 1.5in;
            margin-bottom: 0.05in;
        }
        .sku {
            font-size: 11pt;
            font-weight: bold;
            text-align: center;
            word-break: break-all;
            line-height: 1.2;
        }
    </style>
</head>
<body>
    <img src="${qrCodeDataURL}" class="qr-code" alt="QR Code">
    <div class="sku">${safeSku}</div>
</body>
</html>`;

        res.send(labelHTML);
    } catch (error) {
        logger.error('Error generating QR label:', error);
        res.status(500).json({ success: false, error: 'Failed to generate QR label' });
    }
}));

// Helper function to generate SKU
function generateSKU(wheelData) {
    const year = wheelData.year || '';
    const make = (wheelData.make || '').substring(0, 3).toUpperCase();
    const model = (wheelData.model || '').substring(0, 3).toUpperCase();
    const size = (wheelData.size || '').replace(/[^0-9x.]/gi, '');
    const bolt = (wheelData.boltPattern || '').replace(/[^0-9x.]/gi, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `SPP-${year}${make}${model}-${size}-${bolt}-${random}`;
}

// Wheel Templates Routes
app.get('/api/wheel-templates', authenticate, asyncHandler(async (req, res) => {
    const templates = await readData(TEMPLATES_FILE);
    res.json({ success: true, data: templates });
}));

app.post('/api/wheel-templates', authenticate, [
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Template name is required'),
    body('year').notEmpty().withMessage('Year is required'),
    body('make').trim().notEmpty().withMessage('Make is required'),
    body('model').trim().notEmpty().withMessage('Model is required')
], validate, asyncHandler(async (req, res) => {
    const templates = await readData(TEMPLATES_FILE);
    const newTemplate = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString(),
        createdBy: req.user.username
    };
    templates.push(newTemplate);
    await writeData(TEMPLATES_FILE, templates);
    logger.info(`Template created: ${newTemplate.name} by ${req.user.username}`);
    res.status(201).json({ success: true, data: newTemplate });
}));

app.put('/api/wheel-templates/:id', authenticate, [
    param('id').isUUID().withMessage('Invalid template ID')
], validate, asyncHandler(async (req, res) => {
    const templates = await readData(TEMPLATES_FILE);
    const index = templates.findIndex(t => t.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Template not found' });
    }

    templates[index] = {
        ...templates[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.username
    };

    await writeData(TEMPLATES_FILE, templates);
    logger.info(`Template updated: ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, data: templates[index] });
}));

app.delete('/api/wheel-templates/:id', authenticate, [
    param('id').isUUID().withMessage('Invalid template ID')
], validate, asyncHandler(async (req, res) => {
    let templates = await readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === req.params.id);

    if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
    }

    templates = templates.filter(t => t.id !== req.params.id);
    await writeData(TEMPLATES_FILE, templates);
    logger.info(`Template deleted: ${req.params.id} by ${req.user.username}`);
    res.json({ success: true, message: 'Template deleted successfully' });
}));

// CSV Import Route with validation and sanitization
app.post('/api/wheels/import-csv', authenticate, [
    body('wheels').isArray().withMessage('Wheels data must be an array'),
    body('wheels.*.year').optional().trim(),
    body('wheels.*.make').optional().trim(),
    body('wheels.*.model').optional().trim()
], validate, asyncHandler(async (req, res) => {
    try {
        const { wheels: csvWheels } = req.body;

        if (!csvWheels || !Array.isArray(csvWheels) || csvWheels.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid or empty data' });
        }

        const wheels = await readData(WHEELS_FILE);
        let imported = 0;

        for (const csvWheel of csvWheels) {
            // Sanitize CSV injection attempts
            const sanitizedWheel = {};
            for (const [key, value] of Object.entries(csvWheel)) {
                if (typeof value === 'string') {
                    // Remove potential CSV injection characters
                    let sanitized = value.trim();
                    if (/^[=+\-@]/.test(sanitized)) {
                        sanitized = "'" + sanitized;
                    }
                    sanitizedWheel[key] = sanitized;
                } else {
                    sanitizedWheel[key] = value;
                }
            }

            const sku = generateSKU(sanitizedWheel);

            const newWheel = {
                id: uuidv4(),
                sku: sku,
                year: sanitizedWheel.year || '',
                make: sanitizedWheel.make || '',
                model: sanitizedWheel.model || '',
                trim: sanitizedWheel.trim || '',
                size: sanitizedWheel.size || '',
                boltPattern: sanitizedWheel.boltPattern || '',
                offset: sanitizedWheel.offset || '',
                oemPart: sanitizedWheel.oemPart || '',
                condition: sanitizedWheel.condition || 'Good',
                price: sanitizedWheel.price || '0',
                status: sanitizedWheel.status || 'Available',
                notes: sanitizedWheel.notes || '',
                images: [],
                createdAt: new Date().toISOString(),
                createdBy: req.user.username
            };

            wheels.push(newWheel);
            imported++;
        }

        await writeData(WHEELS_FILE, wheels);
        logger.info(`CSV import: ${imported} wheels imported by ${req.user.username}`);
        res.json({ success: true, message: 'Import successful', imported });
    } catch (error) {
        logger.error('CSV import error:', error);
        res.status(500).json({ success: false, error: 'Failed to import CSV' });
    }
}));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: 'File too large' });
        }
        return res.status(400).json({ success: false, error: err.message });
    }

    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

// Start server
async function startServer() {
    try {
        await ensureDirectories();
        await initializeDataFiles();

        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Subaru Inventory System running on http://0.0.0.0:${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Data stored in: ${dataDir}`);
            logger.info(`Uploads stored in: ${uploadsDir}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
