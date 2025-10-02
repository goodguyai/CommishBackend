import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Share2 } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-midnight mb-1">Reports</h1>
          <p className="text-neutral-midnight/60">Weekly recaps and analysis</p>
        </div>
        <Button data-testid="button-generate">
          <FileText className="w-4 h-4 mr-2" />
          Generate Week 4
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[3, 2, 1].map((week) => (
              <div key={week} className="flex items-center justify-between p-4 border border-neutral-panel rounded-lg">
                <div>
                  <div className="font-medium text-neutral-midnight">Week {week} Report</div>
                  <div className="text-sm text-neutral-midnight/60">Generated 2 days ago</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" data-testid={`button-download-${week}`}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" data-testid={`button-share-${week}`}>
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
