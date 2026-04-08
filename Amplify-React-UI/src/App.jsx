import { useState } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('all')

  // AWS API Configuration
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  const SEARCH_ENDPOINT = `${API_BASE_URL}/search`
  const UPLOAD_URL = `${API_BASE_URL}/upload`
  const DETAIL_URL = `${API_BASE_URL}/player-details`

  if (!UPLOAD_URL) {
    console.warn('VITE_IMAGE_UPLOAD_URL environment variable is not set')
  }

  const TEAMS = ["Kansas City Chiefs", "Buffalo Bills"]
  const RETURN_COUNT = 5

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

  // NEW: Add team change handler
  const handleTeamChange = (event) => {
    setSelectedTeam(event.target.value)
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setMessage('Please select an image first')
      return
    }

    setLoading(true)
    setMessage('Processing image...')

    try {
      const fileDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Unable to read file as data URL'))
        reader.readAsDataURL(selectedFile)
      })
      const base64Image = fileDataUrl.split(',')[1] || ''

      const uploadResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_base64: base64Image
        })
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to S3')
      }

      const uploadData = await uploadResponse.json()
      const imageSUri = uploadData.imageUri || uploadData.image_s3_uri

      console.log('Upload response:', uploadData)
      console.log('Image S3 URI:', imageSUri)

      setMessage('Searching for matches...')

      console.log('selectedTeam:', selectedTeam)
      console.log('TEAMS array:', TEAMS)
      const teamsToUse = selectedTeam === 'all' ? [...TEAMS] : TEAMS.filter(team => team === selectedTeam)
      console.log('teamsToUse:', teamsToUse)

      const searchPayload = {
        image_s3_uri: imageSUri,
        team_names: teamsToUse,
        return_count: RETURN_COUNT
      }

      console.log('searchPayload:', searchPayload)

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

      console.log('searchData from API:', searchData)
      console.log('matches array:', searchData.matches)

      setUploadedImage(URL.createObjectURL(selectedFile))

      const playerIds = (searchData.matches || []).map(m => m.player_id)
      console.log('playerIds extracted:', playerIds)

      const detailsPromises = playerIds.map(async (playerId) => {
        const detailRes = await fetch(DETAIL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId })
        })

        if (!detailRes.ok) {
          throw new Error(`player-details failed for ${playerId}: ${detailRes.status}`)
        }

        return detailRes.json()
      })

      const detailsResponses = await Promise.all(detailsPromises)
      console.log('detailsResponses:', detailsResponses)

      const parsedResults = (searchData.matches || []).map((match, i) => {
        const playerDetails = (detailsResponses[i] && detailsResponses[i].player) || {}

        return {
          id: match.player_id,
          playerName: playerDetails.name || match.player_id,
          team: playerDetails.team || 'unknown',
          league: playerDetails.league || 'unknown',
          athletePhoto: playerDetails.original_image_url || playerDetails.s3_url || match.image_url || null,
          confidence: (match.similarity !== undefined) ? (match.similarity) : 0
        }
      })

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
          
          <div className="team-selector">
            <label htmlFor="team-select">Select Team:</label>
            <select
              id="team-select"
              value={selectedTeam}
              onChange={handleTeamChange}
              disabled={loading}
              className="team-select"
            >
              <option value="all">All Teams</option>
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

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
                        <span className="detail-value confidence">{(result.confidence).toFixed(2)}%</span>
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
