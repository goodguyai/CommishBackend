import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageCircle, Book, Bot } from "lucide-react";

export default function Help() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8" data-testid="help-page">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground mt-2">
          Get help with THE COMMISH Discord bot and fantasy league management.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-getting-started">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Learn how to set up and configure your fantasy league bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Quick Setup Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Connect your Discord account</li>
                <li>Install the bot to your Discord server</li>
                <li>Create a league and link your Sleeper league ID</li>
                <li>Upload your league constitution for AI rules queries</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-discord-commands">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Discord Commands
            </CardTitle>
            <CardDescription>
              Available slash commands in your Discord server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div>
                <code className="bg-secondary px-2 py-1 rounded">/rules [question]</code>
                <p className="text-muted-foreground mt-1">Ask questions about your league rules</p>
              </div>
              <div>
                <code className="bg-secondary px-2 py-1 rounded">/deadlines</code>
                <p className="text-muted-foreground mt-1">View upcoming league deadlines</p>
              </div>
              <div>
                <code className="bg-secondary px-2 py-1 rounded">/scoring</code>
                <p className="text-muted-foreground mt-1">Get current scoring settings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-troubleshooting">
          <CardHeader>
            <CardTitle>Common Issues</CardTitle>
            <CardDescription>
              Solutions to frequently encountered problems
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium">Bot not responding?</h4>
              <p className="text-muted-foreground">Check that the bot has appropriate permissions in your server.</p>
            </div>
            <div>
              <h4 className="font-medium">AI can't find league rules?</h4>
              <p className="text-muted-foreground">Make sure you've uploaded your league constitution document.</p>
            </div>
            <div>
              <h4 className="font-medium">Sleeper data not updating?</h4>
              <p className="text-muted-foreground">Verify your Sleeper league ID is correct in league settings.</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-contact-support">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Need More Help?
            </CardTitle>
            <CardDescription>
              Contact support for additional assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you're experiencing issues not covered here, reach out for personalized support.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" data-testid="button-discord-support">
                <ExternalLink className="w-4 h-4 mr-2" />
                Discord Support Server
              </Button>
              <Button variant="outline" size="sm" data-testid="button-email-support">
                <ExternalLink className="w-4 h-4 mr-2" />
                Email Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}