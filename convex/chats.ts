import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listChats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log(identity);
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return chats;
  },
});

export const createChat = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not Authenticated");
    }
    const chat = await ctx.db.insert("chats", {
      title: args.title,
      userId: identity.subject,
      createAt: Date.now(),
    });

    return chat;
  },
});

export const deleteChat = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all messages in the chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();

    for (const message of messages) {
      // messages is an array as we use collect above which return array so we loop all message one by one and delete it
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.id);
  },
});
