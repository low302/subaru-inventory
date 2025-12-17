const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
[dataDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Data files
const OEM_PARTS_FILE = path.join(dataDir, 'oem-parts.json');
const WHEELS_FILE = path.join(dataDir, 'wheels.json');

// Initialize data files if they don't exist
[OEM_PARTS_FILE, WHEELS_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2));
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// Helper functions
function readData(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// OEM Parts Routes
app.get('/api/oem-parts', (req, res) => {
    const parts = readData(OEM_PARTS_FILE);
    res.json(parts);
});

app.post('/api/oem-parts', (req, res) => {
    const parts = readData(OEM_PARTS_FILE);
    const newPart = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    parts.push(newPart);
    writeData(OEM_PARTS_FILE, parts);
    res.json(newPart);
});

app.put('/api/oem-parts/:id', (req, res) => {
    const parts = readData(OEM_PARTS_FILE);
    const index = parts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Part not found' });
    }
    
    parts[index] = {
        ...parts[index],
        ...req.body,
        updatedAt: new Date().toISOString()
    };
    
    writeData(OEM_PARTS_FILE, parts);
    res.json(parts[index]);
});

app.delete('/api/oem-parts/:id', (req, res) => {
    let parts = readData(OEM_PARTS_FILE);
    const part = parts.find(p => p.id === req.params.id);
    
    if (!part) {
        return res.status(404).json({ error: 'Part not found' });
    }
    
    parts = parts.filter(p => p.id !== req.params.id);
    writeData(OEM_PARTS_FILE, parts);
    res.json({ message: 'Part deleted successfully' });
});

// Wheels Routes
app.get('/api/wheels', (req, res) => {
    const wheels = readData(WHEELS_FILE);
    res.json(wheels);
});

app.post('/api/wheels', upload.array('images', 10), (req, res) => {
    const wheels = readData(WHEELS_FILE);
    
    const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    const newWheel = {
        id: uuidv4(),
        sku: req.body.sku || `WHEEL-${uuidv4().substring(0, 8).toUpperCase()}`,
        ...req.body,
        images: imagePaths,
        createdAt: new Date().toISOString()
    };
    
    wheels.push(newWheel);
    writeData(WHEELS_FILE, wheels);
    res.json(newWheel);
});

app.put('/api/wheels/:id', upload.array('images', 10), (req, res) => {
    const wheels = readData(WHEELS_FILE);
    const index = wheels.findIndex(w => w.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Wheel not found' });
    }
    
    const existingImages = wheels[index].images || [];
    const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    wheels[index] = {
        ...wheels[index],
        ...req.body,
        images: [...existingImages, ...newImages],
        updatedAt: new Date().toISOString()
    };
    
    writeData(WHEELS_FILE, wheels);
    res.json(wheels[index]);
});

app.delete('/api/wheels/:id', (req, res) => {
    let wheels = readData(WHEELS_FILE);
    const wheel = wheels.find(w => w.id === req.params.id);
    
    if (!wheel) {
        return res.status(404).json({ error: 'Wheel not found' });
    }
    
    // Delete associated images
    if (wheel.images) {
        wheel.images.forEach(imagePath => {
            const fullPath = path.join(__dirname, imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });
    }
    
    wheels = wheels.filter(w => w.id !== req.params.id);
    writeData(WHEELS_FILE, wheels);
    res.json({ message: 'Wheel deleted successfully' });
});

app.delete('/api/wheels/:id/image', (req, res) => {
    const wheels = readData(WHEELS_FILE);
    const wheel = wheels.find(w => w.id === req.params.id);
    
    if (!wheel) {
        return res.status(404).json({ error: 'Wheel not found' });
    }
    
    const imagePath = req.body.imagePath;
    const fullPath = path.join(__dirname, imagePath);
    
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
    
    wheel.images = wheel.images.filter(img => img !== imagePath);
    writeData(WHEELS_FILE, wheels);
    res.json(wheel);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Subaru Inventory System running on http://0.0.0.0:${PORT}`);
    console.log(`Data stored in: ${dataDir}`);
    console.log(`Uploads stored in: ${uploadsDir}`);
});
