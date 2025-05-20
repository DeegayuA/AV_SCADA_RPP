import { type Metadata } from 'next';

type PageProps = {
  params: {
    layoutId: string;
  };
};

export default function PlantViewPage({ params }: PageProps) {
  const { layoutId } = params;
  const { isEditMode, toggleEditMode, currentUser } = useAppStore();

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b flex justify-between items-center bg-card">
        <h1 className="text-xl font-bold">Plant Layout: {layoutId}</h1>
        {canToggleEdit && (
          <Button onClick={toggleEditMode} variant="outline">
            {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </Button>
        )}
      </header>
      <main className="flex-grow relative">
        <SLDWidget layoutId={layoutId} />
      </main>
    </div>
  );
}