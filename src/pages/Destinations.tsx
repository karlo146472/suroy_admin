import { MapPin, Pencil, Plus, SearchX, Tags, Trash2 } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DestinationForm from '../components/destinations/DestinationForm'
import type { MapMarker } from '../components/map/MapView'
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterSelect,
  LoadingState,
  Modal,
  PageHeader,
  SearchBar,
  StatusBadge,
  Toolbar,
  type Column,
  useToast,
} from '../components/ui'
import type { DestinationRecord } from '../lib/destinationTypes'
import { SANTO_TOMAS_CENTER } from '../lib/mapDefaults'
import { useDestinationOptions } from '../hooks/useDestinationOptions'
import { recordFromValues, valuesFromRecord } from '../lib/destinationForm'
import { deleteDestination, fetchDestinations, updateDestination } from '../lib/destinations'

// Loaded on demand so the map library isn't part of every page's bundle.
const MapView = lazy(() => import('../components/map/MapView'))

const EDIT_FORM_ID = 'edit-destination-form'

const statusOptions = [
  { value: 'Featured', label: 'Featured' },
  { value: 'Standard', label: 'Standard' },
]

const formatFee = (fee: number) => (fee === 0 ? 'Free' : `₱${fee.toLocaleString()}`)

function StatusCell({ status }: { status: DestinationRecord['status'] }) {
  return <StatusBadge tone={status === 'Featured' ? 'success' : 'neutral'}>{status}</StatusBadge>
}

function EditButton({ name, onEdit }: { name: string; onEdit: () => void }) {
  return (
    <button
      type="button"
      className="btn btn--small"
      aria-label={`Edit ${name}`}
      onClick={(e) => {
        // Don't also select the row on the map.
        e.stopPropagation()
        onEdit()
      }}
    >
      <Pencil size={14} /> Edit
    </button>
  )
}

function RowActions({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="row-actions">
      <EditButton name={name} onEdit={onEdit} />
      <button
        type="button"
        className="btn btn--small btn--danger-text"
        aria-label={`Delete ${name}`}
        onClick={(e) => {
          // Don't also select the row on the map.
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  )
}

export default function Destinations() {
  const toast = useToast()
  const [destinations, setDestinations] = useState<DestinationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { options, error: optionsError, retry: retryOptions } = useDestinationOptions()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const mapSectionRef = useRef<HTMLDivElement>(null)


  const loadDestinations = useCallback(async () => {
    try {
      setDestinations(await fetchDestinations())
      setLoadError(null)
    } catch {
      setLoadError('Could not load the destinations. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // First load. (Retry and "after saving" reuse loadDestinations above.)
  useEffect(() => {
    let cancelled = false
    fetchDestinations()
      .then((list) => {
        if (!cancelled) setDestinations(list)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the destinations. Check your connection and try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Every category in the database, plus any a destination still uses that is no longer listed.
  const categoryOptions = [...new Set([...(options?.categoryNames ?? []), ...destinations.map((d) => d.category)])].map(
    (name) => ({ value: name, label: name }),
  )

  const deleting = destinations.find((d) => d.id === deletingId) ?? null
  const editing = destinations.find((d) => d.id === editingId) ?? null
  const otherNames = destinations.filter((d) => d.id !== editingId).map((d) => d.name)

  const columns: Column<DestinationRecord>[] = [
    { key: 'name', header: 'Destination', render: (d) => <strong>{d.name}</strong> },
    { key: 'category', header: 'Category' },
    { key: 'barangay', header: 'Location', render: (d) => `${d.barangay}, Santo Tomas` },
    { key: 'entranceFee', header: 'Entrance Fee', render: (d) => formatFee(d.entranceFee) },
    { key: 'operatingHours', header: 'Hours' },
    { key: 'status', header: 'Status', render: (d) => <StatusCell status={d.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <RowActions name={d.name} onEdit={() => setEditingId(d.id)} onDelete={() => setDeletingId(d.id)} />
      ),
    },
  ]

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return destinations.filter(
      (d) =>
        (!category || d.category === category) &&
        (!status || d.status === status) &&
        (!query || `${d.name} ${d.barangay} ${d.category}`.toLowerCase().includes(query)),
    )
  }, [destinations, search, category, status])

  // A selection that has been filtered out of the list is dropped.
  const activeId = filtered.some((d) => d.id === selectedId) ? selectedId : null

  const markers = useMemo<MapMarker[]>(
    () =>
      filtered.map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: `${d.category} · ${d.barangay}`,
        latitude: d.latitude,
        longitude: d.longitude,
      })),
    [filtered],
  )

  // Keep the selected row or card in view when a marker is clicked.
  useEffect(() => {
    if (activeId === null) return
    document
      .querySelectorAll(`[data-row-key="${activeId}"]`)
      .forEach((el) => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [activeId])

  const selectFromList = (d: DestinationRecord) => {
    setSelectedId(d.id)
    mapSectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setStatus('')
  }

  return (
    <>
      <PageHeader
        title="Destinations"
        description="Browse and filter tourist destinations in Santo Tomas."
        actions={
          <>
            <Link to="/destinations/categories" className="btn">
              <Tags size={16} /> Manage Categories
            </Link>
            <Link to="/destinations/new" className="btn btn--primary">
              <Plus size={16} /> Add Destination
            </Link>
          </>
        }
      />
      <Toolbar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search destinations..." />
        <FilterSelect label="Category" value={category} options={categoryOptions} onChange={setCategory} />
        <FilterSelect label="Status" value={status} options={statusOptions} onChange={setStatus} />
        <span className="toolbar__count" aria-live="polite">
          Showing {filtered.length} of {destinations.length} destinations
        </span>
      </Toolbar>

      {isLoading ? (
        <LoadingState label="Loading destinations..." />
      ) : loadError ? (
        <EmptyState
          title="Could not load destinations"
          description={loadError}
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsLoading(true)
                void loadDestinations()
              }}
            >
              Try Again
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No destinations found"
          description="Try a different search or clear the filters."
          action={
            <button type="button" className="btn" onClick={clearFilters}>
              Clear Filters
            </button>
          }
        />
      ) : (
        <>
          <div ref={mapSectionRef} className="destinations-map">
            <Suspense fallback={<LoadingState label="Loading map..." />}>
              <MapView
                label="Map of destinations. Select a marker to see the destination."
                markers={markers}
                center={SANTO_TOMAS_CENTER}
                height="100%"
                selectedId={activeId}
                onMarkerClick={(m) => setSelectedId(m.id as number)}
              />
            </Suspense>
          </div>
          <div className="responsive-table">
            <DataTable label="Destinations"
              columns={columns}
              rows={filtered}
              getRowKey={(d) => d.id}
              selectedKey={activeId}
              onRowClick={selectFromList}
            />
          </div>
          <ul className="card-list">
            {filtered.map((d) => (
              <li
                key={d.id}
                data-row-key={d.id}
                className={`record-card is-clickable${d.id === activeId ? ' is-selected' : ''}`}
                tabIndex={0}
                aria-current={d.id === activeId ? 'true' : undefined}
                onClick={() => selectFromList(d)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectFromList(d)
                  }
                }}
              >
                <div className="record-card__head">
                  <strong>{d.name}</strong>
                  <StatusCell status={d.status} />
                </div>
                <span className="record-card__meta">
                  <MapPin size={14} /> {d.barangay}, Santo Tomas
                </span>
                <div className="record-card__row">
                  <span>{d.category}</span>
                  <span>{formatFee(d.entranceFee)}</span>
                </div>
                <div className="record-card__row">
                  <span className="record-card__meta">{d.operatingHours}</span>
                  <RowActions name={d.name} onEdit={() => setEditingId(d.id)} onDelete={() => setDeletingId(d.id)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete Destination?"
        message={
          deleting
            ? `“${deleting.name}” will be permanently removed from the app, along with its reviews, favorites and trip entries. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeletingId(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteDestination(deleting.id)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'The destination could not be deleted. Please try again.')
            return
          }
          setDestinations((list) => list.filter((d) => d.id !== deleting.id))
          setDeletingId(null)
          toast.success(`“${deleting.name}” was deleted.`)
        }}
      />

      <Modal
        wide
        open={editing !== null}
        title={editing ? `Edit ${editing.name}` : 'Edit Destination'}
        onClose={() => setEditingId(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditingId(null)}>
              Cancel
            </button>
            <button type="submit" form={EDIT_FORM_ID} className="btn btn--primary">
              Save Changes
            </button>
          </>
        }
      >
        {/* Mounted only while editing, so the form (and its map) always starts from the saved data. */}
        {editing && optionsError && (
          <EmptyState
            title="Could not load the form"
            description={optionsError}
            action={
              <button type="button" className="btn" onClick={retryOptions}>
                Try Again
              </button>
            }
          />
        )}
        {editing && !optionsError && !options && <LoadingState label="Loading form..." />}
        {editing && options && (
          <DestinationForm
            key={editing.id}
            formId={EDIT_FORM_ID}
            showActions={false}
            initialValues={valuesFromRecord(editing)}
            existingNames={otherNames}
            categoryNames={options.categoryNames}
            activityOptions={options.activityOptions}
            facilityOptions={options.facilityOptions}
            submitLabel="Save Changes"
            onSubmit={async (values) => {
              const updated = recordFromValues(values)
              try {
                await updateDestination(editing.id, updated, values.image, editing.imageUrl)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'The destination could not be saved. Please try again.')
                return
              }
              await loadDestinations()
              setEditingId(null)
              toast.success(`“${updated.name}” was updated.`)
            }}
          />
        )}
      </Modal>
    </>
  )
}
