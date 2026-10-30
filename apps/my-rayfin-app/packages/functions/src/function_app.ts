import {
  UserDataFunctions,
  type RayfinContext,
} from '@microsoft/fabric-user-data-functions';
import type { UniversalAppSchema } from '@rayfin-app/shared';

const udf = new UserDataFunctions();

udf.func(
  'classifyTask',
  async (
    title: string,
    ctx: RayfinContext<UniversalAppSchema>
  ): Promise<string> => {
    const apiKey: string = ctx.Secrets.ANTHROPIC_API_KEY;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: `Classify this task as exactly "Urgent" or "Non-Urgent". Reply with only those two words, nothing else.\n\nTask: ${title.slice(0, 500)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Classification service error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
    };
    const result = data.content[0]?.text?.trim() ?? '';
    return result === 'Urgent' ? 'Urgent' : 'Non-Urgent';
  },
  []
);
