'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router();
const docController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');

// Multer: in-memory storage, max 50 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/tiff', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// Document upload (under a case or with caseId in body)
router.post('/cases/:id/documents', authenticate, upload.single('file'), docController.uploadDocument);
router.post('/documents/upload', authenticate, upload.single('file'), docController.uploadDocument);


// Document operations
router.get('/documents/:id', authenticate, docController.getDocument);
router.get('/documents/:id/versions', authenticate, docController.getVersions);
router.get('/documents/:id/download', authenticate, docController.downloadDocument);
router.get('/documents/:id/verify', authenticate, docController.verifyDocument);
router.put('/documents/:id', authenticate, docController.updateDocument);
router.delete('/documents/:id', authenticate, docController.deleteDocument);

module.exports = router;
