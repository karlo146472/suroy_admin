import AdminProfile from '../components/settings/AdminProfile'
import SecuritySettings from '../components/settings/SecuritySettings'
import SystemInformation from '../components/settings/SystemInformation'
import { PageHeader } from '../components/ui'

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your profile and your account security." />
      <div className="settings-stack">
        <AdminProfile />
        <SecuritySettings />
        <SystemInformation />
      </div>
    </>
  )
}
