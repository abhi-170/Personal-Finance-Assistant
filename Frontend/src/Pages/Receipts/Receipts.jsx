import React, { useState, useEffect } from 'react';
import Layout from '../../Components/Layout.jsx';
import { receiptAPI, transactionAPI } from '../../Services/api.js';
import './Receipts.css';

const Receipts = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [recentReceipts, setRecentReceipts] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Categories for the form
    const categories = [
        'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
        'Healthcare', 'Education', 'Travel', 'Personal Care', 'Home & Garden',
        'Insurance', 'Taxes', 'Miscellaneous'
    ];

    // Load receipt history on component mount
    useEffect(() => {
        loadReceiptHistory();
    }, []);

    const loadReceiptHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await receiptAPI.getHistory({ limit: 10, page: 1 });
            if (response.data.success) {
                setRecentReceipts(response.data.data.receipts);
            }
        } catch (error) {
            console.error('Error loading receipt history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleDeleteReceipt = async (receiptId) => {
        if (!window.confirm('Are you sure you want to delete this receipt log?')) {
            return;
        }

        try {
            const response = await receiptAPI.deleteLog(receiptId);
            if (response.data.success) {
                // Remove the deleted receipt from the list
                setRecentReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
                setSuccess('Receipt log deleted successfully');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting receipt:', error);
            setError('Failed to delete receipt log');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                setError('Please select a valid image (JPEG, JPG, PNG) or PDF file.');
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB.');
                return;
            }

            setSelectedFile(file);
            setError('');
            setExtractedData(null);
            setSuccess('');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

            if (!allowedTypes.includes(file.type)) {
                setError('Please select a valid image (JPEG, JPG, PNG) or PDF file.');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB.');
                return;
            }

            setSelectedFile(file);
            setError('');
            setExtractedData(null);
            setSuccess('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            // Just store the file, don't process yet
            setUploadedFile(selectedFile);
            setSelectedFile(null);
            setSuccess('File uploaded successfully! Click "Process Receipt" to extract data.');

            // Clear the file input
            const fileInput = document.getElementById('receipt-file');
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleProcessReceipt = async (fileToProcess = null) => {
        const file = fileToProcess || uploadedFile;

        if (!file) {
            setError('No file available to process.');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('receipt', file);

            const response = await receiptAPI.uploadReceipt(formData);

            if (response.data.success) {
                setExtractedData(response.data.data);
                setSuccess('Receipt processed successfully! Please review and edit the extracted data.');
            } else {
                setError(response.data.message || 'Failed to process receipt.');
            }
        } catch (error) {
            console.error('Process error:', error);
            setError(error.response?.data?.message || 'Failed to process receipt. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUploaded = () => {
        setUploadedFile(null);
        setExtractedData(null);
        setError('');
        setSuccess('');
    };

    const handleSaveTransaction = async () => {
        if (!extractedData.description || !extractedData.amount || !extractedData.category) {
            setError('Please fill in all required fields (description, amount, category).');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const transactionData = {
                description: extractedData.description,
                amount: parseFloat(extractedData.amount),
                category: extractedData.category,
                date: extractedData.date || new Date().toISOString().split('T')[0],
                type: 'expense' // Most receipts are expenses
            };

            const response = await transactionAPI.createTransaction(transactionData);

            if (response.data.success) {
                setSuccess('Transaction saved successfully!');
                setExtractedData(null);
                setSelectedFile(null);
                setUploadedFile(null);

                // Reload receipt history to show the new entry
                loadReceiptHistory();

                // Clear the file input
                const fileInput = document.getElementById('receipt-file');
                if (fileInput) fileInput.value = '';
            } else {
                setError(response.data.message || 'Failed to save transaction.');
            }
        } catch (error) {
            console.error('Save transaction error:', error);
            setError(error.response?.data?.message || 'Failed to save transaction. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDiscard = () => {
        setExtractedData(null);
        setSelectedFile(null);
        setUploadedFile(null);
        setError('');
        setSuccess('');

        // Clear the file input
        const fileInput = document.getElementById('receipt-file');
        if (fileInput) fileInput.value = '';
    };

    return (
        <Layout>
            <div className="receipts-container">
                <div className="receipts-layout">
                    {/* Left Column - Upload Receipt */}
                    <div className="upload-section">
                        <div className="upload-card">
                            <h2 className="upload-title">Upload Receipt</h2>

                            {/* Upload Area */}
                            <div
                                className={`upload-dropzone ${isDragOver ? 'dragover' : ''} ${selectedFile ? 'has-file' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !selectedFile && document.getElementById('receipt-file').click()}
                            >
                                {!selectedFile ? (
                                    <>
                                        <div className="upload-icon">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M14 2V8H20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M12 11V17M9 14L12 11L15 14" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <h3 className="upload-main-text">Drop your receipt here</h3>
                                        <p className="upload-sub-text">or click to browse files</p>
                                        <p className="upload-format-text">JPG, PNG, PDF • Max 10MB</p>
                                    </>
                                ) : (
                                    <div className="file-preview">
                                        <div className="file-icon">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M14 2V8H20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="file-info">
                                            <p className="file-name">{selectedFile.name}</p>
                                            <p className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button
                                            className="remove-file-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                setError('');
                                                document.getElementById('receipt-file').value = '';
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="upload-actions">
                                <button
                                    className="btn-upload-image"
                                    onClick={() => document.getElementById('receipt-file').click()}
                                    disabled={isUploading || isProcessing}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" />
                                        <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    Choose Image
                                </button>

                                <button
                                    className="btn-upload-pdf"
                                    onClick={() => document.getElementById('receipt-file').click()}
                                    disabled={isUploading || isProcessing}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Choose PDF
                                </button>
                            </div>

                            {/* Process Button */}
                            {selectedFile && (
                                <button
                                    className="btn-process"
                                    onClick={async () => {
                                        if (!selectedFile) {
                                            setError('No file selected to process.');
                                            return;
                                        }

                                        setIsUploading(true);
                                        setError('');

                                        try {
                                            setUploadedFile(selectedFile);
                                            const fileToProcess = selectedFile;
                                            setSelectedFile(null);
                                            document.getElementById('receipt-file').value = '';
                                            setIsUploading(false);
                                            await handleProcessReceipt(fileToProcess);
                                        } catch (error) {
                                            console.error('Upload & Process error:', error);
                                            setError('Failed to upload and process file. Please try again.');
                                            setIsUploading(false);
                                        }
                                    }}
                                    disabled={isUploading || isProcessing}
                                >
                                    {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : 'Process Receipt'}
                                </button>
                            )}

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="message error-message">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="message success-message">
                                    {success}
                                </div>
                            )}

                            {/* Loading States */}
                            {(isUploading || isProcessing) && (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <span>{isUploading ? 'Uploading...' : 'Processing receipt...'}</span>
                                </div>
                            )}

                            <input
                                type="file"
                                id="receipt-file"
                                style={{ display: 'none' }}
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </div>

                    {/* Right Column - Receipt History */}
                    <div className="history-section">
                        <div className="history-card">
                            <div className="history-header">
                                <h2 className="history-title">Receipt History</h2>
                                <span className="receipt-count">{recentReceipts.length} receipts processed</span>
                            </div>

                            <div className="receipt-list">
                                {isLoadingHistory ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <span>Loading receipt history...</span>
                                    </div>
                                ) : recentReceipts.length === 0 ? (
                                    <div className="empty-state">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <h3 style={{ color: '#6b7280', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>No receipts processed yet</h3>
                                        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>Upload your first receipt to get started!</p>
                                    </div>
                                ) : (
                                    recentReceipts.map((receipt) => (
                                        <div key={receipt.id} className="receipt-item">
                                            <div className="receipt-main-info">
                                                <h3 className="receipt-name">{receipt.name}</h3>
                                                <div className="receipt-confidence">{receipt.confidence}</div>
                                            </div>
                                            <div className="receipt-details">
                                                <span className="receipt-amount">{receipt.amount}</span>
                                                <span className="receipt-separator">•</span>
                                                <span className="receipt-date">{receipt.date}</span>
                                                <span className="receipt-separator">•</span>
                                                <span className="receipt-category">{receipt.category}</span>
                                            </div>
                                            <button
                                                className="receipt-delete-btn"
                                                onClick={() => handleDeleteReceipt(receipt.id)}
                                                title="Delete receipt log"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                            <button className="receipt-view-btn" title="View details">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* How to Use Section */}
                <div className="how-to-use-section">
                    <h2 className="how-to-title">How to Use Receipt Scanner</h2>

                    <div className="steps-container">
                        <div className="step-item">
                            <div className="step-icon upload-step">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 11V17M9 14L12 11L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="step-content">
                                <h3 className="step-title">1. Upload Receipt</h3>
                                <p className="step-description">Take a clear photo of your receipt or upload a PDF file</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-icon processing-step">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L13.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="step-content">
                                <h3 className="step-title">2. AI Processing</h3>
                                <p className="step-description">Our AI extracts amount, date, merchant, and category information</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-icon save-step">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 21L5 21C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3L16 3L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="step-content">
                                <h3 className="step-title">3. Review & Save</h3>
                                <p className="step-description">Review the extracted data and save it as a transaction</p>
                            </div>
                        </div>
                    </div>

                    {/* Tips Section */}
                    <div className="tips-section">
                        <div className="tips-icon">💡</div>
                        <div className="tips-content">
                            <h3 className="tips-title">Tips for Better Results</h3>
                            <ul className="tips-list">
                                <li>Ensure the receipt is well-lit and clearly visible</li>
                                <li>Make sure all text on the receipt is readable</li>
                                <li>For best results, align the receipt properly in the image</li>
                                <li>PDF receipts from online purchases work great too</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Extracted Data Modal/Section */}
                {extractedData && (
                    <div className="extracted-data-overlay">
                        <div className="extracted-data-modal">
                            <div className="modal-header">
                                <h3>Review Extracted Data</h3>
                                <button
                                    className="close-btn"
                                    onClick={() => setExtractedData(null)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Description</label>
                                        <input
                                            type="text"
                                            value={extractedData.description || ''}
                                            onChange={(e) => setExtractedData({
                                                ...extractedData,
                                                description: e.target.value
                                            })}
                                            placeholder="Transaction description"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Amount</label>
                                        <input
                                            type="number"
                                            value={extractedData.amount || ''}
                                            onChange={(e) => setExtractedData({
                                                ...extractedData,
                                                amount: parseFloat(e.target.value) || 0
                                            })}
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Category</label>
                                        <select
                                            value={extractedData.category || ''}
                                            onChange={(e) => setExtractedData({
                                                ...extractedData,
                                                category: e.target.value
                                            })}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(category => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={extractedData.date || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setExtractedData({
                                                ...extractedData,
                                                date: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn-discard"
                                    onClick={handleDiscard}
                                    disabled={isProcessing}
                                >
                                    Discard
                                </button>
                                <button
                                    className="btn-save"
                                    onClick={handleSaveTransaction}
                                    disabled={isProcessing || !extractedData.description || !extractedData.amount || !extractedData.category}
                                >
                                    {isProcessing ? 'Saving...' : 'Save as Transaction'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Receipts;