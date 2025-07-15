# CV Upload Feature - Installation & Testing Guide

## 🔧 Installation Steps

### 1. Backend Setup

1. **Install dependencies:**
   ```bash
   cd FishCrewConnect-backend
   npm install
   ```

2. **Run database migration:**
   ```bash
   node scripts/modify-job-applications-table.js
   ```

3. **Create uploads directory:**
   ```bash
   mkdir -p uploads/cvs
   ```

### 2. Frontend Setup

1. **Install dependencies:**
   ```bash
   cd FishCrewConnect
   npm install
   npx expo install expo-document-picker
   ```

## 🗄️ Database Changes

The migration script adds these columns to `job_applications`:
- `cv_file_url` VARCHAR(500) - Path to uploaded CV file
- `cv_file_name` VARCHAR(255) - Original filename
- `cv_file_size` INT - File size in bytes
- `cv_upload_date` TIMESTAMP - Upload timestamp

## 🧪 Testing the CV Upload Feature

### As a Fisherman:

1. **Navigate to Job Details:**
   - Go to Jobs tab
   - Select any open job
   - Click "Apply for this job"

2. **File Upload Process:**
   - Modal opens asking for CV upload
   - Click "Select CV File"
   - Choose PDF, DOC, or DOCX file (max 5MB)
   - Application submits automatically

3. **Verification:**
   - Check My Applications tab
   - Should see CV file name displayed
   - Application status should be "pending"

### As a Boat Owner:

1. **View Applications:**
   - Go to job management
   - Select job with applications
   - View list of applicants

2. **Download CV:**
   - See CV file name for each application
   - Click "Download" button
   - File should download to device

3. **Update Application Status:**
   - Change status (viewed, shortlisted, accepted, rejected)
   - Applicant receives notification

## 🔍 Verification Checklist

### Backend Verification:
- [ ] `uploads/cvs/` directory exists
- [ ] Database has new CV columns
- [ ] File upload middleware working
- [ ] CV download endpoint accessible
- [ ] File validation (type/size) working

### Frontend Verification:
- [ ] File picker modal displays
- [ ] CV file selection works
- [ ] Application submission with file
- [ ] CV file name shows in applications
- [ ] Download button appears for boat owners

## 🐛 Troubleshooting

### Common Issues:

1. **"expo-document-picker not available"**
   - Run: `npx expo install expo-document-picker`
   - Restart development server

2. **File upload fails**
   - Check backend uploads directory permissions
   - Verify multer middleware is properly configured
   - Check file size limits (5MB max)

3. **Database errors**
   - Ensure migration script ran successfully
   - Check database connection
   - Verify column types match

4. **File download issues**
   - Check file path in database
   - Verify static file serving is configured
   - Ensure proper authorization

### Debug Commands:

```bash
# Check uploads directory
ls -la FishCrewConnect-backend/uploads/cvs/

# Verify database schema
mysql> DESCRIBE job_applications;

# Check server logs
tail -f FishCrewConnect-backend/server.log

# Test file upload endpoint
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cv_file=@test.pdf" \
  http://localhost:5000/api/applications/job/1
```

## 📱 Platform-Specific Notes

### iOS:
- Document picker requires camera permission in some cases
- PDF preview might be available

### Android:
- File access permissions may be required
- Different document picker UI

### Web:
- Uses browser file picker
- Download works via browser download

## 🚀 Production Deployment

### Additional Steps:

1. **File Storage:**
   - Consider cloud storage (AWS S3, Google Cloud)
   - Implement file cleanup for old applications

2. **Security:**
   - Add virus scanning for uploaded files
   - Implement rate limiting for uploads
   - Regular security audits

3. **Performance:**
   - Add file compression
   - Implement CDN for file serving
   - Monitor storage usage

## 📊 Feature Summary

### ✅ Implemented:
- File upload with validation
- Secure file storage
- CV download for authorized users
- Database schema updates
- UI updates for file handling
- Real-time notifications
- Error handling and validation

### 🔄 Replaced:
- Cover letter text input → File upload
- Manual application review → CV document review
- Text-based applications → Document-based applications

The CV upload feature is now fully implemented and ready for testing!
