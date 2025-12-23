# Subaru Inventory System - Testing Guide

## System Requirements
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Modern web browser (Chrome, Safari, Firefox, Edge)
- For QR scanning: device with camera (preferably iPhone for best mobile experience)

## Installation & Startup

1. **Install Dependencies:**
   ```bash
   cd /Users/zaidalia/Documents/GitHub/subaru-inventory
   npm install
   ```

2. **Start Server:**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access Application:**
   - Open browser to: `http://localhost:3000`
   - On mobile (same network): `http://[your-computer-ip]:3000`

## Manual Testing Checklist

### 1. Basic Navigation ✓
- [ ] Page loads without errors
- [ ] Sidebar toggles open/closed with hamburger menu
- [ ] Navigation switches between OEM Parts and Wheels views
- [ ] Stats display correctly at top of page

### 2. Add Wheel Manually ✓
- [ ] Click "Add Wheel" button
- [ ] Fill in all fields:
  - Year, Make, Model, Trim
  - Size, Bolt Pattern, Offset
  - **OEM Part Number** (new field)
  - Condition, Price, Status
  - Notes
  - Upload 1-3 images
- [ ] Test Quantity field (try adding 3 wheels):
  - Set quantity to 3
  - Verify each wheel gets unique SKU
  - All 3 should appear in inventory
- [ ] Submit form
- [ ] Verify wheel appears in table
- [ ] Check that SKU is auto-generated

### 3. Edit Wheel ✓
- [ ] Click on a wheel row to open details
- [ ] Click "Edit" button in details modal
- [ ] Modify some fields
- [ ] Add additional images
- [ ] Save changes
- [ ] Verify changes appear in table and details

### 4. Delete Wheel ✓
- [ ] Click on a wheel to view details
- [ ] Click "Edit" button
- [ ] Click "Delete" button (only visible in edit mode)
- [ ] Confirm deletion
- [ ] Verify wheel is removed from table

### 5. Mark as Sold ✓
- [ ] Click "Sold" button on any available wheel
- [ ] Confirm action
- [ ] Verify status changes to "Sold"
- [ ] Check status badge color updates

### 6. CSV Import ✓
- [ ] Click "Import CSV" button
- [ ] Click "Download Template" to get CSV format
- [ ] Create a CSV file with test data:
   ```csv
   year,make,model,trim,size,boltPattern,offset,oemPart,condition,price,status,notes
   2024,Subaru,Outback,Limited,18x7.5,5x114.3,+55mm,28111FL01A,Good,450.00,Available,Test wheel 1
   2023,Subaru,Forester,Sport,17x7,5x114.3,+48mm,28111SG01A,Excellent,400.00,Available,Test wheel 2
   ```
- [ ] Upload CSV file
- [ ] Review preview table
- [ ] Click "Import Wheels"
- [ ] Verify all wheels imported with unique SKUs
- [ ] Check OEM Part field populated correctly

### 7. Quick Add Templates ✓
- [ ] Click "Quick Add" dropdown
- [ ] Click "Manage Templates..." option
- [ ] Create new template:
  - Name: "2024 Outback 18in"
  - Fill in common wheel specs
  - Include OEM Part Number
- [ ] Save template
- [ ] Select template from "Quick Add" dropdown
- [ ] Verify form pre-fills with template data
- [ ] Complete and submit form
- [ ] Verify wheel created correctly

### 8. QR Code Generation & Printing ✓
- [ ] Click on any wheel to view details
- [ ] Click "Print QR Label" button
- [ ] Verify new window opens with:
  - QR code displayed
  - SKU text below QR code
  - 2"x2" label format
- [ ] Test print preview (Cmd/Ctrl + P)
- [ ] Verify label is sized for thermal printer

### 9. QR Code Scanning (Mobile) ✓
- [ ] Open app on iPhone/mobile device
- [ ] Click "Scan QR" button
- [ ] Grant camera permissions if prompted
- [ ] Point camera at printed QR label or screen QR code
- [ ] Verify:
  - Camera activates
  - Scanning works
  - Correct wheel details modal opens
  - Scanner closes automatically

### 10. Search & Filter ✓
- [ ] Type in wheels search box
- [ ] Verify real-time filtering by:
  - SKU
  - Make
  - Model
  - Year
  - Size
- [ ] Clear search
- [ ] Verify all wheels return

### 11. Mobile Responsiveness ✓

#### iPhone Testing
- [ ] Open on iPhone (preferably iPhone 17 Pro Max or similar)
- [ ] Verify no horizontal scrolling
- [ ] Check sidebar:
  - Hidden by default on mobile
  - Opens with hamburger menu
  - Overlays content (doesn't push)
  - Closes with X button or backdrop tap
- [ ] Test table:
  - Compact layout loads
  - Text is readable (not too small)
  - All columns visible with horizontal scroll
  - Touch targets are adequate (44px min)
- [ ] Test buttons:
  - All buttons are tappable
  - Proper spacing between buttons
  - "Scan QR" visible and functional
- [ ] Test modals:
  - Open properly on mobile
  - Forms are usable
  - Inputs don't cause page zoom
- [ ] Test in portrait and landscape

#### Desktop Testing
- [ ] Resize browser window
- [ ] Verify breakpoint at 768px
- [ ] Check sidebar toggle on desktop
- [ ] Verify table doesn't break at various widths

### 12. OEM Parts Section ✓
- [ ] Switch to OEM Parts view
- [ ] Add a new OEM part
- [ ] Edit an existing part
- [ ] Delete a part
- [ ] Search/filter parts
- [ ] Sort columns

### 13. Data Persistence ✓
- [ ] Add some wheels
- [ ] Refresh page
- [ ] Verify all data persists
- [ ] Stop server
- [ ] Restart server
- [ ] Verify data still exists
- [ ] Check `/data` folder for JSON files:
  - `wheels.json`
  - `wheel-templates.json`
  - `oem-parts.json`

### 14. Image Management ✓
- [ ] Upload multiple images to a wheel
- [ ] Verify images appear in:
  - Details modal
  - Image preview during add/edit
- [ ] Edit wheel and add more images
- [ ] Verify new images append to existing
- [ ] Delete a wheel with images
- [ ] Verify image files deleted from `/uploads` folder

### 15. Error Handling ✓
- [ ] Try submitting wheel form with missing required fields
- [ ] Upload invalid file type (not image)
- [ ] Try importing malformed CSV
- [ ] Test with no network (simulate offline)
- [ ] Verify appropriate error messages

## Code Quality Checks

### JavaScript Console
- [ ] Open browser DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Perform various actions
- [ ] Verify no JavaScript errors

### Network Requests
- [ ] Open Network tab in DevTools
- [ ] Perform CRUD operations
- [ ] Verify all requests return 200 status
- [ ] Check request/response payloads

### File Structure
```
subaru-inventory/
├── server.js                 # Express backend
├── package.json              # Dependencies
├── public/
│   ├── index.html           # Main HTML
│   ├── app.js               # Frontend JavaScript
│   └── styles.css           # All styles (including mobile)
├── data/                    # Created on first run
│   ├── wheels.json
│   ├── wheel-templates.json
│   └── oem-parts.json
└── uploads/                 # Created on first run
    └── [image files]
```

## Known Features

### SKU Generation
- Format: `SPP-[YEAR][MAKE][MODEL]-[SIZE]-[BOLT]-[RANDOM]`
- Auto-generates on form
- Can be manually edited
- Each wheel in quantity batch gets unique SKU

### OEM Part Number
- Added to all forms
- Included in CSV import/export
- Searchable field
- Optional field

### Status System
- Available (green)
- Pending (orange)
- Sold (gray)
- "Sold" button for quick status change

### Mobile Optimizations
- Viewport meta tags for iOS
- Safe area insets for notched displays
- Touch targets minimum 44px
- Compact table for mobile (font-size reduced)
- Column width optimizations
- No horizontal page scroll
- Collapsible sidebar with overlay

## Common Issues & Solutions

### Issue: npm command not found
**Solution:** Install Node.js from nodejs.org

### Issue: Port 3000 already in use
**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or change PORT in server.js
```

### Issue: Images not uploading
**Solution:** Check `/uploads` folder permissions and 10MB file size limit

### Issue: QR scanner not working
**Solution:**
- Ensure HTTPS or localhost (camera requires secure context)
- Grant camera permissions
- Use physical device (not desktop simulator)

### Issue: Horizontal scroll on mobile
**Solution:** Already fixed with overflow-x: hidden and max-width constraints

### Issue: Data lost after server restart
**Solution:** Not an issue - data persists in `/data` JSON files

## Performance Testing

### Load Testing
- [ ] Add 100+ wheels
- [ ] Test search performance
- [ ] Test table rendering speed
- [ ] Check memory usage in DevTools

### Image Optimization
- [ ] Test with large images (8MB+)
- [ ] Verify upload works within 10MB limit
- [ ] Consider adding image compression for production

## Security Checklist
- [ ] No SQL injection risk (using file-based storage)
- [ ] File upload restricted to images only
- [ ] File size limited to 10MB
- [ ] No XSS vulnerabilities (data properly escaped)
- [ ] Server binds to 0.0.0.0 for network access

## Production Recommendations

1. **Database Migration:** Consider migrating from JSON files to SQLite or PostgreSQL for better performance at scale

2. **Image Optimization:** Add image compression/resizing on upload

3. **Authentication:** Add user login system if multi-user access needed

4. **Backup System:** Implement automatic backups of `/data` folder

5. **HTTPS:** Use HTTPS in production for QR scanner to work on all devices

6. **Environment Variables:** Move PORT and other config to .env file

7. **Error Logging:** Add proper error logging system (Winston, Pino)

8. **API Rate Limiting:** Add rate limiting to prevent abuse

## Test Results Summary

Record your test results here:

| Test Category | Status | Notes |
|--------------|--------|-------|
| Basic Navigation | ⬜ | |
| Add Wheel | ⬜ | |
| Edit Wheel | ⬜ | |
| Delete Wheel | ⬜ | |
| Mark as Sold | ⬜ | |
| CSV Import | ⬜ | |
| Quick Add Templates | ⬜ | |
| QR Code Generation | ⬜ | |
| QR Code Scanning | ⬜ | |
| Search & Filter | ⬜ | |
| Mobile Responsiveness | ⬜ | |
| OEM Parts | ⬜ | |
| Data Persistence | ⬜ | |
| Image Management | ⬜ | |
| Error Handling | ⬜ | |

## Automated Testing (Future Enhancement)

Consider adding:
- Jest for unit tests
- Cypress for E2E tests
- Lighthouse for performance audits
