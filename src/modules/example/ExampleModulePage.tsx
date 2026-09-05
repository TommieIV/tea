import { Link } from 'react-router-dom'
import { useWorkspace } from '../../core/workspaces/useWorkspace'

export default function ExampleModulePage() {
  const { activeWorkspace } = useWorkspace()
  return (
    <>
      <section className="page-heading">
        <div className="eyebrow">Example module</div>
        <h1>Platform connection confirmed</h1>
        <p className="lede">This is deliberately not a real TEA feature. It proves the module registration, permission, workspace, and lazy-route foundation.</p>
      </section>
      <section className="example-panel">
        <h2>Current context</h2>
        <p><strong>Workspace:</strong> {activeWorkspace?.workspaceName}</p>
        <p><strong>Role:</strong> {activeWorkspace?.roleName}</p>
        <p><strong>Permission:</strong> <code>example.overview.view</code></p>
        <Link className="button button-primary" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }} to="/dashboard">Back to Dashboard</Link>
      </section>
    </>
  )
}
