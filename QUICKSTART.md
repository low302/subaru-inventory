# Quick Start Guide - Subaru Inventory System

## Getting Started in 3 Steps

### Step 1: Deploy the System
```bash
# Navigate to the project directory
cd subaru-inventory

# Run the startup script (it will detect if sudo is needed)
./start.sh

# OR manually with Docker Compose
sudo docker compose up -d
```

**Note**: If you get permission errors, use `sudo` before docker commands.

### Step 2: Access the Application
Open your web browser and go to:
- **Local access**: http://localhost:3000
- **Network access**: http://YOUR-SERVER-IP:3000

### Step 3: Start Adding Inventory

#### For OEM Parts:
1. Click "OEM Parts" tab
2. Click "Add Part" button
3. Enter part details
4. Save

#### For Wheel Take-Offs:
1. Click "Wheel Take-Offs" tab
2. Click "Add Wheel Set" button
3. Fill in specifications
4. Upload photos (optional)
5. Save

## Key Features

### Two Separate Inventories
- **OEM Parts**: Traditional inventory with SKU, quantity, location tracking
- **Wheel Take-Offs**: Individual wheel sets with unique SKUs and photos

### Real-Time Statistics
- Total items count
- Stock status tracking
- Low stock alerts
- Available vs sold tracking

### Search & Filter
- Instant search across all fields
- No need to reload the page
- Works on both inventory types

### Multi-Device Access
Access from any device on your network:
- Desktop computers
- Laptops
- Tablets
- Smartphones

## System Requirements

- **Server**: Any computer running Docker
- **Network**: Local network connection
- **Storage**: Minimal (grows with inventory)
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)

## Data Storage

All data is stored in two folders:
- `./data/` - Inventory records (JSON files)
- `./uploads/` - Wheel photos

**Important**: These folders persist even when the container is restarted.

## Common Commands

**Note**: Add `sudo` before commands if you get permission errors.

### Start the system
```bash
sudo docker compose up -d
```

### Stop the system
```bash
sudo docker compose down
```

### View logs (troubleshooting)
```bash
sudo docker compose logs -f
```

### Restart the system
```bash
sudo docker compose restart
```

### Backup your data
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

## Network Access Setup

### Find Your Server's IP Address

**Linux/Mac:**
```bash
hostname -I
```

**Windows:**
```bash
ipconfig
```

Look for your local IP (usually starts with 192.168.x.x or 10.0.x.x)

### Access from Other Devices

1. Connect device to same network as server
2. Open web browser
3. Go to: `http://SERVER-IP:3000`
4. Bookmark for easy access

## Troubleshooting

### Can't access the system?
- Check if container is running: `sudo docker compose ps`
- Verify port 3000 is not in use
- Check firewall settings

### Permission denied errors?
- Use `sudo` before docker commands
- OR add your user to docker group: `sudo usermod -aG docker $USER` (then logout/login)

### Images not uploading?
- Ensure `uploads/` directory exists
- Check browser console for errors
- Verify file size is under 10MB

### Data not saving?
- Check `data/` directory permissions
- View logs: `sudo docker compose logs`
- Restart container: `sudo docker compose restart`

## Support

For detailed documentation, see the full README.md file.

## What's Next?

- Add your first OEM parts
- Upload wheel photos and specifications
- Access from mobile devices
- Set up regular backups

---

**Built for Alia Fabrication and Design**
Modern inventory management made simple.
