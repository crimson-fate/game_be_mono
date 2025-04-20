import { z } from 'zod';

// Define response schemas
const ContentResponseSchema = z.object({
  content: z.string(),
});

const OperationResponseSchema = z.object({
  operation: z.enum(['clean', 'stop', 'reset', 'explore']),
  dungeonId: z.string().default('current'),
  details: z.record(z.any()).optional(),
  content: z.string(),
});

export type ContentResponse = z.infer<typeof ContentResponseSchema>;
export type OperationResponse = z.infer<typeof OperationResponseSchema>;

export class ResponseParser {
  static parseResponse(result: any): ContentResponse | OperationResponse | null {
    try {
      // If the result is already a string, try to parse it as JSON
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          return this.validateAndReturnResponse(parsed);
        } catch (e) {
          // If it's not JSON, return it as content
          return { content: result };
        }
      }

      // 1. Try direct output data parsing
      if (result.output?.data) {
        const parsed = this.tryParseOutputData(result.output.data);
        if (parsed) return parsed;
      }

      // 2. Try structured output parsing
      if (result.output?.structured?.text?.content) {
        const parsed = this.tryParseStructuredOutput(result.output.structured.text.content);
        if (parsed) return parsed;
      }

      // 3. Try steps parsing
      if (result.steps?.length > 0) {
        const parsed = this.tryParseSteps(result.steps);
        if (parsed) return parsed;
      }

      // 4. Try to find any JSON in the result
      const resultStr = JSON.stringify(result);
      const jsonMatch = resultStr.match(/\{.*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = this.validateAndReturnResponse(parsed);
          if (validated) return validated;
        } catch (e) {
          // Not valid JSON, continue
        }
      }

      // 5. Try to extract content from the result string
      const contentMatch = resultStr.match(/"content"\s*:\s*"([^"]+)"/);
      if (contentMatch && contentMatch[1]) {
        return { content: contentMatch[1] };
      }

      // 6. If all else fails, try to extract any text content
      if (typeof result === 'string') {
        return { content: result };
      }

      return null;
    } catch (error) {
      console.error('[Response Parser Error]', error);
      return null;
    }
  }

  private static tryParseOutputData(data: any): ContentResponse | OperationResponse | null {
    try {
      if (typeof data === 'string') {
        // Try to clean and parse the string
        const cleaned = data
          .replace(/\\n/g, ' ')
          .replace(/\\"/g, '"')
          .trim();

        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          const parsed = JSON.parse(cleaned);
          return this.validateAndReturnResponse(parsed);
        }
        return { content: cleaned };
      }

      if (typeof data === 'object' && data !== null) {
        return this.validateAndReturnResponse(data);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private static tryParseStructuredOutput(content: string): ContentResponse | OperationResponse | null {
    try {
      const cleaned = content
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .trim();

      if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        const parsed = JSON.parse(cleaned);
        return this.validateAndReturnResponse(parsed);
      }
      return { content: cleaned };
    } catch (error) {
      return null;
    }
  }

  private static tryParseSteps(steps: any[]): ContentResponse | OperationResponse | null {
    const lastStep = steps[steps.length - 1];
    
    // Check outputs in the step
    if (lastStep.outputs?.length > 0) {
      for (const output of lastStep.outputs) {
        if (output.data?.content) {
          return this.validateAndReturnResponse(output.data);
        }
      }
    }

    // Check structured text
    if (lastStep.structured?.text?.content) {
      return this.tryParseStructuredOutput(lastStep.structured.text.content);
    }

    return null;
  }

  private static validateAndReturnResponse(data: any): ContentResponse | OperationResponse | null {
    try {
      // First try to parse as operation response
      const operationResult = OperationResponseSchema.safeParse(data);
      if (operationResult.success) {
        return operationResult.data;
      }

      // Then try to parse as content response
      const contentResult = ContentResponseSchema.safeParse(data);
      if (contentResult.success) {
        return contentResult.data;
      }

      // If we have a string content, return it as a content response
      if (typeof data === 'string') {
        return { content: data };
      }

      // If we have an object with a content field, return it
      if (typeof data === 'object' && data !== null && typeof data.content === 'string') {
        return { content: data.content };
      }

      // If we have a simple object, try to convert it to a content response
      if (typeof data === 'object' && data !== null) {
        const content = Object.values(data)
          .filter(value => typeof value === 'string')
          .join(' ');
        if (content) {
          return { content };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
} 