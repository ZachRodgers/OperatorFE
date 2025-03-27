import React, { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import './UploadSpreadsheet.css';

interface ParsedEntry {
    plateNumber: string;
    name: string;
    email: string;
    phone: string | null;
    matchType?: 'exact' | 'plate-only' | 'email-only' | 'new' | 'email-change' | 'phone-change' | 'name-change' | 'phone-add';
}

interface ExistingEntry {
    plateNumber: string;
    name: string;
    email: string;
    phone: string | null;
}

interface UploadSpreadsheetProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToRegistry: (entries: ParsedEntry[]) => void;
    existingEntries: ExistingEntry[];
}

const UploadSpreadsheet: React.FC<UploadSpreadsheetProps> = ({ isOpen, onClose, onAddToRegistry, existingEntries }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [infoMessages, setInfoMessages] = useState<string[]>([]);
    const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadingMessages = [
        'Parsing Sheet...',
        'Counting Vehicles...',
        'Validating Data...',
        'Checking Format...',
        'Almost Done...'
    ];

    // Add possible header names for each column
    const possiblePlateHeaders = ['plate', 'license', 'vehicle', 'id', 'user', 'parker', 'guest', 'registration', 'tag', 'number'];
    const possibleNameHeaders = ['name', 'owner', 'contact', 'person', 'driver', 'user', 'parker', 'guest'];
    const possibleEmailHeaders = ['email', 'e-mail', 'mail', 'contact'];
    const possiblePhoneHeaders = ['phone', 'number', 'tel', 'telephone', 'mobile', 'cell', 'contact'];

    const downloadTemplate = () => {
        const headers = ['Plate', 'Name', 'Email', 'Phone'];
        const csvContent = [
            headers.join(','),
            'ABC123,John Doe,john@example.com,555-555-5555'
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'plate_registry_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset state
        setParsedEntries([]);
        setErrors([]);
        setInfoMessages([]);
        setIsLoading(true);
        let messageIndex = 0;

        // Start cycling through loading messages
        const messageInterval = setInterval(() => {
            setLoadingMessage(loadingMessages[messageIndex]);
            messageIndex = (messageIndex + 1) % loadingMessages.length;
        }, 1500);

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    // Try to detect if the file is tab-delimited
                    const rawData = utils.sheet_to_txt(sheet, { FS: '\t' });
                    const jsonData = utils.sheet_to_json(sheet, { raw: false });

                    if (!jsonData || jsonData.length === 0) {
                        throw new Error('Spreadsheet is empty or has no data');
                    }

                    // Find column indices by header names
                    const headers = Object.keys(jsonData[0] || {});
                    if (!headers || headers.length === 0) {
                        throw new Error('Could not find column headers in the spreadsheet');
                    }

                    // Log the raw headers for debugging
                    console.log('Raw headers:', headers);

                    // Clean and normalize headers
                    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
                    console.log('Normalized headers:', normalizedHeaders);

                    const plateIndex = headers.findIndex(h =>
                        possiblePlateHeaders.some(possible => h.toLowerCase().trim().includes(possible.toLowerCase())));
                    const nameIndex = headers.findIndex(h =>
                        possibleNameHeaders.some(possible => h.toLowerCase().trim().includes(possible.toLowerCase())));
                    const emailIndex = headers.findIndex(h =>
                        possibleEmailHeaders.some(possible => h.toLowerCase().trim().includes(possible.toLowerCase())));
                    const phoneIndex = headers.findIndex(h =>
                        possiblePhoneHeaders.some(possible => h.toLowerCase().trim().includes(possible.toLowerCase())));

                    // Log the found indices
                    console.log('Found indices:', { plateIndex, nameIndex, emailIndex, phoneIndex });

                    if (plateIndex === -1) {
                        throw new Error('Could not find a column for license plate numbers. Please make sure you have a column with "Plate" in the header.');
                    }

                    if (nameIndex === -1) {
                        throw new Error('Could not find a column for names. Please make sure you have a column with "Name" in the header.');
                    }

                    // Parse entries
                    const entries: ParsedEntry[] = [];
                    const newErrors: string[] = [];
                    const overlappingPlates: string[] = [];

                    // Log headers for debugging
                    console.log('Found headers:', headers);
                    console.log('Indices:', { plateIndex, nameIndex, emailIndex, phoneIndex });

                    jsonData.forEach((row: any, index: number) => {
                        // Log raw row data for debugging
                        console.log(`Row ${index + 1}:`, row);

                        const plate = String(row[headers[plateIndex]] || '').trim().toUpperCase();
                        const name = String(row[headers[nameIndex]] || '').trim();
                        const email = String(row[headers[emailIndex]] || '').trim();
                        const phone = String(row[headers[phoneIndex]] || '').trim();

                        // Log processed values for debugging
                        console.log(`Processed values for row ${index + 1}:`, { plate, name, email, phone });

                        if (!plate || !name) {
                            newErrors.push(`Row ${index + 1}: Missing required fields (plate and name)`);
                            return;
                        }

                        if (email && !/\S+@\S+\.\S+/.test(email)) {
                            newErrors.push(`Row ${index + 1}: Invalid email format`);
                        }

                        // Only validate phone if it's not empty and contains invalid characters
                        if (phone && !/^[\d\s\-()]+$/.test(phone)) {
                            newErrors.push(`Row ${index + 1}: Phone number can only contain numbers, spaces, hyphens, and parentheses`);
                        }

                        // Check for matches with existing entries
                        const existingEntry = existingEntries.find(e => e.plateNumber.toUpperCase() === plate);
                        let matchType: ParsedEntry['matchType'] = 'new';

                        if (existingEntry) {
                            overlappingPlates.push(plate);
                            if (existingEntry.email === email && existingEntry.phone === phone && existingEntry.name === name) {
                                matchType = 'exact';
                            } else if (email && !existingEntry.email) {
                                matchType = 'email-only';
                            } else if (email && existingEntry.email && email !== existingEntry.email) {
                                matchType = 'email-change';
                            } else if (phone && !existingEntry.phone) {
                                matchType = 'phone-add';
                            } else if (phone && existingEntry.phone && phone !== existingEntry.phone) {
                                matchType = 'phone-change';
                            } else if (name !== existingEntry.name) {
                                matchType = 'name-change';
                            } else {
                                matchType = 'plate-only';
                            }
                        }

                        entries.push({
                            plateNumber: plate,
                            name,
                            email,
                            phone: phone || null,
                            matchType
                        });
                    });

                    setParsedEntries(entries);
                    setErrors(newErrors);

                    // Add info message for overlapping plates if any exist
                    if (overlappingPlates.length > 0) {
                        setInfoMessages([
                            `${overlappingPlates.length} plate(s) already exist in your registry: ${overlappingPlates.join(', ')}`
                        ]);
                    }
                } catch (error: any) {
                    setErrors([error.message || 'Failed to parse spreadsheet. Please check the format and try again.']);
                }
            };

            reader.onerror = () => {
                setErrors(['Failed to read the file. Please make sure it\'s a valid CSV file.']);
                setIsLoading(false);
                clearInterval(messageInterval);
            };

            reader.readAsBinaryString(file);
        } catch (error: any) {
            setErrors([error.message || 'Failed to read file. Please try again.']);
        } finally {
            clearInterval(messageInterval);
            setIsLoading(false);
        }
    };

    const handleDiscard = () => {
        setShowConfirmDiscard(true);
    };

    const confirmDiscard = () => {
        setShowConfirmDiscard(false);
        onClose();
    };

    const handleAddToRegistry = () => {
        // Filter out exact matches and prepare entries for the registry
        const entriesToAdd = parsedEntries.filter(entry => entry.matchType !== 'exact');
        onAddToRegistry(entriesToAdd);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="upload-spreadsheet-overlay">
            <div className="upload-spreadsheet-modal">
                <h2>Upload Spreadsheet</h2>

                {isLoading ? (
                    <div className="upload-spreadsheet-loading">
                        <div className="loading-spinner"></div>
                        <p>{loadingMessage}</p>
                    </div>
                ) : errors.length > 0 ? (
                    <div className="upload-spreadsheet-error">
                        <div className="error-icon">⚠️</div>
                        <h3>Upload Issues</h3>
                        <div className="error-messages2">
                            {errors.map((error, index) => (
                                <p key={index} className="error-message">
                                    {error}
                                </p>
                            ))}
                        </div>
                        <div className="upload-spreadsheet-actions">
                            <button className="button secondary" onClick={onClose}>Cancel</button>
                            <button className="button secondary" onClick={downloadTemplate}>Download Template</button>
                            <button className="button primary" onClick={() => {
                                setErrors([]);
                                setParsedEntries([]);
                                fileInputRef.current?.click();
                            }}>
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : parsedEntries.length > 0 ? (
                    <div className="upload-spreadsheet-preview">
                        <p className="preview-note">
                            Found {parsedEntries.length} entries. Review them below before adding to registry.
                        </p>
                        <div className="preview-table-container">
                            {infoMessages.length > 0 && (
                                <div className="info-messages1">
                                    {infoMessages.map((message, index) => (
                                        <p key={index} className="info-message">
                                            {message}
                                        </p>
                                    ))}
                                </div>
                            )}
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>Plate</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedEntries.map((entry, index) => (
                                        <tr key={index} className={`preview-row ${entry.matchType}`}>
                                            <td>{entry.plateNumber}</td>
                                            <td>{entry.name}</td>
                                            <td>{entry.email}</td>
                                            <td>{entry.phone}</td>
                                            <td>
                                                {entry.matchType === 'exact' && 'Exact Match'}
                                                {entry.matchType === 'plate-only' && 'New Info'}
                                                {entry.matchType === 'email-only' && 'New Email'}
                                                {entry.matchType === 'email-change' && 'Replace Email'}
                                                {entry.matchType === 'phone-add' && 'New Phone'}
                                                {entry.matchType === 'phone-change' && 'Replace Phone'}
                                                {entry.matchType === 'name-change' && 'Replace Name'}
                                                {entry.matchType === 'new' && 'New Entry'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="upload-spreadsheet-actions">
                            <button className="button secondary" onClick={onClose}>Cancel</button>
                            <button className="button secondary" onClick={downloadTemplate}>Download Template</button>
                            <button className="button primary" onClick={handleAddToRegistry}>
                                Add to Registry
                            </button>
                        </div>
                        <p className="add-note">
                            Note: When added these entries may be edited. Ensure you save registry before leaving page.
                        </p>
                    </div>
                ) : (
                    <div className="upload-spreadsheet-upload">
                        <div className="upload-icon">📄</div>
                        <p>Drop your spreadsheet here or click to browse</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".csv"
                            style={{ display: 'none' }}
                        />
                        <div className="upload-spreadsheet-actions">
                            <button className="button secondary" onClick={onClose}>Cancel</button>
                            <button className="button secondary" onClick={downloadTemplate}>Download Template</button>
                            <button className="button primary" onClick={() => fileInputRef.current?.click()}>
                                Select File
                            </button>
                        </div>
                        <p className="file-types">Please use CSV format only.</p>
                    </div>
                )}
            </div>

            {showConfirmDiscard && (
                <div className="upload-spreadsheet-overlay">
                    <div className="upload-spreadsheet-modal confirm-modal">
                        <h3>Discard Upload?</h3>
                        <p>Are you sure you want to discard these entries? This action cannot be undone.</p>
                        <div className="upload-spreadsheet-actions">
                            <button className="button secondary" onClick={() => setShowConfirmDiscard(false)}>
                                Cancel
                            </button>
                            <button className="button primary" onClick={confirmDiscard}>
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadSpreadsheet; 