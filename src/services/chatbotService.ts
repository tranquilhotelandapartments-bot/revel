import { GoogleGenAI } from '@google/genai';
import {
  OrganizationSettings,
  Program,
  Project,
  Article,
  ImpactStat,
} from '../types';

// ---------------------------------------------------------------------------
// Build a rich, grounded system prompt from live project data
// ---------------------------------------------------------------------------
export function buildSystemPrompt(
  settings: OrganizationSettings,
  programs: Program[],
  projects: Project[],
  articles: Article[],
  stats: ImpactStat[]
): string {
  const socialLinks = Object.entries(settings.socialLinks || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n');

  const programsText = programs
    .map(
      (p) =>
        `### Program: ${p.title} (Status: ${p.status})
  - Category: ${p.category}
  - Short description: ${p.shortDescription}
  - Full description: ${p.description}
  - Impact summary: ${p.impactSummary}
  - Objectives: ${p.objectives.join('; ')}
  - Activities: ${p.activities.join('; ')}`
    )
    .join('\n\n');

  const projectsText = projects
    .map(
      (p) =>
        `### Project: ${p.title} (Status: ${p.status})
  - Location: ${p.location}
  - Summary: ${p.summary}
  - Problem it addresses: ${p.problem}
  - Why it matters: ${p.whyItMatters}
  - Objectives: ${p.objectives.join('; ')}
  - Activities: ${p.activities.join('; ')}
  - Progress: ${p.progressPercentage}%
  ${p.fundingGoal ? `- Funding goal: ${p.currency} ${p.fundingGoal.toLocaleString()}` : ''}
  ${p.amountRaised ? `- Amount raised so far: ${p.currency} ${p.amountRaised.toLocaleString()}` : ''}
  ${p.whatIsNeeded?.length ? `- What is still needed: ${p.whatIsNeeded.join('; ')}` : ''}
  ${
    p.updates?.length
      ? `- Latest updates:\n${p.updates
          .map((u) => `    • [${u.date}] ${u.title}: ${u.summary}`)
          .join('\n')}`
      : ''
  }`
    )
    .join('\n\n');

  const statsText = stats
    .map(
      (s) =>
        `- ${s.label}: ${s.value}${s.suffix} — ${s.description} (Source: ${s.source}, ${s.date})`
    )
    .join('\n');

  const articlesText = articles
    .map(
      (a) =>
        `### Article: "${a.title}" (${a.publishedDate})
  - Category: ${a.category}
  - Author: ${a.author} (${a.authorRole})
  - Excerpt: ${a.excerpt}
  - Full content: ${a.content.join(' ')}`
    )
    .join('\n\n');

  return `You are a helpful, friendly, and knowledgeable assistant for **${settings.name}**, a community development NGO based in ${settings.country}.

Your ONLY job is to answer questions about ${settings.name} using the information provided below. You must NOT make up facts, add external information, or speculate beyond what is explicitly stated here. If a question cannot be answered from the information below, respond politely: "I'm sorry, I don't have that information available right now. Please contact us at ${settings.contactEmail} for more details."

Keep your answers concise, warm, and professional — matching the spirit of a caring community organisation. Use plain language. When listing items, use bullet points for clarity.

---

## ORGANISATION OVERVIEW
- **Name:** ${settings.name}
- **Tagline:** ${settings.tagline}
- **Country:** ${settings.country}
- **Founded:** ${settings.foundedYear}
- **Registration:** ${settings.registrationNumber}

## CONTACT DETAILS
- **Email:** ${settings.contactEmail}
- **Phone:** ${settings.contactPhone}
- **Address / Location:** ${settings.address}
- **Safeguarding Lead:** ${settings.safeguardingLead}
- **Safeguarding Email:** ${settings.safeguardingEmail}

## SOCIAL MEDIA
${socialLinks || '  (No social links available)'}

## MISSION
${settings.mission}

## VISION
${settings.vision}

## GOALS
${(settings.goals || []).map((g, i) => `${i + 1}. ${g}`).join('\n')}

## OBJECTIVES
${(settings.objectives || []).map((o, i) => `${i + 1}. ${o}`).join('\n')}

---

## PROGRAMS (${programs.length} active programs)
${programsText || 'No programs available.'}

---

## PROJECTS (${projects.length} projects)
${projectsText || 'No projects available.'}

---

## IMPACT STATISTICS
${statsText || 'No statistics available.'}

---

## NEWS & ARTICLES (${articles.length} articles)
${articlesText || 'No articles available.'}

---

Remember: Only answer from the information above. Be warm, concise, and helpful.`;
}

// ---------------------------------------------------------------------------
// Call Gemini with multi-turn conversation history
// ---------------------------------------------------------------------------
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'VITE_GEMINI_API_KEY is not set. Please add it to your .env file.'
      );
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export async function sendChatMessage(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const client = getClient();

  // Build contents array: history + new user message
  const contents = [
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: userMessage }],
    },
  ];

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 512,
    },
  });

  return response.text ?? 'Sorry, I could not generate a response. Please try again.';
}
