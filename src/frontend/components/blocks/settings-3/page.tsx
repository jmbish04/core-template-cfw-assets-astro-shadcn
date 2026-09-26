import { GeneralSettings } from "./components/general-settings"

export function Page() {
  return (
    <div className="flex min-h-svh w-full items-start justify-center p-8 md:p-16">
      <GeneralSettings />
    </div>
  )
}