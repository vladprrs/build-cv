import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Build CV
        </h1>
        <p className="text-lg text-muted-foreground">
          Headless CMS for managing professional career data
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <a href="/highlights">View Highlights</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/export">Export Data</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
