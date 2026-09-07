import { PageContainer } from '@/components/layout/PageContainer';
import { Alert } from '@/components/ui/Alert';

/**
 * Admin Dashboard Page
 * PLACEHOLDER: Will be implemented in later phases
 */

export default function AdminPage() {
  return (
    <PageContainer
      title="Admin Dashboard"
      description="Research administration and data management"
    >
      <Alert variant="info">
        <strong>PHASE 1 NOTICE:</strong> Admin authentication, participant management, 
        coding interface, and analytics will be implemented in later phases.
      </Alert>
    </PageContainer>
  );
}
