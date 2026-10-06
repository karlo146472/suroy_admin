import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DestinationForm from '../components/destinations/DestinationForm'
import { EmptyState, LoadingState, PageHeader, useToast } from '../components/ui'
import { useDestinationOptions } from '../hooks/useDestinationOptions'
import { emptyDestinationForm, recordFromValues } from '../lib/destinationForm'
import { createDestination, fetchDestinations } from '../lib/destinations'

export default function AddDestination() {
  const navigate = useNavigate()
  const toast = useToast()
  const { options, error: optionsError, retry } = useDestinationOptions()
  // Names already taken, so the form can reject duplicates.
  const [existingNames, setExistingNames] = useState<string[] | null>(null)

  useEffect(() => {
    fetchDestinations()
      .then((list) => setExistingNames(list.map((d) => d.name)))
      .catch(() => setExistingNames([]))
  }, [])

  return (
    <>
      <PageHeader
        title="Add Destination"
        description="Fill in the details of the new tourist destination."
        actions={
          <Link to="/destinations" className="btn">
            <ArrowLeft size={16} /> Back to Destinations
          </Link>
        }
      />
      {optionsError ? (
        <EmptyState
          title="Could not load the form"
          description={optionsError}
          action={
            <button type="button" className="btn" onClick={retry}>
              Try Again
            </button>
          }
        />
      ) : !options || !existingNames ? (
        <LoadingState label="Loading form..." />
      ) : (
        <DestinationForm
          initialValues={emptyDestinationForm}
          existingNames={existingNames}
          categoryNames={options.categoryNames}
          activityOptions={options.activityOptions}
          facilityOptions={options.facilityOptions}
          submitLabel="Save Destination"
          onSubmit={async (values) => {
            const record = recordFromValues(values)
            try {
              await createDestination(record, values.image)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'The destination could not be saved. Please try again.')
              return
            }
            // The toast lives above the router, so it is still on screen after this page navigates away.
            toast.success(`“${record.name}” was added.`)
            navigate('/destinations')
          }}
        />
      )}
    </>
  )
}
