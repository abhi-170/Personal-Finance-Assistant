import React, { useState } from 'react';
import Layout from '../components/Layout';
import { receiptAPI, transactionAPI } from '../services/api';

const Receipts = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    // Categories for the form
    const categories = [
        'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
        'Healthcare', 'Education', 'Travel', 'Personal Care', 'Home & Garden',
        'Insurance', 'Taxes', 'Miscellaneous'
    ];

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
            <div className="receipt-upload-container">
                <div className="receipt-upload-card">
                    <h1 className="receipt-upload-header">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Upload Receipt
                    </h1>
                    <p className="receipt-upload-description">
                        Upload a receipt image (JPEG, JPG, PNG) or PDF file to automatically extract transaction details using AI-powered OCR.
                    </p>

                    {error && (
                        <div className="receipt-error">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {success && (
                        <div className="receipt-success">
                            <strong>Success:</strong> {success}
                        </div>
                    )}

                    {!selectedFile && !uploadedFile ? (
                        <div
                            className={`receipt-upload-area ${isDragOver ? 'dragover' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="receipt-upload-icon">📁</div>
                            <div className="receipt-upload-text">Select a receipt file to upload</div>
                            <div className="receipt-upload-subtext">or drag and drop here</div>
                            <button
                                type="button"
                                className="receipt-browse-button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    document.getElementById('receipt-file').click();
                                }}
                            >
                                Browse Files
                            </button>
                        </div>
                    ) : selectedFile ? (
                        <div className="receipt-selected-file">
                            <div className="receipt-file-info">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div>
                                    <div className="receipt-file-name">{selectedFile.name}</div>
                                    <div className="receipt-file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</div>
                                </div>
                            </div>
                            <button
                                className="receipt-remove-button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setError('');
                                    setSuccess('');
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="receipt-uploaded-file">
                            <div className="receipt-file-info">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div>
                                    <div className="receipt-file-name">{uploadedFile.name}</div>
                                    <div className="receipt-file-size">({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB) - Uploaded</div>
                                </div>
                            </div>
                            <button
                                className="receipt-remove-button"
                                onClick={handleDeleteUploaded}
                                title="Delete uploaded file"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        id="receipt-file"
                        className="receipt-upload-input"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileSelect}
                    />

                    {isUploading && (
                        <div className="receipt-loading">
                            <div className="receipt-spinner"></div>
                            Uploading file...
                        </div>
                    )}

                    {isProcessing && (
                        <div className="receipt-loading">
                            <div className="receipt-spinner"></div>
                            Processing receipt...
                        </div>
                    )}

                    {/* Buttons Section */}
                    {selectedFile && (
                        <div className="receipt-button-group">
                            {/* Upload Only Button */}
                            <button
                                className="receipt-upload-button"
                                onClick={handleUpload}
                                disabled={isUploading || isProcessing}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M17 8L12 3L7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 3V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {isUploading ? 'Uploading...' : 'Upload Only'}
                            </button>

                            {/* Upload & Process Button */}
                            <button
                                className="receipt-process-button"
                                onClick={async () => {
                                    if (!selectedFile) {
                                        setError('No file selected to process.');
                                        return;
                                    }

                                    // Set uploading state
                                    setIsUploading(true);
                                    setError('');

                                    try {
                                        // Store the file temporarily
                                        setUploadedFile(selectedFile);
                                        const fileToProcess = selectedFile;
                                        setSelectedFile(null);

                                        // Clear the file input
                                        const fileInput = document.getElementById('receipt-file');
                                        if (fileInput) fileInput.value = '';

                                        setIsUploading(false);

                                        // Now process the file directly
                                        await handleProcessReceipt(fileToProcess);
                                    } catch (error) {
                                        console.error('Upload & Process error:', error);
                                        setError('Failed to upload and process file. Please try again.');
                                        setIsUploading(false);
                                    }
                                }}
                                disabled={isUploading || isProcessing}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : 'Upload & Process'}
                            </button>
                        </div>
                    )}

                    {/* Process Button - Only show when file is uploaded but not processed */}
                    {uploadedFile && !extractedData && (
                        <button
                            className="receipt-process-button"
                            onClick={() => handleProcessReceipt()}
                            disabled={isProcessing}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {isProcessing ? 'Processing...' : 'Process Receipt'}
                        </button>
                    )}

                    {/* Upload Another Button - Show when we have uploaded file or extracted data */}
                    {(uploadedFile || extractedData) && (
                        <button
                            className="receipt-upload-another-button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById('receipt-file').click();
                            }}
                            disabled={isUploading || isProcessing}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Upload Another File
                        </button>
                    )}
                </div>

                {/* Extracted Data Section */}
                {extractedData && (
                    <div className="receipt-extracted-data">
                        {isProcessing && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(255, 255, 255, 0.9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                zIndex: 10
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div className="receipt-spinner"></div>
                                    <p style={{ marginTop: '1rem', color: '#6b7280' }}>Saving transaction...</p>
                                </div>
                            </div>
                        )}

                        <h2 className="receipt-extracted-header">Extracted Transaction Data</h2>
                        <p className="receipt-extracted-description">
                            Review and edit the extracted information before saving as a transaction.
                        </p>

                        <div className="receipt-form-grid">
                            <div className="receipt-form-group">
                                <label className="receipt-form-label">Description</label>
                                <input
                                    type="text"
                                    className="receipt-form-input"
                                    value={extractedData.description || ''}
                                    onChange={(e) => setExtractedData({
                                        ...extractedData,
                                        description: e.target.value
                                    })}
                                    placeholder="Transaction description"
                                />
                            </div>

                            <div className="receipt-form-group">
                                <label className="receipt-form-label">Amount</label>
                                <input
                                    type="number"
                                    className="receipt-form-input"
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

                            <div className="receipt-form-group">
                                <label className="receipt-form-label">Category</label>
                                <select
                                    className="receipt-form-select"
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

                            <div className="receipt-form-group">
                                <label className="receipt-form-label">Date</label>
                                <input
                                    type="date"
                                    className="receipt-form-input"
                                    value={extractedData.date || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setExtractedData({
                                        ...extractedData,
                                        date: e.target.value
                                    })}
                                />
                            </div>
                        </div>

                        <div className="receipt-form-actions">
                            <button
                                className="receipt-discard-button"
                                onClick={handleDiscard}
                                disabled={isProcessing}
                            >
                                Discard
                            </button>
                            <button
                                className="receipt-save-button"
                                onClick={handleSaveTransaction}
                                disabled={isProcessing || !extractedData.description || !extractedData.amount || !extractedData.category}
                            >
                                {isProcessing ? 'Saving...' : 'Save as Transaction'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Receipts;