import { GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS, GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS, GEN_AI_USAGE_REASONING_OUTPUT_TOKENS } from '@sentry/conventions/attributes';
import { getClient } from '../../currentScopes.js';
import { hasSpanStreamingEnabled } from '../spans/hasSpanStreamingEnabled.js';
import { isThenable } from '../../utils/is.js';
import { GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE, GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE, GEN_AI_RESPONSE_TEXT_ATTRIBUTE, GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, GEN_AI_RESPONSE_STREAMING_ATTRIBUTE, GEN_AI_RESPONSE_ID_ATTRIBUTE, GEN_AI_RESPONSE_MODEL_ATTRIBUTE } from './gen-ai-attributes.js';
import { truncateGenAiStringInput, truncateGenAiMessages } from './messageTruncation.js';

function resolveAIRecordingOptions(options) {
  const genAI = getClient()?.getDataCollectionOptions().genAI;
  return {
    ...options,
    recordInputs: options?.recordInputs ?? genAI?.inputs ?? false,
    recordOutputs: options?.recordOutputs ?? genAI?.outputs ?? false
  };
}
function shouldEnableTruncation(enableTruncation) {
  if (enableTruncation !== void 0) {
    return enableTruncation;
  }
  const client = getClient();
  if (!client) {
    return true;
  }
  return !hasSpanStreamingEnabled(client) && client.getOptions().streamGenAiSpans === false;
}
function buildMethodPath(currentPath, prop) {
  return currentPath ? `${currentPath}.${prop}` : prop;
}
function getTokenUsageAttributes(promptTokens, completionTokens, cacheCreationInputTokens, cacheReadInputTokens, totalTokens) {
  const attributes = {};
  if (typeof promptTokens === "number") {
    attributes[GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] = promptTokens;
  }
  if (typeof cacheCreationInputTokens === "number") {
    attributes[GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS] = cacheCreationInputTokens;
  }
  if (typeof cacheReadInputTokens === "number") {
    attributes[GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS] = cacheReadInputTokens;
  }
  if (typeof completionTokens === "number") {
    attributes[GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] = completionTokens;
  }
  if (typeof totalTokens === "number") {
    attributes[GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE] = totalTokens;
  } else if (typeof promptTokens === "number" || typeof completionTokens === "number") {
    attributes[GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE] = (typeof promptTokens === "number" ? promptTokens : 0) + (typeof completionTokens === "number" ? completionTokens : 0);
  }
  return attributes;
}
function endStreamSpan(span, state, recordOutputs) {
  if (!span.isRecording()) {
    return;
  }
  const attrs = {
    [GEN_AI_RESPONSE_STREAMING_ATTRIBUTE]: true
  };
  if (state.responseId) attrs[GEN_AI_RESPONSE_ID_ATTRIBUTE] = state.responseId;
  if (state.responseModel) attrs[GEN_AI_RESPONSE_MODEL_ATTRIBUTE] = state.responseModel;
  Object.assign(
    attrs,
    getTokenUsageAttributes(
      state.promptTokens,
      state.completionTokens,
      state.cacheCreationInputTokens,
      state.cacheReadInputTokens,
      state.totalTokens
    )
  );
  if (typeof state.reasoningOutputTokens === "number") {
    attrs[GEN_AI_USAGE_REASONING_OUTPUT_TOKENS] = state.reasoningOutputTokens;
  }
  if (state.finishReasons.length) {
    attrs[GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE] = JSON.stringify(state.finishReasons);
  }
  if (recordOutputs && state.responseTexts.length) {
    attrs[GEN_AI_RESPONSE_TEXT_ATTRIBUTE] = state.responseTexts.join("");
  }
  if (recordOutputs && state.toolCalls.length) {
    attrs[GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE] = JSON.stringify(state.toolCalls);
  }
  span.setAttributes(attrs);
  span.end();
}
function getTruncatedJsonString(value) {
  if (typeof value === "string") {
    return truncateGenAiStringInput(value);
  }
  try {
    return JSON.stringify(Array.isArray(value) ? truncateGenAiMessages(value) : value);
  } catch {
    return "[unserializable]";
  }
}
function extractSystemInstructions(messages) {
  if (!Array.isArray(messages)) {
    return { systemInstructions: void 0, filteredMessages: messages };
  }
  const systemMessageIndex = messages.findIndex(
    (msg) => msg && typeof msg === "object" && "role" in msg && msg.role === "system"
  );
  if (systemMessageIndex === -1) {
    return { systemInstructions: void 0, filteredMessages: messages };
  }
  const systemMessage = messages[systemMessageIndex];
  const systemContent = typeof systemMessage.content === "string" ? systemMessage.content : systemMessage.content !== void 0 ? JSON.stringify(systemMessage.content) : void 0;
  if (!systemContent) {
    return { systemInstructions: void 0, filteredMessages: messages };
  }
  const systemInstructions = JSON.stringify([{ type: "text", content: systemContent }]);
  const filteredMessages = [...messages.slice(0, systemMessageIndex), ...messages.slice(systemMessageIndex + 1)];
  return { systemInstructions, filteredMessages };
}
async function createWithResponseWrapper(originalWithResponse, instrumentedPromise) {
  const [instrumentedResult, originalWrapper] = await Promise.all([instrumentedPromise, originalWithResponse]);
  if (originalWrapper && typeof originalWrapper === "object" && "data" in originalWrapper) {
    return {
      ...originalWrapper,
      data: instrumentedResult
    };
  }
  return instrumentedResult;
}
function wrapPromiseWithMethods(originalPromiseLike, instrumentedPromise) {
  if (!isThenable(originalPromiseLike)) {
    return instrumentedPromise;
  }
  return new Proxy(originalPromiseLike, {
    get(target, prop) {
      const useInstrumentedPromise = prop in Promise.prototype || prop === Symbol.toStringTag;
      const source = useInstrumentedPromise ? instrumentedPromise : target;
      const value = Reflect.get(source, prop);
      if (prop === "withResponse" && typeof value === "function") {
        return function wrappedWithResponse() {
          const originalWithResponse = value.call(target);
          return createWithResponseWrapper(originalWithResponse, instrumentedPromise);
        };
      }
      return typeof value === "function" ? value.bind(source) : value;
    }
  });
}

export { buildMethodPath, endStreamSpan, extractSystemInstructions, getTokenUsageAttributes, getTruncatedJsonString, resolveAIRecordingOptions, shouldEnableTruncation, wrapPromiseWithMethods };
//# sourceMappingURL=utils.js.map
