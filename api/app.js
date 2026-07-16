/**
 * This is a API server
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import multer from 'multer';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import hscodesRoutes from './routes/hscodes.js';
import auditRoutes from './routes/audit.js';
// load env from project root (cross-platform compatible)
const currentFileUrl = new URL(import.meta.url);
let currentFilePath = currentFileUrl.pathname;
// Fix Windows path issue (remove leading / from /C:/...)
if (process.platform === 'win32' && currentFilePath.startsWith('/')) {
    currentFilePath = currentFilePath.slice(1);
}
const __dirname = path.dirname(currentFilePath);
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(projectRoot, 'uploads')));
app.use(express.static(path.resolve(projectRoot, 'dist')));
/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/hscodes', hscodesRoutes);
app.use('/api/audit', auditRoutes);
/**
 * health
 */
app.use('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'ok',
    });
});
/**
 * error handler middleware
 */
app.use((error, req, res) => {
    const errObj = error;
    if (process.env.NODE_ENV !== 'production') {
        const code = typeof errObj.code === 'string' ? errObj.code : 'UNKNOWN';
        const message = typeof errObj.message === 'string' ? errObj.message : '';
        console.error(`[api:error] code=${code} message=${message}`);
    }
    const visited = new Set();
    const collectCodes = (err) => {
        if (!err || visited.has(err))
            return [];
        visited.add(err);
        const out = [];
        const obj = err;
        if (typeof obj.code === 'string')
            out.push(obj.code);
        if (typeof obj.message === 'string') {
            if (obj.message.includes('ECONNREFUSED'))
                out.push('ECONNREFUSED');
            if (obj.message.includes('ETIMEDOUT'))
                out.push('ETIMEDOUT');
        }
        if (Array.isArray(obj.errors)) {
            for (const e of obj.errors)
                out.push(...collectCodes(e));
        }
        if (obj.cause)
            out.push(...collectCodes(obj.cause));
        return out;
    };
    const codes = collectCodes(error);
    const has = (c) => codes.includes(c);
    if (has('ECONNREFUSED') || has('ETIMEDOUT') || has('PROTOCOL_CONNECTION_LOST')) {
        res.status(503).json({ success: false, error: 'DB_UNAVAILABLE' });
        return;
    }
    if (has('ER_NO_SUCH_TABLE') || has('ER_BAD_DB_ERROR')) {
        res.status(500).json({ success: false, error: 'DB_NOT_INITIALIZED' });
        return;
    }
    if (has('ER_ACCESS_DENIED_ERROR')) {
        res.status(500).json({ success: false, error: 'DB_AUTH_FAILED' });
        return;
    }
    if (error instanceof multer.MulterError) {
        const multerError = error;
        if (multerError.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({ success: false, error: 'FILE_TOO_LARGE' });
            return;
        }
        res.status(400).json({ success: false, error: multerError.code });
        return;
    }
    if (error.message === 'INVALID_CLASSIFICATION_NOTE_TYPE') {
        res.status(400).json({ success: false, error: 'INVALID_CLASSIFICATION_NOTE_TYPE' });
        return;
    }
    if (error.message === 'INVALID_PRODUCT_IMAGE_TYPE') {
        res.status(400).json({ success: false, error: 'INVALID_PRODUCT_IMAGE_TYPE' });
        return;
    }
    if (error.message === 'INVALID_EXCEL_TYPE') {
        res.status(400).json({ success: false, error: 'INVALID_EXCEL_TYPE' });
        return;
    }
    res.status(500).json({
        success: false,
        error: 'Server internal error',
    });
});
/**
 * React Router fallback (client-side routing)
 */
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({
            success: false,
            error: 'API not found',
        });
    }
    else {
        res.sendFile(path.resolve(projectRoot, 'dist', 'index.html'));
    }
});
export default app;
