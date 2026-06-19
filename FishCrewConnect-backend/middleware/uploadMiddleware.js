 const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'cvs');
const profileImagesDir = path.join(__dirname, '..', 'uploads', 'profile-images');

// Create directories if they don't exist
[uploadsDir, profileImagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for CVs
const cvStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: userId_jobId_timestamp_originalname
    const userId = req.user?.id || 'unknown';
    const jobId = req.params?.jobId || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    // Clean the original filename by removing special characters and spaces
    const nameWithoutExt = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\s+/g, '_'); // Replace spaces with underscore
    
    const filename = `${userId}_${jobId}_${timestamp}_${nameWithoutExt}${extension}`;
    cb(null, filename);
  }
});

// Configure storage for profile images
const profileImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileImagesDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: userId_timestamp_originalname
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    // Clean the original filename by removing special characters and spaces
    const nameWithoutExt = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\s+/g, '_'); // Replace spaces with underscore
    
    const filename = `${userId}_${timestamp}_${nameWithoutExt}${extension}`;
    cb(null, filename);
  }
});

// Extension → allowed MIME types map for CV uploads.
// Both the extension AND the declared MIME type must agree — prevents extension spoofing.
const CV_EXTENSION_MIME_MAP = {
  '.pdf':  ['application/pdf'],
  '.doc':  ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt':  ['text/plain'],
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png':  ['image/png'],
};

const IMAGE_EXTENSION_MIME_MAP = {
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png':  ['image/png'],
  '.gif':  ['image/gif'],
  '.webp': ['image/webp'],
};

// File filter for CV/Resume uploads
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = CV_EXTENSION_MIME_MAP[ext];

  if (!allowedMimeTypes) {
    return cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG.'), false);
  }
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('File content does not match its extension. Upload rejected.'), false);
  }
  cb(null, true);
};

// File filter for profile images
const profileImageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = IMAGE_EXTENSION_MIME_MAP[ext];

  if (!allowedMimeTypes) {
    return cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, WebP.'), false);
  }
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('File content does not match its extension. Upload rejected.'), false);
  }
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: cvStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware for single CV file upload
const uploadCV = upload.single('cv_file');

// Configure multer for profile image upload
const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for profile images
  },
  fileFilter: profileImageFilter
}).single('profile_image');

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB for CVs or 2MB for profile images.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field name. Use "cv_file" for CV uploads or "profile_image" for profile images.' });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  
  next(err);
};

module.exports = {
  uploadCV,
  uploadProfileImage,
  handleUploadError,
  uploadsDir,
  profileImagesDir
};
