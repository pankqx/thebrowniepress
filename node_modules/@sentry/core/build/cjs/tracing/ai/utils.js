Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const attributes = require('@sentry/conventions/attributes');
const currentScopes = require('../../currentScopes.js');
const hasSpanStreamingEnabled = require('../spans/hasSpanStreamingEnabled.js');
const is = require('../../utils/is.js');
const genAiAttributes = require('./gen-ai-attributes.js');
const messageTruncation = require('./messageTruncation.js');

function resolveAIRecordingOptions(options) {
  const genAI = currentScopes.getClient()?.getDataCollectionOptions().genAI;
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
  const client = currentScopes.getClient();
  if (!client) {
    return true;
  }
  return !hasSpanStreamingEnabled.hasSpanStreamingEnabled(client) && client.getOptions().streamGenAiSpans === false;
}
function buildMethodPath(currentPath, prop) {
  return currentPath ? `${currentPath}.${prop}` : prop;
}
function getTokenUsageAttributes(promptTokens, completionTokens, cacheCreationInputTokens, cacheReadInputTokens, totalTokens) {
  const attributes$1 = {};
  if (typeof promptTokens === "number") {
    attributes$1[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] = promptTokens;
  }
  if (typeof cacheCreationInputTokens === "number") {
    attributes$1[attributes.GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS] = cacheCreationInputTokens;
  }
  if (typeof cacheReadInputTokens === "number") {
    attributes$1[attributes.GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS] = cacheReadInputTokens;
  }
  if (typeof completionTokens === "number") {
    attributes$1[genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] = completionTokens;
  }
  if (typeof totalTokens === "number") {
    attributes$1[genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE] = totalTokens;
  } else if (typeof promptTokens === "number" || typeof completionTokens === "number") {
    attributes$1[genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE] = (typeof promptTokens === "number" ? promptTokens : 0) + (typeof completionTokens === "number" ? completionTokens : 0);
  }
  return attributes$1;
}
function endStreamSpan(span, state, recordOutputs) {
  if (!span.isRecording()) {
    return;
  }
  const attrs = {
    [genAiAttributes.GEN_AI_RESPONSE_STREAMING_ATTRIBUTE]: true
  };
  if (state.responseId) attrs[genAiAttributes.GEN_AI_RESPONSE_ID_ATTRIBUTE] = state.responseId;
  if (state.responseModel) attrs[genAiAttributes.GEN_AI_RESPONSE_MODEL_ATTRIBUTE] = state.responseModel;
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
    attrs[attributes.GEN_AI_USAGE_REASONING_OUTPUT_TOKENS] = state.reasoningOutputTokens;
  }
  if (state.finishReasons.length) {
    attrs[genAiAttributes.GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE] = JSON.stringify(state.finishReasons);
  }
  if (recordOutputs && state.responseTexts.length) {
    attrs[genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE] = state.responseTexts.join("");
  }
  if (recordOutputs && state.toolCalls.length) {
    attrs[genAiAttributes.GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE] = JSON.stringify(state.toolCalls);
  }
  span.setAttributes(attrs);
  span.end();
}
function getTruncatedJsonString(value) {
  if (typeof value === "string") {
    return messageTruncation.truncateGenAiStringInput(value);
  }
  try {
    return JSON.stringify(Array.isArray(value) ? messageTruncation.truncateGenAiMessages(value) : value);
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
  if (!is.isThenable(originalPromiseLike)) {
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

exports.buildMethodPath = buildMethodPath;
exports.endStreamSpan = endStreamSpan;
exports.extractSystemInstructions = extractSystemInstructions;
exports.getTokenUsageAttributes = getTokenUsageAttributes;
exports.getTruncatedJsonString = getTruncatedJsonString;
exports.resolveAIRecordingOptions = resolveAIRecordingOptions;
exports.shouldEnableTruncation = shouldEnableTruncation;
exports.wrapPromiseWithMethods = wrapPromiseWithMethods;
//# sourceMappingURL=utils.js.map
