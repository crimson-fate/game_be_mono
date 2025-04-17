import { createDreams, context, input, output } from '@daydreamsai/core';
import { cliExtension } from '@daydreamsai/cli';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

const echoContext = context({
  type: 'alpha',

  schema: z.object({}),

  instructions: 'You are alpha supporter game product.',
});

const agent = createDreams({
  // Use Meta LLama
  model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),

  extensions: [cliExtension],

  contexts: [echoContext],
});

async function main() {
  // Start the agent (initializes services like readline)
  await agent.start();

  console.log("Echo agent started. Type 'exit' to quit.");

  await agent.run({
    context: echoContext,
    args: {},
  });

  console.log('Agent stopped.');
}

main();
