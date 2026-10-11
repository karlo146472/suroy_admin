import { ArrowRight, Clock, Pencil, Plus, SearchX, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import RouteForm from '../components/transportation/RouteForm'
import RoutesForm from '../components/transportation/RoutesForm'
import RouteMapPanel from '../components/transportation/RouteMapPanel'
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterSelect,
  LoadingState,
  Modal,
  PageHeader,
  SearchBar,
  Toolbar,
  type Column,
  useToast,
} from '../components/ui'
import type { DestinationRecord } from '../lib/destinationTypes'
import { fetchDestinations } from '../lib/destinations'
import { inputFromValues, inputsFromMulti, valuesFromRecord } from '../lib/routeForm'
import {
  createRoutes,
  deleteRoute,
  fetchRoutes,
  isFreeTransport,
  ROUTE_ORIGIN,
  TRANSPORT_TYPES,
  updateRoute,
  type RouteRecord,
} from '../lib/transportation'

const ADD_FORM_ID = 'add-route-form'
const EDIT_FORM_ID = 'edit-route-form'

/** A route's fare as text: "Free" for the traveler's own car, otherwise the amount or range. */
const formatFare = (route: RouteRecord) =>
  isFreeTransport(route.transportType)
    ? 'Free'
    : route.fareMin === route.fareMax
      ? `₱${route.fareMin.toLocaleString()}`
      : `₱${route.fareMin.toLocaleString()} – ₱${route.fareMax.toLocaleString()}`

function RouteName({ route }: { route: RouteRecord }) {
  return (
    <span className="route-name">
      {ROUTE_ORIGIN} <ArrowRight size={14} aria-label="to" /> {route.destinationName}
    </span>
  )
}

function RowActions({ route, onEdit, onDelete }: { route: RouteRecord; onEdit: () => void; onDelete: () => void }) {
  const label = `${route.destinationName} by ${route.transportType}`
  return (
    <div className="row-actions">
      <button
        type="button"
        className="btn btn--small"
        aria-label={`Edit route to ${label}`}
        onClick={(e) => {
          // Don't also select the row on the map.
          e.stopPropagation()
          onEdit()
        }}
      >
        <Pencil size={14} /> Edit
      </button>
      <button
        type="button"
        className="btn btn--small btn--danger-text"
        aria-label={`Delete route to ${label}`}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  )
}

const routeLabel = (r: Pick<RouteRecord, 'destinationName' | 'transportType'>) =>
  `${ROUTE_ORIGIN} to ${r.destinationName} (${r.transportType})`

export default function Transportation() {
  const toast = useToast()
  const [routes, setRoutes] = useState<RouteRecord[]>([])
  const [destinations, setDestinations] = useState<DestinationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const [routeList, destinationList] = await Promise.all([fetchRoutes(), fetchDestinations()])
      setRoutes(routeList)
      setDestinations(destinationList)
      setLoadError(null)
    } catch {
      setLoadError('Could not load the routes. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // First load. (Retry and "after saving" reuse loadAll above.)
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchRoutes(), fetchDestinations()])
      .then(([routeList, destinationList]) => {
        if (cancelled) return
        setRoutes(routeList)
        setDestinations(destinationList)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the routes. Check your connection and try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The suggested types, plus any type already used by a route in the database.
  const transportTypes = useMemo(
    () => [...new Set([...TRANSPORT_TYPES, ...routes.map((r) => r.transportType).filter(Boolean)])],
    [routes],
  )
  const typeOptions = transportTypes.map((t) => ({ value: t, label: t }))
  const destinationChoices = useMemo(() => destinations.map((d) => ({ id: d.id, name: d.name })), [destinations])

  const editing = routes.find((r) => r.id === editingId) ?? null
  const deleting = routes.find((r) => r.id === deletingId) ?? null
  const otherRoutes = useMemo(() => routes.filter((r) => r.id !== editingId), [routes, editingId])

  const columns: Column<RouteRecord>[] = [
    { key: 'route', header: 'Route', render: (r) => <strong><RouteName route={r} /></strong> },
    { key: 'transportType', header: 'Transport Type' },
    { key: 'fare', header: 'Fare', render: (r) => formatFare(r) },
    { key: 'duration', header: 'Estimated Duration' },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => <RowActions route={r} onEdit={() => setEditingId(r.id)} onDelete={() => setDeletingId(r.id)} />,
    },
  ]

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return routes.filter(
      (r) =>
        (!type || r.transportType === type) &&
        (!query || `${r.destinationName} ${r.transportType}`.toLowerCase().includes(query)),
    )
  }, [routes, search, type])

  // A selection that was filtered out or deleted is dropped.
  const selectedRoute = filtered.find((r) => r.id === selectedId) ?? null

  const clearFilters = () => {
    setSearch('')
    setType('')
  }

  return (
    <>
      <PageHeader
        title="Transportation"
        description="Routes and fares for getting to destinations in Santo Tomas."
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add Transportation
          </button>
        }
      />
      <Toolbar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search routes..." />
        <FilterSelect label="Transport type" value={type} options={typeOptions} onChange={setType} />
        <span className="toolbar__count" aria-live="polite">
          Showing {filtered.length} of {routes.length} routes
        </span>
      </Toolbar>

      {isLoading ? (
        <LoadingState label="Loading routes..." />
      ) : loadError ? (
        <EmptyState
          title="Could not load routes"
          description={loadError}
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsLoading(true)
                void loadAll()
              }}
            >
              Try Again
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No routes found"
          description={routes.length === 0 ? 'Add the first route.' : 'Try a different search or clear the filters.'}
          action={
            routes.length > 0 ? (
              <button type="button" className="btn" onClick={clearFilters}>
                Clear Filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <RouteMapPanel route={selectedRoute} destinations={destinations} />
          <div className="responsive-table">
            <DataTable label="Transportation routes"
              columns={columns}
              rows={filtered}
              getRowKey={(r) => r.id}
              selectedKey={selectedRoute?.id ?? null}
              onRowClick={(r) => setSelectedId(r.id)}
            />
          </div>
          <ul className="card-list">
            {filtered.map((r) => (
              <li
                key={r.id}
                className={`record-card is-clickable${r.id === selectedRoute?.id ? ' is-selected' : ''}`}
                tabIndex={0}
                aria-current={r.id === selectedRoute?.id ? 'true' : undefined}
                onClick={() => setSelectedId(r.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedId(r.id)
                  }
                }}
              >
                <div className="record-card__head">
                  <strong>
                    <RouteName route={r} />
                  </strong>
                </div>
                <div className="record-card__row">
                  <span>{r.transportType}</span>
                  <span>{formatFare(r)}</span>
                </div>
                <div className="record-card__row">
                  <span className="record-card__meta">
                    <Clock size={14} /> {r.duration}
                  </span>
                  <RowActions route={r} onEdit={() => setEditingId(r.id)} onDelete={() => setDeletingId(r.id)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete Route?"
        message={
          deleting
            ? `The route “${routeLabel(deleting)}” will be permanently removed. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeletingId(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteRoute(deleting.id)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'The route could not be deleted. Please try again.')
            return
          }
          setRoutes((list) => list.filter((r) => r.id !== deleting.id))
          setDeletingId(null)
          toast.success(`Route “${routeLabel(deleting)}” was deleted.`)
        }}
      />

      <Modal
        wide
        open={adding}
        title="Add Transportation"
        onClose={() => setAdding(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" form={ADD_FORM_ID} className="btn btn--primary">
              Save
            </button>
          </>
        }
      >
        {/* Mounted only while open, so the form always starts empty. One destination, any number of ways to get there. */}
        {adding && (
          <RoutesForm
            formId={ADD_FORM_ID}
            destinations={destinationChoices}
            existingRoutes={routes}
            onSubmit={async (values) => {
              const inputs = inputsFromMulti(values)
              try {
                await createRoutes(inputs)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'The routes could not be saved. Please try again.')
                return
              }
              await loadAll()
              setAdding(false)
              toast.success(inputs.length === 1 ? 'The route was added.' : `${inputs.length} routes were added.`)
            }}
          />
        )}
      </Modal>

      <Modal
        wide
        open={editing !== null}
        title={editing ? `Edit Route: ${ROUTE_ORIGIN} to ${editing.destinationName}` : 'Edit Route'}
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
        {/* Mounted only while editing, so the form always starts from the saved data. */}
        {editing && (
          <RouteForm
            key={editing.id}
            formId={EDIT_FORM_ID}
            showActions={false}
            initialValues={valuesFromRecord(editing)}
            destinations={destinationChoices}
            transportTypes={transportTypes}
            existingRoutes={otherRoutes}
            submitLabel="Save Changes"
            onSubmit={async (values) => {
              try {
                await updateRoute(editing.id, inputFromValues(values))
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'The route could not be saved. Please try again.')
                return
              }
              await loadAll()
              setEditingId(null)
              toast.success('The route was updated.')
            }}
          />
        )}
      </Modal>
    </>
  )
}
