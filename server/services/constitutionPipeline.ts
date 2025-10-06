import { IStorage } from '../storage';
import { ConstitutionRenderer, ConstitutionContext } from './constitutionRenderer';
import { RAGService } from './rag';

export interface ConstitutionPipelineResult {
  success: boolean;
  sectionsRendered: number;
  sectionsIndexed: number;
  errors: Array<{
    slug: string;
    stage: 'render' | 'persist' | 'index';
    error: string;
  }>;
  summary: string;
}

export class ConstitutionPipeline {
  private renderer: ConstitutionRenderer;
  private ragService: RAGService;

  constructor(private storage: IStorage) {
    this.renderer = new ConstitutionRenderer();
    this.ragService = new RAGService(storage);
  }

  /**
   * Main orchestrator method: renders all constitution templates and indexes them in RAG
   */
  async renderAndIndexConstitution(leagueId: string): Promise<ConstitutionPipelineResult> {
    const result: ConstitutionPipelineResult = {
      success: true,
      sectionsRendered: 0,
      sectionsIndexed: 0,
      errors: [],
      summary: '',
    };

    console.log(`[ConstitutionPipeline] Starting pipeline for league ${leagueId}`);

    try {
      // Step 1: Fetch merged settings (base + overrides)
      console.log(`[ConstitutionPipeline] Fetching settings...`);
      const mergedSettings = await this.getMergedSettings(leagueId);

      if (!mergedSettings) {
        console.warn(`[ConstitutionPipeline] No settings found for league ${leagueId}, skipping`);
        result.summary = 'No settings available for rendering';
        return result;
      }

      // Step 2: Get all constitution templates
      console.log(`[ConstitutionPipeline] Fetching templates...`);
      const templates = await this.storage.getConstitutionTemplates(leagueId);

      if (templates.length === 0) {
        console.warn(`[ConstitutionPipeline] No templates found for league ${leagueId}`);
        result.summary = 'No templates to render';
        return result;
      }

      console.log(`[ConstitutionPipeline] Found ${templates.length} templates to render`);

      // Step 3: Build context for rendering
      const league = await this.storage.getLeague(leagueId);
      const context: ConstitutionContext = {
        league: {
          name: league?.name || 'League',
          season: new Date().getFullYear().toString(),
        },
        scoring: mergedSettings.scoring || {},
        roster: mergedSettings.roster || {},
        waivers: mergedSettings.waivers || {},
        playoffs: mergedSettings.playoffs || {},
        trades: mergedSettings.trades || {},
        misc: mergedSettings.misc || {},
      };

      // Step 4: Render each template
      const renderedSections: Array<{ slug: string; contentMd: string }> = [];

      for (const template of templates) {
        try {
          console.log(`[ConstitutionPipeline] Rendering template: ${template.slug}`);
          const contentMd = this.renderer.render(template.templateMd, context);
          renderedSections.push({ slug: template.slug, contentMd });
          result.sectionsRendered++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[ConstitutionPipeline] Failed to render template ${template.slug}:`, errorMessage);
          result.errors.push({
            slug: template.slug,
            stage: 'render',
            error: errorMessage,
          });
          result.success = false;
        }
      }

      // Step 5: Persist rendered sections
      for (const section of renderedSections) {
        try {
          console.log(`[ConstitutionPipeline] Persisting section: ${section.slug}`);
          await this.storage.saveConstitutionRender({
            leagueId,
            slug: section.slug,
            contentMd: section.contentMd,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[ConstitutionPipeline] Failed to persist section ${section.slug}:`, errorMessage);
          result.errors.push({
            slug: section.slug,
            stage: 'persist',
            error: errorMessage,
          });
          result.success = false;
        }
      }

      // Step 6: Trigger RAG reindex for rendered sections
      console.log(`[ConstitutionPipeline] Indexing rendered sections in RAG...`);
      const indexResult = await this.indexRenderedSections(leagueId, renderedSections);
      result.sectionsIndexed = indexResult.indexed;
      result.errors.push(...indexResult.errors);

      if (indexResult.errors.length > 0) {
        result.success = false;
      }

      // Step 7: Generate summary
      result.summary = this.generateSummary(result);
      console.log(`[ConstitutionPipeline] Pipeline complete: ${result.summary}`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ConstitutionPipeline] Pipeline failed:`, errorMessage);
      result.success = false;
      result.summary = `Pipeline failed: ${errorMessage}`;
      return result;
    }
  }

  /**
   * Fetch and merge base settings with commissioner overrides
   */
  private async getMergedSettings(leagueId: string): Promise<any | null> {
    const baseSettings = await this.storage.getLeagueSettings(leagueId);
    const overrides = await this.storage.getLeagueSettingsOverrides(leagueId);

    if (!baseSettings) {
      return null;
    }

    if (!overrides || !overrides.overrides) {
      return baseSettings;
    }

    // Deep merge overrides into base settings
    return this.deepMerge(baseSettings, overrides.overrides);
  }

  /**
   * Deep merge two objects (overrides take precedence)
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Index rendered sections in RAG for searchability
   */
  private async indexRenderedSections(
    leagueId: string,
    sections: Array<{ slug: string; contentMd: string }>
  ): Promise<{ indexed: number; errors: Array<{ slug: string; stage: 'index'; error: string }> }> {
    const result = {
      indexed: 0,
      errors: [] as Array<{ slug: string; stage: 'index'; error: string }>,
    };

    for (const section of sections) {
      try {
        // Generate version tag with current date
        const version = `v${new Date().toISOString().split('T')[0]}`;
        const title = `Constitution › ${this.formatSlugAsTitle(section.slug)} › ${version}`;

        console.log(`[ConstitutionPipeline] Indexing section: ${section.slug} as ${title}`);

        // Index the rendered markdown as a document
        await this.ragService.indexDocument(
          leagueId,
          section.contentMd,
          version,
          'NORMALIZED',
          title
        );

        result.indexed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ConstitutionPipeline] Failed to index section ${section.slug}:`, errorMessage);
        result.errors.push({
          slug: section.slug,
          stage: 'index',
          error: errorMessage,
        });
      }
    }

    return result;
  }

  /**
   * Format slug as human-readable title (e.g., "scoring-rules" -> "Scoring Rules")
   */
  private formatSlugAsTitle(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(result: ConstitutionPipelineResult): string {
    if (result.sectionsRendered === 0) {
      return 'No sections rendered';
    }

    const parts = [
      `${result.sectionsRendered} section(s) rendered`,
      `${result.sectionsIndexed} section(s) indexed`,
    ];

    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} error(s)`);
    }

    return parts.join(', ');
  }
}

// Export singleton instance factory
export function createConstitutionPipeline(storage: IStorage): ConstitutionPipeline {
  return new ConstitutionPipeline(storage);
}
