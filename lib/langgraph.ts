//think of this as AI file this is gonna be our main ai file connecting with ai model
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import SYSTEM_MESSAGE from "@/constants/systemMessage";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  AIMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
// CONNECT TO WXFLOWS
// Trim the messages to manage conversation history
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

const toolClient = new wxflows({
  endpoint: process.env.WXFLOWS_ENDPOINT || "",
  apikey: process.env.WXFLOWS_API_KEY,
});

// retrive the tools
const tools = await toolClient.lcTools;
const toolNode = new ToolNode(tools);

const initialiseModel = () => {
  const model = new ChatOpenAI({
    model: "gpt-4",
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7, // higher temperature more creatinve
    maxTokens: 4096, // higher max token for long response
    streaming: true,
  }).bindTools(tools);

  return model;
};

// this is the function to check that determines whether to continue or not
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // if llm makes tools call then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  if (lastMessage.content && lastMessage._getType() === "tool") {
    return "agent";
  }
  return END;
}

const createWorkflow = () => {
  const model = initialiseModel();
  //  state graph is like taking decisions it is like a node in a graph which takes decision like should i continue or stop the model or use another tool something like that
  const stateGraph = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      const systemContent = SYSTEM_MESSAGE;

      // Create the prompt template with system message and messages placeholder
      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent, {
          cache_control: { type: "ephemeral" },
        }),
        new MessagesPlaceholder("messages"),
      ]);

      // Trim the messages to manage conversation history
      const trimmedMessages = await trimmer.invoke(state.messages);

      const prompt = await promptTemplate.invoke({ messages: trimmedMessages });

      // get response from the model
      const response = await model.invoke(prompt);

      return { messages: [response] };
    })
    .addEdge(START, "agent")
    .addNode("tools", toolNode)
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  return stateGraph;
};
