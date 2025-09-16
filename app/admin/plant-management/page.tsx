"use client";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

export default function Page() {
  const [plants, setPlants] = useState<string[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  const fetchPlants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/plants/list');
      if (!response.ok) throw new Error("Failed to fetch plant list.");
      const data = await response.json();
      setPlants(data.plants || []);
    } catch (error) {
      toast.error("Failed to load plants", { description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleSetActive = async () => {
    if (!selectedPlant) {
      toast.warning("No plant selected", { description: "Please select a plant to activate." });
      return;
    }
    setIsActivating(true);
    toast.info(`Activating ${selectedPlant}...`);
    try {
      const response = await fetch('/api/plants/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantName: selectedPlant }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to activate plant.");
      }
      toast.success(`Successfully activated ${selectedPlant}`, {
        description: "The application is now using the new configuration. A page reload may be required for all changes to take effect.",
      });
    } catch (error) {
      toast.error(`Failed to activate ${selectedPlant}`, { description: (error as Error).message });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Plant Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 px-4 pt-0 ">
          <Card>
            <CardHeader>
              <CardTitle>Active Plant Configuration</CardTitle>
              <CardDescription>
                Select a plant configuration to make it active. This will overwrite the current `dataPoints.ts` and `constants.ts` files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading plant configurations...
                </div>
              ) : (
                <div className="flex items-end gap-4">
                  <div className="flex-grow">
                    <label htmlFor="plant-select" className="text-sm font-medium">Available Plants</label>
                    <Select onValueChange={setSelectedPlant} value={selectedPlant || undefined}>
                      <SelectTrigger id="plant-select" className="mt-1">
                        <SelectValue placeholder="Select a plant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map(plant => (
                          <SelectItem key={plant} value={plant}>
                            {plant.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSetActive} disabled={isActivating || !selectedPlant}>
                    {isActivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Set Active
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
