# Subaru Parts Inventory System

A modern, sleek web-based inventory management system for tracking Subaru OEM parts and wheel take-offs. Built with Docker for easy deployment and persistent storage across your network.

## Features

### OEM Parts Inventory
- Track part numbers, names, categories, quantities, locations, and prices
- Real-time stock status indicators (In Stock, Low Stock, Out of Stock)
- Search functionality across all fields
- Full CRUD operations (Create, Read, Update, Delete)
- Statistics dashboard with total parts, in-stock count, and low-stock alerts

### Wheel Take-Offs Inventory
- Unique SKU generation for each wheel (format: SPP-YEAR-MAKE-MODEL-SIZE-BOLT-XXXX)
- **Quantity support** - Add multiple wheels at once, each with unique SKU
- Multi-image upload support (up to 10 images per wheel)
- Detailed specifications: year, make, model, trim, size, offset, bolt pattern
- **OEM Part Number tracking** - Link wheels to OEM part numbers
- Condition tracking (Excellent, Good, Fair, Poor)
- Status management (Available, Sold, Reserved, Pending)
- **Quick "Mark as Sold" button** for fast status updates
- **CSV Import/Export** with downloadable template
- **Quick Add Templates** for frequently added wheel specs
- **QR Code Labels** - Generate printable 2"x2" thermal labels
- **QR Code Scanner** - Scan labels with phone camera to instantly lookup wheels
- Individual wheel detail views with edit capability

### Design & Mobile Optimization
- Modern, sleek UI inspired by Cruip's Solid template
- Plus Jakarta Sans typography for a professional look
- **Fully responsive mobile-first design**
- **iOS optimized** - Tested on iPhone 17 Pro Max with safe area support
- **Collapsible sidebar** with hamburger menu for mobile
- **Compact table view** on mobile with optimized column widths
- Touch-friendly buttons (44px minimum touch targets)
- Smooth animations and transitions
- Clean, intuitive interface with real-time search
- No horizontal scrolling on mobile devices

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript (Vanilla ES6+)
- **Storage**: JSON files (persistent server-side storage)
- **File Upload**: Multer for image handling with validation
- **QR Codes**: qrcode library for label generation
- **QR Scanner**: html5-qrcode for camera-based scanning
- **Unique IDs**: UUID v4 for wheel identification
- **Containerization**: Docker & Docker Compose (optional)

## Prerequisites

### Option 1: Node.js (Recommended for development)
- Node.js v14 or higher
- npm (comes with Node.js)

### Option 2: Docker (Recommended for production)
- Docker and Docker Compose installed on your system
- Network access to the server from devices you want to use

## Installation

### Option 1: Running with Node.js

1. **Navigate to the project directory**:
   ```bash
   cd /Users/zaidalia/Documents/GitHub/subaru-inventory
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Open your web browser and navigate to: `http://localhost:3000`
   - From other devices on your network: `http://your-computer-ip:3000`

### Option 2: Running with Docker

1. **Extract or place the project files** in a directory on your server:
   ```bash
   cd /path/to/subaru-inventory
   ```

2. **Build and start the Docker container**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Open your web browser and navigate to: `http://your-server-ip:3000`
   - Or on the local machine: `http://localhost:3000`

## Data Persistence

All data is stored in two locations within the project directory:

- **`./data/`** - Contains JSON files for inventory data
  - `oem-parts.json` - OEM parts data
  - `wheels.json` - Wheel inventory data
  - `wheel-templates.json` - Quick Add templates

- **`./uploads/`** - Contains uploaded images for wheels

These directories are automatically created when the server starts and persist across restarts.

## Network Access

To access the inventory system from other devices on your network:

1. Find your server's IP address:
   ```bash
   # On Linux/Mac
   hostname -I
   
   # On Windows
   ipconfig
   ```

2. On any device connected to the same network, open a web browser and go to:
   ```
   http://your-server-ip:3000
   ```

3. For easier access, you can set up a local DNS entry or bookmark the IP address.

## Usage

### Managing OEM Parts

1. Click the **"OEM Parts"** tab in the navigation
2. Click **"Add Part"** to create a new entry
3. Fill in the required fields:
   - Part Number (required)
   - Part Name (required)
   - Quantity (required)
   - Category, Location, Price, Notes (optional)
4. Click **"Save Part"**

To edit or delete, use the action buttons on each row.

### Managing Wheels

#### Adding Wheels Manually

1. Click the **"Wheels"** tab in the navigation
2. Click **"Add Wheel"** to create a new entry
3. Fill in the required fields:
   - Year (e.g., "2024")
   - Make (Subaru, Toyota, etc. or "Other")
   - Model (Outback, Forester, etc. or "Other")
   - Trim (optional)
   - Size (e.g., "18x7.5")
   - Bolt Pattern (e.g., "5x114.3")
   - Offset (e.g., "+55mm")
   - OEM Part Number (e.g., "28111FL01A")
   - Condition (Excellent, Good, Fair, Poor)
   - Price
   - Status (Available, Pending, Reserved, Sold)
   - **Quantity** - Enter how many wheels to add (each gets unique SKU)
4. Upload images (up to 10) by clicking the upload area
5. Click **"Save Wheel"**

**Note:** SKU is auto-generated based on wheel specs, but can be manually edited.

#### Using Quick Add Templates

1. Click the **"Quick Add"** dropdown
2. Select **"+ Manage Templates"** to create templates
3. Create a template with commonly used specs (saves time!)
4. Use dropdown to select a template and pre-fill the add form

#### Importing from CSV

1. Click **"Import CSV"** button
2. Click **"Download Template"** to get the correct CSV format
3. Fill in your CSV file with wheel data
4. Upload the CSV file
5. Review the preview
6. Click **"Import Wheels"**

Each wheel will be assigned a unique SKU automatically.

#### Viewing & Editing Wheels

- Click on any wheel row to view full details
- In the details modal, click **"Edit"** to modify
- Use **"Print QR Label"** to generate a 2"x2" thermal label
- Click **"Sold"** button in the table to quickly mark as sold
- Delete option appears only in edit mode

#### Scanning QR Codes

1. Print QR labels for your wheels
2. Click **"Scan QR"** button (works best on mobile)
3. Point camera at QR code
4. Wheel details will open automatically

### Search Functionality

Both inventories have real-time search:
- **OEM Parts**: Search by part number, name, or category
- **Wheels**: Search by SKU, model, size, or style

## Docker Commands

**Note**: If you get permission errors, prefix commands with `sudo`:

### Start the container
```bash
# Modern Docker Compose (v2.x+)
docker compose up -d
# OR with sudo if needed
sudo docker compose up -d

# Older Docker Compose (v1.x)
docker-compose up -d
```

### Stop the container
```bash
sudo docker compose down
```

### View logs
```bash
sudo docker compose logs -f
```

### Restart the container
```bash
sudo docker compose restart
```

### Rebuild after code changes
```bash
sudo docker compose up -d --build
```

### Alternative: Add your user to docker group (to avoid sudo)
```bash
sudo usermod -aG docker $USER
# Then logout and login again
```

## Backup

To backup your inventory data:

```bash
# Backup data files
tar -czf inventory-backup-$(date +%Y%m%d).tar.gz data/ uploads/

# Or copy individually
cp -r data/ data-backup-$(date +%Y%m%d)/
cp -r uploads/ uploads-backup-$(date +%Y%m%d)/
```

## Restore

To restore from backup:

```bash
# Stop the container first
docker-compose down

# Extract backup
tar -xzf inventory-backup-YYYYMMDD.tar.gz

# Start the container
docker-compose up -d
```

## Troubleshooting

### Container won't start
- Check if port 3000 is already in use: `netstat -tuln | grep 3000`
- View container logs: `docker-compose logs`

### Can't access from other devices
- Verify the server's firewall allows port 3000
- Ensure devices are on the same network
- Try accessing with the server's IP address directly

### Images not displaying
- Check that the `uploads/` directory has proper permissions
- Verify images were uploaded successfully in the browser console

### Data not persisting
- Ensure the `data/` and `uploads/` volumes are properly mounted
- Check `docker-compose.yml` volume configuration
- Verify directory permissions

## Customization

### Change the port
Edit `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:3000"
```

### Modify styling
Edit `public/styles.css` to customize colors, fonts, and layouts.

### Add fields
1. Update the HTML forms in `public/index.html`
2. Modify the backend routes in `server.js`
3. Update the frontend JavaScript in `public/app.js`

## New Features Added

### Version 1.2 Updates

- **OEM Part Number Field** - Track manufacturer part numbers for wheels
- **Quantity Support** - Add multiple wheels at once with unique SKUs
- **CSV Import/Export** - Bulk import wheels with downloadable template
- **Quick Add Templates** - Save frequently used wheel specs as templates
- **QR Code Labels** - Generate printable thermal labels (2"x2")
- **QR Code Scanner** - Scan labels with phone camera for instant lookup
- **Mark as Sold** - Quick button to mark wheels as sold
- **Mobile Optimization** - Fully responsive with iOS support
- **Collapsible Sidebar** - Hamburger menu for mobile navigation
- **Compact Mobile Tables** - Optimized table layout for small screens
- **UI Reorganization** - Edit/QR moved to details, Sold button in table

## Testing

A comprehensive testing guide is available in [TESTING_GUIDE.md](./TESTING_GUIDE.md).

For code quality review, see [CODE_REVIEW.md](./CODE_REVIEW.md).

## Security Notes

This system is designed for local network use. For production or internet-facing deployments:

1. Add authentication/authorization
2. Use HTTPS with SSL certificates (required for camera access on non-localhost)
3. Implement input validation and sanitization
4. Set up regular automated backups
5. Use a proper database instead of JSON files for larger inventories
6. Add rate limiting to prevent abuse

**Note:** QR code scanning requires HTTPS or localhost due to browser security requirements for camera access.

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f` (Docker) or console output (Node.js)
2. Verify your installation (Node.js or Docker)
3. Ensure proper file permissions on `data/` and `uploads/` directories
4. Review [TESTING_GUIDE.md](./TESTING_GUIDE.md) for troubleshooting steps

## License

This project is provided as-is for Alia Fabrication and Design's internal use.

## Credits

- UI Design inspired by Cruip's Solid template
- Typography: Plus Jakarta Sans by Google Fonts
- Icons: Custom SVG icons
- QR Code Generation: qrcode library
- QR Code Scanning: html5-qrcode library
