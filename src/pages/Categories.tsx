import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormField,
  LoadingState,
  Modal,
  PageHeader,
  type Column,
  useToast,
} from '../components/ui'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  renameCategory,
  type CategoryRecord,
} from '../lib/categories'

const FORM_ID = 'category-form'

function validateName(name: string, otherNames: string[]): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) return 'Enter a category name.'
  if (trimmed.length < 2) return 'Name must be at least 2 characters.'
  if (trimmed.length > 40) return 'Name must be 40 characters or fewer.'
  if (otherNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return 'A category with this name already exists.'
  return undefined
}

interface CategoryDialogProps {
  /** The category being edited, or null when adding. */
  category: CategoryRecord | null
  otherNames: string[]
  onClose: () => void
  /** Resolves when saved; rejects with a readable message if it failed. */
  onSave: (name: string) => Promise<void>
}

/** Mounted only while open, so the field always starts fresh. */
function CategoryDialog({ category, otherNames, onClose, onSave }: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const error = validateName(name, otherNames)

  // Runs after the Modal has opened, so typing can start straight away.
  useEffect(() => inputRef.current?.focus(), [])

  return (
    <Modal
      open
      title={category ? 'Edit Category' : 'Add Category'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={async (e) => {
          e.preventDefault()
          setTouched(true)
          if (error || saving) return
          setSaving(true)
          try {
            await onSave(name.trim())
          } finally {
            setSaving(false)
          }
        }}
      >
        <FormField
          label="Category name"
          required
          error={touched ? error : undefined}
          hint={category ? 'Renaming also updates the destinations in this category.' : undefined}
        >
          {(c) => (
            <input
              {...c}
              ref={inputRef}
              className="input"
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          )}
        </FormField>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ category: CategoryRecord | null } | null>(null)
  // The category the administrator is being asked to confirm deleting.
  const [deleting, setDeleting] = useState<CategoryRecord | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchCategories())
      setLoadError(null)
    } catch {
      setLoadError('Could not load the categories. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // First load. (Retry and "after saving" reuse loadCategories above.)
  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((list) => {
        if (!cancelled) setCategories(list)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the categories. Check your connection and try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteCategory(deleting.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The category could not be deleted. Please try again.')
      return
    }
    toast.success(`“${deleting.name}” was deleted.`)
    setDeleting(null)
    await loadCategories()
  }

  const columns: Column<CategoryRecord>[] = [
    { key: 'name', header: 'Category', render: (c) => <strong>{c.name}</strong> },
    { key: 'destinations', header: 'Destinations', render: (c) => c.destinationCount },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="row-actions">
          <button type="button" className="btn btn--small" aria-label={`Edit ${c.name}`} onClick={() => setDialog({ category: c })}>
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            className="btn btn--small btn--danger-text"
            aria-label={`Delete ${c.name}`}
            disabled={c.destinationCount > 0}
            title={c.destinationCount > 0 ? 'Move or remove its destinations first.' : undefined}
            onClick={() => setDeleting(c)}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group destinations so visitors can browse them. A category can only be deleted when no destination uses it."
        actions={
          <>
            <Link to="/destinations" className="btn">
              <ArrowLeft size={16} /> Back to Destinations
            </Link>
            <button type="button" className="btn btn--primary" onClick={() => setDialog({ category: null })}>
              <Plus size={16} /> Add Category
            </button>
          </>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading categories..." />
      ) : loadError ? (
        <EmptyState
          title="Could not load categories"
          description={loadError}
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsLoading(true)
                void loadCategories()
              }}
            >
              Try Again
            </button>
          }
        />
      ) : (
        <DataTable
          label="Categories"
          columns={columns}
          rows={categories}
          getRowKey={(c) => c.id}
          emptyTitle="No categories yet"
          emptyDescription="Add a category to start grouping destinations."
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete Category?"
        message={deleting ? `“${deleting.name}” will be permanently deleted. No destinations use it. This can't be undone.` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />

      {dialog && (
        <CategoryDialog
          category={dialog.category}
          otherNames={categories.filter((c) => c.id !== dialog.category?.id).map((c) => c.name)}
          onClose={() => setDialog(null)}
          onSave={async (name) => {
            try {
              if (dialog.category) await renameCategory(dialog.category.id, name)
              else await createCategory(name)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'The category could not be saved. Please try again.')
              return
            }
            toast.success(dialog.category ? `“${name}” was updated.` : `“${name}” was added.`)
            setDialog(null)
            await loadCategories()
          }}
        />
      )}
    </>
  )
}
