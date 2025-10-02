import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Share2 } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Reports</h1>
          <p className="text-text-secondary">Weekly recaps and analysis</p>
        </div>
        <Button data-testid="button-generate" className="bg-gradient-cta text-white shadow-depth1 hover:shadow-depth2">
          <FileText className="w-4 h-4 mr-2" />
          Generate Week 4
        </Button>
      </div>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[3, 2, 1].map((week) => (
              <div key={week} className="flex items-center justify-between p-4 border border-border-subtle rounded-lg bg-surface-elevated shadow-depth1">
                <div>
                  <div className="font-medium text-text-primary">Week {week} Report</div>
                  <div className="text-sm text-text-secondary">Generated 2 days ago</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" data-testid={`button-download-${week}`} className="text-brand-teal hover:bg-surface-hover">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" data-testid={`button-share-${week}`} className="text-brand-teal hover:bg-surface-hover">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
