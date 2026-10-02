/*
 * SecureDoc MongoDB initialization
 *
 * Run with mongosh:
 *   mongosh "mongodb+srv://USER:PASSWORD@CLUSTER/securedoc_demo" scripts/mongodb/init-securedoc.mongosh.js
 *
 * Use a different database name for each environment:
 *   securedoc_dev
 *   securedoc_demo
 *   securedoc_production
 *
 * This script creates collections and indexes only. It does not create users,
 * passwords, cases, or evidence. Use the application seed command only for an
 * isolated demo database.
 */

const collectionNames = [
  'users',
  'cases',
  'documents',
  'auditblocks',
  'merklebatches',
  'signatures',
  'shares',
  'custodyevents',
  'documenthistories',
  'fs.files',
  'fs.chunks',
];

function ensureCollection(name) {
  if (!db.getCollectionNames().includes(name)) {
    db.createCollection(name);
    print(`Created collection: ${name}`);
  } else {
    print(`Collection already exists: ${name}`);
  }
}

collectionNames.forEach(ensureCollection);

// User authentication, authority approval, and account lockout.
db.users.createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
db.users.createIndex({ approvalStatus: 1 }, { name: 'users_approval_status' });
db.users.createIndex({ role: 1, clearance: 1 }, { name: 'users_role_clearance' });
db.users.createIndex({ createdAt: -1 }, { name: 'users_created_at_desc' });

// Cases and team membership.
db.cases.createIndex({ caseNo: 1 }, { unique: true, name: 'cases_case_no_unique' });
db.cases.createIndex({ status: 1, registeredAt: -1 }, { name: 'cases_status_registered_at' });
db.cases.createIndex({ category: 1, district: 1 }, { name: 'cases_category_district' });
db.cases.createIndex({ team: 1 }, { name: 'cases_team_member' });

// Encrypted document metadata and full-text search.
db.documents.createIndex(
  { title: 'text', tags: 'text', ocrText: 'text' },
  { name: 'documents_full_text' }
);
db.documents.createIndex({ caseId: 1, type: 1 }, { name: 'documents_case_type' });
db.documents.createIndex({ sha256: 1 }, { name: 'documents_sha256' });
db.documents.createIndex({ uploadedBy: 1, createdAt: -1 }, { name: 'documents_uploader_created_at' });
db.documents.createIndex({ status: 1, classification: 1 }, { name: 'documents_status_classification' });

// Hash-chained audit ledger.
db.auditblocks.createIndex({ index: 1 }, { unique: true, name: 'auditblocks_index_unique' });
db.auditblocks.createIndex({ hash: 1 }, { unique: true, name: 'auditblocks_hash_unique' });
db.auditblocks.createIndex({ docId: 1, ts: -1 }, { name: 'auditblocks_document_time' });
db.auditblocks.createIndex({ caseId: 1, ts: -1 }, { name: 'auditblocks_case_time' });
db.auditblocks.createIndex({ userId: 1, ts: -1 }, { name: 'auditblocks_user_time' });

// Merkle batches and root chain.
db.merklebatches.createIndex({ batchId: 1 }, { unique: true, name: 'merklebatches_batch_id_unique' });
db.merklebatches.createIndex({ createdAt: -1 }, { name: 'merklebatches_created_at_desc' });

// Signatures, controlled sharing, custody, and document history.
db.signatures.createIndex({ docId: 1, createdAt: -1 }, { name: 'signatures_document_time' });
db.signatures.createIndex({ signerId: 1, createdAt: -1 }, { name: 'signatures_signer_time' });

db.shares.createIndex({ docId: 1, status: 1 }, { name: 'shares_document_status' });
db.shares.createIndex({ toUser: 1, status: 1 }, { name: 'shares_recipient_status' });
db.shares.createIndex({ expiresAt: 1 }, { name: 'shares_expiry' });

db.custodyevents.createIndex({ itemId: 1, ts: 1 }, { name: 'custody_item_time' });
db.custodyevents.createIndex({ caseId: 1, ts: 1 }, { name: 'custody_case_time' });
db.custodyevents.createIndex({ hash: 1 }, { name: 'custody_hash' });

db.documenthistories.createIndex(
  { originalDocId: 1, version: 1 },
  { unique: true, name: 'document_history_version_unique' }
);
db.documenthistories.createIndex({ caseId: 1, replacedAt: -1 }, { name: 'document_history_case_time' });

// GridFS indexes used by MongoDB for encrypted uploaded file chunks.
db.getCollection('fs.files').createIndex({ filename: 1, uploadDate: 1 }, { name: 'gridfs_filename_upload_date' });
db.getCollection('fs.files').createIndex({ metadata: 1 }, { name: 'gridfs_metadata' });
db.getCollection('fs.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true, name: 'gridfs_chunks_file_sequence' });

print(`SecureDoc database initialized: ${db.getName()}`);
printjson(db.getCollectionNames());
