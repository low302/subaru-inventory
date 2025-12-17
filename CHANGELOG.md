# Wheel Inventory Update - Changelog

## Changes Made (v1.2) - Table View + QR Labels

### Major Changes:
1. **Replaced Card Grid with Table View**
   - Wheels now display in a traditional row-based table
   - Columns: Image thumbnail, SKU, Vehicle, Size, Bolt Pattern, Condition, Price, Status, Actions
   - Easier to scan multiple items at once
   - Better for inventory management

2. **QR Code Label Printing System**
   - Added "Print QR Label" button (QR code icon) for each wheel
   - Generates 2x2 inch thermal labels compatible with Jaden 268BT printer
   - Label format matches your example:
     - QR code (1.5" x 1.5")
     - SKU text below (11pt bold)
   - Click the button to open print dialog
   - Labels are optimized for 288 DPI thermal printing

### Table Features:
- **Thumbnail Images**: Click to view full details
- **Status Badges**: Color-coded (Available=Green, Sold=Red, Reserved=Orange)
- **Condition Badges**: Color-coded (Excellent=Green, Good=Blue, Fair=Orange, Poor=Red)
- **Quick Actions**: Print QR, View, Edit, Delete buttons per row

### QR Label Details:
- **Size**: 2" x 2" (576x576 pixels at 288 DPI)
- **QR Code**: Contains the SKU for scanning
- **Text**: SKU printed below QR code for visual reference
- **Format**: Optimized for thermal printers (black on white)
- **Printing**: Opens in new window, auto-triggers print dialog

### Files Updated:
- `server.js` - Added QR code generation endpoint
- `public/index.html` - Replaced grid with table structure
- `public/app.js` - Updated rendering and added print function
- `public/styles.css` - Added table thumbnail and status badge styles
- `package.json` - Added qrcode dependency

---

## Changes Made (v1.1)

### Form Changes
The "Add Wheel Set" form has been updated to track individual wheels with more detailed specifications:

#### New Fields Added:
1. **Year** - Dropdown with years 2020-2026
2. **Make** - Dropdown defaulting to "Subaru" with "Other" option
   - When "Other" is selected, a text input appears
3. **Model** - Dropdown with common Subaru models (Outback, Forester, Ascent, Crosstrek, WRX, BRZ, Other)
   - When "Other" is selected, a text input appears
4. **Trim** - Dropdown with common trim levels (Base, Premium, Limited, Sport, Sport Hybrid, Limited Hybrid, Touring, Touring Onyx Edition)

#### Fields Modified:
- **Bolt Pattern** - Changed to dropdown (5x100, 5x114.3)
- **Size** - Kept as text input

#### Fields Removed:
- **Style Name** - Removed per request

#### Auto-Generated SKU Format:
The SKU is now automatically generated when all required fields are filled:

**Format:** `SPP-[YEAR][MAKE_ABBR][MODEL_ABBR]-[SIZE]-[BOLT]-[RANDOM]`

**Example:** `SPP-2024SUBOUT-18x7.5-5x114.3-A7F2`

- **SPP** - Subaru Parts Pros (or your business identifier)
- **Year** - Full year (2024)
- **Make Abbreviation** - First 3 letters uppercase (SUB)
- **Model Abbreviation** - First 3 letters uppercase (OUT)
- **Size** - Wheel size cleaned (18x7.5)
- **Bolt Pattern** - Pattern cleaned (5x114.3)
- **Random** - 4-character unique identifier (A7F2)

### UI Updates:
- Changed "Add Wheel Set" button to "Add Wheel"
- Changed "Total Sets" stat to "Total Wheels"
- Updated empty state message from "wheel set" to "wheel"
- Modal title now shows "Add Wheel" or "Edit Wheel"
- Save button now says "Save Wheel"

### Display Changes:
- Wheel cards now show: Year Make Model Trim (if available)
- Detail view includes all new fields
- Search still works across all fields

### Functionality:
- SKU generates automatically as you fill in the form
- SKU is read-only (cannot be manually edited)
- When editing existing wheels, the SKU is preserved
- "Other" make/model options show additional text inputs
- All validation still works properly

## How to Use:

1. **Adding a New Wheel:**
   - Click "Add Wheel"
   - Select Year, Make, Model (and optionally Trim)
   - Enter Size
   - Select Bolt Pattern
   - SKU will automatically generate
   - Add remaining details (condition, price, images, notes)
   - Click "Save Wheel"

2. **Editing a Wheel:**
   - Click on a wheel card or use the Edit button
   - Modify any fields (SKU remains the same)
   - Click "Save Wheel"

3. **Printing QR Labels:**
   - Click the QR icon button in the Actions column
   - Print dialog will open automatically
   - Select your Jaden 268BT printer
   - Ensure 2x2 label is selected
   - Print!

## Notes:
- The SKU format can be customized further if needed
- More years can be added to the dropdown easily
- Additional makes, models, or trims can be added to the dropdowns
- The "SPP" prefix in SKU can be changed to match your branding
- QR labels are designed for 288 DPI thermal printing
