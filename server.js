const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

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
const TEMPLATES_FILE = path.join(dataDir, 'wheel-templates.json');

// Initialize data files if they don't exist
[OEM_PARTS_FILE, WHEELS_FILE, TEMPLATES_FILE].forEach(file => {
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

// QR Code Label Generation
app.get('/api/wheels/:id/qr-label', async (req, res) => {
    const wheels = readData(WHEELS_FILE);
    const wheel = wheels.find(w => w.id === req.params.id);
    
    if (!wheel) {
        return res.status(404).json({ error: 'Wheel not found' });
    }
    
    try {
        // Generate QR code as data URL
        const qrData = wheel.sku; // You can include more data if needed
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 400,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        // Create HTML for 2x2 thermal label (576x576 pixels at 288 DPI)
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
    <div class="sku">${wheel.sku}</div>
</body>
</html>`;
        
        res.send(labelHTML);
    } catch (error) {
        console.error('Error generating QR label:', error);
        res.status(500).json({ error: 'Failed to generate QR label' });
    }
});

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
app.get('/api/wheel-templates', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    res.json(templates);
});

app.post('/api/wheel-templates', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    const newTemplate = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    templates.push(newTemplate);
    writeData(TEMPLATES_FILE, templates);
    res.json(newTemplate);
});

app.put('/api/wheel-templates/:id', (req, res) => {
    const templates = readData(TEMPLATES_FILE);
    const index = templates.findIndex(t => t.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Template not found' });
    }

    templates[index] = {
        ...templates[index],
        ...req.body,
        updatedAt: new Date().toISOString()
    };

    writeData(TEMPLATES_FILE, templates);
    res.json(templates[index]);
});

app.delete('/api/wheel-templates/:id', (req, res) => {
    let templates = readData(TEMPLATES_FILE);
    const template = templates.find(t => t.id === req.params.id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    templates = templates.filter(t => t.id !== req.params.id);
    writeData(TEMPLATES_FILE, templates);
    res.json({ message: 'Template deleted successfully' });
});

// CSV Import Route
app.post('/api/wheels/import-csv', (req, res) => {
    try {
        const { wheels: csvWheels } = req.body;

        if (!csvWheels || !Array.isArray(csvWheels)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const wheels = readData(WHEELS_FILE);
        let imported = 0;

        csvWheels.forEach(csvWheel => {
            // Generate SKU for each wheel
            const sku = generateSKU(csvWheel);

            const newWheel = {
                id: uuidv4(),
                sku: sku,
                year: csvWheel.year || '',
                make: csvWheel.make || '',
                model: csvWheel.model || '',
                trim: csvWheel.trim || '',
                size: csvWheel.size || '',
                boltPattern: csvWheel.boltPattern || '',
                offset: csvWheel.offset || '',
                oemPart: csvWheel.oemPart || '',
                condition: csvWheel.condition || 'Good',
                price: csvWheel.price || '0',
                status: csvWheel.status || 'Available',
                notes: csvWheel.notes || '',
                images: [],
                createdAt: new Date().toISOString()
            };

            wheels.push(newWheel);
            imported++;
        });

        writeData(WHEELS_FILE, wheels);
        res.json({ message: 'Import successful', imported });
    } catch (error) {
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'Failed to import CSV' });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Subaru Inventory System running on http://0.0.0.0:${PORT}`);
    console.log(`Data stored in: ${dataDir}`);
    console.log(`Uploads stored in: ${uploadsDir}`);
});
