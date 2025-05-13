export const parseAgentResponse = (response: any) => {
  // Check if the response is an array
  if (!Array.isArray(response)) {
    throw new Error('Invalid response format');
  }

  // Find the last element with ref 'output'
  const outputElement = response
    .slice()
    .reverse()
    .find((element) => element.ref === 'output');

  // If no such element is found, return null
  if (!outputElement) {
    return null;
  }

  // Return the data object from the found element
  return outputElement.data;
};
