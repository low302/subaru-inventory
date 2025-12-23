# QR Scanner Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Error starting camera: undefined"

This error typically occurs due to one of these reasons:

### 1. **Not Using HTTPS or Localhost** (Most Common on Mobile)

**Problem:** Modern browsers require HTTPS (secure connection) for camera access, except on localhost.

**Solution:**

#### Option A: Use Your Computer's IP Address (Recommended for Testing)
When accessing from your phone on the same network:
```
http://YOUR-COMPUTER-IP:3000
```

The app will now show a helpful error if HTTPS is required.

#### Option B: Set Up HTTPS (For Production)

1. **Use ngrok for temporary HTTPS:**
   ```bash
   # Install ngrok: https://ngrok.com
   ngrok http 3000
   ```
   Then use the `https://` URL provided.

2. **Use a reverse proxy with SSL:**
   - Set up nginx with Let's Encrypt SSL certificate
   - Or use Cloudflare Tunnel

#### Option C: Test on Desktop First
Test on `http://localhost:3000` first to verify the feature works.

---

### 2. **Camera Permissions Not Granted**

**Problem:** Browser blocked camera access.

**Solution:**

**On iOS Safari:**
1. Go to Settings → Safari → Camera
2. Set to "Ask" or "Allow"
3. Refresh the page
4. When prompted, tap "Allow"

**On Android Chrome:**
1. Tap the lock/info icon in address bar
2. Find "Camera" permissions
3. Set to "Allow"
4. Refresh the page

**On Desktop:**
1. Look for camera icon in address bar
2. Click it and allow camera access
3. Refresh if needed

---

### 3. **Camera Already in Use**

**Problem:** Another app/tab is using the camera.

**Solution:**
- Close other apps using the camera
- Close other browser tabs with camera access
- Restart your browser

---

### 4. **Library Not Loaded**

**Problem:** html5-qrcode library failed to load from CDN.

**Solution:**
1. Check your internet connection
2. Refresh the page (Cmd/Ctrl + Shift + R for hard refresh)
3. Check browser console for network errors
4. Try a different browser

---

### 5. **iOS Safari Specific Issues**

**Problem:** iOS Safari has stricter security policies.

**Known Issues:**
- Must use HTTPS (except localhost)
- May need to grant permissions in Settings first
- Camera access only works with user interaction (button tap)

**Solution:**
- Ensure you're accessing via `https://` URL
- Check camera permissions in iOS Settings
- Try Safari first, then Chrome if issues persist

---

## Debugging Steps

### 1. Check Browser Console

1. On desktop: Press F12 or Cmd+Opt+I (Mac) / Ctrl+Shift+I (Windows)
2. On mobile: Connect to Safari/Chrome DevTools
3. Look for errors in the Console tab
4. Check the messages logged by the scanner:
   ```
   Available cameras: 2
   Camera 0: Front Camera
   Camera 1: Back Camera (environment)
   Using camera: Back Camera (environment)
   QR Scanner started successfully
   ```

### 2. Test Connection Type

Check if you're using HTTPS:
1. Look at the URL bar
2. Should show `https://` (or `http://localhost:3000`)
3. If showing `http://YOUR-IP:3000`, camera won't work on most mobile browsers

### 3. Test Permissions

1. Try to take a photo in the browser normally
2. If that doesn't work, permissions are blocked
3. Check browser/system settings

### 4. Verify Library Loading

1. Open browser console
2. Type: `typeof Html5Qrcode`
3. Should show: `"function"`
4. If shows: `"undefined"`, library didn't load

---

## Best Practices

### For Development/Testing:
```bash
# Access from the computer running the server
http://localhost:3000

# The app will work because localhost is considered secure
```

### For Network Access (Other Devices):
```bash
# Use ngrok for HTTPS tunnel
npm install -g ngrok
ngrok http 3000

# Use the https:// URL provided
```

### For Production:
- Set up proper HTTPS with SSL certificate
- Use a reverse proxy (nginx, Apache)
- Or deploy to a hosting service with HTTPS

---

## How to Test the QR Scanner

### 1. Generate a Test QR Code

1. Add a wheel to your inventory
2. Click on the wheel to view details
3. Click "Print QR Label"
4. A new window opens with the QR code

### 2. Scan the QR Code

**On the same device:**
1. Take a screenshot of the QR code or keep the window open
2. Open the scanner
3. Point at the screen

**On mobile (recommended):**
1. Print the QR label or display on another screen
2. Open the app on your phone (`https://` URL or via ngrok)
3. Click "Scan QR" button
4. Point camera at the QR code
5. Wheel details should open automatically

---

## Error Messages Explained

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "QR Scanner library not loaded" | CDN failed to load library | Refresh page, check internet |
| "Camera access requires HTTPS" | Using HTTP on non-localhost | Use HTTPS or ngrok |
| "Camera permission denied" | User denied permission | Allow in browser settings |
| "No camera found" | Device has no camera | Use device with camera |
| "Camera already in use" | Another app using camera | Close other apps |
| "Camera detection timeout" | Taking too long to detect | Refresh and try again |
| "Unknown camera error" | Various issues | Check console for details |

---

## Still Having Issues?

### Check These:

1. **Browser Compatibility:**
   - Chrome/Safari: ✅ Full support
   - Firefox: ✅ Full support
   - IE11: ❌ Not supported

2. **Device Requirements:**
   - Camera required
   - Modern browser
   - JavaScript enabled
   - Secure context (HTTPS or localhost)

3. **Network Setup:**
   - Firewall not blocking port 3000
   - On same network as server
   - Correct IP address

### Debug Information to Collect:

1. Browser and version
2. Device type (iPhone 15, Android Samsung, etc.)
3. URL being used (http/https)
4. Console error messages
5. Network tab errors

---

## Quick Solutions Summary

**For Desktop Testing:**
```
✅ Use: http://localhost:3000
✅ Works: Camera should work fine
```

**For Mobile Testing (Development):**
```
⚠️  Problem: http://192.168.1.100:3000
❌ Camera blocked by browser

✅ Solution: Use ngrok
   ngrok http 3000
   https://abc123.ngrok.io
```

**For Production:**
```
✅ Set up proper HTTPS with SSL certificate
✅ Use reverse proxy or cloud hosting
```

---

## Additional Resources

- **html5-qrcode Documentation:** https://github.com/mebjas/html5-qrcode
- **Browser Camera Permissions:** https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- **ngrok Setup:** https://ngrok.com/docs

---

**Last Updated:** 2024
**Status:** QR Scanner working with improved error handling
