import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

export interface MapMarker {
  id: string | number
  name: string
  latitude: number
  longitude: number
  /** Second line in the popup, e.g. a category or barangay. */
  subtitle?: string
  /** Pin colour; defaults to the SUROY green. */
  color?: string
}

interface MapViewProps {
  markers: MapMarker[]
  /** [longitude, latitude] shown when there are no markers. */
  center: [number, number]
  zoom?: number
  height?: number | string
  /** Names the map for screen readers. */
  label?: string
  /** Marker to highlight and focus; its popup is opened and the map flies to it. */
  selectedId?: string | number | null
  onMarkerClick?: (marker: MapMarker) => void
  /** Location picker: a single pin the user can place by clicking the map or by dragging. */
  pin?: { latitude: number; longitude: number } | null
  /** When set, the map is in picker mode: clicks and pin drags report the new position. */
  onPinChange?: (latitude: number, longitude: number) => void
  /** A dashed line through these [longitude, latitude] points, e.g. between a route's ends. */
  line?: [number, number][] | null
}

// Same free OpenFreeMap style (OSM data, no API key) used by the mobile app.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Material Design "location_on" glyph, same pin as the mobile app.
const PIN_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'
const PIN_COLOR = '#2E7D32'
const PIN_COLOR_SELECTED = '#FFB300'
const FOCUS_ZOOM = 14

function createPinElement(label: string, color: string = PIN_COLOR): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cursor = 'pointer'
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', label)
  el.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" style="display:block;transform-origin:bottom center;transition:transform .15s"><path fill="${color}" d="${PIN_PATH}"/></svg>`
  return el
}

function setPinSelected(el: HTMLElement, selected: boolean, baseColor: string = PIN_COLOR) {
  const svg = el.querySelector('svg')
  const path = el.querySelector('path')
  if (!svg || !path) return
  path.setAttribute('fill', selected ? PIN_COLOR_SELECTED : baseColor)
  svg.style.transform = selected ? 'scale(1.3)' : 'scale(1)'
  el.style.zIndex = selected ? '1' : ''
}

function buildPopupContent(marker: MapMarker): HTMLElement {
  // Built with DOM nodes and textContent so marker text is never parsed as HTML.
  const root = document.createElement('div')
  const name = document.createElement('strong')
  name.textContent = marker.name
  root.appendChild(name)
  if (marker.subtitle) {
    const sub = document.createElement('div')
    sub.textContent = marker.subtitle
    sub.style.color = '#757575'
    root.appendChild(sub)
  }
  return root
}

export default function MapView({
  markers,
  center,
  zoom = 11,
  height = 420,
  label = 'Map',
  selectedId = null,
  onMarkerClick,
  pin = null,
  onPinChange,
  line = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const instancesRef = useRef(new Map<string | number, maplibregl.Marker>())
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null)
  const flownToRef = useRef<string | number | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onPinChangeRef = useRef(onPinChange)

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
    onPinChangeRef.current = onPinChange
  })

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({ container: containerRef.current, style: MAP_STYLE, center, zoom })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', (e) => onPinChangeRef.current?.(e.lngLat.lat, e.lngLat.lng))
    if (onPinChangeRef.current) map.getCanvas().style.cursor = 'crosshair'
    mapRef.current = map
    // The container can be hidden or resized after creation (e.g. inside a modal that opens later).
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      pinMarkerRef.current = null
    }
    // Initial view only; later changes to center/zoom don't recreate the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep markers in sync with the `markers` prop.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const instances = instancesRef.current

    markers.forEach((marker) => {
      const el = createPinElement(marker.name, marker.color)
      el.addEventListener('click', () => onMarkerClickRef.current?.(marker))
      const popup = new maplibregl.Popup({ offset: [0, -34], closeButton: false }).setDOMContent(
        buildPopupContent(marker),
      )
      const instance = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map)
      instances.set(marker.id, instance)
    })

    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      markers.forEach((m) => bounds.extend([m.longitude, m.latitude]))
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
    } else if (markers.length === 1) {
      map.jumpTo({ center: [markers[0].longitude, markers[0].latitude], zoom: FOCUS_ZOOM })
    }

    return () => {
      instances.forEach((m) => m.remove())
      instances.clear()
    }
  }, [markers])

  // Highlight the selected marker, open its popup, and fly to it when the selection changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    instancesRef.current.forEach((instance, id) => {
      const isSelected = id === selectedId
      setPinSelected(instance.getElement(), isSelected, markers.find((m) => m.id === id)?.color)
      const popup = instance.getPopup()
      if (popup && popup.isOpen() !== isSelected) instance.togglePopup()
    })

    const selected = selectedId === null ? undefined : instancesRef.current.get(selectedId)
    if (selected && flownToRef.current !== selectedId) {
      map.flyTo({ center: selected.getLngLat(), zoom: Math.max(map.getZoom(), FOCUS_ZOOM), duration: 800 })
    }
    flownToRef.current = selected ? selectedId : null
  }, [markers, selectedId])

  // Keep the dashed line in sync with the `line` prop.
  const lineKey = line ? JSON.stringify(line) : ''
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      const data: Parameters<maplibregl.GeoJSONSource['setData']>[0] = {
        type: 'FeatureCollection',
        features: lineKey
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: JSON.parse(lineKey) } }]
          : [],
      }
      const source = map.getSource('route-line') as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData(data)
        return
      }
      map.addSource('route-line', { type: 'geojson', data })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-line',
        paint: { 'line-color': PIN_COLOR, 'line-width': 3, 'line-dasharray': [2, 2] },
      })
    }

    // getStyle() is only defined once the style has loaded; until then wait for the first load.
    if (map.getStyle()) apply()
    else map.once('load', apply)
    return () => {
      map.off('load', apply)
    }
  }, [lineKey])

  // Keep the picker pin in sync with the `pin` prop.
  const pinLat = pin?.latitude
  const pinLng = pin?.longitude
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (pinLat === undefined || pinLng === undefined) {
      pinMarkerRef.current?.remove()
      pinMarkerRef.current = null
      return
    }

    let marker = pinMarkerRef.current
    if (!marker) {
      const el = createPinElement('Selected location')
      setPinSelected(el, true)
      marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: Boolean(onPinChangeRef.current) })
      const dragged = marker
      marker.on('dragend', () => {
        const { lat, lng } = dragged.getLngLat()
        onPinChangeRef.current?.(lat, lng)
      })
      // maplibre needs a position before the marker is added to the map.
      marker.setLngLat([pinLng, pinLat]).addTo(map)
      pinMarkerRef.current = marker
    }
    marker.setLngLat([pinLng, pinLat])
    if (!map.getBounds().contains([pinLng, pinLat])) map.easeTo({ center: [pinLng, pinLat] })
  }, [pinLat, pinLng])

  return <div ref={containerRef} className="map-view" style={{ height }} role="region" aria-label={label} />
}
