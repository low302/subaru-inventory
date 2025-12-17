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
- Unique SKU generation for each wheel set
- Multi-image upload support (up to 10 images per set)
- Detailed specifications: size, offset, bolt pattern, style
- Condition tracking (Excellent, Good, Fair, Poor)
- Status management (Available, Sold, Reserved)
- Visual grid layout with image galleries
- Individual wheel detail views

### Design
- Modern, sleek UI inspired by Cruip's Solid template
- Plus Jakarta Sans typography for a professional look
- Responsive design that works on desktop, tablet, and mobile
- Smooth animations and transitions
- Clean, intuitive interface with real-time search

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Storage**: JSON files (persistent server-side storage)
- **File Upload**: Multer for image handling
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose installed on your system
- Network access to the server from devices you want to use

## Installation

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

- **`./data/`** - Contains JSON files for OEM parts and wheels inventory
  - `oem-parts.json` - OEM parts data
  - `wheels.json` - Wheel take-offs data

- **`./uploads/`** - Contains uploaded images for wheel sets

These directories are automatically created when the container starts and persist even when the container is stopped or restarted.

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

### Managing Wheel Take-Offs

1. Click the **"Wheel Take-Offs"** tab in the navigation
2. Click **"Add Wheel Set"** to create a new entry
3. Fill in the required fields:
   - SKU (auto-generated, but editable)
   - Vehicle Model (e.g., "2023 Outback")
   - Size (e.g., "18x7.5")
   - Bolt Pattern (e.g., "5x114.3")
   - Condition (Excellent, Good, Fair, Poor)
   - Price
4. Upload images (up to 10) by clicking the upload area
5. Add optional details: offset, style, status, notes
6. Click **"Save Wheel Set"**

Click on any wheel card to view full details and image gallery.

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

## Security Notes

This system is designed for local network use. For production or internet-facing deployments:

1. Add authentication/authorization
2. Use HTTPS with SSL certificates
3. Implement input validation and sanitization
4. Set up regular automated backups
5. Use a proper database instead of JSON files for larger inventories

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify your Docker installation
3. Ensure proper file permissions on `data/` and `uploads/` directories

## License

This project is provided as-is for Alia Fabrication and Design's internal use.

## Credits

- UI Design inspired by Cruip's Solid template
- Typography: Plus Jakarta Sans by Google Fonts
- Icons: Custom SVG icons
