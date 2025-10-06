import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { RefreshCw, FileText, Calendar } from 'lucide-react';

interface ConstitutionSection {
  slug: string;
  content_md: string;
  rendered_at: string;
}

export function ConstitutionTemplatesPage() {
  const params = useParams<{ leagueId: string }>();
  const leagueId = params.leagueId || localStorage.getItem('selectedLeagueId') || '';

  // Fetch constitution sections
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery<{ ok: boolean; sections: ConstitutionSection[] }>({
    queryKey: ['/api/v2/constitution', leagueId, 'sections'],
    queryFn: async () => {
      const res = await fetch(`/api/v2/constitution/${leagueId}/sections`);
      if (!res.ok) throw new Error('Failed to fetch constitution sections');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Re-render mutation
  const renderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/v2/constitution/${leagueId}/render`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/constitution', leagueId, 'sections'] });
      toast.success('Constitution rendered', {
        description: `Successfully rendered ${data.sections || 'all'} sections`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to render constitution', {
        description: error.message || 'An error occurred',
      });
    },
  });

  const handleReRender = () => {
    renderMutation.mutate();
  };

  if (sectionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const sections = sectionsData?.sections || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Constitution Templates</h1>
          <p className="text-text-secondary">
            Manage and preview constitution sections generated from league settings
          </p>
        </div>
        <Button
          onClick={handleReRender}
          disabled={renderMutation.isPending}
          data-testid="button-rerender"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${renderMutation.isPending ? 'animate-spin' : ''}`} />
          {renderMutation.isPending ? 'Rendering...' : 'Re-render All'}
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card className="bg-surface-card border-border-subtle">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No Constitution Sections</h3>
              <p className="text-text-secondary mb-4">
                No constitution sections have been created yet.
              </p>
              <Button onClick={handleReRender} data-testid="button-create-initial">
                Create Initial Sections
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <Card
              key={section.slug}
              className="bg-surface-card border-border-subtle"
              data-testid={`card-section-${section.slug}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-text-primary">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <span className="capitalize">{section.slug.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-normal text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    {new Date(section.rendered_at).toLocaleDateString()}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-surface-elevated p-4 rounded-lg border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="default" className="bg-brand-teal/20 text-brand-teal">
                      Markdown Preview
                    </Badge>
                  </div>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert text-text-primary"
                    data-testid={`preview-${section.slug}`}
                  >
                    <pre className="whitespace-pre-wrap text-xs font-mono bg-surface-base p-3 rounded border border-border-default overflow-x-auto">
                      {section.content_md}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                  About Constitution Templates
                </div>
                <div className="text-sm text-blue-600/80 dark:text-blue-400/80 space-y-1">
                  <p>
                    Constitution sections are automatically generated from your league settings.
                    When you re-render, the templates will be populated with the latest merged
                    settings (base Sleeper settings + commissioner overrides).
                  </p>
                  <p>
                    These sections are indexed into the RAG system so the AI assistant can
                    accurately answer questions about your league rules.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
