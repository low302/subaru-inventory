# Quick Start Guide

Get the Subaru Inventory System running in 5 minutes!

## Step 1: Install Node.js

If you don't have Node.js installed:

**Mac:**
```bash
brew install node
```

**Windows:**
Download from [nodejs.org](https://nodejs.org)

**Linux:**
```bash
sudo apt install nodejs npm
```

## Step 2: Install Dependencies

```bash
cd /Users/zaidalia/Documents/GitHub/subaru-inventory
npm install
```

## Step 3: Start the Server

```bash
npm start
```

You should see:
```
Subaru Inventory System running on http://0.0.0.0:3000
Data stored in: /Users/zaidalia/Documents/GitHub/subaru-inventory/data
Uploads stored in: /Users/zaidalia/Documents/GitHub/subaru-inventory/uploads
```

## Step 4: Open in Browser

Open your browser to: **http://localhost:3000**

## Step 5: Add Your First Wheel

1. Click **"Wheels"** tab
2. Click **"Add Wheel"** button
3. Fill in the form:
   - Year: 2024
   - Make: Subaru
   - Model: Outback
   - Size: 18x7.5
   - Bolt Pattern: 5x114.3
   - Offset: +55mm
   - OEM Part: 28111FL01A
   - Condition: Good
   - Price: 450
   - Quantity: 1
4. Upload a photo (optional)
5. Click **"Save Wheel"**

That's it! You're ready to go.

## Quick Tips

### Mobile Access
1. Find your computer's IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. On your phone, go to: `http://YOUR-IP:3000`

### Print QR Labels
1. Click on a wheel to view details
2. Click **"Print QR Label"**
3. Print the 2"x2" label
4. Use **"Scan QR"** button on mobile to scan it later

### Import Multiple Wheels
1. Click **"Import CSV"**
2. Download the template
3. Fill in Excel/Google Sheets
4. Upload and import

### Create Quick Add Templates
1. Click **"Quick Add"** dropdown
2. Select **"+ Manage Templates"**
3. Create templates for wheels you add often
4. Use dropdown to quickly add similar wheels

## Need Help?

- **Full Documentation:** [README.md](./README.md)
- **Testing Guide:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Code Review:** [CODE_REVIEW.md](./CODE_REVIEW.md)

## Stop the Server

Press `Ctrl + C` in the terminal

## Restart Later

Just run `npm start` again from the project directory!

Your data is saved in the `data/` folder and persists between restarts.
