import { eq, desc, asc, like, and, or, sql } from "drizzle-orm";
import { db } from "../lib/database";
import {
  collaborationSessions,
  collaborationMessages,
  users,
  CollaborationSession,
  CollaborationMessage,
  InsertCollaborationSession,
  InsertCollaborationMessage,
} from "@shared/schema";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger('collaboration-service');

interface SessionFilters {
  status?: 'active' | 'concluded' | 'archived';
  entityType?: string;
  moderatorId?: string;
  participantId?: string;
}

interface MessageFilters {
  sessionId?: string;
  userId?: string;
  messageType?: 'comment' | 'suggestion' | 'approval' | 'rejection';
  isResolved?: boolean;
}

interface SessionParticipant {
  userId: string;
  role: 'moderator' | 'participant' | 'observer';
  joinedAt: Date;
  permissions: string[];
}

interface CollaborationNotification {
  type: 'session_created' | 'message_added' | 'session_concluded' | 'participant_added';
  sessionId: string;
  userId: string;
  data: any;
}

export class CollaborationService {
  private subscribers = new Map<string, Set<(notification: CollaborationNotification) => void>>();

  // Session Management
  async createSession(sessionData: InsertCollaborationSession): Promise<CollaborationSession> {
    // Validate participants
    await this.validateParticipants(sessionData.participants as string[]);

    const [created] = await db
      .insert(collaborationSessions)
      .values({
        ...sessionData,
        lastActivityAt: new Date(),
      })
      .returning();

    // Notify participants
    await this.notifyParticipants(created.id, {
      type: 'session_created',
      sessionId: created.id,
      userId: created.moderatorId,
      data: {
        sessionTitle: created.sessionTitle,
        entityType: created.entityType,
        entityId: created.entityId,
      },
    });

    logger.info({ 
      sessionId: created.id, 
      entityType: created.entityType,
      entityId: created.entityId,
      participantCount: (created.participants as string[]).length 
    }, 'Collaboration session created');

    return created;
  }

  async getSessions(filters: SessionFilters = {}): Promise<CollaborationSession[]> {
    let query = db.select().from(collaborationSessions);

    const conditions = [];

    if (filters.status) {
      conditions.push(eq(collaborationSessions.status, filters.status));
    }

    if (filters.entityType) {
      conditions.push(eq(collaborationSessions.entityType, filters.entityType));
    }

    if (filters.moderatorId) {
      conditions.push(eq(collaborationSessions.moderatorId, filters.moderatorId));
    }

    if (filters.participantId) {
      conditions.push(
        sql`${collaborationSessions.participants} @> ${JSON.stringify([filters.participantId])}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(collaborationSessions.lastActivityAt));
  }

  async getSession(id: string): Promise<CollaborationSession | undefined> {
    const [session] = await db
      .select()
      .from(collaborationSessions)
      .where(eq(collaborationSessions.id, id))
      .limit(1);

    return session;
  }

  async updateSession(id: string, updates: Partial<InsertCollaborationSession>): Promise<CollaborationSession> {
    const updateData: any = { ...updates };
    
    // Always update lastActivityAt when session is modified
    updateData.lastActivityAt = new Date();

    const [updated] = await db
      .update(collaborationSessions)
      .set(updateData)
      .where(eq(collaborationSessions.id, id))
      .returning();

    logger.info({ sessionId: id }, 'Collaboration session updated');
    return updated;
  }

  async addParticipant(sessionId: string, userId: string, role: 'participant' | 'observer' = 'participant'): Promise<CollaborationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participants = (session.participants as string[]) || [];
    if (participants.includes(userId)) {
      throw new Error('User is already a participant');
    }

    participants.push(userId);

    const [updated] = await db
      .update(collaborationSessions)
      .set({ 
        participants, 
        lastActivityAt: new Date() 
      })
      .where(eq(collaborationSessions.id, sessionId))
      .returning();

    // Notify all participants
    await this.notifyParticipants(sessionId, {
      type: 'participant_added',
      sessionId,
      userId,
      data: { role, sessionTitle: session.sessionTitle },
    });

    logger.info({ sessionId, userId, role }, 'Participant added to collaboration session');
    return updated;
  }

  async removeParticipant(sessionId: string, userId: string): Promise<CollaborationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participants = (session.participants as string[]) || [];
    const filteredParticipants = participants.filter(p => p !== userId);

    if (participants.length === filteredParticipants.length) {
      throw new Error('User is not a participant');
    }

    const [updated] = await db
      .update(collaborationSessions)
      .set({ 
        participants: filteredParticipants, 
        lastActivityAt: new Date() 
      })
      .where(eq(collaborationSessions.id, sessionId))
      .returning();

    logger.info({ sessionId, userId }, 'Participant removed from collaboration session');
    return updated;
  }

  async concludeSession(sessionId: string, moderatorId: string): Promise<CollaborationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.moderatorId !== moderatorId) {
      throw new Error('Only the moderator can conclude the session');
    }

    const [updated] = await db
      .update(collaborationSessions)
      .set({ 
        status: 'concluded', 
        lastActivityAt: new Date() 
      })
      .where(eq(collaborationSessions.id, sessionId))
      .returning();

    // Notify participants
    await this.notifyParticipants(sessionId, {
      type: 'session_concluded',
      sessionId,
      userId: moderatorId,
      data: { sessionTitle: session.sessionTitle },
    });

    logger.info({ sessionId, moderatorId }, 'Collaboration session concluded');
    return updated;
  }

  // Message Management
  async addMessage(messageData: InsertCollaborationMessage): Promise<CollaborationMessage> {
    // Validate user is participant or moderator
    await this.validateUserInSession(messageData.sessionId, messageData.userId);

    const [created] = await db
      .insert(collaborationMessages)
      .values(messageData)
      .returning();

    // Update session activity
    await db
      .update(collaborationSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(collaborationSessions.id, messageData.sessionId));

    // Notify participants
    await this.notifyParticipants(messageData.sessionId, {
      type: 'message_added',
      sessionId: messageData.sessionId,
      userId: messageData.userId,
      data: {
        messageId: created.id,
        messageType: created.messageType,
        content: created.content,
      },
    });

    logger.info({ 
      messageId: created.id, 
      sessionId: messageData.sessionId,
      userId: messageData.userId,
      messageType: created.messageType 
    }, 'Collaboration message added');

    return created;
  }

  async getMessages(filters: MessageFilters = {}, limit: number = 50, offset: number = 0): Promise<CollaborationMessage[]> {
    let query = db.select().from(collaborationMessages);

    const conditions = [];

    if (filters.sessionId) {
      conditions.push(eq(collaborationMessages.sessionId, filters.sessionId));
    }

    if (filters.userId) {
      conditions.push(eq(collaborationMessages.userId, filters.userId));
    }

    if (filters.messageType) {
      conditions.push(eq(collaborationMessages.messageType, filters.messageType));
    }

    if (filters.isResolved !== undefined) {
      conditions.push(eq(collaborationMessages.isResolved, filters.isResolved));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query
      .orderBy(desc(collaborationMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async resolveMessage(messageId: string, userId: string): Promise<CollaborationMessage> {
    // Get message to validate session access
    const [message] = await db
      .select()
      .from(collaborationMessages)
      .where(eq(collaborationMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    // Validate user can resolve (participant/moderator)
    await this.validateUserInSession(message.sessionId, userId);

    const [updated] = await db
      .update(collaborationMessages)
      .set({ isResolved: true })
      .where(eq(collaborationMessages.id, messageId))
      .returning();

    logger.info({ messageId, userId, sessionId: message.sessionId }, 'Collaboration message resolved');
    return updated;
  }

  async updateMessage(messageId: string, userId: string, content: string): Promise<CollaborationMessage> {
    const [message] = await db
      .select()
      .from(collaborationMessages)
      .where(eq(collaborationMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('Only the message author can update it');
    }

    const [updated] = await db
      .update(collaborationMessages)
      .set({ 
        content,
        metadata: {
          ...((message.metadata as any) || {}),
          editedAt: new Date(),
        },
      })
      .where(eq(collaborationMessages.id, messageId))
      .returning();

    return updated;
  }

  // Real-time features
  subscribe(sessionId: string, callback: (notification: CollaborationNotification) => void): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    
    this.subscribers.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const sessionSubscribers = this.subscribers.get(sessionId);
      if (sessionSubscribers) {
        sessionSubscribers.delete(callback);
        if (sessionSubscribers.size === 0) {
          this.subscribers.delete(sessionId);
        }
      }
    };
  }

  async getUserSessions(userId: string): Promise<CollaborationSession[]> {
    const moderatedSessions = await db
      .select()
      .from(collaborationSessions)
      .where(eq(collaborationSessions.moderatorId, userId))
      .orderBy(desc(collaborationSessions.lastActivityAt));

    const participantSessions = await db
      .select()
      .from(collaborationSessions)
      .where(
        and(
          sql`${collaborationSessions.participants} @> ${JSON.stringify([userId])}`,
          sql`${collaborationSessions.moderatorId} != ${userId}` // Exclude already included moderated sessions
        )
      )
      .orderBy(desc(collaborationSessions.lastActivityAt));

    return [...moderatedSessions, ...participantSessions];
  }

  async getSessionStatistics(sessionId: string): Promise<{
    totalMessages: number;
    messagesByType: Record<string, number>;
    activeParticipants: number;
    unresolvedSuggestions: number;
    activityLevel: 'low' | 'medium' | 'high';
  }> {
    const [
      totalMessagesResult,
      messagesByTypeResult,
      unresolvedSuggestionsResult,
    ] = await Promise.all([
      // Total messages
      db.select({ count: sql<number>`count(*)` })
        .from(collaborationMessages)
        .where(eq(collaborationMessages.sessionId, sessionId)),

      // Messages by type
      db.select({
        messageType: collaborationMessages.messageType,
        count: sql<number>`count(*)`
      })
        .from(collaborationMessages)
        .where(eq(collaborationMessages.sessionId, sessionId))
        .groupBy(collaborationMessages.messageType),

      // Unresolved suggestions
      db.select({ count: sql<number>`count(*)` })
        .from(collaborationMessages)
        .where(
          and(
            eq(collaborationMessages.sessionId, sessionId),
            eq(collaborationMessages.messageType, 'suggestion'),
            eq(collaborationMessages.isResolved, false)
          )
        ),
    ]);

    const session = await this.getSession(sessionId);
    const activeParticipants = session ? (session.participants as string[]).length + 1 : 0; // +1 for moderator

    const totalMessages = totalMessagesResult[0]?.count || 0;
    
    // Determine activity level based on messages per participant
    let activityLevel: 'low' | 'medium' | 'high' = 'low';
    if (activeParticipants > 0) {
      const messagesPerParticipant = totalMessages / activeParticipants;
      if (messagesPerParticipant > 10) activityLevel = 'high';
      else if (messagesPerParticipant > 5) activityLevel = 'medium';
    }

    return {
      totalMessages,
      messagesByType: Object.fromEntries(
        messagesByTypeResult.map(r => [r.messageType, r.count])
      ),
      activeParticipants,
      unresolvedSuggestions: unresolvedSuggestionsResult[0]?.count || 0,
      activityLevel,
    };
  }

  // Private helper methods
  private async validateParticipants(participantIds: string[]): Promise<void> {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return; // Empty participant list is valid
    }

    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.id} = ANY(${participantIds})`);

    const existingUserIds = existingUsers.map(u => u.id);
    const missingUsers = participantIds.filter(id => !existingUserIds.includes(id));

    if (missingUsers.length > 0) {
      throw new Error(`Users not found: ${missingUsers.join(', ')}`);
    }
  }

  private async validateUserInSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participants = (session.participants as string[]) || [];
    const isModerator = session.moderatorId === userId;
    const isParticipant = participants.includes(userId);

    if (!isModerator && !isParticipant) {
      throw new Error('User is not a participant in this session');
    }
  }

  private async notifyParticipants(sessionId: string, notification: CollaborationNotification): Promise<void> {
    const sessionSubscribers = this.subscribers.get(sessionId);
    if (sessionSubscribers && sessionSubscribers.size > 0) {
      sessionSubscribers.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          logger.warn({ error, sessionId }, 'Failed to notify subscriber');
        }
      });
    }
  }
}

export const collaborationService = new CollaborationService();