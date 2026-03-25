import { useState } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // AWS API Configuration
  const API_BASE_URL = "https://chv7dtcng0.execute-api.us-east-1.amazonaws.com"
  const SEARCH_ENDPOINT = `${API_BASE_URL}/search`
  const UPLOAD_URL = import.meta.env.VITE_IMAGE_UPLOAD_URL;

  if (!UPLOAD_URL) {
    console.warn('VITE_IMAGE_UPLOAD_URL environment variable is not set')
  }

  const TEAMS = ["Kansas City Chiefs", "Buffalo Bills"]
  const RETURN_COUNT = 3

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    const allowedTypes = ['image/jpeg', 'image/png']
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (file && allowedTypes.includes(file.type) && file.size <= maxSize) {
      setSelectedFile(file)
      setMessage('')
    } else {
      const sizeMessage = file && file.size > maxSize ? ' (file size must be less than 5MB)' : ''
      setMessage(`Please select a valid image file (JPG or PNG only)${sizeMessage}`)
      setSelectedFile(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setMessage('Please select an image first')
      return
    }

    setLoading(true)
    setMessage('Processing image...')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': selectedFile.type
        },
        body: selectedFile
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to S3')
      }

      const uploadData = await uploadResponse.json()
      const imageSUri = uploadData.imageUri || uploadData.image_s3_uri

      console.log('Upload response:', uploadData)
      console.log('Image S3 URI:', imageSUri)

      setMessage('Searching for matches...')
      
      const searchPayload = {
        image_s3_uri: imageSUri,
        team_names: TEAMS,
        return_count: RETURN_COUNT
      }

      const searchResponse = await fetch(SEARCH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchPayload)
      })

      if (!searchResponse.ok) {
        throw new Error(`API error: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      
      // Set the uploaded image preview
      setUploadedImage(URL.createObjectURL(selectedFile))
      
      // Parse results from API response
      // eslint-disable-next-line no-unused-vars
      const parsedResults = (searchData.matches || []).map((result, index) => ({
        id: result.player_id,
        playerName: result.player_id,  // Display the ID until you fetch full details
        confidence: result.similarity
      }))

      setResults(parsedResults)
      setMessage('Match results found!')
    } catch (error) {
      console.error('Error processing image:', error)
      setMessage(`Error: ${error.message}`)
      setUploadedImage(URL.createObjectURL(selectedFile))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <h1>GameFace</h1>

      <div className="content-wrapper">
        <div className="upload-section">
          <h2>Upload Image to be Matched</h2>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept="image/jpeg,image/png"
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

          {selectedFile && (
            <div className="image-preview">
              <h3>Image Preview</h3>
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="preview-image" 
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="submit-button"
            disabled={loading || !selectedFile}
          >
            {loading ? 'Processing...' : 'Submit Image'}
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
              <h2>Match Results</h2>
              {results.map((result, index) => (
                <div key={result.id || index} className="match-result">
                  <div className="photos-container">
                    {result.athletePhoto && (
                      <div className="photo-section">
                        <h4>Matched Athlete</h4>
                        <img src={result.athletePhoto} alt="Athlete photo" className="match-photo" />
                      </div>
                    )}
                  </div>
                  <div className="match-details">
                    {result.playerName && (
                      <div className="detail-row">
                        <span className="detail-label">Player Name:</span>
                        <span className="detail-value">{result.playerName}</span>
                      </div>
                    )}
                    {result.team && (
                      <div className="detail-row">
                        <span className="detail-label">Team:</span>
                        <span className="detail-value">{result.team}</span>
                      </div>
                    )}
                    {result.league && (
                      <div className="detail-row">
                        <span className="detail-label">League:</span>
                        <span className="detail-value">{result.league}</span>
                      </div>
                    )}
                    {result.confidence !== undefined && (
                      <div className="detail-row">
                        <span className="detail-label">Confidence Score:</span>
                        <span className="detail-value confidence">{(result.confidence * 100).toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
