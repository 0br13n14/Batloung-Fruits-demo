import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { Modal } from './Modal'

const MASERU = { latitude: -29.3167, longitude: 27.4833 }
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
let lastNominatimRequestAt = 0

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function abortableDelay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeout)
      reject(new DOMException('The request was aborted.', 'AbortError'))
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function nominatimRequest(endpoint, params, signal) {
  const wait = Math.max(0, 1000 - (Date.now() - lastNominatimRequestAt))
  if (wait) await abortableDelay(wait, signal)
  if (signal.aborted) throw new DOMException('The request was aborted.', 'AbortError')

  lastNominatimRequestAt = Date.now()
  const query = new URLSearchParams({
    ...params,
    addressdetails: '1',
    format: 'jsonv2',
  })
  const response = await fetch(`${NOMINATIM_URL}/${endpoint}?${query}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'en' },
    referrerPolicy: 'origin',
    signal,
  })
  if (!response.ok) throw new Error('The place search service is unavailable.')
  return response.json()
}

function MapClickHandler({ onSelect, readOnly }) {
  useMapEvents({
    click(event) {
      if (!readOnly) onSelect(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function MapCenterUpdater({ coordinates }) {
  const map = useMap()

  useEffect(() => {
    map.setView([coordinates.latitude, coordinates.longitude])
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize({ pan: false })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [coordinates.latitude, coordinates.longitude, map])

  return null
}

function getSuggestedArea(place) {
  const address = place.address ?? {}
  return (
    address.suburb ??
    address.neighbourhood ??
    address.village ??
    address.town ??
    address.city ??
    address.county ??
    place.display_name ??
    ''
  )
}

export function MapPicker({
  isOpen,
  initialLocation,
  readOnly = false,
  onCancel,
  onConfirm,
}) {
  const [coordinates, setCoordinates] = useState(() => ({
    latitude: Number(initialLocation?.latitude) || MASERU.latitude,
    longitude: Number(initialLocation?.longitude) || MASERU.longitude,
  }))
  const [area, setArea] = useState(initialLocation?.location_area ?? '')
  const [hasLocation, setHasLocation] = useState(
    initialLocation?.latitude != null && initialLocation?.longitude != null,
  )
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchMessage, setSearchMessage] = useState('')
  const [reverseMessage, setReverseMessage] = useState('')
  const [reverseCoordinates, setReverseCoordinates] = useState(null)
  const [searchStatus, setSearchStatus] = useState('idle')
  const [reverseStatus, setReverseStatus] = useState('idle')
  const debouncedSearch = useDebouncedValue(search, 1000)
  const debouncedCoordinates = useDebouncedValue(reverseCoordinates, 1000)
  const searchRequestId = useRef(0)
  const reverseRequestId = useRef(0)
  const searchController = useRef(null)
  const areaWasEdited = useRef(false)

  useEffect(() => {
    if (!isOpen || readOnly || !debouncedSearch.trim()) return undefined

    const controller = new AbortController()
    const requestId = ++searchRequestId.current
    searchController.current = controller
    nominatimRequest(
      'search',
      { q: debouncedSearch.trim(), countrycodes: 'ls', limit: '5' },
      controller.signal,
    )
      .then((results) => {
        if (searchRequestId.current !== requestId) return
        setSearchResults(results)
        setSearchStatus('complete')
        setSearchMessage(results.length ? '' : 'No places found in Lesotho.')
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && searchRequestId.current === requestId) {
          setSearchResults([])
          setSearchStatus('complete')
          setSearchMessage('Place search is unavailable. You can choose a point on the map.')
        }
      })

    return () => {
      controller.abort()
      if (searchController.current === controller) searchController.current = null
    }
  }, [debouncedSearch, isOpen, readOnly])

  useEffect(() => {
    if (!isOpen || readOnly || !debouncedCoordinates) return undefined

    const controller = new AbortController()
    const requestId = ++reverseRequestId.current
    nominatimRequest(
      'reverse',
      {
        lat: String(debouncedCoordinates.latitude),
        lon: String(debouncedCoordinates.longitude),
        zoom: '18',
      },
      controller.signal,
    )
      .then((place) => {
        if (reverseRequestId.current !== requestId) return
        const suggestion = getSuggestedArea(place)
        if (suggestion) {
          if (!areaWasEdited.current) setArea(suggestion)
          setReverseStatus('complete')
        } else {
          setReverseStatus('complete')
          setReverseMessage('No area name was found. Enter one manually.')
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && reverseRequestId.current === requestId) {
          setReverseStatus('complete')
          setReverseMessage('Area lookup is unavailable. Enter the area name manually.')
        }
      })

    return () => controller.abort()
  }, [debouncedCoordinates, isOpen, readOnly])

  function selectCoordinates(latitude, longitude) {
    areaWasEdited.current = false
    reverseRequestId.current += 1
    searchRequestId.current += 1
    searchController.current?.abort()
    setCoordinates({ latitude, longitude })
    setHasLocation(true)
    setReverseCoordinates({ latitude, longitude })
    setReverseMessage('')
    setReverseStatus('pending')
    setSearchResults([])
    setSearchStatus('idle')
  }

  function selectSearchResult(result) {
    const latitude = Number(result.lat)
    const longitude = Number(result.lon)
    searchRequestId.current += 1
    searchController.current?.abort()
    selectCoordinates(latitude, longitude)
    setSearchResults([])
    setSearchStatus('idle')
    setSearchMessage('')
  }

  const formattedCoordinates = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
  const coordinateText = hasLocation
    ? `Latitude, longitude: ${formattedCoordinates}`
    : 'No location selected'
  const isSearching =
    searchStatus === 'waiting' && search.trim() === debouncedSearch.trim()
  const isResolvingArea = reverseStatus === 'pending'

  return (
    <Modal
      closeOnOverlayClick={!isResolvingArea && !isSearching}
      dialogClassName="map-picker-dialog"
      description={
        readOnly
          ? 'Saved vendor location.'
          : 'Search for a place, or click the map to place the marker. You can drag the marker to adjust.'
      }
      footer={
        <div className="map-picker-footer">
          <p className="map-coordinate">{coordinateText}</p>
          <div className="map-picker-footer-actions">
            <button className="button button--secondary" onClick={onCancel} type="button">
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                className="button button--primary"
                disabled={!hasLocation || !area.trim()}
                onClick={() =>
                  onConfirm({
                    latitude: Number(coordinates.latitude.toFixed(6)),
                    longitude: Number(coordinates.longitude.toFixed(6)),
                    location_area: area.trim(),
                  })
                }
                type="button"
              >
                Confirm location
              </button>
            )}
          </div>
        </div>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={readOnly ? 'Vendor location' : 'Select vendor location'}
    >
      <div className="record-form">
        {!readOnly && (
          <>
            <label className="form-field" htmlFor="place-search">
              <span>Search Lesotho places</span>
              <input
                autoComplete="off"
                id="place-search"
                onChange={(event) => {
                  const value = event.target.value
                  searchRequestId.current += 1
                  searchController.current?.abort()
                  setSearch(value)
                  setSearchResults([])
                  setSearchMessage('')
                  setSearchStatus(value.trim() ? 'waiting' : 'idle')
                }}
                placeholder="Place or street"
                type="search"
                value={search}
              />
            </label>
            {(isSearching || searchMessage || searchResults.length > 0) && (
              <div aria-live="polite">
                {isSearching && <p className="map-coordinate">Searching places...</p>}
                {searchMessage && <p className="inline-error" role="status">{searchMessage}</p>}
                {searchResults.length > 0 && (
                  <div aria-label="Place search results" className="map-search-results">
                    {searchResults.map((result) => (
                      <button
                        key={result.place_id}
                        onClick={() => selectSearchResult(result)}
                        type="button"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <MapContainer
          center={[coordinates.latitude, coordinates.longitude]}
          className="vendor-map"
          scrollWheelZoom
          zoom={13}
        >
          <MapCenterUpdater coordinates={coordinates} />
          <MapClickHandler onSelect={selectCoordinates} readOnly={readOnly} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasLocation && (
            <Marker
              draggable={!readOnly}
              eventHandlers={{
                dragend(event) {
                  const point = event.target.getLatLng()
                  selectCoordinates(point.lat, point.lng)
                },
              }}
              position={[coordinates.latitude, coordinates.longitude]}
            />
          )}
        </MapContainer>
        {readOnly ? (
          <p>{area || 'No area name recorded.'}</p>
        ) : (
          <label className="form-field" htmlFor="map-area">
            <span>Location / area</span>
            <input
              id="map-area"
              maxLength={255}
              onChange={(event) => {
                areaWasEdited.current = true
                setReverseMessage('')
                setArea(event.target.value)
              }}
              required
              value={area}
            />
          </label>
        )}
        {isResolvingArea && <p className="map-coordinate">Looking up the area name...</p>}
        {reverseMessage && <p className="inline-error" role="status">{reverseMessage}</p>}
      </div>
    </Modal>
  )
}
