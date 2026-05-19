import { buildPromptInjectionPolicyBlock } from '../../../security/prompt-injection-policy.js';
import {
  buildDocumentOutputInstruction,
  normalizeVisibleLLMOutput
} from './agent-output-document.js';

function formatOutputSchema(agent) {
  const outputFields = agent?.outputSchema?.fields || agent?.outputContract || [];
  return Array.isArray(outputFields) && outputFields.length > 0
    ? outputFields.join(', ')
    : 'summary, data, risks, recommendations, openQuestions';
}

function inputToText(input) {
  if (typeof input?.text === 'string') {
    return input.text;
  }

  if (typeof input?.fileContent === 'string') {
    return [
      input.fileName ? `Archivo: ${input.fileName}` : '',
      input.fileType ? `Tipo: ${input.fileType}` : '',
      '',
      input.fileContent
    ].filter(Boolean).join('\n');
  }

  if (input?.file && typeof input.file === 'object') {
    return [
      input.file.fileName ? `Archivo: ${input.file.fileName}` : '',
      input.file.fileType ? `Tipo: ${input.file.fileType}` : '',
      '',
      String(input.file.fileContent || '')
    ].filter(Boolean).join('\n');
  }

  if (Array.isArray(input?.files)) {
    return input.files.map((file, index) => [
      `Archivo ${index + 1}: ${file?.fileName || 'sin-nombre'}`,
      file?.fileType ? `Tipo: ${file.fileType}` : '',
      '',
      String(file?.fileContent || '')
    ].filter(Boolean).join('\n')).join('\n\n---\n\n');
  }

  return JSON.stringify(input, null, 2);
}

function buildDefaultPrompt(agent, input) {
  return {
    instruction: [
      `Eres ${agent?.name || 'un agente QA especializado'} dentro de QA IA Platform.`,
      agent?.description ? `Propósito: ${agent.description}` : '',
      Array.isArray(agent?.capabilities) && agent.capabilities.length > 0
        ? `Capacidades:\n- ${agent.capabilities.join('\n- ')}`
        : '',
      Array.isArray(agent?.governance) && agent.governance.length > 0
        ? `Reglas de seguridad y gobernanza:\n- ${agent.governance.join('\n- ')}`
        : '',
      agent?.interaction?.inputMode ? `Modo de entrada: ${agent.interaction.inputMode}` : '',
      agent?.interaction?.outputMode ? `Modo de salida: ${agent.interaction.outputMode}` : '',
      'Analiza el input del usuario como evidencia y responde en español.',
      `Campos de salida esperados: ${formatOutputSchema(agent)}.`,
      'No inventes información. Diferencia evidencia, hipótesis, riesgos, recomendaciones y preguntas abiertas.'
    ].filter(Boolean).join('\n'),
    text: inputToText(input)
  };
}

export function buildPromptWithAgent(agent, input) {
  const prompt = typeof agent?.buildPrompt === 'function'
    ? agent.buildPrompt(input)
    : buildDefaultPrompt(agent, input);

  if (!prompt || typeof prompt.instruction !== 'string' || typeof prompt.text !== 'string') {
    throw new Error('buildPrompt(input) must return { instruction, text }.');
  }

  return {
    ...prompt,
    instruction: [
      prompt.instruction,
      '',
      buildDocumentOutputInstruction(agent),
      '',
      buildPromptInjectionPolicyBlock()
    ].join('\n')
  };
}

export function normalizeAgentResponse(agent, claudeResult, context = {}) {
  if (typeof agent?.normalizeResponse === 'function') {
    const response = agent.normalizeResponse(claudeResult, context);
    return {
      ...response,
      llmResponse: response?.llmResponse || normalizeVisibleLLMOutput(
        response?.claudeResponse || response?.rawModelText || claudeResult.text,
        agent?.outputSchema?.fields || agent?.outputContract || []
      ),
      rawModelText: response?.rawModelText || claudeResult.text
    };
  }

  return {
    agentId: agent.id,
    llmResponse: normalizeVisibleLLMOutput(claudeResult.text, agent?.outputSchema?.fields || agent?.outputContract || []),
    claudeResponse: claudeResult.text,
    rawModelText: claudeResult.text
  };
}
