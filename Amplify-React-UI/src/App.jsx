import { useState } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      setMessage('')
    } else {
      setMessage('Please select a valid image file')
      setSelectedFile(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setMessage('Please select an image first')
      return
    }

    setLoading(true)
    setMessage('Uploading image...')

    try {
      // TODO: Replace with actual AWS API Gateway endpoint
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Replace with API endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedImage(data.imageUrl || URL.createObjectURL(selectedFile))
        setResults(data.results || [])
        setMessage('Image submitted successfully!')
      } else {
        setMessage('Failed to upload image. Please try again.')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage('Error uploading image.')
      setUploadedImage(URL.createObjectURL(selectedFile))
      setResults([
        { id: 1, label: 'Result 1', value: 'Sample data' },
        { id: 2, label: 'Result 2', value: 'Sample data' }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <h1>Athlete Lookalike Finder</h1>

      <div className="content-wrapper">
        <div className="upload-section">
          <h2>Upload Image to be Matched</h2>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              id="file-input"
              className="file-input"
              disabled={loading}
            />
            <label htmlFor="file-input" className="file-label">
              {selectedFile ? selectedFile.name : 'Choose an image...'}
            </label>
          </div>

          {selectedFile && (
            <div className="selected-file-info">
              <p>Selected: <strong>{selectedFile.name}</strong></p>
              <p>Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="submit-button"
            disabled={loading || !selectedFile}
          >
            {loading ? 'Uploading...' : 'Submit Image'}
          </button>

          {message && (
            <div className={`message ${message.includes('Error') || message.includes('Failed') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="results-section">
          {uploadedImage && (
            <div className="image-display">
              <h2>Received Image</h2>
              <img src={uploadedImage} alt="Uploaded" className="result-image" />
            </div>
          )}

          {results.length > 0 && (
            <div className="results-list">
              <h2>Results</h2>
              <ul>
                {results.map((result, index) => (
                  <li key={result.id || index} className="result-item">
                    <span className="result-label">{result.label || `Result ${index + 1}`}:</span>
                    <span className="result-value">{result.value || JSON.stringify(result)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!uploadedImage && !results.length && (
            <div className="empty-state">
              <p>Submit an image to see results here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
