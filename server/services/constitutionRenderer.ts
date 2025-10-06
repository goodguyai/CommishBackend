import Mustache from 'mustache';

export interface ConstitutionContext {
  league: {
    name: string;
    season: string;
  };
  scoring: any;
  roster: any;
  waivers: any;
  playoffs: any;
  trades: any;
  misc: any;
}

export class ConstitutionRenderer {
  render(templateMd: string, context: ConstitutionContext): string {
    try {
      return Mustache.render(templateMd, context);
    } catch (error) {
      console.error('[ConstitutionRenderer] Failed to render template:', error);
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  renderMultiple(templates: Array<{ slug: string; templateMd: string }>, context: ConstitutionContext): Array<{ slug: string; contentMd: string }> {
    return templates.map(({ slug, templateMd }) => ({
      slug,
      contentMd: this.render(templateMd, context),
    }));
  }
}

export const constitutionRenderer = new ConstitutionRenderer();
