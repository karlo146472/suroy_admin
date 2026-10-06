import { CalendarDays, Pencil, SearchX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import UserDetails from '../components/users/UserDetails'
import UserForm from '../components/users/UserForm'
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
  type BadgeTone,
  type Column,
  useToast,
} from '../components/ui'
import { updateAdminName, useCurrentAdmin } from '../hooks/session'
import { valuesFromUser, type UserFormValues } from '../lib/userForm'
import { fetchUsers, updateUser, USER_ROLES, type UserRecord, type UserRole } from '../lib/users'

const EDIT_FORM_ID = 'edit-user-form'

const roleOptions = USER_ROLES.map((r) => ({ value: r, label: r }))

const roleTone: Record<UserRole, BadgeTone> = {
  'Tourism Administrator': 'info',
  Business: 'warning',
  Traveler: 'neutral',
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

function UserCell({ user }: { user: UserRecord }) {
  return (
    <span className="user-cell">
      <span className="user-cell__avatar" aria-hidden="true">
        {initials(user.name)}
      </span>
      <span className="user-cell__text">
        <strong>{user.name}</strong>
        <span className="user-cell__email">{user.email}</span>
      </span>
    </span>
  )
}

const RoleBadge = ({ role }: { role: UserRole }) => <StatusBadge tone={roleTone[role]}>{role}</StatusBadge>

function EditButton({ user, onEdit }: { user: UserRecord; onEdit: () => void }) {
  return (
    <div className="row-actions">
      <button
        type="button"
        className="btn btn--small"
        aria-label={`Edit ${user.name}`}
        onClick={(e) => {
          // Don't also open the details view.
          e.stopPropagation()
          onEdit()
        }}
      >
        <Pencil size={14} /> Edit
      </button>
    </div>
  )
}

export default function Users() {
  const toast = useToast()
  const { admin } = useCurrentAdmin()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  // Edit values waiting for the administrator to confirm a change that removes someone's access.
  const [pendingEdit, setPendingEdit] = useState<UserFormValues | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await fetchUsers())
      setLoadError(null)
    } catch {
      setLoadError('Could not load the users. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // First load. (Retry and "after saving" reuse loadUsers above.)
  useEffect(() => {
    let cancelled = false
    fetchUsers()
      .then((list) => {
        if (!cancelled) setUsers(list)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the users. Check your connection and try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const viewing = users.find((u) => u.id === viewingId) ?? null
  const editing = users.find((u) => u.id === editingId) ?? null
  // The only administrator must stay one, or nobody could manage the dashboard. The database enforces this too.
  const administrators = users.filter((u) => u.role === 'Tourism Administrator')
  const editingIsLastAdmin = editing !== null && administrators.length === 1 && administrators[0].id === editing.id

  const removesAdminRights = (values: UserFormValues) =>
    editing !== null && editing.role === 'Tourism Administrator' && values.role !== 'Tourism Administrator'

  const applyEdit = async (values: UserFormValues) => {
    if (!editing) return
    try {
      await updateUser(editing.id, { name: values.name, role: values.role })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The user could not be saved. Please try again.')
      setPendingEdit(null)
      return
    }
    // Keep the header in step when administrators rename themselves here.
    if (admin && admin.id === editing.id) updateAdminName(values.name.trim())
    await loadUsers()
    setEditingId(null)
    setPendingEdit(null)
    toast.success(`“${values.name.trim()}” was updated.`)
  }

  const pendingName = pendingEdit?.name.trim() || editing?.name || 'This user'
  const actionsFor = (u: UserRecord) => <EditButton user={u} onEdit={() => setEditingId(u.id)} />

  const columns: Column<UserRecord>[] = [
    { key: 'user', header: 'User', render: (u) => <UserCell user={u} /> },
    { key: 'role', header: 'Role', render: (u) => <RoleBadge role={u.role} /> },
    { key: 'registeredAt', header: 'Registered', render: (u) => formatDate(u.registeredAt) },
    { key: 'actions', header: 'Actions', align: 'right', render: actionsFor },
  ]

  // Newest registrations first (the database already returns them in that order).
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter(
      (u) => (!role || u.role === role) && (!query || `${u.name} ${u.email}`.toLowerCase().includes(query)),
    )
  }, [users, search, role])

  const clearFilters = () => {
    setSearch('')
    setRole('')
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="People with an account on SUROY: travelers, businesses and administrators. New accounts are created when people register in the app."
      />
      <Toolbar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." />
        <FilterSelect label="Role" value={role} options={roleOptions} onChange={setRole} />
        <span className="toolbar__count" aria-live="polite">
          Showing {filtered.length} of {users.length} users
        </span>
      </Toolbar>

      {isLoading ? (
        <LoadingState label="Loading users..." />
      ) : loadError ? (
        <EmptyState
          title="Could not load users"
          description={loadError}
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsLoading(true)
                void loadUsers()
              }}
            >
              Try Again
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No users found"
          description="Try a different search or clear the filters."
          action={
            <button type="button" className="btn" onClick={clearFilters}>
              Clear Filters
            </button>
          }
        />
      ) : (
        <>
          <div className="responsive-table">
            <DataTable label="Users" columns={columns} rows={filtered} getRowKey={(u) => u.id} onRowClick={(u) => setViewingId(u.id)} />
          </div>
          <ul className="card-list">
            {filtered.map((u) => (
              <li
                key={u.id}
                className="record-card is-clickable"
                tabIndex={0}
                onClick={() => setViewingId(u.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setViewingId(u.id)
                  }
                }}
              >
                <div className="record-card__head">
                  <UserCell user={u} />
                </div>
                <div className="record-card__row">
                  <RoleBadge role={u.role} />
                  <span className="record-card__meta">
                    <CalendarDays size={14} /> {formatDate(u.registeredAt)}
                  </span>
                </div>
                <div className="record-card__row">
                  <span />
                  {actionsFor(u)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={viewing !== null}
        title="User Details"
        onClose={() => setViewingId(null)}
        footer={
          <button type="button" className="btn" onClick={() => setViewingId(null)}>
            Close
          </button>
        }
      >
        {viewing && (
          <UserDetails
            user={viewing}
            onEdit={() => {
              // Swap one dialog for the other.
              setViewingId(null)
              setEditingId(viewing.id)
            }}
          />
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={editing ? `Edit ${editing.name}` : 'Edit User'}
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
          <UserForm
            key={editing.id}
            formId={EDIT_FORM_ID}
            email={editing.email}
            protectLastAdmin={editingIsLastAdmin}
            initialValues={valuesFromUser(editing)}
            onSubmit={async (values) => {
              if (removesAdminRights(values)) setPendingEdit(values)
              else await applyEdit(values)
            }}
          />
        )}
      </Modal>

      {/* Opens on top of the edit dialog; Cancel returns to it with everything still filled in. */}
      <ConfirmDialog
        open={pendingEdit !== null}
        tone="caution"
        title="Remove Administrator Access?"
        message={`${pendingName} will no longer be an administrator and will lose access to this dashboard. You can change this again later from the Edit dialog, by another administrator.`}
        confirmLabel="Remove Access"
        onCancel={() => setPendingEdit(null)}
        onConfirm={() => {
          if (pendingEdit) void applyEdit(pendingEdit)
        }}
      />
    </>
  )
}
