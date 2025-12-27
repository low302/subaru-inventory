/**
 * Application constants
 */

module.exports = {
    // Stock thresholds
    LOW_STOCK_THRESHOLD: 5,
    OUT_OF_STOCK_THRESHOLD: 0,

    // File upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    MAX_FILES: parseInt(process.env.MAX_FILES) || 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],

    // Validation limits
    MAX_PART_NUMBER_LENGTH: 50,
    MAX_PART_NAME_LENGTH: 100,
    MAX_CATEGORY_LENGTH: 50,
    MAX_LOCATION_LENGTH: 100,
    MAX_NOTES_LENGTH: 500,
    MAX_TEMPLATE_NAME_LENGTH: 100,

    // Session
    SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours

    // JWT
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    // Rate limiting
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    AUTH_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    AUTH_RATE_LIMIT_MAX: 5,

    // Image optimization
    IMAGE_MAX_WIDTH: 1200,
    IMAGE_MAX_HEIGHT: 1200,
    IMAGE_QUALITY: 85,

    // Status values
    WHEEL_STATUS: {
        AVAILABLE: 'Available',
        SOLD: 'Sold',
        RESERVED: 'Reserved'
    },

    WHEEL_CONDITION: {
        EXCELLENT: 'Excellent',
        GOOD: 'Good',
        FAIR: 'Fair',
        POOR: 'Poor'
    }
};
