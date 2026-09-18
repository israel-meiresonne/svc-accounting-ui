import AppShell from "@/components/layout/app-shell"

const Home = () => {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-lg">LEDGR_OS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder root page. Phase 4 replaces this with a redirect to /login or /accounts.
        </p>
      </div>
    </AppShell>
  )
}

export default Home
