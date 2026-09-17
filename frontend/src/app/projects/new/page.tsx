import { Suspense } from 'react';
import { ProjectFormPage } from '@/features/projects/ProjectFormPage';

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-fx-text-muted">Loading product setup...</div>}>
      <ProjectFormPage mode="create" />
    </Suspense>
  );
}
